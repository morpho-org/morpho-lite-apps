import { useCallback } from "react";

import type { HealthFactor, JobPayload, JobType, MarketYield } from "@/user-notifications/types";

export function useUserNotifications() {
  const sendMessage = useCallback(async (message: { type: JobType; payload: JobPayload[] }) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage(message);
    } catch (error) {
      console.error(`Error sending message to service worker (${message.type}):`, error);
    }
  }, []);

  const monitorHealthFactor = useCallback(
    async (jobs: HealthFactor[]) => {
      await sendMessage({
        type: "HEALTH_FACTOR",
        payload: jobs,
      });
    },
    [sendMessage],
  );

  const monitorMarketYield = useCallback(
    async (jobs: MarketYield[]) => {
      await sendMessage({
        type: "MARKET_YIELD",
        payload: jobs,
      });
    },
    [sendMessage],
  );

  return {
    monitorHealthFactor,
    monitorMarketYield,
  };
}
