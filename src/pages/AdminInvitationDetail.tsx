import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProviderDocumentPreview } from "@/components/memo/ProviderDocumentPreview";
import { adminDocumentLabel, formatAdminDate, invitationStatusLabel } from "@/lib/adminInvitations";
import {
  apiCancelAdminInvitation,
  apiDownloadAdminInvitationFile,
  apiGetAdminInvitation,
  apiResendAdminInvitation,
} from "@/lib/backend";
import { downloadPdf } from "@/lib/fileDownload";
import type { AdminInvitationDetail } from "@/types/memo";

export default function AdminInvitationDetailPage() {
  const { id = "" } = useParams();
  const [invite, setInvite] = useState<AdminInvitationDetail | null>(null);
  const [providerLink, setProviderLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setInvite(await apiGetAdminInvitation(id)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not load invitation."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const resend = async () => {
    setBusy(true); setError("");
    try {
      const result = await apiResendAdminInvitation(id);
      const link = new URL(result.providerPath, window.location.origin).toString();
      setProviderLink(link);
      try { await navigator.clipboard.writeText(link); } catch { /* copy control remains */ }
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not resend invitation."); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this provider invitation? Its current link will stop working.")) return;
    setBusy(true); setError("");
    try { await apiCancelAdminInvitation(id); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not cancel invitation."); }
    finally { setBusy(false); }
  };

  const download = async (kind: "document" | "certificate") => {
    if (!invite) return;
    setBusy(true); setError("");
    try {
      const bytes = await apiDownloadAdminInvitationFile(id, kind);
      downloadPdf(bytes, `${invite.documentNumber}-${kind}.pdf`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not download file."); }
    finally { setBusy(false); }
  };

  if (loading && !invite) return <main className="admin-main"><div className="admin-detail-loading">Loading invitation…</div></main>;
  if (!invite) return <main className="admin-main"><Link className="admin-back-link" to="/admin"><ArrowLeft size={16} /> Invitations</Link><div className="admin-table-message error">{error || "Invitation not found."}</div></main>;

  const active = invite.status === "sent" || invite.status === "viewed" || invite.status === "expired";

  return (
    <main className="admin-main admin-detail-main">
      <Link className="admin-back-link" to="/admin"><ArrowLeft size={16} /> All invitations</Link>
      <section className="admin-detail-header">
        <div>
          <div className="admin-detail-kicker"><span className={`admin-status ${invite.status}`}>{invitationStatusLabel(invite.status)}</span><span>{adminDocumentLabel(invite.documentType)}</span></div>
          <h1>{invite.providerName}</h1>
          <p>{invite.documentNumber}</p>
        </div>
        <div className="admin-detail-actions">
          {invite.hasCompletedDocument && <><button type="button" onClick={() => download("document")} disabled={busy}><Download size={16} /> Final PDF</button><button type="button" onClick={() => download("certificate")} disabled={busy}><Download size={16} /> Certificate</button></>}
          {active && <button type="button" className="primary" onClick={resend} disabled={busy}><RefreshCw size={16} /> Resend / new link</button>}
          {(invite.status === "sent" || invite.status === "viewed" || invite.status === "expired") && <button type="button" className="danger" onClick={cancel} disabled={busy}><Ban size={16} /> Cancel</button>}
        </div>
      </section>

      {error && <div className="admin-table-message error" role="alert">{error}</div>}
      {providerLink && (
        <section className="admin-new-link" role="status">
          <CheckCircle2 size={18} /><div><strong>New provider link created</strong><p>The previous link is no longer valid.</p><div><input readOnly value={providerLink} /><button type="button" onClick={() => navigator.clipboard.writeText(providerLink)}><Copy size={15} /> Copy</button><a href={providerLink} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a></div></div>
        </section>
      )}

      <div className="admin-detail-grid">
        <aside className="admin-detail-sidebar">
          <section><h2>Recipient</h2><dl><div><dt>Contact</dt><dd>{invite.data.providerContactName || "—"}</dd></div><div><dt>Email</dt><dd>{invite.recipientEmail || "Link only"}</dd></div><div><dt>Telephone</dt><dd>{invite.data.providerPhone || "—"}</dd></div></dl></section>
          <section><h2>Activity</h2><ol className="admin-timeline"><li className="done"><strong>Created</strong><span>{formatAdminDate(invite.createdAt)}</span></li><li className={invite.viewedAt ? "done" : ""}><strong>Provider opened</strong><span>{formatAdminDate(invite.viewedAt)}</span></li><li className={invite.completedAt ? "done" : ""}><strong>Completed</strong><span>{formatAdminDate(invite.completedAt)}</span></li></ol></section>
          <section><h2>Terms</h2><dl><div><dt>Billing</dt><dd>{invite.data.billingTerms}</dd></div><div><dt>Expires</dt><dd>{formatAdminDate(invite.expiresAt)}</dd></div><div><dt>Services</dt><dd>{invite.data.services.length}</dd></div></dl></section>
          {invite.pdfHash && <section><h2>Document integrity</h2><p className="admin-hash">SHA-256<br />{invite.pdfHash}</p></section>}
        </aside>
        <section className="admin-detail-preview" aria-label="Provider document preview">
          <ProviderDocumentPreview data={invite.data} invitationStatus={invitationStatusLabel(invite.status)} />
        </section>
      </div>
    </main>
  );
}
