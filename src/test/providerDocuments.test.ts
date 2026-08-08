import { describe, expect, it } from "vitest";
import {
  createProviderDocumentData,
  createProviderServiceRow,
  documentTitle,
  validateProviderDocument,
} from "@/lib/providerDocuments";

describe("provider document workflow", () => {
  it("creates the two supported document variants with stable defaults", () => {
    const proposal = createProviderDocumentData("fee-proposal");
    const agreement = createProviderDocumentData("service-agreement");

    expect(proposal.documentType).toBe("fee-proposal");
    expect(proposal.documentNumber).toMatch(/^OM-FP-/);
    expect(proposal.billingTerms).toBe("Net 30");
    expect(agreement.documentNumber).toMatch(/^OM-PSA-/);
    expect(documentTitle(agreement.documentType)).toBe("Provider Service Agreement");
  });

  it("requires provider and service data before an invitation can be created", () => {
    const data = createProviderDocumentData("fee-proposal");
    expect(validateProviderDocument(data)).toEqual([
      "Provider or facility name is required.",
      "Add at least one service.",
    ]);

    data.providerName = "Example Occupational Health";
    data.services = [createProviderServiceRow("Audiogram", "$85.00")];
    expect(validateProviderDocument(data)).toEqual([]);
  });

  it("requires signer identity and electronic consent at provider completion", () => {
    const data = createProviderDocumentData("service-agreement");
    data.providerName = "Example Occupational Health";
    data.services = [createProviderServiceRow("Physical Exam", "$125.00")];

    expect(validateProviderDocument(data, { requireProviderSignature: true })).toEqual([
      "Provider signer name is required.",
      "Provider signer title is required.",
      "Electronic signature consent is required.",
    ]);

    data.providerSignerName = "Jordan Provider";
    data.providerSignerTitle = "Practice Manager";
    data.agreedElectronic = true;
    expect(validateProviderDocument(data, { requireProviderSignature: true })).toEqual([]);
  });

  it("tracks whether a service was added by Occu-Med or the provider", () => {
    expect(createProviderServiceRow("Spirometry", "$70.00").source).toBe("occu-med");
    expect(createProviderServiceRow("Chest X-ray", "$110.00", "provider").source).toBe("provider");
  });
});
