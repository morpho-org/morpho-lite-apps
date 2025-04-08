import { afterEach } from "vitest";
import { cleanup } from "vitest-browser-react";

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
