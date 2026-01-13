/// <reference lib="webworker" />
import { handleHealthFactor } from "./user-notifications/jobs/health-factor";
import { handleMarketYieldCheck } from "./user-notifications/jobs/market-yield";
import { runJob } from "./user-notifications/sw-handlers";
import type { HealthFactor, MarketYield, SWMessage } from "./user-notifications/types";

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
      runJob("HEALTH_FACTOR", message.payload as HealthFactor[], handleHealthFactor, 30 * 1000);
      break;
    case "MARKET_YIELD":
      runJob("MARKET_YIELD", message.payload as MarketYield[], handleMarketYieldCheck, 30 * 1000);
      break;
    default: {
      // This should never happen if all message types are handled
      const _exhaustive: never = message;
      console.warn(`Unknown message type: ${String(_exhaustive)}`);
      break;
    }
  }
});
