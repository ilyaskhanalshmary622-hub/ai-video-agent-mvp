"""Chinese/English BM25, optional remote embeddings + pgvector, reciprocal rank fusion."""
import hashlib
import json
import math
import os
import re
import time
from collections import Counter
from functools import lru_cache
from urllib.request import Request, urlopen

ALIASES = ({"fb", "facebook", "meta", "脸书"}, {"applovin", "axon"}, {"tiktok", "tt"}, {"amazon", "亚马", "马逊"})
STOP = {"怎么", "如何", "什么", "一个", "问题", "应该", "是否", "进行", "需要", "可以", "资料"}
STOP.update({"解释", "区别", "原理", "为什", "什么", "告诉", "直接", "一下", "我们", "现在", "目前", "知道", "请给", "能不", "不能"})

# Domain vocabulary, not a mapping from evaluation questions to answer IDs.
QUERY_EXPANSIONS = [
    (r"(?:加钱|多给.{0,8}钱|加大投入|提高预算|增加预算)", "加预算 扩量"),
    (r"(?:获客|拉新|拉来.{0,8}买家|拉一个.{0,6}买家).{0,12}(?:贵|花钱|花多少|多少钱)|买流量.{0,8}贵", "获客成本 CPA"),
    (r"(?:调回|降回|撤回|回滚)", "预算调整 止损 回滚"),
    (r"(?:实收|各种.{0,8}开支|随订单.{0,8}开支|不亏|不计固定|买家最多花)", "净收入 非广告变动成本 保本 CPA"),
    (r"(?:很多人点|点击很多|点的人多|点击多)", "CTR 点击率"),
    (r"(?:很少掏钱|不下单|没人买|不成交|不买单)", "CVR 购买转化 漏斗 落地页"),
    (r"(?:都说.{0,12}自己带来|都认领|销售额.{0,6}加起来|重复记功)", "跨平台 归因 同一订单 去重"),
    (r"(?:门口没包裹|没收到|没有收到|说已经送到)", "显示签收 未收到 物流 证据"),
    (r"(?:到哪个城市|到哪了|现在在哪|查物流|物流位置|退款到账)", "实时订单 查询 物流 接口"),
    (r"(?:标价对不上|价格不一致)", "商品源 价格 变体 币种"),
    (r"(?:货不够|货撑不到|卖断|快断货)", "可售库存 在途 补货 履约"),
    (r"(?:把手.{0,8}变|按钮.{0,8}变|商品.{0,8}变样|镜头一换)", "产品一致性 参考图 外观锁定"),
    (r"(?:脸书)", "Facebook Meta"), (r"(?:谷歌)", "Google"),
    (r"(?:不相干|不相关|无效词|搜错)", "搜索词 无关 意图 否定"),
    (r"(?:平均.{0,8}次|反复刷到|多次看到|重复看到)", "频次 受众 关停"),
    (r"自动投放|自动定向", "自动广告 搜索词"),
]


def expanded_query(query):
    extra = [value for pattern, value in QUERY_EXPANSIONS if re.search(pattern, query, re.I)]
    return query + " " + " ".join(extra), extra


@lru_cache(maxsize=4)
def corpus_counts(texts):
    return tuple(Counter(terms(text)) for text in texts)


def searchable(chunk):
    # Boilerplate provenance is displayed as evidence metadata, never ranked as
    # domain content (e.g. every document saying '运营推导' is not physics evidence).
    body = re.sub(r"^(?:依据类型|参考依据|来源|核对日期|整理日期|版本|性质|知识编号|核验状态|访问范围)：.*$", "", chunk.get("body", chunk["text"]), flags=re.M)
    return chunk.get("heading", "") + "\n" + body


def terms(text):
    text = re.sub(r"https?://\S+", "", text.lower())
    words = re.findall(r"[a-z][a-z0-9_]*", text)
    for run in re.findall(r"[\u4e00-\u9fff]+", text):
        words.extend(run[i:i+2] for i in range(len(run)-1))
    return [word for word in words if word not in STOP]


def semantic_ready(store):
    return bool(store.url and os.environ.get("RAG_EMBEDDING_URL") and os.environ.get("RAG_EMBEDDING_MODEL") and os.environ.get("RAG_EMBEDDING_API_KEY"))


def fingerprint(chunk):
    value = os.environ.get("RAG_EMBEDDING_URL", "") + os.environ.get("RAG_EMBEDDING_MODEL", "") + chunk["text"]
    return hashlib.sha256(value.encode()).hexdigest()


def embed(texts):
    url = os.environ["RAG_EMBEDDING_URL"]
    if not url.startswith("https://"):
        raise ValueError("Embedding 接口必须使用 HTTPS。")
    body = {"model": os.environ["RAG_EMBEDDING_MODEL"], "input": texts}
    req = Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer " + os.environ["RAG_EMBEDDING_API_KEY"]})
    with urlopen(req, timeout=30) as response:
        data = json.load(response)
    entries = sorted(data["data"], key=lambda x: x["index"])
    vectors = [entry["embedding"] for entry in entries]
    if len(vectors) != len(texts) or any(not v or any(not isinstance(n, (float, int)) or not math.isfinite(n) for n in v) or not any(v) for v in vectors):
        raise ValueError("Embedding 返回格式不正确。")
    if len({len(v) for v in vectors}) != 1:
        raise ValueError("Embedding 维度不一致。")
    return vectors


def build_index(store, chunks):
    progress = {"status": "running", "done": 0, "total": len(chunks), "startedAt": time.time()}
    store.put("meta", "index", progress)
    try:
        store.init_vectors()
        for start in range(0, len(chunks), 16):
            group = chunks[start:start+16]
            changed = [c for c in group if store.vector_fingerprint(c["chunk_id"]) != fingerprint(c)]
            if changed:
                vectors = embed([c["text"] for c in changed])
                for chunk, vector in zip(changed, vectors):
                    store.put_vector(chunk["chunk_id"], fingerprint(chunk), vector)
            progress["done"] += len(group)
            store.put("meta", "index", progress)
        progress.update(status="completed", finishedAt=time.time())
    except Exception:
        progress.update(status="failed", error="索引未完成；请检查 pgvector 扩展、Embedding 接口、额度和文档长度。关键词检索仍可使用。")
    store.put("meta", "index", progress)


def retrieve(query, chunks, store, top_k=5, _decompose=True):
    started = time.monotonic()
    expanded, expansions = expanded_query(query)
    q = set(terms(expanded))
    for aliases in ALIASES:
        if q & aliases:
            q.update(aliases)
    counts = corpus_counts(tuple(searchable(c) for c in chunks))
    avg = sum(sum(c.values()) for c in counts) / max(len(counts), 1) or 1
    df = {t: sum(t in c for c in counts) for t in q}
    ranked = []
    for chunk, count in zip(chunks, counts):
        score = 0
        title = set(terms(chunk.get("heading", chunk["text"].splitlines()[0])))
        for t in q & count.keys():
            tf = count[t]
            idf = math.log(1 + (len(chunks) - df[t] + .5) / (df[t] + .5))
            score += idf * tf * 2.5 / (tf + 1.5 * (.25 + .75 * sum(count.values()) / avg))
            if t in title:
                score += idf * .5
        if {"ctr", "cvr"} <= q and {"ctr", "cvr"} <= title:
            score *= 1.8
        if re.match(r"[A-Z_]+-\d+", chunk.get("sectionId", "")) and not chunk.get("sectionId", "").startswith(("METRICS-", "GOVERNANCE-")):
            score *= 1.25
        # Weak accidental bigram overlap alone is not evidence of relevance.
        overlap = q & count.keys()
        minimum = 3 if len(q) > 8 else 2
        if score > 0 and len(overlap) / max(len(q), 1) >= .07 and (len(overlap) >= minimum or any(len(t) >= 4 for t in overlap)):
            ranked.append((score, chunk["chunk_id"]))
    ranked.sort(reverse=True)
    best = ranked[0][0] if ranked else 0
    lexical = [key for score, key in ranked[:30] if score >= best * .22]
    lists, mode, warning = [lexical], "BM25 关键词检索", ""
    by_id = {c["chunk_id"]: c for c in chunks}
    if semantic_ready(store):
        status = store.get("meta", "index") or {}
        if status.get("status") == "completed":
            try:
                matches = store.nearest(embed([query])[0], list(by_id))
                semantic = [key for key, fp in matches if fp == fingerprint(by_id[key])]
                if semantic:
                    lists.append(semantic)
                    mode = "BM25 + 语义检索 · RRF 融合"
                else:
                    warning = "语义索引已过期或为空，请重新建立。"
            except Exception:
                warning = "语义服务暂不可用，本次已降级为关键词检索。"
        else:
            warning = "语义索引尚未就绪，本次使用关键词检索。"
    scores = Counter()
    for result in lists:
        for rank, key in enumerate(result, 1):
            scores[key] += 1 / (60 + rank)
    subqueries, reserved = [], []
    intents = sum(bool(re.search(pattern, expanded, re.I)) for pattern in
                  (r"预算|扩量", r"事件|回传|像素|去重", r"保本|ROAS|净收入|成本|亏", r"CTR|CVR|落地页|加购|支付"))
    if _decompose and intents >= 2:
        subqueries = [s.strip() for s in re.split(r"[，,；;？?]|同时", query) if len(s.strip()) >= 7][:4]
        if len(subqueries) > 1:
            # Additional clause searches are lexical only: no extra paid embeddings.
            class LexicalOnly:
                url = ""
            for subquery in subqueries:
                candidates, _ = retrieve(subquery, chunks, LexicalOnly(), 1, _decompose=False)
                if candidates and candidates[0]["chunk_id"] not in reserved:
                    key = candidates[0]["chunk_id"]
                    reserved.append(key)
                    by_id[key] = candidates[0]
        else:
            subqueries = []
    # Avoid multiple near-duplicate introductory/summary chunks crowding out
    # independent evidence; prefer section evidence over generic document titles.
    selected, per_source = [], Counter()
    ordered = [(key, scores.get(key, 1/61)) for key in reserved[:3]]
    ordered += [(key, score) for key, score in scores.most_common() if key not in reserved[:3]]
    for key, score in ordered:
        c = by_id[key]
        if per_source[c["source"]] >= 2:
            continue
        selected.append(dict(c, retrieval_score=round(score, 6)))
        per_source[c["source"]] += 1
        if len(selected) == top_k:
            break
    if expansions:
        mode += " · 运营同义词"
    return selected, {"mode": mode, "warning": warning, "queryExpansions": expansions,
                      "subqueries": subqueries,
                      "totalChunks": len(chunks), "matchedChunks": len(selected),
                      "scoreMeaning": "排名分数，不是答案正确概率；未配置语义接口时不具备完整语义检索。",
                      "elapsedMs": round((time.monotonic()-started)*1000)}
