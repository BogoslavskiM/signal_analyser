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
