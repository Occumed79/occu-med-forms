import { useEffect, useRef, useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { PriceTable } from "./PriceTable";
import { ComponentSidebar } from "./ComponentSidebar";
import { FACILITY_TYPES, PROVIDER_SPECIALTIES } from "@/data/examComponents";
import {
  appendAttachmentPages,
  downloadPdf,
  generateSignedClinicPdf,
  generateCertificate,
  sha256,
} from "@/lib/pdf";
import {
  apiCreateEnvelope,
  apiFinalizeEnvelope,
  apiLogView,
  base64PdfToBytes,
} from "@/lib/backend";
import { useToast } from "@/hooks/use-toast";
import type { PriceRow, SignedClinicMemoData } from "@/types/memo";
import { occuMedContactSheetAttachment, providerContactSheetAttachment } from "@/lib/contactSheetAttachments";

const initial: SignedClinicMemoData = {
  analystName: "",
  directorName: "",
  dateOfMemo: "",
  dateOfPricingReceived: "",
  billingTerms: "Net 30",
  sourceOfPricing: "",
  clinicRepName: "",
  methodOfComm: "",
  notes: "",
  address: { street1: "", street2: "", city: "", state: "", zip: "" },
  newOrExistingProvider: "",
  newOrUpdatedPricing: "",
  providerSpecialty: "",
  facilityType: "",
  priceRows: [],
  occuMedRepTitle: "Network Management Analyst",
  occuMedRepName: "",
  occuMedRepDate: "",
  clinicRepTitle: "",
  clinicRepFullName: "",
  clinicRepDate: "",
  agreedElectronic: false,
};

let _id = 0;
const newId = () => `row-${Date.now()}-${++_id}`;

export const SignedClinicMemoForm = () => {
  const [data, setData] = useState<SignedClinicMemoData>(initial);
  const [busy, setBusy] = useState(false);
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const viewedAtRef = useRef<string | undefined>(undefined);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [includeOccuContactAttachment, setIncludeOccuContactAttachment] = useState(false);
  const [includeProviderContactAttachment, setIncludeProviderContactAttachment] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const created = await apiCreateEnvelope();
        setEnvelopeId(created.envelopeId);

        const viewed = await apiLogView(created.envelopeId);
        viewedAtRef.current = viewed.viewedAt;
      } catch (e) {
        console.warn("Backend envelope bootstrap failed", e);
        setBackendWarning(
          "The signed-envelope service is currently unavailable. You can still complete and download an unverified local PDF + certificate, but no authoritative envelope or audit trail will be recorded until the backend (VITE_API_BASE_URL) and Supabase are configured.",
        );
      }
    })();
  }, []);

  const set = <K extends keyof SignedClinicMemoData>(k: K, v: SignedClinicMemoData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const addComponent = (name: string) => {
    const row: PriceRow = { id: newId(), component: name, price: "" };
    set("priceRows", [...data.priceRows, row]);
  };

  const withAttachments = async (pdfBytes: Uint8Array) => {
    const attachmentPages: { title: string; fields: Array<{ label: string; value: string }> }[] = [];
    if (includeOccuContactAttachment) attachmentPages.push(occuMedContactSheetAttachment());
    if (includeProviderContactAttachment) attachmentPages.push(providerContactSheetAttachment());
    return attachmentPages.length ? await appendAttachmentPages(pdfBytes, attachmentPages) : pdfBytes;
  };

  const signLocally = async (finalData: SignedClinicMemoData) => {
    const localEnvelopeId = envelopeId || `OM-LOCAL-${Date.now()}`;
    const basePdf = await generateSignedClinicPdf(finalData, localEnvelopeId);
    const finalPdfBytes = await withAttachments(basePdf);
    const pdfHash = await sha256(finalPdfBytes);
    const signedAt = new Date().toISOString();
    const certBytes = await generateCertificate(localEnvelopeId, pdfHash, {
      createdAt: signedAt,
      viewedAt: viewedAtRef.current,
      signedAt,
      ipAddress: "Not captured (local copy)",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      occuMedRepName: finalData.occuMedRepName,
      clinicRepFullName: finalData.clinicRepFullName,
      agreedElectronic: finalData.agreedElectronic,
    });
    downloadPdf(finalPdfBytes, `${localEnvelopeId}-signed.pdf`);
    setTimeout(() => downloadPdf(certBytes, `${localEnvelopeId}-certificate.pdf`), 400);
    setBackendWarning(
      "The signing service is unavailable, so an unverified local PDF and certificate were generated. No authoritative envelope or audit record was created.",
    );
    toast({
      title: "Saved local copy",
      description: `Local document ${localEnvelopeId} downloaded. This copy is unverified — the backend recorded no envelope or audit trail.`,
    });
  };

  const validateForSignature = () => {
    if (!data.agreedElectronic) {
      toast({
        title: "Consent required",
        description: "Please authorize electronic signatures and records before signing.",
        variant: "destructive",
      });
      return false;
    }
    if (!data.clinicRepFullName.trim() || !data.occuMedRepName.trim()) {
      toast({
        title: "Signatures required",
        description: "Both Occu-Med and Clinic representative names are required.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSign = async () => {
    if (!validateForSignature()) return;

    setBusy(true);
    const finalData: SignedClinicMemoData = {
      ...data,
      billingTerms: "Net 30",
      occuMedRepDate: data.occuMedRepDate || new Date().toISOString().slice(0, 10),
      clinicRepDate: data.clinicRepDate || new Date().toISOString().slice(0, 10),
    };
    try {
      let activeEnvelopeId = envelopeId;
      if (!activeEnvelopeId) {
        const created = await apiCreateEnvelope();
        activeEnvelopeId = created.envelopeId;
        setEnvelopeId(created.envelopeId);
      }

      const finalized = await apiFinalizeEnvelope(activeEnvelopeId, {
        data: finalData,
        viewedAt: viewedAtRef.current,
        recipientEmail: recipientEmail || undefined,
      });

      const pdfBytes = base64PdfToBytes(finalized.pdfBase64);
      const finalPdfBytes = await withAttachments(pdfBytes);
      const certBytes = base64PdfToBytes(finalized.certificateBase64);
      downloadPdf(finalPdfBytes, `${finalized.envelopeId}-signed.pdf`);
      setTimeout(() => downloadPdf(certBytes, `${finalized.envelopeId}-certificate.pdf`), 400);

      setBackendWarning("");
      toast({
        title: "Signed & sealed",
        description: `Envelope ${finalized.envelopeId} finalized. Hash ${finalized.pdfHash.slice(0, 16)}…`,
      });
    } catch (e) {
      console.warn("Signed envelope backend failed; generating local copy", e);
      try {
        await signLocally(finalData);
      } catch (localErr) {
        toast({ title: "Signing failed", description: String(localErr), variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: "Recipient email required", description: "Enter an email address before sending.", variant: "destructive" });
      return;
    }
    await handleSign();
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const draftEnvelopeId = envelopeId || `OM-DRAFT-${Date.now()}`;
      const basePdf = await generateSignedClinicPdf({ ...data, billingTerms: "Net 30" }, draftEnvelopeId);
      const finalPdfBytes = await withAttachments(basePdf);
      downloadPdf(finalPdfBytes, `${draftEnvelopeId}-draft.pdf`);
      toast({ title: "Downloaded", description: "Document downloaded." });
    } catch (e) {
      toast({ title: "Download failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start">
      <ComponentSidebar onAdd={(c) => addComponent(c.name)} />

      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <NavyHeader title="Occu-Med, LTD\nProvider Service Agreement" />
        <div className="form-body">
          {backendWarning && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {backendWarning}
            </div>
          )}

          <Row>
            <Field label="Pricing Established" required>
              <TextInput type="date" value={data.dateOfMemo} onChange={(e) => set("dateOfMemo", e.target.value)} />
            </Field>
            <Field label="Pricing Expires" required>
              <TextInput type="date" value={data.dateOfPricingReceived} onChange={(e) => set("dateOfPricingReceived", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="New or Existing Provider" required>
              <Select value={data.newOrExistingProvider} onChange={(e) => set("newOrExistingProvider", e.target.value)}>
                <option value="" disabled></option>
                <option>New Provider</option>
                <option>Existing Provider</option>
              </Select>
            </Field>
            <Field label="New or Updated Pricing" required>
              <Select value={data.newOrUpdatedPricing} onChange={(e) => set("newOrUpdatedPricing", e.target.value)}>
                <option value="" disabled></option>
                <option>New Pricing</option>
                <option>Updated Pricing</option>
              </Select>
            </Field>
          </Row>

          <Row>
            <Field label="Provider Specialty / Practice">
              <Select value={data.providerSpecialty} onChange={(e) => set("providerSpecialty", e.target.value)}>
                <option value="" disabled>Select specialty…</option>
                {PROVIDER_SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Facility Type">
              <Select value={data.facilityType} onChange={(e) => set("facilityType", e.target.value)}>
                <option value="" disabled>Select facility…</option>
                {FACILITY_TYPES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </Row>

          <Field label="Provider Address" required>
            <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
          </Field>

          <Field label="Pricing">
            <PriceTable rows={data.priceRows} onChange={(rows) => set("priceRows", rows)} />
          </Field>
          <div className="text-[11px] text-muted-foreground mt-2 mb-2">
            Prices listed are inclusive of all fees and service charges.
          </div>

          <Field label="Additional Notes or Context Regarding Pricing">
            <Textarea
              placeholder="Relevant context, special conditions, background…"
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <hr className="section-divider" />
          <label className="flex items-center gap-2 text-sm mt-1 mb-2">
            <input type="checkbox" checked={includeOccuContactAttachment} onChange={(e) => setIncludeOccuContactAttachment(e.target.checked)} />
            Include attachment: Occu-Med Contact Information
          </label>
          <label className="flex items-center gap-2 text-sm mt-1 mb-2">
            <input type="checkbox" checked={includeProviderContactAttachment} onChange={(e) => setIncludeProviderContactAttachment(e.target.checked)} />
            Include attachment: Provider Contact Information
          </label>

          <hr className="section-divider" />
          <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-3">Signatures</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-md p-4 bg-background">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Occu-Med Representative
              </div>
              <div className="flex items-center gap-3 mb-3 p-3 rounded bg-[hsl(var(--navy-deep))] text-white">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {[3, 5, 7, 9, 11, 13, 15, 17].map((r) => (
                    <circle key={r} cx="22" cy="22" r={r} fill="none" />
                  ))}
                </svg>
                <div className="text-xs">
                  <div className="font-bold tracking-wide">OCCU-MED</div>
                  <div className="opacity-70">Verified Electronic Signature</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Select value={data.occuMedRepTitle} onChange={(e) => set("occuMedRepTitle", e.target.value)}>
                  <option>Network Management Analyst</option>
                  <option>Director of Network Management</option>
                  <option>Controller</option>
                </Select>
                <TextInput placeholder="Full name" value={data.occuMedRepName} onChange={(e) => set("occuMedRepName", e.target.value)} />
                <TextInput type="date" value={data.occuMedRepDate} onChange={(e) => set("occuMedRepDate", e.target.value)} />
              </div>
            </div>

            <div className="border border-border rounded-md p-4 bg-background">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Clinic Representative / Provider
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Type your full name to sign"
                  value={data.clinicRepFullName}
                  onChange={(e) => set("clinicRepFullName", e.target.value)}
                  className="w-full px-3 py-3 rounded bg-[hsl(var(--navy-orb-1)/0.06)] border border-[hsl(var(--navy-orb-1)/0.3)] font-satisfy text-2xl text-[hsl(var(--navy-deep))] focus:outline-none focus:border-[hsl(var(--navy-orb-1))]"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <TextInput placeholder="Title (e.g., Office Manager)" value={data.clinicRepTitle} onChange={(e) => set("clinicRepTitle", e.target.value)} />
                <TextInput placeholder="Full name (typed)" value={data.clinicRepFullName} onChange={(e) => set("clinicRepFullName", e.target.value)} />
                <TextInput type="date" value={data.clinicRepDate} onChange={(e) => set("clinicRepDate", e.target.value)} />
              </div>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={data.agreedElectronic}
              onChange={(e) => set("agreedElectronic", e.target.checked)}
              className="mt-1 h-4 w-4 accent-[hsl(var(--navy-orb-1))]"
            />
            <span>
              I consent to receive, review, sign, and retain this transaction electronically, and I authorize
              the use of electronic signatures and electronic records in place of paper documents.
            </span>
          </label>

          <Field label="Recipient Email">
            <TextInput
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-9 py-5 border-t border-border print-hide">
          <button type="button" onClick={handleSign} disabled={busy} className="btn-base btn-navy disabled:opacity-60">
            {busy ? "Sealing…" : "Sign & Seal Document"}
          </button>
          <button type="button" onClick={handleSend} disabled={busy} className="btn btn-secondary disabled:opacity-60">
            Send
          </button>
          <button type="button" onClick={handleDownload} disabled={busy} className="btn btn-secondary disabled:opacity-60">
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
