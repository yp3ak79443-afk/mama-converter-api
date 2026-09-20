// 媽媽好難｜自己的 Vercel API
// POST /api/convert
//
// Request:
// { "urls": ["https://tw.shp.ee/xxxxx", "..."] }
//
// Response:
// {
//   "success": true,
//   "results": [
//     { "success": true, "shortLink": "https://s.shopee.tw/xxxxx" }
//   ]
// }
//
// 目前轉換核心透過 UPSTREAM_API_URL。
// 之後若取得 Shopee 官方 API，可只替換這裡的 upstream 呼叫。

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://yp3ak79443-afk.github.io";
const UPSTREAM_API_URL =
  process.env.UPSTREAM_API_URL ||
  "https://shopee-affiliate-api-five.vercel.app/api/convert";

const ALLOWED_HOSTS = new Set([
  "shopee.tw",
  "www.shopee.tw",
  "s.shopee.tw",
  "tw.shp.ee"
]);

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin === "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(res, status, body, origin) {
  return res.status(status).setHeaders(corsHeaders(origin)).json(body);
}

function isShopeeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    return res.status(204).setHeaders(corsHeaders(origin)).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, {
      success: false,
      message: "Method Not Allowed"
    }, origin);
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const urls = Array.isArray(body?.urls)
      ? body.urls.map(v => String(v).trim()).filter(Boolean)
      : [];

    if (!urls.length) {
      return json(res, 400, {
        success: false,
        message: "請提供 urls。"
      }, origin);
    }

    if (urls.length > 5) {
      return json(res, 400, {
        success: false,
        message: "一次最多只能轉換 5 個網址。"
      }, origin);
    }

    const invalid = urls.find(u => !isShopeeUrl(u));
    if (invalid) {
      return json(res, 400, {
        success: false,
        message: "包含不支援的蝦皮網址。",
        invalidUrl: invalid
      }, origin);
    }

    const upstream = await fetch(UPSTREAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ urls })
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!upstream.ok) {
      return json(res, 502, {
        success: false,
        message: "上游轉換服務回應錯誤。",
        upstreamStatus: upstream.status
      }, origin);
    }

    if (!data || data.success !== true || !Array.isArray(data.results)) {
      return json(res, 502, {
        success: false,
        message: "上游轉換服務回傳格式異常。"
      }, origin);
    }

    // 只回傳前端真正需要的欄位，不把上游其他資料直接透出。
    const results = data.results.map((item, index) => ({
      success: item?.success === true,
      shortLink: item?.success && typeof item.shortLink === "string"
        ? item.shortLink
        : null,
      index
    }));

    return json(res, 200, {
      success: true,
      results
    }, origin);

  } catch (err) {
    console.error(err);
    return json(res, 500, {
      success: false,
      message: "伺服器處理失敗。"
    }, origin);
  }
}
