import { useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Mail, Send } from "lucide-react";
import { useAdminUser } from "@/components/admin/adminAuth";
import { useToast } from "@/hooks/use-toast";
import { apiMarkAdminInvitationSent } from "@/lib/backend";
import {
  copiedInvitationEmail,
  createInvitationEmailDraft,
  outlookComposeUrl,
} from "@/lib/invitationEmail";
import type { ProviderDocumentType, ProviderPackageForm } from "@/types/memo";

interface InvitationDeliveryPanelProps {
  invitationId: string;
  providerLink: string;
  providerName: string;
  providerContactName?: string;
  recipientEmail?: string;
  documentType: ProviderDocumentType;
  documentNumber: string;
  includedForms?: ProviderPackageForm[];
  replacementLink?: boolean;
  onMarkedSent?: () => void | Promise<void>;
}

export function InvitationDeliveryPanel({
  invitationId,
  providerLink,
  providerName,
  providerContactName,
  recipientEmail,
  documentType,
  documentNumber,
  includedForms,
  replacementLink = false,
  onMarkedSent,
}: InvitationDeliveryPanelProps) {
  const user = useAdminUser();
  const initial = useMemo(() => createInvitationEmailDraft({
    fromName: user.displayName,
    fromEmail: user.email,
    to: recipientEmail,
    providerName,
    providerContactName,
    documentType,
    documentNumber,
    providerLink,
    includedForms,
  }), [documentNumber, documentType, includedForms, providerContactName, providerLink, providerName, recipientEmail, user.displayName, user.email]);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [outlookOpened, setOutlookOpened] = useState(false);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const { toast } = useToast();

  const draft = { ...initial, to, cc, subject, body };
  const valid = to.trim().includes("@") && Boolean(subject.trim()) && Boolean(body.trim());

  const openOutlook = () => {
    if (!valid) {
      toast({ title: "Complete the email", description: "A recipient, subject, and message are required.", variant: "destructive" });
      return;
    }
    const opened = window.open(outlookComposeUrl(draft), "_blank");
    if (opened) opened.opener = null;
    setOutlookOpened(true);
    if (!opened) toast({ title: "Outlook was blocked", description: "Allow pop-ups or use Copy email instead.", variant: "destructive" });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(copiedInvitationEmail(draft));
      toast({ title: "Email copied", description: "The recipient, subject, message, and invitation link were copied." });
    } catch {
      toast({ title: "Copy failed", description: "Select the message text and copy it manually.", variant: "destructive" });
    }
  };

  const markSent = async () => {
    if (!valid) return;
    setMarking(true);
    try {
      await apiMarkAdminInvitationSent(invitationId, { recipientEmail: to.trim(), cc: cc.trim() || undefined, subject: subject.trim() });
      setMarked(true);
      toast({ title: "Marked as sent", description: "The sender and recipient were added to the invitation history." });
      await onMarkedSent?.();
    } catch (error) {
      toast({ title: "Could not update invitation", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setMarking(false);
    }
  };

  return (
    <section className="invitation-delivery-panel" aria-label="Send provider invitation">
      <div className="invitation-delivery-heading">
        <span><Mail size={19} /></span>
        <div>
          <strong>{replacementLink ? "New link ready for Outlook" : "Invitation ready for Outlook"}</strong>
          <p>{replacementLink ? "The prior link has been replaced. Send this new link from your own Occu-Med mailbox." : "Review the email below, then open it in your own Outlook mailbox—no mailbox connection or IT approval required."}</p>
        </div>
      </div>

      <div className="invitation-email-grid">
        <label className="invitation-email-from">From
          <input value={`${user.displayName} <${user.email}>`} readOnly />
          <small>Outlook controls the final From address. Change it in the Outlook compose window if necessary.</small>
        </label>
        <label>To
          <input type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder="provider@example.com" />
        </label>
        <label>CC (optional)
          <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="additional@example.com" />
        </label>
        <label className="invitation-email-subject">Subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label className="invitation-email-message">Personal message
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={13} />
        </label>
      </div>

      <div className="invitation-provider-link">
        <label>Provider document link</label>
        <div><input readOnly value={providerLink} /><button type="button" onClick={() => void navigator.clipboard.writeText(providerLink).then(() => toast({ title: "Link copied" })).catch(() => toast({ title: "Copy failed", variant: "destructive" }))}><Copy size={14} /> Copy link</button><a href={providerLink} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Test link</a></div>
      </div>

      <div className="invitation-delivery-actions">
        <button type="button" className="secondary" onClick={() => void copyEmail()}><Copy size={16} /> Copy email</button>
        <button type="button" className="primary" onClick={openOutlook} disabled={!valid}><Mail size={16} /> Open in Outlook</button>
        {!marked ? <button type="button" className="confirm" onClick={() => void markSent()} disabled={!valid || marking}><Send size={16} /> {marking ? "Recording…" : outlookOpened ? "I sent it — mark as sent" : "Mark as sent"}</button> : <span className="invitation-marked-sent"><CheckCircle2 size={16} /> Recorded as sent</span>}
      </div>
    </section>
  );
}
