# Tester handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Tester  
agent_id_or_session: `019fb7f1-26cf-75c0-9b01-69e5e2f5cc4d`  
status: persistent audit active  
current_task: audit durable unit/API/static/behavior handoff  
last_handoff: implementation `019fb7d7-3fc2-7be3-ae12-77594d92f0b6`;
ephemeral review `019fb7e8-0dbd-7661-90ed-43df55f0a719`

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
