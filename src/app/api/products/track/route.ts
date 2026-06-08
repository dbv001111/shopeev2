import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

interface TrackPayload {
  url: string;
  itemid: string;
  shopid: string;
  name: string;
  image: string;
  current_price: number;
  target_price: number;
  subscription: any; // The PushSubscription object from frontend
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const activeUserId = session?.userId || null;

    const body: TrackPayload = await req.json();
    const {
      url,
      itemid,
      shopid,
      name,
      image,
      current_price,
      target_price,
      subscription,
    } = body;

    // Validate request body
    if (
      !url ||
      !itemid ||
      !shopid ||
      !name ||
      current_price === undefined ||
      target_price === undefined ||
      !subscription
    ) {
      return NextResponse.json(
        { error: "Missing required fields in payload." },
        { status: 400 }
      );
    }

    const priceNum = parseFloat(current_price as any);
    const targetPriceNum = parseFloat(target_price as any);

    if (isNaN(priceNum) || isNaN(targetPriceNum)) {
      return NextResponse.json(
        { error: "current_price and target_price must be valid numbers." },
        { status: 400 }
      );
    }

    // 1. Check if the product matches an existing entry in the Product table via itemid and shopid.
    let product = await db.product.findFirst({
      where: {
        itemid: String(itemid),
        shopid: String(shopid),
      },
    });

    if (!product) {
      // 2. If missing, insert a new Product and immediately log an initial record into the PriceHistory table.
      product = await db.product.create({
        data: {
          itemid: String(itemid),
          shopid: String(shopid),
          name: String(name),
          image: String(image || ""),
          original_url: String(url),
          current_price: priceNum,
          userId: activeUserId,
        },
      });

      await db.priceHistory.create({
        data: {
          product_id: product.id,
          price: priceNum,
        },
      });
    } else {
      // 3. If present, update current_price and updated_at, and claim ownership if product has none.
      product = await db.product.update({
        where: { id: product.id },
        data: {
          current_price: priceNum,
          name: String(name),
          image: String(image || product.image),
          ...(activeUserId && !product.userId ? { userId: activeUserId } : {}),
        },
      });
    }

    // 4. Insert a new row into the AlertRequest table, converting the subscription object to a string
    const subscriptionJson = JSON.stringify(subscription);
    const alert = await db.alertRequest.create({
      data: {
        product_id: product.id,
        subscription_json: subscriptionJson,
        target_price: targetPriceNum,
        is_triggered: false,
      },
    });

    return NextResponse.json({
      success: true,
      product,
      alert,
    });
  } catch (error: any) {
    console.error("Error inside tracking endpoint /api/products/track:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track product and set alert." },
      { status: 500 }
    );
  }
}
