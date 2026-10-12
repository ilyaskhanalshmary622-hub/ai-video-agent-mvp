# 知序升级部署说明 · 2026-10-12

## 知识整理补丁 2026-10-12.2

当前知识整理与回答约束以 `KNOWLEDGE_RELEASE.md` 为准。切片已改为本地按章节和段落划分，
不再在请求路径加载 LlamaIndex；原依赖暂保留以便兼容部署。
知识库目录含47份登记文档，44份启用，3份旧入口停用；原始45份快照保留但不参与检索。
回答必须提供逐条原文，服务器检查引用及数字；检查失败只展示摘录，不自动重试模型。
这不是完整语义事实核验，不替代业务人工复核。新知识发布更新manifest及内容哈希。
本次执行本地36题检索回归和HTTP接口检查，未调用付费生成模型；后文“未执行测试”描述的是此前基础升级。
数据库和Embedding仍需要账号配置；员工/部门权限仍未实现。

## 本次范围

- LlamaIndex SentenceSplitter 对过长片段分块；自定义中文双字词 BM25。
- MarkItDown 解析 PDF、DOCX、XLSX、PPTX，文本文件直接读取；内容去重、来源和日期记录。
- PostgreSQL 保存上传资料、问答、任务；未配置时使用 web 根目录之外的 SQLite。
- 可选 OpenAI 兼容 Embedding 接口 + pgvector 精确余弦检索 + RRF 排名融合。未接重排模型。
- 检索实验室、共享工作空间历史同步、旧记录手动上传、RAG/FDE 手册与学习知识文档。
- 原聊天模型仍使用 AGNES 配置。不假定它具备 Embedding 接口。

## 免费方案准备

选择 Supabase Free + 现有 Render Free。已准备代码，不代表数据库账户已经创建。
截至 2026-10-12 官方价格页：免费数据库 500 MB，闲置一周后暂停，无自动备份。适合学习/试点，不能承诺企业 SLA。
参考：https://supabase.com/pricing

1. 用户在 https://supabase.com/dashboard 创建免费项目，注册条款与新数据库密码由用户本人完成。
2. SQL Editor 执行 `setup.sql` 开启 vector 扩展。
3. Connect 中复制 PostgreSQL Session pooler 连接信息（对 IPv4 环境更适合），正确 URL 编码密码，并使用 TLS。连接信息只存 Render 环境变量。
4. Render 的知识助手服务增加 `DATABASE_URL`，不要放进前端、Git、聊天或截图。使用专用数据库/应用角色。建议连接串包含 `sslmode=require`，生产环境按企业要求验证 CA。
5. 重新部署后程序在 `rag_private` schema 建表，该 schema 不应加入 Supabase Data API exposed schemas。浏览器通过本应用后端读写，不需要 Supabase service_role key。
6. 历史页显示 PostgreSQL 后，点击“上传本机旧记录”；每次最多 100 条。导入的资料和历史为同一个共享工作空间，持有密码的人均可查看。

官方连接说明：https://supabase.com/docs/guides/database/connecting-to-postgres
pgvector：https://supabase.com/docs/guides/database/extensions/pgvector

## 可选语义检索

在 Render 设置以下三个变量，三者缺一时仅启用 BM25：

| 变量 | 值 |
| --- | --- |
| RAG_EMBEDDING_URL | 服务商完整 HTTPS embeddings 端点，例如以 `/v1/embeddings` 结尾；不在代码里猜测服务商 |
| RAG_EMBEDDING_MODEL | 实际可用、支持中文的 embedding 模型名称 |
| RAG_EMBEDDING_API_KEY | 该服务商的密钥，仅后端环境变量 |

首次点击“建立／更新语义索引”会向供应商发送知识片段并产生接口调用。新增或修改资料后重新建立，未变片段按内容与模型指纹复用。更换模型/接口需重建。
已配置不等于已可用：索引完成后才使用混合检索；失败时页面说明降级。RRF 分数不是置信度。
当前 pgvector 使用精确检索，未建 HNSW，面向小规模资料。大规模需要固定维度、索引迁移、分区和性能评估。

## Render 设置

- Root Directory：`enterprise-rag-assistant`
- Build：`pip install -r requirements.txt`
- Start：`python rag_server.py`
- 推荐 Python 3.12；核心依赖支持 Python >=3.10，MarkItDown 当前要求 <3.15。
- 保留现有 `AGNES_API_KEY`、`AGNES_MODEL`、`RAG_ACCESS_PASSWORD`、`RAG_ALLOW_EXTERNAL=1`。
- 单进程单实例部署；本版启动时会标记遗留运行任务为中断，不自动重复收费重试。
- 未配置 DATABASE_URL 时，Render 本地 SQLite 仍会丢失，因此页面禁用文件导入并显示明确提示。
- DATABASE_URL 已配置但失效时启动报错，不静默切换临时库，防止用户误以为记录仍在云端。

## 本次尚不具备的企业能力

共享密码不是员工登录；没有部门 ACL、多租户、审批引擎、自动执行工具、分布式任务队列、自动备份或定时知识更新。
任务可保存结果和中断状态，但服务重启后不继续模型执行。历史页面显示最近 1000 条，浏览器缓存 100 条；数据库记录没有自动删除策略，需要按企业要求建立保留与删除流程。
原上传文件不保留，只保存解析后文本与元数据；复杂表格/OCR 需另行处理。解析子进程有超时和大小限制，但不是企业级沙箱。
资料仍需人工审核；上传相同文件按哈希去重，不自动覆盖旧版本。当前没有文档版本审批和删除 UI。

## 发布与回滚

发布前保留现有浏览器问答备份与环境配置。Git 变更只涉及 enterprise-rag-assistant。
回滚应用时可回到上一提交；数据库 schema 为本次新建，不需要删除旧数据。不要在回滚时清空数据库。
正式验收应覆盖：权限、导入质量、检索命中、引用支持、跨浏览器历史、重启中断状态、备份恢复、延迟和成本。
本次未执行自动化测试或付费模型调用；数据库及 Embedding 未配置的部分不标记为验收通过。
