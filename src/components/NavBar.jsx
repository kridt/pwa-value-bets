// src/components/NavBar.jsx
import { NavLink } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { isAdminUid } from "../lib/admins";

const Tab = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex-1 text-center py-3 ${isActive ? "text-glow" : "text-mute"}`
    }
  >
    <span className="text-sm">{label}</span>
  </NavLink>
);

export default function NavBar() {
  const { user } = useAuthContext();
  const isAdmin = isAdminUid(user?.uid || "");

  return (
    <nav className="fixed bottom-4 left-0 right-0">
      <div className="mx-auto max-w-screen-sm px-4">
        <div className="glass glow-border flex items-center rounded-2xl">
          <Tab to="/" label="Feed" />
          <div className="w-px h-5 bg-white/10" />
          <Tab to="/my-bets" label="MyBets" />
          <div className="w-px h-5 bg-white/10" />
          <Tab to="/my-bets-history" label="History" />
          {isAdmin && (
            <>
              <div className="w-px h-5 bg-white/10" />
              <Tab to="/admin" label="Admin" />
            </>
          )}
          <div className="w-px h-5 bg-white/10" />
          <Tab to="/settings" label="Settings" />
        </div>
      </div>
    </nav>
  );
}
