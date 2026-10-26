# HM26 / MANAGER26 — MatchCore and Expansion Roadmap

**Sources:** `MANAGER26_CoderAI_Tek_Dosya_Uygulama_Paketi_v1.md`, `MANAGER26_MASTER_GENISLEME_VE_GELISTIRME_DOKUMANI_v4.md`, prior confirmed product decisions, and the current workspace.  
**Current local baseline:** v0.9.13. The files cite v0.9.11 as their starting point; implementation uses the actual current workspace.  
**Production deployment:** none.  
**Working rule:** one coherent wave at a time; run a focused check and production build; report the checkpoint before moving to the next wave.

## Reconciled decisions

- **Academy:** included, per the user's latest explicit choice; expand in its own wave.
- **Buy-back:** excluded. Existing player-plus-cash swap remains; no buy-back is added.
- **UI scope:** full UI/UX refresh is included, with the new navigation/spec and iPhone SE 2 target. Keep the current application working behind adapters while the engine is migrated.
- **International cup qualifiers:** defer their exact waterfall/qualification mapping until the international-cup wave.
- **Brand/content:** keep the current HM26 app brand and fictional-club/player rule; examples in the documents are not authorization to introduce real players or licensed content.
- **Storage/offline:** preserve offline-first behavior, keep existing saves readable, and introduce versioned migration before changing persistence formats.
- **Testing:** focused tests at each wave; run the larger Monte Carlo balance suite in the dedicated balance wave, not after every UI/feature change.

## Proposed implementation waves

| Wave | Focus | Exit gate | Status |
|---|---|---|---|
| 1 | UI-independent event contracts, deterministic EventLog, single StatReducer, shot/xG and possession invariants | TypeScript/build + focused reducer tests | **Complete: 5/5 tests; build passed** |
| 2 | `MatchInput`, `MatchState`, versioned `EngineConfig`, independent deterministic RNG streams and MatchCore state-machine skeleton | Same seed produces the same state/event trace; no UI dependency | **Complete: 4/4 tests; build passed** |
| 3 | One core for live and instant matches; adapters around existing `MatchSession`/`simulateMatch`; command log and replay hash | Live/instant result parity and command replay | **Complete: shared runtime, 5/5 focused checks, build passed** |
| 4 | Shot resolution, pGoal=xG, VAR confirmation/overturn, score and shot-stat correctness | Shot/goal/save/VAR identities; live/instant parity | **Complete: 5/5 focused checks; build passed** |
| 5 | Possession-time accounting, clock, fatigue delta-time, player entry/exit minutes, fitness end-state | Time/minute/fitness invariants | **Complete: 5/5 focused checks; build passed** |
| 6 | Injury availability/decisions, substitutions and IFAB limits | Injured/sent-off players excluded from every actor selection; sub invariants | **Complete: 5/5 focused checks; build passed** |
| 7 | Referee, cards, penalties, corners/free kicks and assigned takers | Event-chain and stat tests for each restart/decision | **Complete: 4/4 focused checks; build passed** |
| 8 | Tactic causality, AI utility decisions and balance calibration | Focused tactic checks; larger Monte Carlo run for this wave | **Complete: 4/4 focused checks; deterministic 10k sweep passed; build passed** |
| 9 | Global UI design system/navigation refresh and 375×667/iPhone SE 2 layouts | Key flows, touch targets, accessibility and offline behavior | **Complete: 6/6 UI checks; production build passed** |
| 10 | Live-match projection adapter to the new core; retain scorebug, six tabs and cosmetic presentation | E2E verifies UI is a projection only; playback speed cannot alter result | **Complete: 5/5 focused checks; production build passed** |
| 11 | Face-to-face transfer table: patience, terms, exchange player, sell-on, leak and signing presentation | Existing transfer invariants, persistence and focused negotiation E2E; buy-back excluded | **Complete: 5/5 focused checks; production build passed** |
| 12 | Academy expansion on top of the existing academy model | Deterministic intake, save/load and roster/finance checks | **Complete: 5/5 focused checks; production build passed** |
| 13 | Newsroom: headlines, league pulse, Team of the Week, referee reports and press-room identity | Evidence-backed news; no unsupported result changes | **Complete: 4/4 focused checks; production build passed** |
| 14 | Off-pitch culture: scandal/community choices, ultras, chairmen/nemesis, FFP and long-term honors | Choice effects, save/load and season-transition invariants | **Complete: 6/6 focused checks; production build passed** |
| 15 | International competitions: 24 fictional foreign clubs, two 16-team cups, group/bracket/leaderboards/archive | Competition progression, save/load, standings and player-stat invariants; qualifier rules finalized before start | **Complete: 6/6 focused checks; production build passed** |

## Wave 1 implementation note

Wave 1 is deliberately non-invasive. The existing production match engines and React/Phaser path were not replaced. New code is isolated in `src/engine/core/`:

- `types.ts` defines typed domain events and reducer output.
- `eventLog.ts` assigns stable IDs (`matchId:sequence`) and enforces append-only match time.
- `statReducer.ts` derives score, xG, shots, saves, possession and player rows only from events; it is idempotent for duplicate event IDs and asserts final-match identities.
- `tools/qa-match-core-foundation.ts` covers determinism, reducer identities, VAR-overturned goal policy, xG/pGoal equality and unresolved-shot rejection.

**Explicit Wave 1 statistical policy:** xG remains recorded for an attempt later overturned by VAR, because the shot occurred; an overturned goal adds neither a confirmed goal nor a shot on target. Goal score updates require a `GOAL_CONFIRMED` event.

## Wave 3 implementation note

- The live screen already advanced `MatchSession`; instant `simulateMatch` now delegates to that same session/stepper. Both entry points therefore produce identical results for the same input and seed. `aiDefaultTactic` was extracted to a shared module to keep the adapter dependency acyclic.
- Accepted live manager actions (substitution, tactic, shout, protest, halftime talk and injury wait) are copied into a deterministic, JSON-safe command ledger with stable IDs, elapsed-second/step stamps and a canonical FNV-1a replay fingerprint. `replayMatch` reapplies the accepted commands at their original step boundaries and verifies command/result hashes.
- `MatchSession` also polls the legacy `SubManager` callbacks, preserving that adapter contract.
- **Boundary:** the Wave 2 UI-independent `MatchCore` remains a phase/state shell; possession, shots, stats and RNG are still implemented in the shared `MatchSession` simulator. This wave unifies the production live/instant path, but does not yet port the simulator into the domain-event core. That migration remains subsequent work. Balance Monte Carlo is deferred to Wave 8 as planned.

## Wave 4 implementation note

- Added a pure normalized shot probability model. It samples goal, goalkeeper save, goal-line block, off-target and woodwork outcomes; probabilities sum to 1 and `SHOT.xg` is exactly the sampled `pGoal`.
- Open-play, penalty and corner/set-piece attempts now append domain `SHOT` → `SHOT_RESOLVED` facts. Goals are confirmed or, after a VAR review, disallowed. At full time the shared `StatReducer` rebuilds the shot/goal/SOT/save/xG totals and asserts equality with the displayed match stats.
- Canonical identity is `shotsOnTarget = confirmed goals + shots saved`; a line clearance is a blocked shot, not a save or on-target shot. VAR-overturned attempts retain xG but count neither as goals nor SOT. Removed xG floors/caps so reported xG remains the exact event-derived sum. Match reports now identify woodwork separately.
- Focused checks cover model boundaries, end-to-end ledger/stat identities, VAR confirm/overturn, and exact live/instant result parity. Larger balance Monte Carlo remains in Wave 8.

## Wave 5 implementation note

- Match time now advances in elapsed seconds with a hard full-time cap; each possession emits its exact elapsed duration, including the final partial interval. Half-time and full-time are explicit reducer events, and home/away possession seconds reconcile exactly to the clock; the displayed home possession percentage is reducer-derived.
- Fatigue/recovery is applied for the actual per-step elapsed minutes while preserving the five-minute calibration. Starting lineups inherit player fitness (including the existing approved needle-play override); current fitness is tracked through fatigue, substitutions, injury waits/returns and full time.
- Player clocks start/stop at match seconds for starters, substitutes, dismissals and injuries. Final player rows now contain measured minutes and ending fitness rather than defaulting to a full match/100 fitness. Both AI-managed and user-directed injury-return timers use seconds.
- Added `tools/qa-match-core-wave5.ts` and `qa:match-core:wave5`: 5/5 focused checks pass for delta-fatigue scaling, clock/halftime bounds, exact possession-time reconciliation, player-minute/fitness bounds and substitution entry/exit minutes.
- Wave 1–5 focused suites all pass (5/5, 4/4, 5/5, 5/5, 5/5); feature QA 8/8, pitch QA 6/6 and Wave 3 scenarios 4/4. Production TypeScript/Vite build passes with the accepted lazy Phaser chunk warning; 159 SW entries. No app version, persistence format, deployment or ZIP change.

## Wave 6 implementation note

- Added one shared `isActiveOnPitch()` availability rule and applied it to team profiles, possession actor pools, shot fallback selection, keeper/taker selection, card attribution, goal-line clearance, injury victim selection and both the live/instant production path and retained legacy helper. Injured and dismissed players are excluded; an absent keeper falls back only to another eligible player.
- Injury waits are single-use per incident; the player's clock stops, they remain unavailable for at least 120 elapsed seconds, then return with a 45 fitness floor. Injured/dismissed players do not accrue on-pitch fatigue while out.
- Sub requests validate that the outgoing player is on the field and not dismissed, the incoming player is on the bench, and rights/opportunities remain. Multiple changes can be bundled into one stoppage; halftime changes do not consume one of the three normal windows; the team remains capped at five changes.
- Added `tools/qa-match-core-wave6.ts` / `qa:match-core:wave6`: **5/5** focused checks for actor exclusion, production actor traces, invalid/duplicate substitution rejection, 5-right/3-window enforcement with free bundled half-time changes, and one-shot injury return timing.
- Wave 1–6 focused suites pass (**5/5, 4/4, 5/5, 5/5, 5/5, 5/5**); feature QA 8/8, pitch QA 6/6, Wave 3 scenarios 4/4; production build passes (159 SW entries, accepted Phaser warning). Optional Playwright live E2E could not launch because the Chromium headless executable is not installed in this workspace; no E2E assertions ran. No version/schema changes, deployment or ZIP.

## Wave 7 implementation note

- Each match receives a deterministic fictional referee profile (lenient/balanced/strict); the assignment is logged at kickoff, surfaced in the opening event, and adjusts card/penalty thresholds. Yellow, second-yellow red and direct-red decisions are core events and reducer-derived stats.
- Fouls now create `FOUL_CALLED` → `RESTART_AWARDED` chains. The restart is a free kick or penalty; direct free-kick and penalty attempts use `free_kick`/`penalty` shot types. Corners are awarded after a clearance or a saved shot, carry an eligible assigned/fallback taker, and generate a corner attempt. All shots still go through the normalized shot model and event ledger.
- The existing Tactics → Duran Toplar selectors now expose only the active starting XI. Configured penalty/corner/free-kick takers are honored while active; injured/dismissed assignments fall back to the best eligible skill profile. Foul, corner, card, shot and save totals are reconciled against `StatReducer`; orphaned fouls or malformed restart chains fail final reduction.
- Added `tools/qa-match-core-wave7.ts` / `qa:match-core:wave7`: **4/4** covering referee determinism/modifier bounds, configured/fallback takers, real production event-chain coverage (foul/free kick/penalty/corner/yellow card) and reducer identities for yellow/red decisions.
- Waves 1–7 focused suites pass (**5/5, 4/4, 5/5, 5/5, 5/5, 5/5, 4/4**); feature QA 8/8, pitch QA 6/6, Wave 3 scenarios 4/4; production build passed (159 SW files, accepted Phaser warning). No 10k balance run yet—reserved for Wave 8. No app version/save-schema change, deployment or ZIP.

## Wave 8 implementation note

- Corrected AI baseline selection to compare each club's actual strength against its opponent (legacy call sites had passed ambiguous strength arguments); underdogs use a 4-4-2 counter-attacking baseline, favorites a 4-3-3 balanced baseline. `chooseAiTactic()` scores protect/balanced/positive/all-out candidates from score urgency, minute, relative strength and available fitness. Non-user-controlled teams evaluate at 65′ and 80′, log `TACTIC_CHANGE` events and never overwrite the manager-controlled side.
- Added focused profile-causality and utility tests: width/wing focus changes wide attack, center focus changes central attack, press affects pressing profile, direct passing affects transition; tests cover chasing, protecting, fatigue-aware risk and in-match user-side protection. `tools/qa-match-core-wave8.ts`: **4/4**.
- Dedicated seeded 10,000-match balance sweep: `tools/qa-match-core-wave8-balance.ts` / `qa:match-core:wave8:balance`; 2,000 matches each for Zirve, Geçit, Kök, favorite-at-home and favorite-away. Final average goals: **2.00 / 1.86 / 1.88 / 4.28 / 3.99**; balanced leagues combined **1.91**, complete matrix **2.80**; balanced home win rate **43.9%**, favorite wins **79.5%**, underdog wins remain nonzero; 0-0 **12.6%**, 9+ goals **1.2%**, red-card matches **5.9%**. Restart integration totals: **6,848 corners; 1,124 penalties**. Gate passed all distribution bounds and each match's final ledger/stat invariants.
- Calibration modestly lifted the per-step shot-intent ceiling, brought penalty/card probability back into balance, and adjusted AI underdog risk. Waves 1–8 focused tests pass (**5/5, 4/4, 5/5, 5/5, 5/5, 5/5, 4/4, 4/4**); feature QA 8/8, pitch QA 6/6, Wave 3 scenarios 4/4; production build passes (159 SW files, accepted Phaser warning). No app/save-schema version change, deployment or ZIP.

## Wave 9 implementation note

- Applied the user-approved **A — Spor Gazetesi** palette with the **hybrid** rule: everyday app surfaces are warm paper/light by default and follow explicit light/dark/system preference; the match pitch/canvas remains night-green/dark. Theme choice is resolved in the root HTML before first paint, kept in local storage, mirrored into `data-theme` and the browser `theme-color`, and follows system changes in automatic mode (including legacy Safari media-query listeners).
- Refined global tokens and shared UI: darker, AA-readable muted text in dark mode; a common keyboard focus ring; Georgia editorial display type and legible overlines; dynamic viewport and reduced-motion handling; focusable/keyboard-activatable clickable cards; minimum 44px touch token; semantic pressed-state segments and named dialog sheets with Escape, focus trap/restore and background scroll lock; live-region toasts. Settings labels and live-match tab icons now use the design system. Tactical warning text/icons and club budget accents now consume semantic theme tokens while the pitch art stays dark.
- Preserved offline-first behavior (no external font/style additions), app name/version, current save format and existing flows. Startup save cards now prefer the stored `meta.clubName` with safe fallback; quick-continue label extraction is pure/regression-tested. `PlayerPortrait` free-agent fallback receives a server-render regression test.
- Added `tools/qa-ui-wave9.tsx` / `qa:ui:wave9`: **6/6** covering light/dark AA token pairs; first-paint/system/browser-bar theme behavior; keyboard card/segment/dialog markup plus touch/reduced-motion/safe viewport; free-agent portrait fallback; `SaveMeta.clubName` quick-continue; and offline/paper identity.
- `npm run build`: **PASS**, TypeScript + Vite; SW precache 159 files. The accepted lazy Phaser chunk warning remains. Local only: no app version/save-schema change, deployment or ZIP. Browser-based 375×667 screenshot E2E was not run because this workspace has no Chromium executable; responsive constraints and touch tokens are covered by the focused static/SSR checks.

## Wave 10 implementation note

- Added a read-only `projectLiveMatch()` adapter. Score, clock, stats, ball runtime, momentum, event count and completion status are projected from the active `MatchSession`; duplicate UI clock/stat/done stores were removed. React state now only triggers renders. The six-tab scorebug/pitch/ratings/subs/analysis/table/feed console remains a presentation-only spec, including the dark pitch and existing cosmetic controls.
- Extracted `presentationDelayMs(x1|x2|x4)` and wired it only to the UI tick timeout; it is not part of `MatchInput` or MatchSession. `tools/qa-live-projection-wave10.ts` / `qa:live:wave10`: **5/5** checks for read-only projection, clock/state synchronization, all six tabs, speed-independent seeded outcomes and UI wiring.
- Production build passed with Wave 11 integration; SW precache 159 files; accepted Phaser chunk warning remains. No app/save schema change, deployment or ZIP. Browser screenshot E2E unavailable without Chromium; focused engine/adapter tests ran.

## Wave 11 implementation note

- Rebuilt `Market`’s offer flow as a face-to-face negotiation table: visible seller ask, three-step patience, deterministic counteroffers and reservation-price walk-away; structured wage/role/years; one-player-plus-cash exchange; optional 0–25% sell-on term; seeded leak risk. A leak is recorded in the inbox and raises that negotiation’s player wage request by 5%. A dedicated signing scene summarizes the deal; buy-back is explicitly absent.
- Added JSON-safe, backward-compatible persisted `sellOnClauses`; the seller can hold a future gross-resale share. Accepted sales (including accepted counters) settle all prior clauses, cap combined payout at 50%, credit only net proceeds to the budget, log the payout, and clear the clauses after sale. Existing player+cash swap/loan/quota checks remain in the store path.
- Added `tools/qa-transfer-wave11.ts` / `qa:transfer:wave11`: **5/5** checks for patience/counter/walk-away, swap+sell-on valuation and seeded leaks, JSON clause round-trip and resale payout, aggregate payout cap/malformed data, store wiring and no-buy-back boundary.
- Production TypeScript/Vite build passed (SW 159 files); accepted lazy Phaser warning remains. No app version change, local deployment or ZIP. Browser negotiation E2E was not run because Chromium is absent; core math/state and production bundle were checked.

## Wave 12 implementation note

- Academy intake is deterministic per career seed and academy level; the persisted intake records the academy level, candidates, per-candidate signing fees, decisions, and exact expiry day. Signing validates roster capacity, transfer funds, and monthly wage headroom, writes the youth to the squad/world model, and records a youth transfer entry. Old saves normalize missing intake fields safely.
- Added `tools/qa-academy-wave12.ts` / `qa:academy:wave12`: **5/5** checks for deterministic/scaled intake, roster and finance limits, JSON/legacy migration, exact expiry boundary, and store/UI wiring. Re-run checkpoint: **5/5**. Production build passed. Registration fee reference case: ₺0.23M; offer remains open through day 18 and expires on day 19.

## Wave 13 implementation note

- Match archives now persist exact player-minute/goal/assist/card/rating rows and referee details for user-played fixtures, with a bounded archive and safe migration for older saves. The “Saha Defteri” newsroom derives headlines only from played fixtures, league pulse from standings, Team of the Week from archived player evidence, and referee reports from saved match evidence.
- International fixtures are also included in the newsroom’s played-result headlines; no headline fabricates a score. Added `tools/qa-newsroom-wave13.ts` / `qa:newsroom:wave13`: **4/4** re-run focused checks passed for truthful headlines, evidence-only XI, table/referee evidence, migration, and screen wiring. Production build passed.

## Wave 14 implementation note

- Added deterministic, save-normalized club culture: fan/community trust, discipline, ultras heat, a fictional chairman profile, nemesis club, season honors, pending decision and decision history. Match signals include derby losses/wins, red-card discipline incidents and high-profile discipline scandals (multiple reds or a derby red); calendar signals generate community and evidence-based FFP decisions. Decisions apply explicit costs, board-confidence changes and culture effects, then persist to history/inbox.
- FFP uses current monthly payroll against the wage ceiling plus the season’s recorded incoming/outgoing transfer fees. Club > Kültür shows the live ratios/status, decision choices, honors, chairman and nemesis. Season-end honors are threshold-based and deduplicated.
- Added `tools/qa-culture-wave14.ts` / `qa:culture:wave14`: **6/6** checks passed for deterministic/migrated culture, FFP boundaries, community/scandal/supporter/audit decisions, season-honor deduplication, and store/UI integration. Production build passed.

## Wave 15 implementation note

- Added **24 fully fictional external clubs** in a separate pool: domestic `CLUBS` and the three domestic league schedules remain unchanged. Their deterministic fictional squads allow domestic-user fixtures against visiting sides to use the normal match engine.
- Finalized the delayed qualification waterfall. **HM26 Şampiyonlar Kupası** takes the Miras Cup holder, the top four Zirve, top two Geçit and top Kök place, deduplicates, then fills to eight from domestic merit; **HM26 Kıtalar Kupası** takes the Miras Cup finalist, the next four Zirve, next two Geçit and next Kök place, excludes first-cup entrants, then fills to eight. Each cup adds eight distinct fictional visitors by coefficient; the first eight and next eight visitor rankings enter each cup. Each competition therefore has 16 unique teams (8 domestic + 8 foreign), and a club cannot enter both in the same season.
- Each tournament uses four groups of four, a three-match round robin (days 38/61/84), first/second place advancement to quarter-finals, then quarter-final/semi-final/final (days 174/230/279). AI and manager-played fixtures, tie-break penalties, group tables, per-cup top scorers, winner/finalist, and season archives are persisted. Archives store participants, all group tables and top scorers; domestic season transitions build the next qualification draw. Old saves receive a deterministic current-season draw.
- “Müsabakalar → Kıtalar” exposes both cups, group standings/fixtures, brackets, scorer leaders, champions/finalists and archive. Matches flow through the existing MatchCore/LiveMatch path and do not alter domestic league tables. Newsroom headlines include only recorded international results.
- Added `tools/qa-international-wave15.ts` / `qa:international:wave15`: **6/6** checks passed for 24-club isolation, 8+8 qualification/no double entry, group schedules/tables, unique bracket progression and winner/finalist, scorer/archive/save-load migration, and store/UI wiring. Production TypeScript/Vite build passed; SW precache remains 159 files. The accepted lazy Phaser chunk warning remains; no app-version change, deployment or ZIP.

## Preserved existing features / constraints

- Current v0.9.13 Wave 2/3 live-match work remains the product baseline, including accessible console tabs, reduced-motion behavior and cosmetic engine-gated events.
- Existing trade feature remains player-plus-cash only; buy-back is not in scope.
- No live production deployment or ZIP is implied by local implementation waves.
