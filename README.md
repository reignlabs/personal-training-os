# Personal Training OS

A personal, non-commercial, mobile-first workout-planning application inspired by publicly observable Alloy Personal Training programming principles. It combines a structured exercise library, workout history, an equipment inventory, individual goals/constraints, and a rules-based generator to produce one full-body strength workout at a time for use in an apartment gym. It is a client-only React + TypeScript PWA: there is no application server, no accounts, and no data ever leaves the device except through a backup file the person explicitly exports. The system is designed to learn from real logged Alloy sessions over time without claiming to reproduce undocumented, proprietary Alloy programming — see `docs/project-knowledge/` for the evidence-discipline rules that govern that distinction.

## Build / milestone status

This package reflects five completed build passes, each documented in detail under `docs/project-knowledge/claude/`:

- **Foundation** (`FOUNDATION_BUILD_STATUS.md`) — repo scaffold, domain/contracts layer, storage adapter, and the engine facade's shape. 91/91 tests passing at this stage. No GitHub repo or Cloudflare Pages deploy was set up (this sandbox has no such account access); a local commit stands in for that step.
- **B5 — the workout generator engine** (`B5_GENERATOR_BUILD_STATUS.md`) — 11/11 of the requested engine components built and wired into the facade (`validatePack`, `generate`, `promptsDue`, `swapOptions`, `servability`, `equipmentImpact`). **Known gaps, stated plainly:** `replay()` (folding historical `Workout`/`ExternalSession`/event data back into generator state) is not implemented; only 9 of the 49 canonical acceptance tests are implemented with exact reference values (the rest need a scenario-simulation test harness that is separate, comparably-sized scope); and `PrepItem[]` construction (§C.6 warm-up items) is not built — `generate.ts` computes warm-up duration but not the actual prep item objects.
- **UI core loop** (`UI_CORE_LOOP_BUILD_STATUS.md`) — Today, pre-workout readiness, workout overview, warm-up, training blocks, exercise cards, set logging, rest timer, effort/discomfort input, "why this exercise," exercise swap, and workout completion, wired to the real engine and real persistence (no mock data).
- **History / Log Alloy / Equipment / Profile** (`HISTORY_ALLOY_EQUIPMENT_PROFILE_BUILD_STATUS.md`) — logging external Alloy sessions (gracefully accepting incomplete historical detail), equipment availability management, profile display/editing, and history review, verified to actually affect subsequent generation. **Documented limitation:** editing or deleting a logged Alloy session applies credit forward-only and cannot retract credit already granted by a prior version, because that needs `replay()` (still not implemented). The UI states this limitation to the user at the point of edit/delete rather than silently being wrong about it.
- **V0 infrastructure** (`INFRA_V0_BUILD_STATUS.md`) — installable PWA (manifest, placeholder icons), a hand-written offline service worker (precache + cache-first fetch, two real bugs found and fixed during verification — stale-manifest races and a `Vary: Origin` cache-matching miss), JSON backup export/import with schema/version metadata and a downgrade refusal, and raw-data export as a last-resort recovery path when normal export can't run. 370/370 unit tests and 12/12 Playwright tests passing at this stage. First-run setup (T-00) remains out of scope throughout. Backups are unencrypted JSON by design (V0 scope) — treat an exported backup file like any other personal data file. No migrations exist yet since `APP_SCHEMA_VERSION` has only ever been `1`.

Across all five passes, real Safari/WebKit was never available in any build environment used so far — only Chromium is installed for Playwright, so this sandbox (and this handoff) substitutes Chromium for WebKit in all E2E runs. Service worker and Web Share behavior have known Safari-specific quirks not exercised by that coverage; a manual spot-check on an actual iPhone is recommended before relying on offline/install behavior daily.

## Install

```
npm ci
```

## Run

```
npm run dev       # local dev server (Vite)
npm run build     # tsc --noEmit, then production build to dist/
npm run preview   # serve the production build locally
```

## Test

```
npm run test        # unit/integration tests (vitest run)
npm run test:watch  # vitest in watch mode
npm run typecheck   # tsc --noEmit only
npm run test:ui     # end-to-end UI tests (Playwright)
```

Playwright's E2E suite runs against `npm run preview` (the real production build, including the service worker) across iPhone/iPad/desktop viewport projects. As noted above, this substitutes Chromium for WebKit/Safari per the build-status docs.

## Architecture

The codebase enforces a one-directional module dependency graph, checked automatically by `tests/architecture.test.ts`:

```
ui       -> app, contracts, domain
app      -> engine, pack, store, platform, contracts, domain
engine   -> contracts, domain
pack     -> contracts, domain
store    -> contracts, domain
platform -> domain
domain   -> (nothing)
```

`domain` is pure and dependency-free; `engine` is additionally checked for purity (no `Date.now`, no argument-less `new Date()`, no `Math.random`, no `localeCompare`, no `window`/`indexedDB`/`navigator` anywhere under `src/engine`). This keeps the generator's rule logic deterministic and testable in isolation from the app shell. See `APP_TECH_ARCHITECTURE_V0.md` in `docs/project-knowledge/` for the full architecture spec these boundaries implement.

## Project knowledge base

`docs/project-knowledge/` is a verbatim export of this project's full Claude Project knowledge base as of packaging time (specs, decision logs, engine/generator documentation, the exercise evidence database, and the Alloy research write-ups). It is the authoritative reference for *why* the system is built the way it is — evidence classifications, programming rules, data contracts, and the running decision log — and is not itself application code.

## No environment configuration required

This app requires no environment variables, API keys, or secrets to install, build, run, or test. It is fully client-side (no server, no auth, no runtime network calls); its only runtime dependencies are `react`, `react-dom`, and `zod`. See `.env.example` for a one-line confirmation of this. This package is fully self-contained — it does not require or reference any earlier handoff zip or external directory to build or run.
