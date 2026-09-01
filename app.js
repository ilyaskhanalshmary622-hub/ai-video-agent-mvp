const form = document.getElementById("generator-form");
const output = document.getElementById("output");
const fillDemoBtn = document.getElementById("fill-demo");
const copyMarkdownBtn = document.getElementById("copy-markdown");
const extractProductBtn = document.getElementById("extract-product");
const saveProjectBtn = document.getElementById("save-project");
const imageInput = document.getElementById("product-images");
const imagePreview = document.getElementById("image-preview");
const referenceInput = document.getElementById("reference-images");
const referencePreview = document.getElementById("reference-preview");
const apiModeBanner = document.getElementById("api-mode-banner");
let lastGeneratedResult = null;
let serverApiReady = false;
initApiMode();

const categoryMap = {
  beauty: {
    label: "美妆个护",
    defaultAudience: "追求精致感、效果变化和便捷体验的女性用户",
    defaultPain: "状态不够好、步骤麻烦、效果不明显",
    angles: ["前后对比", "痛点解决", "测评种草"],
    hooks: [
      "I didn’t expect this to work that fast",
      "My routine looked completely different after this",
      "Why is nobody talking about this yet?"
    ]
  },
  home: {
    label: "家居日用",
    defaultAudience: "重视居家效率、整洁感和生活便利的人群",
    defaultPain: "日常琐碎麻烦、空间杂乱、使用体验低效",
    angles: ["痛点切入", "场景代入", "前后改善"],
    hooks: [
      "This solved the most annoying part of my day",
      "I should have bought this sooner",
      "My room feels way better now"
    ]
  },
  tool: {
    label: "工具类 / 小工具",
    defaultAudience: "需要提升效率、减少麻烦、看重实用性的用户",
    defaultPain: "操作费劲、耗时、原方案不顺手",
    angles: ["问题解决", "效率提升", "演示对比"],
    hooks: [
      "This tool made it way easier",
      "I didn’t know I needed this",
      "Why does this work so well?"
    ]
  },
  ambient: {
    label: "氛围灯 / 装饰类",
    defaultAudience: "偏爱氛围感、空间改造和情绪价值消费的年轻用户",
    defaultPain: "空间普通、缺少氛围、视觉记忆点不够",
    angles: ["场景种草", "效果展示", "测评口播"],
    hooks: [
      "This made my room look unreal",
      "I can’t stop staring at this",
      "My room feels completely different now"
    ]
  },
  cleaning: {
    label: "清洁类",
    defaultAudience: "关注清洁效率和即时效果的家庭用户",
    defaultPain: "脏污难清、费时费力、效果不明显",
    angles: ["强痛点", "脏污对比", "解压演示"],
    hooks: [
      "This was disgusting until I tried this",
      "I didn’t think it would clean this fast",
      "So satisfying to watch"
    ]
  },
  health: {
    label: "健康 / 保健类",
    defaultAudience: "关注日常状态、作息和自我管理的人群",
    defaultPain: "状态一般、坚持困难、日常习惯不稳定",
    angles: ["场景共鸣", "需求种草", "轻测评表达"],
    hooks: [
      "I added this to my daily routine",
      "This is the easiest habit I’ve kept",
      "I didn’t expect this to feel so natural"
    ]
  },
  other: {
    label: "其他",
    defaultAudience: "对新鲜产品有兴趣、愿意尝试新方案的泛用户",
    defaultPain: "旧方案平庸、体验一般、缺少吸引点",
    angles: ["卖点直给", "问题解决", "高质感展示"],
    hooks: [
      "I wasn’t expecting this to be that useful",
      "This looks way better than I thought",
      "This tiny thing changed more than I expected"
    ]
  }
};

const demoData = {
  productName: "海洋星空投影灯",
  category: "ambient",
  description: "桌面小型投影灯，黑色半球灯罩，紫色金属底座，可投射海洋和星空氛围，适合卧室夜晚使用。",
  sellingPoints: "沉浸式海洋氛围、空间改造感强、视觉冲击高、适合卧室放松",
  priceBand: "mid",
  goal: "高点击",
  targetAudience: "18-30岁女性，喜欢卧室改造、氛围感和社媒分享",
  painPoint: "房间普通、夜晚没氛围、想低成本改造空间",
  platform: "TikTok + 独立站",
  language: "英文",
  contentType: "测评型",
  creativeFormat: "UGC口播",
  ctaStrength: "中CTA",
  duration: "10-15秒",
  guardrails: "不要虚假品牌背书，不要出现侵权商超品牌画面，不要夸张到像假货。",
  competitorNotes: "对标 TikTok 上常见的卧室改造类投影灯素材，竞品喜欢先给空间变化，再切产品近景和用户反应。",
  consistency: "黑色半球灯罩、紫色金属底座、前侧双按键、小型桌面产品、灯体圆润发光稳定",
  extra: "偏欧美本地短视频风格，首帧要强视觉反差，产品外观不能跑偏。"
};

fillDemoBtn.addEventListener("click", () => {
  Object.entries(demoData).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
  imageInput.value = "";
  referenceInput.value = "";
  renderImagePreview([]);
  renderReferencePreview([]);
});

extractProductBtn.addEventListener("click", async () => {
  const apiKey = form.elements.apiKey.value.trim();
  const files = Array.from(imageInput.files || []);
  if (!apiKey && !serverApiReady) {
    alert("当前服务端没有配置环境变量，请先填 OpenAI API Key。");
    return;
  }
  if (!files.length) {
    alert("先上传至少 1 张产品图。");
    return;
  }

  setBusy(extractProductBtn, true, "识别中...");
  try {
    const payload = {
      apiKey,
      model: form.elements.visionModel.value.trim() || "gpt-4.1-mini",
      images: await filesToPayload(files.slice(0, 4))
    };

    const response = await fetch("/api/extract-product", {
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
    alert(`产品图识别失败：${error.message}`);
  } finally {
    setBusy(extractProductBtn, false, "识别产品图并回填");
  }
});

imageInput.addEventListener("change", () => {
  renderImagePreview(Array.from(imageInput.files || []));
});

referenceInput.addEventListener("change", () => {
  renderReferencePreview(Array.from(referenceInput.files || []));
});

copyMarkdownBtn.addEventListener("click", async () => {
  const markdown = output.dataset.markdown;
  if (!markdown) {
    alert("先生成方案，再复制。");
    return;
  }
  await navigator.clipboard.writeText(markdown);
  copyMarkdownBtn.textContent = "已复制";
  setTimeout(() => {
    copyMarkdownBtn.textContent = "复制 Markdown";
  }, 1200);
});

saveProjectBtn.addEventListener("click", async () => {
  const formSnapshot = Object.fromEntries(new FormData(form).entries());
  const apiKey = form.elements.apiKey.value.trim();
  if (!lastGeneratedResult) {
    alert("先生成方案，再保存项目。");
    return;
  }
  if (!apiKey) {
    alert("保存项目不需要真实模型，但当前服务要求本地地址打开。请确认你正在 http://127.0.0.1:8765 使用，并至少生成过一次方案。");
  }

  setBusy(saveProjectBtn, true, "保存中...");
  try {
    const response = await fetch("/api/save-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData: sanitizeFormForSave(formSnapshot),
        result: lastGeneratedResult,
        productImages: await filesToPayload(Array.from(imageInput.files || [])),
        referenceImages: await filesToPayload(Array.from(referenceInput.files || []))
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "保存失败");
    }
    alert(`项目已保存\n目录：${data.projectDir}\nMarkdown：${data.markdownPath}`);
  } catch (error) {
    alert(`保存项目失败：${error.message}`);
  } finally {
    setBusy(saveProjectBtn, false, "保存项目");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generatePlan();
});

async function generatePlan() {
  const formData = Object.fromEntries(new FormData(form).entries());
  formData.productImages = Array.from(imageInput.files || []);
  formData.referenceImages = Array.from(referenceInput.files || []);

  const apiKey = form.elements.apiKey.value.trim();
  const generationModel = form.elements.generationModel.value.trim() || "gpt-4.1-mini";

  const submitButton = form.querySelector('button[type="submit"]');
  setBusy(submitButton, true, "生成中...");

  try {
    if (!apiKey && !serverApiReady) {
      renderResult(buildPlan(formData));
      return;
    }

    const payload = {
      apiKey,
      model: generationModel,
      formData: {
        ...formData,
        productImages: undefined,
        referenceImages: undefined
      },
      productImages: await filesToPayload(formData.productImages),
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

    renderResult(normalizeRemoteResult(data.result, formData));
  } catch (error) {
    console.error(error);
    alert(`调用真实模型失败，已回退本地模板：${error.message}`);
    renderResult(buildPlan(formData));
  } finally {
    setBusy(submitButton, false, "生成方案");
  }
}

function buildPlan(data) {
  const category = categoryMap[data.category] || categoryMap.other;
  const sellingPoints = splitItems(data.sellingPoints);
  const consistency = splitItems(data.consistency);
  const hasProductImage = data.productImages.length > 0;
  const hasCompetitorInput =
    data.referenceImages.length > 0 || Boolean((data.competitorNotes || "").trim());

  const audience = data.targetAudience || category.defaultAudience;
  const painPoint = data.painPoint || category.defaultPain;
  const primaryPoint = sellingPoints[0] || data.productName;
  const secondaryPoint = sellingPoints[1] || "使用过程更顺滑";
  const angle = chooseAngle(data.contentType, category.angles);
  const hookStrategy = chooseHookStrategy(data.goal, data.platform, data.contentType);
  const hooks = buildHooks(category.hooks, data.productName, primaryPoint, angle, hookStrategy);
  const recommendedHook = hooks[0];
  const oneLineStory = `${data.productName}通过“${angle}”切入，前3秒先砸出${primaryPoint}，再用产品动作和结果镜头收口，服务${data.goal}目标。`;
  const durations = splitDuration(data.duration);
  const shots = buildShots(data, primaryPoint, secondaryPoint, angle, durations);
  const productLock = buildProductLock(data.productName, consistency, data.description);
  const referenceSummary = hasProductImage
    ? `已上传 ${data.productImages.length} 张产品图，第一张默认作为首帧参考图，并作为产品一致性和镜头延展主参考。`
    : "当前未上传产品图，建议至少补 1 张干净正面产品图，否则单图起片和产品锁定都不稳定。";
  const competitorBreakdown = buildCompetitorBreakdown(data, angle, hasCompetitorInput);
  const platformNotes = buildPlatformNotes(data.platform, data.goal, data.ctaStrength);
  const testMatrix = buildTestMatrix(data, primaryPoint, angle, hooks);
  const imagePrompts = shots.map((shot, index) =>
    `镜头${index + 1}：${hasProductImage ? "基于上传产品图做首帧参考，" : ""}${productLock}，${shot.visual}，${shot.camera}，${shot.mood}，${shot.talent}，${shot.environment}，commercial vertical frame, ${languageLabel(data.language)} market style`
  );
  const videoPrompts = shots.map((shot, index) =>
    `镜头${index + 1}：${hasProductImage ? "以上传产品图为产品参考，" : ""}保持${data.productName}外观一致，${shot.motion}，${shot.visual}，${shot.camera}，${shot.mood}，fast-paced short ad video, consistent product identity`
  );
  const title = buildTitle(data.productName, primaryPoint, data.language);
  const coverHook = hooks[1] || hooks[0];
  const subtitles = buildSubtitles(
    data.language,
    data.productName,
    primaryPoint,
    secondaryPoint
  );
  const aggressive = `A版更狠：第1镜头直接给最夸张的${primaryPoint}结果画面，先打“真的假的”，第2镜头才交代产品。`;
  const stable = `B版更稳：保留${angle}结构，但把开头改成更真实的用户痛点和上手演示，降低假感，强化可信度。`;
  const analysis = `爆点核心在“${primaryPoint} + ${hookStrategy}”。这类产品不怕先夸张结果，怕的是产品出场太晚、镜头目的不清、像纯炫技。`;
  const risk = buildRisk(data);
  const checklist = buildChecklist(data, hasProductImage);

  const result = {
    categoryLabel: category.label,
    audience,
    painPoint,
    angle,
    hookStrategy,
    referenceSummary,
    platformNotes,
    competitorBreakdown,
    testMatrix,
    hooks,
    recommendedHook,
    reason: `当前目标是${data.goal}，平台是${data.platform}，所以优先采用“${hookStrategy} + ${angle}”结构，更适合做第一轮测试。`,
    oneLineStory,
    shots,
    productLock,
    imagePrompts,
    videoPrompts,
    title,
    coverHook,
    subtitles,
    aggressive,
    stable,
    analysis,
    risk,
    checklist
  };

  result.markdown = buildMarkdown(result);
  return result;
}

function renderResult(result) {
  lastGeneratedResult = result;
  output.classList.remove("empty");
  output.dataset.markdown = result.markdown;
  output.innerHTML = [
    card("产品图参考", `<p>${result.referenceSummary}</p>`),
    card(
      "投手判断",
      `
        <div class="pill-row">
          <span class="pill">${result.categoryLabel}</span>
          <span class="pill">${result.angle}</span>
          <span class="pill">${result.hookStrategy}</span>
        </div>
        <p>目标用户：${result.audience}</p>
        <p>核心痛点：${result.painPoint}</p>
        <p>平台备注：${result.platformNotes}</p>
      `
    ),
    card(
      "【竞品拆解】",
      `<ul>${result.competitorBreakdown.map((item) => `<li>${item}</li>`).join("")}</ul>`
    ),
    card(
      "【3个流量钩子】",
      `<ol>${result.hooks.map((item) => `<li>${item}</li>`).join("")}</ol>`
    ),
    card(
      "【最推荐钩子】",
      `<p>${result.recommendedHook}</p><p>推荐原因：${result.reason}</p>`
    ),
    card("【一句话剧情】", `<p>${result.oneLineStory}</p>`),
    card(
      "【测试矩阵】",
      `<ul>${result.testMatrix.map((item) => `<li>${item}</li>`).join("")}</ul>`
    ),
    card(
      "【5-15秒分镜脚本】",
      `
        <div class="shot-table">
          ${result.shots
            .map(
              (shot, index) => `
                <div class="shot-row">
                  <div class="shot-head">镜头${index + 1}｜${shot.seconds}</div>
                  <div class="shot-line">${shot.line}</div>
                  <div class="shot-meta">镜头任务：${shot.goal}</div>
                  <div class="shot-meta">屏幕文案：${shot.text}</div>
                </div>
              `
            )
            .join("")}
        </div>
      `
    ),
    card("【产品一致性锁定词】", `<p>${result.productLock}</p>`),
    card(
      "【image2提示词】",
      `<ul>${result.imagePrompts.map((item) => `<li>${item}</li>`).join("")}</ul>`
    ),
    card(
      "【视频提示词】",
      `<ul>${result.videoPrompts.map((item) => `<li>${item}</li>`).join("")}</ul>`
    ),
    card(
      "【目标市场标题 / 封面钩子 / 对白字幕】",
      `
        <p>标题：${result.title}</p>
        <p>封面钩子：${result.coverHook}</p>
        <p>对白 / 字幕：${result.subtitles.join(" / ")}</p>
      `
    ),
    card("【A版更狠 / B版更稳】", `<p>${result.aggressive}</p><p>${result.stable}</p>`),
    card(
      "【执行清单】",
      `<ul>${result.checklist.map((item) => `<li>${item}</li>`).join("")}</ul>`
    ),
    card(
      "【爆点分析 / 风险提醒】",
      `<p>爆点分析：${result.analysis}</p><p>风险提醒：${result.risk}</p>`
    ),
    card("Markdown 输出", `<pre class="markdown">${escapeHtml(result.markdown)}</pre>`)
  ].join("");
}

function card(title, body) {
  return `<div class="result-card"><h3>${title}</h3>${body}</div>`;
}

function splitItems(value) {
  return String(value || "")
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function chooseAngle(contentType, angles) {
  if (contentType === "测评型") {
    return angles.find((item) => item.includes("测评")) || angles[0];
  }
  if (contentType === "剧情冲突型") {
    return "剧情冲突";
  }
  if (contentType === "高质感展示型") {
    return "高质感展示";
  }
  if (contentType === "对比型") {
    return angles.find((item) => item.includes("对比")) || angles[0];
  }
  return angles[0];
}

function chooseHookStrategy(goal, platform, contentType) {
  if (contentType === "剧情冲突型") {
    return "冲突开场";
  }
  if (goal === "高停留") {
    return "结果前置";
  }
  if (goal === "转化" || platform === "独立站") {
    return "卖点清晰";
  }
  return "强钩子";
}

function buildHooks(baseHooks, productName, primaryPoint, angle, hookStrategy) {
  const first =
    hookStrategy === "冲突开场"
      ? `Everyone thought this was pointless until ${productName} changed the whole scene`
      : `${primaryPoint} is the reason this ${productName} stops the scroll`;
  const second = angle.includes("对比")
    ? `Before and after this ${productName} looks unreal`
    : baseHooks[0];
  const third = baseHooks[1] || `${productName} made the difference obvious fast`;
  return [first, second, third];
}

function splitDuration(duration) {
  if (duration === "6-10秒") {
    return ["0-1秒", "1-2秒", "2-4秒", "4-7秒", "7-10秒"];
  }
  if (duration === "15-25秒") {
    return ["0-2秒", "2-5秒", "5-9秒", "9-16秒", "16-25秒"];
  }
  return ["0-1秒", "1-3秒", "3-6秒", "6-10秒", "10-15秒"];
}

function buildShots(data, primaryPoint, secondaryPoint, angle, durations) {
  return [
    {
      seconds: durations[0],
      line: `用最强结果画面或最痛点场景做开头，第一眼让人理解“${primaryPoint}”为什么值得停下。`,
      goal: "抓停留 / 建立钩子",
      text: data.goal === "高点击" ? "WAIT WHAT?" : primaryPoint,
      visual: `hook frame showing ${primaryPoint} with immediate contrast`,
      camera: "tight close-up, vertical composition",
      mood: "high contrast, social-scroll stopper",
      motion: "abrupt reveal with fast push-in",
      talent: "authentic local-looking creator reaction if applicable",
      environment: "platform-native environment with believable context"
    },
    {
      seconds: durations[1],
      line: `给出${data.productName}近景和关键结构，必须清楚交代产品外观，避免后续像换品。`,
      goal: "明确产品出场",
      text: "This is it",
      visual: `clean product reveal of ${data.productName}`,
      camera: "product close shot",
      mood: "commercial detail but still native",
      motion: "hand reveal or quick table-top turn",
      talent: "hands or creator can enter frame",
      environment: "simple clean background or use scene"
    },
    {
      seconds: durations[2],
      line: `展示一个真实上手动作，把产品和用户场景绑住，同时补充${secondaryPoint}。`,
      goal: "建立可信使用感",
      text: "Let me test this",
      visual: "real usage action in a believable lifestyle scene",
      camera: "mid shot with hands and product interaction",
      mood: "UGC realism",
      motion: "turn on / open / apply / trigger a real use action",
      talent: "local-looking creator or hand model",
      environment: "bedroom / bathroom / kitchen / tool-use scene based on product"
    },
    {
      seconds: durations[3],
      line: `放大${primaryPoint}结果，用空间变化、前后反差或用户反应强化记忆点，让素材真正像广告而不是展示说明。`,
      goal: "放大卖点 / 形成记忆点",
      text: primaryPoint,
      visual: `dramatic payoff of ${primaryPoint}`,
      camera: "wide result shot or medium reaction shot",
      mood: "immersive visual payoff",
      motion: "scene transformation, before-after switch, creator reaction",
      talent: "creator reaction or subject interaction",
      environment: "clearly transformed scene"
    },
    {
      seconds: durations[4],
      line: "收尾用一句短 CTA 或产品结论收口，留购买理由，不要纯空镜结束。",
      goal: "收尾转化 / 留动作",
      text: data.ctaStrength === "强CTA" ? "Get yours now" : "This is worth trying",
      visual: `final branded close-up anchored on ${data.productName}`,
      camera: "clean close-up",
      mood: "confident finish",
      motion: "hold final result with subtitle punch",
      talent: "optional final nod or hand-off",
      environment: "same product scene for continuity"
    }
  ];
}

function buildProductLock(productName, consistency, description) {
  const detail = consistency.length ? consistency.join("，") : description || "产品外观稳定";
  return `${productName}，${detail}，所有镜头保持同一主体形状、主色、结构、按钮和比例，不允许局部结构变化，不允许换材质。`;
}

function buildPlatformNotes(platform, goal, ctaStrength) {
  const platformNote =
    platform === "TikTok"
      ? "更重停留、钩子和原生感"
      : platform === "独立站"
        ? "更重卖点清晰、可信演示和购买理由"
        : platform === "AppLovin"
          ? "更重前1秒爆点、强冲突和高刷量素材感"
          : "兼顾停留和卖点表达";
  return `${platformNote}；当前目标是${goal}；CTA 建议保持${ctaStrength}。`;
}

function buildCompetitorBreakdown(data, angle, hasCompetitorInput) {
  const notes = (data.competitorNotes || "").trim();
  const sourceNote = hasCompetitorInput
    ? "当前已提供对标信息，可按竞品结构做针对性拆解。"
    : "当前未提供明确竞品素材，以下为按品类默认对标逻辑生成。";
  return [
    sourceNote,
    "对标重点：优先观察竞品开头在前1秒先给结果、痛点还是情绪反应，避免你的素材开头弱于同类。",
    `结构判断：当前建议主打“${angle} + ${data.creativeFormat}”，如果竞品是先产品后结果，你这条更建议先结果后产品，形成更强停留。`,
    "差异化建议：不要只学竞品镜头顺序，更要补“产品更早出场 + 卖点更清楚 + CTA更明确”这三个点。",
    notes
      ? `当前对标描述：${notes}`
      : "建议后续补充 1-2 条真实竞品素材截图，尤其是封面图和前3秒结构。"
  ];
}

function buildTestMatrix(data, primaryPoint, angle, hooks) {
  return [
    `版本A测开头：直接给“${primaryPoint}”结果画面，验证强视觉开头能否提升停留。`,
    `版本B测结构：保留${angle}，但把第1镜头换成更真实的痛点场景，验证可信度是否更高。`,
    `版本C测文案：沿用主结构，只替换封面钩子为“${hooks[1]}”，验证点击率差异。`
  ];
}

function languageLabel(language) {
  return {
    英文: "English",
    西班牙语: "Spanish",
    德语: "German",
    法语: "French"
  }[language] || "English";
}

function buildTitle(productName, primaryPoint, language) {
  if (language === "英文") {
    return `${productName} made ${primaryPoint.toLowerCase ? primaryPoint.toLowerCase() : primaryPoint} feel unreal`;
  }
  if (language === "西班牙语") {
    return `${productName} cambio todo en segundos`;
  }
  if (language === "德语") {
    return `${productName} verandert alles in Sekunden`;
  }
  return `${productName} change toute l'ambiance`;
}

function buildSubtitles(language, productName, primaryPoint, secondaryPoint) {
  if (language === "英文") {
    return [
      `I didn’t expect ${productName} to do this.`,
      "This is the part that sold me.",
      `${primaryPoint}. ${secondaryPoint}.`
    ];
  }
  return [
    `${productName} 的效果超出预期。`,
    "这一段最抓人。",
    `${primaryPoint}，同时补充 ${secondaryPoint}。`
  ];
}

function buildRisk(data) {
  if (data.category === "health") {
    return "健康类避免直接疗效承诺，优先用日常体验和习惯表达。";
  }
  return `注意不要只剩氛围和炫技，必须让产品足够早出场；同时遵守边界：${data.guardrails || "避免侵权、夸张虚假和产品跑偏。"}。`;
}

function buildChecklist(data, hasProductImage) {
  return [
    hasProductImage
      ? "首帧参考图已具备，可以按单图起片执行。"
      : "补 1 张干净正面产品图，作为首帧和产品锁定参考。",
    "补 1 份本地化人物参考，避免人物像模板网红。",
    "补 1 组场景参考，确保镜头环境更像目标市场。",
    "先出 3 个版本测试，不要只做一条成片。",
    "检查第2镜头是否足够早给出产品，避免“看了半天不知道卖什么”。",
    `确认字幕、封面和 CTA 与${data.platform}调性一致。`
  ];
}

function buildMarkdown(result) {
  return [
    "【产品图参考】",
    result.referenceSummary,
    "",
    "【平台备注】",
    result.platformNotes,
    "",
    "【竞品拆解】",
    ...result.competitorBreakdown.map((item) => `- ${item}`),
    "",
    "【3个流量钩子】",
    ...result.hooks.map((item, index) => `${index + 1}. ${item}`),
    "",
    "【最推荐钩子】",
    result.recommendedHook,
    "",
    "【推荐原因】",
    result.reason,
    "",
    "【一句话剧情】",
    result.oneLineStory,
    "",
    "【测试矩阵】",
    ...result.testMatrix.map((item) => `- ${item}`),
    "",
    "【5-15秒分镜脚本】",
    ...result.shots.map(
      (shot, index) =>
        `${index + 1}. ${shot.seconds}｜${shot.line}｜镜头任务：${shot.goal}｜屏幕文案：${shot.text}`
    ),
    "",
    "【产品一致性锁定词】",
    result.productLock,
    "",
    "【image2提示词】",
    ...result.imagePrompts.map((item) => `- ${item}`),
    "",
    "【视频提示词】",
    ...result.videoPrompts.map((item) => `- ${item}`),
    "",
    "【目标市场标题】",
    result.title,
    "",
    "【目标市场封面钩子】",
    result.coverHook,
    "",
    "【目标市场对白/字幕】",
    ...result.subtitles.map((item) => `- ${item}`),
    "",
    "【A版更狠改法】",
    result.aggressive,
    "",
    "【B版更稳改法】",
    result.stable,
    "",
    "【执行清单】",
    ...result.checklist.map((item) => `- ${item}`),
    "",
    "【爆点分析】",
    result.analysis,
    "",
    "【风险提醒】",
    result.risk
  ].join("\n");
}

function normalizeRemoteResult(result, formData) {
  const normalized = { ...result };
  normalized.categoryLabel = normalized.categoryLabel || categoryMap[formData.category]?.label || "其他";
  normalized.audience = normalized.audience || formData.targetAudience || categoryMap[formData.category]?.defaultAudience || "";
  normalized.painPoint = normalized.painPoint || formData.painPoint || categoryMap[formData.category]?.defaultPain || "";
  normalized.angle = normalized.angle || "卖点直给";
  normalized.hookStrategy = normalized.hookStrategy || "强钩子";
  normalized.referenceSummary = normalized.referenceSummary || (formData.productImages.length ? `已上传 ${formData.productImages.length} 张产品图。` : "未上传产品图。");
  normalized.platformNotes = normalized.platformNotes || buildPlatformNotes(formData.platform, formData.goal, formData.ctaStrength);
  normalized.competitorBreakdown = normalized.competitorBreakdown || [];
  normalized.testMatrix = normalized.testMatrix || [];
  normalized.hooks = normalized.hooks || [];
  normalized.recommendedHook = normalized.recommendedHook || normalized.hooks[0] || "";
  normalized.reason = normalized.reason || "";
  normalized.oneLineStory = normalized.oneLineStory || "";
  normalized.shots = normalized.shots || [];
  normalized.productLock = normalized.productLock || "";
  normalized.imagePrompts = normalized.imagePrompts || [];
  normalized.videoPrompts = normalized.videoPrompts || [];
  normalized.title = normalized.title || "";
  normalized.coverHook = normalized.coverHook || "";
  normalized.subtitles = normalized.subtitles || [];
  normalized.aggressive = normalized.aggressive || "";
  normalized.stable = normalized.stable || "";
  normalized.analysis = normalized.analysis || "";
  normalized.risk = normalized.risk || "";
  normalized.checklist = normalized.checklist || [];
  normalized.markdown = buildMarkdown(normalized);
  return normalized;
}

function renderImagePreview(files) {
  renderPreviewGrid(files, imagePreview, "产品图预览", "首帧参考图");
}

function renderReferencePreview(files) {
  renderPreviewGrid(files, referencePreview, "参考素材预览", "主参考素材");
}

function renderPreviewGrid(files, container, emptyText, firstLabel) {
  if (!files.length) {
    container.className = "image-preview empty";
    container.innerHTML = `<p>上传后这里会显示${emptyText}。</p>`;
    return;
  }

  container.className = "image-preview";
  container.innerHTML = "";
  files.slice(0, 4).forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "preview-card";

    const img = document.createElement("img");
    img.alt = file.name;
    img.src = URL.createObjectURL(file);

    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.innerHTML = `<strong>${index === 0 ? firstLabel : `参考图 ${index + 1}`}</strong><br>${file.name}`;

    card.appendChild(img);
    card.appendChild(meta);
    container.appendChild(card);
  });
}

function fillExtractedFields(extracted) {
  const fieldMap = [
    "productName",
    "description",
    "sellingPoints",
    "targetAudience",
    "painPoint",
    "consistency",
    "competitorNotes",
    "extra"
  ];

  fieldMap.forEach((key) => {
    if (extracted[key] && form.elements[key]) {
      form.elements[key].value = Array.isArray(extracted[key]) ? extracted[key].join("、") : extracted[key];
    }
  });

  ["category", "contentType", "creativeFormat"].forEach((key) => {
    if (extracted[key] && form.elements[key]) {
      const select = form.elements[key];
      const optionExists = Array.from(select.options).some((option) => option.value === extracted[key]);
      if (optionExists) {
        select.value = extracted[key];
      }
    }
  });
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

async function initApiMode() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    serverApiReady = Boolean(data.serverApiReady);
    if (serverApiReady) {
      apiModeBanner.textContent = "当前模式：服务端已配置环境变量 OPENAI_API_KEY。别人打开页面后无需手动填写 Key，可直接识别产品图并生成方案。";
      form.elements.apiKey.closest("label").style.display = "none";
    } else {
      apiModeBanner.textContent = "当前模式：服务端未配置环境变量。你可以手动填 OpenAI API Key，本机测试仍可用；如果要发外链给别人直接用，后续需要在部署平台配置 OPENAI_API_KEY。";
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
