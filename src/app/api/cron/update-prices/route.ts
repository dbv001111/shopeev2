import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { fetchShopeeProduct } from "@/lib/shopeeParser";
import { sendBrowserNotification } from "@/lib/webPush";
import { generateAffiliateUrl } from "@/lib/affiliate";

export async function GET(req: NextRequest) {
  // Security Check: Validate header or query parameters
  const cronSecret = process.env.CRON_SECRET || "local_secret";
  const authHeader = req.headers.get("authorization");
  const searchParams = req.nextUrl.searchParams;
  const urlSecret = searchParams.get("secret");

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` || urlSecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any[] = [];

  try {
    // 0. Prune price history records older than 180 days to prevent Aiven 5GB overflow
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 180);

    const pruned = await db.priceHistory.deleteMany({
      where: {
        recorded_at: {
          lt: cutOffDate,
        },
      },
    });

    if (pruned.count > 0) {
      console.log(`Pruned ${pruned.count} stale PriceHistory records older than 180 days.`);
    }

    // 1. Fetch all products from the database
    const products = await db.product.findMany();

    // 2. Wrap the processing loop for each individual product inside a try/catch block
    for (const product of products) {
      try {
        // 3. Call Shopee extraction utility
        const freshDetails = await fetchShopeeProduct(
          product.shopid,
          product.itemid,
          product.original_url
        );

        const newPrice = freshDetails.current_price;
        const oldPrice = product.current_price;
        const priceChanged = oldPrice !== newPrice;

        // 4. If the fetched price is different from current_price
        if (priceChanged) {
          // Update current_price in the Product table
          await db.product.update({
            where: { id: product.id },
            data: {
              current_price: newPrice,
              name: freshDetails.name, // keep metadata updated
              image: freshDetails.image,
            },
          });

          // Add a new record to PriceHistory
          await db.priceHistory.create({
            data: {
              product_id: product.id,
              price: newPrice,
            },
          });
        }

        // 5. Query the AlertRequest table for matched alerts
        const matchedAlerts = await db.alertRequest.findMany({
          where: {
            product_id: product.id,
            is_triggered: false,
            target_price: {
              gte: newPrice, // newly fetched price is <= target_price
            },
          },
        });

        const alertResults: any[] = [];

        for (const alert of matchedAlerts) {
          // 6. Generate the AccessTrade affiliate link format
          const affiliateUrl = generateAffiliateUrl(product.original_url);

          // 7. Format details and trigger notification
          const formattedNewPrice = newPrice.toLocaleString("vi-VN");
          const formattedOldPrice = oldPrice.toLocaleString("vi-VN");
          const formattedTargetPrice = alert.target_price.toLocaleString("vi-VN");

          const title = "🚨 GIÁ GIẢM SỐC!";
          const body = `Sản phẩm "${
            product.name
          }" đã giảm từ ${formattedOldPrice}₫ xuống còn ${formattedNewPrice}₫ (Mục tiêu của bạn: ${formattedTargetPrice}₫). Nhấp để mua ngay!`;

          await sendBrowserNotification(
            alert.subscription_json,
            title,
            body,
            affiliateUrl
          );

          // 8. Verify if alert was deleted by the 410/404 database hook inside sendBrowserNotification
          const alertExists = await db.alertRequest.findUnique({
            where: { id: alert.id },
          });

          if (alertExists) {
            // Set is_triggered = true for that alert record
            await db.alertRequest.update({
              where: { id: alert.id },
              data: { is_triggered: true },
            });
            alertResults.push({ alertId: alert.id, status: "triggered" });
          } else {
            alertResults.push({ alertId: alert.id, status: "expired_deleted" });
          }
        }

        results.push({
          productId: product.id,
          name: product.name,
          oldPrice,
          newPrice,
          priceChanged,
          alertsProcessed: matchedAlerts.length,
          alertResults,
        });
      } catch (prodError: any) {
        // Individual product timeout/failure won't crash the loop
        console.error(`Cron error on product ${product.id}:`, prodError.message);
        results.push({
          productId: product.id,
          name: product.name,
          error: prodError.message || "Failed to fetch or process product update",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: products.length,
      results,
    });
  } catch (error: any) {
    console.error("Critical error in cron price updater:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run cron update process." },
      { status: 500 }
    );
  }
}
