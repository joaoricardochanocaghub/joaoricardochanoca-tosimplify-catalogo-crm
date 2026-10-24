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

## Arquitetura (toSimplify Studio)
- The app is client-only under `src/studio/` (rendered via `<ClientOnly>` in `src/routes/index.tsx`): data lives in localStorage, so nothing may read it during SSR.
- Views are selected by hash (`#/studio/:step`, `#/propostas/:id`…) inside the single `/` route, to stay compatible with the original HTML app's URLs.
- `src/studio/store.ts` is a mutable store ported 1:1 from the original `store.js`; mutate then call `S.changed()`. Keep the v4 schema and normalisers intact so exported JSON round-trips without loss.
- Styling is the original `app.css` class set in `src/styles.css` (Tailwind loaded without preflight) to keep pixel parity; add new styles there, not inline.
- Static images referenced by stored data (`assets/logo.png`, `assets/catalogo/*.jpg`) live in `public/assets/` because exported JSON stores those relative paths.
