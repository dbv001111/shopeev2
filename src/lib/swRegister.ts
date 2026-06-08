/**
 * Helper to convert base64 VAPID public key to UInt8Array for push manager subscription
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Service Worker (/sw.js), prompts the user for notification permissions,
 * and retrieves or creates a Web Push subscription.
 */
export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.warn("Service workers or Push Notifications are not supported in this browser.");
    return null;
  }

  try {
    // 1. Register the service worker at the root scope
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    
    // 2. Wait for the service worker to become ready and active
    await navigator.serviceWorker.ready;

    // 3. Request native browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Push Notification permission was denied by the user.");
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error(
        "VAPID public key is missing from environment. Define NEXT_PUBLIC_VAPID_PUBLIC_KEY."
      );
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe the user via PushManager
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });
    }

    return subscription;
  } catch (error) {
    console.error("Error configuring push subscription in browser:", error);
    throw error;
  }
}
