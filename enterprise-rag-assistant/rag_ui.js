const role = document.querySelector("#role");
const query = document.querySelector("#query");
const ask = document.querySelector("#ask");
const answer = document.querySelector("#answer");
const answerStatus = document.querySelector("#answer-status");
const sources = document.querySelector("#sources");
const systemStatus = document.querySelector("#system-status");
const fileCount = document.querySelector("#file-count");
const chunkCount = document.querySelector("#chunk-count");
const knowledgeFiles = document.querySelector("#knowledge-files");
const retrievalStatus = document.querySelector("#retrieval-status");
const demoButtons = document.querySelectorAll("[data-demo]");
const pageLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll(".page");
const useMemory = document.querySelector("#use-memory");
const clearMemory = document.querySelector("#clear-memory");
const API_ORIGIN = window.location.origin.startsWith("http") ? window.location.origin : "http://127.0.0.1:8789";
let accessPassword = localStorage.getItem("ragAccessPassword") || "";

let conversationMemory = JSON.parse(localStorage.getItem("ragConversationMemory") || "[]");

loadKnowledgeOverview();

pageLinks.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    switchPage(button.dataset.pageLink);
  });
});

demoButtons.forEach((button) => {
  button.addEventListener("click", () => {
    query.value = button.dataset.demo;
    query.focus();
  });
});

ask.addEventListener("click", async () => {
  const question = query.value.trim();
  if (!question) {
    alert("先输入一个问题。");
    return;
  }

  setBusy(true);
  answer.textContent = "正在查资料并生成建议...";
  sources.innerHTML = "<p>正在匹配相关资料...</p>";

  try {
    const response = await fetchWithPassword(`${API_ORIGIN}/api/ask`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        query: question,
        role: role.value,
        history: useMemory.checked ? conversationMemory.slice(-3) : [],
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "请求失败");
    }
    answer.textContent = formatAnswer(payload.answer || "没有返回答案。");
    rememberConversation(question, answer.textContent);
    renderSources(payload.sources || []);
    answerStatus.textContent = payload.model ? `生成完成：${payload.model}` : "生成完成";
    if (payload.retrieval) {
      retrievalStatus.textContent = `命中 ${payload.retrieval.matchedChunks}/${payload.retrieval.totalChunks}`;
    }
  } catch (error) {
    answer.textContent = `运行失败：${error.message}\n\n先检查三件事：\n当前命令行已设置 AGNES_API_KEY。\n当前命令行已设置 RAG_ALLOW_EXTERNAL=1。\n设置后重新启动服务。`;
    sources.innerHTML = "<p>没有可展示的资料来源。</p>";
    answerStatus.textContent = "失败";
  } finally {
    setBusy(false);
  }
});

clearMemory.addEventListener("click", () => {
  conversationMemory = [];
  localStorage.removeItem("ragConversationMemory");
  answerStatus.textContent = "记忆已清空";
});

async function loadKnowledgeOverview() {
  try {
    const response = await fetchWithPassword(`${API_ORIGIN}/api/knowledge`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "读取知识库失败");
    }
    fileCount.textContent = data.fileCount;
    chunkCount.textContent = data.chunkCount;
    const keyText = data.hasApiKey ? "Key 已配置" : "Key 未配置";
    const externalText = data.externalAllowed ? "练习资料可调用模型" : "外部调用未开启";
    systemStatus.innerHTML = `
      <b>当前模型：${escapeHtml(data.model)}</b>
      <p>${escapeHtml(keyText)} / ${escapeHtml(externalText)}。资料来自 knowledge 文件夹，回答会显示引用来源。</p>
    `;
    knowledgeFiles.innerHTML = data.files.map((file) => `
      <article class="knowledge-file">
        <div>
          <strong>${escapeHtml(file.name)}</strong>
          <span>${escapeHtml(file.category || "通用资料")}</span>
        </div>
        <em>${file.chunks} 个切片</em>
      </article>
    `).join("");
  } catch (error) {
    systemStatus.innerHTML = `
      <b>知识库读取失败</b>
      <p>${escapeHtml(error.message)}</p>
    `;
    knowledgeFiles.innerHTML = "<p>无法读取。</p>";
  }
}

async function fetchWithPassword(url, options = {}) {
  const requestOptions = withPasswordHeader(options);
  let response = await fetch(url, requestOptions);
  if (response.status !== 401) {
    return response;
  }

  const nextPassword = window.prompt("请输入企业知识助手访问密码");
  if (!nextPassword) {
    return response;
  }
  accessPassword = nextPassword.trim();
  localStorage.setItem("ragAccessPassword", accessPassword);
  response = await fetch(url, withPasswordHeader(options));
  return response;
}

function withPasswordHeader(options = {}) {
  const headers = new Headers(options.headers || {});
  if (accessPassword) {
    headers.set("X-RAG-PASSWORD", accessPassword);
  }
  return {
    ...options,
    headers,
  };
}

function switchPage(name) {
  pages.forEach((page) => {
    page.classList.toggle("active", page.id === `page-${name}`);
  });
  pageLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.pageLink === name);
  });
  window.scrollTo({top: 0, behavior: "smooth"});
}

function renderSources(items) {
  if (!items.length) {
    sources.innerHTML = "<p>没有检索到资料。</p>";
    return;
  }

  sources.innerHTML = items.map((item) => `
    <article class="source-card">
      <strong>${escapeHtml(item.source)} / ${escapeHtml(item.chunkId)}</strong>
      <em>${escapeHtml(item.category || "通用资料")}</em>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function setBusy(isBusy) {
  ask.disabled = isBusy;
  ask.textContent = isBusy ? "生成中..." : "生成建议";
  if (isBusy) {
    answerStatus.textContent = "运行中";
    retrievalStatus.textContent = "检索中";
  }
}

function rememberConversation(question, response) {
  conversationMemory.push({
    question,
    answer: response.slice(0, 800),
  });
  conversationMemory = conversationMemory.slice(-6);
  localStorage.setItem("ragConversationMemory", JSON.stringify(conversationMemory));
}

function formatAnswer(value) {
  return String(value)
    .replaceAll("**", "")
    .replaceAll("##", "")
    .replaceAll("---", "")
    .replaceAll("```", "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^[|\-\s:]+$/.test(line))
    .map((line) => {
      if (line.startsWith("|") && line.endsWith("|")) {
        return line.slice(1, -1).split("|").map((item) => item.trim()).filter(Boolean).join("，");
      }
      return line.replace(/^[-*]\s+/, "").replace(/^\d+[.)、]\s*/, "");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
