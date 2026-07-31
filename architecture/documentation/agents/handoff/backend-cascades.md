# Backend handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Backend  
agent_id_or_session: `019fb7f1-3d91-7a42-bc79-43d4b26bf570`  
status: active
current_task: Cascade 4 read-only specialized peaks contract sidecar
next_queued_task: integrate Tester P0 findings
blocker_or_no_eligible_work: none
last_handoff: Cascade 3 P0 snapshot implementation complete

Earlier ephemeral threads became unavailable after completion. Future Backend
work must resume the persistent canonical ID above rather than create another
writer.

## Cascade 2

goal: Implement atomic revision-safe visibility and multi-signal plot payload.  
scope: `lib/services/signal_analyser_service.jl`.  
contracts: `POST /api/view` accepts expected integer `state_revision` plus
optional `active_plot`, `selected_signal`, and full `visible_signals`. Visibility
must be a nonempty unique string array of known signals. Stale requests do not
mutate state. If selected is hidden, selected becomes the first visible signal
in canonical table order. Snapshot preserves legacy fields and adds
`visible_signals` plus `plot_payload` with `time_traces`, `spectrum_traces`, and
selected `spectrogram`/`persistence`.  
changes: Added validation, canonicalization, atomic prepared-plot publication,
visibility flags and named/colored trace payloads.  
verification: Julia parse PASS; текущий полный backend gate PASS, 289/289
assertions после Tester additions (первоначальный implementation handoff был
262 assertions).  
risks: Runtime EngeeDSP environment and deployed API behavior remain unverified
for this uncommitted cascade.  
follow-ups: Consume final reviewer handoff; rerun EngeeDSP contract in the
required environment and runtime E2E after deployment.

## Cascade 3 P0 handoff — 2026-07-31

goal: Publish selected visible signal raw statistics in each state snapshot.
scope: `lib/services/signal_analyser_service.jl`.
contracts: Exact additive `measurements` object with revision/name/ordinate/
units and ordered array items `minimum`, `maximum`, `mean`; no endpoint or
peaks. Raw samples precede plot bounding; extrema use first tie and zero-based
index/time.
changes: Base/Statistics implementation complete; real component and complex
magnitude supported. Provisional endpoint/EngeeDSP peaks code removed.
verification: Julia parse PASS; direct default/fallback/1100-sample probes PASS.
Full backend suite initially failed only on stale Tester-owned keyset and awaits
the corrected Tester gate.
risks: Integration depends on exact frontend/test array consumption.
follow-ups: Tester gate; Cascade 4 contract research only.
next_task_candidates: EngeeDSP `findpeaks` signature/default/error contract;
no Cascade 4 implementation yet.
