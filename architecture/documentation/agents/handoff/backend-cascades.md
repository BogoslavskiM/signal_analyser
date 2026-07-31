# Backend handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Backend  
agent_id_or_session: `019fb7f1-3d91-7a42-bc79-43d4b26bf570`  
status: persistent audit active  
current_task: audit durable visibility/API handoff  
last_handoff: implementation `019fb7cf-6c54-7f01-9bff-4000bcc360cb`; ephemeral
review `019fb7e7-fe90-7cd2-ac1f-8ac850dbe692`

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
