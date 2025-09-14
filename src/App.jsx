import { Outlet, NavLink, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";

export default function App() {
  const loc = useLocation();
  return (
    <div className="min-h-dvh bg-constellation">
      <div className="mx-auto max-w-screen-sm px-3 pb-24 pt-8">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-glow/20 border border-glow/40 shadow-neon animate-glowpulse" />
              <div>
                <h1 className="text-xl font-semibold tracking-wide">
                  Value Profits Protocol
                </h1>
                <p className="text-xs text-mute -mt-0.5">EV Betting Alerts</p>
              </div>
            </div>
            <NavLink to="/settings" className="badge">
              Settings
            </NavLink>
          </div>
        </header>

        <Outlet />
      </div>
      <NavBar activePath={loc.pathname} />
    </div>
  );
}
