import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    // Retrieve the 12 most recently updated products
    const products = await db.product.findMany({
      orderBy: {
        updated_at: "desc",
      },
      take: 12,
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Error fetching products list:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve products list." },
      { status: 500 }
    );
  }
}
