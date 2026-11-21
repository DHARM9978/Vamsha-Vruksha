# Vamsha Vruksha — Family Heritage & Lineage (Frontend Prototype)

A polished, responsive React single-page application for digital family-tree and
lineage management, redesigned from the legacy PHP project. **This is a
frontend-only prototype**: it runs on fictional mock data with a mock
authentication service, so everything can be clicked through without a backend.

Built with TanStack Start (React 19 + Vite + file-based routing), Tailwind CSS
v4 design tokens, Framer Motion, React Hook Form + Zod, Lucide icons and
Cytoscape.js for the family tree.

## Run locally

```bash
bun install   # or npm install
bun run dev   # or npm run dev
```

Open http://localhost:8080.

## Demo credentials (frontend-only, never sent to any server)

| Role  | Email               | Password       |
| ----- | ------------------- | -------------- |
| Admin | admin@vamsha.test   | AdminDemo@123  |
| User  | member@vamsha.test  | MemberDemo@123 |

- Demo OTP for Sign Up / Forgot Password: **123456** (shown openly in the UI; no
  email is sent).
- A persistent “Demo mode — no backend connected” badge is shown in the app.
- Sign-up creates a local demo user you can sign in with; “Reset demo data” on
  Overview restores the sample dataset.

## Route guide

Public: `/` landing · `/about` · `/contact` · `/login` · `/signup` · `/forgot-password`

Authenticated (`/app…`):

- `/app` — Overview (stats, quick actions, sample activity)
- Admin only: `/app/families/new`, `/app/families/edit`, `/app/people/new`,
  `/app/people/edit`, `/app/relations/new`,
  `/app/masters/{gotra,sutra,vamsha,kula-devatha,mane-devru,panchang-sudhi,pooja-vruksha}`,
  `/app/users/new`
- Everyone: `/app/tree` (Cytoscape graph), `/app/family-details` (table/tree
  views, print-to-PDF export), `/app/profile`, `/app/change-password`

Light/Dark theme via the sun/moon toggle; the choice persists across refreshes.

## What is mock-only (no backend exists)

- Authentication and sessions (localStorage mock; demo credentials above).
- OTP/email verification, contact-form email sending.
- All data writes (families, people, relationships, masters, users) persist to
  localStorage only.
- Frontend role checks (route guards) shape the demo navigation; they cannot
  replace backend authorization.
- PDF export uses the browser print dialog (“Save as PDF”).
- Reverse-relationship domain validation is intentionally left to the future
  backend (the legacy app left it unfinished).

## Backend integration notes

- `src/services/data.ts` and `src/services/auth.ts` are the single data/auth
  seams — replace their internals with real API calls; components and pages
  already treat them as async repositories.
- `src/mocks/` holds the fictional fixtures.
- Keep the same password policy on the server (8+ chars, uppercase, number,
  special character) — see `src/lib/schemas.ts`.
