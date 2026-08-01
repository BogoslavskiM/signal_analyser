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

## C15 Spectrogram Frequency Limits matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c15_limits_matrix`.
proposal_consumed: Exact three-key settings with nullable Auto or strict Hz
object; typed Auto/Explicit/query/cache; real/complex topology; requested/
effective metadata; cold no-op and Spectrogram-only isolation; atomic failures;
A/B/Clear/re-add/source; frontend draft/Auto/422/409; E2E cleanup.
guard: C10 power-mode multi-trace intersection/ROI behavior must not be copied.
Spectrogram has one analysis source and frequency×time power. Provider evidence
and DEC-021 resolve strict fully-inside range, source reset and N<2 metadata.
changes: None; read-only matrix.
follow-ups: Implement tests in role-owned paths after Backend/Frontend changes.
next_task_candidates: C15 unit/API/Engee/frontend matrix.

## Cascade 15 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c15_limits_matrix`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Strict three-key parser/API; Auto/Explicit/cache/provider/metadata;
real/complex source preserve/reset; provider order and Engee matrix; exact
frontend drafts, full natural fieldset focus transition, 422 and bounded first/
second 409. Legacy exact bodies were migrated without weakening assertions.
verification: Backend 1263/1263, C15 34/34, frontend 2/2, diff PASS. Local
Engee gate passes findpeaks 16/16 then fails required absent EngeeDSP import.
risks: Real package gate remains prod-only; state aggregate cannot construct a
zero-duration N=1 fixture, so N<2 metadata is tested through the typed path.
follow-ups: Provisioned Engee rerun and runtime E2E only.
next_task_candidates: C16 presentation-only zero-provider matrix after ADR.

## Cascade 16 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c16_replacement`; replaces
`/root/tester_c15_limits_matrix` after repeated incomplete migration turns.
scope: `test/back/**`, `test/front/**`.
coverage: Exact four-key enum/parser/API, metadata, real/complex/no-source/N<2,
A/B/Clear/re-add, cold/equal/combined provider-cache behavior, no-positive Log,
authoritative no-source controls, 422 and bounded 409.
verification: Full backend PASS; C16 47/47 + API 16/16; frontend 2/2; parse and
diff PASS. Final integration audit CLEAN.
risks: Local EngeeDSP absent and Devhub MCP SSE returned 404; no defect claim.
follow-ups: Rerun Engee gate when environment is provisioned.
next_task_candidates: C17 test matrix only after decision freeze.

## C17 Power Limits test matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c17_power_matrix`.
goal: Define the exact C17 unit/API/frontend/E2E regression matrix.
scope: Read-only backend/API/frontend/E2E fixture inventory.
contracts: Exact five-key parser/API; Auto/Explicit/full-raw extrema;
empty/zero/mixed/constant matrices; no provider/cache/query/x/y/z effect;
cold/equal/combined mutation; A/B/Clear/re-add/source/scale lifecycle; atomic UI
pair, Auto clear, 422 and bounded 409. Oversized fake matrix must place extrema
outside transported 160×160 cells.
migration: Backend/API/front fixtures plus four exact Spectrogram E2E scenarios
must move from four to five keys without weakening assertions.
estimate: 139–183 new/modified assertions across Tester and E2E ownership.
changes: None; test planning only.
verification: Existing C15/C16 fixture and lifecycle coverage inspected; no
suite run was required because no test changed.
risks: No Engee test is warranted because DEC-023 forbids provider work.
follow-ups: Implement role-owned matrix after Backend/Frontend changes, then
run full backend/frontend gates and preserve exact five-key assertions.
next_task_candidates: Implement matrix after Backend/Frontend product diff.
source_evidence: DEC-023 inputs plus C15 pair and C16 presentation-only tests.
engee_bug_candidate: None; no Engee contract is introduced.

## Cascade 17 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c17_power_matrix`.
scope: `test/back/**`, `test/front/**`.
coverage: Exact five-key state/API, explicit validation, full-raw omitted-cell
extrema, empty/zero/mixed/constant metadata, query/cache/provider/x/y/z
isolation, cold/equal/combined mutation and complete Display/source lifecycle.
Frontend tests cover atomic pair, Auto, renderer mapping, invalid metadata,
422 and both 409 outcomes.
verification: Full backend 1397/1397; C17 49/49 + API 22/22; frontend 2/2;
parse/diff and final audit PASS.
risks: No Engee test is warranted because provider behavior is unchanged.
follow-ups: Runtime E2E when a target exists; otherwise wait for C18 ADR.
next_task_candidates: C18 matrix after contract freeze.

## C18 typed Persistence test matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
scope: Read-only backend/API/frontend/Engee harness inventory.
contracts: Dedicated immutable Query/Data/CacheKey/provider/service/cache;
fixed 256; real one-sided/complex centered; strict power×frequency orientation;
positive ordered power; occurrence 0..100; exact dB then bounding; `N<2` empty;
analysis-source-only and atomic failure; unchanged wire/no controls.
coverage: Constructor/hash/copy invariants, asymmetric provider double, option
order, topology, invalid axes/matrix/range, repeated GET/cache, multi-visible,
A/B/Clear/re-add/source, warm/cold failure, API exact shape, no client DSP.
changes: None.
verification: Existing test seams and prod evidence reviewed read-only.
risks: Local EngeeDSP remains unavailable; prod evidence, not local success,
supports explicit NumPowerBins/topology. Future target test must stay required.
follow-ups: Implement after Backend product types land; do not encode legacy
transpose/abs/epsilon behavior as compatibility.
next_task_candidates: C18 unit/API/front/Engee contract tests.
engee_bug_candidate: None.

## Cascade 18 verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: 49 focused assertions over types/options/topology/orientation/dB,
`N<2`, selected-only/repeat/A-B/Clear/re-add/source, warm/cold failure and
wrong-topology exact equality of four caches/revision. API forbids only wire
keys/routes, not internal typed names. Front covers positive/empty generic
heatmap and no client DSP/control; Engee suite records explicit 256-bin path.
verification: Backend 1449/1449; C18 49/49; frontend 2/2; diff PASS. Cold
four-cache/revision/display oracle is checkpointed in `27fcdef`. Mandatory
local Engee gate passes findpeaks 16/16 then fails absent EngeeDSP import.
risks: Prod runtime contract remains evidence-backed but not rerun in C18.
follow-ups: Provisioned Engee and runtime E2E only.
next_task_candidates: C19 matrix after contract freeze.
engee_bug_candidate: None.

## C19 Persistence Leakage test inventory — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
goal: Prepare an exact cross-layer matrix without changing tests.
scope: Read-only backend/API/frontend/Engee harness inventory.
proposed_contract: Exact one-key Persistence settings, default `0.5`, finite
non-Bool inclusive `[0,1]`, signed-zero canonicalization; Leakage in immutable
query/cache identity and canonical provider order before fixed NumPowerBins and
TwoSided.
coverage: Constructors/copy/hash, default/endpoints/no-op/revision, A/B/Clear/
re-add/source, cache independence, cold/equal/combined mutation, full 422/409,
atomic equality of all four caches, frontend state and provisioned Engee
contract. Estimated additions: 150--190 backend, 20--30 API, 55--80 frontend
and 25--35 Engee assertions.
changes: None.
verification: Existing C18 seams and prior settings matrices reviewed read-only.
risks: Exact provider semantics and default equivalence cannot be inferred from
Spectrogram and remain blocked on the prod probe and ADR.
follow-ups: Freeze provider output oracle before writing assertions.
next_task_candidates: Implement C19 tests concurrently with product owners
after contract checkpoint.
engee_bug_candidate: None pending provider probe.

## Cascade 19 Persistence Leakage verification — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
scope: `test/back/**`, `test/front/**`, `test/engee/**`.
coverage: Typed default/copy/signed-zero/query/cache; exact root/display/API
object and strict invalids; Leakage-specific cache/provider calls, equal no-op,
A/B/Clear/re-add/source warm reuse, combined Spectrogram+Persistence isolation,
failure equality of four caches; frontend draft/422/two-409/disabled; prod
provider default/endpoints/order/Bool delta contract.
changes: Migrated every affected exact body/snapshot fixture without weakening
comparisons and added durable C19 matrices.
verification: Backend 1497/1497; C19 13+14+21 = 48/48; frontend 2/2; diff PASS.
Local Engee gate passes findpeaks 16/16 then fails required EngeeDSP import.
risks: C19 Engee assertions require provisioned runtime; prod probe supplies
current 0.72.0 evidence.
follow-ups: Run target Engee gate and runtime E2E on an accepted SHA.
next_task_candidates: C20 matrix only after probe and ADR.
engee_bug_candidate: None.
## Spectrum/Spectrogram snapshot corruption matrices — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
scope: `test/front/public/js/app.behavior.test.js` and compatible static seams.
contracts: Spectrum exact four-key and Spectrogram exact five-key/nested
settings; absent legacy defaults; malformed present quarantine.
changes: Added Spectrum malformed matrix and 24-category Spectrogram matrix;
asserted visible error, all server controls disabled and zero unrelated POST.
Added malformed 409 no-replay, already-queued no-send and successful malformed
200 immediate-purge regression cases.
verification: Frontend suite 2/2 and diff-check PASS after product fixes.
risks: These tests intentionally keep exact full-body fixtures; successor
settings ADR must migrate every valid fixture atomically.
commits: `01f96d9`, `0fc7816`.
follow-ups: Preserve corruption quarantine for every future exact settings
object.

## Time Limits snapshot corruption matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Missing Display field uses valid legacy root; explicit `null`
overrides root only for an empty Display; nonempty `null`, wrong shapes, extra
keys, nonfinite/Bool endpoints, reversed bounds and wrong units quarantine.
changes: Added visible error/disabled-input/zero-POST matrix and malformed 409
queued-intent drain assertion.
verification: Frontend 2/2 and diff-check PASS; independent Frontend audit
CLEAN.
commit: `f24e60caf0be6f31b78b0ef0178954862222448d`.
follow-ups: Preserve exact precedence and empty-only nullable semantics.

## Cascade 25 measurement kinds snapshot discovery — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
goal: Establish the strict absent-versus-present frontend snapshot matrix from
the existing DEC-014 backend serializer and validator.
scope: Read-only service/frontend/test trace; no files changed by Tester.
changes: None; read-only discovery.
contracts: Display absence uses first-three compatibility defaults and never
root fallback; present accepts unique known string subset including empty and
canonicalizes UI order; null/nonarray/non-string/unknown/duplicate quarantines.
verification: Existing backend API canonical-order/omission tests and direct
serializer/validator call-flow review.
risks: Current frontend permissively fabricates defaults and lacks dedicated
error/queue quarantine.
source_evidence: `agents/reports/measurement-kinds-snapshot-assessment-20260801.md`
and DEC-014.
follow-ups: Frontend validator/quarantine and Tester malformed initial/200/409
matrix after the C24 `app.js` checkpoint.
next_task_candidates: Implement DEC-031 without backend/API/math changes.
engee_bug_candidate: None.

## Cascades 23 and 24 acceptance matrices — 2026-08-01

canonical_role: Tester
sessions: `/root/tester_c23_lazy_persistence`, `/root/tester_c7_matrix`.
goal: Prove DEC-029 cold/rollback/lifecycle policy and DEC-030 async ordering.
scope: `test/back/lib/signal_analyser_service_test.jl` and
`test/front/public/js/app.behavior.test.js`.
changes: C23 104 assertions cover true-cold four caches, wrong-topology
rollback, exact/history-independent wire, Clear/re-add/close and active N<2.
C24 controlled promises cover plot/Display switch, stale reject, delayed
loader, synchronous empty state and bounded reassertion.
verification: Full backend PASS; frontend 2/2; parse/syntax/diff; independent
audits CLEAN after closing all reported false-positive seams.
risks: Runtime C23 E2E remains gated and not deployed.
follow-ups: Preserve intermediate pre-settlement assertions.
commits: C23 `84b21f3`; C24 `102aa07`.

## Cascade 25 Statistics snapshot acceptance matrix — 2026-08-01

canonical_role: Tester
sessions: `/root/tester_c18_persistence_matrix`, `/root/tester_c7_matrix`.
goal: Prove DEC-031 absent/present and lifecycle quarantine without false replay.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Display-only no-root fallback, canonical valid subsets, present
corruption error/disable/purge, exact View body and A/B isolation.
changes: Added absent/nondefault-root, valid empty/unordered, malformed classes,
malformed present/valid root, 200/409 queued purge, exact body and A/B tests.
verification: Frontend 2/2 and diff PASS; independent Frontend audit CLEAN.
risks: None; controlled resolvers make replay observable without fixed sleeps.
source_evidence: DEC-031 and
`agents/reports/measurement-kinds-snapshot-assessment-20260801.md`.
follow-ups: Preserve exact request comparisons and pre/post POST counts.
next_task_candidates: C26 global envelope matrix after separate ADR.
commit: `0d7bd7ed72cd92a74174abb7210778da5cd62e2a`.
engee_bug_candidate: None.

## Cascade 26 global envelope matrix discovery — 2026-08-01

canonical_role: Tester
session: `/root/tester_c18_persistence_matrix`.
goal: Rank global crash/fabrication and per-Display corruption boundaries.
scope: Read-only frontend/backend/test trace.
changes: None; discovery only.
contracts: C26 global fatal for outer topology; C27 per-Display quarantine for
membership/source plus global root consistency.
verification: Serializer/request validator evidence and harness inventory.
risks: App-fatal 200 may follow a committed backend mutation; Retry must refetch
authoritative state rather than replay intent.
follow-ups: Initial/200/409/recovery exact matrix after DEC-032 implementation.
source_evidence: `agents/reports/global-snapshot-envelope-assessment-20260801.md`.
next_task_candidates: Implement initial/200/409/fatal-control/Retry C26 matrix.
engee_bug_candidate: None.

## Cascade 26 global envelope acceptance matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c7_matrix`.
goal: Prove global fatal/reset/Retry semantics across every response lifecycle.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Exact DEC-032 error and empty authoritative DOM; zero replay/POST;
valid Retry recovery; no stale C24 graph resurrection.
changes: Added outer-envelope classes, 200/409 queue purge, fatal-control and
A/B recovery cases, plus Peaks, second stale-replay and deferred Plotly bridge
oracles after independent audit exposed false-positive gaps.
verification: Frontend 2/2, diff PASS and independent final Frontend audit CLEAN.
risks: Runtime E2E remains gated; static E2E contract is separate `33df821`.
follow-ups: Preserve controlled promise settlement assertions.
next_task_candidates: C27 selection/root corruption matrix after DEC-033.
commit: `f5820bd64c165daba9781aff87528c09bdd08576`.
engee_bug_candidate: None.

## Cascade 27 selection snapshot matrix contract — 2026-08-01

canonical_role: Tester
session: `/root/tester_c7_matrix`.
goal: Prove strict response selection semantics and the local/global failure
precedence without false replay.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Global fatal for missing/unknown row and valid-active root projection
corruption; per-ID quarantine for membership/alias/source corruption; invalid
active selection suppresses root validation; empty inventory is row-gate fatal.
verification_plan: Row missing/type/empty/unknown; valid empty membership and
its null-source invariant; nonempty membership with required member source;
membership missing/type/unknown/duplicate/unordered; aliases missing/invalid/
conflicting; active-invalid versus inactive-invalid A-B isolation; root and
`signals[].visible` mismatch; initial/200/409 queue counts; valid recovery with
no old intent resurrection.
risks: A matrix that checks only disabled UI can miss queued B loss or same-ID
replay; every lifecycle case needs explicit pre/post request counts.
follow-ups: Preserve all C24-C26 controlled-promise oracles unchanged.
changes: None; contract only.
verification: Not run; matrix is planned after checkpoint.
source_evidence: DEC-033 and
`agents/reports/display-selection-snapshot-assessment-20260801.md`.
next_task_candidates: Land RED matrix alongside Frontend implementation.
engee_bug_candidate: None.

## Cascade 27 selection snapshot acceptance matrix — 2026-08-01

canonical_role: Tester
session: `/root/tester_c7_matrix`.
goal: Prove DEC-033 local/global precedence and lifecycle without fixture repair.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Exact row/root fatal classes; membership/alias local quarantine;
read-only inventory identity; same-ID purge, independent B continuation and no
intent resurrection; stale Plotly cannot replace local error.
changes: Added isolated post-helper corruption classes, valid empty membership,
A/B isolation, controlled 200/409 queues, topology recovery, deferred Plotly
bridge and read-only row click zero-POST oracle.
verification: Frontend 2/2, diff PASS; independent Frontend audit CLEAN after
missing selected/root classes and shared-fixture aliasing were corrected.
risks: Browser runtime remains gated in separate E2E contract.
follow-ups: Preserve post-helper mutations and exact pre/post request counts.
next_task_candidates: C28 active-plot matrix after DEC-034.
commit: `f334e7fa3e5ef042d0898c29c37226d39be90b4b`.
engee_bug_candidate: None.

## Cascade 28 active-plot snapshot matrix contract — 2026-08-01

canonical_role: Tester
session: `/root/tester_c7_matrix`.
goal: Prove response plot identity is strict and never repaired to Time.
scope: `test/front/public/js/app.behavior.test.js`.
contracts: Per-Display missing/null/empty/type/case/whitespace/unknown quarantine;
valid-active root missing/type/unknown/mismatch global fatal; invalid-active
root ignored; all four enum values valid. Cover active/inactive A-B isolation,
exact same-ID View desired/queued/pending/stale-replay purge with zero View POST,
preservation and continuation of valid other-Display intents, topology
select/create/close availability, and valid recovery without resurrection.
Use a bounded controlled deferred-Plotly case to prove that stale settlement
cannot replace quarantine or start an unbounded reassertion.
changes: None; contract only.
verification: Not run; controlled initial/200/409/recovery matrix remains
planned after committed documentation checkpoints `9190bb9` and `76f5413`.
risks: Fixture helper currently omits root `active_plot`; update valid fixtures
without converting missing-field cases into fallback compatibility.
follow-ups: Preserve C24-C27 controlled promises and post-helper corruption.
source_evidence: DEC-034 and
`agents/reports/active-plot-snapshot-assessment-20260801.md`.
next_task_candidates: Land the RED matrix alongside the planned Frontend
implementation.
engee_bug_candidate: None.

## Cascade 28 active-plot snapshot acceptance matrix — 2026-08-01

canonical_role: Tester
owner: Tester
session: `/root/tester_c7_matrix`.
goal: Prove exact DEC-034 response semantics across lifecycle and async seams
without fixture repair or request-count false positives.
scope: `test/front/public/js/app.behavior.test.js`; no product/backend/E2E edit.
contracts: All four canonical enum values; per-Display malformed local
quarantine; valid-active root malformed/mismatch fatal; invalid-active
precedence; exact desired/queued/pending/409-replay purge by ID; independent B
continuation; topology availability; valid recovery without resurrection;
bounded deferred Plotly settlement.
changes: Added isolated initial/200/409/recovery corruption matrices, exact
request and DOM oracles, four-enum lifecycle coverage, dual-corruption
precedence, A/B isolation and controlled async settlement coverage; repaired
existing valid fixtures to publish root `active_plot` explicitly.
verification: Frontend suite 2/2 and Node syntax PASS; independent Tester audit
CLEAN. The audit confirmed no helper auto-heals the field under test and no
disabled-control-only false positive substitutes for exact request counts.
risks: Static behavior tests do not claim browser runtime or target
compatibility.
follow-ups: Retain controlled promise and post-helper corruption seams in
future snapshot work.
next_task_candidates: Runtime C28 correlation through the gated E2E scenario;
otherwise completed standby pending a new accepted contract.
source_evidence: DEC-034; behavior matrix; commit `08af1e7`.
engee_bug_candidate: None.
