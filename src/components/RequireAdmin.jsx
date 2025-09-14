import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import useAdmin from "../hooks/useAdmin";

export default function RequireAdmin({ children }) {
  const { user, loading: authLoading } = useAuthContext();
  const { isAdmin, loading: adminLoading } = useAdmin(user?.uid || null);
  const loc = useLocation();

  if (authLoading || adminLoading) return null;
  if (!user || !isAdmin)
    return <Navigate to="/" state={{ from: loc }} replace />;
  return children;
}
