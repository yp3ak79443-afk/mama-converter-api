const AFFILIATE_ID = "16339760008";

const ALLOWED_HOSTS = new Set([
  "shopee.tw",
  "www.shopee.tw",
  "s.shopee.tw",
  "tw.shp.ee",
  "shp.ee"
]);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isAllowedShopeeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function makeAffiliateUrl(originalUrl) {
  const params = new URLSearchParams();
  params.set("origin_link", originalUrl);
  params.set("affiliate_id", AFFILIATE_ID);

  return `https://s.shopee.tw/an_redir?${params.toString()}`;
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
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
      const url = String(input || "").trim();

      if (!isAllowedShopeeUrl(url)) {
        return {
          success: false,
          originalUrl: url,
          error: "不是支援的 Shopee 台灣網址"
        };
      }

      return {
        success: true,
        originalUrl: url,
        shortLink: makeAffiliateUrl(url),
        affiliateId: AFFILIATE_ID
      };
    });

    return res.status(200).json({
      success: true,
      affiliateId: AFFILIATE_ID,
      results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "轉換失敗"
    });
  }
};
