# Morpho Lite Monorepo

This monorepo contains code for the [fallback](https://fallback.morpho.org/) and [lite](https://lite.morpho.org) apps, as well as a UIKit for components
they share.

## Installation

To get started:

```shell
git clone https://github.com/morpho-org/morpho-lite-apps.git
cd morpho-lite-apps
# Install packages
pnpm install
# Run
pnpm run fallback-app:dev # ← for fallback app
pnpm run lite-app:dev # ← for fallback app
```

After running the commands above, open [http://localhost:5173/](http://localhost:5173/) in your browser to use whichever app you ran.

## Features

### Fallback

> A resilient frontend, designed for emergencies with minimal dependencies

- 🦋 View your deposits in MetaMorpho vaults
- 🌌 View your borrow positions
- 📤 Withdraw from MetaMorpho vaults
- ⚡️ Repay loans, add collateral, and remove collateral
- ⛓️ Support any chain with Morpho contracts
- 🏗️ Requires no additional infrastructure/services

### Lite

> A lightweight frontend, designed for rapid multichain expansion without compromising quality in the main app

All features from the Fallback App, plus:

- 👀 Explore all whitelisted vaults and markets, rather than just those you've used before
- 📥 Deposit or open new positions
- ✨ View Merkl rewards campaigns for lending and borrowing on Morpho
- 🏎️ Faster -- calls are tuned for Alchemy rather than public RPCs

If you want to give your users a tailored experience across chains, the Lite App can also be whitelabeled. It only takes a few minutes to add your logo and deploy to Vercel.

### UIKit

> A package containing core components that are shared across apps

- various shadcn components with Morpho styling
- robust `useContractEvents` hook with adaptive `eth_getLogs` fetching strategies
- utility hooks like `useDebouncedMemo`, `useDeepMemo`, and `useKeyedState` (the latter being useful in avoiding state desychronization when switching chains)
- [tevm](https://www.tevm.sh/) for rapid development of type-safe lens contracts
- a `restructure` function that can be used in the "select" parameter of `useReadContracts` to recover objects rather than arrays -- quite useful, but use judiciously

## Architecture

Both apps are single page apps built with React 19, Vite, [shadcn](https://ui.shadcn.com), and [wagmi](https://wagmi.sh).
The Lite App uses [React Router v7](https://reactrouter.com/) (`BrowserRouter`) to enable URL-based navigation. If you're deploying
somewhere other than Vercel, take care to redirect all URL's to the route `index.html`, similar to what's done [here](apps/lite/vercel.json).

## Further Information

You're reading the monorepo summary. For more details on individual apps, check out their respective READMEs:

- [README - Fallback App](apps/fallback/README.md)
- [README - Lite App](apps/lite/README.md)

## Deployments

The Lite and Fallback apps are automatically released when merging `main` → `release`. Recommended flow:

1. Wait for checks to pass on `main` (otherwise you won't be able to push your merge commit)
2. Locally, do the following:
   ```
   git checkout release
   git pull
   git merge origin/main
   git push
   ```
3. Check GitHub UI to verify that deployment actions are running on `release`
