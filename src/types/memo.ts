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
  providerSignatureType: "typed" | "drawn";
  providerSignatureData: string;
  providerSignedDate: string;
  agreedElectronic: boolean;
  electronicConsentText: string;
}

export interface ProviderInvitation {
  documentType: ProviderDocumentType;
  status: ProviderInvitationStatus;
  data: ProviderDocumentData;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  originalDocumentHash?: string;
  electronicRecordConsentText?: string;
}

export type ProviderInvitationStatus = "draft" | "sent" | "viewed" | "returned" | "completed" | "declined" | "expired" | "cancelled";

export interface AdminInvitationSummary {
  id: string;
  documentType: ProviderDocumentType;
  status: ProviderInvitationStatus;
  providerName: string;
  documentNumber: string;
  recipientEmail: string;
  createdAt: string;
  expiresAt: string;
  viewedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  legalHold: boolean;
  retentionExpiresAt?: string;
  hasCompletedDocument: boolean;
}

export interface InvitationEvidenceVerification {
  valid: boolean;
  originalDocumentHashValid: boolean | null;
  finalPdfHashValid: boolean | null;
  evidenceHashValid: boolean | null;
  auditChainValid: boolean;
}

export interface ProviderInvitationEvent {
  eventType: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  previousHash?: string;
  eventHash: string;
  createdAt: string;
}

export interface AdminInvitationDetail extends AdminInvitationSummary {
  data: ProviderDocumentData;
  originalData: ProviderDocumentData;
  pdfHash?: string;
  originalDocumentHash?: string;
  evidenceHash?: string;
  signatureHash?: string;
  signatureType?: "typed" | "drawn";
  consentText?: string;
  verification: InvitationEvidenceVerification;
  events: ProviderInvitationEvent[];
}

export interface AdminInvitationList {
  items: AdminInvitationSummary[];
  counts: Record<ProviderInvitationStatus | "all", number>;
}

export type AdminRole = "owner" | "manager" | "sender" | "auditor";
export type AdminPermission =
  | "view_documents"
  | "create_documents"
  | "manage_invitations"
  | "approve_terms"
  | "download_documents"
  | "manage_users"
  | "manage_retention"
  | "export_backups"
  | "view_security_audit";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthAuditEvent {
  eventType: string;
  details: Record<string, unknown>;
  email?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RetentionPolicy {
  completedDocumentDays: number;
  inactiveInvitationDays: number;
  authAuditDays: number;
  updatedAt: string;
  preview: {
    completedEligible: number;
    inactiveEligible: number;
    legalHolds: number;
  };
}

export interface CertificateVerification {
  verified: boolean;
  status: ProviderInvitationStatus;
  documentType: ProviderDocumentType;
  documentNumber: string;
  providerName: string;
  signerName: string;
  signatureType: "typed" | "drawn";
  signedAt: string;
  approvedAt?: string;
  finalPdfHash: string;
  evidenceHash: string;
  checks: {
    originalDocument: boolean | null;
    finalPdf: boolean | null;
    signatureEvidence: boolean | null;
    auditChain: boolean;
  };
}
