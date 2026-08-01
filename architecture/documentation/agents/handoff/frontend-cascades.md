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

## Cascade 9 Spectrum settings UI — 2026-08-01

replacement: `/root/frontend_c9_replacement` replaced
`/root/frontend_cycle` after the original thread exhausted context and declared
its partial rewrite unsafe to finish.
goal: Add exact Spectrum controls without a fourth settings tab or client DSP.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Display-owned full `spectrum_settings`; native Scale/Frequency
selects and Leakage range; change-only serialized mutation; 422 rollback and
409 replay; complex-safe Log; Spectrum-only Plotly `xaxis.type`.
changes: Added the conditional Display-panel subsection and stable selectors,
normalization/state queue plumbing, per-Display inline errors and minimal CSS.
verification: `node --check` PASS; frontend static/behavior 2/2 PASS; diff
check PASS.
risks: Live DOM/network/Plotly behavior remains unobserved until target runtime.
follow-ups: Run the prepared C9 E2E after authorized deployment.
next_task_candidates: Only controls backed by a newly frozen Backend contract.

## Cascade 10 Frequency Limits — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c9_replacement`.
goal: Add Frequency Limits without a fourth tab or client-side DSP.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Four-key canonical state; backend-effective Auto values; stable F
min/F max/error IDs; draft-only input, deduplicated commit, exact full request,
local invalid and 422 rollback, 409 replay, Auto reset by clearing both fields.
changes: Added accessible native fields in existing Display Spectrum section,
per-Display drafts/errors and queue integration. No Log-floor control, Nyquist
calculation, filtering or cropping.
verification: `node --check` PASS; frontend 2/2; public diff check PASS.
risks: Runtime behavior remains unobserved on an exact deployed C10 target.
follow-ups: Read-only Spectrogram/Persistence UI inventory; no implementation
before typed Backend settings exist.
next_task_candidates: Heatmap metadata surface after contract freeze.

## C11 heatmap UI read-only inventory — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c9_replacement`.
current_surface: Spectrogram/Persistence already use one persistent Plotly
heatmap host and backend arrays/axis/color labels. No multi-layout is required.
Current heatmaps have no typed Display settings/ROI contract and frontend
locally chooses Jet; this must not become an inferred editable setting.
proposal: Keep exactly three tabs. Until settings exist, at most expose a
read-only conditional Heatmap metadata group with candidate IDs
`heatmap-settings`, `heatmap-kind-value`, `heatmap-x-axis-value`,
`heatmap-y-axis-value`, `heatmap-colorbar-value`, `heatmap-empty-state`.
backend_dependency: Canonical source/kind/axes/color units and actual ranges;
future editable settings require exact full `/api/view` shape, defaults,
validation and locality. Frontend must not calculate bins, limits, color scale
or clip `z`.
verification: Read-only inventory of public files and both reference PNGs; no
files changed.
risks: Current full-signal placeholder behavior ignores Display ROI and could
misrepresent controls.
next_task_candidates: Metadata-only UI after Backend/provider/ADR freeze.

## Cascade 12 Spectrogram Overlap UI — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c9_replacement`.
goal: Add one Display-local Overlap control without client DSP or new tabs.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Conditional native input/error; draft-only input; change/blur/Enter
full-view commit; local range 0..75; canonical 422 rollback; one latest 409
replay; one host and exactly three tabs.
changes: Added Spectrogram subsection and per-Display draft/error state.
Last-accepted settings are captured from server snapshots so consecutive 422s
cannot restore optimistic state. Stale replay removes same-Display queued view
duplicates before inserting exactly one latest desired target.
verification: JavaScript syntax/diff PASS; frontend 2/2.
risks: Runtime browser behavior awaits an exact deployed target.
follow-ups: Do not reuse Spectrum Leakage state for Spectrogram; wait for ADR.
next_task_candidates: C13 UI only after typed backend contract.

## Cascade 13 Spectrogram Leakage UI — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c13_impl`.
scope: `public/index.html`, `public/js/app.js`.
contracts: Exact two-key normalized state; independent native range/value/error;
draft on input, one full-view change; accepted 422 rollback; at most one 409
replay; one host/three tabs/no client DSP.
changes: Added per-Display Leakage draft/error and distinct commit bookkeeping.
Second stale response removes only a matching desired target, accepts canonical
server state, restores the corresponding setting, shows inline error and drains
without overwriting a newer queued target.
verification: JavaScript syntax/diff and frontend 2/2 PASS.
risks: Runtime browser timing remains unverified.
follow-ups: No MATLAB slider-scale parity claim; normalized provider value only.
next_task_candidates: C14 control only after typed ADR/backend.

## Cascade 15 Spectrogram Frequency Limits UI — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c13_impl`.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Exact three-key normalization; backend-effective Auto fields;
per-Display pair draft; atomic Enter/group-focusout commit; accepted 422
rollback; one bounded 409 replay; Spectrum independence.
changes: Added F min/F max/error selectors. Audit consolidated Spectrogram to
one render/bind implementation and removed per-input blur/change submission;
intra-pair focus is request-free.
verification: Frontend 2/2, JS syntax and diff PASS.
risks: Runtime browser behavior awaits exact target; source markup uses a safe
dynamic mount into the existing compact one-line Spectrogram section.
follow-ups: C16 requires backend-authoritative requested/effective state.
next_task_candidates: C16 scale select only after successor ADR.

## Cascade 16 Frequency Scale UI — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c13_impl`.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Exact four-key desired target; backend-authoritative requested/
effective/available; disabled no-source/complex; bounded 422/409; transient Log
y clone only.
changes: Added native scale select, effective/error surfaces and Plotly Log
presentation. All-nonpositive nonempty y has stable error; empty y remains the
ordinary empty state.
verification: Frontend 2/2, JS syntax/diff and final audit PASS.
risks: Live Plotly/network behavior awaits exact deployment.
follow-ups: Do not infer or add Power Limits before C17 ADR.
next_task_candidates: C17 feasibility inventory after frozen contract.

## C17 Power Limits UI inventory — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c17_power_inventory`.
goal: Define the smallest vanilla-JS C17 control/render state before editing.
scope: Read-only `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Atomic P min/P max fieldset, effective readout and inline error in the
existing Spectrogram section. Mirror Frequency Limits per-Display draft/commit
state; no request on intra-pair focus. Consume backend effective metadata as
Plotly zmin/zmax only and never derive from bounded z.
selectors: `spectrogram-power-limits-controls`,
`spectrogram-power-min-input`, `spectrogram-power-max-input`,
`spectrogram-power-limits-effective`, `spectrogram-power-limits-error`.
changes: None; feasibility inventory only.
verification: Read-only implementation-anchor review; no frontend test was
required because no file changed.
risks: Constant equal Plotly bounds are version-sensitive; DEC-023 freezes a
renderer-only ±1 dB fallback without changing metadata/z.
follow-ups: Consume backend effective metadata, keep exact five-key queue and
hand stable selectors/workflows to E2E Tester.
next_task_candidates: Implement after backend five-key metadata is available.

## Cascade 17 Power Limits UI — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c17_power_inventory`.
scope: `public/index.html`, `public/js/app.js`, `public/css/app.css`.
contracts: Exact five-key desired target; atomic P min/P max group; Auto clear;
accepted 422 rollback; one bounded 409 replay; exact metadata validation;
Plotly-only z range and constant ±1 dB fallback.
changes: Added stable controls/effective/error selectors and per-Display draft
state. Invalid or inconsistent backend metadata now produces a stable contract
error and cannot silently derive bounds from transported z.
verification: Frontend 2/2, JS syntax/diff and final audit PASS.
risks: Runtime Plotly interaction awaits a CDP/application target.
follow-ups: Preserve vanilla JS and exact metadata boundary in C18.
next_task_candidates: C18 feasibility only after a frozen decision.

## C18 typed Persistence frontend inventory — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c18_persistence_inventory`.
scope: Read-only `public/js/app.js` and frontend tests.
contracts: Existing generic heatmap already consumes exact Persistence x/y/z
wire; no settings, outgoing API fields, metadata or controls are required.
changes: None; product migration is zero if wire and labels remain stable.
verification: Read-only renderer/state/client inspection.
risks: Generic renderer is not a strict schema validator; backend typed
validation remains authoritative. Do not inject `frequency_scale` metadata.
follow-ups: Add focused positive/empty behavior regression after backend diff:
one heatmap, bit-identical x/y/z, linear y, occurrence colorbar, no controls.
next_task_candidates: C18 frontend tests only.

## C19 Persistence Leakage frontend inventory — 2026-08-01

canonical_role: Frontend
session: `/root/frontend_c18_persistence_inventory`.
goal: Map a strictly independent Persistence Leakage control without editing.
scope: Read-only `public/index.html`, `public/js/app.js`, `public/css/app.css`
and frontend tests.
proposed_contract: One exact `persistence_settings` object with normalized
`leakage`; per-Display draft/accepted state; full desired target; equal value is
a no-op; local invalid causes no request; 422 restores accepted state; one 409
retry and bounded second-409 rollback. Clear and source changes preserve intent.
selectors: `persistence-settings`, `persistence-leakage-input`,
`persistence-leakage-value`, `persistence-leakage-error`.
isolation: No client DSP and no coupling to Spectrum or Spectrogram Leakage.
No-source state disables the control while retaining the Display preference.
changes: None; feasibility inventory only.
verification: Read-only state/render/request lifecycle inspection.
risks: Normalized `0..1` presentation is a product choice; implementation is
blocked until prod provider evidence and an accepted ADR freeze defaults,
validation and wire shape.
follow-ups: Implement only after the C19 documentation checkpoint.
next_task_candidates: Exact state/UI/request implementation after probe PASS.
