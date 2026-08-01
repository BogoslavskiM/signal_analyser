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
- DEC-017 freezes the first C11 implementation slice: typed default
  Spectrogram only, unchanged wire/UI, full raw signal, strict real/complex
  topology and raw cache. Persistence, ROI and all controls remain backlog.
- C10 Frequency Limits implementation is complete at local checkpoint
  `9c7cd70`; backend 944/944, frontend 2/2 and static E2E gates pass. Remaining
  C10 work is target Engee/runtime E2E only and must not be reported as
  deployed. Next product planning may use the Spectrogram/Persistence evidence
  map but cannot implement until a new ADR freezes one narrow provider slice.
- C11 typed Spectrogram foundation is complete at local checkpoint `d47e51e`:
  backend 980/980, C11 36/36, frontend 2/2 and static E2E gates pass. Runtime
  target E2E remains undeployed/unverified.
- Docs-only C12 research recommends Spectrogram `OverlapPercent` as the next
  narrow slice. MATLAB app default is explicit 50%, while provider Auto differs.
  Before an ADR or implementation, probe Engee explicit 0/50/75, invalid
  -1/100/nonfinite/Bool, option order, segment centers/counts and high-overlap
  resource behavior. TimeResolution remains blocked; no fallback is allowed.
- Prod C12 probe is complete. Explicit 0/50/75 gives deterministic 8/15/29
  columns for N=256, provider Auto equals 75, option order is invariant, and
  Bool is permissively accepted. 99/99.9 costs about 649 MB allocations on the
  bounded fixture. DEC-018 therefore freezes explicit default 50 and a
  product-safe 0..75 inclusive range. C12 implementation is now eligible after
  the C11 terminal-center hotfix checkpoint.
- C12 implementation is complete at local checkpoint `f1dac58`: backend
  1110/1110, frontend 2/2 and Playwright static gates pass. Runtime target E2E,
  push and deployment remain unperformed.
- C13 discovery is limited to Spectrogram Leakage. Freeze no fields/defaults
  from the existing Spectrum Leakage by analogy. Required gates are official
  MathWorks web evidence plus prod Engee real/complex default/0/0.5/1,
  invalid-type/range and combined `Leakage`+`OverlapPercent` option probes. A
  successor ADR must explicitly preserve independence of both settings.
- C13 evidence is complete and DEC-019 freezes normalized independent Leakage:
  default 0.5, finite non-Bool 0..1, exact two-key Spectrogram object and
  canonical Leakage/Overlap/TwoSided provider order. MATLAB slider display scale
  remains a later presentation observation, not an implementation blocker.
- C13 implementation is complete at local checkpoint `aebd6f9`: backend
  1229/1229, frontend 2/2 and Playwright static gates pass. Audit corrections
  cover cold-cache/no-op independence, signed-zero hash and bounded stale replay.
  Runtime target E2E, push and deployment remain unperformed.
- C15 implementation is complete at local checkpoint `5602ccb`: backend
  1263/1263, C15 34/34, frontend 2/2 and Playwright static gates pass. Runtime
  target E2E, push and deployment remain unperformed.
- C16 Frequency Scale is complete at local checkpoint `8330822`: exact four-key
  state, requested/effective/available lifecycle, zero-provider scale-only
  mutation, transient zero-bin presentation, C16 47/47 + API 16/16, frontend
  2/2 and final audit CLEAN. Runtime E2E/deployment remain pending authority.
- DEC-023 freezes C17 Power Limits: exact fifth key, Auto/null or strict dB pair,
  full-raw finite-dB effective metadata, Display/source lifecycle and Plotly
  zmin/zmax presentation only. Query/cache/provider/x/y/z remain unchanged.
  Constant Auto `{v,v}` keeps exact metadata and receives only a renderer-local
  `[v-1,v+1]` fallback. Fit Colormap, viewport state и изменения/shared Power
  Limits существующего Spectrum dB/linear остаются deferred.
- C17 implemented and locally accepted at product/test commit `290c057`:
  backend 1397/1397, focused 49/49 + API 22/22, frontend 2/2, Playwright static
  and final audit CLEAN. Runtime E2E/deploy remain unavailable and are not
  claimed. C18 awaits a separate docs-backed narrow contract; Fit Colormap
  remains blocked on safe viewport observation.
- DEC-024 freezes C18 as typed/default Persistence foundation: dedicated OOP
  query/data/provider/service/raw-cache, fixed NumPowerBins 256, real one-sided,
  complex centered, strict power×frequency orientation, positive raw power,
  occurrence 0..100, exact dB then 160×160 bounding and analysis-source-only
  computation. Wire stays unchanged; no settings/API/UI controls are added.
  Persistence ROI/settings/Fit Colormap remain separately deferred.
- C18 implemented and locally accepted at product/test commit `3b16cd9` plus
  atomicity-oracle hardening `27fcdef`: backend 1449/1449, focused 49/49,
  frontend 2/2, typed Persistence E2E static
  and final audit CLEAN. P1 ordinary-snapshot partial cache publication was
  found by audit and fixed with a four-cache prepared aggregate. Runtime
  Engee/E2E and deployment remain external; no new Engee bug is claimed.
- C19 provider gate passed on prod EngeeDSP `0.72.0`; DEC-025 freezes exact
  independent `persistence_settings={leakage}` with default `0.5`, finite
  non-Bool `[0,1]`, signed-zero canonicalization and raw query/cache identity.
  Canonical provider order is Leakage, fixed NumPowerBins, TwoSided. Normalized
  UI is an explicit product decision; it is not a MATLAB GUI-parity claim.
  Backend, Frontend, Tester and E2E implementation is eligible after the
  contract documentation checkpoint. Overlap/ROI/limits/scale remain deferred.
- C20 discovery nominates independent Persistence OverlapPercent for a bounded
  prod capability/resource probe only. Provider `[0,100)` is not a product
  range: omitted default depends on window/Leakage and high overlap may amplify
  allocations. Probe transient real/complex output, invalids/order and guarded
  0/25/50/75/99/99.9 resources; no ADR until a safe cap and explicit non-GUI-
  parity default policy exist. Persistence Frequency Limits is the fallback.
- C20 closed NO-GO under DEC-026. Explicit 50 crossed 512 MiB for real and
  complex; 75/omitted reached 1.02–1.75 GiB; a later option-order call crossed
  the guard even at 0. Values 99/99.9 and the remaining interaction/order
  matrix were not run. No cap/default/state/API/UI is accepted. Pod cleanup and
  stopped status are confirmed; Persistence Frequency Limits is now active.
- C21 Frequency Limits provider capability PASS under explicit probe-only
  OverlapPercent=0: exact in-domain grids/endpoints, reject-not-clip product
  direction, raw PWR/occurrence effect, max 382.46 MiB. DEC-027 blocks product
  implementation because current C19 omits Overlap and fixed zero is a global
  breaking algorithm/cache migration. Next work is a separate fixed Persistence
  segmentation/resource foundation; C21 evidence remains reusable afterward.
- Frontend snapshot boundary hardening is complete at `01f96d9` (Spectrum) and
  `0fc7816` (Spectrogram). Present malformed exact settings are quarantined;
  absent legacy settings retain compatibility defaults. Spectrogram queued,
  stale-replay and successful-response intents are purged without POST. Front
  2/2 and repeated independent audit CLEAN.
- C22 fixed-zero foundation closed NO-GO under DEC-028. The first matched N64
  omitted call allocated 1231.86 MiB versus 369.33 MiB explicit zero, while
  changing PWR/occurrence. Guard stopped all remaining mandatory evidence.
  C21 remains blocked; current omitted cost is an operational risk. Next
  candidate is semantic-preserving lazy Persistence materialization.
- DEC-029 freezes C23 as semantic-preserving resource containment: Persistence
  provider materialization is permitted only for a prospective active
  Persistence plot with a valid source. Inactive responses keep the exact
  existing wire keys and source metadata but carry typed-empty axes/matrix;
  raw caches remain warm. A cold active transition must prepare the complete
  four-plot aggregate before publishing Display state, revision or caches.
  This does not make active omitted-overlap Persistence resource-safe and does
  not unblock C21 Frequency Limits.
- SA-GRAPH-001 official-web research is complete. MathWorks documents dB power
  as the Spectrum default, metadata-driven Hz/rad-sample units, real/complex
  one-/two-sided bounds, complex Log prohibition, Leakage function default 0.5
  and dynamic RBW. Fresh Linear/Log selection, engineering prefix, app
  Leakage readout scale and resolution-mode defaults remain unobserved. Do not
  touch MATLAB/clicker until the unsafe prior Command Window state is cleared.
- C19 implemented and locally accepted at product/test commit `2f99ff8`:
  backend 1497/1497, C19 48/48, frontend 2/2, focused Playwright static and
  independent Frontend/E2E/Backend audits CLEAN. Local Engee gate retains the
  known missing-package failure after findpeaks 16/16; prod 0.72.0 probe PASS.
  Runtime E2E, push, deployment and merge remain unclaimed.
- C14 discovery is restricted to Spectrogram Reassign. Official docs support a
  boolean `pspectrum` flag and display-local checkbox semantics, but app default
  remains inferred. Prod Engee false/true/default/invalid/order/topology probe
  and a new ADR are required before implementation.
- C14 closed NO-GO: Reassign true fails 28/28 with undefined internal helper.
  DEC-020 and ENGEE-20260801-004 block all product exposure until upstream fix,
  fixed-build probe and successor ADR.
- C15 Frequency Limits evidence is complete. Prod Spectrogram creates new exact
  1024-point grids for in-domain ranges, clips partial ranges, rejects fully
  external/reversed/nonfinite shapes, and supports N=2. A boundary-only
  Nyquist-touch can produce a degenerate two-unique-value axis; product policy
  should validate fully inside authoritative topology and never delegate that
  edge. ADR must keep Spectrogram settings independent from Spectrum settings.
- DEC-021 freezes C15: exact three-key settings, strict fully-inside Hz range,
  independent Spectrum state, Auto/Explicit cache identity, stable metadata,
  source reset policy and existing cold-cache/no-op guards. Implementation is
  eligible after the contract-doc checkpoint.

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
