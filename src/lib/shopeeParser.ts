import axios from "axios";

export interface ShopeeProductDetails {
  itemid: string;
  shopid: string;
  name: string;
  image: string; // full CDN URL
  current_price: number;
  original_url: string;
}

/**
 * Resolves short mobile Shopee URLs (e.g. shope.ee) to long desktop URLs by following redirects.
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
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const location = response.headers.get("location");
      if (location) {
        // Resolve relative URL if needed
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

/**
 * Fetches Shopee product details from Shopee's internal endpoint.
 */
export async function fetchShopeeProduct(
  shopid: string,
  itemid: string,
  originalUrl: string
): Promise<ShopeeProductDetails> {
  const apiUrl = `https://shopee.vn/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://shopee.vn/",
    "Accept": "application/json",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  const getCookie = () => {
    return process.env.SHOPEE_COOKIE || "";
  };

  const cookie = getCookie();
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  try {
    const response = await axios.get(apiUrl, { headers, timeout: 10000 });
    const resData = response.data;

    if (!resData || resData.error || !resData.data) {
      const errMsg =
        resData?.error_msg ||
        resData?.error ||
        "Unknown error returned from Shopee API";
      throw new Error(`Shopee API error: ${errMsg}`);
    }

    const { name, image, price } = resData.data;

    // Shopee price is returned as VND multiplied by 100,000
    const normalizedPrice = price ? price / 100000 : 0;

    const imageUrl = image
      ? `https://down-vn.img.sgh.io/api/v0/image/${image}`
      : "https://placehold.co/300?text=No+Image";

    return {
      itemid,
      shopid,
      name: name || "Shopee Product",
      image: imageUrl,
      current_price: normalizedPrice,
      original_url: originalUrl,
    };
  } catch (error: any) {
    console.error(`Error fetching Shopee product (Shop: ${shopid}, Item: ${itemid}):`, error.message);
    
    if (error.response?.status === 403 || error.response?.status === 405) {
      if (!cookie) {
        console.warn(
          "Shopee API responded with 403/405 Forbidden. Please add a SHOPEE_COOKIE value inside your .env configuration."
        );
      }
    }
    throw error;
  }
}
