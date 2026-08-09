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
2. The app creates a cryptographically random, document-specific provider URL.
3. The provider URL renders only the invited document—there is no internal form switcher.
4. The provider can remove unavailable services, add requested services, enter fees, complete contact information, and sign electronically.
5. The exact on-screen preview becomes the signed PDF. The backend stores the completed bytes, SHA-256 hash, timestamps, client metadata, signature evidence, and audit certificate.
6. If the provider changes a service or fee, the document enters **Needs review** instead of silently becoming final. Occu-Med sees an original-versus-returned change summary and must approve or reject it.
7. When email is configured, unchanged completions are returned to Occu-Med and the provider. Changed terms go only to the configured Occu-Med review mailbox until approval; approval then releases the final document and certificate.

The signature evidence model is adapted from Occu-Med's PacketPath/DocuSign Replacement project: 48-byte recipient tokens, short-lived admin sessions, typed or drawn signatures, explicit electronic-record consent, canonical evidence hashes, chained audit events, decline handling, and independent verification of the original payload, final PDF, signature evidence, and audit chain.

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
- `POST /api/admin/session` → exchange the admin access code for a revocable session token
- `GET /api/admin/session` → validate and refresh an active admin session
- `POST /api/admin/logout` → revoke the active admin session
- `GET /api/admin/provider-invitations` → list and filter invitation activity
- `GET /api/admin/provider-invitations/:id` → inspect an invitation
- `POST /api/admin/provider-invitations/:id/resend` → rotate and resend a secure provider link
- `POST /api/admin/provider-invitations/:id/approve` → approve returned service or fee changes and finalize the agreement
- `POST /api/admin/provider-invitations/:id/cancel` → invalidate an active invitation
- `GET /api/admin/provider-invitations/:id/document` → download the completed PDF
- `GET /api/admin/provider-invitations/:id/certificate` → download its audit certificate

## Neon setup

1. Create a new project in [Neon](https://neon.tech).
2. Copy the pooled connection string (e.g., `postgresql://user:pass@host-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require`).
3. Set it as the `DATABASE_URL` environment variable on your Render backend service.

The backend auto-creates the `envelopes` table on startup with this schema:

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

The backend also auto-creates `provider_invitations`. Invitation tokens are never stored directly; only their SHA-256 hashes are persisted. Invitations expire after 30 days by default and completed documents remain locked.

## Render deployment (exact)

This repo includes `render.yaml` with **two services**.

### 1) Backend service (`occu-med-backend`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run start:backend`
- Health check path: `/health`

Required backend env vars:
- `DATABASE_URL` (Neon pooled connection string)
- `ADMIN_ACCESS_KEY` (private access code used to open the internal sender workspace)
- `ADMIN_SESSION_HOURS` (optional; default `8`)
- `ADMIN_IDLE_MINUTES` (optional; default `30`)
- `FRONTEND_ORIGIN` (the deployed frontend origin used for CORS)
- `FRONTEND_APP_URL` (the deployed frontend URL used in provider invitation emails)
- `NODE_ENV` (set to `production` on Render)
- `ENVELOPE_PREFIX` (optional; default `OM`)
- `INVITATION_TTL_DAYS` (optional; default `30`)

Optional server-side email env vars:
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PROVIDER_RESPONSES_TO` (Occu-Med mailbox that receives completed provider documents)

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
