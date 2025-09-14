import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";

export default function RequireAuth({ children }) {
  const ctx = useAuthContext();
  // Hvis provider mangler, så vis login (fail-safe)
  if (!ctx) return <Navigate to="/login" replace />;

  const { user, loading } = ctx;
  const loc = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}
