# occu-med-forms

Production architecture for Occu-Med forms:

- **Frontend**: React + Vite (Render Static Web Service)
- **Backend**: Render Node API service (`backend/server.mjs`)
- **Persistence**: Neon PostgreSQL (server-side only, via `DATABASE_URL`)

The frontend has two deliberately separate experiences:

- **Admin workspace (`/admin`)**: authenticated sender dashboard for creating invitations, tracking activity, resending or cancelling links, and downloading completed documents.
- **Provider workspace (`/provider/:token`)**: recipient-only page for the single invited document, with no access to admin navigation or other forms.

The admin workspace also provides these additional document tools through the Other Forms page:

1. Provider Fee Proposal (default)
2. Network Management Pricing Memo
3. Legacy Signed Pricing Sheet
4. Provider Service Agreement
5. Occu-Med and Provider Contact Sheets

Provider Fee Proposals and Provider Service Agreements use a provider-invitation workflow:

1. Occu-Med prepares the provider, service, fee, and term information.
2. The app creates a cryptographically random, document-specific provider URL and a personalized, editable invitation email.
3. **Open in Outlook** opens Outlook Web with To, CC, Subject, message, and provider URL populated. Outlook sends from the mailbox the employee is already using, so the initial invitation does not require a mailbox API, OAuth connection, Resend domain verification, or IT approval.
4. After sending, the employee selects **I sent it — mark as sent**. The account, recipient, CC, subject, and manual Outlook delivery method are added to the invitation audit history.
5. The provider URL renders only the invited document—there is no internal form switcher.
6. The provider can remove unavailable services, add requested services, enter fees, complete contact information, and sign electronically.
7. The exact on-screen preview becomes the signed PDF. The backend stores the completed bytes, SHA-256 hash, timestamps, client metadata, signature evidence, and audit certificate.
8. If the provider changes a service or fee, the document enters **Needs review** instead of silently becoming final. Occu-Med sees an original-versus-returned change summary and must approve or reject it.
9. When optional server-side email is configured, unchanged completions are returned to Occu-Med and the provider. Changed terms go only to the configured Occu-Med review mailbox until approval; approval then releases the final document and certificate.

New invitations begin in **Ready to send** status. **Copy email** is available when Outlook Web is blocked or the employee prefers another mail client. Rotating a link invalidates the old URL and prepares a new editable Outlook email.

The signature evidence model is adapted from Occu-Med's PacketPath/DocuSign Replacement project: 48-byte recipient tokens, short-lived individual admin sessions, typed or drawn signatures, explicit electronic-record consent, canonical evidence hashes, chained audit events, decline handling, and independent verification of the original payload, final PDF, signature evidence, and audit chain.

## Admin accounts and roles

The shared admin access code has been replaced by individual email/password accounts. Passwords are hashed with scrypt, sessions have both an absolute expiry and an inactivity timeout, role checks are enforced in the backend, and sign-ins/account changes are recorded in the security audit.

| Role | Access |
| --- | --- |
| Owner | All document actions, user administration, retention settings, legal holds, backups, and security audit |
| Manager | All document actions and returned-term approvals, plus security audit |
| Sender | Create, send, resend, cancel, view, and download documents |
| Auditor | Read-only document, download, and security-audit access |

To create the first owner, set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, and optionally `INITIAL_ADMIN_NAME` on the backend, then deploy once. The initial password must contain at least 12 characters with uppercase, lowercase, and a number. Bootstrap values are used only when `admin_users` is empty; after the owner can sign in, the initial email/password variables can be removed. Additional accounts are created at **Admin → Accounts**.

## Responsibility split

### Frontend
- Renders all form UI and the multi-form switcher
- Collects and validates user input/signatures
- Calls backend endpoints for signed envelope lifecycle
- Downloads signed PDF + certificate returned by backend
- Converts the visible memo/contact form or exact A4 provider preview into the PDF, eliminating separate screen/PDF layouts
- Appends uploaded PDF/JPG/PNG files to Network Management memo packets

### Backend (authoritative signed workflow)
- Creates authoritative Envelope IDs
- Logs created/viewed/signed events
- Captures request IP and user agent
- Enforces agreement-to-electronic-record at finalize time
- Generates final signed PDF + Certificate of Completion
- Computes SHA-256 for final signed PDF
- Persists envelope/audit records and PDF bytes in Neon PostgreSQL
- Sends server-side email with attachments (optional provider integration)

## API endpoints (backend)

- `GET /health`
- `POST /api/signed/envelopes` → create envelope + created event
- `POST /api/signed/envelopes/:envelopeId/view` → viewed event
- `POST /api/signed/envelopes/:envelopeId/finalize` → finalize + hash + cert + audit + optional email
- `POST /api/memos/send` → email a memo PDF
- `POST /api/provider-invitations` → create provider-only invitation
- `GET /api/provider-invitations/:token` → load and log provider review
- `POST /api/provider-invitations/:token/finalize` → validate, hash, store, certify, and return the completed PDF
- `POST /api/provider-invitations/:token/decline` → record a provider decline and optional reason
- `GET /api/provider-invitations/:token/document` → download the authoritative completed PDF
- `GET /api/provider-invitations/:token/certificate` → download the authoritative completion certificate
- `POST /api/admin/session` → sign in with an individual email/password and issue a revocable session token
- `GET /api/admin/session` → validate and refresh an active admin session
- `POST /api/admin/logout` → revoke the active admin session
- `GET|POST /api/admin/users` → list or create individual accounts (Owner)
- `POST /api/admin/users/:id` → change an account role, status, name, or password (Owner)
- `POST /api/admin/account/password` → change the current user's password
- `GET /api/admin/security-audit` → view recent account-security activity
- `GET|POST /api/admin/retention` → inspect or update retention eligibility rules (Owner)
- `GET /api/admin/backups/export` → download a portable, integrity-manifested document backup (Owner)
- `GET /api/admin/provider-invitations` → list and filter invitation activity
- `GET /api/admin/provider-invitations/:id` → inspect an invitation
- `POST /api/admin/provider-invitations/:id/resend` → invalidate the old URL and prepare a replacement provider link
- `POST /api/admin/provider-invitations/:id/mark-sent` → record manual Outlook delivery details in the invitation history
- `POST /api/admin/provider-invitations/:id/approve` → approve returned service or fee changes and finalize the agreement
- `POST /api/admin/provider-invitations/:id/cancel` → invalidate an active invitation
- `POST /api/admin/provider-invitations/:id/legal-hold` → apply or release a legal hold (Owner)
- `GET /api/admin/provider-invitations/:id/document` → download the completed PDF
- `GET /api/admin/provider-invitations/:id/certificate` → download its audit certificate
- `GET /api/verify/:evidenceHash` → public certificate verification without exposing private audit metadata

## Neon setup

1. Create a new project in [Neon](https://neon.tech).
2. Copy the pooled connection string (e.g., `postgresql://user:pass@host-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require`).
3. Set it as the `DATABASE_URL` environment variable on your Render backend service.

The backend auto-creates the signed-document, invitation, account, session, audit, and retention tables on startup. Invitation tokens and admin session tokens are never stored directly; only their SHA-256 hashes are persisted. Invitations expire after 30 days by default and completed documents remain locked.

## Retention and recovery policy

The Governance page defines when records become eligible for a reviewed cleanup process; the app does not automatically destroy records. Defaults are:

- completed signed documents and certificates: 2,555 days (seven years);
- declined, expired, or cancelled invitations: 365 days;
- account-security history: 730 days;
- legal holds: excluded from cleanup eligibility until an Owner releases the hold.

Owners can download a portable JSON backup containing invitation records, PDFs, certificates, and chained document events. Password hashes and account credentials are excluded. Each export includes a SHA-256 manifest.

Recommended operating procedure:

1. Use Neon's point-in-time restore/history as the primary recovery layer.
2. Store a weekly portable export in approved encrypted storage with restricted access.
3. Keep at least one monthly export outside the primary database project.
4. Perform and document a quarterly restore test before relying on the backups.

Official Neon references: [branch restore](https://neon.com/docs/introduction/branch-restore), [history retention](https://neon.com/docs/introduction/history-window), and [backup/restore guidance](https://neon.com/docs/manage/backups).

The legacy `envelopes` table has this schema:

```sql
create table if not exists envelopes (
  id bigint generated by default as identity primary key,
  envelope_id text unique not null,
  status text,
  created_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  viewed_ip text,
  viewed_user_agent text,
  signed_ip text,
  signed_user_agent text,
  pdf_hash text,
  pdf_path text,
  certificate_path text,
  pdf_bytes bytea,
  certificate_bytes bytea,
  occu_med_rep_name text,
  occu_med_rep_title text,
  clinic_rep_name text,
  clinic_rep_title text,
  agreed_electronic boolean,
  recipient_email text,
  payload jsonb,
  updated_at timestamptz not null default now()
);
```

## Render deployment (exact)

This repo includes `render.yaml` with **two services**.

### 1) Backend service (`occu-med-backend`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run start:backend`
- Health check path: `/health`

Required backend env vars:
- `DATABASE_URL` (Neon pooled connection string)
- `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (one-time bootstrap values for the first Owner)
- `INITIAL_ADMIN_NAME` (optional display name for the first Owner)
- `ADMIN_SESSION_HOURS` (optional; default `8`)
- `ADMIN_IDLE_MINUTES` (optional; default `30`)
- `DOCUMENT_RETENTION_DAYS` (optional first-start default; `2555`)
- `FRONTEND_ORIGIN` (the deployed frontend origin used for CORS)
- `FRONTEND_APP_URL` (the deployed frontend URL used for public verification links)
- `NODE_ENV` (set to `production` on Render)
- `ENVELOPE_PREFIX` (optional; default `OM`)
- `INVITATION_TTL_DAYS` (optional; default `30`)

Optional server-side email env vars:
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PROVIDER_RESPONSES_TO` (Occu-Med mailbox that receives completed provider documents)

These optional variables are used for automated completed-document delivery and review notifications. They are not required to prepare or send the initial provider invitation through Outlook.

### 2) Frontend service (`occu-med-frontend`)
- Runtime: Static Site
- Build command: `npm ci && npm run build`
- Publish dir: `dist`
- Rewrite rule: `/* -> /index.html`

Required frontend env vars:
- `VITE_API_BASE_URL` (public URL of backend service)

## Local development

Terminal 1 (backend):
```bash
npm install
npm run dev:backend
```

Terminal 2 (frontend):
```bash
npm run dev
```

## Notes

- The signed workflow depends on backend availability for finalize operations.
- `DATABASE_URL` is a server-side secret. Never expose it to the frontend or commit it to the repo.
- The frontend communicates exclusively through `VITE_API_BASE_URL`.
