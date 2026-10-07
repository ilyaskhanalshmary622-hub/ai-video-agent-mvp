"use strict";
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notify("浏览器存储空间不足，请导出记录备份。"); return false; } }
let history = readStore("ragHistoryV2", []); if (!Array.isArray(history)) history = [];
history = history.filter(x => x && typeof x.id === "string" && typeof x.question === "string" && typeof x.answer === "string").slice(0,100).map(x => ({...x,sources:Array.isArray(x.sources)?x.sources.filter(s=>s&&typeof s.text==="string"):[]}));
let memory = readStore("ragConversationMemory", []); if (!Array.isArray(memory)) memory = [];
memory = memory.filter(x => x && typeof x.question === "string" && typeof x.answer === "string").slice(-6);
let accessPassword = ""; try { accessPassword = localStorage.getItem("ragAccessPassword") || ""; } catch {}
let documents = [], current = null, controller = null, toastTimer;
const emptyAnswer = $("#answer").innerHTML;
function notify(text) { clearTimeout(toastTimer); $("#toast").textContent = text; $("#toast").classList.add("visible"); toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500); }
function switchPage(name) { if (!["ask","knowledge","history","deploy"].includes(name)) return; document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + name)); document.querySelectorAll(".nav-link").forEach(el => { el.classList.toggle("active", el.dataset.pageLink === name); el.setAttribute("aria-current", el.dataset.pageLink === name ? "page" : "false"); }); $("#page-title").textContent = ({ask:"问助手",knowledge:"知识库",history:"历史问答",deploy:"使用指南"})[name]; if (name === "history") renderHistory(); window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
document.querySelectorAll("[data-page-link]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); switchPage(el.dataset.pageLink); }));
const draft = readStore("ragDraftV2", {}); $("#query").value = typeof draft.query === "string" ? draft.query.slice(0,12000) : ""; if ([...$("#role").options].some(o => o.value === draft.role)) $("#role").value = draft.role;
function saveDraft() { $("#query-count").textContent = $("#query").value.length + " / 12000"; saveStore("ragDraftV2",{query:$("#query").value,role:$("#role").value}); }
$("#query").addEventListener("input",saveDraft); $("#role").addEventListener("change",saveDraft); saveDraft();
document.querySelectorAll("[data-demo]").forEach(el => el.onclick = () => { $("#query").value = el.dataset.demo; $("#role").value = el.dataset.role; saveDraft(); $("#query").focus(); });
function resetMemory() { memory = []; saveStore("ragConversationMemory",memory); }
$("#clear-memory").onclick = () => { resetMemory(); notify("上下文已重置，历史问答仍保留。"); };
$("#new-chat").onclick = () => { if (controller) { notify("请先停止当前等待，再新建问答。"); return; } saveStore("ragPendingTask",null); resetMemory(); current = null; $("#query").value = ""; $("#answer").innerHTML = emptyAnswer; $("#sources").innerHTML = '<p class="empty-copy">检索到的资料片段将在这里展示。</p>'; $("#answer-status").textContent="等待提问"; $("#retrieval-status").textContent="等待检索"; $("#form-message").textContent=""; setResultActions(false); saveDraft(); switchPage("ask"); $("#query").focus(); };
let passwordRequest = null;
function requestPassword() {
  if (passwordRequest) return passwordRequest;
  passwordRequest = new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "access-dialog";
    dialog.innerHTML = '<form method="dialog"><h2>访问企业知识助手</h2><p>输入访问密码后即可检索资料、生成回答。</p><label for="access-password">访问密码</label><input id="access-password" type="password" autocomplete="current-password" required autofocus><div><button class="ghost" value="cancel" formnovalidate>取消</button><button class="primary" value="login">继续</button></div></form>';
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      const value = dialog.returnValue === "login" ? dialog.querySelector("input").value.trim() : "";
      dialog.remove(); passwordRequest = null; resolve(value);
    }, {once:true});
    dialog.showModal();
  });
  return passwordRequest;
}
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {}); if (accessPassword) headers.set("X-RAG-PASSWORD", accessPassword);
  let response = await fetch(path,{...options,headers});
  if (response.status === 401) {
    const entered = await requestPassword();
    if (entered) { accessPassword = entered.trim(); headers.set("X-RAG-PASSWORD", accessPassword); response = await fetch(path,{...options,headers}); if (response.ok) { try { localStorage.setItem("ragAccessPassword",accessPassword); } catch {} } }
  }
  let data; try { data = await response.json(); } catch (error) { if (error.name === "AbortError") throw error; throw new Error(response.status === 504 || response.status === 524 ? "服务连接超时，输入已保留，请稍后重试。" : "服务暂时没有返回有效内容，请稍后重试。"); }
  if (!response.ok) { const error = new Error(response.status === 401 ? "访问密码未通过验证，请重新输入。" : data.code ? data.error : response.status >= 500 ? "服务暂时无法完成请求，输入已保留。请稍后重试，持续失败时联系管理员。" : data.error || "请求未完成，请重试。"); error.status = response.status; throw error; }
  return data;
}
function inline(text) { return esc(text).replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`\n]+)`/g,"<code>$1</code>"); }
function renderAnswer(text) {
  let out="", list="", code=false, codeLines=[];
  const endList=()=>{ if(list){out+="</"+list+">";list="";} };
  for(const line of String(text).split("\n")) {
    if(line.trim().startsWith("```")) { endList(); if(code){out+="<pre><code>"+esc(codeLines.join("\n"))+"</code></pre>";codeLines=[];} code=!code;continue; }
    if(code){codeLines.push(line);continue;}
    if(!line.trim()){endList();continue;}
    const heading=line.match(/^#{1,6}\s+(.+)/), bullet=line.match(/^\s*[-*]\s+(.+)/), numbered=line.match(/^\s*\d+[.)、]\s*(.+)/);
    if(heading){endList();out+="<h3>"+inline(heading[1])+"</h3>";}
    else if(bullet||numbered){const next=bullet?"ul":"ol";if(list!==next){endList();list=next;out+="<"+list+">";}out+="<li>"+inline((bullet||numbered)[1])+"</li>";}
    else{endList();out+="<p>"+inline(line)+"</p>";}
  }
  endList();if(code)out+="<pre><code>"+esc(codeLines.join("\n"))+"</code></pre>";$("#answer").innerHTML=out;
}
function sourceLinks(text) {
  const urls=[...new Set(String(text).match(/https:\/\/[^\s)<>]+/g)||[])];
  return urls.map(url=>{try{const parsed=new URL(url);return '<a class="source-link" href="'+esc(parsed.href)+'" target="_blank" rel="noopener noreferrer">查看来源 · '+esc(parsed.hostname)+' ↗</a>';}catch{return "";}}).join("");
}
function renderSources(items) { $("#sources").innerHTML = items.length ? items.map((item,i)=>'<details class="source-card"><summary>'+String(i+1).padStart(2,"0")+" · "+esc(item.source)+'<em>'+esc(item.category||"通用资料")+'</em></summary><p>'+esc(String(item.text||"").replace(/\[([^\]]+)\]\(https:\/\/[^)\s]+\)/g,"$1"))+'</p>'+sourceLinks(item.text)+'</details>').join("") : '<p class="empty-copy">没有检索到匹配资料。可补充产品名称或更具体的业务关键词。</p>'; }
function setResultActions(enabled) { $("#copy-answer").disabled=!enabled; $("#export-answer").disabled=!enabled; }
function showRecord(record) { current=record; renderAnswer(record.answer); renderSources(record.sources||[]); $("#answer-status").textContent="已完成"; $("#retrieval-status").textContent="引用 "+(record.sources||[]).length+" 个片段";setResultActions(true); }
function setBusy(value) { $("#ask").disabled=value; $("#cancel").hidden=!value; $("#ask").textContent=value?"正在生成…":"生成建议 ↗"; $("#answer").setAttribute("aria-busy",String(value)); }
function pausePoll(ms, signal) {
  return new Promise((resolve,reject) => {
    const abort=()=>{clearTimeout(timer);reject(new DOMException("Stopped","AbortError"));};
    const timer=setTimeout(()=>{signal.removeEventListener("abort",abort);resolve();},ms);
    signal.addEventListener("abort",abort,{once:true}); if(signal.aborted)abort();
  });
}
async function waitForTask(task, signal) {
  for (;;) {
    if(signal.aborted)throw new DOMException("Stopped","AbortError");
    try {
      const requestSignal=AbortSignal.any([signal,AbortSignal.timeout(20000)]);
      const state=await api(task.accepted?"/api/tasks/"+task.id:"/api/tasks", task.accepted?{signal:requestSignal}:{method:"POST",headers:{"Content-Type":"application/json"},signal:requestSignal,body:JSON.stringify(task)});
      task.accepted=true;saveStore("ragPendingTask",task);
      if(state.status==="completed"){saveStore("ragPendingTask",null);return state.result;}
      if(state.status==="failed"){saveStore("ragPendingTask",null);const e=new Error(state.error);e.terminal=true;throw e;}
      $("#answer-status").textContent=state.status==="queued"?"排队中":"正在生成";
      $("#form-message").textContent="后台任务进行中，可刷新页面恢复等待。";
    } catch(error) {
      if(signal.aborted)throw new DOMException("Stopped","AbortError");
      if(error.terminal || (error.status>=400 && error.status<500 && error.status!==408)) {saveStore("ragPendingTask",null);throw error;}
      $("#answer-status").textContent="连接恢复中";
      $("#form-message").textContent="网络暂时中断，正在重新查询同一个任务，不会重复生成。";
    }
    await pausePoll(3000,signal);
  }
}
async function generateAnswer(pending=null) {
  if(controller)return; const question=pending?.query || $("#query").value.trim(); if(!question){$("#form-message").textContent="先描述你遇到的问题。";$("#query").focus();return;}
  const selectedRole=pending?.role || $("#role").value; const requestController=new AbortController(); controller=requestController; let timedOut=false; const timer=setTimeout(()=>{timedOut=true;requestController.abort();},600000);
  const task=pending || {id:crypto.randomUUID(),query:question,role:selectedRole,history:$("#use-memory").checked?memory.slice(-3):[],accepted:false};saveStore("ragPendingTask",task);
  $("#form-message").textContent="";setBusy(true);setResultActions(false);$("#answer-status").textContent="正在处理";$("#retrieval-status").textContent="等待返回";$("#answer").innerHTML='<div class="busy-indicator"><span class="spinner"></span><span>正在检索资料并生成建议，请稍候…</span></div>';$("#sources").innerHTML='<p class="empty-copy">返回后展示本次检索依据。</p>';
  try {
    const data=await waitForTask(task,requestController.signal);
    if(!data || typeof data.answer!=="string")throw new Error("服务没有返回回答，请重试。");
    const record={id:task.id,question,answer:data.answer,role:selectedRole,sources:Array.isArray(data.sources)?data.sources:[],createdAt:Date.now()};
    showRecord(record);$("#form-message").textContent=""; history=[record,...history.filter(x=>x.id!==record.id)].slice(0,100);saveStore("ragHistoryV2",history);renderHistory();memory.push({question,answer:record.answer.slice(0,800)});memory=memory.slice(-6);saveStore("ragConversationMemory",memory);
  } catch(error) {
    const text=error.name==="AbortError"?(timedOut?"暂时停止等待，任务编号已保留。点击生成按钮可继续查询原任务。":"已停止页面等待，后台任务继续执行。点击生成按钮可恢复查询。"):error.message;
    $("#answer-status").textContent=error.name==="AbortError"?"等待已结束":"请求未完成";$("#form-message").textContent=text;$("#answer").innerHTML='<div class="empty-state"><span>↻</span><h3>输入和任务状态已保留</h3><p>'+esc(text)+'</p></div>';$("#sources").innerHTML='<p class="empty-copy">本次没有取得资料来源。</p>';$("#retrieval-status").textContent="未取得结果";
  } finally { clearTimeout(timer);controller=null;setBusy(false); }
};
$("#ask").onclick=()=>{const pending=readStore("ragPendingTask",null);generateAnswer(pending?.id && pending?.query ? pending : null);};
$("#cancel").onclick=()=>controller?.abort();$("#query").addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();$("#ask").click();}});
$("#copy-answer").onclick=async()=>{if(!current)return;try{await navigator.clipboard.writeText(current.answer);notify("回答已复制");}catch{notify("复制不可用，请选中回答手动复制。");}};
function download(name,content,type) {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("#export-answer").onclick=()=>{if(current)download("知序-执行建议.md","# "+current.question+"\n\n"+current.answer+"\n\n## 参考资料\n"+current.sources.map(s=>"- "+s.source).join("\n"),"text/markdown;charset=utf-8");};
function renderHistory(){const term=$("#history-search").value.trim().toLowerCase();const items=history.filter(x=>x.question.toLowerCase().includes(term));$("#history-count").textContent=history.length;$("#history-list").innerHTML=items.length?items.map(x=>'<button class="history-item" data-history="'+esc(x.id)+'"><strong>'+esc(x.question)+'</strong><span>'+esc(x.role||"运营诊断")+" · "+esc(new Date(x.createdAt).toLocaleString("zh-CN"))+' · '+(x.sources||[]).length+' 个引用</span></button>').join(""):'<div class="card empty-state"><span>◷</span><h3>'+(term?"没有找到匹配记录":"还没有历史问答")+'</h3><p>完成一次问答后，建议和引用会自动保存在这里。</p></div>';}
$("#history-search").oninput=renderHistory;$("#history-list").onclick=e=>{const el=e.target.closest("[data-history]");if(!el)return;if(controller){notify("请先停止当前等待，再打开历史。");return;}const record=history.find(x=>x.id===el.dataset.history);if(record){showRecord(record);$("#query").value=record.question;$("#role").value=record.role||"运营诊断";memory=[{question:record.question,answer:record.answer.slice(0,800)}];saveStore("ragConversationMemory",memory);saveDraft();switchPage("ask");}};
$("#export-history").onclick=()=>download("知序-问答备份.json",JSON.stringify({version:1,records:history},null,2),"application/json");
$("#import-history").onclick=()=>$("#history-file").click();$("#history-file").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error("备份文件不能超过 8 MB。");const data=JSON.parse(await file.text());if(!Array.isArray(data.records))throw new Error("请选择有效的问答备份。");const valid=data.records.slice(0,100).filter(x=>x&&typeof x.question==="string"&&typeof x.answer==="string").map(x=>({id:typeof x.id==="string"?x.id:crypto.randomUUID(),question:x.question.slice(0,12000),answer:x.answer.slice(0,100000),role:[...$("#role").options].some(o=>o.value===x.role)?x.role:"运营诊断",createdAt:Number.isFinite(x.createdAt)?x.createdAt:Date.now(),sources:Array.isArray(x.sources)?x.sources.slice(0,20).filter(s=>s&&typeof s.text==="string").map(s=>({source:String(s.source||""),category:String(s.category||""),text:s.text.slice(0,30000)})):[]}));history=[...new Map([...history,...valid].map(x=>[x.id,x])).values()].sort((a,b)=>b.createdAt-a.createdAt).slice(0,100);saveStore("ragHistoryV2",history);renderHistory();notify("问答备份已导入");}catch(error){notify(error.message);}finally{e.target.value="";}};
function renderDocuments(){const term=$("#knowledge-search").value.trim().toLowerCase();const found=documents.filter(f=>(f.name+" "+(f.title||"")+" "+f.category).toLowerCase().includes(term));$("#knowledge-summary").textContent=found.length+" / "+documents.length+" 份资料";$("#knowledge-files").innerHTML=found.length?found.map(f=>'<article class="knowledge-file"><div><strong>▤ '+esc(f.title||f.name)+'</strong><span>'+esc(f.category||"通用资料")+'</span></div><em>'+Number(f.chunks||0)+' 个片段</em></article>').join(""):'<p class="empty-copy">没有匹配的资料。</p>';}
async function loadKnowledge(){const button=$("#refresh-knowledge");button.disabled=true;try{const data=await api("/api/knowledge");documents=Array.isArray(data.files)?data.files:[];$("#file-count").textContent=data.fileCount??documents.length;$("#chunk-count").textContent=data.chunkCount??"—";$("#system-status").innerHTML='<b>'+(data.hasApiKey&&data.externalAllowed?"● 知识库已连接":"○ 服务尚未就绪")+'</b><p>'+esc(data.hasApiKey&&data.externalAllowed?"检索资料后生成建议，回答附带引用。":"模型服务需要管理员完成配置。")+'</p>';renderDocuments();}catch(error){$("#system-status").innerHTML='<b>连接暂时中断</b><p>'+esc(error.message)+'</p>';$("#knowledge-files").innerHTML='<p class="empty-copy">暂时无法读取资料，请点击「刷新资料」重试。</p>';}finally{button.disabled=false;}}
$("#knowledge-search").oninput=renderDocuments;$("#refresh-knowledge").onclick=loadKnowledge;renderHistory();loadKnowledge();
const pendingTask=readStore("ragPendingTask",null);if(pendingTask?.id&&typeof pendingTask.query==="string"){ $("#query").value=pendingTask.query;saveDraft();generateAnswer(pendingTask);}
