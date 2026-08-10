import type {
  ProviderDocumentData,
  ProviderDocumentType,
  ProviderServiceRow,
} from "@/types/memo";

export const SERVICE_AGREEMENT_SECTIONS = [
  {
    title: "Scheduling Process",
    body: "An Occu-Med team member will coordinate each appointment with the provider's preferred point of contact. Before the patient arrives, Occu-Med will send an authorization containing the patient's demographic information, client and invoicing information, and the services authorized for that visit.",
  },
  {
    title: "Reporting Process",
    body: "After the authorized services are completed, results and associated paperwork should be sent promptly to harvesting@occu-med.com. Results should be reported as they become available unless Occu-Med provides different instructions for a specific referral.",
  },
  {
    title: "Billing Terms",
    body: "Occu-Med will pay undisputed, itemized invoices according to the billing terms shown in this agreement. The payment period begins when Occu-Med receives an invoice that accurately reflects the authorized services performed at the agreed rates. Invoices should be sent to Finance@occu-med.com.",
  },
] as const;

export const ELECTRONIC_RECORD_CONSENT_TEXT =
  "I agree to use electronic records and electronic signatures for this document and understand that my electronic signature has the same legal effect as a handwritten signature.";

let rowCounter = 0;

export function createProviderServiceRow(
  component = "",
  price = "",
  source: ProviderServiceRow["source"] = "occu-med",
): ProviderServiceRow {
  rowCounter += 1;
  return {
    id: `provider-service-${Date.now()}-${rowCounter}`,
    component,
    price,
    source,
  };
}

export function createProviderDocumentData(documentType: ProviderDocumentType): ProviderDocumentData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    documentType,
    documentNumber: `OM-${documentType === "fee-proposal" ? "FP" : "PSA"}-${Date.now()
      .toString(36)
      .toUpperCase()}`,
    providerName: "",
    providerContactName: "",
    providerEmail: "",
    providerPhone: "",
    address: { street1: "", street2: "", city: "", state: "", zip: "" },
    preparedBy: "",
    preparedByTitle: "Network Management Analyst",
    issuedDate: today,
    expiresDate: "",
    billingTerms: "Net 30",
    services: [],
    notes: "",
    providerSignerName: "",
    providerSignerTitle: "",
    providerSignatureType: "typed",
    providerSignatureData: "",
    providerSignedDate: "",
    agreedElectronic: false,
    electronicConsentText: ELECTRONIC_RECORD_CONSENT_TEXT,
  };
}

export function documentTitle(documentType: ProviderDocumentType) {
  return documentType === "fee-proposal"
    ? "Provider Fee Proposal"
    : "Provider Service Agreement";
}

export function validateProviderDocument(
  data: ProviderDocumentData,
  options: { requireProviderSignature?: boolean } = {},
): string[] {
  const errors: string[] = [];
  if (!data.providerName.trim()) errors.push("Provider or facility name is required.");
  if (!data.issuedDate) errors.push("Issued date is required.");
  if (!data.billingTerms) errors.push("Billing terms are required.");
  if (!data.services.some((row) => row.component.trim())) {
    errors.push("Add at least one service.");
  }
  if (options.requireProviderSignature) {
    if (!data.providerSignerName.trim()) errors.push("Provider signer name is required.");
    if (!data.providerSignerTitle.trim()) errors.push("Provider signer title is required.");
    if (data.providerSignatureType === "drawn" && !data.providerSignatureData.startsWith("data:image/png;base64,")) {
      errors.push("Draw your signature before completing the document.");
    }
    if (!data.agreedElectronic) errors.push("Electronic signature consent is required.");
  }
  return errors;
}
