import { getChainSlug } from "@morpho-org/uikit/lib/utils";
import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";

import App from "@/App.tsx";
import { DEFAULT_CHAIN } from "@/lib/constants";

const Page = lazy(() => import("@/app/dashboard/page.tsx"));
const EarnSubPage = lazy(() =>
  import("@/app/dashboard/earn-subpage.tsx").then((module) => ({ default: module.EarnSubPage })),
);
const BorrowSubPage = lazy(() =>
  import("@/app/dashboard/borrow-subpage.tsx").then((module) => ({ default: module.BorrowSubPage })),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <App>
              <Outlet />
            </App>
          }
        >
          <Route index element={<Navigate replace to={getChainSlug(DEFAULT_CHAIN)} />} />
          <Route path=":chain/">
            <Route index element={<Navigate replace to="earn" />} />
            <Route element={<Page />}>
              <Route path="earn" element={<EarnSubPage />} />
              <Route path="borrow" element={<BorrowSubPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
