import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, Copy, Download, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProviderDocumentPreview } from "@/components/memo/ProviderDocumentPreview";
import { useAdminUser } from "@/components/admin/adminAuth";
import { adminDocumentLabel, formatAdminDate, invitationStatusLabel } from "@/lib/adminInvitations";
import {
  apiApproveAdminInvitation,
  apiCancelAdminInvitation,
  apiDownloadAdminInvitationFile,
  apiGetAdminInvitation,
  apiResendAdminInvitation,
  apiSetInvitationLegalHold,
} from "@/lib/backend";
import { downloadPdf } from "@/lib/fileDownload";
import type { AdminInvitationDetail } from "@/types/memo";

function describeServiceChanges(invite: AdminInvitationDetail) {
  const original = new Map(invite.originalData.services.map((service) => [service.id, service]));
  const returned = new Map(invite.data.services.map((service) => [service.id, service]));
  const changes: string[] = [];

  for (const service of invite.originalData.services) {
    const response = returned.get(service.id);
    if (!response) changes.push(`Removed: ${service.component} (${service.price || "no fee"})`);
    else if (response.component !== service.component || response.price !== service.price) {
      changes.push(`Changed: ${service.component} (${service.price || "no fee"}) → ${response.component} (${response.price || "no fee"})`);
    }
  }
  for (const service of invite.data.services) {
    if (!original.has(service.id)) changes.push(`Added: ${service.component} (${service.price || "no fee"})`);
  }
  return changes;
}

export default function AdminInvitationDetailPage() {
  const user = useAdminUser();
  const canDownload = user.permissions.includes("download_documents");
  const canManage = user.permissions.includes("manage_invitations");
  const canApprove = user.permissions.includes("approve_terms");
  const canManageRetention = user.permissions.includes("manage_retention");
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

  const approve = async () => {
    if (!window.confirm("Approve the provider's returned service and fee changes and complete this agreement?")) return;
    setBusy(true); setError("");
    try { await apiApproveAdminInvitation(id); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not approve the returned changes."); }
    finally { setBusy(false); }
  };

  const toggleLegalHold = async () => {
    setBusy(true); setError("");
    try { await apiSetInvitationLegalHold(id, !invite?.legalHold); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not update the legal hold."); }
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
  const serviceChanges = describeServiceChanges(invite);
  const eventLabel = (eventType: string) => ({
    created: "Invitation created",
    email_sent: "Invitation emailed",
    link_created: "Secure link created",
    viewed: "Provider opened document",
    resent: "Invitation resent",
    completed: "Provider signed and completed",
    provider_changes_returned: "Provider returned service or fee changes",
    provider_changes_approved: "Occu-Med approved provider changes",
    declined: "Provider declined",
    expired: "Invitation expired",
    cancelled: "Invitation cancelled",
    document_downloaded: "Final PDF downloaded",
    certificate_downloaded: "Certificate downloaded",
    provider_document_downloaded: "Provider downloaded returned PDF",
    provider_certificate_downloaded: "Provider downloaded certificate",
    legal_hold_applied: "Legal hold applied",
    legal_hold_released: "Legal hold released",
  }[eventType] || eventType.replaceAll("_", " "));

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
          {canDownload && invite.hasCompletedDocument && <><button type="button" onClick={() => download("document")} disabled={busy}><Download size={16} /> {invite.status === "returned" ? "Returned PDF" : "Final PDF"}</button><button type="button" onClick={() => download("certificate")} disabled={busy}><Download size={16} /> Certificate</button></>}
          {canApprove && invite.status === "returned" && <button type="button" className="primary" onClick={approve} disabled={busy}><CheckCircle2 size={16} /> Approve changes</button>}
          {canManage && active && <button type="button" className="primary" onClick={resend} disabled={busy}><RefreshCw size={16} /> Resend / new link</button>}
          {canManage && (invite.status === "sent" || invite.status === "viewed" || invite.status === "expired" || invite.status === "returned") && <button type="button" className="danger" onClick={cancel} disabled={busy}><Ban size={16} /> {invite.status === "returned" ? "Reject & cancel" : "Cancel"}</button>}
          {canManageRetention && <button type="button" onClick={() => void toggleLegalHold()} disabled={busy}><LockKeyhole size={16} /> {invite.legalHold ? "Release legal hold" : "Apply legal hold"}</button>}
        </div>
      </section>

      {error && <div className="admin-table-message error" role="alert">{error}</div>}
      {invite.status === "returned" && (
        <section className="admin-returned-review" role="status">
          <AlertTriangle size={20} />
          <div><strong>Provider changes require approval</strong><p>The signature is recorded, but this agreement will not become final until Occu-Med approves the returned terms.</p>
            <ul>{serviceChanges.map((change) => <li key={change}>{change}</li>)}</ul>
          </div>
        </section>
      )}
      <section className={`admin-verification-banner ${invite.verification.valid ? "verified" : "review"}`}>
        {invite.verification.valid ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
        <div>
          <strong>{invite.verification.valid ? "Evidence verified" : "Evidence verification pending or requires review"}</strong>
          <p>Original document, completed PDF, signature evidence, and audit-event chain are checked independently.</p>
        </div>
        <div className="admin-verification-checks">
          <span data-valid={invite.verification.originalDocumentHashValid === true}>Original</span>
          <span data-valid={invite.verification.finalPdfHashValid === true}>Final PDF</span>
          <span data-valid={invite.verification.evidenceHashValid === true}>Signature</span>
          <span data-valid={invite.verification.auditChainValid === true}>Audit chain</span>
        </div>
      </section>
      {providerLink && (
        <section className="admin-new-link" role="status">
          <CheckCircle2 size={18} /><div><strong>New provider link created</strong><p>The previous link is no longer valid.</p><div><input readOnly value={providerLink} /><button type="button" onClick={() => navigator.clipboard.writeText(providerLink)}><Copy size={15} /> Copy</button><a href={providerLink} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a></div></div>
        </section>
      )}

      <div className="admin-detail-grid">
        <aside className="admin-detail-sidebar">
          <section><h2>Recipient</h2><dl><div><dt>Contact</dt><dd>{invite.data.providerContactName || "—"}</dd></div><div><dt>Email</dt><dd>{invite.recipientEmail || "Link only"}</dd></div><div><dt>Telephone</dt><dd>{invite.data.providerPhone || "—"}</dd></div></dl></section>
          <section><h2>Activity</h2><ol className="admin-timeline">{invite.events.length ? invite.events.map((event) => <li className="done" key={event.eventHash}><strong>{eventLabel(event.eventType)}</strong><span>{formatAdminDate(event.createdAt)}</span></li>) : <li><strong>No audit events recorded</strong><span>Legacy invitation</span></li>}</ol></section>
          <section><h2>Terms</h2><dl><div><dt>Billing</dt><dd>{invite.data.billingTerms}</dd></div><div><dt>Expires</dt><dd>{formatAdminDate(invite.expiresAt)}</dd></div><div><dt>Services</dt><dd>{invite.data.services.length}</dd></div></dl></section>
          <section><h2>Retention</h2><dl><div><dt>Retain until</dt><dd>{formatAdminDate(invite.retentionExpiresAt)}</dd></div><div><dt>Legal hold</dt><dd>{invite.legalHold ? "Applied — excluded from cleanup" : "Not applied"}</dd></div></dl></section>
          {serviceChanges.length > 0 && <section><h2>Provider term changes</h2><ul className="admin-service-changes">{serviceChanges.map((change) => <li key={change}>{change}</li>)}</ul></section>}
          {invite.status === "declined" && <section><h2>Decline response</h2><p className="admin-detail-note">{invite.declineReason || "No reason provided."}</p></section>}
          {(invite.originalDocumentHash || invite.pdfHash || invite.signatureHash || invite.evidenceHash) && <section><h2>Document integrity</h2><dl className="admin-integrity-list">{invite.originalDocumentHash && <div><dt>Original</dt><dd>{invite.originalDocumentHash}</dd></div>}{invite.pdfHash && <div><dt>Final PDF</dt><dd>{invite.pdfHash}</dd></div>}{invite.signatureHash && <div><dt>Signature</dt><dd>{invite.signatureHash}</dd></div>}{invite.evidenceHash && <div><dt>Evidence</dt><dd>{invite.evidenceHash}</dd></div>}</dl></section>}
        </aside>
        <section className="admin-detail-preview" aria-label="Provider document preview">
          <ProviderDocumentPreview data={invite.data} invitationStatus={invitationStatusLabel(invite.status)} />
        </section>
      </div>
    </main>
  );
}
