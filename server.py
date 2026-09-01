import json
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request, error
from datetime import datetime


ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8765
OPENAI_URL = "https://api.openai.com/v1/responses"
PROJECTS_DIR = ROOT / "saved_projects"


EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "productName": {"type": "string"},
        "category": {
            "type": "string",
            "enum": ["beauty", "home", "tool", "ambient", "cleaning", "health", "other"],
        },
        "description": {"type": "string"},
        "sellingPoints": {
            "type": "array",
            "items": {"type": "string"},
        },
        "targetAudience": {"type": "string"},
        "painPoint": {"type": "string"},
        "consistency": {
            "type": "array",
            "items": {"type": "string"},
        },
        "contentType": {
            "type": "string",
            "enum": ["测评型", "卖点直给型", "剧情冲突型", "高质感展示型", "对比型"],
        },
        "creativeFormat": {
            "type": "string",
            "enum": ["UGC口播", "产品演示", "剧情短视频", "高质感商业感"],
        },
        "competitorNotes": {"type": "string"},
        "extra": {"type": "string"},
    },
    "required": [
        "productName",
        "category",
        "description",
        "sellingPoints",
        "targetAudience",
        "painPoint",
        "consistency",
        "contentType",
        "creativeFormat",
        "competitorNotes",
        "extra",
    ],
    "additionalProperties": False,
}


GENERATION_SCHEMA = {
    "type": "object",
    "properties": {
        "categoryLabel": {"type": "string"},
        "audience": {"type": "string"},
        "painPoint": {"type": "string"},
        "angle": {"type": "string"},
        "hookStrategy": {"type": "string"},
        "referenceSummary": {"type": "string"},
        "platformNotes": {"type": "string"},
        "competitorBreakdown": {"type": "array", "items": {"type": "string"}},
        "testMatrix": {"type": "array", "items": {"type": "string"}},
        "hooks": {"type": "array", "items": {"type": "string"}},
        "recommendedHook": {"type": "string"},
        "reason": {"type": "string"},
        "oneLineStory": {"type": "string"},
        "shots": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "seconds": {"type": "string"},
                    "line": {"type": "string"},
                    "goal": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["seconds", "line", "goal", "text"],
                "additionalProperties": False,
            },
        },
        "productLock": {"type": "string"},
        "imagePrompts": {"type": "array", "items": {"type": "string"}},
        "videoPrompts": {"type": "array", "items": {"type": "string"}},
        "title": {"type": "string"},
        "coverHook": {"type": "string"},
        "subtitles": {"type": "array", "items": {"type": "string"}},
        "aggressive": {"type": "string"},
        "stable": {"type": "string"},
        "analysis": {"type": "string"},
        "risk": {"type": "string"},
        "checklist": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "categoryLabel",
        "audience",
        "painPoint",
        "angle",
        "hookStrategy",
        "referenceSummary",
        "platformNotes",
        "competitorBreakdown",
        "testMatrix",
        "hooks",
        "recommendedHook",
        "reason",
        "oneLineStory",
        "shots",
        "productLock",
        "imagePrompts",
        "videoPrompts",
        "title",
        "coverHook",
        "subtitles",
        "aggressive",
        "stable",
        "analysis",
        "risk",
        "checklist",
    ],
    "additionalProperties": False,
}


def build_image_input(images):
    blocks = []
    for image in images:
        blocks.append(
            {
                "type": "input_image",
                "image_url": f"data:{image['mimeType']};base64,{image['data']}",
            }
        )
    return blocks


def call_openai(api_key, model, instructions, schema_name, schema, prompt_text, images):
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": instructions}],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": prompt_text}, *build_image_input(images)],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": schema,
                "strict": True,
            }
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        OPENAI_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API 错误：{exc.code} {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"网络错误：{exc.reason}") from exc

    response_json = json.loads(raw)
    for item in response_json.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                return json.loads(content.get("text", "{}"))

    raise RuntimeError("模型没有返回结构化结果。")


def extraction_prompt():
    return (
        "你是跨境电商视频团队的资深制片和素材投手。"
        "请根据上传的产品图，提取产品信息并回填给表单。"
        "要求输出务实、商业化、可执行，不要空话。"
        "如果信息无法确定，就做最合理的保守判断。"
        "sellingPoints 和 consistency 必须输出数组。"
        "competitorNotes 输出一句可执行的对标建议。"
        "extra 输出一句执行提醒。"
    )


def generation_prompt(form_data):
    return f"""
你现在是高级广告素材投手 + AI视频制片。
请基于以下输入，直接输出一份能给团队开工的结构化方案。

要求：
1. 站在真实投手视角判断，不要写空泛套话。
2. 优先考虑点击率、停留、素材测试逻辑。
3. 平台适配要明确。
4. 分镜必须短平快，镜头任务明确。
5. 如果上传了产品图或参考素材，请把“单图起片、产品一致性、竞品差异化”写进去。
6. hooks、competitorBreakdown、testMatrix、subtitles、checklist、imagePrompts、videoPrompts 都必须可直接执行。
7. shots 保持 5 条。

项目输入：
{json.dumps(form_data, ensure_ascii=False, indent=2)}
""".strip()


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path == "/api/extract-product":
            self.handle_extract_product()
            return
        if self.path == "/api/generate-plan":
            self.handle_generate_plan()
            return
        if self.path == "/api/save-project":
            self.handle_save_project()
            return
        self.send_json(404, {"error": "接口不存在"})

    def do_GET(self):
        if self.path == "/api/config":
            self.send_json(
                200,
                {
                    "serverApiReady": bool(os.environ.get("OPENAI_API_KEY", "").strip()),
                },
            )
            return
        super().do_GET()

    def handle_extract_product(self):
        body = self.read_json()
        api_key = resolve_api_key(body)
        model = body.get("model", "").strip() or "gpt-4.1-mini"
        images = body.get("images", [])
        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return
        if not images:
            self.send_json(400, {"error": "缺少产品图"})
            return

        try:
            extracted = call_openai(
                api_key=api_key,
                model=model,
                instructions=extraction_prompt(),
                schema_name="product_image_extraction",
                schema=EXTRACTION_SCHEMA,
                prompt_text="请基于上传的产品图，提取产品信息并回填表单。",
                images=images,
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})
            return

        self.send_json(200, {"extracted": extracted})

    def handle_generate_plan(self):
        body = self.read_json()
        api_key = resolve_api_key(body)
        model = body.get("model", "").strip() or "gpt-4.1-mini"
        form_data = body.get("formData", {})
        product_images = body.get("productImages", [])
        reference_images = body.get("referenceImages", [])

        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return

        prompt_data = dict(form_data)
        prompt_data["hasProductImages"] = bool(product_images)
        prompt_data["hasReferenceImages"] = bool(reference_images)
        prompt_data["productImageCount"] = len(product_images)
        prompt_data["referenceImageCount"] = len(reference_images)

        try:
            result = call_openai(
                api_key=api_key,
                model=model,
                instructions="你是高级投手、制片和AI视频执行负责人，输出必须可直接开工。",
                schema_name="ad_plan_result",
                schema=GENERATION_SCHEMA,
                prompt_text=generation_prompt(prompt_data),
                images=[*product_images[:4], *reference_images[:4]],
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})
            return

        self.send_json(200, {"result": result})

    def handle_save_project(self):
        body = self.read_json()
        form_data = body.get("formData", {})
        result = body.get("result", {})
        product_images = body.get("productImages", [])
        reference_images = body.get("referenceImages", [])

        if not result:
            self.send_json(400, {"error": "缺少生成结果"})
            return

        project_name = safe_slug(form_data.get("productName") or "untitled_project")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = PROJECTS_DIR / f"{timestamp}_{project_name}"
        product_dir = project_dir / "product_images"
        reference_dir = project_dir / "reference_images"

        product_dir.mkdir(parents=True, exist_ok=True)
        reference_dir.mkdir(parents=True, exist_ok=True)

        save_images(product_images, product_dir)
        save_images(reference_images, reference_dir)

        markdown_path = project_dir / "plan.md"
        json_path = project_dir / "project.json"

        markdown_path.write_text(result.get("markdown", ""), encoding="utf-8")
        json_path.write_text(
            json.dumps(
                {
                    "savedAt": datetime.now().isoformat(timespec="seconds"),
                    "formData": form_data,
                    "result": result,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        self.send_json(
            200,
            {
                "projectDir": str(project_dir),
                "markdownPath": str(markdown_path),
                "jsonPath": str(json_path),
            },
        )

    def read_json(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        return json.loads(raw.decode("utf-8"))

    def send_json(self, status_code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(os.environ.get("PORT") or os.environ.get("AI_VIDEO_AGENT_PORT", DEFAULT_PORT))
    host = os.environ.get("AI_VIDEO_AGENT_HOST", "0.0.0.0")
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"AI video agent running at http://{host}:{port}")
    server.serve_forever()


def safe_slug(value):
    cleaned = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", value.strip())
    return cleaned[:60] or "project"


def save_images(images, target_dir):
    for index, image in enumerate(images, start=1):
      raw = base64_to_bytes(image.get("data", ""))
      suffix = guess_suffix(image.get("mimeType", "image/jpeg"))
      file_name = safe_slug(Path(image.get("name") or f"image_{index}").stem) + suffix
      (target_dir / file_name).write_bytes(raw)


def base64_to_bytes(data):
    return __import__("base64").b64decode(data.encode("utf-8"))


def guess_suffix(mime_type):
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    return mapping.get(mime_type, ".jpg")


def resolve_api_key(body):
    manual_key = str(body.get("apiKey", "")).strip()
    if manual_key:
        return manual_key
    return os.environ.get("OPENAI_API_KEY", "").strip()


if __name__ == "__main__":
    main()
