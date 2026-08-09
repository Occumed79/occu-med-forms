import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { apiAdminSession, getAdminSessionToken, setAdminSessionToken } from "@/lib/backend";

export function AdminGuard() {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    getAdminSessionToken() ? "checking" : "denied",
  );

  useEffect(() => {
    if (!getAdminSessionToken()) return;
    let active = true;
    apiAdminSession()
      .then(() => { if (active) setState("allowed"); })
      .catch(() => {
        setAdminSessionToken("");
        if (active) setState("denied");
      });
    return () => { active = false; };
  }, []);

  if (state === "checking") {
    return <main className="admin-auth-shell"><div className="admin-auth-card admin-auth-loading">Opening admin workspace…</div></main>;
  }
  if (state === "denied") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
