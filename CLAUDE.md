# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Morpho Fallback App monorepo containing a React web application for Morpho Blue and MetaMorpho contracts, plus a shared UIKit package. The app is designed to work with only public RPCs—no additional infrastructure required.

**App:**

- **Fallback** (`apps/fallback`) - MIT licensed resilient emergency frontend with minimal dependencies

**Shared Package:**

- **UIKit** (`packages/uikit`) - MIT licensed component library and utilities used by the app

## Development Commands

### Running the App

```bash
# Install dependencies (required first time)
pnpm install

# Development mode (builds UIKit first, then runs app)
pnpm run fallback-app:dev    # Fallback app at http://localhost:5173

# Production build
pnpm run fallback-app:build  # Builds UIKit + Fallback

# UIKit only
pnpm run uikit:build         # Build UIKit package
pnpm run uikit:example       # Run UIKit example app
```

### Testing

```bash
# Run tests across all workspaces
pnpm run test               # Uses vitest workspace configuration

# Run tests in the fallback app
cd apps/fallback && pnpm run test
```

Test files use pattern: `test/**/*.{test,spec}.{ts,tsx}` in each workspace.

### Code Quality

```bash
# Lint all workspaces
pnpm run lint

# Format checking/fixing (in specific workspace)
cd apps/fallback && pnpm run format        # Auto-fix
cd apps/fallback && pnpm run format:check  # Check only

# Type checking
cd packages/uikit && pnpm run typecheck
```

**Pre-commit Hook:** Husky runs `lint-staged` which applies ESLint and Prettier to changed files.

## Architecture

### Tech Stack

- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS 4 + shadcn components
- **Web3:** wagmi 2.15.2, viem 2.29.1
- **State/Caching:** @tanstack/react-query with persistence
- **Type Safety:** TypeScript 5.7, strict mode enabled
- **Testing:** Vitest with jsdom, @testing-library/react

### Monorepo Structure

This is a **pnpm workspace** with two main packages:

- `apps/fallback` - Fallback app
- `packages/uikit` - Shared UIKit (consumed by the app as `@morpho-org/uikit`)

**Important:** UIKit must be built before running/building the app. The dev/build commands handle this automatically.

### Key UIKit Utilities

Located in `packages/uikit/src/`:

**Hooks:**

- `use-contract-events/` - Robust `useContractEvents` hook with adaptive `eth_getLogs` fetching strategies. Automatically handles RPC constraints, retries, and parallel transport testing to find fastest RPC.
- `use-keyed-state.ts` - Prevents state desynchronization when switching chains by keying state to chain ID
- `use-debounced-memo.ts` - Memoization with debouncing
- `use-deep-memo.ts` - Deep equality memoization
- `use-request-tracking.tsx` - Tracks pending requests with context

**Utilities:**

- `lib/utils.ts` - Formatting helpers (`formatBalance`, `formatBalanceWithSymbol`, `formatLtv`, `formatApy`), token utilities, bigint comparisons
- `lib/deployments.ts` - `DEPLOYMENTS` mapping of Morpho contracts (Morpho, MetaMorphoFactory, MetaMorphoV1_1Factory) per chain with addresses and fromBlock
- `lib/chains/` - Custom chain definitions

**Lens Contracts (tevm):**

- `lens/*.sol` - Solidity lens contracts for efficient multicall data fetching
- `lens/*.ts` - TypeScript wrappers using tevm for type-safe contract interactions

**Components:**

- `components/` - shadcn-based UI components with Morpho styling

**Important:** The `restructure` function (from `@morpho-org/blue-sdk-viem`) is used in `useReadContracts` select parameters to convert tuple arrays into objects.

### App-Specific Details

#### Fallback App (`apps/fallback`)

Single page app with no URL routing. Key files:

- `src/App.tsx` - Defines `wagmiConfig`, sets up providers/contexts
- `src/app/dashboard/earn-subpage.tsx` - Fetches MetaMorpho vault data via events
- `src/app/dashboard/borrow-subpage.tsx` - Fetches Morpho Blue borrow positions via events
- `src/lib/wagmi-config.ts` - Chain and RPC configuration (uses wallet RPC first, falls back to drpc.org)
- `src/lib/constants.ts` - App constants including deployment addresses

### Event-Driven Data Fetching

The app fetches on-chain data primarily through event logs using the `useContractEvents` hook:

1. Identify relevant events (e.g., `CreateMetaMorpho`, `Deposit`, `SupplyCollateral`)
2. Fetch events using adaptive strategy that finds optimal block range per request
3. Extract addresses/IDs from events
4. Batch fetch detailed data using `useReadContracts`

This approach minimizes RPC calls and works reliably with public RPCs.

## Adding a New Chain

1. Update `wagmiConfig` in `apps/fallback/src/lib/wagmi-config.ts` - add chain and RPC URL(s) that support `eth_getLogs`
2. Update `DEPLOYMENTS` in `packages/uikit/src/lib/deployments.ts` - add Morpho contract addresses and `fromBlock` values
3. (Optional) Add chain icon SVG to `packages/uikit/src/assets/chains/` and update `ChainIcon` component in `packages/uikit/src/components/chain-icon.tsx`
4. Test thoroughly

**Note:** Default chunk size for `eth_getLogs` is 10,000 blocks. If a chain has more restrictive RPC limits, the `useContractEvents` hook may need adjustment.

## Important Notes

### Licensing

- **Fallback App:** MIT - permissive
- **UIKit:** MIT - permissive

### Security

- Never commit API keys or secrets to `.env` files
- Addresses in deployments must be checksummed (proper capitalization)

### Deployment

- The fallback app supports Fleek deployment (via `@fleek-platform/cli`)
- Ensure SPA routing is configured (all routes → `index.html`)

### Development Workflow

1. UIKit changes require rebuild: `pnpm run uikit:build`
2. The app automatically rebuilds UIKit in dev mode but watch mode is manual
3. Use parallel dev scripts (`pnpm run fallback-app:dev`) which handle UIKit build + parallel watch
4. Import from UIKit using `@morpho-org/uikit/path/to/file` (e.g., `@morpho-org/uikit/hooks/use-contract-events`)

### Code Style

- ESLint enforces TypeScript best practices, React hooks rules, and import ordering
- Imports are auto-sorted alphabetically with newlines between groups
- Prettier handles formatting with Tailwind CSS plugin
- No floating promises allowed (`@typescript-eslint/no-floating-promises`)
- Unused variables error (except rest siblings)
