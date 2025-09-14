import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import App from "./App";
import Feed from "./pages/Feed";
import BetDetail from "./pages/BetDetail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import MyBets from "./pages/MyBets";
import MyBetsHistory from "./pages/MyBetsHistory";

import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import AuthProvider from "./contexts/AuthContext";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <Feed /> },
      { path: "/bet/:id", element: <BetDetail /> },
      { path: "/my-bets", element: <MyBets /> },
      { path: "/my-bets-history", element: <MyBetsHistory /> },
      { path: "/settings", element: <Settings /> },
      {
        path: "/admin",
        element: (
          <RequireAdmin>
            <Admin />
          </RequireAdmin>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
