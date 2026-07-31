# Backend handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: Backend  
agent_id_or_session: `/root/backend_cycle`
status: active autonomous cycle 2
current_task: Cascade 3 P0 OOP/backend gate
next_queued_task: evidence-backed Cascade 4 specialized peaks contract sidecar
blocker_or_no_eligible_work: none
last_handoff: Cascade 3 P0 snapshot implementation complete

Earlier ephemeral threads became unavailable after completion. Future Backend
work must resume the persistent canonical ID above rather than create another
writer.

Replacement note 2026-07-31: `/root/backend_cycle` replaces stopped session
`019fb7f1-3d91-7a42-bc79-43d4b26bf570` for autonomous cycle 2.

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

## Autonomous cycle 2 OOP/atomicity handoff — 2026-07-31

goal: Preserve the exact P0 API while moving raw measurements behind typed
domain values and prevalidating them before state publication.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: External keys/order/units remain unchanged; no endpoint, peaks or
dependency change.
changes: Added typed ordinate/kind enums, position/item/units,
`SignalMeasurementsSnapshot` invariants and explicit
`SignalMeasurementsService` collaborator. `Dict{String,Any}` remains only in
the API mapper. View/display paths prepare the future-revision measurement
before mutating state and verify selected signal/revision consistency.
mathematics: real uses `Re(x[k])`, complex uses `abs(x[k])`; first extrema;
zero-based `t=k/fs`; arithmetic mean over all raw samples before plot bounding.
verification: Julia parse PASS; backend PASS 504/504 after the focused Tester
regression; invalid NaN selection through view and display paths leaves
revision, active display, selection, visibility, cache and snapshot unchanged.
risks: Empty/nonpositive-rate variants share the same invariant class but only
the NaN path has the focused mutation regression.
follow-ups: Peaks remains blocked on a proven public Engee/domain function
contract.

## Cascade 4 P0 Peaks implementation — 2026-07-31

goal: Add evidence-backed time-domain Peaks through a typed OOP boundary and
atomic publication.
scope: `lib/domain/signal_analyser_state.jl` and
`lib/services/signal_analyser_service.jl` only.
contracts: `/api/view` accepts additive boolean `peaks_enabled`; no endpoint.
Every Display owns the flag, default false. Root snapshot always exposes exact
`peaks` scope/units/items; disabled means empty items and no provider call.
Peaks is Time-only and other plots disable it.
changes: Added immutable query/provider-result/item/units/snapshot,
`AbstractPeaksProvider`, lazy `EngeeDSPPeaksProvider`, injectable
`SignalPeaksService{P}` and Display invariant operation. Dict remains mapper
only. Production adapter uses `Base.require` plus `Base.invokelatest` and no
fallback/dependency edit.
mathematics: Real ordinate is `Re(x)`, complex is `abs(x)`, full raw samples.
`Xpk-1` becomes zero-based sample index, `time=index/fs`, Wpk is width_samples,
Ppk is prominence, ID is `peak-<index>`, occurrence order is preserved.
atomicity: Stale check and complete plot/measurement/peaks preparation precede
publication. Provider/package/malformed-result failures preserve revision,
Display, selection, membership, flag and cache. Disabled path is lazy.
verification: Parse/diff PASS; integrated backend 553/553 PASS including
provider failure, complex magnitude, one-enabled/one-disabled Display switch,
empty result and API validation. Independent prod compiled lazy-path probe
returned expected Ypk/Xpk/Wpk/Ppk without world-age.
risks: Runtime application E2E still requires authenticated deployed target;
extended peak settings remain out of scope.
follow-ups: Local product checkpoint, documentation, later authorized deploy
and runtime Peaks scenario.
