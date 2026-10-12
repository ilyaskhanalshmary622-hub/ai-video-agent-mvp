"""Bounded document conversion in a subprocess; remote URLs are not accepted."""
import base64
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path

MAX_FILE = 8 * 1024 * 1024
EXTENSIONS = {".md", ".txt", ".csv", ".pdf", ".docx", ".xlsx", ".pptx"}


def convert_upload(body):
    name = Path(str(body.get("name", "document.md"))).name
    suffix = Path(name).suffix.lower()
    if suffix not in EXTENSIONS:
        raise ValueError("支持 MD、TXT、CSV、PDF、DOCX、XLSX、PPTX。")
    raw = base64.b64decode(body.get("data", ""), validate=True)
    if not raw or len(raw) > MAX_FILE:
        raise ValueError("请选择不超过 8 MB 的文件。")
    digest = hashlib.sha256(raw).hexdigest()
    if suffix in {".md", ".txt", ".csv"}:
        content = raw.decode("utf-8-sig")
    else:
        with tempfile.TemporaryDirectory(prefix="rag-import-") as folder:
            path = Path(folder) / ("document" + suffix)
            path.write_bytes(raw)
            if suffix in {".docx", ".xlsx", ".pptx"}:
                with zipfile.ZipFile(path) as archive:
                    if len(archive.infolist()) > 5000 or sum(x.file_size for x in archive.infolist()) > 50 * 1024 * 1024:
                        raise ValueError("文档解压后过大，请拆分文件。")
            output = Path(folder) / "converted.md"
            proc = subprocess.run([sys.executable, str(Path(__file__).resolve()), str(path), str(output)], timeout=60, capture_output=True)
            if proc.returncode or not output.exists():
                raise ValueError("文档解析失败：可能是加密、扫描件或格式不支持。可先转为可复制文字的 Markdown。")
            if output.stat().st_size > 2 * 1024 * 1024:
                raise ValueError("转换结果过大，请拆分文档。")
            content = output.read_text(encoding="utf-8")
    if not content.strip() or len(content) > 500000:
        raise ValueError("文档没有可读取文字或文字超过 50 万字，请拆分或先做 OCR。")
    category = str(body.get("category", "general"))
    category = category if re.fullmatch(r"[a-z]{1,20}", category) else "general"
    title = str(body.get("title") or Path(name).stem)[:150]
    source = str(body.get("source", ""))[:1000]
    if source and not source.startswith("https://"):
        raise ValueError("来源链接请使用 HTTPS，或留空。")
    date = str(body.get("date", ""))[:10]
    if date and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        raise ValueError("资料日期格式应为 YYYY-MM-DD。")
    return {"id": digest, "name": f"{category}__upload_{digest[:16]}.md", "title": title,
            "text": f"# {title}\n\n资料日期：{date or '未标注'}\n来源：{source or '用户上传，尚未核验'}\n\n{content}",
            "originalName": name, "sourceUrl": source, "documentDate": date, "createdAt": time.time()}


if __name__ == "__main__":
    from markitdown import MarkItDown
    result = MarkItDown(enable_plugins=False).convert_local(sys.argv[1])
    Path(sys.argv[2]).write_text(result.text_content, encoding="utf-8")
