import { useRef, useState } from "react";
import { Copy, Download, Link2, Send, Trash2 } from "lucide-react";
import { AddressBlock } from "./AddressBlock";
import { ComponentSidebar } from "./ComponentSidebar";
import { Field, Row, Select, Textarea, TextInput } from "./FormAtoms";
import { NavyHeader } from "./Headers";
import { ProviderDocumentPreview } from "./ProviderDocumentPreview";
import { apiCreateProviderInvitation } from "@/lib/backend";
import { downloadPdf } from "@/lib/fileDownload";
import { pdfBytesToBase64, providerDocumentPdf } from "@/lib/documentCapture";
import {
  createProviderDocumentData,
  createProviderServiceRow,
  documentTitle,
  validateProviderDocument,
} from "@/lib/providerDocuments";
import { useToast } from "@/hooks/use-toast";
import type { ProviderDocumentData, ProviderDocumentType, ProviderServiceRow } from "@/types/memo";

interface Props {
  documentType: ProviderDocumentType;
}

function safeFilename(data: ProviderDocumentData) {
  const provider = data.providerName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${data.documentType}-${provider || data.documentNumber}.pdf`;
}

export const ProviderDocumentForm = ({ documentType }: Props) => {
  const [data, setData] = useState<ProviderDocumentData>(() => createProviderDocumentData(documentType));
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const set = <K extends keyof ProviderDocumentData>(key: K, value: ProviderDocumentData[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  const addService = (component: string) => {
    if (data.services.some((row) => row.component === component)) {
      toast({ title: "Already added", description: `${component} is already in this document.` });
      return;
    }
    set("services", [...data.services, createProviderServiceRow(component)]);
  };

  const updateService = (id: string, patch: Partial<ProviderServiceRow>) =>
    set("services", data.services.map((row) => row.id === id ? { ...row, ...patch } : row));

  const removeService = (id: string) =>
    set("services", data.services.filter((row) => row.id !== id));

  const makePdf = async () => {
    if (!previewRef.current) throw new Error("The document preview is not ready.");
    return providerDocumentPdf(previewRef.current);
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const bytes = await makePdf();
      downloadPdf(bytes, safeFilename(data));
      toast({ title: "PDF downloaded", description: "The PDF matches the exact preview shown on screen." });
    } catch (error) {
      toast({ title: "Download failed", description: String(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    const errors = validateProviderDocument(data);
    if (errors.length) {
      toast({ title: "Complete the document first", description: errors[0], variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const result = await apiCreateProviderInvitation({
        documentType,
        data,
        recipientEmail: data.providerEmail.trim() || undefined,
      });
      const link = new URL(result.providerPath, window.location.origin).toString();
      setInviteLink(link);
      setInviteEmailSent(result.emailSent);
      try { await navigator.clipboard.writeText(link); } catch { /* copy button remains available */ }
      toast({
        title: result.emailSent ? "Invitation sent" : "Invitation link created",
        description: result.emailSent
          ? "The provider-specific link was emailed and copied to your clipboard."
          : "The provider-specific link was copied to your clipboard.",
      });
    } catch (error) {
      toast({ title: "Could not create invitation", description: String(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1360px] mx-auto items-start">
      <ComponentSidebar onAdd={(component) => addService(component.name)} />

      <div className="form-card flex-1 min-w-0" style={{ maxWidth: "none" }}>
        <NavyHeader title={`Occu-Med, LTD\n${documentTitle(documentType)}`} />
        <div className="form-body">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-5 text-sm text-blue-950">
            Prepare the document here, then send a provider-specific link. The provider can review only this
            document, add or remove services, complete its signature, and return the final PDF.
          </div>

          <Row>
            <Field label="Provider / Facility Name" required>
              <TextInput value={data.providerName} onChange={(event) => set("providerName", event.target.value)} placeholder="Legal or operating name" />
            </Field>
            <Field label="Provider Contact Name">
              <TextInput value={data.providerContactName} onChange={(event) => set("providerContactName", event.target.value)} placeholder="Primary contact" />
            </Field>
          </Row>
          <Row>
            <Field label="Provider Email">
              <TextInput type="email" value={data.providerEmail} onChange={(event) => set("providerEmail", event.target.value)} placeholder="recipient@example.com" />
            </Field>
            <Field label="Provider Telephone">
              <TextInput value={data.providerPhone} onChange={(event) => set("providerPhone", event.target.value)} placeholder="Telephone" />
            </Field>
          </Row>
          <Field label="Provider Address">
            <AddressBlock value={data.address} onChange={(address) => set("address", address)} />
          </Field>

          <hr className="section-divider" />
          <Row>
            <Field label="Prepared By" required>
              <TextInput value={data.preparedBy} onChange={(event) => set("preparedBy", event.target.value)} placeholder="Occu-Med representative" />
            </Field>
            <Field label="Title">
              <TextInput value={data.preparedByTitle} onChange={(event) => set("preparedByTitle", event.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Issued Date" required>
              <TextInput type="date" value={data.issuedDate} onChange={(event) => set("issuedDate", event.target.value)} />
            </Field>
            <Field label="Valid Through">
              <TextInput type="date" value={data.expiresDate} onChange={(event) => set("expiresDate", event.target.value)} />
            </Field>
          </Row>
          <Field label="Billing Terms" required>
            <Select value={data.billingTerms} onChange={(event) => set("billingTerms", event.target.value)}>
              <option>Net 30</option>
              <option>Net 15</option>
              <option>Payment at Time of Service</option>
              <option>Other — see notes</option>
            </Select>
          </Field>

          <hr className="section-divider" />
          <Field label="Services and Fees" required>
            <div className="provider-service-editor">
              {data.services.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Add services from the Exam Components panel or add a blank row below.
                </div>
              )}
              {data.services.map((row) => (
                <div className="provider-service-editor-row" key={row.id}>
                  <input value={row.component} onChange={(event) => updateService(row.id, { component: event.target.value })} placeholder="Service / exam component" />
                  <input value={row.price} onChange={(event) => updateService(row.id, { price: event.target.value })} placeholder="$0.00" />
                  <button type="button" onClick={() => removeService(row.id)} aria-label={`Remove ${row.component || "service"}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary justify-center" onClick={() => set("services", [...data.services, createProviderServiceRow()])}>
                Add blank service
              </button>
            </div>
          </Field>

          <Field label="Notes or Special Conditions">
            <Textarea value={data.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Scope details, conditions, exclusions, or other instructions…" />
          </Field>

          <hr className="section-divider" />
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-[hsl(var(--label))]">Exact PDF preview</h3>
              <p className="text-xs text-muted-foreground mt-1">The downloaded and provider-completed PDF is rendered from these exact preview pages.</p>
            </div>
          </div>
          <div className="document-preview-wrap rounded-lg border border-border bg-slate-100 p-4">
            <ProviderDocumentPreview ref={previewRef} data={data} invitationStatus="Draft" />
          </div>

          {inviteLink && (
            <div className="invite-link-panel" role="status">
              <strong>{inviteEmailSent ? "Invitation emailed" : "Provider invitation ready"}</strong>
              <p className="text-xs mt-1">This link opens only this document and its provider completion controls.</p>
              <div className="flex gap-2 items-center mt-2">
                <input readOnly value={inviteLink} aria-label="Provider invitation link" />
                <button type="button" className="btn btn-secondary shrink-0" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  <Copy size={15} /> Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="action-bar print-hide">
          <div className="action-left text-xs text-muted-foreground">
            <Link2 size={15} /> Secure provider-only workflow
          </div>
          <div className="action-right">
            <button type="button" onClick={handleDownload} disabled={busy} className="btn btn-secondary">
              <Download size={16} /> Download exact PDF
            </button>
            <button type="button" onClick={handleInvite} disabled={busy} className="btn-base btn-navy inline-flex items-center gap-2">
              <Send size={16} /> {busy ? "Creating…" : data.providerEmail ? "Create & Send Invite" : "Create Provider Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
