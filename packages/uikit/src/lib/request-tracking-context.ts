import { createContext } from "react";

export type RequestTrackingValue = {
  provider: string;
  method: string;
  requestTimestamp: number;
  responseTimestamp?: number;
  responseStatus?: number;
};

export const RequestTrackingContext = createContext({
  logs: new Map<string, RequestTrackingValue>(),
  clearLogs: () => {},
});
