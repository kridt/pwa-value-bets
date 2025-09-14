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

import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import AuthProvider from "./contexts/AuthContext";

const router = createBrowserRouter([
  // login er eneste offentlige route
  { path: "/login", element: <Login /> },

  // resten kræver login
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
    {/* <<< Her ligger AuthProvider, så RequireAuth har context >>> */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
