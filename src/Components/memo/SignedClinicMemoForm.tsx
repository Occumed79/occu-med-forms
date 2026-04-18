import { useEffect, useRef, useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { PriceTable } from "./PriceTable";
import { ComponentSidebar } from "./ComponentSidebar";
import { FACILITY_TYPES, PROVIDER_SPECIALTIES } from "@/data/examComponents";
import {
  downloadPdf,
  generateCertificate,
  generateSignedClinicPdf,
  sha256,
} from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PriceRow, SignedClinicMemoData } from "@/types/memo";

const initial: SignedClinicMemoData = {
  analystName: "",
  directorName: "",
  dateOfMemo: "",
  dateOfPricingReceived: "",
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

function newEnvelopeId() {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rand).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `OM-${Date.now().toString(36).toUpperCase()}-${hex.toUpperCase()}`;
}

async function fetchIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const j = await res.json();
    return j.ip || "unknown";
  } catch {
    return "unknown";
  }
}

export const SignedClinicMemoForm = () => {
  const [data, setData] = useState<SignedClinicMemoData>(initial);
  const [busy, setBusy] = useState(false);
  const createdAtRef = useRef<string>(new Date().toISOString());
  const viewedAtRef = useRef<string | undefined>(undefined);
  const { toast } = useToast();

  // Capture "viewed" once on mount
  useEffect(() => {
    viewedAtRef.current = new Date().toISOString();
  }, []);

  const set = <K extends keyof SignedClinicMemoData>(k: K, v: SignedClinicMemoData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const addComponent = (name: string) => {
    const row: PriceRow = { id: newId(), component: name, price: "" };
    set("priceRows", [...data.priceRows, row]);
  };

  const handleSign = async () => {
    if (!data.agreedElectronic) {
      toast({
        title: "Agreement required",
        description: "Please agree to do business electronically before signing.",
        variant: "destructive",
      });
      return;
    }
    if (!data.clinicRepFullName.trim() || !data.occuMedRepName.trim()) {
      toast({
        title: "Signatures required",
        description: "Both Occu-Med and Clinic representative names are required.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const envelopeId = newEnvelopeId();
      const signedAt = new Date().toISOString();
      const ip = await fetchIp();
      const ua = navigator.userAgent;

      const finalData: SignedClinicMemoData = {
        ...data,
        occuMedRepDate: data.occuMedRepDate || signedAt.slice(0, 10),
        clinicRepDate: data.clinicRepDate || signedAt.slice(0, 10),
      };

      const pdfBytes = await generateSignedClinicPdf(finalData, envelopeId);
      const pdfHash = await sha256(pdfBytes);
      const certBytes = await generateCertificate(envelopeId, pdfHash, {
        createdAt: createdAtRef.current,
        viewedAt: viewedAtRef.current,
        signedAt,
        ipAddress: ip,
        userAgent: ua,
        occuMedRepName: finalData.occuMedRepName,
        clinicRepFullName: finalData.clinicRepFullName,
        agreedElectronic: finalData.agreedElectronic,
      });

      // Persist to Supabase (best effort — UI still works if these fail)
      try {
        const pdfPath = `${envelopeId}/document.pdf`;
        const certPath = `${envelopeId}/certificate.pdf`;
        const toBlob = (bytes: Uint8Array) => {
          const buf = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buf).set(bytes);
          return new Blob([buf], { type: "application/pdf" });
        };

        await supabase.storage.from("envelopes").upload(pdfPath, toBlob(pdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });
        await supabase.storage.from("envelopes").upload(certPath, toBlob(certBytes), {
          contentType: "application/pdf",
          upsert: true,
        });

        await supabase.from("envelopes").insert({
          envelope_id: envelopeId,
          pdf_hash: pdfHash,
          pdf_path: pdfPath,
          certificate_path: certPath,
          created_at: createdAtRef.current,
          viewed_at: viewedAtRef.current,
          signed_at: signedAt,
          ip_address: ip,
          user_agent: ua,
          occu_med_rep_name: finalData.occuMedRepName,
          occu_med_rep_title: finalData.occuMedRepTitle,
          clinic_rep_name: finalData.clinicRepFullName,
          clinic_rep_title: finalData.clinicRepTitle,
          agreed_electronic: finalData.agreedElectronic,
          payload: finalData as any,
        });
      } catch (err) {
        console.warn("Supabase persistence failed (UI still completed)", err);
        toast({
          title: "Saved locally",
          description: "Could not persist to Supabase yet — run the setup SQL in your dashboard.",
        });
      }

      downloadPdf(pdfBytes, `${envelopeId}-signed.pdf`);
      setTimeout(() => downloadPdf(certBytes, `${envelopeId}-certificate.pdf`), 400);

      toast({
        title: "Signed & sealed",
        description: `Envelope ${envelopeId} created. Document + certificate downloaded.`,
      });
    } catch (e) {
      toast({ title: "Signing failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start">
      <ComponentSidebar onAdd={(c) => addComponent(c.name)} />

      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <NavyHeader title="Clinic Pricing Memo (Signed)" />
        <div className="form-body">
          <Row>
            <Field label="Network Management Analyst Name" required>
              <TextInput placeholder="Full name" value={data.analystName} onChange={(e) => set("analystName", e.target.value)} />
            </Field>
            <Field label="Director of Network Management">
              <TextInput placeholder="Full name" value={data.directorName} onChange={(e) => set("directorName", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Date of Memo" required hint="dd-MMM-yyyy">
              <TextInput type="date" value={data.dateOfMemo} onChange={(e) => set("dateOfMemo", e.target.value)} />
            </Field>
            <Field label="Date of Pricing Received" required hint="dd-MMM-yyyy">
              <TextInput type="date" value={data.dateOfPricingReceived} onChange={(e) => set("dateOfPricingReceived", e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Source of Pricing" required>
              <TextInput placeholder="e.g. Email, Phone, Portal" value={data.sourceOfPricing} onChange={(e) => set("sourceOfPricing", e.target.value)} />
            </Field>
            <Field label="Clinic Representative Name">
              <TextInput placeholder="Contact name" value={data.clinicRepName} onChange={(e) => set("clinicRepName", e.target.value)} />
            </Field>
          </Row>

          <Field label="Method of Communication" required>
            <TextInput placeholder="e.g. Email, Phone, Fax" value={data.methodOfComm} onChange={(e) => set("methodOfComm", e.target.value)} />
          </Field>

          <hr className="section-divider" />

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

          <Field label="Provider Address" required>
            <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
          </Field>

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

          <hr className="section-divider" />

          <Field label="Pricing">
            <PriceTable rows={data.priceRows} onChange={(rows) => set("priceRows", rows)} />
          </Field>

          <Field label="Additional Notes or Context Regarding Pricing">
            <Textarea
              placeholder="Relevant context, special conditions, background…"
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <hr className="section-divider" />

          {/* Signatures */}
          <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-3">Signatures</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Occu-Med rep */}
            <div className="border border-border rounded-md p-4 bg-background">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Occu-Med Representative
              </div>
              <div className="flex items-center gap-3 mb-3 p-3 rounded bg-[hsl(var(--navy-deep))] text-white">
                {/* Stylized fingerprint pattern */}
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {[3,5,7,9,11,13,15,17].map((r) => (
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
                </Select>
                <TextInput placeholder="Full name" value={data.occuMedRepName} onChange={(e) => set("occuMedRepName", e.target.value)} />
                <TextInput type="date" value={data.occuMedRepDate} onChange={(e) => set("occuMedRepDate", e.target.value)} />
              </div>
            </div>

            {/* Clinic rep */}
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
              I agree to do business electronically with Occu-Med and consent to the use of electronic
              signatures and records for this transaction.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-9 py-5 border-t border-border print-hide">
          <div className="text-xs text-muted-foreground">
            On signing: an Envelope ID is assigned, the PDF is hashed (SHA-256), your IP address &amp; user
            agent are captured, and a Certificate of Completion is generated.
          </div>
          <button type="button" onClick={handleSign} disabled={busy} className="btn-base btn-navy disabled:opacity-60">
            {busy ? "Sealing…" : "Sign & Seal Document"}
          </button>
        </div>
      </div>
    </div>
  );
};
