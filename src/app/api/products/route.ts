import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    // Retrieve the 12 most recently updated products for the current user, or anonymous products
    const products = await db.product.findMany({
      where: {
        userId: session ? session.userId : null,
      },
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
