import { useState } from "react";
import { AuroraHeader } from "./Headers";
import { Field, Row, TextInput, Select, Textarea } from "./FormAtoms";
import { AddressBlock } from "./AddressBlock";
import { downloadPdf, generateNetworkPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import type { NetworkMemoData } from "@/types/memo";

const initial: NetworkMemoData = {
  analystName: "",
  directorName: "",
  dateOfMemo: "",
  dateOfPricingReceived: "",
  sourceOfPricing: "",
  clinicRepName: "",
  methodOfComm: "",
  notes: "",
  address: { street1: "", street2: "", city: "", state: "", zip: "" },
  existingOrNew: "",
  pricingType: "",
  acquisitionType: "",
  clinicType: "",
  client: "",
};

const CLINIC_TYPES_GROUPED: { label: string; options: string[] }[] = [
  { label: "Medical / Dental Providers", options: ["State Side Dental Provider","State Side Medical Provider","Occu-VAX State Side","International Medical Provider","International Dental Provider","Occu-Vax International"] },
  { label: "Specialist Evaluations", options: ["Neurologist","Orthopaedist","Psychiatrist","Optometrist or Ophthalmologist","Gastroenterology Fitness-for-Duty Evaluation"] },
  { label: "Physical / Fitness Exams", options: ["FAA Physical","DOT Exam and Certificate","RTW Physical","Physical Ability Test","Psychological Assessment","Breast Examination","Sigmoidoscopy"] },
  { label: "Cardiac / Pulmonary", options: ["Treadmill Stress Test","EKG","Stress ECHO or SPECT Scan","Pulmonary Function Test"] },
  { label: "Respirator Testing", options: ["Respirator Fit Test","OSHA Respirator Medical Evaluation","N95 Respirator Certification / Fit Test","Quantitative Respirator Fit Test"] },
  { label: "Imaging", options: ["Chest X-ray","Mammogram w/ Interpretation","Gallbladder Ultrasound"] },
  { label: "Labs / Collections", options: ["Blood Collection","Urine Drug Screen Collection","After Hours Drug Screen","DNA Collection","PPD","Breath Alcohol Test (BAT)"] },
  { label: "Vision", options: ["Vision","Farnsworth D-15"] },
  { label: "Other", options: ["Collection Site"] },
];

export const NetworkMemoForm = () => {
  const [data, setData] = useState<NetworkMemoData>(initial);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const set = <K extends keyof NetworkMemoData>(k: K, v: NetworkMemoData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleDownload = async () => {
    setBusy(true);
    try {
      const bytes = await generateNetworkPdf(data);
      downloadPdf(bytes, `network-memo-${data.dateOfMemo || Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: "Network management memo saved." });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-card">
      <AuroraHeader title="Network Management Pricing Memo" />
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
          <Field label="Existing or New Clinic" required>
            <Select value={data.existingOrNew} onChange={(e) => set("existingOrNew", e.target.value)}>
              <option value="" disabled></option>
              <option>Existing Clinic</option>
              <option>New Clinic</option>
            </Select>
          </Field>
          <Field label="Updated Pricing or New Pricing" required>
            <Select value={data.pricingType} onChange={(e) => set("pricingType", e.target.value)}>
              <option value="" disabled></option>
              <option>Updated Pricing</option>
              <option>New Pricing</option>
            </Select>
          </Field>
        </Row>

        <Field label="Acquisition Type" required>
          <Select value={data.acquisitionType} onChange={(e) => set("acquisitionType", e.target.value)}>
            <option value="" disabled></option>
            <option>New Clinic</option>
            <option>Existing Clinic Replacement</option>
            <option>Pricing Agreement Update</option>
            <option>Special Request</option>
            <option>Proactive Effort</option>
          </Select>
        </Field>

        <Field label="Notes or Context Regarding the Pricing Received" required>
          <Textarea placeholder="Relevant context, special conditions, background…" value={data.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <hr className="section-divider" />

        <Field label="Clinic Address" required>
          <AddressBlock value={data.address} onChange={(a) => set("address", a)} />
        </Field>

        <Row>
          <Field label="Clinic Type">
            <Select value={data.clinicType} onChange={(e) => set("clinicType", e.target.value)}>
              <option value="" disabled>Select type…</option>
              {CLINIC_TYPES_GROUPED.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => <option key={o}>{o}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Client">
            <TextInput placeholder="Associated client name" value={data.client} onChange={(e) => set("client", e.target.value)} />
          </Field>
        </Row>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 px-9 py-5 border-t border-border print-hide">
        <button type="button" onClick={handleDownload} disabled={busy} className="btn-base btn-aurora disabled:opacity-60">
          {busy ? "Generating…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
};
