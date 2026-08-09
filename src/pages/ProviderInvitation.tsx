import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Ban, CheckCircle2, Download, PenLine, Plus, Trash2, Type } from "lucide-react";
import { useParams } from "react-router-dom";
import { AddressBlock } from "@/components/memo/AddressBlock";
import { Field, TextInput } from "@/components/memo/FormAtoms";
import { ProviderDocumentPreview } from "@/components/memo/ProviderDocumentPreview";
import { SignaturePad } from "@/components/signatures/SignaturePad";
import { EXAM_CATEGORIES } from "@/data/examComponents";
import { apiDeclineProviderInvitation, apiDownloadProviderInvitationFile, apiFinalizeProviderInvitation, apiGetProviderInvitation, base64PdfToBytes } from "@/lib/backend";
import { pdfBytesToBase64, providerDocumentPdf } from "@/lib/documentCapture";
import { downloadPdf } from "@/lib/fileDownload";
import { createProviderServiceRow, documentTitle, ELECTRONIC_RECORD_CONSENT_TEXT, validateProviderDocument } from "@/lib/providerDocuments";
import type { ProviderDocumentData, ProviderInvitation, ProviderServiceRow } from "@/types/memo";

const waitForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function ProviderInvitationPage() {
  const { token = "" } = useParams();
  const [invitation, setInvitation] = useState<ProviderInvitation | null>(null);
  const [data, setData] = useState<ProviderDocumentData | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [completedHash, setCompletedHash] = useState("");
  const [previewStatus, setPreviewStatus] = useState("Provider Review");
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declined, setDeclined] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const serviceOptions = useMemo(
    () => EXAM_CATEGORIES.flatMap((category) => category.items.map((item) => item.name)),
    [],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await apiGetProviderInvitation(token);
        if (!active) return;
        setInvitation(result);
        setData({
          ...result.data,
          providerSignatureType: result.data.providerSignatureType || "typed",
          providerSignatureData: result.data.providerSignatureData || "",
          electronicConsentText: result.electronicRecordConsentText || ELECTRONIC_RECORD_CONSENT_TEXT,
        });
      } catch (requestError) {
        if (active) setLoadError("This invitation is invalid, expired, or no longer available.");
        console.warn("Provider invitation load failed", requestError);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  if (loading) {
    return <main className="provider-invite-shell"><div className="provider-invite-toolbar"><h1>Loading provider document…</h1></div></main>;
  }

  if (loadError || !invitation || !data) {
    return (
      <main className="provider-invite-shell">
        <div className="provider-invite-toolbar">
          <div><h1>Invitation unavailable</h1><p>{loadError || "The requested document could not be loaded."}</p></div>
        </div>
      </main>
    );
  }

  if (declined) {
    return <main className="provider-invite-shell"><div className="provider-response-result"><Ban size={28} /><h1>Invitation declined</h1><p>Your response was recorded and returned to Occu-Med.</p></div></main>;
  }

  const awaitingApproval = invitation.status === "returned";
  const locked = awaitingApproval || invitation.status === "completed" || Boolean(completedHash);
  const set = <K extends keyof ProviderDocumentData>(key: K, value: ProviderDocumentData[K]) =>
    setData((current) => current ? { ...current, [key]: value } : current);
  const updateService = (id: string, patch: Partial<ProviderServiceRow>) =>
    set("services", data.services.map((row) => row.id === id ? { ...row, ...patch } : row));
  const removeService = (id: string) => set("services", data.services.filter((row) => row.id !== id));

  const addSelectedService = () => {
    if (!selectedService || data.services.some((row) => row.component === selectedService)) return;
    set("services", [...data.services, createProviderServiceRow(selectedService, "", "provider")]);
    setSelectedService("");
  };

  const buildPdf = async () => {
    if (!previewRef.current) throw new Error("The document preview is not ready.");
    return providerDocumentPdf(previewRef.current);
  };

  const handleDownload = async (kind: "document" | "certificate" = "document") => {
    setBusy(true);
    try {
      const bytes = locked ? await apiDownloadProviderInvitationFile(token, kind) : await buildPdf();
      downloadPdf(bytes, `${data.documentNumber}-${locked ? kind : "review"}.pdf`);
    } catch (downloadError) {
      setActionError(String(downloadError));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    const finalData: ProviderDocumentData = {
      ...data,
      providerSignatureData: data.providerSignatureType === "typed" ? data.providerSignerName : data.providerSignatureData,
      providerSignedDate: data.providerSignedDate || new Date().toISOString().slice(0, 10),
      electronicConsentText: ELECTRONIC_RECORD_CONSENT_TEXT,
    };
    const errors = validateProviderDocument(finalData, { requireProviderSignature: true });
    if (errors.length) {
      setActionError(errors[0]);
      return;
    }

    setBusy(true);
    setActionError("");
    try {
      flushSync(() => {
        setData(finalData);
        setPreviewStatus("Completed");
      });
      await waitForPaint();
      const bytes = await buildPdf();
      const result = await apiFinalizeProviderInvitation(token, {
        data: finalData,
        signedPdfBase64: pdfBytesToBase64(bytes),
      });
      setCompletedHash(result.pdfHash);
      setPreviewStatus(result.requiresReview ? "Pending Occu-Med Approval" : "Completed");
      setInvitation((current) => current ? { ...current, status: result.status, completedAt: result.completedAt } : current);
      downloadPdf(base64PdfToBytes(result.pdfBase64), `${finalData.documentNumber}-${result.requiresReview ? "returned" : "completed"}.pdf`);
      setTimeout(() => downloadPdf(base64PdfToBytes(result.certificateBase64), `${finalData.documentNumber}-certificate.pdf`), 400);
    } catch (completeError) {
      setPreviewStatus("Provider Review");
      setActionError(String(completeError));
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    setActionError("");
    try {
      await apiDeclineProviderInvitation(token, declineReason);
      setDeclined(true);
    } catch (declineError) {
      setActionError(declineError instanceof Error ? declineError.message : "Could not record your response.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="provider-invite-shell">
      <div className="provider-invite-toolbar">
        <div>
          <h1>{documentTitle(data.documentType)}</h1>
          <p>{awaitingApproval ? "Returned to Occu-Med for approval" : locked ? "Completed document" : "Review the services, complete your information, and accept the document."}</p>
        </div>
        <div className="provider-toolbar-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void handleDownload("document")}>
            <Download size={16} /> Download {awaitingApproval ? "returned copy" : locked ? "final" : "review copy"}
          </button>
          {locked && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void handleDownload("certificate")}><Download size={16} /> Certificate</button>}
        </div>
      </div>

      {locked ? (
        <div className={`provider-submission-banner ${awaitingApproval ? "pending" : "completed"}`} role="status">
          {awaitingApproval ? <PenLine size={20} /> : <CheckCircle2 size={20} />}
          <div><strong>{awaitingApproval ? "Submitted to Occu-Med for approval." : "Completed and returned to Occu-Med."}</strong>{awaitingApproval && <p>Your service or fee changes are recorded. Occu-Med must approve them before the agreement is final.</p>}{completedHash && <div className="text-xs mt-1">Document hash: {completedHash}</div>}</div>
        </div>
      ) : null}

      <div className="provider-invite-layout">
        <aside className="provider-invite-editor" aria-label="Provider completion controls">
          <h2>Your response</h2>
          <p>You are editing only the document Occu-Med invited you to review. Other Occu-Med forms are not accessible from this page.</p>

          {actionError && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{actionError}</div>}

          <Field label="Provider / Facility Name" required>
            <TextInput value={data.providerName} disabled={locked} onChange={(event) => set("providerName", event.target.value)} />
          </Field>
          <Field label="Contact Name">
            <TextInput value={data.providerContactName} disabled={locked} onChange={(event) => set("providerContactName", event.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={data.providerEmail} disabled={locked} onChange={(event) => set("providerEmail", event.target.value)} />
          </Field>
          <Field label="Telephone">
            <TextInput value={data.providerPhone} disabled={locked} onChange={(event) => set("providerPhone", event.target.value)} />
          </Field>
          <Field label="Provider Address">
            <AddressBlock value={data.address} disabled={locked} onChange={(address) => set("address", address)} />
          </Field>

          <hr className="section-divider" />
          <h2>Services</h2>
          <p>Remove services you do not provide. Add any other services you want Occu-Med to consider and enter the fee.</p>
          <div className="provider-service-editor">
            {data.services.map((row) => (
              <div className="provider-service-editor-row" key={row.id}>
                <input disabled={locked} value={row.component} onChange={(event) => updateService(row.id, { component: event.target.value })} />
                <input disabled={locked} value={row.price} onChange={(event) => updateService(row.id, { price: event.target.value })} placeholder="$0.00" />
                <button disabled={locked} type="button" onClick={() => removeService(row.id)} aria-label={`Remove ${row.component}`}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          {!locked && (
            <div className="provider-add-service">
              <select className="field-select" value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                <option value="">Select another service…</option>
                {serviceOptions.map((service) => <option key={service}>{service}</option>)}
              </select>
              <button type="button" className="btn btn-secondary" onClick={addSelectedService}><Plus size={15} /> Add</button>
            </div>
          )}

          <hr className="section-divider" />
          <h2>Provider acceptance</h2>
          <Field label="Full Name" required>
            <TextInput value={data.providerSignerName} disabled={locked} onChange={(event) => {
              set("providerSignerName", event.target.value);
              if (data.providerSignatureType === "typed") set("providerSignatureData", event.target.value);
            }} placeholder="Type your full legal name" />
          </Field>
          <Field label="Title" required>
            <TextInput value={data.providerSignerTitle} disabled={locked} onChange={(event) => set("providerSignerTitle", event.target.value)} placeholder="Title / role" />
          </Field>
          <div className="provider-signature-modes" role="group" aria-label="Signature method">
            <button type="button" disabled={locked} className={data.providerSignatureType === "drawn" ? "active" : ""} onClick={() => { set("providerSignatureType", "drawn"); set("providerSignatureData", ""); }}><PenLine size={15} /> Draw</button>
            <button type="button" disabled={locked} className={data.providerSignatureType === "typed" ? "active" : ""} onClick={() => { set("providerSignatureType", "typed"); set("providerSignatureData", data.providerSignerName); }}><Type size={15} /> Type</button>
          </div>
          {data.providerSignatureType === "drawn" ? (
            <SignaturePad value={data.providerSignatureData} disabled={locked} onChange={(value) => set("providerSignatureData", value)} />
          ) : (
            <div className="provider-typed-signature">{data.providerSignerName || "Your typed signature will appear here"}</div>
          )}
          <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
            <input type="checkbox" disabled={locked} checked={data.agreedElectronic} onChange={(event) => set("agreedElectronic", event.target.checked)} className="mt-0.5" />
            <span>{ELECTRONIC_RECORD_CONSENT_TEXT}</span>
          </label>

          {!locked && (
            <div className="provider-response-actions">
              <button type="button" disabled={busy} onClick={handleComplete} className="btn-base btn-navy w-full inline-flex items-center justify-center gap-2">
                <CheckCircle2 size={17} /> {busy ? "Completing…" : "Accept & Return to Occu-Med"}
              </button>
              <button type="button" disabled={busy} onClick={() => setShowDecline((current) => !current)} className="provider-decline-button"><Ban size={15} /> Decline document</button>
              {showDecline && <div className="provider-decline-panel"><label htmlFor="decline-reason">Reason (optional)</label><textarea id="decline-reason" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} maxLength={1000} placeholder="Tell Occu-Med why you are declining…" /><button type="button" disabled={busy} onClick={handleDecline}>Confirm decline</button></div>}
            </div>
          )}
        </aside>

        <div className="document-preview-wrap">
          <ProviderDocumentPreview ref={previewRef} data={data} invitationStatus={awaitingApproval ? "Pending Occu-Med Approval" : locked ? "Completed" : previewStatus} />
        </div>
      </div>
    </main>
  );
}
