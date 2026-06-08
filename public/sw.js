self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon.png", // Fallback placeholder icon
        badge: "/badge.png",
        data: { url: data.targetUrl }
      })
    );
  } catch (error) {
    console.error("Error handling incoming push notification:", error);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
