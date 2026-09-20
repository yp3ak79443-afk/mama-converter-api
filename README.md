# 媽媽好難｜自己的 API 後端

這是一個 Vercel Serverless API。

## API

### POST /api/convert

Request:

```json
{
  "urls": [
    "https://tw.shp.ee/xxxxx",
    "https://tw.shp.ee/yyyyy"
  ]
}
```

Response:

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "shortLink": "https://s.shopee.tw/xxxxx",
      "index": 0
    }
  ]
}
```

## 部署

1. 把此資料夾放到 GitHub 新 repo，例如 `mama-converter-api`
2. 在 Vercel Import Project 匯入這個 repo
3. Deploy
4. Vercel Project → Settings → Environment Variables
5. 加入：

`ALLOWED_ORIGIN`
```text
https://yp3ak79443-afk.github.io
```

`UPSTREAM_API_URL`
```text
https://shopee-affiliate-api-five.vercel.app/api/convert
```

6. 重新部署

完成後你的 API 會是：

```text
https://你的-project.vercel.app/api/convert
```

然後把「媽媽好難」前端的 API_URL 改成你的新網址。

## 重要

這個版本已經是「你自己的 API 入口」，前端不再直接呼叫參考網站的 API。

但目前真正產生 Shopee 短連結的轉換核心仍然透過 `UPSTREAM_API_URL`。也就是說，這不是把第三方服務的技術或憑證偷出來，而是建立你自己的後端代理層。

如果未來取得 Shopee 官方 Affiliate API 的合法憑證，可以把 `api/convert.js` 的 upstream 部分換成 Shopee 官方 API，這樣就能完全移除第三方依賴。

## 安全

- 限制一次最多 5 個網址
- 驗證 Shopee 網域
- 前端不需要 API 金鑰
- CORS 預設只允許你的 GitHub Pages
- 不把上游完整回應直接透出
