import { FormEvent, useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, DatabaseBackup, Download, History, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAdminUser } from "@/components/admin/adminAuth";
import { apiDownloadBackup, apiGetRetentionPolicy, apiGetSecurityAudit, apiUpdateRetentionPolicy } from "@/lib/backend";
import { downloadFile } from "@/lib/fileDownload";
import { formatAdminDate } from "@/lib/adminInvitations";
import type { AuthAuditEvent, RetentionPolicy } from "@/types/memo";

export default function AdminGovernancePage() {
  const user = useAdminUser();
  const canRetain = user.permissions.includes("manage_retention");
  const canAudit = user.permissions.includes("view_security_audit");
  const canBackup = user.permissions.includes("export_backups");
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [events, setEvents] = useState<AuthAuditEvent[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [retention, audit] = await Promise.all([
        canRetain ? apiGetRetentionPolicy() : Promise.resolve(null),
        canAudit ? apiGetSecurityAudit() : Promise.resolve({ events: [] }),
      ]);
      setPolicy(retention); setEvents(audit.events);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not load governance settings."); }
  }, [canAudit, canRetain]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!policy) return;
    setBusy("save"); setError(""); setSaved(false);
    try {
      await apiUpdateRetentionPolicy(policy);
      setSaved(true); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not save the policy."); }
    finally { setBusy(""); }
  };

  const backup = async () => {
    setBusy("backup"); setError("");
    try {
      const bytes = await apiDownloadBackup();
      downloadFile(bytes, `occu-med-provider-documents-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not generate the backup."); }
    finally { setBusy(""); }
  };

  const eventName = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

  if (!canRetain && !canAudit && !canBackup) return <Navigate to="/admin" replace />;
  return <main className="admin-main admin-governance-main">
    <section className="admin-hero"><div><p className="admin-eyebrow">Data governance</p><h1>Retention, backups, and access history</h1><p>Signed records stay available for the defined period, legal holds are excluded from cleanup, and every account action is logged.</p></div></section>
    {error && <div className="admin-table-message error" role="alert">{error}</div>}
    <div className="admin-governance-grid">
      {canRetain && policy && <section className="admin-governance-card"><Archive size={21} /><div><h2>Retention policy</h2><p>This defines eligibility only. Nothing is automatically destroyed.</p>
        <form onSubmit={save}>
          <label>Completed signed documents<input type="number" min={365} max={3650} value={policy.completedDocumentDays} onChange={(event) => setPolicy({ ...policy, completedDocumentDays: Number(event.target.value) })} /><small>days (default: 2,555 / seven years)</small></label>
          <label>Declined, expired, or cancelled invitations<input type="number" min={30} max={3650} value={policy.inactiveInvitationDays} onChange={(event) => setPolicy({ ...policy, inactiveInvitationDays: Number(event.target.value) })} /><small>days</small></label>
          <label>Account security history<input type="number" min={90} max={3650} value={policy.authAuditDays} onChange={(event) => setPolicy({ ...policy, authAuditDays: Number(event.target.value) })} /><small>days</small></label>
          <div className="admin-retention-preview"><span><strong>{policy.preview.completedEligible}</strong> completed eligible</span><span><strong>{policy.preview.inactiveEligible}</strong> inactive eligible</span><span><strong>{policy.preview.legalHolds}</strong> legal holds</span></div>
          {saved && <div className="admin-account-success"><CheckCircle2 size={15} /> Policy saved.</div>}
          <button type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save policy"}</button>
        </form>
      </div></section>}
      {canBackup && <section className="admin-governance-card"><DatabaseBackup size={21} /><div><h2>Portable document backup</h2><p>Exports invitations, PDFs, certificates, and chained document events. Account password data is excluded. The export includes a SHA-256 manifest for integrity checks.</p><button type="button" onClick={() => void backup()} disabled={busy === "backup"}><Download size={16} /> {busy === "backup" ? "Preparing…" : "Download backup"}</button><p className="admin-governance-note">Keep exported files in approved encrypted storage. Neon point-in-time restore remains the primary database recovery layer.</p></div></section>}
    </div>
    {canAudit && <section className="admin-invitations-card admin-security-audit"><div className="admin-table-toolbar"><div><h2><History size={17} /> Account security history</h2><p>Recent sign-ins, password changes, user administration, policy changes, and backup exports.</p></div></div><div className="admin-table-scroll"><table className="admin-invitation-table"><thead><tr><th>Event</th><th>Account</th><th>Performed by</th><th>Date</th><th>IP</th></tr></thead><tbody>{events.map((event, index) => <tr key={`${event.createdAt}-${index}`}><td><strong><ShieldCheck size={13} /> {eventName(event.eventType)}</strong></td><td>{event.email || "—"}</td><td>{event.actorEmail || "—"}</td><td>{formatAdminDate(event.createdAt)}</td><td>{event.ipAddress || "—"}</td></tr>)}</tbody></table></div></section>}
  </main>;
}
