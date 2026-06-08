import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { generateAffiliateUrl } from "@/lib/affiliate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 1. Fetch the corresponding product from the database
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    // 2. If not found, redirect back to home
    if (!product || !product.original_url) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Transform the original_url into the AccessTrade deep link format
    const affiliateUrl = generateAffiliateUrl(product.original_url);

    // 4. Perform a strict HTTP 302 redirect to the generated affiliate link
    return NextResponse.redirect(affiliateUrl, 302);
  } catch (error) {
    console.error("Redirect API error:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
