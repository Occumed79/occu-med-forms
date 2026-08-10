import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileSignature,
  FileText,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminUser } from "@/components/admin/adminAuth";
import { adminDocumentLabel, formatAdminDate, invitationStatusLabel } from "@/lib/adminInvitations";
import { apiListAdminInvitations } from "@/lib/backend";
import type { AdminInvitationList, ProviderInvitationStatus } from "@/types/memo";

const EMPTY_COUNTS: AdminInvitationList["counts"] = {
  all: 0, draft: 0, sent: 0, viewed: 0, returned: 0, completed: 0, declined: 0, expired: 0, cancelled: 0,
};

const filters: Array<{ value: ProviderInvitationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Ready to send" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Opened" },
  { value: "returned", label: "Needs review" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminDashboardPage() {
  const user = useAdminUser();
  const canCreate = user.permissions.includes("create_documents");
  const [result, setResult] = useState<AdminInvitationList>({ items: [], counts: EMPTY_COUNTS });
  const [filter, setFilter] = useState<ProviderInvitationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await apiListAdminInvitations({ status: filter, query: search.trim() }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load invitations.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const activeCount = useMemo(() => result.counts.sent + result.counts.viewed, [result.counts]);

  return (
    <main className="admin-main">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">Provider agreement workflow</p>
          <h1>Invitations and responses</h1>
          <p>Create provider documents, monitor when they are opened, and download completed agreements.</p>
        </div>
        {canCreate && <div className="admin-create-actions">
          <Link to="/admin/documents/new/service-agreement" className="admin-primary-action"><FileSignature size={18} /> New service agreement package</Link>
          <Link to="/admin/documents/new/fee-proposal" className="admin-secondary-action"><FilePlus2 size={18} /> New fee proposal package</Link>
        </div>}
      </section>

      <section className="admin-stat-grid" aria-label="Invitation totals">
        <article><span className="admin-stat-icon blue"><Inbox size={19} /></span><div><small>Total invitations</small><strong>{result.counts.all}</strong></div></article>
        <article><span className="admin-stat-icon amber"><Clock3 size={19} /></span><div><small>Awaiting response</small><strong>{activeCount}</strong></div></article>
        <article><span className="admin-stat-icon purple"><AlertTriangle size={19} /></span><div><small>Needs review</small><strong>{result.counts.returned}</strong></div></article>
        <article><span className="admin-stat-icon green"><CheckCircle2 size={19} /></span><div><small>Completed</small><strong>{result.counts.completed}</strong></div></article>
      </section>

      <section className="admin-invitations-card">
        <div className="admin-table-toolbar">
          <div>
            <h2>Provider invitations</h2>
            <p>Open a record to review activity or retrieve its completed files.</p>
          </div>
          <div className="admin-table-tools">
            <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search provider, email, or document…" /></label>
            <button type="button" onClick={load} aria-label="Refresh invitations"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>

        <div className="admin-filter-row" role="tablist" aria-label="Invitation status filter">
          {filters.map((item) => (
            <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>
              {item.label}<span>{result.counts[item.value]}</span>
            </button>
          ))}
        </div>

        {error ? <div className="admin-table-message error" role="alert">{error}<button type="button" onClick={load}>Try again</button></div> : null}
        {!error && loading && !result.items.length ? <div className="admin-table-message">Loading invitations…</div> : null}
        {!error && !loading && !result.items.length ? (
          <div className="admin-empty-state">
            <FileText size={28} />
            <h3>{search || filter !== "all" ? "No matching invitations" : "No invitations yet"}</h3>
            <p>{search || filter !== "all" ? "Change the search or status filter." : "Create the first provider document package."}</p>
            {!search && filter === "all" && canCreate && <Link to="/admin/documents/new/service-agreement">Create a document package <ArrowRight size={15} /></Link>}
          </div>
        ) : null}

        {result.items.length > 0 ? (
          <div className="admin-table-scroll">
            <table className="admin-invitation-table">
              <thead><tr><th>Provider</th><th>Document</th><th>Status</th><th>Created</th><th>Last activity</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {result.items.map((invite) => (
                  <tr key={invite.id}>
                    <td><strong>{invite.providerName}</strong><small>{invite.recipientEmail || "Link only — no email"}</small></td>
                    <td><strong>{adminDocumentLabel(invite.documentType)}</strong><small>{invite.documentNumber}</small></td>
                    <td><span className={`admin-status ${invite.status}`}>{invitationStatusLabel(invite.status)}</span></td>
                    <td>{formatAdminDate(invite.createdAt)}</td>
                    <td>{formatAdminDate(invite.completedAt || invite.viewedAt || invite.createdAt)}</td>
                    <td><Link to={`/admin/invitations/${invite.id}`} aria-label={`Open ${invite.providerName}`}><ArrowRight size={17} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
