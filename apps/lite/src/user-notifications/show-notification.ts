/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

export async function showNotification(
  title: string,
  body: string,
  options?: { tag?: string; requireInteraction?: boolean; url?: string },
): Promise<void> {
  await self.registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: options?.tag || "morpho-notification",
    requireInteraction: options?.requireInteraction || false,
    data: { url: options?.url || "/" },
  });
}
