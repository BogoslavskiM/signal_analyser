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
