/// <reference types="vitest/config" />
import path from "path";

import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svgr(),
    tailwindcss(),
    react(),
    legacy({ targets: ["defaults", "not IE 11"], modernPolyfills: ["es.array.iterator"] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["./test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/global-setup.ts"],
  },
});
