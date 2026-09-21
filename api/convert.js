const AFFILIATE_ID = "16339760008";

const ALLOWED_HOSTS = new Set([
  "shopee.tw",
  "www.shopee.tw",
  "s.shopee.tw",
  "tw.shp.ee",
  "shp.ee"
]);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isShopeeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function makeAffiliateUrl(originalUrl) {
  const params = new URLSearchParams({
    origin_link: originalUrl,
    affiliate_id: AFFILIATE_ID
  });
  return `https://s.shopee.tw/an_redir?${params.toString()}`;
}

module.exports = (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : (req.body || {});

    const urls = Array.isArray(body.urls) ? body.urls : [];

    if (urls.length < 1 || urls.length > 5) {
      return res.status(400).json({
        success: false,
        error: "一次請提供 1～5 個蝦皮網址"
      });
    }

    const results = urls.map((input) => {
      const originalUrl = String(input || "").trim();

      if (!isShopeeUrl(originalUrl)) {
        return {
          success: false,
          originalUrl,
          error: "不是支援的 Shopee 台灣網址"
        };
      }

      return {
        success: true,
        originalUrl,
        shortLink: makeAffiliateUrl(originalUrl),
        affiliateId: AFFILIATE_ID
      };
    });

    return res.status(200).json({
      success: true,
      affiliateId: AFFILIATE_ID,
      results
    });
  } catch {
    return res.status(400).json({
      success: false,
      error: "JSON 格式錯誤"
    });
  }
};
