from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request
import cgi
import json
import os
import re
import time


ROOT = Path(__file__).resolve().parent
KNOWLEDGE_DIR = ROOT / "knowledge"
KNOWLEDGE_DIR.mkdir(exist_ok=True)
API_BASE_URL = os.environ.get("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1").rstrip("/")
CHAT_URL = f"{API_BASE_URL}/chat/completions"
DEFAULT_MODEL = os.environ.get("AGNES_MODEL", "agnes-2.5-flash")
HOST = os.environ.get("RAG_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", os.environ.get("RAG_PORT", "8789")))
CATEGORY_LABELS = {
    "product": "产品资料",
    "ads": "投放 SOP",
    "customer": "客服 FAQ",
    "review": "复盘案例",
    "general": "通用资料",
}


def load_local_env():
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()


def split_chunks(text):
    parts = re.split(r"\n(?=# )|\n(?=## )|\n\n+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def tokenize(text):
    return set(re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]{1,2}", text.lower()))


def load_documents():
    chunks = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        category = get_category(path.name)
        for index, chunk in enumerate(split_chunks(text), start=1):
            chunks.append(
                {
                    "source": path.name,
                    "chunk_id": f"{path.stem}-{index}",
                    "category": category,
                    "text": chunk,
                    "tokens": tokenize(chunk),
                }
            )
    return chunks


def get_category(filename):
    prefix = filename.split("__", 1)[0]
    return CATEGORY_LABELS.get(prefix, "通用资料")


def knowledge_overview():
    files = []
    categories = {label: 0 for label in CATEGORY_LABELS.values()}
    total_chunks = 0
    total_chars = 0
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        chunks = split_chunks(text)
        category = get_category(path.name)
        categories[category] = categories.get(category, 0) + 1
        total_chunks += len(chunks)
        total_chars += len(text)
        files.append(
            {
                "name": path.name,
                "category": category,
                "chunks": len(chunks),
                "chars": len(text),
            }
        )
    return {
        "files": files,
        "fileCount": len(files),
        "chunkCount": total_chunks,
        "charCount": total_chars,
        "model": DEFAULT_MODEL,
        "apiBaseUrl": API_BASE_URL,
        "externalAllowed": os.environ.get("RAG_ALLOW_EXTERNAL", "").strip() == "1",
        "hasApiKey": bool(os.environ.get("AGNES_API_KEY", "").strip()),
        "requiresPassword": bool(os.environ.get("RAG_ACCESS_PASSWORD", "").strip()),
        "categories": categories,
    }


def check_password(headers):
    password = os.environ.get("RAG_ACCESS_PASSWORD", "").strip()
    if not password:
        return True
    return headers.get("X-RAG-PASSWORD", "").strip() == password


def search(query, chunks, top_k=5):
    query_tokens = tokenize(query)
    scored = []
    for chunk in chunks:
        overlap = query_tokens & chunk["tokens"]
        score = len(overlap)
        if score:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]


def build_prompt(query, matches, role, history):
    context = "\n\n".join(
        f"[资料来源：{item['source']} / {item['chunk_id']} / {item['category']}]\n{item['text']}"
        for item in matches
    )
    history_text = "\n".join(
        f"用户：{item.get('question', '')}\n助手：{item.get('answer', '')}"
        for item in history[-3:]
        if item.get("question") or item.get("answer")
    )
    return f"""
你是一个实战型企业 AI 助手，当前输出模式是：{role}。
你的回答要像资深主管直接给执行建议，不要像论文、报告、说明书。
你必须只基于下面检索资料回答，不要编造资料外的信息。
如果资料不足，用一句话说明缺什么，不要展开长篇解释。

输出模式说明：
如果是“运营诊断”，重点给数据判断、优先级和下一步动作。
如果是“素材改法”，重点给首帧、前 3 秒、脚本、镜头和测试变量。
如果是“落地页优化”，重点给首屏、信任证明、价格、CTA 和承接问题。
如果是“客服回复”，重点给可直接复制的话术和风险边界。
如果是“老板汇报”，重点给结论、原因、风险和资源需求。

用户问题：
{query}

最近对话上下文：
{history_text or "无"}

检索到的知识库资料：
{context}

输出格式要求，非常重要：
禁止使用 Markdown 语法。
禁止使用 ##、**、---、表格、代码块、竖线表格。
不要写“资料来源表格”。
不要输出长篇解释。
每行尽量短，直接说人话。

请按这个结构输出，标题只用普通中文：
直接结论
一句话说优先怎么做。

为什么
用 2-3 条短句说明依据，可以顺手写资料来自哪个文件名。

马上怎么做
给 3-5 条具体动作，每条不超过 30 个字。

如果是素材问题
必须给首帧、前 3 秒、产品露出、结尾 CTA。

风险
只写最重要的 1-2 条。
""".strip()


def ensure_external_allowed():
    if os.environ.get("RAG_ALLOW_EXTERNAL", "").strip() == "1":
        return
    raise RuntimeError(
        "安全开关未开启：网页会把检索到的知识库片段发送到 Agnes API。"
        "如果你确认 knowledge 文件夹只是练习资料，可以在命令行里运行："
        '$env:RAG_ALLOW_EXTERNAL="1" 后再重启服务。'
    )


def call_model(prompt):
    ensure_external_allowed()

    api_key = os.environ.get("AGNES_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("没有找到 AGNES_API_KEY。请先在当前命令行里设置。")

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "你是企业知识库助手。必须基于检索资料回答，不要编造。",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    req = request.Request(
        CHAT_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=120) as resp:
            response_json = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Agnes API 错误：{exc.code}\n{detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"网络错误：{exc.reason}") from exc

    choices = response_json.get("choices", [])
    if choices:
        return clean_answer(choices[0].get("message", {}).get("content", ""))
    raise RuntimeError("模型没有返回文本。")


def clean_answer(text):
    text = text.strip()
    replacements = {
        "**": "",
        "##": "",
        "---": "",
        "```": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    cleaned_lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            cleaned_lines.append("")
            continue
        if re.fullmatch(r"[\|\-\s:]+", line):
            continue
        if line.startswith("|") and line.endswith("|"):
            line = "，".join(part.strip() for part in line.strip("|").split("|") if part.strip())
        line = re.sub(r"^\s*[-*]\s+", "", line)
        line = re.sub(r"^\s*\d+[.)、]\s*", "", line)
        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class RagHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == "/api/knowledge":
            if not check_password(self.headers):
                self.send_json(401, {"error": "需要访问密码"})
                return
            self.send_json(200, knowledge_overview())
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/") and not check_password(self.headers):
            self.send_json(401, {"error": "需要访问密码"})
            return

        if self.path == "/api/upload":
            if os.environ.get("RAG_ENABLE_UPLOAD", "").strip() != "1":
                self.send_json(403, {"error": "线上展示模式已关闭上传。请在本地 knowledge 文件夹维护资料。"})
                return
            self.handle_upload()
            return

        if self.path != "/api/ask":
            self.send_json(404, {"error": "接口不存在"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            query = str(body.get("query", "")).strip()
            role = str(body.get("role", "运营诊断")).strip()
            history = body.get("history", [])
            if not isinstance(history, list):
                history = []
            if not query:
                self.send_json(400, {"error": "请输入问题"})
                return

            chunks = load_documents()
            matches = search(query, chunks)
            if not matches:
                self.send_json(200, {"answer": "没有检索到相关资料。", "sources": []})
                return

            prompt = build_prompt(query, matches, role, history)
            answer = call_model(prompt)
            self.send_json(
                200,
                {
                    "answer": answer,
                    "model": DEFAULT_MODEL,
                    "retrieval": {
                        "query": query,
                        "role": role,
                        "totalChunks": len(chunks),
                        "matchedChunks": len(matches),
                    },
                    "sources": [
                        {
                            "source": item["source"],
                            "chunkId": item["chunk_id"],
                            "category": item["category"],
                            "text": item["text"],
                        }
                        for item in matches
                    ],
                },
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})

    def handle_upload(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )
            category = str(form.getfirst("category", "general")).strip()
            if category not in CATEGORY_LABELS:
                category = "general"

            title = str(form.getfirst("title", "")).strip()
            pasted_text = str(form.getfirst("text", "")).strip()
            file_item = form["file"] if "file" in form else None

            filename = title or "uploaded_knowledge"
            content = pasted_text
            if file_item is not None and getattr(file_item, "filename", ""):
                filename = Path(file_item.filename).stem
                raw = file_item.file.read()
                content = raw.decode("utf-8", errors="replace").strip()

            if not content:
                self.send_json(400, {"error": "请上传文件或粘贴资料内容"})
                return

            safe_name = re.sub(r"[^A-Za-z0-9\u4e00-\u9fff_-]+", "_", filename).strip("_")
            safe_name = safe_name or f"knowledge_{int(time.time())}"
            target = KNOWLEDGE_DIR / f"{category}__{safe_name}.md"
            suffix = 1
            while target.exists():
                target = KNOWLEDGE_DIR / f"{category}__{safe_name}_{suffix}.md"
                suffix += 1

            if not content.lstrip().startswith("#"):
                content = f"# {title or safe_name}\n\n{content}"
            target.write_text(content, encoding="utf-8")

            self.send_json(
                200,
                {
                    "message": "上传成功",
                    "file": target.name,
                    "category": CATEGORY_LABELS[category],
                    "overview": knowledge_overview(),
                },
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})

    def send_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main():
    server = ThreadingHTTPServer((HOST, PORT), RagHandler)
    print(f"RAG 知识库助手：http://{HOST}:{PORT}/rag_ui.html")
    print(f"模型：{DEFAULT_MODEL}")
    print(f"接口：{CHAT_URL}")
    print("注意：调用 Agnes 前需要设置 AGNES_API_KEY 和 RAG_ALLOW_EXTERNAL=1。")
    server.serve_forever()


if __name__ == "__main__":
    main()
