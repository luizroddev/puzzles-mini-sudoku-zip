# Puzzles — Mini Sudoku & Zip

Two mobile-first logic puzzles (Mini Sudoku and Zip) with a daily challenge,
streaks, an online leaderboard, themes, offline PWA support and accessibility.

**Live:** https://puzzles-mini-sudoku-zip.netlify.app

## Architecture

| Layer | Tech | Location |
|-------|------|----------|
| Pure core | TypeScript, no React/DOM | `src/core` (98 unit + property tests) |
| App | React 18 + Vite + Zustand | `src/components`, `src/state`, `src/ui` |
| Persistence | IndexedDB (idb) + fallback | `src/state/storage.ts` |
| PWA | vite-plugin-pwa / Workbox | `vite.config.ts` |
| Backend | Supabase Edge Function (Deno) | `supabase/functions/puzzles-api` |
| Database | Supabase Postgres (`puzzles` schema) | `server/schema.sql` |
| Backend (alt) | Netlify Functions reference impl | `server/netlify-functions-reference` |

The **core is shared** between the client and the server: the backend
regenerates each puzzle from its seed and re-validates the submitted solution and
metrics (`src/core/validate.ts`), so leaderboard entries can't be faked.

The edge function imports the core from the published browser bundle
(`/core-api.js`) via jsDelivr, so there is a single source of truth and no
secrets ever reach the client (the service-role key stays in the Deno runtime).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # full Vitest suite
npm run build      # type-check + production build
```

## Deploy

- **Frontend:** `netlify deploy --prod --dir=dist` (after `npm run build`).
- **Backend:** deploy `supabase/functions/puzzles-api` to Supabase; the DB schema
  lives in `server/schema.sql` (applied to an isolated `puzzles` schema).

## Games

- **Mini Sudoku** — 4×4 and 6×6, four difficulties, Relaxed / Classic / No-help
  mistake modes, notes, hints, undo/redo, keyboard play.
- **Zip** — draw one continuous path through every cell, hitting the numbered
  checkpoints in order without crossing walls. Drag or arrow keys.

Puzzle generation is deterministic from a seed (seeded RNG → backtracking Sudoku
generator with uniqueness checks; backbite Hamiltonian-path Zip generator).
