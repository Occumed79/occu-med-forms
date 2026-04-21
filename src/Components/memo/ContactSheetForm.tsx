import { useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput, Textarea } from "./FormAtoms";
import { downloadPdf, generateContactSheetPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

interface Props {
  kind: "occu" | "provider";
}

export const ContactSheetForm = ({ kind }: Props) => {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({
    organization: kind === "occu" ? "Occu-Med" : "",
    contactName: "",
    title: "",
    phone: "",
    alternatePhone: "",
    email: "",
    billingEmail: "",
    fax: "",
    website: "",
    address: "",
    notes: "",
  });
  const { toast } = useToast();

  const title = kind === "occu" ? "Occu-Med Contact Information" : "Provider Contact Information";

  const handleDownload = async () => {
    setBusy(true);
    try {
      const bytes = await generateContactSheetPdf(title, [
        { label: "Organization", value: data.organization },
        { label: "Primary Contact Name", value: data.contactName },
        { label: "Title", value: data.title },
        { label: "Phone", value: data.phone },
        { label: "Alternate Phone", value: data.alternatePhone },
        { label: "Email", value: data.email },
        { label: "Billing Email", value: data.billingEmail },
        { label: "Fax", value: data.fax },
        { label: "Website", value: data.website },
        { label: "Address", value: data.address },
        { label: "Notes", value: data.notes },
      ]);
      downloadPdf(bytes, `${kind}-contact-sheet-${Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: `${title} exported.` });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof data, v: string) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="theme-navy max-w-[980px] mx-auto">
      <div className="form-card" style={{ maxWidth: "none" }}>
        <NavyHeader title={title} />
        <div className="form-body">
          <Row>
            <Field label="Organization" required>
              <TextInput value={data.organization} onChange={(e) => set("organization", e.target.value)} />
            </Field>
            <Field label="Primary Contact Name" required>
              <TextInput value={data.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Title">
              <TextInput value={data.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Email" required>
              <TextInput type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Phone" required>
              <TextInput value={data.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Alternate Phone">
              <TextInput value={data.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Billing Email">
              <TextInput type="email" value={data.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} />
            </Field>
            <Field label="Fax">
              <TextInput value={data.fax} onChange={(e) => set("fax", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Website">
              <TextInput value={data.website} onChange={(e) => set("website", e.target.value)} />
            </Field>
            <Field label="Address">
              <TextInput value={data.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </Row>
          <Field label="Notes">
            <Textarea value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end border-t border-border px-9 py-5">
          <button type="button" onClick={handleDownload} disabled={busy} className="btn-base btn-navy disabled:opacity-60">
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};
