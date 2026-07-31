# Backlog Signal Analyser cascades

Internal backlog record.

Status: active  
Owner: Architect

## Functional follow-ups

### Cascade 3/4 rolling queue — 2026-07-31

1. Gate Cascade 3 P0 exact snapshot raw statistics: Backend → Frontend array
   alignment, full backend/frontend suites, Playwright contract, then runtime
   only after a product commit/deploy handoff.
2. Cascade 4: define peaks as a specialized EngeeDSP
   `Functions.findpeaks` contract. Do not add endpoint/state shape or fallback
   before actual signature/default/error evidence and contract tests.
3. Later additive slice: display-local Normalize Y, global markers/cursors and
   dependent controls.
4. Separate architecture slice: fixed four display IDs with per-display
   membership and transactional single-signal heatmap constraints; no
   multi-layout and no reinterpretation of deployed v2 global visibility.
5. E2E continuously uses sufficient timing logging and analyzes performance,
   hangs, retries and timeout suitability; instrumentation details remain
   contextual.

1. Commit/push/deploy current product and test diff through the main flow, then
   run `visibility_cascade` against that target.
2. Confirm in runtime that time/spectrum trace names, colors and legends match
   all visible rows; heatmaps follow selected visible signal.
3. Confirm no visible `.plot-placeholder` remains after all four Plotly hosts
   are ready and hosts survive repeated `Plotly.react`.
4. Consume the permanent MATLAB Researcher structured handoff and create next
   product/E2E tasks from new docs/app deltas rather than copying layout.

## Technical debt and verification

1. Run `test/engee/engee_package_contract_tests.jl` in an environment with the
   required `EngeeDSP` package; current local run is failed, not skipped.
   Before deployment verify target LOAD_PATH provides EngeeDSP `0.72.0`, PkgId
   UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, then run real contract. Do not
   add app dependency without an accessible source contract.
2. Exercise revision queue behavior with more than two signals and rapid
   visibility toggles in runtime E2E.
3. Preserve exact deployment URL/SHA and application logs in the future DevOps
   handoff.
4. After runtime checks, mark the active task/report complete and record final
   evidence without inferring user acceptance or merge authorization.
5. If runtime target returns a maintenance shell, collect split base/auth,
   target, process and log evidence; after recovery rerun both target probe and
   original visibility E2E.
6. Runtime E2E must record `browser_workspace_setup`: background CDP preferred;
   interactive Chrome on a separate macOS Space/desktop or fullscreen fallback,
   coordinated with MATLAB Researcher; MATLAB unchanged.
7. Investigate StipplePlotly world-age warning candidate only after obtaining
   exact warning/stack, versions and a minimal safe reproduction. Do not publish
   it as a confirmed Engee bug before isolation.
8. Verify local-first Plotly 3.1.0 delivery: Tester checks artifact/license/hash,
   load order, UMD normalization and fallback; prod E2E proves four ready plots,
   zero visible placeholders and zero CDN requests on local success.

## MATLAB research backlog

- Await `docs_sources`, `documented_direction`, `clicker_setup`,
  `observed_undocumented_behavior`, `docs_vs_app_delta`, `product_tasks`, and
  saved `e2e_scenarios` from MATLAB Researcher
  `019fb7d3-32b4-77a0-bfa2-14f4d72dd983`.
- Current evidence is sufficient for visibility/selection implementation, but
  not sufficient to scope the next cascade until defaults, transitions, edge
  cases and scenario paths arrive.
- SA-UI-001 bounded evidence now adds independent selection/membership/active
  display, three-signal Time plot, disabled multi-signal TF/Persistence and
  duplicate-import overwrite prompt. Exact server paths and full docs source
  list remain pending relay; early commands lack per-command screenshots.
