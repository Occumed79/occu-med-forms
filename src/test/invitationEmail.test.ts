import { describe, expect, it } from "vitest";
import { copiedInvitationEmail, createInvitationEmailDraft, outlookComposeUrl } from "@/lib/invitationEmail";

describe("manual Outlook invitation email", () => {
  const draft = createInvitationEmailDraft({
    fromName: "Alex Ayvazian",
    fromEmail: "alex@occu-med.com",
    to: "provider@example.com",
    providerName: "Example Clinic",
    providerContactName: "Jordan",
    documentType: "fee-proposal",
    documentNumber: "OM-FP-1001",
    providerLink: "https://documents.example.com/provider/secret-token",
  });

  it("creates a personalized, recognizable request", () => {
    expect(draft.subject).toBe("Occu-Med fee proposal for Example Clinic");
    expect(draft.body).toContain("Hello Jordan,");
    expect(draft.body).toContain("Alex Ayvazian");
    expect(draft.body).toContain("OM-FP-1001");
    expect(draft.body).toContain("https://documents.example.com/provider/secret-token");
  });

  it("opens a prefilled Outlook compose page", () => {
    const url = new URL(outlookComposeUrl({ ...draft, cc: "manager@occu-med.com" }));
    expect(url.origin).toBe("https://outlook.office.com");
    expect(url.searchParams.get("to")).toBe("provider@example.com");
    expect(url.searchParams.get("cc")).toBe("manager@occu-med.com");
    expect(url.searchParams.get("subject")).toBe(draft.subject);
    expect(url.searchParams.get("body")).toBe(draft.body);
  });

  it("copies complete addressing information with the message", () => {
    const copied = copiedInvitationEmail(draft);
    expect(copied).toContain("From: Alex Ayvazian <alex@occu-med.com>");
    expect(copied).toContain("To: provider@example.com");
    expect(copied).toContain(`Subject: ${draft.subject}`);
  });
});
