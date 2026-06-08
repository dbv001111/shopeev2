import webpush from "web-push";
import db from "./db";

let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
let privateKey = process.env.VAPID_PRIVATE_KEY || "";

// Ensure VAPID keys are generated during development if they are not in the environment
if (!publicKey || !privateKey) {
  console.warn("VAPID keys not configured in environment. Generating temporary development keys...");
  const tempKeys = webpush.generateVAPIDKeys();
  publicKey = tempKeys.publicKey;
  privateKey = tempKeys.privateKey;
  console.log("\n=================== DEVELOPMENT VAPID KEYS ===================");
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${privateKey}"`);
  console.log("==============================================================\n");
}

// Register VAPID details exactly per specifications
webpush.setVapidDetails("mailto:your-email@example.com", publicKey, privateKey);

export { publicKey as vapidPublicKey };

/**
 * Sends a native browser push notification to the client.
 * Automatically handles expired/unsubscribed browser sessions by deleting the AlertRequest.
 */
export async function sendBrowserNotification(
  subscriptionJson: string,
  title: string,
  body: string,
  targetUrl: string
): Promise<void> {
  try {
    const subscription = JSON.parse(subscriptionJson);
    const payload = JSON.stringify({ title, body, targetUrl });
    await webpush.sendNotification(subscription, payload);
  } catch (error: any) {
    console.error("Error executing Web Push:", error.message || error);
    
    // Check if subscription has been revoked or has expired (410 Gone / 404 Not Found)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log("Browser push subscription has expired/been revoked. Deleting associated AlertRequest from database.");
      try {
        await db.alertRequest.deleteMany({
          where: {
            subscription_json: subscriptionJson,
          },
        });
      } catch (dbError) {
        console.error("Failed to delete stale alert subscription from database:", dbError);
      }
    }
  }
}
