import { abbreviateAddress } from "@morpho-org/uikit/lib/utils";
import userEvent from "@testing-library/user-event";
import { http, UserRejectedRequestError } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { mainnet, base, soneium } from "viem/chains";
import { describe, expect, vi } from "vitest";
import { mock } from "wagmi";

import { testWithMainnetFork, rpcUrls } from "../../config";
import { render, screen, waitFor, waitForElementToBeRemoved } from "../../providers";

import Page from "@/app/dashboard/page";
import { createConfig } from "@/lib/wagmi-config";

describe("connect wallet flow", () => {
  testWithMainnetFork("handles user rejection gracefully", async ({ client }) => {
    const account = privateKeyToAddress(generatePrivateKey());
    const wagmiConfig = createConfig({
      chains: [mainnet, base],
      transports: {
        [mainnet.id]: http(client.transport.url),
        [base.id]: http(rpcUrls[base.id]),
      },
      connectors: [
        mock({
          accounts: [account],
          features: {
            connectError: new UserRejectedRequestError(new Error("Failed to connect.")),
          },
        }),
      ],
    });

    window.localStorage.setItem("hasSeenWelcome", "true");
    render(<Page />, { wagmiConfig });

    await userEvent.click(screen.getByText("Connect Wallet"));
    await userEvent.click(await screen.findByText("Mock Connector"));

    await waitFor(() => screen.findByText("Requesting Connection"));
    await waitForElementToBeRemoved(screen.getByText("Requesting Connection"));

    expect(screen.getByText("Request Cancelled")).toBeInTheDocument();
  });

  testWithMainnetFork("shows user address once connected", async ({ client }) => {
    const account = privateKeyToAddress(generatePrivateKey());
    const wagmiConfig = createConfig({
      chains: [mainnet, base],
      transports: {
        [mainnet.id]: http(client.transport.url),
        [base.id]: http(rpcUrls[base.id]),
      },
      connectors: [mock({ accounts: [account] })],
    });

    window.localStorage.setItem("hasSeenWelcome", "true");
    render(<Page />, { wagmiConfig });

    await userEvent.click(screen.getByText("Connect Wallet"));
    await userEvent.click(await screen.findByText("Mock Connector"));

    await waitFor(() => screen.findByText("Requesting Connection"));
    await waitForElementToBeRemoved(screen.getByText("Requesting Connection"));

    expect(screen.getByText(abbreviateAddress(account))).toBeInTheDocument();
  });
});

describe("switch chain flow", () => {
  testWithMainnetFork("switches to soneium without wallet and opens main app", async ({ client }) => {
    const account = privateKeyToAddress(generatePrivateKey());
    const wagmiConfig = createConfig({
      chains: [mainnet, soneium],
      transports: {
        [mainnet.id]: http(client.transport.url),
        [soneium.id]: http(rpcUrls[soneium.id]),
      },
      connectors: [mock({ accounts: [account] })],
    });

    window.localStorage.setItem("hasSeenWelcome", "true");
    render(<Page />, {
      wagmiConfig,
      routes: [{ element: <div>Switched to Soneium successfully!</div>, path: "soneium-mainnet/earn" }],
    });

    window.open = vi.fn();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Soneium Mainnet"));

    expect(screen.getByText("Switched to Soneium successfully!")).toBeInTheDocument();
  });

  testWithMainnetFork("switches to soneium with wallet", async ({ client }) => {
    const account = privateKeyToAddress(generatePrivateKey());
    const wagmiConfig = createConfig({
      chains: [mainnet, soneium],
      transports: {
        [mainnet.id]: http(client.transport.url),
        [soneium.id]: http(rpcUrls[soneium.id]),
      },
      connectors: [mock({ accounts: [account], features: { defaultConnected: true } })],
    });

    window.localStorage.setItem("hasSeenWelcome", "true");
    render(<Page />, {
      wagmiConfig,
      routes: [{ element: <div>Switched to Soneium successfully!</div>, path: "soneium-mainnet/earn" }],
    });

    window.open = vi.fn();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Soneium Mainnet"));

    expect(screen.getByText("Switched to Soneium successfully!")).toBeInTheDocument();
  });
});
