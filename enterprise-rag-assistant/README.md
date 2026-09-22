# RAG 知识库助手练习

这个案例用于练习企业 AI 助手的核心流程：

`用户问题 -> 检索本地知识库 -> 拼接 Prompt -> 调用 Agnes 模型 -> 基于资料生成答案`

## 1. 进入项目文件夹

在 PowerShell 里运行：

```powershell
cd C:\Users\PC\Documents\视频创作\rag_practice_case
```

## 2. 设置 Agnes API Key

不要把 API Key 发给别人，也不要写进代码文件。

如果你在 PowerShell 里运行：

```powershell
$env:AGNES_API_KEY="你的 Agnes API Key"
```

如果你在 CMD 黑窗口里运行：

```cmd
set AGNES_API_KEY=你的Agnes APIKey
```

## 3. 开启外部 API 安全开关

RAG 会把检索到的本地知识库片段发送给 Agnes API。当前项目是模拟练习资料，可以开启：

```powershell
$env:RAG_ALLOW_EXTERNAL="1"
```

CMD 黑窗口用：

```cmd
set RAG_ALLOW_EXTERNAL=1
```

如果以后换成真实公司资料，不要随便开启，除非公司允许。

## 4. 命令行测试

```powershell
python rag_demo_ai.py "CTR高但是CVR低，我应该先改素材还是落地页？"
```

你会看到三步：

1. 检索到哪些资料
2. 发送给 Agnes API
3. 模型基于知识库生成答案

## 5. 网页版测试

最省事的方式：右键 PowerShell 进入本文件夹，然后运行：

```powershell
.\start_rag_assistant.ps1
```

它会提示你输入 Agnes API Key，并自动开启练习资料外发开关。

手动方式：

```powershell
python rag_server.py
```

然后浏览器打开：

```text
http://127.0.0.1:8789/rag_ui.html
```

如果网页左侧显示“未配置 Key”，说明你不是用同一个 PowerShell 启动服务，或者启动前没有设置 `AGNES_API_KEY`。

## 6. 你要理解的重点

RAG 不是“把文件直接丢给 AI”。

RAG 是：

1. 把资料切成小块
2. 根据用户问题检索相关资料
3. 把相关资料塞进 Prompt
4. 让模型基于资料回答

这个练习用的是简化关键词检索。真实企业版通常会升级为：

- Embedding 向量化
- Vector DB 向量数据库
- 权限控制
- 日志审计
- 文件上传和自动切块
- 多轮对话记忆

## 8. 后面怎么换成真实企业资料

把真实资料整理成 Markdown 文件，放进 `knowledge` 文件夹，例如：

- `brand_sop.md`：品牌调性、禁用词、视觉规范
- `product_manual.md`：产品卖点、参数、适用场景、售后说明
- `ads_sop.md`：投放判断规则、预算动作、素材迭代规则
- `customer_faq.md`：客服高频问题和标准回复
- `weekly_review.md`：历史爆款、失败素材、复盘结论

真实公司资料注意权限，不要把保密资料发到外部 API，除非公司允许。

## 7. 这个能力在企业里的用途

- 产品知识库助手：让 AI 按产品文档回答，不乱编卖点。
- 投放 SOP 助手：让 AI 按公司投放规则给动作建议。
- 客服 FAQ 助手：让 AI 按统一口径回复客户。
- 素材复盘助手：把评论、CTR、CVR、素材表现变成下一轮创意建议。
