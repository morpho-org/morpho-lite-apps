/// <reference lib="webworker" />
import type { JobPayload, JobType } from "./types";

declare const self: ServiceWorkerGlobalScope;

// Unified job state: Map<JobType, { payload: JobPayload[], intervalId: number | null }>
const jobs = new Map<
  JobType,
  {
    payload: JobPayload[];
    intervalId: number | null;
  }
>();

// Run a job - FE is source of truth, always updates payload
export function runJob(
  jobType: JobType,
  payload: JobPayload[],
  handler: (values: JobPayload[]) => Promise<void>,
  frequency: number,
): void {
  const existingJob = jobs.get(jobType);

  // Update payload (FE is source of truth)
  if (existingJob) {
    existingJob.payload = payload;
  } else {
    jobs.set(jobType, { payload, intervalId: null });
  }

  const job = jobs.get(jobType)!;

  // Stop cron only if payload is empty
  if (payload.length === 0) {
    if (job.intervalId !== null) {
      clearInterval(job.intervalId);
      job.intervalId = null;
    }
    return;
  }

  // Execute handler immediately when payload is updated
  void handler(job.payload);

  // Start cron only if not already running
  if (job.intervalId === null) {
    const intervalId = setInterval(async () => {
      const currentJob = jobs.get(jobType);
      if (currentJob && currentJob.payload.length > 0) {
        await handler(currentJob.payload);
      }
    }, frequency) as unknown as number;

    job.intervalId = intervalId;
  }
}

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
