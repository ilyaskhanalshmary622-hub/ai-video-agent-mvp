# MuseFrame

极简商品图生成工具。

## 本地运行

在项目根目录运行：

```powershell
$env:IMAGE_API_KEY="你的 Grsai API Key"
$env:IMAGE_MODEL="gpt-image-2.5"
$env:IMAGE_API_BASE_URL="https://grsaiapi.com"
python server.py
```

打开：

```text
http://127.0.0.1:8765/product-image-studio/
```

## 参数

- `IMAGE_API_KEY`：Grsai API Key。
- `IMAGE_MODEL`：默认 `gpt-image-2.5`，也可以换成 `gpt-image-2`、`gpt-image-2-vip` 等。
- `IMAGE_API_BASE_URL`：默认 `https://grsaiapi.com`，国内节点可填 `https://grsai.dakka.com.cn`。
