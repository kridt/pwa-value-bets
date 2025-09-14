// src/components/RequireAdmin.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { isAdminUid } from "../lib/admins";

export default function RequireAdmin({ children }) {
  const { user, loading } = useAuthContext();
  const loc = useLocation();

  if (loading) return null;
  if (!user || !isAdminUid(user.uid))
    return <Navigate to="/" state={{ from: loc }} replace />;
  return children;
}
