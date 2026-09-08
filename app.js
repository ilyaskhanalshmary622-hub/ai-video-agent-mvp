const form = document.getElementById("generator-form");
const output = document.getElementById("output");
const fillDemoBtn = document.getElementById("fill-demo");
const copyMarkdownBtn = document.getElementById("copy-markdown");
const extractFramesBtn = document.getElementById("extract-frames");
const saveProjectBtn = document.getElementById("save-project");
const videoInput = document.getElementById("video-files");
const videoPreview = document.getElementById("video-preview");
const referenceInput = document.getElementById("reference-images");
const referencePreview = document.getElementById("reference-preview");
const apiModeBanner = document.getElementById("api-mode-banner");
const runStatus = document.getElementById("run-status");
const dropzone = document.querySelector(".dropzone");

let lastGeneratedResult = null;
let serverApiReady = false;
let autoOverviewLoaded = false;

const demoData = {
  videoName: "浴室清洁刷爆款测评视频",
  platform: "TikTok + AppLovin",
  language: "英文",
  materialType: "痛点测评型",
  objective: "高点击",
  productType: "电动清洁刷",
  summary: "开局脏污特写，中段快速去污，结尾 before-after 对比加 CTA。",
  videoLink: "",
  videoSource: "TikTok竞品",
  narrative:
    "视频开头先给浴室瓷砖发黑发黄的近景特写，女主一脸嫌弃。随后镜头切到她拿出电动清洁刷，快速在缝隙和墙面来回刷洗。中段给刷头旋转和泡沫带走污渍的特写，再切 clean vs dirty 对比。结尾给清洁前后同框，字幕强调省力、清得快，并提示立即购买。",
  transcript:
    "This bathroom was disgusting. I thought nothing could fix it. Then I tried this spin scrubber. Look at that difference. No more scrubbing for hours. Tap to shop now.",
  hookGuess:
    "我感觉它主要靠脏污特写 + 快速清洁反差抓停留，产品露出比较早，适合高点击首测。",
  frameNotes: "第1张是脏污特写，第2张是产品上手，第3张是刷头运转，第4张是 before-after。",
  focusRequest: "重点拆前3秒钩子、镜头节奏、字幕打法、怎么AI复刻。",
  guardrails: "不要医疗承诺，不要过度虚假夸张，不要侵权品牌元素。"
};

fillDemoBtn.addEventListener("click", () => {
  Object.entries(demoData).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
  videoInput.value = "";
  referenceInput.value = "";
  renderVideoPreview([]);
  renderReferencePreview([]);
});

videoInput.addEventListener("change", () => {
  const files = Array.from(videoInput.files || []);
  renderVideoPreview(files);
  syncDropzoneState(files);
  autoOverviewLoaded = false;
});

referenceInput.addEventListener("change", () => {
  renderReferencePreview(Array.from(referenceInput.files || []));
  autoOverviewLoaded = false;
});

copyMarkdownBtn.addEventListener("click", async () => {
  const markdown = output.dataset.markdown;
  if (!markdown) {
    alert("先生成拆解，再复制。");
    return;
  }
  await navigator.clipboard.writeText(markdown);
  copyMarkdownBtn.textContent = "已复制";
  setTimeout(() => {
    copyMarkdownBtn.textContent = "复制 Markdown";
  }, 1200);
});

extractFramesBtn.addEventListener("click", async () => {
  const files = Array.from(referenceInput.files || []);
  const apiKey = form.elements.apiKey.value.trim();
  if (!apiKey && !serverApiReady) {
    alert("当前服务端没有配置环境变量，请先填写 OpenAI API Key。");
    return;
  }
  if (!files.length) {
    alert("先上传至少 1 张关键截图。");
    return;
  }

  setBusy(extractFramesBtn, true, "识别中...");
  try {
    const payload = {
      apiKey,
      model: form.elements.visionModel.value.trim() || "gpt-4.1-mini",
      images: await filesToPayload(files.slice(0, 6))
    };

    const response = await fetch("/api/extract-frames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "识别失败");
    }
    fillExtractedFields(data.extracted || {});
  } catch (error) {
    alert(`截图识别失败：${error.message}`);
  } finally {
    setBusy(extractFramesBtn, false, "识别截图重点");
  }
});

saveProjectBtn.addEventListener("click", async () => {
  if (!lastGeneratedResult) {
    alert("先生成拆解，再保存项目。");
    return;
  }

  const formSnapshot = Object.fromEntries(new FormData(form).entries());
  setBusy(saveProjectBtn, true, "保存中...");
  try {
    const response = await fetch("/api/save-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData: sanitizeFormForSave(formSnapshot),
        result: lastGeneratedResult,
        videoFiles: await filesToPayload(Array.from(videoInput.files || [])),
        referenceImages: await filesToPayload(Array.from(referenceInput.files || []))
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "保存失败");
    }
    alert(`项目已保存\n目录：${data.projectDir}\nMarkdown：${data.markdownPath}`);
  } catch (error) {
    alert(`保存失败：${error.message}`);
  } finally {
    setBusy(saveProjectBtn, false, "保存项目");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateBreakdown();
});

async function generateBreakdown() {
  const formData = Object.fromEntries(new FormData(form).entries());
  formData.videoFiles = Array.from(videoInput.files || []);
  formData.referenceImages = Array.from(referenceInput.files || []);

  if (!formData.videoName.trim() && formData.videoFiles.length) {
    const firstVideoName = formData.videoFiles[0].name.replace(/\.[^.]+$/, "");
    formData.videoName = firstVideoName;
    form.elements.videoName.value = firstVideoName;
  }

  const apiKey = form.elements.apiKey.value.trim();
  const generationModel = form.elements.generationModel.value.trim() || "gpt-4.1-mini";
  const submitButton = form.querySelector('button[type="submit"]');

  setBusy(submitButton, true, "生成中...");
  try {
    if (!formData.videoFiles.length && !formData.referenceImages.length && !hasMeaningfulNarrative(formData)) {
      setRunStatus("先上传视频、关键截图，或补一段文字描述。", "warning");
      alert("先上传视频、关键截图，或补一段文字描述。");
      return;
    }

    setRunStatus("正在检查输入...");
    if ((formData.videoFiles.length || formData.referenceImages.length) && !hasMeaningfulNarrative(formData)) {
      setRunStatus("正在自动抽取关键帧并生成视频概述...");
      await ensureVideoOverview(formData, apiKey);
      formData.narrative = form.elements.narrative.value.trim();
      formData.summary = form.elements.summary.value.trim();
      formData.hookGuess = form.elements.hookGuess.value.trim();
      formData.transcript = form.elements.transcript.value.trim();
      formData.frameNotes = form.elements.frameNotes.value.trim();
      formData.productType = form.elements.productType.value.trim();
      formData.videoName = form.elements.videoName.value.trim();
    }

    if (!apiKey && !serverApiReady) {
      setRunStatus("未连接模型，已切换到本地模板拆解。", "warning");
      renderResult(buildBreakdown(formData));
      return;
    }

    setRunStatus("正在调用模型生成拆解与复刻方案...");
    const payload = {
      apiKey,
      model: generationModel,
      formData: { ...formData, videoFiles: undefined, referenceImages: undefined },
      videoFiles: await filesToPayload(formData.videoFiles),
      referenceImages: await filesToPayload(formData.referenceImages)
    };

    const response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "生成失败");
    }

    setRunStatus("拆解完成。", "success");
    renderResult(normalizeRemoteResult(data.result, formData));
  } catch (error) {
    setRunStatus(`模型调用失败，已回退本地模板：${error.message}`, "warning");
    alert(`调用真实模型失败，已回退到本地模板：${error.message}`);
    renderResult(buildBreakdown(formData));
  } finally {
    setBusy(submitButton, false, "生成拆解");
  }
}

async function ensureVideoOverview(formData, apiKey) {
  if (autoOverviewLoaded) {
    return;
  }
  if (!apiKey && !serverApiReady) {
    return;
  }

  const payload = {
    apiKey,
    model: form.elements.visionModel.value.trim() || "gpt-4.1-mini",
    formData: {
      videoName: formData.videoName,
      productType: formData.productType,
      summary: formData.summary,
      narrative: formData.narrative,
      transcript: formData.transcript,
      hookGuess: formData.hookGuess,
      frameNotes: formData.frameNotes,
      videoSource: formData.videoSource,
      videoLink: formData.videoLink,
      platform: formData.platform,
      materialType: formData.materialType,
      objective: formData.objective
    },
    videoFiles: await filesToPayload(formData.videoFiles),
    referenceImages: await filesToPayload(formData.referenceImages)
  };

  const response = await fetch("/api/video-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "自动视频概述失败");
  }

  fillVideoOverview(data.overview || {});
  autoOverviewLoaded = true;
  setRunStatus("视频概述已完成，正在进入正式拆解...");
}

function buildBreakdown(data) {
  const transcript = (data.transcript || "").trim();
  const narrative = (data.narrative || "").trim();
  const summary = (data.summary || "").trim();
  const productType = (data.productType || "该产品").trim();
  const hookGuess = (data.hookGuess || "").trim();
  const videoCount = data.videoFiles.length;
  const framesCount = data.referenceImages.length;
  const focus = (data.focusRequest || "重点看这条为什么能抓停留、为什么值得抄。").trim();

  const projectJudgment = {
    materialType: data.materialType || "痛点测评型",
    objectiveType: judgeObjective(data.objective, data.materialType),
    platformFit: data.platform || "TikTok",
    platformReason: buildPlatformReason(data.platform, data.materialType)
  };

  const viralTriggers = buildViralTriggers(data.materialType, narrative, hookGuess);
  const timeline = buildTimeline(data, narrative, transcript);
  const copyPoints = [
    "开头直接给结果或问题最狠的一帧，不绕。",
    "产品露出足够早，让用户马上知道卖什么。",
    "字幕围绕痛点和结果，不写废话。"
  ];
  const avoidPoints = [
    "不要把节奏拖成讲解片。",
    "不要只抄镜头顺序，不抄情绪强度。",
    "不要把产品放到太后面。"
  ];
  const firstTestSuggestions = [
    "先测开头是先给脏污/冲突，还是先给结果对比。",
    "再测字幕是夸张型还是真实吐槽型。",
    "最后测 CTA 是强催单还是轻引导。"
  ];
  const remixDirections = [
    "把人物换成更本地化的人设，保留同样的钩子顺序。",
    "把场景从浴室/卧室切到更高痛点场景，放大代入。",
    "保留核心 before-after 结构，但把字幕改成更狠的情绪表达。"
  ];

  const result = {
    projectJudgment,
    painPoint: buildPainPoint(data, narrative),
    sellingPoint: buildSellingPoint(data, narrative),
    audienceResonance: buildAudienceResonance(data, productType),
    viralTriggers,
    conversionDriver: buildConversionDriver(data.materialType),
    platformLogic: buildPlatformLogic(data.platform, data.objective),
    timeline,
    hookType: buildHookType(data.materialType, hookGuess),
    conflictPath: buildConflictPath(data.materialType),
    productTiming: buildProductTiming(data.materialType),
    trustMethod: "通过真实脏污/问题画面、上手过程、前后对比和口播吐槽建立可信度。",
    copyPoints,
    avoidPoints,
    klingPrompts: buildKlingPrompts(timeline, data),
    veoPrompts: buildVeoPrompts(timeline, data),
    aggressiveVersion: "把第 1 镜头改成最夸张的脏污或翻车结果，1 秒内直接把情绪拉满，再在第 2 镜头交代产品。",
    stableVersion: "保留原结构，但把夸张语气降一点，增加真实上手和细节近景，让它更像可持续跑量素材。",
    firstTestSuggestions,
    remixDirections,
    referenceSummary:
      framesCount > 0
        ? `已上传 ${framesCount} 张关键截图${videoCount ? `，并附带 ${videoCount} 个视频文件` : ""}，可用于拆前 3 秒、产品露出和 CTA 位置。`
        : videoCount
          ? `已上传 ${videoCount} 个视频文件，但未补关键截图。本次拆解主要基于你的文字描述，建议再补 4-6 张关键帧。`
          : "未上传关键截图，本次拆解主要基于文本描述。",
    focusSummary: focus,
    summary: summary || "这是一条典型的短视频投流素材，核心是用强问题或强反差抢停留。"
  };

  result.markdown = buildMarkdown(result);
  return result;
}

function buildTimeline(data, narrative, transcript) {
  const transcriptLine = transcript || "无明确字幕，建议按强钩子逻辑补。";
  return [
    {
      timeRange: "00:00 - 00:02",
      visual: `开头直接给${extractOpeningVisual(narrative)}，先把最刺眼的问题或结果甩到脸上。`,
      camera: "超近景 / 快切 / 直接进重点",
      expression: "告诉用户这事严重、值得停下来。",
      emotionRole: "抓停留，制造嫌弃、震惊或好奇。",
      copy: firstCopyLine(transcriptLine),
      whyEffective: "因为它不解释，先给刺激点，适合冷流量抢第一眼。"
    },
    {
      timeRange: "00:02 - 00:05",
      visual: "人物或手部开始上手，产品首次明确露出，动作直接进入核心功能。",
      camera: "中近景 + 手部特写",
      expression: "从问题切到解决动作，让用户知道卖什么。",
      emotionRole: "完成信息交代，防止只看热闹不知道产品。",
      copy: secondCopyLine(transcriptLine),
      whyEffective: "产品出得早，平台更容易识别为有效广告素材，不浪费前 3 秒流量。"
    },
    {
      timeRange: "00:05 - 00:08",
      visual: "给功能效果或过程爽点，比如刷洗、变干净、变顺滑、明显变化。",
      camera: "局部特写 / 动作连续",
      expression: "证明不是空喊卖点，而是真的有效果。",
      emotionRole: "把兴趣推进到相信。",
      copy: "Look at that difference.",
      whyEffective: "过程爽感和结果反差，是高停留素材的中段核心。"
    },
    {
      timeRange: "00:08 - 00:12",
      visual: "给 before-after 同框、人物反应、环境变化或局部成果放大。",
      camera: "对比镜头 / 拉近细节",
      expression: "把结果讲死，让用户不用理解成本。",
      emotionRole: "制造转化冲动。",
      copy: "No more wasting time on this.",
      whyEffective: "直接把省力、省时、结果明显三个购买理由堆在一起。"
    },
    {
      timeRange: "00:12 - 00:15",
      visual: "收尾给 CTA、产品定格、购买指令或最后一次强对比。",
      camera: "稳定收口镜头",
      expression: "别只是看，去点。",
      emotionRole: "从看爽切到行动。",
      copy: "Tap to shop now.",
      whyEffective: "结尾不空掉，继续推动点击或购买。"
    }
  ];
}

function buildMarkdown(result) {
  return [
    "【项目判断】",
    `- 素材类型：${result.projectJudgment.materialType}`,
    `- 素材目标：${result.projectJudgment.objectiveType}`,
    `- 平台适配：${result.projectJudgment.platformFit}`,
    `- 适配原因：${result.projectJudgment.platformReason}`,
    "",
    "【SECTION 1：Marketing Anatomy｜爆款底层逻辑】",
    `- 痛点：${result.painPoint}`,
    `- 卖点：${result.sellingPoint}`,
    `- 人群代入：${result.audienceResonance}`,
    ...result.viralTriggers.map((item) => `- 流量爆点：${item}`),
    `- 转化抓手：${result.conversionDriver}`,
    `- 平台适配逻辑：${result.platformLogic}`,
    "",
    "【SECTION 2：Frame-by-Frame Dissection｜全方位分镜拆解】",
    ...result.timeline.flatMap((item) => [
      `- [时间轴] ${item.timeRange}`,
      `  【画面内容】${item.visual}`,
      `  【镜头语言】${item.camera}`,
      `  【核心表达】${item.expression}`,
      `  【情绪作用】${item.emotionRole}`,
      `  【文案/字幕】${item.copy}`,
      `  【这段为什么有效】${item.whyEffective}`
    ]),
    "",
    "【SECTION 3：爆款结构总结】",
    `- 钩子类型：${result.hookType}`,
    `- 冲突升级路径：${result.conflictPath}`,
    `- 产品介入时机：${result.productTiming}`,
    `- 信任建立方式：${result.trustMethod}`,
    ...result.copyPoints.map((item) => `- 最值得抄：${item}`),
    ...result.avoidPoints.map((item) => `- 最不该照搬：${item}`),
    "",
    "【SECTION 4：AI 像素级复刻提示词】",
    ...result.klingPrompts.map((item, index) => `- Kling / 即梦提示词 ${index + 1}：${item}`),
    ...result.veoPrompts.map((item, index) => `- Veo 3 Prompt ${index + 1}：${item}`),
    "",
    "【SECTION 5：超越版本建议】",
    `- A版更狠改法：${result.aggressiveVersion}`,
    `- B版更稳改法：${result.stableVersion}`,
    ...result.firstTestSuggestions.map((item) => `- 首测建议：${item}`),
    ...result.remixDirections.map((item) => `- 二创方向：${item}`),
    "",
    "【补充】",
    `- 截图摘要：${result.referenceSummary}`,
    `- 重点需求：${result.focusSummary}`
  ].join("\n");
}

function renderResult(result) {
  lastGeneratedResult = result;
  output.classList.remove("empty");
  output.dataset.markdown = result.markdown || buildMarkdown(result);
  output.innerHTML = `
    <section class="result-block">
      <h3>项目判断</h3>
      <ul>
        <li><strong>素材类型：</strong>${escapeHtml(result.projectJudgment.materialType)}</li>
        <li><strong>素材目标：</strong>${escapeHtml(result.projectJudgment.objectiveType)}</li>
        <li><strong>平台适配：</strong>${escapeHtml(result.projectJudgment.platformFit)}</li>
        <li><strong>适配原因：</strong>${escapeHtml(result.projectJudgment.platformReason)}</li>
      </ul>
    </section>

    <section class="result-block">
      <h3>SECTION 1：Marketing Anatomy</h3>
      <ul>
        <li><strong>痛点：</strong>${escapeHtml(result.painPoint)}</li>
        <li><strong>卖点：</strong>${escapeHtml(result.sellingPoint)}</li>
        <li><strong>人群代入：</strong>${escapeHtml(result.audienceResonance)}</li>
        <li><strong>流量爆点：</strong>${escapeHtml(result.viralTriggers.join(" / "))}</li>
        <li><strong>转化抓手：</strong>${escapeHtml(result.conversionDriver)}</li>
        <li><strong>平台适配逻辑：</strong>${escapeHtml(result.platformLogic)}</li>
      </ul>
    </section>

    <section class="result-block">
      <h3>SECTION 2：Frame-by-Frame Dissection</h3>
      <div class="timeline-list">
        ${result.timeline
          .map(
            (item) => `
              <article class="timeline-card">
                <p class="time-tag">${escapeHtml(item.timeRange)}</p>
                <p><strong>画面内容：</strong>${escapeHtml(item.visual)}</p>
                <p><strong>镜头语言：</strong>${escapeHtml(item.camera)}</p>
                <p><strong>核心表达：</strong>${escapeHtml(item.expression)}</p>
                <p><strong>情绪作用：</strong>${escapeHtml(item.emotionRole)}</p>
                <p><strong>文案/字幕：</strong>${escapeHtml(item.copy)}</p>
                <p><strong>为什么有效：</strong>${escapeHtml(item.whyEffective)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="result-block">
      <h3>SECTION 3：爆款结构总结</h3>
      <ul>
        <li><strong>钩子类型：</strong>${escapeHtml(result.hookType)}</li>
        <li><strong>冲突升级路径：</strong>${escapeHtml(result.conflictPath)}</li>
        <li><strong>产品介入时机：</strong>${escapeHtml(result.productTiming)}</li>
        <li><strong>信任建立方式：</strong>${escapeHtml(result.trustMethod)}</li>
      </ul>
      <p class="mini-title">最值得抄</p>
      <ul>${result.copyPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p class="mini-title">最不该照搬</p>
      <ul>${result.avoidPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>

    <section class="result-block">
      <h3>SECTION 4：AI 像素级复刻提示词</h3>
      <p class="mini-title">Kling / 即梦 / 可灵类提示词</p>
      <ul>${result.klingPrompts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p class="mini-title">Google Veo 3 Prompts</p>
      <ul>${result.veoPrompts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>

    <section class="result-block">
      <h3>SECTION 5：超越版本建议</h3>
      <ul>
        <li><strong>A版更狠改法：</strong>${escapeHtml(result.aggressiveVersion)}</li>
        <li><strong>B版更稳改法：</strong>${escapeHtml(result.stableVersion)}</li>
      </ul>
      <p class="mini-title">首测建议</p>
      <ul>${result.firstTestSuggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p class="mini-title">二创方向</p>
      <ul>${result.remixDirections.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p class="summary-note"><strong>截图摘要：</strong>${escapeHtml(result.referenceSummary)}</p>
      <p class="summary-note"><strong>重点需求：</strong>${escapeHtml(result.focusSummary)}</p>
    </section>
  `;
}

function normalizeRemoteResult(result, formData) {
  const normalized = {
    ...buildBreakdown(formData),
    ...result
  };
  normalized.projectJudgment = result.projectJudgment || normalized.projectJudgment;
  normalized.viralTriggers = result.viralTriggers || normalized.viralTriggers;
  normalized.timeline = result.timeline || normalized.timeline;
  normalized.copyPoints = result.copyPoints || normalized.copyPoints;
  normalized.avoidPoints = result.avoidPoints || normalized.avoidPoints;
  normalized.klingPrompts = result.klingPrompts || normalized.klingPrompts;
  normalized.veoPrompts = result.veoPrompts || normalized.veoPrompts;
  normalized.firstTestSuggestions = result.firstTestSuggestions || normalized.firstTestSuggestions;
  normalized.remixDirections = result.remixDirections || normalized.remixDirections;
  normalized.markdown = buildMarkdown(normalized);
  return normalized;
}

function fillExtractedFields(extracted) {
  const fields = [
    "videoName",
    "productType",
    "summary",
    "narrative",
    "transcript",
    "hookGuess",
    "frameNotes",
    "focusRequest"
  ];

  fields.forEach((key) => {
    if (extracted[key] && form.elements[key]) {
      form.elements[key].value = extracted[key];
    }
  });

  ["platform", "materialType", "objective"].forEach((key) => {
    if (extracted[key] && form.elements[key]) {
      const select = form.elements[key];
      const optionExists = Array.from(select.options).some((option) => option.value === extracted[key]);
      if (optionExists) {
        select.value = extracted[key];
      }
    }
  });
}

function fillVideoOverview(overview) {
  const fields = ["videoName", "productType", "summary", "narrative", "transcript", "hookGuess", "frameNotes"];
  fields.forEach((key) => {
    if (!form.elements[key]) {
      return;
    }
    const currentValue = form.elements[key].value.trim();
    const nextValue = String(overview[key] || "").trim();
    if (!currentValue && nextValue) {
      form.elements[key].value = nextValue;
    }
  });
}

function renderReferencePreview(files) {
  if (!files.length) {
    referencePreview.className = "image-preview empty";
    referencePreview.innerHTML = "<p>上传后这里会显示关键截图预览。</p>";
    return;
  }

  referencePreview.className = "image-preview";
  referencePreview.innerHTML = "";
  files.slice(0, 6).forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "preview-card";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.innerHTML = `<strong>${index === 0 ? "封面/首帧" : `关键帧 ${index + 1}`}</strong><br>${escapeHtml(file.name)}`;
    card.appendChild(img);
    card.appendChild(meta);
    referencePreview.appendChild(card);
  });
}

function renderVideoPreview(files) {
  if (!files.length) {
    videoPreview.className = "file-preview empty";
    videoPreview.innerHTML = "<p>上传后这里会显示视频文件信息。</p>";
    syncDropzoneState([]);
    return;
  }

  videoPreview.className = "file-preview";
  const totalSizeMb = (files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1);
  videoPreview.innerHTML = `
    <div class="preview-summary">
      <div class="summary-pill">
        <span>已载入</span>
        <strong>${files.length} 个视频</strong>
      </div>
      <div class="summary-pill">
        <span>总体积</span>
        <strong>${totalSizeMb} MB</strong>
      </div>
      <div class="summary-pill">
        <span>下一步</span>
        <strong>自动抽帧拆解</strong>
      </div>
    </div>
    <div class="pipeline-strip">
      <span class="pipeline-step active">视频已载入</span>
      <span class="pipeline-step">关键帧抽取</span>
      <span class="pipeline-step">自动概述</span>
      <span class="pipeline-step">正式拆解</span>
    </div>
    <div class="file-list">
      ${files
    .slice(0, 3)
    .map((file, index) => {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      return `
        <div class="file-card">
            <div class="file-card-top">
              <strong>${index === 0 ? "主视频" : `视频 ${index + 1}`}</strong>
              <em>${sizeMb} MB</em>
            </div>
            <span>${escapeHtml(file.name)}</span>
            <span>自动抽关键帧 · 自动概述 · 正式拆解</span>
          </div>
        `;
    })
    .join("")}
    </div>
  `;
}

function syncDropzoneState(files) {
  if (!dropzone) {
    return;
  }
  dropzone.classList.toggle("has-file", files.length > 0);
}

function judgeObjective(objective, materialType) {
  if (objective) return objective;
  return materialType === "剧情冲突型" ? "高停留" : "高点击";
}

function hasMeaningfulNarrative(formData) {
  return Boolean(
    (formData.narrative || "").trim() ||
      (formData.summary || "").trim() ||
      (formData.hookGuess || "").trim() ||
      (formData.transcript || "").trim()
  );
}

function buildPlatformReason(platform, materialType) {
  if (platform === "AppLovin") {
    return "更适合前 1 秒就给刺激点、冲突和结果，越直接越好。";
  }
  if (platform === "TikTok + AppLovin") {
    return "兼顾原生停留和投流效率，要求钩子够狠、产品露出够早。";
  }
  if (platform === "Facebook/Instagram") {
    return "需要结果表达更清楚，镜头别太乱，字幕更直给。";
  }
  return materialType === "剧情冲突型"
    ? "TikTok 更吃情绪冲突、反转和原生感。"
    : "TikTok 更吃直观爽点、对比和快节奏。";
}

function buildViralTriggers(materialType, narrative, hookGuess) {
  const triggers = [];
  if (materialType.includes("剧情")) triggers.push("冲突先行，情绪推着人看下去");
  if (materialType.includes("before-after")) triggers.push("前后反差大，视觉上容易停留");
  if (materialType.includes("测评") || materialType.includes("演示")) triggers.push("过程爽感强，用户会等结果");
  if (materialType.includes("视觉")) triggers.push("画面满足感本身就是钩子");
  if (hookGuess) triggers.push(`你的判断里最成立的一点是：${hookGuess}`);
  if (!triggers.length) triggers.push(`这条素材主要靠${extractOpeningVisual(narrative)}抢第一眼。`);
  return triggers;
}

function buildPainPoint(data, narrative) {
  return data.productType
    ? `${data.productType}对应的典型痛点被快速放大，用户先看到麻烦、脏乱、低效或尴尬，再看到解决。`
    : `视频把“问题很烦、旧方案很累、结果不理想”先打出来，靠${extractOpeningVisual(narrative)}放大痛点。`;
}

function buildSellingPoint(data, narrative) {
  return data.productType
    ? `${data.productType}被包装成一个更快、更省力、更直观看到结果的解决方案。`
    : `产品被包装成能立刻结束当前问题的快捷解决方案，重点不是讲原理，而是讲结果。`;
}

function buildAudienceResonance(data, productType) {
  return `这条素材打的是“我也有这个问题，而且我也想更快解决”的代入感，尤其适合对${productType || "这类产品"}有明确需求的人群。`;
}

function buildConversionDriver(materialType) {
  if (materialType.includes("剧情")) return "靠冲突反转后的产品救场感推动点击。";
  if (materialType.includes("before-after")) return "靠结果对比直接证明价值，减少理解成本。";
  return "靠痛点直给 + 上手过程 + 明显结果三连击推动点击。";
}

function buildPlatformLogic(platform, objective) {
  return `${platform}下这类素材最重要的是先抢第一眼，再在短时间内完成“问题 - 产品 - 结果”闭环，当前更偏${objective}打法。`;
}

function buildHookType(materialType, hookGuess) {
  if (hookGuess) return `${materialType}，并且明显带有“${hookGuess}”这类钩子判断。`;
  return `${materialType}，本质是强结果或强问题钩子。`;
}

function buildConflictPath(materialType) {
  if (materialType.includes("剧情")) return "先翻车或受委屈，再升级，再让产品介入翻盘。";
  return "先放大问题，再给上手动作，再给结果对比，最后催行动。";
}

function buildProductTiming(materialType) {
  if (materialType.includes("剧情")) return "建议在前 3 秒内露出，最晚不要超过情绪爆点后第一段。";
  return "应该在前 2-5 秒内明确出现，不能拖。";
}

function buildKlingPrompts(timeline, data) {
  return timeline.map((item) =>
    `${data.materialType}短视频广告，${data.productType || "产品"}，${item.visual}，${item.camera}，强节奏，短视频投流感，字幕压屏，${data.platform}风格，重点突出${data.objective}。`
  );
}

function buildVeoPrompts(timeline, data) {
  return timeline.map((item) =>
    `${data.materialType} product ad, ${data.productType || "consumer product"}, ${item.visual}, ${item.camera}, fast pacing, high-contrast lighting, social ad realism, strong retention hook, localized ${languageToEnglish(data.language)} captions, optimized for ${data.platform} --ar 16:9`
  );
}

function extractOpeningVisual(narrative) {
  const text = narrative || "";
  if (text.includes("脏")) return "脏污特写";
  if (text.includes("冲突") || text.includes("吵")) return "冲突瞬间";
  if (text.includes("对比")) return "强对比画面";
  return "问题最明显的一帧";
}

function firstCopyLine(transcript) {
  return transcript.split(/[.!?\n]/).find(Boolean)?.trim() || "This was a mess.";
}

function secondCopyLine(transcript) {
  const parts = transcript.split(/[.!?\n]/).map((item) => item.trim()).filter(Boolean);
  return parts[1] || "Then I tried this.";
}

function languageToEnglish(language) {
  return {
    英文: "English",
    西班牙语: "Spanish",
    德语: "German",
    法语: "French"
  }[language] || "English";
}

function sanitizeFormForSave(formData) {
  const cleaned = { ...formData };
  delete cleaned.apiKey;
  return cleaned;
}

async function filesToPayload(files) {
  const payload = [];
  for (const file of files) {
    payload.push({
      name: file.name,
      mimeType: file.type || "image/jpeg",
      data: await fileToBase64(file)
    });
  }
  return payload;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error(`读取文件失败：${file.name}`));
    reader.readAsDataURL(file);
  });
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

function setRunStatus(message, tone = "info") {
  if (!runStatus) {
    return;
  }
  runStatus.textContent = message;
  runStatus.className = `run-status ${tone}`;
}

async function initApiMode() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    serverApiReady = Boolean(data.serverApiReady);
    if (serverApiReady) {
      apiModeBanner.textContent =
        "当前模式：服务端已配置 OPENAI_API_KEY。别人打开页面后无需手动填 Key，可直接识别截图并生成拆解。";
      form.elements.apiKey.closest("label").style.display = "none";
    } else {
      apiModeBanner.textContent =
        "当前模式：服务端未配置环境变量。你可以手动填 OpenAI API Key 测试；如果要外链直接给别人用，后续仍建议在部署平台配置 OPENAI_API_KEY。";
      apiModeBanner.classList.add("warning");
      form.elements.apiKey.closest("label").style.display = "";
    }
  } catch (error) {
    apiModeBanner.textContent = "配置状态读取失败，默认按手动填写 API Key 使用。";
    apiModeBanner.classList.add("warning");
    form.elements.apiKey.closest("label").style.display = "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

initApiMode();
