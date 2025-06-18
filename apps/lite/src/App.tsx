import { AddressScreeningModal } from "@morpho-org/uikit/components/address-screening-modal";
import { SafeLinkModal } from "@morpho-org/uikit/components/safe-link-modal";
import { AddressScreeningProvider } from "@morpho-org/uikit/hooks/use-address-screening";
import { SafeLinksProvider } from "@morpho-org/uikit/hooks/use-safe-links";
import { cyrb64Hash } from "@morpho-org/uikit/lib/cyrb64";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ConnectKitProvider } from "connectkit";
import { ReactNode } from "react";
import { Client as UrqlClient, Provider as UrqlProvider, fetchExchange } from "urql";
import { type Config, deserialize, serialize, WagmiProvider } from "wagmi";

import { TERMS_OF_USE } from "@/lib/constants";
import { createConfig } from "@/lib/wagmi-config";

const defaultWagmiConfig = createConfig({});

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

function App({ children, wagmiConfig = defaultWagmiConfig }: { children: ReactNode; wagmiConfig?: Config }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, buster: "v1" }}>
        <ConnectKitProvider
          theme="auto"
          mode="dark"
          options={{
            disclaimer: (
              <span>
                By connecting, you agree you have read the{" "}
                <a href={TERMS_OF_USE} rel="noopener noreferrer" target="_blank">
                  Morpho Terms of Use
                </a>{" "}
                and understand the associated risks.
              </span>
            ),
          }}
        >
          <UrqlProvider value={urqlClient}>
            <AddressScreeningProvider>
              <SafeLinksProvider>
                {children}
                <SafeLinkModal />
              </SafeLinksProvider>
              <AddressScreeningModal />
            </AddressScreeningProvider>
          </UrqlProvider>
        </ConnectKitProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

declare module "wagmi" {
  interface Register {
    config: typeof defaultWagmiConfig;
  }
}
