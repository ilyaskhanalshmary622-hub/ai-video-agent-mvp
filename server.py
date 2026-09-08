import base64
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request


ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8765
OPENAI_URL = "https://api.openai.com/v1/responses"
PROJECTS_DIR = ROOT / "saved_projects"


EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "videoName": {"type": "string"},
        "platform": {
            "type": "string",
            "enum": ["TikTok", "AppLovin", "TikTok + AppLovin", "Facebook/Instagram"],
        },
        "materialType": {
            "type": "string",
            "enum": ["剧情冲突型", "痛点测评型", "before-after型", "UGC口播型", "产品演示型", "视觉满足型"],
        },
        "objective": {
            "type": "string",
            "enum": ["高点击", "高停留", "高转化", "冷启动测款"],
        },
        "productType": {"type": "string"},
        "summary": {"type": "string"},
        "videoLink": {"type": "string"},
        "videoSource": {"type": "string"},
        "narrative": {"type": "string"},
        "transcript": {"type": "string"},
        "hookGuess": {"type": "string"},
        "frameNotes": {"type": "string"},
        "focusRequest": {"type": "string"},
    },
    "required": [
        "videoName",
        "platform",
        "materialType",
        "objective",
        "productType",
        "summary",
        "videoLink",
        "videoSource",
        "narrative",
        "transcript",
        "hookGuess",
        "frameNotes",
        "focusRequest",
    ],
    "additionalProperties": False,
}


GENERATION_SCHEMA = {
    "type": "object",
    "properties": {
        "projectJudgment": {
            "type": "object",
            "properties": {
                "materialType": {"type": "string"},
                "objectiveType": {"type": "string"},
                "platformFit": {"type": "string"},
                "platformReason": {"type": "string"},
            },
            "required": ["materialType", "objectiveType", "platformFit", "platformReason"],
            "additionalProperties": False,
        },
        "painPoint": {"type": "string"},
        "sellingPoint": {"type": "string"},
        "audienceResonance": {"type": "string"},
        "viralTriggers": {"type": "array", "items": {"type": "string"}},
        "conversionDriver": {"type": "string"},
        "platformLogic": {"type": "string"},
        "timeline": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "timeRange": {"type": "string"},
                    "visual": {"type": "string"},
                    "camera": {"type": "string"},
                    "expression": {"type": "string"},
                    "emotionRole": {"type": "string"},
                    "copy": {"type": "string"},
                    "whyEffective": {"type": "string"},
                },
                "required": [
                    "timeRange",
                    "visual",
                    "camera",
                    "expression",
                    "emotionRole",
                    "copy",
                    "whyEffective",
                ],
                "additionalProperties": False,
            },
        },
        "hookType": {"type": "string"},
        "conflictPath": {"type": "string"},
        "productTiming": {"type": "string"},
        "trustMethod": {"type": "string"},
        "copyPoints": {"type": "array", "items": {"type": "string"}},
        "avoidPoints": {"type": "array", "items": {"type": "string"}},
        "klingPrompts": {"type": "array", "items": {"type": "string"}},
        "veoPrompts": {"type": "array", "items": {"type": "string"}},
        "aggressiveVersion": {"type": "string"},
        "stableVersion": {"type": "string"},
        "firstTestSuggestions": {"type": "array", "items": {"type": "string"}},
        "remixDirections": {"type": "array", "items": {"type": "string"}},
        "referenceSummary": {"type": "string"},
        "focusSummary": {"type": "string"},
        "summary": {"type": "string"},
    },
    "required": [
        "projectJudgment",
        "painPoint",
        "sellingPoint",
        "audienceResonance",
        "viralTriggers",
        "conversionDriver",
        "platformLogic",
        "timeline",
        "hookType",
        "conflictPath",
        "productTiming",
        "trustMethod",
        "copyPoints",
        "avoidPoints",
        "klingPrompts",
        "veoPrompts",
        "aggressiveVersion",
        "stableVersion",
        "firstTestSuggestions",
        "remixDirections",
        "referenceSummary",
        "focusSummary",
        "summary",
    ],
    "additionalProperties": False,
}


VIDEO_OVERVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "videoName": {"type": "string"},
        "productType": {"type": "string"},
        "summary": {"type": "string"},
        "narrative": {"type": "string"},
        "transcript": {"type": "string"},
        "hookGuess": {"type": "string"},
        "frameNotes": {"type": "string"},
    },
    "required": [
        "videoName",
        "productType",
        "summary",
        "narrative",
        "transcript",
        "hookGuess",
        "frameNotes",
    ],
    "additionalProperties": False,
}


OPX_DIAGNOSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "executiveSummary": {"type": "string"},
        "accountStatus": {"type": "string"},
        "mainProblem": {"type": "string"},
        "budgetDecision": {"type": "string"},
        "creativeDecision": {"type": "string"},
        "landingDecision": {"type": "string"},
        "competitorInsight": {"type": "string"},
        "nextActions": {"type": "array", "items": {"type": "string"}},
        "creativeBriefs": {"type": "array", "items": {"type": "string"}},
        "riskWarnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "executiveSummary",
        "accountStatus",
        "mainProblem",
        "budgetDecision",
        "creativeDecision",
        "landingDecision",
        "competitorInsight",
        "nextActions",
        "creativeBriefs",
        "riskWarnings",
    ],
    "additionalProperties": False,
}


def build_image_input(images):
    return [
        {
            "type": "input_image",
            "image_url": f"data:{image['mimeType']};base64,{image['data']}",
        }
        for image in images
    ]


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
    req = request.Request(
        OPENAI_URL,
        data=json.dumps(payload).encode("utf-8"),
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
        "你是短视频爆款拆解助手“凯旋爆款拆解”。"
        "用户会上传竞品视频截图，你要根据截图推断这是怎样的一条短视频广告，并回填表单。"
        "输出要务实、像做过大量 TikTok 和 AppLovin 素材拆解的投手。"
        "如果信息不完整，就做最合理的保守判断。"
        "不要发散，不要写空话。"
    )


def video_overview_prompt(form_data):
    return f"""
你是“凯旋爆款拆解”的视频预分析模块。

用户上传了一条短视频广告，你现在只能基于自动抽出的关键帧和少量已有信息，先产出一版可用的视频概述。

要求：
1. 目标是帮后续拆解减少人工输入。
2. narrative 要写成顺序清楚的画面概述。
3. summary 要压缩成一句话。
4. hookGuess 要判断这条素材大概率靠什么抓停留。
5. frameNotes 要简短说明关键帧大概对应哪几个阶段。
6. transcript 如果关键帧里看不清字幕，可以明确写“未从关键帧稳定识别到字幕”。
7. 不要写空话，不要假装看到了视频里不存在的细节。

已知输入：
{json.dumps(form_data, ensure_ascii=False, indent=2)}
""".strip()


def generation_prompt(form_data):
    return f"""
你是“凯旋爆款拆解”，顶级短视频广告拆解专家、TikTok/AppLovin 爆款结构分析师、素材投手创意顾问。

你的任务不是总结，而是把用户提供的爆款素材拆成可复刻、可二创、可超越的结构。

严格要求：
1. 严禁表格。
2. 必须站在投手、创意总监、制片人的视角。
3. 一切围绕 CTR、停留、完播、点击、冷启动适配来判断。
4. timeline 必须逐段拆解，每段都像实战分镜。
5. 重点看前 1 秒、前 3 秒、产品露出时机、CTA 收口。
6. 如果用户上传了截图，要结合截图去判断镜头节奏和爆点。
7. 结果必须能直接拿去做 AI 复刻和二创。

用户输入如下：
{json.dumps(form_data, ensure_ascii=False, indent=2)}
""".strip()


def opx_diagnosis_prompt(form_data):
    return f"""
你是 OPX 运营助手，一个资深 Facebook / Instagram 跨境电商投手和素材操盘手。

你的任务：根据用户填写的投放数据、素材信号、竞品情报，输出真实可执行的投放诊断。

判断重点：
1. 先判断能不能放量，不要空泛夸。
2. 明确问题在素材点击、落地页转化、利润线、频次疲劳、竞品学习方向中的哪一类。
3. Facebook / Instagram 跨境电商场景优先，兼顾百货、家居、清洁、美妆个护等产品。
4. 预算建议必须具体：加预算、维持、降预算、关停、复制新组、换素材池。
5. 素材建议必须能给剪辑或 AI 视频创作者直接执行。
6. 如果竞品链接不可直接查看，只能基于用户填写的信息判断，不要假装看到了链接内容。
7. 输出必须犀利、专业、可执行，像每日投放复盘，不要写鸡汤。

用户输入：
{json.dumps(form_data, ensure_ascii=False, indent=2)}
""".strip()


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path == "/api/opx-diagnose":
            self.handle_opx_diagnose()
            return
        if self.path == "/api/extract-frames":
            self.handle_extract_frames()
            return
        if self.path == "/api/video-overview":
            self.handle_video_overview()
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
            self.send_json(200, {"serverApiReady": bool(os.environ.get("OPENAI_API_KEY", "").strip())})
            return
        super().do_GET()

    def handle_opx_diagnose(self):
        body = self.read_json()
        api_key = resolve_api_key(body)
        model = body.get("model", "").strip() or "gpt-4.1-mini"
        form_data = body.get("formData", {})

        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return

        try:
            result = call_openai(
                api_key=api_key,
                model=model,
                instructions="你是 OPX 运营助手。只输出结构化 JSON，不要输出表格。",
                schema_name="opx_diagnosis_result",
                schema=OPX_DIAGNOSIS_SCHEMA,
                prompt_text=opx_diagnosis_prompt(form_data),
                images=[],
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})
            return

        self.send_json(200, {"result": result})

    def handle_extract_frames(self):
        body = self.read_json()
        api_key = resolve_api_key(body)
        model = body.get("model", "").strip() or "gpt-4.1-mini"
        images = body.get("images", [])
        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return
        if not images:
            self.send_json(400, {"error": "缺少关键截图"})
            return
        try:
            extracted = call_openai(
                api_key=api_key,
                model=model,
                instructions=extraction_prompt(),
                schema_name="viral_video_frame_extraction",
                schema=EXTRACTION_SCHEMA,
                prompt_text="请基于这些视频截图，推断并回填拆解表单。",
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
        video_files = body.get("videoFiles", [])
        reference_images = body.get("referenceImages", [])

        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return

        prompt_data = dict(form_data)
        prompt_data["referenceImageCount"] = len(reference_images)
        prompt_data["hasReferenceImages"] = bool(reference_images)
        prompt_data["hasVideoLink"] = bool(str(form_data.get("videoLink", "")).strip())
        prompt_data["videoFileCount"] = len(video_files)

        auto_frames = []
        if video_files:
            try:
                auto_frames = extract_frames_from_video_payload(video_files[0], max_frames=6)
            except Exception as exc:  # noqa: BLE001
                self.send_json(500, {"error": f"视频抽帧失败：{exc}"})
                return

        all_images = [*reference_images[:6]]
        if auto_frames:
            all_images = [*auto_frames, *all_images][:6]
            prompt_data["autoFrameCount"] = len(auto_frames)
        else:
            prompt_data["autoFrameCount"] = 0

        try:
            result = call_openai(
                api_key=api_key,
                model=model,
                instructions="你是凯旋爆款拆解。输出必须是能直接指导复刻和二创的实战拆解结果。",
                schema_name="viral_breakdown_result",
                schema=GENERATION_SCHEMA,
                prompt_text=generation_prompt(prompt_data),
                images=all_images,
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})
            return
        self.send_json(200, {"result": result})

    def handle_video_overview(self):
        body = self.read_json()
        api_key = resolve_api_key(body)
        model = body.get("model", "").strip() or "gpt-4.1-mini"
        form_data = body.get("formData", {})
        video_files = body.get("videoFiles", [])
        reference_images = body.get("referenceImages", [])

        if not api_key:
            self.send_json(400, {"error": "缺少 API Key"})
            return
        if not video_files and not reference_images:
            self.send_json(400, {"error": "缺少视频或关键截图"})
            return

        auto_frames = []
        if video_files:
            try:
                auto_frames = extract_frames_from_video_payload(video_files[0], max_frames=6)
            except Exception as exc:  # noqa: BLE001
                self.send_json(500, {"error": f"视频抽帧失败：{exc}"})
                return

        images = [*auto_frames, *reference_images][:6]
        prompt_data = dict(form_data)
        prompt_data["autoFrameCount"] = len(auto_frames)
        prompt_data["referenceImageCount"] = len(reference_images)

        try:
            overview = call_openai(
                api_key=api_key,
                model=model,
                instructions="你是短视频广告视频概述助手，先根据关键帧为后续拆解生成首轮概述。",
                schema_name="video_overview_result",
                schema=VIDEO_OVERVIEW_SCHEMA,
                prompt_text=video_overview_prompt(prompt_data),
                images=images,
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})
            return

        self.send_json(200, {"overview": overview})

    def handle_save_project(self):
        body = self.read_json()
        form_data = body.get("formData", {})
        result = body.get("result", {})
        video_files = body.get("videoFiles", [])
        reference_images = body.get("referenceImages", [])
        if not result:
            self.send_json(400, {"error": "缺少生成结果"})
            return

        project_name = safe_slug(form_data.get("videoName") or "untitled_project")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = PROJECTS_DIR / f"{timestamp}_{project_name}"
        video_dir = project_dir / "video_files"
        reference_dir = project_dir / "reference_images"
        video_dir.mkdir(parents=True, exist_ok=True)
        reference_dir.mkdir(parents=True, exist_ok=True)
        save_binary_files(video_files, video_dir)
        save_images(reference_images, reference_dir)

        markdown_path = project_dir / "breakdown.md"
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
    print(f"Kaixuan breakdown agent running at http://{host}:{port}")
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


def save_binary_files(files, target_dir):
    for index, item in enumerate(files, start=1):
        raw = base64_to_bytes(item.get("data", ""))
        suffix = guess_binary_suffix(item.get("mimeType", "application/octet-stream"))
        file_name = safe_slug(Path(item.get("name") or f"file_{index}").stem) + suffix
        (target_dir / file_name).write_bytes(raw)


def base64_to_bytes(data):
    return base64.b64decode(data.encode("utf-8"))


def guess_suffix(mime_type):
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    return mapping.get(mime_type, ".jpg")


def guess_binary_suffix(mime_type):
    mapping = {
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
        "video/webm": ".webm",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    return mapping.get(mime_type, ".bin")


def extract_frames_from_video_payload(video_payload, max_frames=6):
    ffmpeg_path = shutil.which("ffmpeg")
    ffprobe_path = shutil.which("ffprobe") or ffmpeg_path
    if not ffmpeg_path:
        raise RuntimeError("本机未找到 ffmpeg。")

    mime_type = video_payload.get("mimeType", "video/mp4")
    suffix = guess_binary_suffix(mime_type)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        video_path = temp_path / f"source{suffix}"
        video_path.write_bytes(base64_to_bytes(video_payload.get("data", "")))

        duration = probe_video_duration(video_path, ffprobe_path)
        timestamps = build_frame_timestamps(duration, max_frames=max_frames)

        frames = []
        for index, ts in enumerate(timestamps, start=1):
            frame_path = temp_path / f"frame_{index}.jpg"
            extract_frame(ffmpeg_path, video_path, frame_path, ts)
            if frame_path.exists() and frame_path.stat().st_size > 0:
                frames.append(
                    {
                        "name": frame_path.name,
                        "mimeType": "image/jpeg",
                        "data": base64.b64encode(frame_path.read_bytes()).decode("utf-8"),
                    }
                )
        if not frames:
            raise RuntimeError("没有成功抽出关键帧。")
        return frames


def probe_video_duration(video_path, ffprobe_path):
    if ffprobe_path and Path(ffprobe_path).name.lower().startswith("ffprobe"):
        command = [
            ffprobe_path,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        try:
            return max(float(result.stdout.strip()), 0.0)
        except ValueError:
            return 0.0
    return 0.0


def build_frame_timestamps(duration, max_frames=6):
    if duration <= 0:
        return [0.0, 1.0, 2.5, 4.0, 6.0, 8.0][:max_frames]
    safe_duration = max(duration - 0.2, 0.2)
    if safe_duration <= max_frames:
        step = safe_duration / max_frames
        return [round(step * index, 2) for index in range(max_frames)]
    start = min(0.25, safe_duration / 10)
    end = safe_duration * 0.92
    step = (end - start) / max(max_frames - 1, 1)
    return [round(start + step * index, 2) for index in range(max_frames)]


def extract_frame(ffmpeg_path, video_path, frame_path, timestamp):
    command = [
        ffmpeg_path,
        "-y",
        "-ss",
        str(timestamp),
        "-i",
        str(video_path),
        "-frames:v",
        "1",
        "-q:v",
        "2",
        str(frame_path),
    ]
    subprocess.run(command, capture_output=True, text=True, check=True)


def resolve_api_key(body):
    manual_key = str(body.get("apiKey", "")).strip()
    if manual_key:
        return manual_key
    return os.environ.get("OPENAI_API_KEY", "").strip()


if __name__ == "__main__":
    main()
