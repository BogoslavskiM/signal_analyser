# Tester handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Tester  
agent_id_or_session: `019fb7f1-26cf-75c0-9b01-69e5e2f5cc4d`  
status: active correction
current_task: exact Cascade 3 P0 snapshot array tests
next_queued_task: Cascade 4 Engee `findpeaks` contract matrix
blocker_or_no_eligible_work: stale provisional nested shape must be removed
last_handoff: Cascade 2 full local gate 289/289 and frontend 2/2

Earlier ephemeral threads became unavailable after completion. Future Tester
work must resume the persistent canonical ID above.

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
