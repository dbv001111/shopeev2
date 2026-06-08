export const preferredRegion = ['sin1'];
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { resolveShortUrl, parseShopeeUrl, fetchShopeeProduct } from "@/lib/shopeeParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid Shopee URL is required." },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // 1. Resolve short links (e.g. shope.ee)
    const resolvedUrl = await resolveShortUrl(trimmedUrl);

    // 2. Parse shopid and itemid
    const parsed = parseShopeeUrl(resolvedUrl);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Could not extract Shopee Product ID or Shop ID from the URL. Please verify the link format.",
        },
        { status: 400 }
      );
    }

    const { shopid, itemid } = parsed;

    // 3. Fetch raw product data using Shopee internal APIs
    const details = await fetchShopeeProduct(shopid, itemid, resolvedUrl);

    return NextResponse.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    console.error("Extraction error in /api/products/extract:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to extract product details from Shopee.",
      },
      { status: 500 }
    );
  }
}
