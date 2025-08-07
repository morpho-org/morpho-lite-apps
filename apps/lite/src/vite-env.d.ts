/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_KIT_PROJECT_ID: string;
  readonly VITE_ALCHEMY_API_KEY: string;
  readonly VITE_ANKR_API_KEY: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_KATANA_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
