import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { get, set } from "idb-keyval";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any;

cleanupOutdatedCaches();
// @ts-expect-error injected by workbox at build time
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

sw.addEventListener("message", (e: MessageEvent) => {
  if (e.data?.type === "SKIP_WAITING") sw.skipWaiting();
});

function key(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function maybeNudge() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = await get("window-state");
  if (!s?.settings?.nudge) return;
  const now = new Date();
  if (now.getHours() < s.settings.nudgeHour) return;
  const today = key(now);
  if ((await get("window-nudged")) === today) return;
  const d = s.days?.[today];
  if (d && (d.burn != null || d.steps != null || d.sleep != null || d.strength)) return;
  await set("window-nudged", today);
  await sw.registration.showNotification("Window", {
    body: "Evening check-in: log today's burn, steps and sleep.",
    icon: "pwa-192.png",
    badge: "badge-96.png",
    tag: "log-nudge",
  });
}

sw.addEventListener("periodicsync", (e: { tag: string; waitUntil(p: Promise<unknown>): void }) => {
  if (e.tag === "log-nudge") e.waitUntil(maybeNudge());
});

sw.addEventListener("notificationclick", (e: { notification: Notification; waitUntil(p: Promise<unknown>): void }) => {
  e.notification.close();
  e.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((cs: { focus(): Promise<unknown> }[]) =>
      cs.length ? cs[0].focus() : sw.clients.openWindow("./"),
    ),
  );
});
