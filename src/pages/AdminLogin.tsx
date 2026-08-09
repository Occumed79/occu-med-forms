import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/occu-med-logo.png";
import { apiAdminLogin, setAdminSessionToken } from "@/lib/backend";

export default function AdminLoginPage() {
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessCode.trim()) return;
    setBusy(true);
    setError("");
    try {
      const session = await apiAdminLogin(accessCode.trim());
      setAdminSessionToken(session.token);
      const from = (location.state as { from?: string } | null)?.from || "/admin";
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not open the admin workspace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <img src={logo} alt="Occu-Med" />
        <div className="admin-auth-icon"><LockKeyhole size={22} /></div>
        <p className="admin-eyebrow">Internal access</p>
        <h1>Provider document workspace</h1>
        <p>Enter the Occu-Med admin access code to create invitations and review provider responses.</p>
        <form onSubmit={submit}>
          <label htmlFor="admin-access-code">Admin access code</label>
          <input
            id="admin-access-code"
            type="password"
            autoComplete="current-password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            autoFocus
          />
          {error && <div className="admin-auth-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy || !accessCode.trim()}>
            {busy ? "Checking…" : "Open workspace"} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
