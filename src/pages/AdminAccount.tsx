import { FormEvent, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useAdminUser } from "@/components/admin/adminAuth";
import { apiChangeAdminPassword } from "@/lib/backend";

export default function AdminAccountPage() {
  const user = useAdminUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSaved(false);
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      await apiChangeAdminPassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setSaved(true);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not change the password."); }
    finally { setBusy(false); }
  };

  return <main className="admin-main admin-account-main">
    <section className="admin-hero"><div><p className="admin-eyebrow">My account</p><h1>{user.displayName}</h1><p>{user.email} · {user.role}</p></div></section>
    <section className="admin-account-card"><KeyRound size={22} /><div><h2>Change password</h2><p>Changing your password signs your account out everywhere else.</p>
      <form onSubmit={submit}>
        <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} required /></label>
        {error && <div className="admin-auth-error" role="alert">{error}</div>}{saved && <div className="admin-account-success"><CheckCircle2 size={16} /> Password updated.</div>}
        <button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>
    </div></section>
  </main>;
}
