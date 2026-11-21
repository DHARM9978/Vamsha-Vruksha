<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions

- Vamsha Vruksha is a frontend-only prototype: auth, data and OTP are mocked in `src/services/auth.ts` and `src/services/data.ts` with localStorage persistence seeded from `src/mocks/data.ts`. Why: the redesign brief explicitly excludes a backend; swap the service internals for API calls without touching pages.
- The redesign prompt requested React Router, but the app uses TanStack Router (file-based, routes in `src/routes/`); public pages live under the `_public` pathless layout, the signed-in app under `app.tsx` with `ssr: false` and a localStorage session guard. Why: platform constraint; keep route naming when adding pages.
- Route guards in `src/lib/guards.ts` (`requireSession`, `requireAdmin`) are demo navigation only, never a security boundary.
- The family tree uses Cytoscape imported dynamically inside the graph component's effect (SSR-safe), and the instance is destroyed on unmount/data change.
- Password policy (8+ chars, uppercase, number, special char) is defined once in `src/lib/schemas.ts` and shared by sign-up, reset and change-password forms.
