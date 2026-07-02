export type AttachmentPage = { title: string; fields: Array<{ label: string; value: string }> };

export const occuMedContactSheetAttachment = (): AttachmentPage => ({
  title: "Occu-Med Contact Information",
  fields: [
    { label: "Company Name", value: "Occu-Med, LTD" },
    { label: "Address", value: "2121 W Bullard Ave" },
    { label: "City, State Zip", value: "Fresno, CA 93711" },
    { label: "Country", value: "United States of America" },
    { label: "Telephone", value: "(559) 435-2800" },
    { label: "Fax", value: "(800) 262-2863" },
    { label: "Monday", value: "7:30am to 4:30pm PST" },
    { label: "Tuesday", value: "7:30am to 4:30pm PST" },
    { label: "Wednesday", value: "7:30am to 4:30pm PST" },
    { label: "Thursday", value: "7:30am to 4:30pm PST" },
    { label: "Friday", value: "7:30am to 4:30pm PST" },
    { label: "Saturday", value: "CLOSED" },
    { label: "Sunday", value: "CLOSED" },
    { label: "Network Management - Name | Title | Telephone | Email", value: "Matt Caskey | Director | x104 | mcaskey@occu-med.com" },
    { label: "Provider Relations - Name | Title | Telephone | Email", value: "Liz Zecchini | Manager | x153 | elizabeth.zecchini@occu-med.com" },
    { label: "EXAMQA - Name | Title | Telephone | Email", value: "Dana Tamayo | Director | x159 | dtamayo@occu-med.com" },
    { label: "Communications - Name | Title | Telephone | Email", value: "x172 | communicationsmanager@occu-med.com" },
    { label: "Scheduling - Name | Title | Telephone | Email", value: "Liz Mathies | Director | x151 | elizabeth.mathies@occu-med.com" },
    { label: "Operations - Name | Title | Telephone | Email", value: "Chase Coyle | Director | x102 | ccoyle@occu-med.com" },
    { label: "Finance - Name | Title | Telephone | Email", value: "Alyson Tillery | Director | x116 | atillery@occu-med.com" },
  ],
});

export const providerContactSheetAttachment = (): AttachmentPage => ({
  title: "Provider Contact Sheet",
  fields: [
    { label: "Clinic Name", value: "" },
    { label: "Address", value: "" },
    { label: "City, State Zip", value: "" },
    { label: "Telephone", value: "" },
    { label: "Fax", value: "" },
    { label: "Schedule - Name/Title", value: "" },
    { label: "Schedule - Preferred Method", value: "" },
    { label: "Schedule - Phone", value: "" },
    { label: "Schedule - Email", value: "" },
  ],
});
