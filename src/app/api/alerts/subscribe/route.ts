import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, targetPrice, subscription } = body;

    if (!productId || targetPrice === undefined || !subscription) {
      return NextResponse.json(
        {
          error: "Missing required fields: productId, targetPrice, subscription.",
        },
        { status: 400 }
      );
    }

    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum)) {
      return NextResponse.json(
        { error: "targetPrice must be a valid numeric value." },
        { status: 400 }
      );
    }

    // 1. Verify that the product is tracked in the database
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found. Please track the product first." },
        { status: 404 }
      );
    }

    const subscriptionJson = JSON.stringify(subscription);

    // 2. Check for an existing subscription alert for this product & user browser combination
    const existingAlert = await db.alertRequest.findFirst({
      where: {
        product_id: productId,
        subscription_json: subscriptionJson,
      },
    });

    let alert;
    if (existingAlert) {
      // Update target price and reset trigger state
      alert = await db.alertRequest.update({
        where: { id: existingAlert.id },
        data: {
          target_price: priceNum,
          is_triggered: false,
        },
      });
    } else {
      // Create new alert request
      alert = await db.alertRequest.create({
        data: {
          product_id: productId,
          subscription_json: subscriptionJson,
          target_price: priceNum,
          is_triggered: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: alert,
    });
  } catch (error: any) {
    console.error("Error in /api/alerts/subscribe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription alert." },
      { status: 500 }
    );
  }
}
