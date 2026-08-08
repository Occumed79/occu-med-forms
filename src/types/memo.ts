// Shared types for memo forms
export interface AddressData {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

export interface PriceRow {
  id: string;
  component: string;
  price: string;
}

export interface BaseMemoData {
  analystName: string;
  directorName: string;
  dateOfMemo: string;
  dateOfPricingReceived: string;
  billingTerms: string;
  sourceOfPricing: string;
  clinicRepName: string;
  methodOfComm: string;
  notes: string;
  address: AddressData;
}

export interface NetworkMemoData extends BaseMemoData {
  existingOrNew: string;
  pricingType: string;
  acquisitionType: string;
  clinicType: string;
  client: string;
  priceRows: PriceRow[];
}

export interface ClinicMemoData extends BaseMemoData {
  newOrExistingProvider: string;
  newOrUpdatedPricing: string;
  providerSpecialty: string;
  facilityType: string;
  priceRows: PriceRow[];
}

export interface SignedClinicMemoData extends ClinicMemoData {
  occuMedRepTitle: string;
  occuMedRepName: string;
  occuMedRepDate: string;
  clinicRepTitle: string;
  clinicRepFullName: string;
  clinicRepDate: string;
  agreedElectronic: boolean;
}

export type ProviderDocumentType = "fee-proposal" | "service-agreement";

export interface ProviderServiceRow extends PriceRow {
  source: "occu-med" | "provider";
}

export interface ProviderDocumentData {
  documentType: ProviderDocumentType;
  documentNumber: string;
  providerName: string;
  providerContactName: string;
  providerEmail: string;
  providerPhone: string;
  address: AddressData;
  preparedBy: string;
  preparedByTitle: string;
  issuedDate: string;
  expiresDate: string;
  billingTerms: string;
  services: ProviderServiceRow[];
  notes: string;
  providerSignerName: string;
  providerSignerTitle: string;
  providerSignedDate: string;
  agreedElectronic: boolean;
}

export interface ProviderInvitation {
  documentType: ProviderDocumentType;
  status: "sent" | "viewed" | "completed" | "expired";
  data: ProviderDocumentData;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}
