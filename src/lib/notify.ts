/** Ask for notification permission and register the evening check (Chrome on Android, installed app). */
export async function enableNudges(): Promise<string> {
  if (!("Notification" in window)) return "In-app reminder on. This browser can't show notifications.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "In-app reminder on. Notifications are blocked for this site.";
  try {
    const reg = await navigator.serviceWorker?.ready;
    const ps = (reg as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void> } })?.periodicSync;
    if (!ps) return "In-app reminder on. Install the app to your home screen for notifications.";
    await ps.register("log-nudge", { minInterval: 60 * 60 * 1000 });
    return "Reminder on. Notifications will come from the installed app.";
  } catch {
    return "In-app reminder on. Install the app to your home screen for notifications.";
  }
}
