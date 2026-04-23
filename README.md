# Morpho Fallback App

This repository contains the code for the [fallback](https://fallback.morpho.org/) app, as well as a UIKit for shared components.

## Installation

To get started:

```shell
git clone https://github.com/morpho-org/morpho-lite-apps.git
cd morpho-lite-apps
# Install packages
pnpm install
# Run
pnpm run fallback-app:dev
```

After running the commands above, open [http://localhost:5173/](http://localhost:5173/) in your browser to use the app.

## Features

### Fallback

> A resilient frontend, designed for emergencies with minimal dependencies

- View your deposits in MetaMorpho vaults
- View your borrow positions
- Withdraw from MetaMorpho vaults
- Repay loans, add collateral, and remove collateral
- Support any chain with Morpho contracts
- Requires no additional infrastructure/services

### UIKit

> A package containing core components that are shared across apps

- various shadcn components with Morpho styling
- robust `useContractEvents` hook with adaptive `eth_getLogs` fetching strategies
- utility hooks like `useDebouncedMemo`, `useDeepMemo`, and `useKeyedState` (the latter being useful in avoiding state desychronization when switching chains)
- [tevm](https://www.tevm.sh/) for rapid development of type-safe lens contracts
- a `restructure` function that can be used in the "select" parameter of `useReadContracts` to recover objects rather than arrays -- quite useful, but use judiciously

## Architecture

The app is a single page app built with React 19, Vite, [shadcn](https://ui.shadcn.com), and [wagmi](https://wagmi.sh).

## Further Information

For more details, check out the app's README:

- [README - Fallback App](apps/fallback/README.md)

## Deployments

The Fallback app is automatically released when merging `main` → `release`. Recommended flow:

1. Wait for checks to pass on `main` (otherwise you won't be able to push your merge commit)
2. Locally, do the following:
   ```
   git checkout release
   git pull
   git merge origin/main
   git push
   ```
3. Check GitHub UI to verify that deployment actions are running on `release`
