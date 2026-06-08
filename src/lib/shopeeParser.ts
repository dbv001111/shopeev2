/**
 * shopeeParser.ts — Multi-strategy Shopee product data extractor.
 *
 * Shopee protects its API endpoints with Cloudflare WAF, which blocks
 * datacenter IPs (including all Vercel/AWS regions). This module uses
 * a cascading fallback chain to maximize extraction success:
 *
 *   Strategy 1 → Shopee API v4 with enhanced Chrome-like headers + cookie
 *   Strategy 2 → HTML page scraping (meta tags + JSON-LD structured data)
 *   Strategy 3 → Shopee API v2 (legacy, sometimes less protected)
 *
 * If all strategies fail, a descriptive error guides the admin to
 * configure the SHOPEE_COOKIE environment variable.
 */

export interface ShopeeProductDetails {
  itemid: string;
  shopid: string;
  name: string;
  image: string; // full CDN URL
  current_price: number;
  original_url: string;
}

// ---------------------------------------------------------------------------
// Short URL resolver
// ---------------------------------------------------------------------------

/**
 * Resolves short mobile Shopee URLs (e.g. shope.ee) to long desktop URLs
 * by manually following HTTP 3xx redirect chains.
 */
export async function resolveShortUrl(url: string): Promise<string> {
  if (!url.includes("shope.ee") && !url.includes("shp.ee")) {
    return url;
  }

  let currentUrl = url;
  const maxRedirects = 5;

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });

      const location = response.headers.get("location");
      if (location) {
        currentUrl = new URL(location, currentUrl).toString();
      } else {
        break;
      }
    } catch (error) {
      console.error("Error resolving redirect:", error);
      break;
    }
  }

  return currentUrl;
}

// ---------------------------------------------------------------------------
// URL parser
// ---------------------------------------------------------------------------

/**
 * Extracts itemid and shopid from a standard Shopee URL.
 */
export function parseShopeeUrl(url: string): { shopid: string; itemid: string } | null {
  const decodedUrl = decodeURIComponent(url);

  // Format 1: shopee.vn/product/shopid/itemid
  const productMatch = decodedUrl.match(/\/product\/(\d+)\/(\d+)/);
  if (productMatch) {
    return { shopid: productMatch[1], itemid: productMatch[2] };
  }

  // Format 2: shopee.vn/something-i.shopid.itemid
  const iMatch = decodedUrl.match(/i\.(\d+)\.(\d+)/);
  if (iMatch) {
    return { shopid: iMatch[1], itemid: iMatch[2] };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds headers that closely mimic a real Chrome 131 session on Windows. */
function buildChromeHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const cookie = process.env.SHOPEE_COOKIE || "";

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    ...extra,
  };

  if (cookie) {
    headers["Cookie"] = cookie;
  }

  return headers;
}

/** Normalise a Shopee CDN image hash into a full URL. */
function toImageUrl(raw: string | undefined | null): string {
  if (!raw) return "https://placehold.co/300?text=No+Image";
  // Already a full URL (from HTML scraping)
  if (raw.startsWith("http")) return raw;
  // Raw hash from API — prepend CDN origin
  return `https://down-vn.img.sgh.io/api/v0/image/${raw}`;
}

// ---------------------------------------------------------------------------
// Strategy 1 — Shopee internal API v4 (native fetch, no axios)
// ---------------------------------------------------------------------------

async function fetchViaApiV4(
  shopid: string,
  itemid: string,
  originalUrl: string,
): Promise<ShopeeProductDetails> {
  const apiUrl = `https://shopee.vn/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;

  const headers = buildChromeHeaders({
    Accept: "application/json, text/plain, */*",
    Referer: `https://shopee.vn/product/${shopid}/${itemid}`,
    "X-Requested-With": "XMLHttpRequest",
    "X-API-SOURCE": "pc",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  });

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`API v4 → HTTP ${response.status}`);
  }

  const resData = await response.json();

  if (!resData || resData.error || !resData.data) {
    throw new Error(
      `API v4 → ${resData?.error_msg || resData?.error || "empty response"}`,
    );
  }

  const { name, image, price } = resData.data;

  return {
    itemid,
    shopid,
    name: name || "Shopee Product",
    image: toImageUrl(image),
    current_price: price ? price / 100000 : 0,
    original_url: originalUrl,
  };
}

// ---------------------------------------------------------------------------
// Strategy 2 — HTML page scraping (OG meta tags + JSON-LD)
// ---------------------------------------------------------------------------

async function fetchViaHtmlScraping(
  shopid: string,
  itemid: string,
  originalUrl: string,
): Promise<ShopeeProductDetails> {
  // Use the canonical product page URL
  const pageUrl = `https://shopee.vn/product/${shopid}/${itemid}`;

  const headers = buildChromeHeaders({
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "Upgrade-Insecure-Requests": "1",
  });

  const response = await fetch(pageUrl, {
    method: "GET",
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTML scraping → HTTP ${response.status}`);
  }

  const html = await response.text();

  // --- Extract product name ---
  const titleMatch =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);

  // --- Extract product image ---
  const imageMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

  // --- Extract price ---
  let price = 0;

  // Try JSON-LD structured data first (most reliable)
  const jsonLdBlocks = html.matchAll(
    /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of jsonLdBlocks) {
    try {
      const ld = JSON.parse(m[1]);
      const offers = ld?.offers;
      const offerPrice =
        (Array.isArray(offers) ? offers[0]?.price : offers?.price) ??
        (Array.isArray(offers) ? offers[0]?.lowPrice : offers?.lowPrice);
      if (offerPrice) {
        price = parseFloat(offerPrice);
        break;
      }
    } catch {
      /* malformed JSON-LD, skip */
    }
  }

  // Fallback: regex price patterns in embedded scripts
  if (!price) {
    // Pattern: "price":12345000 (raw VND × 100 000)
    const rawMatch = html.match(/"price"\s*:\s*(\d{6,})/);
    if (rawMatch) {
      const raw = parseInt(rawMatch[1], 10);
      price = raw >= 1_000_000 ? raw / 100000 : raw;
    }
  }

  // Fallback: "product:price:amount" meta tag
  if (!price) {
    const priceMetaMatch =
      html.match(/<meta\s+property=["']product:price:amount["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']product:price:amount["']/i);
    if (priceMetaMatch) {
      price = parseFloat(priceMetaMatch[1]);
    }
  }

  const name = titleMatch?.[1]?.replace(/ \| Shopee.*$/i, "") || "Shopee Product";
  const image = imageMatch?.[1] || "";

  // Require at least a name or image to consider the scrape successful
  if (!titleMatch && !imageMatch) {
    throw new Error("HTML scraping → could not extract product data from page");
  }

  return {
    itemid,
    shopid,
    name,
    image: toImageUrl(image),
    current_price: price,
    original_url: originalUrl,
  };
}

// ---------------------------------------------------------------------------
// Strategy 3 — Shopee API v2 (legacy endpoint, sometimes less guarded)
// ---------------------------------------------------------------------------

async function fetchViaApiV2(
  shopid: string,
  itemid: string,
  originalUrl: string,
): Promise<ShopeeProductDetails> {
  const apiUrl = `https://shopee.vn/api/v2/item/get?itemid=${itemid}&shopid=${shopid}`;

  const headers = buildChromeHeaders({
    Accept: "application/json, text/plain, */*",
    Referer: "https://shopee.vn/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  });

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`API v2 → HTTP ${response.status}`);
  }

  const resData = await response.json();
  const item = resData?.item;

  if (!item) {
    throw new Error(`API v2 → ${resData?.error_msg || "no item in response"}`);
  }

  const rawPrice = item.price ?? item.price_min ?? 0;

  return {
    itemid,
    shopid,
    name: item.name || "Shopee Product",
    image: toImageUrl(item.image),
    current_price: rawPrice ? rawPrice / 100000 : 0,
    original_url: originalUrl,
  };
}

// ---------------------------------------------------------------------------
// Public entry point — cascading fallback chain
// ---------------------------------------------------------------------------

/**
 * Fetches Shopee product details using a multi-strategy fallback approach.
 * Each strategy is tried in order; the first successful result is returned.
 */
export async function fetchShopeeProduct(
  shopid: string,
  itemid: string,
  originalUrl: string,
): Promise<ShopeeProductDetails> {
  const strategies = [
    { name: "API v4", fn: fetchViaApiV4 },
    { name: "HTML scraping", fn: fetchViaHtmlScraping },
    { name: "API v2", fn: fetchViaApiV2 },
  ];

  const errors: string[] = [];

  for (const strategy of strategies) {
    try {
      console.log(`[shopeeParser] Trying ${strategy.name}…`);
      const result = await strategy.fn(shopid, itemid, originalUrl);
      console.log(`[shopeeParser] ✓ ${strategy.name} succeeded`);
      return result;
    } catch (err: any) {
      const msg = `${strategy.name}: ${err.message}`;
      console.warn(`[shopeeParser] ✗ ${msg}`);
      errors.push(msg);
    }
  }

  // All strategies exhausted
  console.error("[shopeeParser] All strategies failed:", errors);
  throw new Error(
    "Không thể trích xuất dữ liệu sản phẩm Shopee. Tất cả chiến lược đều bị Cloudflare chặn. " +
      "Vui lòng thêm biến SHOPEE_COOKIE vào Vercel (Settings → Environment Variables) " +
      "với cookie từ trình duyệt khi truy cập shopee.vn. " +
      `Chi tiết lỗi: ${errors.join(" | ")}`,
  );
}
