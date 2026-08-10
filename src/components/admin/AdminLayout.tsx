import { Database, FilePlus2, Files, LayoutDashboard, LogOut, UserCircle2, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "@/assets/occu-med-logo.png";
import { apiAdminLogout, setAdminSessionToken } from "@/lib/backend";
import { useAdminUser } from "./adminAuth";

export function AdminLayout() {
  const user = useAdminUser();
  const navigate = useNavigate();
  const signOut = async () => {
    try { await apiAdminLogout(); } catch { /* the local session is still cleared */ }
    setAdminSessionToken("");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <NavLink to="/admin" className="admin-brand" aria-label="Occu-Med document admin home">
          <img src={logo} alt="Occu-Med" />
          <span><strong>Provider Documents</strong><small>Admin workspace</small></span>
        </NavLink>
        <nav aria-label="Admin navigation">
          <NavLink to="/admin" end><LayoutDashboard size={17} /> Dashboard</NavLink>
          {user.permissions.includes("create_documents") && <NavLink to="/admin/documents/new/service-agreement"><FilePlus2 size={17} /> New package</NavLink>}
          {user.permissions.includes("create_documents") && <NavLink to="/admin/forms"><Files size={17} /> Form library</NavLink>}
          {user.permissions.includes("manage_users") && <NavLink to="/admin/users"><Users size={17} /> Accounts</NavLink>}
          {(user.permissions.includes("manage_retention") || user.permissions.includes("view_security_audit")) && <NavLink to="/admin/governance"><Database size={17} /> Governance</NavLink>}
        </nav>
        <div className="admin-account-actions">
          <NavLink to="/admin/account" className="admin-account-link"><UserCircle2 size={16} /><span><strong>{user.displayName}</strong><small>{user.role}</small></span></NavLink>
          <button type="button" className="admin-sign-out" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
