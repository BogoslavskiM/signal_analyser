# Frontend handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Frontend  
agent_id_or_session: `/root/frontend_cycle`
status: active autonomous cycle 2
current_task: verify/correct Cascade 3 P0 `items` array consumption
next_queued_task: Cascade 4 peaks UI contract design
blocker_or_no_eligible_work: first P0 handoff rejected for object/array mismatch
last_handoff: P0 bottom tabs implemented; integration correction requested

Earlier ephemeral threads became unavailable after completion. Future Frontend
work must resume the persistent canonical ID above.

Replacement note 2026-07-31: `/root/frontend_cycle` replaces stopped session
`019fb7f1-4164-7003-a5c0-5e109ee82074` for autonomous cycle 2.

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

## Autonomous cycle 2 P0 handoff — 2026-07-31

goal: Complete snapshot-backed measurements UI for the active Display page.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Exact ordered `measurements.items`; value/time units; null
time/index as em dash; local-only Signals/Measurements tabs; Russian
loading/error/empty states; stable table/row/scope selectors; no new endpoint.
changes: Added accessible local panels, full measurement columns and scope
attributes. Preserved one-graph Display pages and sidebar. Removed runtime CDN
fallback in accordance with canonical `graph-output-zone`.
verification: JS syntax and diff checks PASS. Initial full front test conflict
was resolved by Tester in favor of the current local-only skill; final suite
PASS 2/2.
risks: Runtime target is not available yet.
follow-ups: Runtime E2E; peaks UI remains contract-only until Backend publishes
an accepted specialized function payload.

## Cascade 4 read-only UI contract — 2026-07-31

No product code was added. A future Peaks result is scoped to the active
Display ID, authoritative selected visible signal and a backend context/revision
key. Proposed stable states are `peaks-loading-state`, `peaks-error-state`,
`peaks-empty-state`, `peaks-table` and backend-stable `peak-row-<id>`; labels or
values may not be used as identifiers. Graph markers require backend-provided
geometry and are not inferred in frontend. Transport, lifecycle, result schema,
units, settings and marker contract remain unresolved Backend inputs. Until
those exist, `find-peaks-action` is only a visual integration point.

## Cascade 4 P0 Peaks UI — 2026-07-31

goal: Consume the frozen authoritative Peaks snapshot without frontend math.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Existing revision queue sends `peaks_enabled` through `/api/view`;
action is Time-only; root/display/item scope is backend-owned; no endpoint,
fallback, CDN or extended settings.
changes: `find-peaks-action` now has pressed/busy/disabled/rollback semantics.
Added hidden local `peaks-panel-tab`, labelled panel, loading/error/empty/table
states, roving keyboard integration, horizontally accessible table and scoped
marker trace using backend item coordinates. Plotly trace meta identifies
`peak-marker-trace`, Display and signal. Non-Time clears capability; successful
enable opens Peaks, disable restores Signals if necessary.
selectors: `peaks-panel-tab`, `peaks-panel`, `peaks-table`, state selectors,
`peak-row-<backend-id>`, field data attributes, app/table revision and scope.
verification: JS syntax, diff and frontend 2/2 PASS; Tester and Playwright static
contracts consume the same selectors.
risks: Runtime Plotly/DOM evidence awaits authenticated deployed target.
follow-ups: Runtime C4 E2E; thresholds/settings/Label Peaks remain separate.

## Cascade 5 P0 Clear Display UI — 2026-07-31

goal: Render independent row selection/membership and reversible empty Display
without adding a second graph host or endpoint.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Canonical `/api/view` payload sends row selection, nullable analysis
source, ordered membership and Peaks flag. Row click couples source only when
the row is a member; checkbox does not select the row. Last uncheck/Clear are
allowed; first re-add is canonicalized by Backend.
changes: Added accessible overflow menu/Clear action, keyboard focus lifecycle,
root/row membership attributes and plot/measurement/peak empty states. Empty
render calls Plotly purge and clears host trace properties while preserving the
same host element.
selectors: `display-overflow-trigger`, `display-overflow-menu`,
`clear-display-action`, `empty-display-plot-state`,
`empty-display-measurements-state`, `empty-display-peaks-state`,
`data-row-selected`, `data-display-membership`.
verification: JS syntax and diff PASS; frontend 2/2 PASS including persistent
host/no-stale Plotly state.
risks: Runtime keyboard/Plotly evidence awaits authenticated deployed target.
follow-ups: Run the prepared Clear Display E2E after authorized deployment.

## Cascade 6 Time presentation controls — 2026-07-31

goal: Correct existing Normalize Y/Show Markers controls as local per-Display
Time presentation.
changes: Each ordinary Time trace is cloned and normalized independently to
`[0,1]`; constants become zero. Peaks markers use the analysis-source affine
scale without clipping. Ordinary markers use `lines+markers` only on Time.
Non-Time/empty disables controls while preserving preferences. Invalid visible
Time y renders `plot-invalid-data-state`, purges the same host and skips react.
state: `data-normalize-y` and `data-show-markers` are exposed on root/host; no
API request or revision mutation occurs.
verification: JS syntax/diff and frontend 2/2 PASS; checkpoint `f546195`.
risks: Runtime evidence awaits an authenticated deployment.

## Cascade 7 Time Limits UI — 2026-07-31

goal: Commit page-local seconds limits without replacing the graph host or
mutating backend traces.
changes: Added exact Min/Max inputs, per-Display drafts/errors, Enter/blur/change
dedupe, canonical `/api/view` field, 409 retry and canonical nested 422 rollback.
Time uses `xaxis.range`; non-Time/empty disables controls and preserves state.
CSS adds compact responsive, focus, disabled and error states.
verification: JS syntax/diff and frontend 2/2 PASS.
risks: Runtime interaction awaits authenticated deployment.

## Cascade 8 selectable Statistics UI — 2026-07-31

goal: Expose authoritative per-Display measurement selection without client
calculation.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Three functional local settings tabs; native checkbox controls in
canonical order; exactly one serialized full `/api/view` per checkbox change;
nested field-level error; empty Display disabled without preference loss;
`Signal statistics` opens Measurements settings and bottom results.
selectors: `statistics-settings-tab`, `statistics-controls`,
`statistics-option-<id>`, `statistics-selection-error`, existing
`measurement-row-<id>`.
changes: Added accessible tab state/keyboard navigation, snapshot-driven
selection rendering and strict rollback/canonical response handling. No
statistics formula or alternate endpoint was added to JavaScript.
verification: Frontend static/behavior 2/2 PASS; JavaScript syntax and stable
selector contracts PASS.
risks: Browser runtime layout, focus and network behavior await an authenticated
deployed target.
follow-ups: Run the prepared selectable Statistics scenario on the exact
accepted product SHA.
