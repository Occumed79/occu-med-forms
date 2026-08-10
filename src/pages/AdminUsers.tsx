import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Plus, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAdminUser } from "@/components/admin/adminAuth";
import { apiCreateAdminUser, apiListAdminUsers, apiUpdateAdminUser } from "@/lib/backend";
import type { AdminRole, AdminUser } from "@/types/memo";

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: "Accounts, retention, backups, approvals, and every document action",
  manager: "All document actions and approvals, but no account or retention changes",
  sender: "Create, send, resend, cancel, view, and download documents",
  auditor: "Read-only document, download, and security-audit access",
};

export default function AdminUsersPage() {
  const currentUser = useAdminUser();
  const allowed = currentUser.permissions.includes("manage_users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("sender");
  const [password, setPassword] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await apiListAdminUsers();
      setUsers(result.users);
      setRoles(result.roles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load accounts.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("create"); setError(""); setMessage("");
    try {
      await apiCreateAdminUser({ displayName, email, role, password });
      setDisplayName(""); setEmail(""); setRole("sender"); setPassword("");
      setMessage("Account created.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create the account.");
    } finally { setBusy(""); }
  };

  const update = async (user: AdminUser, patch: { role?: AdminRole; active?: boolean; password?: string }) => {
    setBusy(user.id); setError(""); setMessage("");
    try {
      await apiUpdateAdminUser(user.id, patch);
      if (patch.password) setResetPasswords((current) => ({ ...current, [user.id]: "" }));
      setMessage(`${user.displayName}'s account was updated.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update the account.");
    } finally { setBusy(""); }
  };

  if (!allowed) return <Navigate to="/admin" replace />;
  return (
    <main className="admin-main admin-users-main">
      <section className="admin-hero">
        <div><p className="admin-eyebrow">Access control</p><h1>Individual accounts and roles</h1><p>Every person signs in separately. Permissions are enforced by the backend for every action.</p></div>
        <button type="button" className="admin-secondary-action" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
      </section>

      <section className="admin-role-grid" aria-label="Role permissions">
        {roles.map((item) => <article key={item}><ShieldCheck size={18} /><div><strong>{item}</strong><p>{ROLE_DESCRIPTIONS[item]}</p></div></article>)}
      </section>

      {error && <div className="admin-table-message error" role="alert">{error}</div>}
      {message && <div className="admin-account-success" role="status"><CheckCircle2 size={17} /> {message}</div>}

      <div className="admin-users-grid">
        <section className="admin-invitations-card admin-user-list">
          <div className="admin-table-toolbar"><div><h2>Active and disabled accounts</h2><p>Role or password changes invalidate that person's open sessions.</p></div></div>
          <div className="admin-table-scroll">
            <table className="admin-invitation-table">
              <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>New password</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.displayName}{user.id === currentUser.id ? " (you)" : ""}</strong><small>{user.email}</small></td>
                  <td><select value={user.role} disabled={busy === user.id || user.id === currentUser.id} onChange={(event) => void update(user, { role: event.target.value as AdminRole })}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
                  <td><button type="button" className={user.active ? "admin-user-active" : "admin-user-disabled"} disabled={busy === user.id || user.id === currentUser.id} onClick={() => void update(user, { active: !user.active })}>{user.active ? <><CheckCircle2 size={14} /> Active</> : <><UserX size={14} /> Disabled</>}</button></td>
                  <td>{user.id === currentUser.id ? <small>Use My account</small> : <div className="admin-password-reset"><input type="password" value={resetPasswords[user.id] || ""} onChange={(event) => setResetPasswords((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="12+ character password" /><button type="button" disabled={busy === user.id || !(resetPasswords[user.id] || "")} onClick={() => void update(user, { password: resetPasswords[user.id] })}><KeyRound size={14} /> Set</button></div>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section className="admin-create-user-card">
          <h2>Create account</h2><p>Give each coworker their own credentials and only the permissions they need.</p>
          <form onSubmit={create}>
            <label>Full name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Role<select value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select><small>{ROLE_DESCRIPTIONS[role]}</small></label>
            <label>Initial password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /><small>At least 12 characters with uppercase, lowercase, and a number.</small></label>
            <button type="submit" disabled={busy === "create"}><Plus size={16} /> {busy === "create" ? "Creating…" : "Create account"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
