import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("admin_token");
  const role = localStorage.getItem("admin_role");

  // Invalid or non-admin sessions are cleared before redirecting to login.
  if (!token || role !== "admin") {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
