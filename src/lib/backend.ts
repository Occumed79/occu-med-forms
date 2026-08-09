import type {
  AdminInvitationDetail,
  AdminInvitationList,
  AdminRole,
  AdminUser,
  AuthAuditEvent,
  CertificateVerification,
  ProviderDocumentData,
  ProviderDocumentType,
  ProviderInvitation,
  ProviderInvitationStatus,
  RetentionPolicy,
} from "@/types/memo";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function url(path: string) {
  return `${API_BASE}${path}`;
}

const ADMIN_SESSION_STORAGE = "occu-med-admin-session";

export function getAdminSessionToken() {
  return sessionStorage.getItem(ADMIN_SESSION_STORAGE) || "";
}

export function setAdminSessionToken(token: string) {
  if (token) sessionStorage.setItem(ADMIN_SESSION_STORAGE, token);
  else sessionStorage.removeItem(ADMIN_SESSION_STORAGE);
}

function adminHeaders(extra: Record<string, string> = {}) {
  return { ...extra, Authorization: `Bearer ${getAdminSessionToken()}` };
}

async function responseError(res: Response) {
  const responseText = await res.text();
  try {
    const body = JSON.parse(responseText) as { error?: string };
    return body.error || `Request failed (${res.status})`;
  } catch {
    return responseText || `Request failed (${res.status})`;
  }
}

export async function apiAdminLogin(email: string, password: string) {
  const res = await fetch(url("/api/admin/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; token: string; expiresAt: string; idleMinutes: number; user: AdminUser }>;
}

export async function apiAdminSession() {
  const res = await fetch(url("/api/admin/session"), {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; idleMinutes: number; user: AdminUser }>;
}

export async function apiAdminLogout() {
  const res = await fetch(url("/api/admin/logout"), { method: "POST", headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function apiCreateEnvelope() {
  const res = await fetch(url("/api/signed/envelopes"), { method: "POST", headers: adminHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ envelopeId: string; createdAt: string }>;
}

export async function apiLogView(envelopeId: string) {
  const res = await fetch(url(`/api/signed/envelopes/${envelopeId}/view`), { method: "POST", headers: adminHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ envelopeId: string; viewedAt: string }>;
}

export async function apiFinalizeEnvelope(
  envelopeId: string,
  payload: { data: unknown; viewedAt?: string; recipientEmail?: string; signedPdfBase64?: string },
) {
  const res = await fetch(url(`/api/signed/envelopes/${envelopeId}/finalize`), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    envelopeId: string;
    signedAt: string;
    pdfHash: string;
    pdfBase64: string;
    certificateBase64: string;
  }>;
}

export function base64PdfToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function apiSendMemoPdf(payload: {
  recipientEmail: string;
  subject: string;
  message: string;
  filename: string;
  pdfBase64: string;
}) {
  const res = await fetch(url("/api/memos/send"), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean }>;
}

export async function apiCreateProviderInvitation(payload: {
  documentType: ProviderDocumentType;
  data: ProviderDocumentData;
  recipientEmail?: string;
}) {
  const res = await fetch(url("/api/provider-invitations"), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    invitationId: string;
    token: string;
    providerPath: string;
    createdAt: string;
    expiresAt: string;
    status: "draft";
  }>;
}

export async function apiListAdminInvitations(options: {
  status?: ProviderInvitationStatus | "all";
  query?: string;
} = {}) {
  const params = new URLSearchParams();
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (options.query) params.set("q", options.query);
  const suffix = params.size ? `?${params.toString()}` : "";
  const res = await fetch(url(`/api/admin/provider-invitations${suffix}`), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<AdminInvitationList>;
}

export async function apiGetAdminInvitation(id: string) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}`), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<AdminInvitationDetail>;
}

export async function apiResendAdminInvitation(id: string) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/resend`), {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ providerPath: string; expiresAt: string; status: "draft" }>;
}

export async function apiMarkAdminInvitationSent(id: string, payload: {
  recipientEmail: string;
  cc?: string;
  subject: string;
}) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/mark-sent`), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; status: ProviderInvitationStatus; recipientEmail: string }>;
}

export async function apiCancelAdminInvitation(id: string) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/cancel`), {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; status: "cancelled" }>;
}

export async function apiApproveAdminInvitation(id: string) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/approve`), {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; status: "completed"; approvedAt: string; emailSent: boolean }>;
}

export async function apiDownloadAdminInvitationFile(id: string, kind: "document" | "certificate") {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/${kind}`), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return new Uint8Array(await res.arrayBuffer());
}

export async function apiSetInvitationLegalHold(id: string, active: boolean) {
  const res = await fetch(url(`/api/admin/provider-invitations/${encodeURIComponent(id)}/legal-hold`), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; legalHold: boolean }>;
}

export async function apiGetProviderInvitation(token: string) {
  const res = await fetch(url(`/api/provider-invitations/${encodeURIComponent(token)}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ProviderInvitation>;
}

export async function apiFinalizeProviderInvitation(
  token: string,
  payload: { data: ProviderDocumentData; signedPdfBase64: string },
) {
  const res = await fetch(url(`/api/provider-invitations/${encodeURIComponent(token)}/finalize`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    ok: boolean;
    status: "returned" | "completed";
    requiresReview: boolean;
    completedAt: string;
    pdfHash: string;
    evidenceHash: string;
    pdfBase64: string;
    certificateBase64: string;
    emailSent: boolean;
  }>;
}

export async function apiDeclineProviderInvitation(token: string, reason: string) {
  const res = await fetch(url(`/api/provider-invitations/${encodeURIComponent(token)}/decline`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true; status: "declined"; declinedAt: string }>;
}

export async function apiDownloadProviderInvitationFile(token: string, kind: "document" | "certificate") {
  const res = await fetch(url(`/api/provider-invitations/${encodeURIComponent(token)}/${kind}`));
  if (!res.ok) throw new Error(await responseError(res));
  return new Uint8Array(await res.arrayBuffer());
}

export async function apiListAdminUsers() {
  const res = await fetch(url("/api/admin/users"), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ users: AdminUser[]; roles: AdminRole[] }>;
}

export async function apiCreateAdminUser(payload: {
  displayName: string;
  email: string;
  role: AdminRole;
  password: string;
}) {
  const res = await fetch(url("/api/admin/users"), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ user: AdminUser }>;
}

export async function apiUpdateAdminUser(id: string, payload: {
  displayName?: string;
  role?: AdminRole;
  active?: boolean;
  password?: string;
}) {
  const res = await fetch(url(`/api/admin/users/${encodeURIComponent(id)}`), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ user: AdminUser }>;
}

export async function apiChangeAdminPassword(currentPassword: string, newPassword: string) {
  const res = await fetch(url("/api/admin/account/password"), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function apiGetSecurityAudit() {
  const res = await fetch(url("/api/admin/security-audit"), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ events: AuthAuditEvent[] }>;
}

export async function apiGetRetentionPolicy() {
  const res = await fetch(url("/api/admin/retention"), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<RetentionPolicy>;
}

export async function apiUpdateRetentionPolicy(payload: Pick<RetentionPolicy, "completedDocumentDays" | "inactiveInvitationDays" | "authAuditDays">) {
  const res = await fetch(url("/api/admin/retention"), {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function apiDownloadBackup() {
  const res = await fetch(url("/api/admin/backups/export"), { headers: adminHeaders() });
  if (!res.ok) throw new Error(await responseError(res));
  return new Uint8Array(await res.arrayBuffer());
}

export async function apiVerifyCertificate(evidenceHash: string) {
  const normalized = evidenceHash.trim().toLowerCase();
  const res = await fetch(url(`/api/verify/${encodeURIComponent(normalized)}`));
  if (!res.ok) throw new Error(await responseError(res));
  return res.json() as Promise<CertificateVerification>;
}
