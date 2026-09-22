const gate = document.querySelector("#gate");
const app = document.querySelector("#app");
const accessPassword = document.querySelector("#access-password");
const unlockButton = document.querySelector("#unlock");
const gateMessage = document.querySelector("#gate-message");
const fileInput = document.querySelector("#reference-file");
const dropZone = document.querySelector("#drop-zone");
const referenceList = document.querySelector("#reference-list");
const uploadPlaceholder = document.querySelector("#upload-placeholder");
const promptInput = document.querySelector("#prompt");
const ratioInput = document.querySelector("#ratio");
const qualityInput = document.querySelector("#quality");
const editModeInput = document.querySelector("#edit-mode");
const editBriefInput = document.querySelector("#edit-brief");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const clearHistoryButton = document.querySelector("#clear-history");
const imageStage = document.querySelector("#image-stage");
const message = document.querySelector("#message");
const modeLabel = document.querySelector("#mode-label");
const apiStatus = document.querySelector("#api-status");
const historyList = document.querySelector("#history-list");

const API_ENDPOINT = "/api/generate-image";
const HISTORY_KEY = "museframe-prompts";
const PASSWORD_KEY = "museframe-access-password";

let referenceFiles = [];
let energy = Number(localStorage.getItem("museframe-energy")) || 86;

initAccess();
updateEnergy();
renderHistory();

unlockButton.addEventListener("click", unlockApp);
accessPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlockApp();
});

fileInput.addEventListener("change", () => {
  addReferenceFiles(fileInput.files);
  fileInput.value = "";
});

promptInput.addEventListener("input", () => {
  if (!referenceFiles.length) modeLabel.textContent = "文生图模式";
});

clearButton.addEventListener("click", () => {
  promptInput.value = "";
  editBriefInput.value = "";
  fileInput.value = "";
  referenceFiles = [];
  resetReference();
  setMessage("已清空输入。");
});

clearHistoryButton.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

generateButton.addEventListener("click", generateImage);

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  addReferenceFiles(event.dataTransfer.files);
});

function initAccess() {
  const savedPassword = sessionStorage.getItem(PASSWORD_KEY);
  if (savedPassword) {
    gate.classList.add("hidden");
    app.classList.remove("locked");
  }
}

function unlockApp() {
  const password = accessPassword.value.trim();
  if (!password) {
    gateMessage.textContent = "请输入访问密码。";
    return;
  }
  sessionStorage.setItem(PASSWORD_KEY, password);
  gate.classList.add("hidden");
  app.classList.remove("locked");
}

async function generateImage() {
  const prompt = promptInput.value.trim();
  const password = sessionStorage.getItem(PASSWORD_KEY) || "";

  if (!prompt) {
    setMessage("先输入提示词。", "error");
    promptInput.focus();
    return;
  }

  savePrompt(prompt, referenceFiles.length ? "图生图" : "文生图");
  renderHistory();
  setLoading(true);
  showGenerating();

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("mode", referenceFiles.length ? "image-to-image" : "text-to-image");
    formData.append("ratio", ratioInput.value);
    formData.append("quality", qualityInput.value);
    formData.append("editMode", editModeInput.value);
    formData.append("editBrief", editBriefInput.value.trim());
    referenceFiles.forEach((file, index) => {
      formData.append("images", file);
      formData.append(`imageName_${index}`, file.name);
    });

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {"X-MuseFrame-Password": password},
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `接口返回 ${response.status}`);
    }

    const imageUrl = data.imageUrl || data.url || data.image;
    if (!imageUrl) {
      throw new Error("接口没有返回图片地址");
    }

    showImage(imageUrl);
    apiStatus.textContent = "生成完成";
    consumeEnergy();
    setMessage("生成完成。", "success");
  } catch (error) {
    showApiPlaceholder(prompt);
    apiStatus.textContent = "生成失败";
    setMessage(`生成失败：${error.message || "生图服务未连接"}`, "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? "生成中..." : "生成图片";
}

function showImage(src) {
  imageStage.classList.remove("generating");
  imageStage.innerHTML = "";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "生成图片";
  imageStage.appendChild(img);
}

function showGenerating() {
  imageStage.classList.add("generating");
  imageStage.innerHTML = `
    <div class="generation-fx"></div>
    <div class="loading-core">
      <div class="loading-ring"></div>
      <strong>正在生成视觉方案</strong>
      <span>正在读取提示词、参考图、替换方式、比例和清晰度。</span>
    </div>
  `;
}

function showApiPlaceholder(prompt) {
  imageStage.classList.remove("generating");
  imageStage.innerHTML = `
    <div class="empty-state">
      <strong>暂未生成成功</strong>
      <span>请检查访问密码、API Key、模型名称或额度。</span>
      <span>本次提示词：${escapeHtml(prompt.slice(0, 90))}${prompt.length > 90 ? "..." : ""}</span>
    </div>
  `;
}

function resetReference() {
  renderReferences();
  modeLabel.textContent = "文生图模式";
}

function addReferenceFiles(fileList) {
  const images = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  referenceFiles = [...referenceFiles, ...images].slice(0, 12);
  renderReferences();
  modeLabel.textContent = referenceFiles.length ? "图生图模式" : "文生图模式";
}

function renderReferences() {
  referenceList.innerHTML = "";
  uploadPlaceholder.style.display = referenceFiles.length ? "none" : "grid";
  if (!referenceFiles.length) return;

  const count = document.createElement("div");
  count.className = "reference-count";
  count.textContent = `已添加 ${referenceFiles.length} 张参考图`;
  referenceList.appendChild(count);

  referenceFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "reference-item";
    item.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="参考图 ${index + 1}">
      <button type="button" aria-label="删除参考图">×</button>
    `;
    item.querySelector("button").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      referenceFiles.splice(index, 1);
      renderReferences();
      modeLabel.textContent = referenceFiles.length ? "图生图模式" : "文生图模式";
    });
    referenceList.appendChild(item);
  });
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function savePrompt(prompt, mode) {
  const history = getHistory();
  const next = [
    {
      prompt,
      mode,
      ratio: ratioInput.value,
      quality: qualityInput.value,
      editMode: editModeInput.value,
      time: new Date().toLocaleString("zh-CN", {hour12: false})
    },
    ...history.filter((item) => item.prompt !== prompt)
  ].slice(0, 12);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty">暂无提示词记录。生成一次后会自动保存。</div>`;
    return;
  }

  historyList.innerHTML = "";
  history.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-item";
    card.innerHTML = `
      <b>${escapeHtml(item.mode)} · ${escapeHtml(item.time)}</b>
      <p>${escapeHtml(item.prompt)}</p>
      <button type="button">复用提示词</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      promptInput.value = item.prompt;
      promptInput.focus();
      setMessage("已填入历史提示词。");
    });
    historyList.appendChild(card);
  });
}

function consumeEnergy() {
  const costMap = {"1k": 2, "2k": 4, "4k": 8, "8k": 16};
  energy = Math.max(0, energy - (costMap[qualityInput.value] || 4));
  localStorage.setItem("museframe-energy", String(energy));
  updateEnergy();
}

function updateEnergy() {
  const energyValue = document.querySelector("#energy-value");
  const energyFill = document.querySelector("#energy-fill");
  if (!energyValue || !energyFill) return;
  energyValue.textContent = `${energy}%`;
  energyFill.style.width = `${energy}%`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
