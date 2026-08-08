import { FilePlus2, Files, LayoutDashboard, LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "@/assets/occu-med-logo.png";
import { setAdminAccessKey } from "@/lib/backend";

export function AdminLayout() {
  const navigate = useNavigate();
  const signOut = () => {
    setAdminAccessKey("");
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
          <NavLink to="/admin/documents/new/fee-proposal"><FilePlus2 size={17} /> New document</NavLink>
          <NavLink to="/admin/forms"><Files size={17} /> Other forms</NavLink>
        </nav>
        <button type="button" className="admin-sign-out" onClick={signOut}><LogOut size={16} /> Lock</button>
      </header>
      <Outlet />
    </div>
  );
}
