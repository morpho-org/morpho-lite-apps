/// <reference lib="webworker" />
import { handleBorrowsCheck, handleMarketYieldCheck } from "./user-notifications/jobs";
import { runJob } from "./user-notifications/sw-handlers";
import type { SWMessage } from "./user-notifications/types";

declare const self: ServiceWorkerGlobalScope;

// Activate service worker immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const relativeUrl = (event.notification.data?.url as string) || "/";
  const absoluteUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clients) => {
        if (clients.length > 0) {
          void clients[0].focus();
          void clients[0].navigate(absoluteUrl);
        } else {
          void self.clients.openWindow(absoluteUrl);
        }
      }),
  );
});

// Message handler
self.addEventListener("message", async (event) => {
  const message = event.data as SWMessage;

  switch (message.type) {
    case "HEALTH_FACTOR":
      runJob("HEALTH_FACTOR", message.payload, handleBorrowsCheck, 5 * 60 * 1000);
      break;
    case "MARKET_YIELD":
      runJob("MARKET_YIELD", message.payload, handleMarketYieldCheck, 10 * 60 * 1000);
      break;
    default: {
      // This should never happen if all message types are handled
      const _exhaustive: never = message;
      console.warn(`Unknown message type: ${String(_exhaustive)}`);
      break;
    }
  }
});
