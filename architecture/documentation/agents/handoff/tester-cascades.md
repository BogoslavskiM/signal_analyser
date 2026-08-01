# Tester handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Tester  
agent_id_or_session: `/root/tester_cycle`
status: active autonomous cycle 2
current_task: exact Cascade 3 P0 snapshot array tests and Plotly delivery gate
next_queued_task: Cascade 4 Engee `findpeaks` contract matrix
blocker_or_no_eligible_work: stale provisional nested shape must be removed
last_handoff: Cascade 2 full local gate 289/289 and frontend 2/2

Earlier ephemeral threads became unavailable after completion. Future Tester
work must resume the persistent canonical ID above.

Replacement note 2026-07-31: `/root/tester_cycle` replaces stopped session
`019fb7f1-26cf-75c0-9b01-69e5e2f5cc4d` for autonomous cycle 2.

## Cascade 2

goal: Cover backend and frontend visibility contracts.  
scope: `test/back/**`, `test/front/**`.  
contracts: malformed/empty/duplicate/unknown/stale visibility, atomicity,
selected fallback, canonical order, trace payload, selected heatmaps, Russian
states, checkbox propagation, revision queue, fixed 2×2, and placeholder
cleanup without Plotly purge.  
changes: Expanded backend service/API tests and frontend static/behavior harness
and assertions.  
verification: Current full backend gate PASS 289/289 assertions after Tester
additions; initial gate was 262 in groups
`3+99+41+29+11+7+16+14+42`. Frontend PASS 2/2 files. Local EngeeDSP contract
FAIL because the required package is absent; this is not a pass or skip.  
risks: Engee package evidence for cascade 2 remains environment-blocked.  
follow-ups: Rerun the Engee contract in an enabled environment; no product fix
is requested from Tester.

## Pending bundled Plotly verification

Verify vendored version/license/hash, index load order, nested-base local URL,
UMD `moduleName` normalization, local-first behavior and CDN fallback. Required
success evidence: four render definitions/ready hosts, no visible placeholder,
and no CDN request when local load succeeds. Until this handoff returns PASS,
delivery remains implemented-only.

## Cascade 3 P0 test correction — 2026-07-31

The endpoint/peaks and nested `signal/samples/statistics` drafts are rejected.
The accepted test surface is the exact additive snapshot `measurements` object
with ordered `items` array, raw-sample proof beyond the 1024 plot bound,
real/magnitude behavior, first ties, zero-based time/index and no endpoint or
peaks placeholder. Base/Statistics is valid for this slice. Specialized
`findpeaks` tests are queued for Cascade 4 only.

## Autonomous cycle 2 verification — 2026-07-31

goal: Gate exact P0 statistics, Display-local scope and local-only Plotly.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
contracts: Active Display selected signal owns snapshot measurements; ordered
minimum/maximum/mean use full raw samples; local tab makes no API call; Plotly
artifact is pinned/local-only; no guessed peaks product contract.
changes: Added active A/B switch/restore/stale coverage, frontend measurement
scope/order checks, artifact SHA/license/load-order/no-CDN/local-failure checks,
and an evidence gate for future `findpeaks` adoption.
verification: Backend PASS 504/504 after OOP atomicity regression; frontend
PASS 2/2; diff check PASS.
Engee runner: future `findpeaks` matrix 4/4, then required `EngeeDSP` contract
fails because the local environment cannot load the package. This is an
environment failure, not a product or confirmed Engee defect.
risks: Required Engee contract must be rerun in target runtime before adopting
specialized functionality.
follow-ups: Test files are eligible for a DevOps checkpoint after the product
handoffs; no further eligible local slice until new product/research evidence.

Focused regression: selecting a hidden signal with a NaN raw sample through
both view and display preparation fails before publication and preserves the
entire authoritative state/cache/snapshot fingerprint. New group PASS 6/6.

## Cascade 4 P0 freeze verification — 2026-07-31

goal: Freeze typed provider, atomic state, API and frontend consumption.
scope: `test/back/**`, `test/front/**`; prod evidence matrix already resides in
`test/engee/findpeaks_contract_matrix.jl`.
coverage: Disabled lazy no-call; full 1100 raw samples beyond plot bound; real
and complex-magnitude queries; 1-based to zero-based mapping/time/width/
prominence/id; exact snapshot/display keys; empty result; no-op/stale/invalid
boolean/unknown fields/non-Time rejection/no endpoint; provider failure during
enable and selected-signal change; exact rollback fingerprint; one-enabled and
one-disabled Display switch away/back. Front tests cover revision request,
pressed/local panel lifecycle, table/marker backend scope and no JS algorithm.
verification: Backend 553/553 PASS; frontend 2/2 PASS; direct Engee evidence
matrix 16/16 PASS; diff PASS.
risks: Prod app path is not runtime-exercised; package and compiled lazy adapter
were independently verified in prod MIND.
follow-ups: Runtime E2E on accepted/authenticated deployment.

## Cascade 5 P0 verification — 2026-07-31

goal: Gate independent canonical state fields and the complete empty Display
lifecycle.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Row-only selection, differing valid canonical row/source fields,
analysis/legacy alias conflicts, canonical fallback, Clear/no-op/stale and
atomicity, typed empty payloads, zero provider calls, recovery, inactive page
preservation and seeded new Display. Front coverage includes accessible menu,
payload, separate DOM state, empty panels and Plotly purge without host
replacement.
verification: Backend 649/649 PASS; frontend 2/2 PASS; diff PASS. Direct
findpeaks evidence matrix remains 16/16 PASS. Required local Engee package gate
fails because EngeeDSP is not installed and is not represented as skipped.
risks: Engee-enabled target gate and runtime UI remain external prerequisites.
follow-ups: Rerun the same contracts on an accepted deployed target.

## Cascade 6 verification — 2026-07-31

coverage: Independent exact `[0,1]`, constant-zero, immutable source arrays,
unclipped affine Peaks with unchanged time, Time-only ordinary markers,
per-Display restore, new defaults, disabled non-Time/empty controls, no API or
revision changes, persistent host/react and invalid-data purge/error state.
verification: Frontend 2/2 and backend 649/649 PASS; diff PASS.
follow-ups: Runtime Playwright after authenticated deployment.

## Cascade 7 verification — 2026-07-31

coverage: Strict typed limits and API 422 envelope; inclusive raw ROI absolute
extrema/time/mean; 1–2 sample Peaks zero-provider; >=3 exact subset/offset;
revision no-op/+1; carried source preserve/reset; Clear/re-add/new/inactive;
invalid/provider atomicity; frontend exact nested inline error rollback.
verification: Integrated backend 719/719, frontend 2/2 and diff PASS.
risks: Real EngeeDSP execution remains target-only; provider seam verifies the
exact delegated query and mapping.

## Cascade 8 verification — 2026-07-31

coverage: Exact canonical IDs/defaults/order, any subset including empty,
strict duplicate/unknown/non-string/non-array 422 and atomic fingerprint;
revision +1/no-op/stale; Clear preserve/re-add recompute/new/inactive Display;
raw inclusive ROI, first extrema positions, odd/even median, peak-to-peak,
complex magnitude and scale-normalized RMS for extreme finite values. Frontend
coverage fixes the settings selectors, one-request checkbox contract, nested
422 rendering, local tabs and absence of client statistic calculation.
verification: Integrated backend 789/789 and frontend 2/2 PASS; diff clean for
the role-owned matrix.
risks: Local EngeeDSP is absent, so real spectral/Peaks contracts remain a
target preflight. C8 Base/Statistics itself has no EngeeDSP dependency.
follow-ups: Preserve this exact gate during later Spectrum work; do not treat
runtime E2E as completed.

## Cascade 9 verification — 2026-08-01

goal: Prove the strict nested Spectrum API/state contract and frontend queue
behavior without hiding the missing local Engee runtime.
scope: `test/back/**`, `test/engee/**`, `test/front/**`.
coverage: Typed provider/query/cache/topology, raw ROI and mixed durations,
defaults/A-B/Clear/re-add, scale/cache separation, Leakage recalculation,
complex Log rejection, strict nested 422/409/atomicity and provider rollback.
Frontend coverage includes exact full legacy request bodies, stable controls,
one-request change, 422 rollback/error and Log/x-axis behavior.
verification: Integrated backend 867/867 PASS; C9 service 52/52; C9 API 28/28;
frontend 2/2 PASS. Local Engee suite passes findpeaks 16/16, then fails the
required pspectrum group because `EngeeDSP` is not installed.
risks: The Engee failure is retained, not skipped; target preflight remains
mandatory. Runtime browser behavior is not claimed.
follow-ups: Rerun real contract on the deployment environment and C9 E2E on
the exact deployed SHA.
next_task_candidates: Add focused contract cases only when the next Spectrum
slice is frozen.

## Cascade 10 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_cycle`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Exact four-key state/API, Auto/Explicit validation, Bool/nonfinite/
order/units/domain 422 atomicity, revision/no-op, A/B/Clear/re-add/source
preserve/reset, mixed-Fs no-overlap zero-provider, metadata/query/cache/provider
options, frontend IDs/drafts/full request/rollback/no-client-DSP, formal Engee
FrequencyLimits matrix. Legacy exact bodies were migrated, not weakened.
verification: Backend 944/944; C10 unit 37/37; API 40/40; frontend 2/2. Engee
gate executed: findpeaks 16/16, then required failure because local EngeeDSP is
absent.
risks: Formal C10 provider matrix still needs provisioned Engee runtime.
follow-ups: Rerun on target; retain exact assertions in future cascades.
next_task_candidates: Future heatmap provider red matrix after contract.

## Cascade 11 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_cycle`.
scope: `test/back/**`, `test/front/**`.
coverage: Query ownership/validation; typed data shape/order/finite/nonnegative;
real/complex topology and source-local raw cache reuse; N<2 no-provider;
provider topology/time/frequency rejection; exact frequency × time wire;
zero-power `-Inf` to JSON null; full 161×161 raw versus bounded 160×160 wire;
failure atomicity with empty unpublished cache. Frontend asserts no new routes,
controls/settings or fourth tab.
verification: Full backend 980/980; C11 36/36; frontend 2/2; Julia parse and
diff PASS. Local Engee gate executes findpeaks 16/16 then fails required import
because EngeeDSP is absent.
risks: Runtime target provider/browser remains pending; prod capability probe
is preserved separately.
follow-ups: Rerun typed E2E on an exact deployed SHA; next settings matrix only
after ADR.
next_task_candidates: OverlapPercent strict JSON/API/cache/provider matrix.

## Cascade 11 short-input correction verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_cycle`.
coverage: At Fs=10/N=2, terminal center `0.15 s` is accepted; `0.16 s` and
existing `0.2 s` cases are rejected.
verification: Full backend 982/982; C11 38/38.
risks: Real EngeeDSP remains prod-only; exact N=2..16 evidence is recorded in
the provider report.
follow-ups: C12 explicit overlap must retain these boundaries.

## Cascade 12 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_cycle`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Typed default/range/Bool/nonfinite; strict one-key API; no-op/+1/
422/409 atomicity; A/B/Clear/re-add/source; cache/provider forwarding and
failure rollback; real/complex Engee matrix. Front regressions cover exact
bodies, two consecutive 422 canonical rollback and exactly one latest replay
after 409.
verification: Backend 1110/1110; C12 typed 13/13, lifecycle/cache 56/56, API
59/59; frontend 2/2. Local Engee passes findpeaks 16/16 then fails required
EngeeDSP import; prod overlap probe is authoritative.
risks: Engee provider accepts Bool, while product intentionally rejects before
dispatch; runtime UI remains unverified.
follow-ups: Rerun formal provider matrix on provisioned target.
next_task_candidates: C13 Leakage matrix after default/range/order ADR.

## Cascade 13 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c13_impl`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Exact two-key parser/API; default/endpoints/signed zero/Bool/nonfinite/
range; no-op/+1/422/409; lifecycle/cache/provider failure; real/complex option
order; Spectrum independence; frontend drafts/accepted rollback/bounded replay.
Audit regressions prove cold Spectrogram-only zero Spectrum dispatch, cold
canonical no-op zero spectral dispatch with next-GET materialization, and
hash/Dict consistency for signed zero.
verification: Backend 1229/1229 and frontend 2/2 PASS. Local Engee gate passes
findpeaks 16/16 then fails required EngeeDSP import; prod provider matrix PASS.
risks: Formal local real-provider run remains unavailable, not skipped.
follow-ups: Rerun Engee contract on provisioned target.
next_task_candidates: C14 Bool/cache/provider matrix after ADR.

## C14 Reassign read-only matrix / NO-GO — 2026-08-01

canonical_role: Tester
session: `/root/tester_c14_reassign_matrix`.
proposal: Future exact three-key object with strict Bool, explicit provider
order, cache identity, cold no-op, Spectrum independence, Display lifecycle and
checkbox/queue/E2E matrix.
gate_result: Prod true is broken, so no test/product files were created and the
proposal is not a frozen implementation contract. False/default evidence alone
cannot justify a decorative or silently downgraded toggle.
verification: Read-only C13 contract/test inspection plus Backend prod NO-GO.
risks: True axes/shape/power and cost unknown; current typed invariants cannot
be assumed.
follow-ups: Retain matrix for upstream-fixed build; no C14 implementation now.
next_task_candidates: C15 Spectrogram Frequency Limits matrix after evidence.
