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

## Cascade 5 P0 state separation — 2026-07-31

goal: Express independent global row selection, page membership and nullable
analysis source, including a fully empty active Display.
scope: `lib/domain/signal_analyser_state.jl` and
`lib/services/signal_analyser_service.jl`.
contracts: Snapshot adds non-null `row_selected_signal`, nullable root/display
`analysis_signal` and nullable legacy `selected_signal`. `/api/view` accepts the
independent canonical fields and `visible_signals=[]`; only canonical/legacy
analysis aliases conflict. Empty Display disables Peaks and never invokes
`pspectrum`/`findpeaks`.
changes: Added `GlobalSignalSelection`, ordered `SignalDisplayMembership`,
explicit no/source analysis types, nullable typed measurement/peak snapshots,
empty plot/panel mappers and atomic view/display lifecycle publication.
verification: Julia parse/diff PASS; integrated backend 649/649 PASS. Clear,
no-op/stale, first re-add, source fallback, differing valid canonical fields,
inactive preservation and seeded page creation are covered.
risks: Runtime application behavior remains undeployed/authentication-blocked;
local EngeeDSP package discovery remains unavailable.
follow-ups: Stand by for runtime/backend defect triage after an authorized
deployment; do not infer row/source coupling at the API layer.

## Cascade 6 read-only backend audit — 2026-07-31

goal: Prove frontend-local Time normalization/markers need no backend delta.
findings: Time traces are named/colored finite Float64 arrays bounded to 1024;
Peaks uses the same ordinate convention over full raw samples and identifies
the analysis source. Empty payloads are already typed and lazy. Backend/API,
cache and revision remain unchanged; regression 649/649 PASS.
bounded_raw_note: A raw Peak can fall outside bounded trace extrema. Frontend
must apply the same affine scale without clipping and keep backend `time_s`.
risk: `AnalysedSignal` itself does not reject non-finite construction; future
import adapters need a separate typed finite-value invariant. C6 renders a
stable frontend invalid-data state and does not change Backend for this risk.

## Cascade 7 authoritative Time Limits/ROI — 2026-07-31

goal: Add typed page-local Time Limits and use them as the common raw ROI for
Measurements and Peaks without a new endpoint.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Strict `{min_s,max_s,units:"s"}`; inclusive raw samples; absolute
measurement/peak coordinates; query sample offset; 1–2 sample enabled Peaks is
typed empty/no-provider; source preserve/reset; Clear/re-add/new/inactive
lifecycle; validation/provider failure before publication.
changes: Added `SignalTimeLimits`, `SignalOrdinateRoi`, `SignalTimeRoiService`,
Display invariant and service/API mappers. Full-state carried limits are
distinguished from genuine invalid edits on analysis-source change.
verification: Julia parse/diff PASS; integrated backend 719/719 PASS.
risks: Real EngeeDSP ROI call remains a target gate. A future one-sample import
needs an explicit duration/limits contract.
follow-ups: Runtime on accepted deployment; no dependency or fallback added.
