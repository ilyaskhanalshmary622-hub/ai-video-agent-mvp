"""Versioned, section-local evidence. Archives never enter the retrieval corpus."""
import hashlib
import json
import re
from pathlib import Path

RELEASE = "2026-10-12.2"
META = re.compile(r"^(?:版本|资料日期|来源|性质|知识编号|整理日期|核验状态|适用范围|负责人|状态|替代文档|依据类型|访问范围)：")


def manifest(root):
    path = Path(root) / "knowledge_manifest.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"documents": {}}


def sections(text):
    """Keep each heading with its body, and do not discard introductory facts."""
    lines = text.strip().splitlines()
    title = lines[0] if lines and lines[0].startswith("# ") else "# 上传资料"
    body = "\n".join(lines[1:] if lines and lines[0].startswith("# ") else lines)
    parts = re.split(r"\n(?=## )", "\n" + body.strip())
    intro = parts[0].strip()
    header = [line for line in intro.splitlines() if META.match(line)]
    content = "\n".join(line for line in intro.splitlines() if not META.match(line)).strip()
    if content:
        yield title, header, "概览", content
    for part in parts[1:]:
        part = part.strip()
        if not part:
            continue
        heading, _, content = part.partition("\n")
        if content.strip():
            yield title, header, heading.lstrip("# "), content.strip()


def split_body(body, limit=1800):
    # Prefer complete paragraphs/lines; long unbroken runs have bounded overlap.
    current = ""
    for line in body.splitlines(keepends=True):
        if len(current) + len(line) > limit and current.strip():
            yield current.strip()
            current = ""
        while len(line) > limit:
            yield line[:limit].strip()
            line = line[limit-160:]
        current += line
    if current.strip():
        yield current.strip()


def chunks_for(filename, text, metadata=None):
    metadata = metadata or {}
    if metadata.get("status") in {"archived", "superseded", "draft"}:
        return
    for section_index, (title, header, heading, body) in enumerate(sections(text)):
        # Only this section's links and top-level document metadata are inherited.
        local_provenance = [line for line in body.splitlines()
                            if re.match(r"^(?:来源|参考依据|核对日期|依据类型|适用)：", line)]
        for index, part in enumerate(split_body(body)):
            prefix = [title, *header, "## " + heading]
            text_part = "\n".join(prefix + [part] + [x for x in local_provenance if x not in part])
            identity = f"{filename}|{heading}|{section_index}|{index}"
            key = hashlib.sha256(identity.encode()).hexdigest()[:16]
            yield {"source": filename, "chunk_id": f"{Path(filename).stem}-{key}",
                   "text": text_part, "body": part, "heading": heading,
                   "version": metadata.get("version", "unreviewed"),
                   "knowledgeId": metadata.get("id", "upload"),
                   "reviewStatus": metadata.get("reviewStatus", "用户上传，尚未核验"),
                   "sectionId": heading.split(" ")[0],
                   "sourceUrls": list(dict.fromkeys(re.findall(r"https://[^\s)；]+", text_part)))}
