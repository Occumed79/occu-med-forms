import { useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput } from "./FormAtoms";
import { downloadPdf, generateContactSheetPdf } from "@/lib/pdf";
import { occuMedContactSheetAttachment, providerContactSheetAttachment } from "@/lib/contactSheetAttachments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  kind: "occu" | "provider";
}

type ContactField = { label: string; value: string };

const pairs = <T,>(items: T[]) => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
};

const isHourField = (label: string) =>
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(label);

const isContactField = (label: string) => label.includes(" - Name | Title | Telephone | Email");

export const ContactSheetForm = ({ kind }: Props) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const initial = kind === "occu" ? occuMedContactSheetAttachment() : providerContactSheetAttachment();
  const [fields, setFields] = useState<ContactField[]>(initial.fields);
  const title = initial.title;

  const updateField = (label: string, value: string) => {
    setFields((current) => current.map((field) => field.label === label ? { ...field, value } : field));
  };

  const fieldValue = (label: string) => fields.find((field) => field.label === label)?.value || "";

  const baseFields = fields.filter((field) => !isHourField(field.label) && !isContactField(field.label));
  const hourFields = fields.filter((field) => isHourField(field.label));
  const contactFields = fields.filter((field) => isContactField(field.label));

  const handleDownload = async () => {
    setBusy(true);
    try {
      const bytes = await generateContactSheetPdf(title, fields);
      downloadPdf(bytes, `${kind}-contact-sheet-${Date.now()}.pdf`);
      toast({ title: "PDF downloaded", description: `${title} exported.` });
    } catch (e) {
      toast({ title: "Failed to generate PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-navy max-w-[1180px] mx-auto">
      <div className="form-card" style={{ maxWidth: "none" }}>
        <NavyHeader title={title} />
        <div className="form-body">
          {pairs(baseFields).map((row, index) => (
            <Row key={`base-${index}`}>
              {row.map((field) => (
                <Field key={field.label} label={field.label} required={field.label.includes("Name") || field.label === "Address"}>
                  <TextInput value={fieldValue(field.label)} onChange={(e) => updateField(field.label, e.target.value)} />
                </Field>
              ))}
            </Row>
          ))}

          <hr className="section-divider" />
          <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-2">Hours of Operation</h3>
          {pairs(hourFields).map((row, index) => (
            <Row key={`hours-${index}`}>
              {row.map((field) => (
                <Field key={field.label} label={field.label}>
                  <TextInput value={fieldValue(field.label)} onChange={(e) => updateField(field.label, e.target.value)} />
                </Field>
              ))}
            </Row>
          ))}

          <hr className="section-divider" />
          <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-2">Points of Contact</h3>
          {contactFields.map((field) => (
            <Field key={field.label} label={field.label.replace(" - Name | Title | Telephone | Email", "") }>
              <TextInput
                value={fieldValue(field.label)}
                placeholder={field.label.includes("Preferred Method") ? "Name | Title | Phone/Ext | Email | Preferred Method" : "Name | Title | Phone/Ext | Email"}
                onChange={(e) => updateField(field.label, e.target.value)}
              />
            </Field>
          ))}
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
