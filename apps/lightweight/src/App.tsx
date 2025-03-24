import { cyrb64Hash } from "@morpho-blue-offchain-public/uikit/lib/cyrb64";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { Outlet } from "react-router";
import { Client as UrqlClient, Provider as UrqlProvider, fetchExchange } from "urql";
import type { HttpTransportConfig } from "viem";
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
  polygon,
  scroll as scrollMainnet,
  sonic,
  unichain,
  worldchain,
} from "viem/chains";
import { createConfig, deserialize, fallback, http, serialize, type Transport, WagmiProvider } from "wagmi";

const httpConfig: HttpTransportConfig = {
  retryDelay: 0,
  timeout: 30_000,
};

function createFallbackTransport(rpcs: { url: string; batch: HttpTransportConfig["batch"] }[]) {
  return fallback(
    rpcs.map((rpc) => http(rpc.url, { ...httpConfig, batch: rpc.batch })),
    {
      retryCount: 6,
      retryDelay: 100,
    },
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
  worldchain,
  scrollMainnet,
  fraxtal,
  sonic,
  corn,
  modeMainnet,
  hemi,
] as const;

const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY as string;
const transports: Record<(typeof chains)[number]["id"], Transport> = {
  [mainnet.id]: createFallbackTransport([
    { url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://rpc.mevblocker.io", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/eth", batch: { batchSize: 10 } },
    { url: "https://eth.drpc.org", batch: false },
    { url: "https://eth.merkle.io", batch: false },
  ]),
  [base.id]: createFallbackTransport([
    { url: `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://base.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://base.drpc.org", batch: false },
    { url: "https://mainnet.base.org", batch: { batchSize: 10 } },
    { url: "https://base.lava.build", batch: false },
  ]),
  [ink.id]: createFallbackTransport([
    { url: `https://ink-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://ink.drpc.org", batch: false },
  ]),
  [optimism.id]: createFallbackTransport([
    { url: `https://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://op-pokt.nodies.app", batch: { batchSize: 10 } },
    { url: "https://optimism.drpc.org", batch: false },
    { url: "https://optimism.lava.build", batch: false },
  ]),
  [arbitrum.id]: createFallbackTransport([
    { url: `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://arbitrum.gateway.tenderly.co", batch: { batchSize: 10 } },
    { url: "https://rpc.ankr.com/arbitrum", batch: { batchSize: 10 } },
    { url: "https://arbitrum.drpc.org", batch: false },
  ]),
  [polygon.id]: createFallbackTransport([
    { url: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://polygon.drpc.org", batch: false },
  ]),
  [unichain.id]: createFallbackTransport([
    { url: `https://unichain-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://unichain.drpc.org", batch: false },
  ]),
  [worldchain.id]: createFallbackTransport([
    { url: `https://worldchain-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://worldchain.drpc.org", batch: false },
  ]),
  [scrollMainnet.id]: createFallbackTransport([
    { url: `https://scroll-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://scroll.drpc.org", batch: false },
  ]),
  [fraxtal.id]: createFallbackTransport([
    { url: `https://frax-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://fraxtal.drpc.org", batch: false },
  ]),
  [sonic.id]: createFallbackTransport([
    { url: `https://sonic-mainnet.g.alchemy.com/v2/${alchemyApiKey}`, batch: false },
    { url: "https://rpc.soniclabs.com", batch: false },
    { url: "https://rpc.ankr.com/sonic_mainnet", batch: false },
    { url: "https://sonic.drpc.org", batch: false },
  ]),
  [corn.id]: createFallbackTransport([
    { url: "https://mainnet.corn-rpc.com", batch: false },
    { url: "https://maizenet-rpc.usecorn.com", batch: false },
  ]),
  [modeMainnet.id]: createFallbackTransport([{ url: "https://mode.drpc.org", batch: false }]),
  [hemi.id]: createFallbackTransport([{ url: "https://rpc.hemi.network/rpc", batch: false }]),
};

const wagmiConfig = createConfig(
  getDefaultConfig({
    chains,
    transports,
    walletConnectProjectId: import.meta.env.VITE_WALLET_KIT_PROJECT_ID!,
    appName: "Morpho | Lightweight App",
    appDescription: "", // TODO:
    appUrl: "https://lightweight.morpho.org",
    appIcon: "", // TODO:
    batch: {
      multicall: {
        batchSize: 2048,
        wait: 100,
      },
    },
    cacheTime: 250,
    pollingInterval: 4000,
    ssr: import.meta.env.SSR,
  }),
);

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

const urqlClient = new UrqlClient({
  url: "https://blue-api.morpho.org/graphql",
  // NOTE: *Not* providing `cacheExchange` because we're only using "@urql/core". TanStack Query covers caching needs.
  exchanges: [fetchExchange],
});

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, buster: "v1" }}>
        <ConnectKitProvider theme="auto" mode="dark">
          <UrqlProvider value={urqlClient}>
            <Outlet />
          </UrqlProvider>
        </ConnectKitProvider>
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
