import { ArrowLeft, FileSignature, FileText } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ProviderDocumentForm } from "@/components/memo/ProviderDocumentForm";
import type { ProviderDocumentType } from "@/types/memo";
import { useAdminPermission } from "@/components/admin/adminAuth";

export default function AdminDocumentComposerPage() {
  const canCreate = useAdminPermission("create_documents");
  const { documentType } = useParams();
  if (!canCreate) return <Navigate to="/admin" replace />;
  if (documentType !== "fee-proposal" && documentType !== "service-agreement") return <Navigate to="/admin" replace />;
  const type = documentType as ProviderDocumentType;
  const proposal = type === "fee-proposal";

  return (
    <main className="admin-composer-main">
      <div className="admin-composer-heading">
        <Link to="/admin"><ArrowLeft size={16} /> Invitations</Link>
        <div className="admin-composer-title">
          <span>{proposal ? <FileText size={20} /> : <FileSignature size={20} />}</span>
          <div><p className="admin-eyebrow">Create provider invitation</p><h1>{proposal ? "Provider Fee Proposal" : "Provider Service Agreement"}</h1></div>
        </div>
        <div className="admin-document-switch">
          <Link className={proposal ? "active" : ""} to="/admin/documents/new/fee-proposal">Fee proposal</Link>
          <Link className={!proposal ? "active" : ""} to="/admin/documents/new/service-agreement">Service agreement</Link>
        </div>
      </div>
      <ProviderDocumentForm key={type} documentType={type} />
    </main>
  );
}
