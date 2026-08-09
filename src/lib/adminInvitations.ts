import type { ProviderDocumentType, ProviderInvitationStatus } from "@/types/memo";

export const ADMIN_STATUS_LABELS: Record<ProviderInvitationStatus, string> = {
  draft: "Ready to send",
  sent: "Sent",
  viewed: "Opened",
  returned: "Needs review",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function invitationStatusLabel(status: ProviderInvitationStatus) {
  return ADMIN_STATUS_LABELS[status];
}

export function adminDocumentLabel(documentType: ProviderDocumentType) {
  return documentType === "fee-proposal" ? "Fee Proposal" : "Service Agreement";
}

export function formatAdminDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
