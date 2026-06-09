import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { sendBrowserNotification } from "@/lib/webPush";
import { generateAffiliateUrl } from "@/lib/affiliate";

interface UpdatePricePayload {
  id: string;
  current_price: number;
  name?: string;
  image?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: UpdatePricePayload = await req.json();
    const { id, current_price, name, image } = body;

    if (!id || current_price === undefined) {
      return NextResponse.json(
        { error: "Missing product id or current_price" },
        { status: 400 }
      );
    }

    const newPrice = parseFloat(current_price as any);
    if (isNaN(newPrice)) {
      return NextResponse.json(
        { error: "current_price must be a valid number" },
        { status: 400 }
      );
    }

    // Fetch the product
    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const oldPrice = product.current_price;
    const priceChanged = oldPrice !== newPrice;

    if (priceChanged) {
      // Update product current_price
      await db.product.update({
        where: { id: product.id },
        data: {
          current_price: newPrice,
          ...(name ? { name } : {}),
          ...(image ? { image } : {}),
        },
      });

      // Log to PriceHistory
      await db.priceHistory.create({
        data: {
          product_id: product.id,
          price: newPrice,
        },
      });
    }

    // Process matched alerts
    const matchedAlerts = await db.alertRequest.findMany({
      where: {
        product_id: product.id,
        is_triggered: false,
        target_price: {
          gte: newPrice,
        },
      },
    });

    const alertResults = [];

    for (const alert of matchedAlerts) {
      const affiliateUrl = generateAffiliateUrl(product.original_url);
      const formattedNewPrice = newPrice.toLocaleString("vi-VN");
      const formattedOldPrice = oldPrice.toLocaleString("vi-VN");
      const formattedTargetPrice = alert.target_price.toLocaleString("vi-VN");

      const title = "🚨 GIÁ GIẢM SỐC!";
      const bodyText = `Sản phẩm "${
        name || product.name
      }" đã giảm từ ${formattedOldPrice}₫ xuống còn ${formattedNewPrice}₫ (Mục tiêu của bạn: ${formattedTargetPrice}₫). Nhấp để mua ngay!`;

      try {
        await sendBrowserNotification(
          alert.subscription_json,
          title,
          bodyText,
          affiliateUrl
        );

        // Verify if alert was deleted by standard cleanup inside sendBrowserNotification
        const alertExists = await db.alertRequest.findUnique({
          where: { id: alert.id },
        });

        if (alertExists) {
          await db.alertRequest.update({
            where: { id: alert.id },
            data: { is_triggered: true },
          });
          alertResults.push({ alertId: alert.id, status: "triggered" });
        } else {
          alertResults.push({ alertId: alert.id, status: "expired_deleted" });
        }
      } catch (err: any) {
        console.error(`Failed to send push alert ${alert.id}:`, err);
        alertResults.push({ alertId: alert.id, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      priceChanged,
      oldPrice,
      newPrice,
      alertsProcessed: matchedAlerts.length,
      alertResults,
    });
  } catch (error: any) {
    console.error("Error in /api/products/update-price:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product price." },
      { status: 500 }
    );
  }
}
