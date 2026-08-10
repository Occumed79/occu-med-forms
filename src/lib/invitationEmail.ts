import { adminDocumentLabel } from "@/lib/adminInvitations";
import type { ProviderDocumentType, ProviderPackageForm } from "@/types/memo";

export interface InvitationEmailDraft {
  fromName: string;
  fromEmail: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
}

export function createInvitationEmailDraft(input: {
  fromName: string;
  fromEmail: string;
  to?: string;
  providerName: string;
  providerContactName?: string;
  documentType: ProviderDocumentType;
  documentNumber: string;
  providerLink: string;
  includedForms?: ProviderPackageForm[];
}) {
  const documentLabel = adminDocumentLabel(input.documentType);
  const includedLabels = (input.includedForms || []).map((form) => form === "provider-contact-sheet" ? "Provider Contact Sheet" : "Occu-Med Contact Sheet");
  const packageContents = [documentLabel, ...includedLabels];
  const requestLabel = includedLabels.length ? "document package" : documentLabel.toLowerCase();
  const greeting = input.providerContactName?.trim()
    ? `Hello ${input.providerContactName.trim()},`
    : `Hello ${input.providerName.trim()} team,`;
  return {
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    to: input.to || "",
    cc: "",
    subject: `Occu-Med ${requestLabel} for ${input.providerName}`,
    body: `${greeting}

My name is ${input.fromName}, and I am contacting you on behalf of Occu-Med regarding a ${requestLabel} prepared for ${input.providerName}.

This package includes:
${packageContents.map((label) => `• ${label}`).join("\n")}

Please use the link below to review package ${input.documentNumber}. You can confirm the requested services and fees, complete the selected contact information, make any necessary changes, and return the completed package to Occu-Med.

${input.providerLink}

The link is specific to this selected package and does not provide access to any other Occu-Med forms or records. If you have any questions before completing it, please reply directly to this email.

Thank you,
${input.fromName}
Occu-Med Network Management
${input.fromEmail}`,
  } satisfies InvitationEmailDraft;
}

export function outlookComposeUrl(draft: InvitationEmailDraft) {
  const query = new URLSearchParams({
    to: draft.to.trim(),
    subject: draft.subject.trim(),
    body: draft.body,
  });
  if (draft.cc.trim()) query.set("cc", draft.cc.trim());
  return `https://outlook.office.com/mail/deeplink/compose?${query.toString()}`;
}

export function copiedInvitationEmail(draft: InvitationEmailDraft) {
  const headers = [
    `From: ${draft.fromName} <${draft.fromEmail}>`,
    `To: ${draft.to}`,
    draft.cc.trim() ? `Cc: ${draft.cc.trim()}` : "",
    `Subject: ${draft.subject}`,
  ].filter(Boolean);
  return `${headers.join("\n")}\n\n${draft.body}`;
}
