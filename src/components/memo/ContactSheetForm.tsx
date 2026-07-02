import { useState } from "react";
import { NavyHeader } from "./Headers";
import { Field, Row, TextInput } from "./FormAtoms";
import { downloadPdf, generateContactSheetPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

interface Props {
  kind: "occu" | "provider";
}

const contactLine = (contact: { nameTitle: string; phone: string; email: string }) =>
  [contact.nameTitle, contact.phone, contact.email].filter(Boolean).join(" | ");

export const ContactSheetForm = ({ kind }: Props) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const [occu, setOccu] = useState({
    companyName: "Occu-Med, LTD",
    address: "2121 W Bullard Ave",
    cityStateZip: "Fresno, CA 93711",
    country: "United States of America",
    telephone: "(559) 435-2800",
    fax: "(800) 262-2863",
    mon: "7:30am to 4:30pm PST",
    tue: "7:30am to 4:30pm PST",
    wed: "7:30am to 4:30pm PST",
    thu: "7:30am to 4:30pm PST",
    fri: "7:30am to 4:30pm PST",
    sat: "CLOSED",
    sun: "CLOSED",
    contacts: [
      { role: "Network Management", nameTitle: "Matt Caskey | Director", phone: "x104", email: "mcaskey@occu-med.com" },
      { role: "Provider Relations", nameTitle: "Liz Zecchini | Manager", phone: "x153", email: "elizabeth.zecchini@occu-med.com" },
      { role: "EXAMQA", nameTitle: "Dana Tamayo | Director", phone: "x159", email: "dtamayo@occu-med.com" },
      { role: "Communications", nameTitle: "", phone: "x172", email: "communicationsmanager@occu-med.com" },
      { role: "Scheduling", nameTitle: "Liz Mathies | Director", phone: "x151", email: "elizabeth.mathies@occu-med.com" },
      { role: "Operations", nameTitle: "Chase Coyle | Director", phone: "x102", email: "ccoyle@occu-med.com" },
      { role: "Finance", nameTitle: "Alyson Tillery | Director", phone: "x116", email: "atillery@occu-med.com" },
    ],
  });

  const [provider, setProvider] = useState({
    clinicName: "",
    address: "",
    cityStateZip: "",
    telephone: "",
    fax: "",
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
    sat: "",
    sun: "",
    schedule: { nameTitle: "", phone: "", email: "", preferred: "" },
    examResult: { nameTitle: "", phone: "", email: "" },
    billing: { nameTitle: "", phone: "", email: "" },
    manager: { nameTitle: "", phone: "", email: "" },
    corporate: { nameTitle: "", phone: "", email: "" },
  });

  const title = kind === "occu" ? "Occu-Med Contact Information" : "Provider Contact Information";

  const handleDownload = async () => {
    setBusy(true);
    try {
      const fields = kind === "occu"
        ? [
            { label: "Company Name", value: occu.companyName },
            { label: "Address", value: occu.address },
            { label: "City, State Zip", value: occu.cityStateZip },
            { label: "Country", value: occu.country },
            { label: "Telephone", value: occu.telephone },
            { label: "Fax", value: occu.fax },
            { label: "Monday", value: occu.mon },
            { label: "Tuesday", value: occu.tue },
            { label: "Wednesday", value: occu.wed },
            { label: "Thursday", value: occu.thu },
            { label: "Friday", value: occu.fri },
            { label: "Saturday", value: occu.sat },
            { label: "Sunday", value: occu.sun },
            ...occu.contacts.map((c) => ({ label: `${c.role} - Name | Title | Telephone | Email`, value: contactLine(c) })),
          ]
        : [
            { label: "Clinic Name", value: provider.clinicName },
            { label: "Address", value: provider.address },
            { label: "City, State Zip", value: provider.cityStateZip },
            { label: "Telephone", value: provider.telephone },
            { label: "Fax", value: provider.fax },
            { label: "Hours", value: `Mon ${provider.mon} | Tue ${provider.tue} | Wed ${provider.wed} | Thu ${provider.thu} | Fri ${provider.fri} | Sat ${provider.sat} | Sun ${provider.sun}` },
            { label: "Schedule - Name/Title", value: provider.schedule.nameTitle },
            { label: "Schedule - Preferred Method", value: provider.schedule.preferred },
            { label: "Schedule - Phone", value: provider.schedule.phone },
            { label: "Schedule - Email", value: provider.schedule.email },
            { label: "Exam Result - Name/Title", value: provider.examResult.nameTitle },
            { label: "Exam Result - Phone", value: provider.examResult.phone },
            { label: "Exam Result - Email", value: provider.examResult.email },
            { label: "Billing - Name/Title", value: provider.billing.nameTitle },
            { label: "Billing - Phone", value: provider.billing.phone },
            { label: "Billing - Email", value: provider.billing.email },
            { label: "Manager/Supervisor - Name/Title", value: provider.manager.nameTitle },
            { label: "Manager/Supervisor - Phone", value: provider.manager.phone },
            { label: "Manager/Supervisor - Email", value: provider.manager.email },
            { label: "Corporate - Name/Title", value: provider.corporate.nameTitle },
            { label: "Corporate - Phone", value: provider.corporate.phone },
            { label: "Corporate - Email", value: provider.corporate.email },
          ];

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
          {kind === "occu" ? (
            <>
              <Row>
                <Field label="Company Name" required><TextInput value={occu.companyName} onChange={(e) => setOccu((s) => ({ ...s, companyName: e.target.value }))} /></Field>
                <Field label="Address" required><TextInput value={occu.address} onChange={(e) => setOccu((s) => ({ ...s, address: e.target.value }))} /></Field>
              </Row>
              <Row>
                <Field label="City, State Zip" required><TextInput value={occu.cityStateZip} onChange={(e) => setOccu((s) => ({ ...s, cityStateZip: e.target.value }))} /></Field>
                <Field label="Country"><TextInput value={occu.country} onChange={(e) => setOccu((s) => ({ ...s, country: e.target.value }))} /></Field>
              </Row>
              <Row>
                <Field label="Telephone"><TextInput value={occu.telephone} onChange={(e) => setOccu((s) => ({ ...s, telephone: e.target.value }))} /></Field>
                <Field label="Fax"><TextInput value={occu.fax} onChange={(e) => setOccu((s) => ({ ...s, fax: e.target.value }))} /></Field>
              </Row>
              <Field label="Hours of Operation Summary"><TextInput value={`${occu.mon} (Mon-Fri), ${occu.sat} (Sat), ${occu.sun} (Sun)`} readOnly /></Field>
              <hr className="section-divider" />
              {occu.contacts.map((c, i) => (
                <Row key={`${c.role}-${i}`}>
                  <Field label={`${c.role} (Name | Title)`}><TextInput value={c.nameTitle} onChange={(e) => setOccu((s) => ({ ...s, contacts: s.contacts.map((x, ix) => ix === i ? { ...x, nameTitle: e.target.value } : x) }))} /></Field>
                  <Field label="Phone / Ext"><TextInput value={c.phone} onChange={(e) => setOccu((s) => ({ ...s, contacts: s.contacts.map((x, ix) => ix === i ? { ...x, phone: e.target.value } : x) }))} /></Field>
                </Row>
              ))}
              {occu.contacts.map((c, i) => (
                <Field key={`${c.role}-email-${i}`} label={`${c.role} Email`}>
                  <TextInput type="email" value={c.email} onChange={(e) => setOccu((s) => ({ ...s, contacts: s.contacts.map((x, ix) => ix === i ? { ...x, email: e.target.value } : x) }))} />
                </Field>
              ))}
            </>
          ) : (
            <>
              <Row>
                <Field label="Clinic Name" required><TextInput value={provider.clinicName} onChange={(e) => setProvider((s) => ({ ...s, clinicName: e.target.value }))} /></Field>
                <Field label="Address" required><TextInput value={provider.address} onChange={(e) => setProvider((s) => ({ ...s, address: e.target.value }))} /></Field>
              </Row>
              <Row>
                <Field label="City, State Zip"><TextInput value={provider.cityStateZip} onChange={(e) => setProvider((s) => ({ ...s, cityStateZip: e.target.value }))} /></Field>
                <Field label="Telephone"><TextInput value={provider.telephone} onChange={(e) => setProvider((s) => ({ ...s, telephone: e.target.value }))} /></Field>
              </Row>
              <Row>
                <Field label="Fax"><TextInput value={provider.fax} onChange={(e) => setProvider((s) => ({ ...s, fax: e.target.value }))} /></Field>
                <Field label="Preferred Method (phone/fax/email)"><TextInput value={provider.schedule.preferred} onChange={(e) => setProvider((s) => ({ ...s, schedule: { ...s.schedule, preferred: e.target.value } }))} /></Field>
              </Row>

              <hr className="section-divider" />
              <h3 className="text-base font-semibold text-[hsl(var(--label))] mb-2">Schedule Contact</h3>
              <Row>
                <Field label="Name, Title"><TextInput value={provider.schedule.nameTitle} onChange={(e) => setProvider((s) => ({ ...s, schedule: { ...s.schedule, nameTitle: e.target.value } }))} /></Field>
                <Field label="Phone"><TextInput value={provider.schedule.phone} onChange={(e) => setProvider((s) => ({ ...s, schedule: { ...s.schedule, phone: e.target.value } }))} /></Field>
              </Row>
              <Field label="Email"><TextInput type="email" value={provider.schedule.email} onChange={(e) => setProvider((s) => ({ ...s, schedule: { ...s.schedule, email: e.target.value } }))} /></Field>

              {[
                ["Exam Result", "examResult"],
                ["Billing", "billing"],
                ["Manager / Supervisor", "manager"],
                ["Corporate", "corporate"],
              ].map(([label, key]) => {
                const section = provider[key as keyof typeof provider] as { nameTitle: string; phone: string; email: string };
                return (
                  <div key={key}>
                    <h3 className="text-base font-semibold text-[hsl(var(--label))] mt-4 mb-2">{label}</h3>
                    <Row>
                      <Field label="Name, Title"><TextInput value={section.nameTitle} onChange={(e) => setProvider((s) => ({ ...s, [key]: { ...section, nameTitle: e.target.value } }))} /></Field>
                      <Field label="Phone"><TextInput value={section.phone} onChange={(e) => setProvider((s) => ({ ...s, [key]: { ...section, phone: e.target.value } }))} /></Field>
                    </Row>
                    <Field label="Email"><TextInput type="email" value={section.email} onChange={(e) => setProvider((s) => ({ ...s, [key]: { ...section, email: e.target.value } }))} /></Field>
                  </div>
                );
              })}
            </>
          )}
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
