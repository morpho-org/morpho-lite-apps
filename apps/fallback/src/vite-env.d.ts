/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_KIT_PROJECT_ID: string;
  readonly VITE_IS_IPFS_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
