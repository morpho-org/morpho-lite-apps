/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_KIT_PROJECT_ID: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_ERPC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// PWA Install Prompt types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
