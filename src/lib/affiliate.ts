/**
 * Helper to transform standard Shopee URLs into AccessTrade Deeplinks for affiliate earning.
 */
export function generateAffiliateUrl(originalUrl: string): string {
  // Clear any existing query params to ensure a clean redirect url
  const urlObj = new URL(originalUrl);
  
  // Clean URL to keep only necessary path parameters
  const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
  const encodedUrl = encodeURIComponent(cleanUrl);
  
  // AccessTrade Deeplink MVP template
  return `https://fast.accesstrade.com.vn/deep_link/6312458793215467890?url=${encodedUrl}`;
}
