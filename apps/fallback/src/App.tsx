import { AddressScreeningModal } from "@morpho-org/uikit/components/address-screening-modal";
import { AddressScreeningProvider } from "@morpho-org/uikit/hooks/use-address-screening";
import { RequestTrackingProvider } from "@morpho-org/uikit/hooks/use-request-tracking";
import { cyrb64Hash } from "@morpho-org/uikit/lib/cyrb64";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { HttpTransportConfig } from "viem";
import {
  createConfig,
  deserialize,
  fallback,
  http,
  injected,
  serialize,
  type Transport,
  unstable_connector,
  WagmiProvider,
} from "wagmi";
import {
  arbitrum,
  base,
  corn,
  fraxtal,
  hemi,
  ink,
  mainnet,
  mode as modeMainnet,
  optimism,
  plumeMainnet,
  polygon,
  scroll as scrollMainnet,
  sonic,
  unichain,
  worldchain,
} from "wagmi/chains";
import { walletConnect } from "wagmi/connectors";

import DashboardPage from "@/app/dashboard/page";

const httpConfig: HttpTransportConfig = {
  retryDelay: 0,
  timeout: 30_000,
};

function createFallbackTransport(rpcs: { url: string; batch: HttpTransportConfig["batch"] }[]) {
  return fallback(
    [
      ...rpcs.map((rpc) => http(rpc.url, { ...httpConfig, batch: rpc.batch })),
      unstable_connector(injected, { key: "injected", name: "Injected", retryCount: 0 }),
    ],
    { retryCount: 6, retryDelay: 100 },
  );
}

const chains = [
  mainnet,
  base,
  ink,
  optimism,
  arbitrum,
  polygon,
  unichain,
  plumeMainnet,
  worldchain,
  scrollMainnet,
  fraxtal,
  sonic,
  corn,
  modeMainnet,
  hemi,
] as const;

const transports: Record<(typeof chains)[number]["id"], Transport> = {
  [mainnet.id]: createFallbackTransport([
    { url: "https://rpc.mevblocker.io", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/eth", batch: { batchSize: 10 } },
    { url: "https://eth-pokt.nodies.app", batch: false },
    { url: "https://eth.drpc.org", batch: false },
    { url: "https://eth.merkle.io", batch: false },
  ]),
  [base.id]: createFallbackTransport([
    { url: "https://base.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://base.drpc.org", batch: false },
    { url: "https://mainnet.base.org", batch: { batchSize: 10 } },
    { url: "https://base.lava.build", batch: false },
  ]),
  [ink.id]: createFallbackTransport([
    { url: "https://rpc-gel.inkonchain.com", batch: false },
    { url: "https://rpc-qnd.inkonchain.com", batch: false },
    { url: "https://ink.drpc.org", batch: false },
  ]),
  [optimism.id]: createFallbackTransport([
    { url: "https://optimism.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://op-pokt.nodies.app", batch: { batchSize: 10 } },
    { url: "https://optimism.drpc.org", batch: false },
    { url: "https://optimism.lava.build", batch: false },
  ]),
  [arbitrum.id]: createFallbackTransport([
    { url: "https://arbitrum.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/arbitrum", batch: { batchSize: 10 } },
    { url: "https://arbitrum.drpc.org", batch: false },
  ]),
  [polygon.id]: createFallbackTransport([
    { url: "https://polygon.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://polygon.drpc.org", batch: false },
  ]),
  [plumeMainnet.id]: createFallbackTransport([{ url: "https://phoenix-rpc.plumenetwork.xyz", batch: false }]),
  [unichain.id]: createFallbackTransport([
    { url: "https://mainnet.unichain.org", batch: false },
    { url: "https://unichain.drpc.org", batch: false },
  ]),
  [worldchain.id]: createFallbackTransport([
    { url: "https://worldchain-mainnet.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://worldchain.drpc.org", batch: false },
  ]),
  [scrollMainnet.id]: createFallbackTransport([
    { url: "https://rpc.ankr.com/scroll", batch: false },
    { url: "https://scroll.drpc.org", batch: false },
  ]),
  [fraxtal.id]: createFallbackTransport([
    { url: "https://fraxtal.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://fraxtal.drpc.org", batch: false },
  ]),
  [sonic.id]: createFallbackTransport([
    { url: "https://rpc.soniclabs.com", batch: false },
    { url: "https://rpc.ankr.com/sonic_mainnet", batch: false },
    { url: "https://sonic.drpc.org", batch: false },
  ]),
  [corn.id]: createFallbackTransport([
    { url: "https://mainnet.corn-rpc.com", batch: false },
    { url: "https://maizenet-rpc.usecorn.com", batch: false },
    { url: "https://rpc.ankr.com/corn_maizenet", batch: false },
  ]),
  [modeMainnet.id]: createFallbackTransport([
    { url: "https://mode.gateway.tenderly.co", batch: false },
    { url: "https://mainnet.mode.network", batch: false },
    { url: "https://mode.drpc.org", batch: false },
  ]),
  [hemi.id]: createFallbackTransport([{ url: "https://rpc.hemi.network/rpc", batch: false }]),
};

const wagmiConfig = createConfig({
  chains,
  transports,
  connectors: import.meta.env.VITE_WALLET_KIT_PROJECT_ID
    ? [injected({ shimDisconnect: true }), walletConnect({ projectId: import.meta.env.VITE_WALLET_KIT_PROJECT_ID })]
    : [injected({ shimDisconnect: true })],
  batch: {
    multicall: {
      batchSize: 2048,
      wait: 100,
    },
  },
  cacheTime: 250,
  pollingInterval: 4000,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * 24 * 60 * 60 * 1_000, // 7 days
      queryKeyHashFn(queryKey) {
        return cyrb64Hash(serialize(queryKey));
      },
    },
  },
});

const persister = createSyncStoragePersister({
  serialize,
  storage: window.localStorage,
  deserialize,
});

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, buster: "v1" }}>
        <RequestTrackingProvider>
          <AddressScreeningProvider>
            <DashboardPage />
            <AddressScreeningModal />
          </AddressScreeningProvider>
        </RequestTrackingProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
