export const sendPushNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.svg",
      ...options,
    });
  }
};
