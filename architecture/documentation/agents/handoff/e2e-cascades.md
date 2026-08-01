# E2E Tester handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: E2E Tester  
agent_id_or_session: `/root/e2e_cycle`
status: active autonomous cycle 2
current_task: Cascade 3 P0 snapshot UI scenario, display lifecycle and timing logging
next_queued_task: Cascade 4 peaks scenario design
blocker_or_no_eligible_work: runtime execution waits for a deployed P0 target
last_handoff: Cascade 2 prod E2E 7/7 at runtime SHA `2eba776`

Earlier ephemeral threads became unavailable after completion. Future E2E
Tester work must resume the persistent canonical ID above.

Replacement note 2026-07-31: `/root/e2e_cycle` replaces stopped session
`019fb7f1-4bbf-75d2-9279-d8dedede56c5` for autonomous cycle 2. Its initial
turn hit temporary model capacity and the same thread was resumed successfully.

## Cascade 2

goal: Add user-level visibility/multi-trace/placeholder regression coverage.  
scope: `test/playwright/**`.  
contracts: checkbox/row independence, minimum one visible, selected fallback,
visible line legends/colors, selected heatmaps, live Plotly hosts, no visible
`Подготовка графика…` after ready, and fixed 2×2.  
changes: Added selector prefixes, support helpers/assertions,
`visibility_cascade.test.js`, support contract updates and coverage row
`SA-VIS-07`.  
verification: Support contract PASS; JS syntax, shell syntax, diff and spec-load
checks PASS in role handoff. Runtime E2E not run because CDP was unavailable and
the second cascade was not deployed.  
risks: Runtime requires at least two seed signals and a target containing the
current product diff.  
follow-ups: Run `PLAYWRIGHT_SPEC=signal_analyser/visibility_cascade` against the
updated target. Use background CDP when possible; otherwise coordinate with
MATLAB Researcher before browser Space/focus/window actions and record
`browser_workspace_setup` without moving or closing MATLAB.

browser_workspace_setup: pending runtime run; required evidence fields are CDP
background mode or separate Chrome macOS Space/desktop, fullscreen fallback,
MATLAB Researcher coordination result and confirmation MATLAB was unchanged.

## MATLAB SA-UI-001 follow-up

- Cover row selection independently of display visibility/membership.
- Confirm multiple visible traces only for Time/Spectrum and selected-only
  heatmaps in the fixed 2×2 Genie contract.
- Do not encode MATLAB layout/docking or assume multi-signal
  Time-Frequency/Persistence.
- Duplicate import overwrite becomes an E2E task only when a product import
  workflow is in scope.

## Pending prod bundled Plotly scenario

On the deployed target capture network and DOM/Plotly state: exactly four ready
plot hosts, zero visible `.plot-placeholder`, and zero CDN Plotly request when
the local vendored artifact succeeds. Record `browser_workspace_setup`. Do not
mark deployed/verified before this scenario passes.

## Maintenance shell evidence contract

При `Server maintenance` / «Ведутся технические работы» E2E record сохраняет
base/auth availability, target HTTP status, final URL, title/body evidence и API
probe. Затем запрашивает у DevOps process status и log tail. HTTP 200 shell при
доступных base/auth классифицируется как target app/proxy failure. После
start/redeploy E2E повторяет target probe и исходный scenario.

portable_behavior: Checkbox changes plotted visibility; row selection remains
independent and enables selected-signal operations.  
matlab_layout_specific: MATLAB docking and multi-layout are reference-only and
must not replace the Genie fixed 2×2 layout.

## Cascade 3 P0 assignment — 2026-07-31

goal: Cover snapshot-backed raw statistics through bottom tabs.
scope: `test/playwright/**`.
contracts: Default `Сигналы`; local `Измерения` switch without API mutation;
selected visible name and exact minimum/maximum/mean rows; row selection and
hidden-selected fallback update UI; no measurements endpoint, peaks or loading
placeholder.
performance_evidence: Sufficient temporary timing logging is mandatory during
scenarios. E2E Tester chooses implementation, placement and format, then uses
the logs to analyze performance, hangs, retries and timeout suitability. A
material issue produces an evidence-backed Architect handoff; no universal
metric list or fixed threshold is prescribed.
browser_workspace_setup: background CDP preferred; interactive actions retain
the existing MATLAB coordination guardrail.
next_task_candidates: Cascade 4 specialized peaks scenario after its API/state
contract is accepted.

## Autonomous cycle 2 P0 implementation — 2026-07-31

goal: Exercise snapshot-backed Measurements through the active Display page.
scope: `test/playwright/**`.
contracts: Default Signals tab; local Measurements switch with zero API
requests; exact minimum/maximum/mean order; selection and hidden-selected
fallback refresh scope; no measurements/peaks endpoint.
changes: Reworked the P0 scenario, enabled its capability, added ordered DOM
observation, coverage mapping and timestamped semantic/API timing logs.
verification: All Playwright JS syntax PASS; support contract PASS; diff check
PASS. Runtime pending because `127.0.0.1:9222` has no listener and the bootstrap
attempt did not expose CDP.
performance_evidence: App-ready, local switch, each `/api/view` and total
scenario durations are logged. There are no retries; operation limits are 30s
and navigation is 60s. No soft budget is claimed without a healthy baseline.
browser_workspace_setup: Background-only; no focus/Space/fullscreen/move/close
actions. MATLAB Researcher confirmed MATLAB remained unchanged.
source_evidence: Internal saved scenario
`SA-UI-003-display-settings-measurements.md`; only portable initial
Minimum/Maximum/Mean identity/scope was used.
risks: No available runtime target; product result is not inferred.
follow-ups: Align legacy Playwright geometry/network assertions with DEC-009
Display pages and DEC-010 local-only Plotly, then run when CDP/target exists.

DEC-009/010 alignment is complete: `display_pages` asserts one active host and
page-local membership; `plotly_local_delivery` blocks/restores the local bundle,
checks the stable Russian error and forbids external Plotly requests. Nested
Genie paths are recognized as API paths in the local-tab no-request guard.
Syntax/support/runner-help/diff checks PASS.

CDP root cause: no listener is currently present. A prior log briefly reached
`DevTools listening` and then the wrapper exited. E2E sandbox cannot write
`/tmp/genie-playwright-chrome.log` or the user-session `google-vpn.log`, so it
cannot safely retain the only available `vpnp google` launcher. DevOps owns the
process/log prerequisite. No browser focus/Space/window action occurred and
MATLAB stayed unchanged.

One coordinated retained-PTY CDP attachment later succeeded. Background
navigation to the canonical target ended at `https://engee.com/account/login`
with title `Личный кабинет | Engee`; no app shell was observable. This is an
authentication prerequisite, not a maintenance/app regression. No body/API
payload was exported, no product spec ran and local `651943d` expectations were
not applied to the older unavailable target context.

## Cascade 4 P0 Peaks static contract — 2026-07-31

goal: Prepare runtime user scenario without fabricating selectors or provider
results.
scope: `test/playwright/e2e.config.js`, support contract and
`specs/signal_analyser/peaks_p0.test.js`.
contracts: One revision-safe POST `/api/view` per toggle, no `/api/peaks`, exact
root/display/revision/signal/item scope, zero-based ordered finite items,
backend marker meta, local bottom navigation with zero API calls, Time-only
lifecycle and cleanup.
changes: Registered final Frontend selectors/capability and added the complete
scenario with timing logs. It validates DOM fields against direct authoritative
snapshot and Plotly trace meta/coordinates.
verification: All Playwright JS syntax, support contract, runner help and diff
PASS. Runtime intentionally not run because canonical target redirects to login.
risks: Authenticated retained CDP target plus deployed C4 SHA are prerequisites.
follow-ups: DevOps deployment/auth handoff, then run `peaks_p0` and preserve
timing/network evidence.

## Cascade 5 Clear Display static contract — 2026-07-31

goal: Prepare deterministic runtime coverage for empty/recovered Display and
selection separation.
scope: `test/playwright/**`.
contracts: Keyboard-accessible menu; exactly one revision-safe Clear request;
empty active membership/source/Peaks; unchanged global rows/row selection and
inactive page; zero stale traces; first re-add +1/source/Peaks disabled; member
versus nonmember row-click behavior.
changes: Added `clear_display.test.js`, exact overflow and
`empty-display-*` selectors, feature registration and page-object separation of
`data-row-selected` from `data-display-membership`.
verification: All Playwright JS syntax, support contract, runner help and diff
PASS. Runtime intentionally not run without an authenticated deployed target.
risks: DOM/Plotly/network behavior is prepared, not yet observed in prod.
follow-ups: Run `signal_analyser/clear_display` after the exact product SHA is
available and preserve timing/setup evidence.

## Cascade 6 Time presentation static contract — 2026-07-31

goal: Exercise revision-neutral Normalize Y/Show Markers across Display pages.
changes: Added `time_presentation.test.js`, stable control/invalid-state IDs and
feature registration. Scenario validates zero API/revision, single host/react,
per-trace normalization, constant zero, source immutability, raw/bounded Peak
affine mapping, Time-only marker mode, page restoration, empty/non-Time
disablement and deterministic cleanup.
verification: All JS syntax, support contract, runner help and diff PASS.
runtime: Not run; canonical target remains authentication/deployment-blocked.

## Cascade 7 Time Limits static contract — 2026-07-31

goal: Prepare a deterministic runtime scenario for ROI commit and lifecycle.
changes: Added `time_limits.test.js`, selectors/feature registration and exact
root/display envelope assertions. Scenario covers draft no-request, one commit,
same host/source, Plotly range, Measurements/Peaks revision/absolute positions,
equal no-op, nested 422 rollback, source preserve/reset, Display A/B,
non-Time, Clear/null/re-add and cleanup.
verification: All JS syntax, support contract, runner help and diff PASS.
runtime: Not run; authenticated deployed target is still required.

## Cascade 8 selectable Statistics static contract — 2026-07-31

goal: Prepare deterministic runtime coverage for per-Display statistics choice
without claiming a browser run.
scope: `test/playwright/**`.
contracts: Capture and restore original membership, source, ROI, active page and
selected kinds; wait for create/select/close Display responses; check canonical
order/defaults, one request, narrowed inclusive ROI, page independence, Clear
preservation and first re-add recomputation. Disabled controls on empty Display
and exact cleanup are required. Arbitrary and empty subsets remain covered by
the backend/frontend matrices rather than claimed as a browser observation.
changes: Registered selectable Statistics selectors and a lifecycle-safe
scenario in the existing background-only workspace harness.
verification: All Playwright JavaScript syntax, support contract and runner
`--help` PASS.
runtime: Not run; an authenticated deployed target is still required. No live
DOM, Plotly or network result is inferred from the static gate.
risks: Runtime focus/layout/request timing and exact deployed SHA remain open.
follow-ups: Run only after an accepted deployment and retain cleanup/timing
evidence.

## Cascade 9 Spectrum settings/ROI static contract — 2026-08-01

replacement: `/root/e2e_c9_replacement` replaced `/root/e2e_cycle` after the
original thread repeatedly exhausted context and left incomplete cleanup.
goal: Prepare a deterministic Spectrum scenario that never leaves page state
mutated and never performs a prohibited complex+Log request.
changes: Added `spectrum_settings_roi.test.js`, selectors and feature mapping;
corrected the checkbox prefix to the actual `signal-checkbox-*` contract.
coverage: Defaults; exactly one `/api/view` and `+1` for Scale/Frequency/
Leakage/ROI; root/display mirror; real `0..Nyquist`; complex Log disabled;
Normalize zero-request; B defaults; Clear/re-add. Cleanup closes B first and
restores A membership/source/settings/ROI/Normalize/plot/active page. It first
uses Linear before returning a complex member and skips same-value mutations.
verification: All Playwright JavaScript syntax, support contract, runner help
and diff check PASS.
browser_workspace_setup: Browser and MATLAB were not touched; static-only.
risks: Runtime timing/network/Plotly assertions remain pending deployment.
follow-ups: Run only against the exact accepted deployed SHA and retain timing
evidence.
next_task_candidates: Runtime C9; next frozen Spectrum slice afterward.

## Cascade 10 Frequency Limits static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c9_replacement`.
scope: `test/playwright/**` C10 scenario, config, support and coverage map.
contracts: Auto/effective display; atomic pair setup and one Enter/request/+1;
equal no-op; local invalid and 422 rollback; synthetic 409 replay; A/B,
Clear/re-add, real Log Min0, exactly three tabs, no Log-floor and conditional
exact cleanup including Auto restoration.
changes: Added `frequency_limits.test.js`, selectors, feature flag and support
contract. Pair drafts are set without focus transfer before the single observed
commit, so ordinary per-field blur semantics are not over-constrained.
verification: All Playwright JS syntax, support contract, runner help and diff
PASS.
browser_workspace_setup: Background CDP only is planned; no focus/Space/window
action occurred and MATLAB was unchanged.
risks: Runtime skipped because no authenticated target with exact C10 SHA.
follow-ups: Run after an authorized exact deployment and retain timing/network
evidence.
next_task_candidates: Runtime C9/C10 only after target availability.

## Cascade 11 typed Spectrogram static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c9_replacement`.
scope: `test/playwright/**` typed Spectrogram scenario, config, support and
coverage map.
contracts: One active graph host/one heatmap/no placeholder; analysis-source
wire identity and source switch; frequency × time shape; real one-sided and
conditional complex centered topology; exactly three settings tabs and no new
controls.
changes: Added `typed_spectrogram.test.js` and registered its capability.
verification: All Playwright JavaScript syntax, support contract, runner help
and diff PASS.
browser_workspace_setup: Static-only; browser, windows and MATLAB untouched.
risks: Runtime skipped because no authorized exact C11 deployment exists.
follow-ups: Run on exact accepted target; preserve network/Plotly evidence and
cleanup.
next_task_candidates: Runtime C11 after deployment; future OverlapPercent E2E
only after its contract exists.

## Cascade 12 Spectrogram Overlap static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c9_replacement`.
scope: `test/playwright/**` Overlap scenario, config, support and coverage map.
contracts: Default 50; valid 0/75; no-op; local invalid; synthetic 422/409;
A/B/Clear/re-add/source; one host and exactly three tabs; exact cleanup.
changes: Added `spectrogram_overlap.test.js`. Source capture, mutation guard and
cleanup use active Display `analysis_signal`, never independent row selection.
verification: All Playwright JavaScript syntax, support contract, runner help
and diff PASS.
browser_workspace_setup: Static-only; browser and MATLAB untouched.
risks: Runtime request timing, Plotly matrix change and cleanup await deployment.
follow-ups: Run against exact accepted C12 SHA and retain network/timing proof.
next_task_candidates: C13 static scenario only after contract implementation.

## Cascade 13 Spectrogram Leakage static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c13_impl`.
scope: `test/playwright/**` Leakage scenario/config/support.
contracts: Default .5, endpoints 0/1, exact two-key requests, invariant grids
with changed power, 422/409, Spectrum independence, A/B/Clear/re-add/source,
one host/three tabs and exact cleanup.
changes: Added `spectrogram_leakage.test.js`. Audit correction switches to
Spectrum before editing/restoring its Leakage, treats native range clamp as
zero-request no-op, re-adds two signals before source switch and always uses
active Display analysis source.
verification: All Playwright JavaScript syntax, support contract, runner help
and diff PASS. Static-only; browser/MATLAB untouched.
risks: Runtime Plotly/network/timing remains pending exact deployment.
follow-ups: Run isolated C13 scenario on accepted SHA.
next_task_candidates: C14 static scenario only after implementation.

## Cascade 15 Spectrogram Frequency Limits static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c13_impl`.
scope: `test/playwright/**`.
contracts: Auto/effective, explicit real/conditional complex, y/z provider
change with invariant time centers, Spectrum independence, A/B/Clear/source,
local/422/bounded 409 and exact cleanup. Legacy C12/C13 specs now require the
three-key object.
changes: Added `spectrogram_frequency_limits.test.js`, selectors and feature.
Audit moved the request listener before the first natural F-min edit: Tab proves
zero requests/revision change; final commit proves exactly one full request and
`+1`. Cleanup restores exact Spectrum and Spectrogram state and rethrows errors.
verification: All Playwright JS syntax, support contract, runner help and diff
PASS. Static-only; browser and MATLAB untouched.
risks: Conditional complex/N<2 and live timing await exact deployed target.
follow-ups: Run C12/C13/C15 on accepted SHA with timing/network artifacts.
next_task_candidates: Runtime E2E after explicit deployment authority.

## Cascade 16 Spectrogram Frequency Scale static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c13_impl`.
scope: `test/playwright/**`.
contracts: Exact four-key request; real Linear/Log Plotly state and exact
zero-bin floor; conditional complex requested/effective split; 422/two-409 UI
recovery; Spectrum isolation; A/B/Clear/re-add and exact cleanup including row
selection.
changes: Added `spectrogram_frequency_scale.test.js`, selectors/feature and
migrated older Spectrogram scenarios to four-key expectations. Audit removed
fixed wait, strengthened Plotly readiness and canonical UI/cleanup assertions.
verification: All Playwright JS syntax, support contract, runner help and diff
PASS; final read-only audit CLEAN.
browser_workspace_setup: Static-only; browser and MATLAB untouched.
risks: Runtime network/timing/Plotly path awaits authorized exact deployment.
follow-ups: Run isolated C16 on the accepted SHA with artifacts.
next_task_candidates: C17 E2E only after implementation.

## C17 Power Limits static scenario inventory — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c13_impl`.
goal: Define acceptance-grade five-key C17 browser coverage before edits.
scope: Read-only `test/playwright/**` inventory against DEC-023.
contracts: Migrate all four exact Spectrogram scenarios, then add Auto/manual,
atomic pair, exact zmin/zmax/zauto, unchanged x/y/z, local invalid, 422/two-409,
no-source/re-add, A/B/Clear/source/scale isolation and exact cleanup.
changes: None; planning only.
verification: Static scenario/selector/fixture review; no runtime or file change.
risks: Browser wire cannot prove extrema came from pre-bounding raw data; that
is a Backend/Tester oracle. Constant fallback needs deterministic front fixture.
follow-ups: Register five stable Power Limit selectors and implement after the
Backend/Frontend contract lands; use observable conditions, never fixed sleeps.
next_task_candidates: Five-key migration and `spectrogram_power_limits.test.js`.
performance_evidence: Plan retains per-mutation timing/request logging; no new
runtime evidence exists before deployment.
browser_workspace_setup: Read-only static inventory; no CDP, focus, Space or
MATLAB action.
source_evidence: DEC-023 and existing C12/C13/C15/C16 Playwright scenarios.
engee_bug_candidate: None; C17 does not invoke Engee provider behavior.

## Cascade 17 Power Limits static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c17_replacement`; replaces `/root/e2e_c13_impl` after two
incomplete implementation turns.
scope: `test/playwright/**`.
contracts: Five-key migration plus Auto/manual, atomic pair, local invalid,
exact zauto/zmin/zmax, invariant backend x/y/z, Linear→Log→Linear isolation,
422/two-409, no-source/re-add, A/B/Clear/source and exact cleanup.
changes: Added `spectrogram_power_limits.test.js`, selectors/feature and
migrated four predecessor Spectrogram scenarios without weakening bodies.
verification: All Playwright syntax, support contract, runner help, stale-key/
fixed-sleep scans and diff PASS; final integration audit CLEAN.
browser_workspace_setup: Static-only; browser and MATLAB untouched.
risks: Runtime blocked by absent CDP target at `127.0.0.1:9222`.
follow-ups: Run focused then full enabled suite when an accepted target exists.
next_task_candidates: Runtime C17 or static C18 after contract freeze.
engee_bug_candidate: None.

## C18 typed Persistence E2E inventory — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c18_persistence_inventory`.
scope: Read-only `test/playwright/**`; no browser or MATLAB action.
contracts: Register only `typed-persistence`; use existing active host, plot,
Display, Clear, row and checkbox selectors. New scenario covers real one-sided,
conditional complex centered, multi-visible analysis-source-only, A/B,
Clear/re-add/source and exact cleanup without fixed sleeps.
changes: None.
verification: Runner/config/support/spec inventory only; runtime target absent.
risks: Deterministic `N<2` UI fixture does not exist; keep that in backend tests.
follow-ups: Add `typed_persistence.test.js` after backend contract lands; never
revive disabled `legacy-fixed-workspace` Persistence cards.
next_task_candidates: C18 static scenario, then runtime on an accepted target.
browser_workspace_setup: Background CDP only when available; MATLAB untouched.
engee_bug_candidate: None.

## Cascade 18 typed Persistence static scenario — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c18_persistence_inventory`.
scope: `test/playwright/**`.
contracts: Real one-sided full domain, conditional complex centered,
multi-visible analysis-source-only, exact payload/Plotly heatmap, A/B,
Clear/re-add/source and exact cleanup with no fixed sleeps.
changes: Registered `typed-persistence` and added independent
`typed_persistence.test.js`; disabled legacy fixed-workspace was not revived.
verification: All Playwright syntax, support contract, runner help and diff
PASS; final audit CLEAN. Runtime target absent; MATLAB untouched.
risks: Complex branch conditionally skips when fixture has no complex signal;
`N<2` remains backend-only by contract.
follow-ups: Run focused then full suite on an accepted C18 target.
next_task_candidates: Runtime C18 or C19 static after ADR.
browser_workspace_setup: Background CDP only; no MATLAB/window action.
engee_bug_candidate: None.

## C19 Persistence Leakage E2E inventory — 2026-08-01

canonical_role: E2E Tester
session: `/root/e2e_c18_persistence_inventory`.
goal: Plan an independent per-Display Leakage lifecycle scenario without
browser or repository mutation.
scope: Read-only `test/playwright/**`; no browser/CDP or MATLAB action.
required_contract: Accepted provider default/domain/output oracle; exact typed
state/request shape; Display/Clear/source lifecycle; stable frontend selectors
and feature registration.
proposed_scenario: Default plus endpoints `0`/`1`; one successful +1 mutation;
equal/local-invalid no request; 422 rollback; exactly one 409 retry and second
409 rollback; output remains one finite source-only power-by-frequency heatmap;
Spectrum and Spectrogram settings/payload signatures remain unchanged; A/B,
Clear/re-add/source and exact cleanup. Waits are response/DOM/Plotly conditions,
never fixed sleeps, with timing logs for meaningful mutations.
selectors: Existing page/plot/source selectors plus proposed
`persistence-settings`, `persistence-leakage-input` and
`persistence-leakage-error`.
changes: None.
verification: Read-only comparison of C17 event-driven settings scenario, C18
typed Persistence scenario and current support/config surface.
risks: Runtime target remains absent; `N<2` has no deterministic UI fixture and
stays backend-owned. Do not infer equal frequency/power axes across Leakage
unless the probe proves it.
follow-ups: Add the focused static scenario after accepted Backend/Frontend
contracts, then run runtime only on an available accepted target.
next_task_candidates: C19 static scenario after ADR and selectors.
browser_workspace_setup: No browser action; future background CDP only, MATLAB
unchanged.
engee_bug_candidate: None pending provider probe.
