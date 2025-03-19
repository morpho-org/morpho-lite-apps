import { FleekConfig } from "@fleek-platform/cli";

export default {
  sites: [
    {
      slug: "morpho-fallback-app",
      distDir: "dist",
      buildCommand: "pnpm run build",
    },
  ],
} satisfies FleekConfig;
