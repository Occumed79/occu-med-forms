# occu-med-forms

Pricing memo app with three variants:
- Network Management memo
- Clinic memo
- Signed Clinic memo (envelope ID, SHA-256 hash, audit/certificate workflow)

## Deploy to Render

This repo now includes `render.yaml` for one-click static deployment on Render.

### Option A: Blueprint deploy (recommended)
1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select this repo/branch.
4. Render reads `render.yaml` and creates a static web service.

### Option B: Manual static site
If you prefer manual setup:
- **Environment**: Static Site
- **Build command**: `npm ci && npm run build`
- **Publish directory**: `dist`
- **Rewrite rule**: `/* -> /index.html` (for React Router)

## Environment variables
Set these in Render if you use Supabase persistence in the signed workflow:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local development
```bash
npm install
npm run dev
```

## Notes
- Linux builds are case-sensitive. A `src/components` symlink is included to support existing `@/components/...` imports while the source tree remains under `src/Components`.
