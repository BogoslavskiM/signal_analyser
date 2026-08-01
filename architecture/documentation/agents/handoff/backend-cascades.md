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

## Cascade 8 selectable Statistics — 2026-07-31

goal: Add an ordered per-Display measurement selection and compute only its
requested raw-ROI statistics.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Exact IDs/order minimum, maximum, mean, median, peak_to_peak, rms;
defaults first three; empty allowed; root/display snapshot and additive
`/api/view`; strict duplicate/unknown/type 422; equal set no-op; Clear preserves
and re-add recomputes. Existing measurements/item keysets remain unchanged.
changes: Added typed `SignalMeasurementSelection`, expanded measurement kinds,
canonical API validation and selected-only snapshot preparation. Empty subset
bypasses ROI. Median uses odd/even standard definition; P2P is max-minus-min;
RMS is scale-normalized with exact zero for zero scale. Statistics stay free of
EngeeDSP and dictionaries remain at the wire mapper boundary.
verification: Integrated backend 789/789 PASS, including formulas, complex
magnitude, extreme finite RMS, lifecycle, stale/no-op and atomic invalid input.
risks: Live target and real specialized DSP paths were not exercised. Existing
enabled Peaks preparation may still abort the joint mutation atomically.
follow-ups: Runtime only after an accepted deployment; keep specialized
spectral/Peaks behavior behind proven Engee functions.

## Cascade 9 typed Spectrum/ROI — 2026-08-01

goal: Replace the legacy Spectrum estimate path with an exact per-Display,
Time-ROI-aware EngeeDSP contract behind typed OOP boundaries.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_math.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Exact `spectrum_settings`, defaults/preserve/no-op/revision/atomicity,
raw inclusive per-signal ROI, real one-sided, complex centered two-sided,
EngeeDSP `pspectrum` only, no fallback/dependency edit.
changes: Added `SignalSpectrumSettings`, `SignalTimeSampleRange`,
`SignalSpectrumQuery`, `SignalSpectrumData`, abstract/provider/service types and
typed cache key. Spectrum preparation is complete before state/cache
publication. Scale is presentation-only; Leakage participates in raw cache
identity. Mixed-duration members intersect the Display ROI independently.
verification: Julia parse PASS; integrated backend 867/867 PASS, including C9
service 52/52 and API 28/28. Prod EngeeDSP probe confirms topology, Leakage and
short-input contract. Local real package gate fails because EngeeDSP is absent.
risks: Runtime application E2E and deployment remain open. Exact dB at zero
power is `-Inf`; existing API `json_safe` maps non-finite values to `null`.
follow-ups: Target preflight/runtime E2E after an authorized deployment; next
Spectrum options require a separately frozen contract.
next_task_candidates: Frequency Limits/log-floor presentation; bounded
complex/log MATLAB delta; no Spectrogram/Persistence refactor by inference.

## Cascade 10 Frequency Limits — 2026-08-01

canonical_role: Backend
session: `/root/backend_cycle`.
goal: Implement DEC-016 without frontend DSP, fallback or functional-sprawl
regression.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_math.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Strict four-key settings; typed Auto/Explicit limits; exact root,
Display and requested/effective metadata; source preserve/reset; secondary
topology intersection; provider/query/cache inclusion; 0/1/no-overlap bypass;
real Min0 Log and existing complex Log guard.
changes: Added OOP limits variants and invariants, typed query/cache fields,
strict parser/serializer, atomic lifecycle, Engee FrequencyLimits options and
provider output validation. No FFT/crop/padding/resampling/fallback/dependency
edit.
verification: Julia parse PASS; full backend 944/944; C10 unit 37/37 and API
40/40; durable mixed-Fs/no-overlap and source preserve/reset regressions PASS.
risks: Local real provider gate cannot import absent EngeeDSP; prod 0.72.0
probe is separate capability evidence.
follow-ups: Runtime target gate; next Spectrogram/Persistence work remains
read-only planning until a new contract.
next_task_candidates: Shared typed heatmap provider gap analysis and Engee
probe matrix.

## C11 heatmap provider read-only gap analysis — 2026-08-01

canonical_role: Backend
session: `/root/backend_cycle`.
goal: Identify the smallest safe Spectrogram/Persistence seam without freezing
unproven math/API.
current_gap: Existing heatmap functions call `pspectrum` directly, always set
`TwoSided=true`, use whole signal, return raw dictionaries and cache bounded
presentation only by signal name. They ignore Display ROI/settings/topology and
contain unproven epsilon/absolute-value assumptions. No typed heatmap
query/data/provider/cache abstraction exists.
proposed_contract: Separate typed `SignalSpectrogramQuery/Data` and
`SignalPersistenceQuery/Data` over shared segmented input; one abstract
time-frequency provider with representation-specific dispatch; full raw result
caches and presentation-only 160×160 bounding. This remains a proposal.
probe_gate: Prod matrix must isolate real/complex topology, exact axes/matrix
orientation/units, segment grid/absolute time/short input, ROI subset behavior,
FrequencyLimits, option order/conflicts and Persistence NumPowerBins/percentage
invariants. A missing segment-origin capability may be a provider gap; no
hand-rolled STFT/histogram fallback is allowed.
narrow_first_slice: Probe-only. After evidence and a new ADR, the smallest
implementation candidate is Spectrogram only with no editable settings, typed
provider/service/cache behind the existing heatmap wire. Persistence and UI
controls remain deferred.
verification: Read-only inventory only; no files/runtime changed.
risks: Current eager placeholder calculation and cache semantics are not a safe
foundation for ROI parity.
next_task_candidates: Engee prod probe; MATLAB UI defaults after clicker
recovery; Architect decision on one-signal eligibility, segment ROI and eager
versus lazy output contract.

## Cascade 11 typed Spectrogram foundation — 2026-08-01

canonical_role: Backend
session: `/root/backend_cycle`.
goal: Implement DEC-017 as an OOP provider foundation without controls, routes,
frontend DSP or fallback.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_math.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Copied full-raw query; typed frequency × segment-time data; real
one-sided/complex centered topology; N<2 empty; strict axes/shape/domain/power;
typed raw cache; exact dB and presentation-only 160×160 bounding; atomic
provider failure.
changes: Added Spectrogram query/data/provider/service/cache types and injected
aggregate dependency, EngeeDSP adapter with explicit `TwoSided`, validated raw
preparation/publication and source-local render overlay. Removed the legacy
Spectrogram transpose tolerance, absolute-value conversion and epsilon floor.
verification: Julia parse PASS; integrated backend 980/980 with C11 36/36;
production-adapter smoke confirms real `Vector{Float64}`, explicit false and
exact orientation. Local real provider import remains unavailable.
risks: Runtime E2E/deployment pending; full-signal eager calculation remains the
accepted C11 boundary; Time ROI and all settings deferred.
follow-ups: Probe/freeze OverlapPercent separately; keep TimeResolution blocked
by ENGEE-20260801-003.
next_task_candidates: Spectrogram OverlapPercent query/cache extension after
provider evidence.

## Cascade 11 short-input terminal-center correction — 2026-08-01

canonical_role: Backend
session: `/root/backend_cycle`.
goal: Accept valid EngeeDSP terminal centers without weakening other typed
Spectrogram invariants.
scope: `lib/services/signal_analyser_service.jl` only.
contracts: Upper center bound is
`last_timestamp + 0.5/f_s + numeric_tolerance`; lower bound, topology, shape,
frequency and power validation unchanged.
changes: Local product/test checkpoint `68016963800bcd89d43ad224a9519d3634ab729b`.
verification: Julia parse/diff PASS; backend 982/982; C11 38/38; prod real/
complex N=2..16 max observed center overrun 0.5 sample.
risks: Exact short-input evidence is target-only; local provider is a double.
follow-ups: Preserve the bound while adding explicit OverlapPercent.
next_task_candidates: DEC-018 implementation.

## Cascade 12 Spectrogram OverlapPercent — 2026-08-01

canonical_role: Backend
session: `/root/backend_cycle`.
goal: Implement DEC-018 through typed OOP state/query/cache/provider boundaries.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Exact one-key settings object; default 50; finite non-Bool 0..75;
Display-local root mirror; no-op/+1/422/409; A/B/Clear/re-add/source lifecycle;
canonical provider options `OverlapPercent`, value, `TwoSided`, flag.
changes: Added `SignalSpectrogramSettings`; propagated overlap through Display
state, query/cache identity and atomic preparation/publication. Empty and N<2
bypass provider; first re-add recomputes; source change preserves preference.
verification: Julia parse/diff PASS; backend 1110/1110, C12 typed 13/13,
lifecycle/cache 56/56 and API 59/59. Prod explicit 0/50/75 evidence retained.
risks: Local real EngeeDSP is absent; runtime deployment not exercised.
follow-ups: Leakage requires an independent contract and must remain separate
from existing Spectrum Leakage.
next_task_candidates: Prod Spectrogram Leakage probe and successor ADR.

## Cascade 13 Spectrogram Leakage — 2026-08-01

canonical_role: Backend
session: `/root/backend_c13_impl`.
goal: Implement DEC-019 with strict OOP state/query/cache/provider independence.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Exact two-key settings; Leakage default .5, non-Bool 0..1 and signed
zero canonicalization; canonical Leakage/Overlap/TwoSided provider order;
Spectrum independence; no-op/+1/422/409 and Display lifecycle.
changes: Extended settings/query/cache key and adapter. Added typed semantic
view-change classification plus missing-materialization controls: Spectrogram-
only change does not warm Spectrum; canonical no-op warms neither spectral
provider, reuses cached data or returns typed-empty wire, while next GET
materializes normally. Direct cache-key construction validates/canonicalizes.
verification: Backend 1229/1229; typed 21/21, cold isolation 6/6, cold no-op
27/27, lifecycle 76/76, independence 23/23, API 94/94; parse/diff PASS.
risks: Local EngeeDSP absent; runtime deployment not exercised.
follow-ups: Reassign remains probe/ADR-only.
next_task_candidates: C14 public-provider Reassign capability probe.

## C14 Reassign prod capability NO-GO — 2026-08-01

canonical_role: Backend
session: `/root/backend_c14_reassign_probe`.
scope: Read-only public EngeeDSP `pspectrum` prod probe; no repository changes.
evidence: Omitted Reassign and false are bitwise equal, deterministic and
option-order invariant. Every valid true call failed 28/28 across real/complex,
one-/two-sided, Leakage 0/.5/1 and N=2..4096 with
`UndefVarError: fetchTimeReassignment not defined` at
`computeSpectrogram.jl:375` via public `pspectrum.jl:50`.
validation: Numeric/string/null-like inputs reject; provider unexpectedly
accepts Symbol aliases, so future product must remain strict JSON Bool.
decision: Current build is NO-GO. Omit/false only; no control, silent downgrade,
fallback, custom DSP or dependency edit.
verification: Prod false/default matrices PASS; true defect isolated independent
of application/test/network. Confirmed as ENGEE-20260801-004.
risks: True topology/power/resource behavior remains unknown.
follow-ups: Reprobe an upstream-fixed build before successor ADR.
next_task_candidates: Spectrogram Frequency Limits capability slice.

## C15 Spectrogram Frequency Limits prod probe — 2026-08-01

canonical_role: Backend
session: `/root/backend_c15_spectrogram_limits_probe`.
scope: Public EngeeDSP read-only prod matrix; no repository changes.
evidence: Real/complex Auto/full/partial/narrow/clipped grids are deterministic,
1024×15 at N=256 and 1024×2 at N=2. Valid explicit ranges produce exact new
frequency endpoints and changed power with unchanged time centers. Auto and
explicit full are not bitwise identical. Outside/reversed/equal/nonfinite/wrong
shape reject; provider accepts Bool containers and leaks MethodErrors for some
bad types.
policy: Strict product validation requires full interval inside authoritative
topology, finite non-Bool ordered Hz; no provider clipping. Auto/Explicit are
independent cache identities. Canonical options append FrequencyLimits after
Leakage, OverlapPercent and TwoSided.
candidate: Floating Nyquist-touch can return 1024 rows with only two unique
frequencies; suspected intake ENGEE-20260801-005, product workaround strict.
verification: Repeats and option order exact; no app/test/network layer used.
risks: Package semantic version unavailable; partial clipping not exposed.
follow-ups: Implement DEC-021 typed OOP contract.
next_task_candidates: Backend C15 implementation.

## Cascade 15 implementation — 2026-08-01

canonical_role: Backend
session: `/root/backend_c15_spectrogram_limits_probe`.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`,
`lib/services/signal_analyser_math.jl`.
contracts: Exact three-key settings; nullable Auto/strict Explicit Hz; real and
complex topology validation; independent Spectrum state; requested/effective
metadata; distinct Auto/full cache identity; canonical provider order and
strict explicit output-axis guard; source preserve/reset and cold no-op.
changes: Extended typed Display settings, query/cache key, parser, lifecycle,
provider adapter and plot metadata. No fallback, crop, route or dependency.
verification: Backend 1263/1263 after audit regressions, C15 34/34, Julia parse
and diff PASS. Local EngeeDSP remains unavailable after findpeaks 16/16.
risks: Runtime provider/E2E remains undeployed; suspected Nyquist-touch edge is
blocked by strict input/output guards.
follow-ups: C16 Frequency Scale must not enter query/cache/provider.
next_task_candidates: Typed presentation-only C16 state after successor ADR.

## Cascade 16 Frequency Scale implementation — 2026-08-01

canonical_role: Backend
session: `/root/backend_c15_spectrogram_limits_probe`.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`,
`lib/services/signal_analyser_math.jl`.
contracts: Dedicated scale enum; exact four-key parser/state; authoritative
requested/effective/available; reversible real/complex/Clear lifecycle; scale
excluded from query/cache/provider and backend arrays.
changes: Added typed scale state and metadata projection. Scale-only cold/equal
mutations perform zero spectral provider calls; computational setting changes
retain existing recompute behavior.
verification: Full backend PASS; C16 47/47, API 16/16; Julia parse/diff PASS;
final integration audit CLEAN.
risks: Local EngeeDSP and Devhub MCP unavailable; no runtime deployment.
follow-ups: Power Limits requires separate evidence/ADR and OOP contract.
next_task_candidates: C17 read-only inventory after research.

## C17 Power Limits OOP inventory — 2026-08-01

canonical_role: Backend
session: `/root/backend_c17_power_inventory`.
goal: Design the exact typed/OOP C17 backend boundary without product edits.
scope: Read-only domain/math/service inspection.
contracts: Add typed Auto/Explicit power limits to settings only; keep query,
raw data, provider and cache key unchanged. A separate finite
`SignalSpectrogramPowerExtent` must allow equality for truthful constant Auto
data while explicit input remains strictly ordered. One projection traversal
converts full raw power to dB and accumulates finite extrema before bounding.
effective state stays transient and is never stored in Display.
implementation_note: Reuse the already-created selected Spectrogram projection
in multi-trace snapshot assembly to avoid a second full-matrix scan.
changes: None; inventory only.
verification: Read-only code-anchor and lifecycle review; no behavior test was
required because no file changed.
risks: Reusing the strict explicit type for Auto extent would reject `{v,v}`;
deriving from bounded z would miss extrema.
follow-ups: Implement DEC-023 after its documentation checkpoint and return the
five-key payload handoff to Frontend/Tester.
next_task_candidates: Implement DEC-023 in the three existing Julia modules.
source_evidence: Current conversion/bounding and presentation-only semantic
preparation anchors plus MATLAB Researcher C17 recommendation.
engee_bug_candidate: None; the slice never changes provider behavior.

## Cascade 17 Power Limits implementation — 2026-08-01

canonical_role: Backend
session: `/root/backend_c17_power_inventory`.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_math.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Typed Auto/Explicit preference and equal-capable transient extent;
exact five-key parser; one full-raw dB projection traversal before bounding;
query/cache/provider isolation; exact empty/constant metadata.
changes: Added OOP value objects and projection/resolution objects, retained
legacy constructor arities, and reused the selected projection in snapshot
assembly instead of scanning the matrix twice.
verification: Backend 1397/1397, C17 49/49 + API 22/22; Julia parse/diff and
final integration audit PASS.
risks: Runtime browser verification remains external; Engee path is unchanged.
follow-ups: Wait for a separately frozen C18 contract.
next_task_candidates: Read-only C18 OOP inventory after ADR.
source_evidence: DEC-023; product commit `290c057`.
engee_bug_candidate: None.

## C18 typed Persistence OOP inventory — 2026-08-01

canonical_role: Backend
session: `/root/backend_c18_inventory_replacement`; replaces interrupted
`/root/backend_c18_persistence_inventory`.
scope: Read-only domain/math/service inspection against DEC-024.
contracts: Dedicated query/data/cache key/provider/service/cache. Key contains
signal name, sample rate, sample count, topology and fixed power-bin count.
Provider explicitly receives `NumPowerBins=256` then topology-derived
`TwoSided`. Base plot cache retains an empty compatibility wire; selected
Persistence is always replaced from the typed cache.
atomic_plan: Add prepare/publish Persistence phases. Provider and complete data
validation finish before publication of any cache, Display or revision.
Secondary visibility with unchanged source never materializes Persistence.
changes: None.
verification: Read-only feasibility verdict CLEAN.
risks: Current signal name is canonical identity; future same-name raw
replacement would require a generation/content identity in a successor ADR.
follow-ups: Implement DEC-024 after documentation checkpoint.
next_task_candidates: Backend C18 implementation in the three existing Julia
modules without API/UI expansion.
engee_bug_candidate: None.

## Cascade 18 typed Persistence implementation — 2026-08-01

canonical_role: Backend
session: `/root/backend_c18_atomic_replacement`; completes product work from
`/root/backend_c18_inventory_replacement` and replaces its stalled P1 fix.
scope: three existing `lib/domain|services` Julia modules.
contracts: Dedicated immutable query/data/cache/provider/service; fixed 256;
strict topology/orientation/axes/range; exact dB before bound; `N<2` empty;
selected-only cache; unchanged wire and constructor compatibility.
changes: Added typed Persistence OOP path and raw cache. Final P1 correction
adds `SignalAnalyserPreparedDisplayPlots`: ordinary snapshot renders full
plots/plot_payload and panel before publishing all four cache maps.
verification: Backend 1449/1449, C18 49/49; Julia parse/diff and final audit
CLEAN.
risks: Prod Engee runtime not rerun; same-name/same-size raw replacement would
need future generation identity.
follow-ups: Runtime target gates only; no implicit settings expansion.
next_task_candidates: C19 inventory after separate evidence/ADR.
engee_bug_candidate: None.

## C19 Persistence Leakage prod provider probe — 2026-08-01

canonical_role: Backend
session: `/root/backend_c19_persistence_leakage_probe`.
goal: Establish the exact public EngeeDSP boundary before a product ADR.
scope: Prod Engee MIND, deterministic in-memory arrays only; no repository,
model, dependency, deploy, browser or MATLAB mutation.
environment: Julia `1.12.4`; EngeeDSP `0.72.0`, UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, tree
`4941c08f227519cbc82caab7bc519851f44b0586`.
contracts: Real/complex `N=256`, `Fs=100`; occurrence 256x1024, frequency
1024x1, power 256x1; strict finite axes, positive power and occurrence 0..100.
Omitted Leakage is bit-exact explicit `0.5`; endpoints/repeats deterministic.
Leakage changes power axis/occurrence, not frequency axis. All six permutations
of Leakage/NumPowerBins/TwoSided are bit-exact equal.
validation: Range/nonfinite/string reject consistently. Provider accepts Bool
as numeric endpoints, so product must reject Bool before dispatch.
changes: None by Backend; only Architect documentation was in flight.
verification: Exact array/type/shape/equality/range/delta predicates inside the
prod runtime; no hand-written spectral oracle.
cleanup: Temporary prod pod stopped; follow-up status `stopped`.
risks: Leakage must invalidate Persistence raw cache; it is not presentation.
follow-ups: Implement DEC-025 with immutable settings/query/cache identity and
canonical Leakage, NumPowerBins, TwoSided order.
next_task_candidates: C19 Backend OOP implementation after docs checkpoint.
source_evidence: Exact report under `agents/reports/` and official docs.
engee_bug_candidate: None.

## Cascade 19 Persistence Leakage implementation — 2026-08-01

canonical_role: Backend
session: `/root/backend_c19_persistence_leakage_probe`.
scope: `lib/domain/signal_analyser_state.jl`,
`lib/services/signal_analyser_service.jl`.
contracts: Immutable finite non-Bool Leakage settings; exact root/display/API
object; query/cache identity; Leakage, NumPowerBins, TwoSided provider order;
Persistence-only isolation; A/B/Clear/re-add/source lifecycle; N<2/empty;
prepared failure rollback of Display/revision/four caches; unchanged C18 wire.
changes: Added typed settings and Display field, compatibility constructors,
payload/validator, settings-aware query/key/service and semantic preparation
planner. No custom DSP/fallback.
verification: Julia parse/diff PASS; full backend 1497/1497; C19 typed 13/13,
lifecycle/cache 14/14 and API 21/21. Final source audit CLEAN.
risks: No synthetic renderer-failure seam; renderer consumes already validated
typed C18 data. Prod provider evidence remains scoped to EngeeDSP 0.72.0.
follow-ups: Runtime target only; later settings require successor ADR.
next_task_candidates: Bounded C20 Persistence Overlap prod probe.
source_evidence: DEC-025, prod C19 report, product commit `2f99ff8`.
engee_bug_candidate: None.

## Cascade 20 Persistence Overlap resource probe — 2026-08-01

canonical_role: Backend
session: `/root/backend_c19_persistence_leakage_probe`.
goal: Decide bounded provider/resource feasibility before any product ADR.
scope: Prod EngeeDSP 0.72.0, deterministic in-memory real/complex fixtures;
no repository/model/file/dependency/deploy/MATLAB/browser mutation.
contracts: Explicit 0/25 is deterministic and materially changes occurrence;
frequency/topology and 256x1024 orientation remain stable. Provider rejects
range/nonfinite/string but accepts Bool.
resource_gate: 50 allocated 543–627 MiB, 75 1.02–1.18 GiB, omitted up to
1.75 GiB. Later option-order 0 calls also crossed 512 MiB; 99/99.9 and the
remaining matrix were stopped.
decision: NO-GO. Twenty-five percent is evidence ceiling, not a safe cap; no
default/range/schema/provider order can be frozen. Fallback Frequency Limits.
cleanup: retained outputs cleared; pod stop 204 and follow-up status stopped.
changes: None.
verification: Exact types/shapes/axes/occurrence sums/repeats/deltas plus
warmed allocation signal; full order/interaction gate intentionally incomplete.
risks: Allocation is volatile and not pod RSS, but repeated hard-limit
crossings are decisive. No Engee bug is claimed.
next_task_candidates: Bounded Persistence Frequency Limits provider matrix.

## Cascade 21 Persistence Frequency Limits provider probe — 2026-08-01

canonical_role: Backend
session: `/root/backend_c19_persistence_leakage_probe`.
scope: Prod EngeeDSP 0.72.0, N=64 deterministic real/complex, fixed Leakage,
explicit Overlap=0, bins/topology; no repository or external state mutation.
contracts: Auto/full fixture equality; exact in-domain endpoints/new 1024 grid;
partial clipping equals canonical boundary; outside/equal/reversed reject;
PWR/occurrence materially change; repeats/order and Leakage interaction PASS.
validation: Provider accepts Bool pair and 1x2 matrix and leaks MethodError for
string endpoints. Product requires exact flat finite non-Bool pair and whole
interval inside analysis-source topology.
resources: 28 accepted warmed observations, max 382.46 MiB/1.994 s, no guard
crossing. Conditional on N=64 and explicit zero only.
decision: Capability PASS; DEC-027 product BLOCKED. Current adapter omitted
Overlap is not covered; zero would globally change C18/C19 output/cache.
cleanup: live bytes reduced, pod stop 204 and follow-up stopped confirmed.
changes: None.
next_task_candidates: Fixed segmentation/resource foundation evidence and ADR.
