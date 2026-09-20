const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ||
  "https://yp3ak79443-afk.github.io";

const UPSTREAM_API_URL =
  process.env.UPSTREAM_API_URL ||
  "https://shopee-affiliate-api-five.vercel.app/api/convert";

const ALLOWED_HOSTS = new Set([
  "shopee.tw",
  "www.shopee.tw",
  "s.shopee.tw",
  "tw.shp.ee"
]);

function setCors(res, origin) {
  const allowed =
    origin === ALLOWED_ORIGIN ||
    origin === "http://localhost:3000";

  res.setHeader(
    "Access-Control-Allow-Origin",
    allowed ? origin : ALLOWED_ORIGIN
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader("Vary", "Origin");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function sendJson(res, status, data, origin) {
  setCors(res, origin);
  res.status(status).json(data);
}

function isShopeeUrl(value) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      ALLOWED_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";

  // CORS 預檢
  if (req.method === "OPTIONS") {
    setCors(res, origin);
    return res.status(204).end();
  }

  // 只接受 POST
  if (req.method !== "POST") {
    return sendJson(
      res,
      405,
      {
        success: false,
        message: "Method Not Allowed"
      },
      origin
    );
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const urls = Array.isArray(body?.urls)
      ? body.urls
          .map((url) => String(url).trim())
          .filter(Boolean)
      : [];

    // 沒有網址
    if (urls.length === 0) {
      return sendJson(
        res,
        400,
        {
          success: false,
          message: "請提供 urls。"
        },
        origin
      );
    }

    // 最多 5 個
    if (urls.length > 5) {
      return sendJson(
        res,
        400,
        {
          success: false,
          message: "一次最多只能轉換 5 個網址。"
        },
        origin
      );
    }

    // 驗證蝦皮網址
    const invalidUrl = urls.find(
      (url) => !isShopeeUrl(url)
    );

    if (invalidUrl) {
      return sendJson(
        res,
        400,
        {
          success: false,
          message: "包含不支援的蝦皮網址。",
          invalidUrl
        },
        origin
      );
    }

    // 呼叫轉換服務
    const upstreamResponse = await fetch(
      UPSTREAM_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          urls
        })
      }
    );

    const text = await upstreamResponse.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!upstreamResponse.ok) {
      return sendJson(
        res,
        502,
        {
          success: false,
          message: "上游轉換服務回應錯誤。",
          upstreamStatus: upstreamResponse.status
        },
        origin
      );
    }

    if (
      !data ||
      data.success !== true ||
      !Array.isArray(data.results)
    ) {
      return sendJson(
        res,
        502,
        {
          success: false,
          message: "上游轉換服務回傳格式異常。"
        },
        origin
      );
    }

    // 整理回傳結果
    const results = data.results.map(
      (item, index) => ({
        success: item?.success === true,
        shortLink:
          item?.success &&
          typeof item.shortLink === "string"
            ? item.shortLink
            : null,
        index
      })
    );

    return sendJson(
      res,
      200,
      {
        success: true,
        results
      },
      origin
    );

  } catch (error) {
    console.error(error);

    return sendJson(
      res,
      500,
      {
        success: false,
        message: "伺服器處理失敗。"
      },
      origin
    );
  }
};
