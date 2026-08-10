import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/occu-med-logo.png";
import { apiAdminLogin, setAdminSessionToken } from "@/lib/backend";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const session = await apiAdminLogin(email.trim(), password);
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
        <p>Sign in with your individual Occu-Med account to create invitations or review provider responses.</p>
        <form onSubmit={submit}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <div className="admin-auth-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? "Signing in…" : "Open workspace"} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
