"""Chinese/English BM25, optional remote embeddings + pgvector, reciprocal rank fusion."""
import hashlib
import json
import math
import os
import re
import time
from collections import Counter
from urllib.request import Request, urlopen

ALIASES = ({"fb", "facebook", "meta", "脸书"}, {"applovin", "axon"}, {"tiktok", "tt"}, {"amazon", "亚马", "马逊"})
STOP = {"怎么", "如何", "什么", "一个", "问题", "应该", "是否", "进行", "需要", "可以", "资料"}


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


def retrieve(query, chunks, store, top_k=5):
    started = time.monotonic()
    q = set(terms(query))
    for aliases in ALIASES:
        if q & aliases:
            q.update(aliases)
    counts = [Counter(terms(c["text"])) for c in chunks]
    avg = sum(sum(c.values()) for c in counts) / max(len(counts), 1) or 1
    df = {t: sum(t in c for c in counts) for t in q}
    ranked = []
    for chunk, count in zip(chunks, counts):
        score = 0
        title = set(terms(chunk["text"].splitlines()[0]))
        for t in q & count.keys():
            tf = count[t]
            idf = math.log(1 + (len(chunks) - df[t] + .5) / (df[t] + .5))
            score += idf * tf * 2.5 / (tf + 1.5 * (.25 + .75 * sum(count.values()) / avg))
            if t in title:
                score += idf * .5
        if score > 0:
            ranked.append((score, chunk["chunk_id"]))
    ranked.sort(reverse=True)
    lexical = [key for _, key in ranked[:20]]
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
    selected = [dict(by_id[key], retrieval_score=round(score, 6)) for key, score in scores.most_common(top_k)]
    return selected, {"mode": mode, "warning": warning, "totalChunks": len(chunks), "matchedChunks": len(selected), "elapsedMs": round((time.monotonic()-started)*1000)}
