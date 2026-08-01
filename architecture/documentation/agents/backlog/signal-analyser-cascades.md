# Backlog Signal Analyser cascades

Internal backlog record.

Status: active  
Owner: Architect

## Functional follow-ups

### Cascade 3/4 rolling queue — 2026-07-31

1. Cascade 3 P0 exact snapshot raw statistics is locally gated and committed at
   `651943d`: backend 504/504, frontend 2/2 and Playwright static/support PASS.
   Runtime awaits an authenticated retained CDP target and a later deploy.
2. Cascade 4 P0 per-Display Peaks is implemented and locally committed as
   `d9fbcd9`: existing `/api/view`, typed lazy Engee adapter, additive snapshot,
   table and backend markers; no endpoint/fallback. Extended settings stay later.
3. Cascade 6 Time `Normalize Y Axis`/`Show Markers` is implemented and committed
   at `f546195`; runtime remains pending. Cascade 7 authoritative per-Display
   Time Limits with ROI Statistics/Peaks is implemented and committed at
   `1b7864b`, locally verified 719/719 + front 2/2. Cascade 8 selectable
   per-Display Statistics is implemented and locally verified at backend
   789/789 + frontend 2/2 and committed locally as `0fc70fd`.
   Cascade 9 per-Display Spectrum settings and authoritative Spectrum ROI are
   implemented and locally verified at backend 867/867 + frontend 2/2 and
   committed locally as `b53d796`.
   Link groups, cursors, unit conversion and persistence to save/import remain
   later slices.
4. Cascade 5 state separation/Clear Display is implemented and committed at
   `8d480ac`: global row selection, nullable page analysis source, empty
   membership, deterministic recovery and no-provider empty payloads. Runtime
   remains pending an authenticated deployed target.
5. Display pages with one active graph host and per-display membership are in
   `651943d`; arbitrary grid/docking/multi-layout remains out of scope.
6. E2E continuously uses sufficient timing logging and analyzes performance,
   hangs, retries and timeout suitability; instrumentation details remain
   contextual.

1. Product/test checkpoint is committed locally. Push requires explicit approval
   for the exact remote transmission; deploy and merge remain separate explicit
   decisions. Then run `visibility_cascade` against the accepted target.
2. Confirm in runtime that time/spectrum trace names, colors and legends match
   all visible rows; heatmaps follow selected visible signal.
3. Confirm no visible `.plot-placeholder` remains after the active Display
   Plotly host is ready and the host survives repeated `Plotly.react`.
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
8. Verify local-only Plotly 3.1.0 delivery: Tester checks artifact/license/hash,
   load order, UMD normalization, absence of CDN URL and local failure state;
   prod E2E proves the active Display host is ready, has no visible placeholder
   and issues no CDN request.

## MATLAB research backlog

- SA-GRAPH-001/002/003 are consumed by Cascade 9: defaults/units/ROI,
  renderer Log floor and exact dB/Linear relationship. SA-GRAPH-004 should
  bound the complex-signal/Log behavior before the next contract freeze.
- Candidate Cascade 10 must choose one coherent slice. Preferred next slice is
  editable Frequency Limits only. The existing implicit Plotly Log rendering
  remains unchanged; no new floor field/value is invented. RBW/window, actual
  RBW, manual units and Spectrogram/Persistence remain separate.
- Prod Engee C10 probe is complete: valid limits produce a new 4096-point grid,
  partial outside clips, full outside rejects, complex negative/cross/positive
  ranges work, and N=2 works. Remaining blockers are MATLAB observed lifecycle,
  requested-vs-effective state and heterogeneous multi-trace policy.
- DEC-016 resolves the C10 product policy: requested explicit limits must be
  fully inside the analysis-source topology, secondary traces use intersection,
  invalid source changes reset Auto, and requested/effective metadata remain
  separate. SA-GRAPH-004 is a documented partial blocker, not a contract gate.
  Implementation, local verification and a C10 checkpoint are now active.
- SA-GRAPH-004 partial is now durably saved with SHA but confirms only the real
  zero-bound Log transition; complex UI behavior remains docs-only. A separate
  official-docs map identifies Spectrogram/Persistence as a future shared
  segmented-provider candidate. No C11 implementation is frozen until direct
  MATLAB and Engee provider evidence exist.
- C11 provider probe matrix is now specified: real/complex topology and shape,
  raw units, segment centers/overlap/absolute time, short input, aligned and
  unaligned ROI subsets, FrequencyLimits, option conflicts/order and
  Persistence NumPowerBins. Current placeholder eager/cache behavior must not
  be promoted as contract. First implementation candidate remains Spectrogram
  only after evidence plus an ADR.
- Initial C11 prod probe is complete for topology/shapes/raw ranges,
  FrequencyLimits, short input, absolute centers, overlap and NumPowerBins.
  Provider Auto overlap was 75% in the probe, unlike MATLAB app docs. EngeeDSP
  `TimeResolution` has confirmed defect ENGEE-20260801-003; do not expose the
  control or add a hand-rolled STFT. Still open: exact ROI segment selection,
  remaining defaults/options and application execution/lifecycle decision.
- C10 Frequency Limits implementation is complete at local checkpoint
  `9c7cd70`; backend 944/944, frontend 2/2 and static E2E gates pass. Remaining
  C10 work is target Engee/runtime E2E only and must not be reported as
  deployed. Next product planning may use the Spectrogram/Persistence evidence
  map but cannot implement until a new ADR freezes one narrow provider slice.

- SA-UI-005 through SA-UI-010 structured handoffs are consumed. SA-GRAPH-001
  researches Spectrum defaults/units for a future separately frozen slice.
- SA-UI-010 confirmed the exact six-metric order, first-three defaults and
  page-local selection. Cascade 8 consumed that evidence; future statistics
  beyond minimum/maximum/mean/median/peak-to-peak/RMS need a new accepted scope.
- SA-UI-001 bounded evidence now adds independent selection/membership/active
  display, three-signal Time plot, disabled multi-signal TF/Persistence and
  duplicate-import overwrite prompt. Exact server paths and full docs source
  list remain pending relay; early commands lack per-command screenshots.
- SA-UI-005 uses a fully guarded 15-sample deterministic signal. Observed
  defaults are Minimum/Maximum/Mean; min `-2` at `12 s`, max `3` at `5 s`, and
  formula oracle mean `1/3`. Peaks controls are time-domain dependent. Median
  and Peaks settings were not confirmed within the three-attempt guard and must
  not be reported as observed behavior.
- SA-UI-006 confirms active-Display checkbox/measurement remapping, inactive
  plot preservation and row-selection independence. Product add/close/fallback
  remains governed by DEC-009 rather than MATLAB grid geometry.
- SA-UI-007 confirms active-only clear, zero membership, statistics removal and
  preservation of inactive plots/global inventory. Re-add is unconfirmed.
- SA-UI-008 is saved and consumed by Cascade 7. SA-UI-009 Normalize Y/Show
  Markers and SA-UI-010 selectable Statistics are saved and consumed. Product
  Clear recovery remains an explicit DEC-012 decision, not observed MATLAB
  re-add.
