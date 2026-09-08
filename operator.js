const form = document.querySelector("#ops-form");
const scoreboard = document.querySelector("#scoreboard");
const diagnosis = document.querySelector("#diagnosis");
const briefOutput = document.querySelector("#brief-output");
const fileInput = document.querySelector("#creative-file");
const fileName = document.querySelector("#file-name");
const loadDemo = document.querySelector("#load-demo");
const resetForm = document.querySelector("#reset-form");
const copyResult = document.querySelector("#copy-result");
const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll("[data-page-panel]");
const cursorLight = document.querySelector(".cursor-light");
const homeCtr = document.querySelector("#home-ctr");
const homeCpa = document.querySelector("#home-cpa");
const homeRoas = document.querySelector("#home-roas");
const homeFrequency = document.querySelector("#home-frequency");
const homeRisk = document.querySelector("#home-risk");
const homeRiskNote = document.querySelector("#home-risk-note");

let lastReportText = "";

const demo = {
  productName: "家居百货爆品",
  category: "百货 / 家居 / 清洁",
  market: "美国",
  platform: "Facebook / Instagram",
  stage: "起量观察",
  objective: "控 CPA",
  creativeType: "剧情冲突型",
  spend: "620",
  impressions: "91000",
  clicks: "1638",
  conversions: "42",
  revenue: "1890",
  targetCpa: "16",
  price: "39.99",
  cost: "14",
  previousCtr: "2.35",
  frequency: "2.1",
  hookStrength: "强：冲突/反差/结果很直给",
  productTiming: "3-6 秒露出",
  trustLevel: "中：有展示但证据不够",
  landingMatch: "中：卖点一致但表达不同",
  commentSignal: "有人讨论使用场景",
  creativeNotes: "前三秒有家庭冲突和强反差，点击不错；中段产品证明偏弱，需要补近景、真实操作和评论型疑问回应。",
  spyUrl: "https://app.ppspy.com/zh/ads/2b143a83c63f56c774ab1ea27a5292aa",
  spyStatus: "疑似在跑量",
  spyStructure: "痛点冲突 + 产品解决 + 结果展示",
  spyHook: "强：一眼知道冲突或结果",
  spyCopyLevel: "高：结构可复制，画面要重做",
  spyNotes: "PPSPY 竞品链接可作为参考来源。重点记录广告标题、产品价格、投放地区、素材首帧、评论质疑点和落地页承接。"
};

const emptyDiagnosis = `
  <h2>诊断指令</h2>
  <p>填入数据后，这里会出现生命周期判断、问题定位、预算动作和账户操作建议。</p>
`;

const emptyBrief = `
  <h2>下一轮素材 Brief</h2>
  <p>生成后这里会出现给素材团队或 AI 视频创作者看的下一批测试方向。</p>
`;

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchPage(tab.dataset.page));
});

document.addEventListener("pointermove", (event) => {
  cursorLight.style.left = `${event.clientX}px`;
  cursorLight.style.top = `${event.clientY}px`;
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  fileName.textContent = file ? `${file.name} / ${formatSize(file.size)}` : "未选择文件";
});

loadDemo.addEventListener("click", () => {
  Object.entries(demo).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  generateReport();
});

resetForm.addEventListener("click", () => {
  form.reset();
  lastReportText = "";
  fileName.textContent = "未选择文件";
  renderScoreboard(null);
  diagnosis.className = "diagnosis-panel empty";
  diagnosis.innerHTML = emptyDiagnosis;
  briefOutput.className = "diagnosis-panel empty";
  briefOutput.innerHTML = emptyBrief;
  switchPage("campaign");
});

copyResult.addEventListener("click", async () => {
  if (!lastReportText) {
    alert("先生成诊断结论。");
    return;
  }

  await navigator.clipboard.writeText(lastReportText);
  copyResult.textContent = "已复制";
  setTimeout(() => {
    copyResult.textContent = "复制结论";
  }, 1200);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateReport();
});

form.addEventListener("input", () => {
  const data = Object.fromEntries(new FormData(form).entries());
  const metrics = getMetrics(data);
  updateHomeTicker(metrics, judgeBottlenecks(data, metrics));
});

function switchPage(page) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.page === page));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.pagePanel === page));
}

async function generateReport() {
  const data = Object.fromEntries(new FormData(form).entries());
  const metrics = getMetrics(data);
  const lifecycle = judgeLifecycle(data, metrics);
  const bottlenecks = judgeBottlenecks(data, metrics);
  const budgetAction = judgeBudgetAction(data, metrics, bottlenecks);
  const creativeAudit = auditCreative(data, metrics);
  const spyAudit = auditCompetitor(data);
  const brief = buildNextBrief(data, metrics, bottlenecks);
  const platformNotes = buildPlatformNotes(data);
  const finalCall = buildFinalCall(data, metrics, bottlenecks);

  renderScoreboard(metrics);
  updateHomeTicker(metrics, bottlenecks);
  renderDiagnosis({ data, metrics, lifecycle, bottlenecks, budgetAction, creativeAudit, spyAudit, platformNotes, finalCall });
  renderBrief({ data, brief });

  lastReportText = [
    `OPX运营诊断｜${data.productName || "未命名产品"}`,
    `平台：${data.platform || "-"}｜市场：${data.market || "-"}｜阶段：${data.stage || "-"}`,
    `核心数据：CTR ${formatPercent(metrics.ctr)}｜CVR ${formatPercent(metrics.cvr)}｜CPA ${formatMoney(metrics.cpa)}｜ROAS ${formatNumber(metrics.roas)}`,
    `生命周期：${lifecycle.title}`,
    `预算动作：${budgetAction.title}`,
    `主要问题：${bottlenecks.map((item) => item.title).join("；") || "暂未发现明显硬伤"}`,
    `下一轮素材：${brief.map((item) => item.title).join("；")}`,
    `竞品参考：${spyAudit.title}｜${spyAudit.items.join("；")}`
  ].join("\n");

  switchPage("diagnosis");

  const submitButton = document.querySelector(".primary-command");
  setButtonBusy(submitButton, true, "AI 深度诊断中...");
  try {
    const aiResult = await requestOpxDiagnosis(data, metrics);
    renderDiagnosis({ data, metrics, lifecycle, bottlenecks, budgetAction, creativeAudit, spyAudit, platformNotes, finalCall, aiResult });
    renderBrief({ data, brief, aiResult });
    lastReportText = buildAiReportText(data, metrics, aiResult);
  } catch (error) {
    renderApiFallback(error);
  } finally {
    setButtonBusy(submitButton, false, "生成诊断");
  }
}

async function requestOpxDiagnosis(data, metrics) {
  const response = await fetch("/api/opx-diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      formData: {
        ...data,
        calculatedMetrics: {
          ctr: formatPercent(metrics.ctr),
          cvr: formatPercent(metrics.cvr),
          cpc: formatMoney(metrics.cpc),
          cpa: formatMoney(metrics.cpa),
          roas: formatNumber(metrics.roas),
          cpm: formatMoney(metrics.cpm),
          breakEvenCpa: formatMoney(metrics.breakEvenCpa),
          ctrDrop: formatPercent(Math.max(metrics.ctrDrop, 0))
        }
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "AI 诊断失败");
  }
  return payload.result;
}

function buildAiReportText(data, metrics, aiResult) {
  return [
    `OPX AI运营诊断｜${data.productName || "未命名产品"}`,
    `平台：${data.platform || "-"}｜市场：${data.market || "-"}｜阶段：${data.stage || "-"}`,
    `核心数据：CTR ${formatPercent(metrics.ctr)}｜CVR ${formatPercent(metrics.cvr)}｜CPA ${formatMoney(metrics.cpa)}｜ROAS ${formatNumber(metrics.roas)}`,
    `总判断：${aiResult.executiveSummary}`,
    `账户状态：${aiResult.accountStatus}`,
    `主要问题：${aiResult.mainProblem}`,
    `预算动作：${aiResult.budgetDecision}`,
    `素材动作：${aiResult.creativeDecision}`,
    `落地页动作：${aiResult.landingDecision}`,
    `竞品情报：${aiResult.competitorInsight}`,
    `下一步：${aiResult.nextActions.join("；")}`,
    `素材Brief：${aiResult.creativeBriefs.join("；")}`,
    `风险：${aiResult.riskWarnings.join("；")}`
  ].join("\n");
}

function renderApiFallback(error) {
  const notice = document.createElement("article");
  notice.className = "diagnosis-block danger full";
  notice.innerHTML = `
    <span>AI API 状态</span>
    <strong>已使用本地规则诊断，AI 深度诊断未完成</strong>
    <ul><li>${error.message}</li><li>如果线上使用，请确认 Render 环境变量里已经配置 OPENAI_API_KEY。</li></ul>
  `;
  diagnosis.querySelector(".diagnosis-grid")?.prepend(notice);
}

function updateHomeTicker(metrics, bottlenecks = []) {
  homeCtr.textContent = formatPercent(metrics.ctr);
  homeCpa.textContent = formatMoney(metrics.cpa);
  homeRoas.textContent = formatNumber(metrics.roas);
  homeFrequency.textContent = formatNumber(metrics.frequency);

  if (!metrics.spend && !metrics.impressions && !metrics.clicks) {
    homeRisk.textContent = "等待数据";
    homeRiskNote.textContent = "输入投放数据后，自动判断能不能放量、该不该关组、问题在素材还是转化。";
    return;
  }

  const profitRisk = bottlenecks.some((item) => item.type === "profit");
  const creativeRisk = bottlenecks.some((item) => item.type === "creative");
  const conversionRisk = bottlenecks.some((item) => item.type === "conversion" || item.type === "landing");

  if (profitRisk) {
    homeRisk.textContent = "红色风险";
    homeRiskNote.textContent = "利润线已被 CPA 打穿，先降预算或关停亏损组。";
    return;
  }

  if (metrics.roas >= 2.2 && metrics.cpa <= safeCpa(metrics)) {
    homeRisk.textContent = "可放量";
    homeRiskNote.textContent = "当前具备小步加预算资格，同步扩素材池防疲劳。";
    return;
  }

  if (creativeRisk) {
    homeRisk.textContent = "先修素材";
    homeRiskNote.textContent = "首帧点击不够，问题优先在钩子和画面冲突。";
    return;
  }

  if (conversionRisk) {
    homeRisk.textContent = "先修承接";
    homeRiskNote.textContent = "点击能进来但转化弱，重点查落地页首屏和信任证明。";
    return;
  }

  homeRisk.textContent = "观察中";
  homeRiskNote.textContent = "数据没有明显硬伤，继续看 24 小时波动和评论信号。";
}

function getMetrics(data) {
  const spend = num(data.spend);
  const impressions = num(data.impressions);
  const clicks = num(data.clicks);
  const conversions = num(data.conversions);
  const revenue = num(data.revenue);
  const price = num(data.price);
  const cost = num(data.cost);
  const targetCpa = num(data.targetCpa);
  const previousCtr = num(data.previousCtr);
  const frequency = num(data.frequency);

  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    price,
    cost,
    targetCpa,
    previousCtr,
    frequency,
    ctr: impressions ? clicks / impressions : 0,
    cvr: clicks ? conversions / clicks : 0,
    cpc: clicks ? spend / clicks : 0,
    cpa: conversions ? spend / conversions : 0,
    roas: spend ? revenue / spend : 0,
    cpm: impressions ? spend / impressions * 1000 : 0,
    breakEvenCpa: Math.max(price - cost, 0),
    ctrDrop: previousCtr ? (previousCtr / 100 - (impressions ? clicks / impressions : 0)) / (previousCtr / 100) : 0
  };
}

function judgeLifecycle(data, metrics) {
  if (data.stage === "疲劳衰退" || metrics.frequency >= 3.2 || metrics.ctrDrop >= 0.28) {
    return {
      level: "danger",
      title: "素材/人群进入疲劳期",
      detail: "频次或 CTR 下滑已经明显，不建议只加预算硬顶，要换首帧、换冲突、换人群切角。"
    };
  }

  if (metrics.clicks < 300 || metrics.spend < 120) {
    return {
      level: "watch",
      title: "样本不足，继续采集信号",
      detail: "当前数据还不能下重判断，重点先看首帧点击、评论疑问和落地页跳出。"
    };
  }

  if (metrics.roas >= 2.2 && metrics.cpa <= safeCpa(metrics)) {
    return {
      level: "good",
      title: "具备放量资格",
      detail: "点击、转化和回收都过线，可以小步加预算，同时复制胜出素材做变体。"
    };
  }

  return {
    level: "watch",
    title: "处于优化观察期",
    detail: "还没有到直接放量的状态，优先定位是素材点击问题、落地页承接问题还是客单利润问题。"
  };
}

function judgeBottlenecks(data, metrics) {
  const issues = [];

  if (metrics.ctr && metrics.ctr < 0.012) {
    issues.push({
      type: "creative",
      title: "首帧吸引力不足",
      detail: "Facebook 信息流里 1 秒不成立，后面的卖点基本没有机会被看见。先改封面、第一句字幕、人物表情和冲突画面。"
    });
  } else if (metrics.ctr >= 0.012 && metrics.ctr < 0.02) {
    issues.push({
      type: "creative",
      title: "点击能跑，但爆点不够尖",
      detail: "素材有基础点击，但缺少强反差或即时结果。下一轮要做更强钩子，而不是只换配色和字幕。"
    });
  }

  if (metrics.clicks >= 300 && metrics.cvr < 0.018) {
    issues.push({
      type: "conversion",
      title: "点击后转化弱",
      detail: "用户愿意点，但落地页、价格、信任证明或产品解释没有接住。要检查首屏是否承接视频里的痛点。"
    });
  }

  if (metrics.cpa && metrics.targetCpa && metrics.cpa > metrics.targetCpa * 1.18) {
    issues.push({
      type: "cost",
      title: "CPA 超目标",
      detail: "当前获客成本压不住，不能盲目放量。先拆是点击贵、转化差，还是素材疲劳导致成本抬升。"
    });
  }

  if (metrics.breakEvenCpa && metrics.cpa > metrics.breakEvenCpa) {
    issues.push({
      type: "profit",
      title: "利润线被打穿",
      detail: "CPA 已经高于毛利可承受线，继续烧预算会越跑越亏。除非有复购或加购，否则要降预算或关停。"
    });
  }

  if (metrics.frequency >= 2.8) {
    issues.push({
      type: "fatigue",
      title: "频次偏高，素材开始老化",
      detail: "同一批用户看太多次，CTR 和评论质量会变差。要上新素材、换前 3 秒或拆新受众。"
    });
  }

  if (String(data.trustLevel || "").startsWith("弱")) {
    issues.push({
      type: "trust",
      title: "信任证明不足",
      detail: "跨境百货尤其容易被用户质疑，必须补真实手持、使用近景、评论回应、前后对比和场景证据。"
    });
  }

  if (String(data.landingMatch || "").startsWith("弱")) {
    issues.push({
      type: "landing",
      title: "素材和落地页断层",
      detail: "广告讲一个痛点，页面讲另一个卖点，会直接拉低 CVR。首屏标题、图、价格利益点要和素材同一套话术。"
    });
  }

  if (!issues.length) {
    issues.push({
      type: "scale",
      title: "没有明显硬伤，进入变量测试",
      detail: "当前更适合做系统化变量测试：换钩子、换人设、换场景、换利益点，找到可以复制放量的组合。"
    });
  }

  return issues;
}

function judgeBudgetAction(data, metrics, issues) {
  const safeLine = safeCpa(metrics);
  const hasProfitRisk = issues.some((item) => item.type === "profit");
  const hasConversionRisk = issues.some((item) => item.type === "conversion" || item.type === "landing");
  const hasCreativeRisk = issues.some((item) => item.type === "creative");
  const hasFatigue = issues.some((item) => item.type === "fatigue");

  if (hasProfitRisk) {
    return {
      level: "danger",
      title: "降预算或关停亏损组",
      steps: ["只保留有订单且 CPA 接近利润线的组", "把预算转移到新素材测试", "不要用低价优惠硬拉转化，先修落地页和信任证据"]
    };
  }

  if (metrics.roas >= 2.2 && metrics.cpa <= safeLine && !hasFatigue) {
    return {
      level: "good",
      title: "小步放量，单次加 20%-30%",
      steps: ["保留原组，不要频繁大改", "复制胜出素材做 3 个首帧变体", "新增宽泛受众或 Advantage+，让系统继续找人"]
    };
  }

  if (hasFatigue) {
    return {
      level: "watch",
      title: "预算不加，先换素材池",
      steps: ["换前 3 秒钩子和封面", "保留同一卖点但换人物关系", "老素材降预算，避免频次继续抬高"]
    };
  }

  if (hasCreativeRisk || hasConversionRisk) {
    return {
      level: "watch",
      title: "暂停放量，先做问题修复",
      steps: ["CTR 低先改素材，不急着改页面", "CTR 高 CVR 低先改落地页承接", "下一轮测试只改一个主变量，避免不知道赢在哪里"]
    };
  }

  return {
    level: "watch",
    title: "维持预算，继续观察 24 小时",
    steps: ["不要过早杀组", "观察每 1000 曝光的 CTR 波动", "评论区有有效疑问就反向做下一条素材"]
  };
}

function auditCreative(data, metrics) {
  return [
    {
      title: "首帧",
      detail: String(data.hookStrength || "").startsWith("强") ? "可作为当前主变量保留，继续做同钩子不同场景。" : "需要更强视觉冲突：大表情、事故现场、离谱对比、反常识字幕。"
    },
    {
      title: "产品露出",
      detail: data.productTiming === "0-3 秒露出" ? "适合功能直接型产品，但要避免像硬广。" : "建议在冲突建立后 3-6 秒露出，让产品承担翻盘角色。"
    },
    {
      title: "信任",
      detail: String(data.trustLevel || "").startsWith("强") ? "证明链可保留，下一轮重点换钩子。" : "补手部近景、真实使用痕迹、失败对比、评论质疑回应。"
    },
    {
      title: "Meta 适配",
      detail: metrics.frequency >= 2.8 ? "当前素材池偏薄，要扩 5-8 条同卖点新角度。" : "可以继续跑宽泛受众，用素材自己筛人。"
    }
  ];
}

function auditCompetitor(data) {
  if (!data.spyUrl && !data.spyNotes) {
    return {
      title: "未录入竞品情报",
      items: ["建议把 PPSPY / BigSpy / Meta Ad Library 里的广告链接、标题、首帧和评论疑问录入后再判断。"]
    };
  }

  const items = [];
  const status = data.spyStatus || "不确定";
  const structure = data.spyStructure || "未填写结构";
  const hook = data.spyHook || "未填写首帧";
  const copyLevel = data.spyCopyLevel || "未填写可复制等级";

  if (status.includes("长期投放") || status.includes("跑量")) {
    items.push("优先拆它的底层结构：长期或疑似跑量素材通常说明账户已经验证过点击和转化。");
  } else if (status.includes("已停投")) {
    items.push("不要直接照抄，先判断它是测失败停投，还是阶段性素材疲劳。");
  } else {
    items.push("投放状态不确定时，只能当作创意参考，不能当作爆款结论。");
  }

  if (structure.includes("痛点冲突")) {
    items.push("可复制路径：前 1 秒给痛点现场，3 秒内让产品介入，结尾用结果画面收口。");
  } else if (structure.includes("UGC")) {
    items.push("可复制路径：口播不要像广告，要像用户吐槽和实测，核心是可信度。");
  } else if (structure.includes("Before")) {
    items.push("可复制路径：强化对比证据，画面要有同角度、同环境、同产品动作。");
  } else {
    items.push(`可复制路径：保留“${structure}”的节奏，换成本产品的真实使用场景。`);
  }

  if (hook.startsWith("强")) {
    items.push("首帧可以借鉴节奏，但人物、场景、台词和构图必须重做，避免像搬运。");
  } else {
    items.push("首帧不够强，别学它的开头，只学卖点或证明方式。");
  }

  if (copyLevel.startsWith("高")) {
    items.push("执行建议：做 3 个同结构变体，分别换人群、冲突场景和产品露出时机。");
  } else if (copyLevel.startsWith("中")) {
    items.push("执行建议：只借钩子或卖点，不要完整复刻分镜。");
  } else {
    items.push("执行建议：不要进入制作，先找更接近你产品的竞品素材。");
  }

  if (data.spyNotes) {
    items.push(`备注提炼：${data.spyNotes}`);
  }

  return {
    title: data.spyUrl ? "已录入竞品广告链接" : "已录入竞品信息",
    items
  };
}

function buildNextBrief(data, metrics, issues) {
  const product = data.productName || "该产品";
  const category = data.category || "当前类目";
  const market = data.market || "目标市场";
  const creativeIssue = issues.find((item) => item.type === "creative");
  const conversionIssue = issues.find((item) => item.type === "conversion" || item.type === "landing");

  const brief = [
    {
      title: "方向 1：强冲突开场",
      detail: `${market}本地家庭/情侣/邻里冲突，前 1 秒直接给出问题现场，让${product}成为反转解决工具。`
    },
    {
      title: "方向 2：真实证明型",
      detail: `围绕${category}用户最怕的“不信任”做近景证明：手持、污渍/效果对比、连续动作、评论质疑回应。`
    },
    {
      title: "方向 3：Facebook Feed 首屏版",
      detail: "做 4:5 或 1:1 封面强字幕版本，第一帧大字只说一个痛点，不要同时塞太多卖点。"
    },
    {
      title: "方向 4：Reels 快节奏版",
      detail: "压到 9-15 秒，前 3 秒冲突，中段产品介入，结尾给结果和一句轻 CTA。"
    }
  ];

  if (creativeIssue) {
    brief.unshift({
      title: "优先修复：点击钩子",
      detail: "先做 5 个不同首帧：震惊脸、失败现场、强对比结果、反常识字幕、人物翻脸。"
    });
  }

  if (conversionIssue) {
    brief.unshift({
      title: "优先修复：承接转化",
      detail: "素材里出现的痛点、结果图、价格利益点，必须同步到落地页首屏。"
    });
  }

  return brief.slice(0, 6);
}

function buildPlatformNotes(data) {
  const platform = data.platform || "Facebook / Instagram";

  if (platform.includes("Facebook") || platform.includes("Meta") || platform.includes("Instagram")) {
    return [
      "Meta 不只看素材好不好看，更看素材能不能帮系统找到购买人群。",
      "跨境百货建议用宽泛受众 + 多素材变量，不要一开始把兴趣定太死。",
      "如果评论区出现质疑，就是下一条素材的选题来源，不是单纯客服问题。",
      "Feed 看封面和利益点，Reels 看节奏和冲突，两个版位不要只用同一条剪法。"
    ];
  }

  return [
    "当前平台不是 OPX 主场，但仍可按点击、转化、成本、疲劳四条线诊断。",
    "先找出素材问题还是落地页问题，再决定预算动作。"
  ];
}

function buildFinalCall(data, metrics, issues) {
  if (issues.some((item) => item.type === "profit")) return "结论：当前不适合继续放量，先保利润线，修素材和承接。";
  if (metrics.roas >= 2.2 && metrics.cpa <= safeCpa(metrics)) return "结论：可以小步放量，但必须同步补素材池，避免两天后疲劳。";
  if (issues.some((item) => item.type === "creative")) return "结论：问题优先在素材点击，不要先怪人群和账户。";
  if (issues.some((item) => item.type === "conversion" || item.type === "landing")) return "结论：点击能进来但页面没接住，先改首屏和信任证明。";
  return "结论：维持预算观察，下一轮用变量测试找更强放量素材。";
}

function renderScoreboard(metrics) {
  const values = metrics ? [
    [formatPercent(metrics.ctr), "点击率"],
    [formatPercent(metrics.cvr), "转化率"],
    [formatMoney(metrics.cpc), "点击成本"],
    [formatMoney(metrics.cpa), "转化成本"],
    [formatNumber(metrics.roas), "广告回报"],
    [formatMoney(metrics.breakEvenCpa), "可承受线"]
  ] : [
    ["-", "点击率"],
    ["-", "转化率"],
    ["-", "点击成本"],
    ["-", "转化成本"],
    ["-", "广告回报"],
    ["-", "可承受线"]
  ];

  const labels = ["CTR", "CVR", "CPC", "CPA", "ROAS", "毛利 CPA"];
  scoreboard.innerHTML = values.map(([value, hint], index) => `
    <article>
      <span>${labels[index]}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `).join("");
}

function renderDiagnosis(report) {
  const { data, metrics, lifecycle, bottlenecks, budgetAction, creativeAudit, spyAudit, platformNotes, finalCall, aiResult } = report;
  const aiBlocks = aiResult ? `
      ${block("AI 总判断", aiResult.executiveSummary, [aiResult.accountStatus, aiResult.mainProblem], "good full")}
      ${block("AI 预算指令", aiResult.budgetDecision, aiResult.nextActions, "large")}
      ${block("AI 素材指令", aiResult.creativeDecision, aiResult.creativeBriefs, "large")}
      ${block("AI 落地页 / 竞品", aiResult.landingDecision, [aiResult.competitorInsight, ...aiResult.riskWarnings], "large")}
    ` : "";

  diagnosis.className = `diagnosis-panel ${budgetAction.level}`;
  diagnosis.innerHTML = `
    <div class="section-title compact">
      <h2>${data.productName || "未命名产品"}｜账户诊断</h2>
      <p>${data.platform || "-"} / ${data.market || "-"} / ${data.stage || "-"}</p>
    </div>
    <div class="diagnosis-grid">
      ${aiBlocks}
      ${block("生命周期", lifecycle.title, [lifecycle.detail], lifecycle.level)}
      ${block("预算动作", budgetAction.title, budgetAction.steps, budgetAction.level)}
      ${block("问题定位", "当前主要卡点", bottlenecks.map((item) => `${item.title}：${item.detail}`), "watch large")}
      ${block("素材审核", data.creativeType || "未填写素材类型", creativeAudit.map((item) => `${item.title}：${item.detail}`), "large")}
      ${block("竞品情报", spyAudit.title, spyAudit.items, "large")}
      ${block("Meta 操盘提醒", "Facebook / Instagram 跨境投放", platformNotes, "large")}
      ${block("最终判断", finalCall, [`CPM ${formatMoney(metrics.cpm)}｜频次 ${formatNumber(metrics.frequency)}｜CTR 跌幅 ${formatPercent(Math.max(metrics.ctrDrop, 0))}`], budgetAction.level)}
    </div>
  `;
}

function renderBrief(report) {
  const { data, brief, aiResult } = report;
  const aiBriefs = aiResult ? aiResult.creativeBriefs.map((item, index) => ({
    title: `AI Brief ${index + 1}`,
    detail: item
  })) : [];
  const mergedBrief = [...aiBriefs, ...brief].slice(0, 8);

  briefOutput.className = "diagnosis-panel good";
  briefOutput.innerHTML = `
    <div class="section-title compact">
      <h2>下一轮素材 Brief</h2>
      <p>${data.category || "当前类目"} / ${data.market || "目标市场"} / ${data.objective || "投放目标"}</p>
    </div>
    <div class="brief-stack">
      ${mergedBrief.map((item, index) => `
        <article class="brief-item">
          <span>0${index + 1}</span>
          <div>
            <strong>${item.title}</strong>
            <p>${item.detail}</p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = label;
}

function block(label, title, items, tone = "") {
  return `
    <article class="diagnosis-block ${tone}">
      <span>${label}</span>
      <strong>${title}</strong>
      <ul>
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </article>
  `;
}

function safeCpa(metrics) {
  if (metrics.targetCpa) return metrics.targetCpa;
  if (metrics.breakEvenCpa) return metrics.breakEvenCpa;
  return Number.POSITIVE_INFINITY;
}

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatMoney(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `$${value.toFixed(2)}`;
}

function formatNumber(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return value.toFixed(2);
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

renderScoreboard(null);
updateHomeTicker(getMetrics({}), []);
