# Frontend handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Frontend  
agent_id_or_session: `019fb7f1-4164-7003-a5c0-5e109ee82074`  
status: active correction
current_task: correct Cascade 3 P0 `items` array consumption
next_queued_task: Cascade 4 peaks UI contract design
blocker_or_no_eligible_work: first P0 handoff rejected for object/array mismatch
last_handoff: P0 bottom tabs implemented; integration correction requested

Earlier ephemeral threads became unavailable after completion. Future Frontend
work must resume the persistent canonical ID above.

## Cascade 2

goal: Add MATLAB-like signal visibility while retaining fixed 2×2.  
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.  
contracts: Russian visibility checkbox/state per row; checkbox events stop
propagation and do not select rows. A serialized revision queue sends full
canonical `visible_signals`, preserves newest intent across stale responses and
uses server state/revision. Time and spectrum consume
`plot_payload.time_traces`/`spectrum_traces`; heatmaps consume selected payload.
Stable selectors include `signal-visibility-checkbox-*`,
`signal-visibility-state-*`, and `plot-host-*`. Fixed 2×2/no layouts.  
changes: Added visibility column/control states, queue integration, named/color
legend traces, Plotly ready/state markers, and placeholder cleanup immediately
before `Plotly.react` without purge or host replacement.  
verification: `node test/front/run_front_tests.js` PASS, 2/2 files, including
the corrected all-visible time trace assertion.  
risks: Runtime target containing the changes has not been observed.  
follow-ups: Run visibility Playwright scenario after deployment/current target
update.

## Dated handoff 2026-07-31 — bundled Plotly delivery

goal: Remove runtime dependence on a stalled CDN body while retaining fallback.  
scope: Frontend-owned index/app/vendor files only.  
contracts: Local Plotly loads before app, normalizes UMD `window.moduleName` to
`window.Plotly`, resolves nested Genie base paths through currentScript, and
uses CDN only if local load fails.  
changes: Added official npm `plotly.js-cartesian-dist-min@3.1.0` and MIT license;
index loads it before app; app uses local-first `ensurePlotly` with CDN fallback.
Artifact SHA-256:
`c462b40a1a542e16c3533f97d39fbbb91af4f5267f3cbf23bd70d785efc44c38`.  
verification: Frontend implementation handoff only; Tester and prod E2E have
not yet verified this delivery path.  
risks: UMD normalization, nested base path and no-CDN behavior require tests;
do not mark verified/deployed yet.  
follow-ups: Tester checks artifact/license/hash/static loader. E2E asserts four
ready plots, zero visible placeholders and zero CDN requests on local success.

## Cascade 3 P0 integration note — 2026-07-31

Accepted UI direction: bottom `Сигналы`/`Измерения` tabs, default Signals,
local-only tab switch, settings sidebar unchanged and exact stable selectors.
The first handoff incorrectly consumed `measurements.items` as an object and was
not accepted. Frontend resumed the same agent ID to consume the frozen ordered
array by `item.id`, `item.time_s` and `measurements.units`.
