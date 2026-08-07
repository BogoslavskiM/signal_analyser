---
id: HND-0432
type: report
from: backender
to: orchestrator
title: Passive legacy snapshots no longer materialize DSP
task_section: ../tasks/TASK-0081-backend-explicit-apply-calculation.md#scope
applied_skills: [backender/backender-workflow, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
skipped_requested_skills: []
changed_files: [../../lib/services/signal_analyser_service.jl]
evidence_status: focused_pass_tester_fixture_migration_required
---

## Root cause and implementation

Both `signal_analyser_snapshot_unlocked` overloads retained the legacy defaults
`materialize_missing_spectra=true`, `materialize_missing_spectrogram=true` and
`materialize_missing_persistence=true`. A single cold passive
`signal_analyser_snapshot` therefore reproduced two Spectrum calls and one
Spectrogram call and populated both provider caches. In addition,
`signal_analyser_prepare_view_snapshot_unlocked` derived eager provider flags
from view changes, allowing a full passive view response to bypass the active
output boundary.

Only `lib/services/signal_analyser_service.jl` changed. Both snapshot overloads
keep their existing keyword signatures but now default all three materialize
flags to `false`. Full view snapshots always prepare display plots with the
same three flags set to `false`. Route and payload shapes are unchanged.
`/api/state`, full legacy state/display/inventory callers and view snapshots
now consume existing cache or typed empty plot data without provider work.
`/api/state-lite`, `need_update_pages`, Apply payloads and state/calculation
revision guards are unchanged. Production `/api/layouts` already uses its lite
path; the non-route legacy full-layout helper was deliberately left unchanged
because its separate TASK-0068 compatibility contract was outside this
targeted regression.

No mathematical formula, Engee call, provider implementation or dependency
intent changed. After the patch a passive view plus passive snapshot made zero
Spectrum, Spectrogram and Persistence calls. The following active-output GET
started the accepted background task, made exactly one Spectrogram provider
call and returned the ready successful payload after task completion.

The same passive boundary now covers Peaks. `signal_peaks_snapshot` defaults to
an enabled typed-empty snapshot and invokes the provider only when its explicit
`materialize=true` capability is used. `signal_analyser_prepare_pane_output!`
is that materializer for an active Time pane with Peaks enabled. It evaluates
the accepted Time ROI against the calculation snapshot revision, then publishes
a typed `SignalPeaksCacheEntry`, keyed by display, signal and Time limits, into
the snapshot plot cache. Existing output-task publication transfers that
last-good entry only after the guarded active calculation reaches publication.
Subsequent passive state/view snapshots rebase the cached Peaks result onto the
current state revision without invoking the provider. A Peaks intent toggle now
invalidates the affected active output but performs no work itself.

Provider failure remains an active-output error: accepted Apply state and Time
limits survive, the ready response has `success=false` with the bounded provider
error, and the previous output-manager Plotly cache entry is not replaced. No
fallback data are fabricated. The frontend can therefore retain its already
mounted last-good graph while observing the typed error.

## Verification

- Julia syntax parse: pass.
- `git diff --check`: pass.
- Explicit Spectrogram draft, Apply and passive snapshot: typed limits retained;
  zero Spectrum and Spectrogram calls.
- Current Cascade 15 focused test: 20/20 pass.
- `explicit_apply_contract_test.jl`: 17/17 explicit-Apply assertions and 5/5
  MATLAB Time assertions pass.
- `active_output_contract_test.jl`: 15/15, 9/9, 12/12 and 81/81 pass
  (117/117 total).
- Focused Peaks draft -> Apply -> passive view/snapshot probe: zero provider
  calls. The first active-output task made exactly one provider call over ROI
  samples `[7.0, 8.0, 9.0, 10.0]` with `sample_offset=7`; provider query revision
  equalled the published output revision. A subsequent passive snapshot made no
  additional call and returned cached `peak-8`.
- Focused Peaks failure probe: Apply succeeded without a provider call; lazy
  active output terminalized as ready/unsuccessful with `ROI provider failure`,
  retained the accepted `0.8..1.11 s` limits, and preserved the prior
  output-manager cache entry by identity.
- Empty-result cache regression: an active Time output whose Peaks provider
  returns zero items succeeds and publishes a typed empty cache entry. Passive
  reconstruction now uses `SignalPeakItem[entry.snapshot.items...]` rather than
  `collect(entry.snapshot.items)`, because collecting the empty tuple inferred
  `Vector{Union{}}` and violated the typed snapshot constructor. The exact
  `Signal Analyser Peaks provider failures and display scope are atomic` set
  now passes 31/31; enable/view remains at zero calls, active output makes one
  call, and the following passive snapshot returns empty items with no second
  provider call.

After Tester's first fixture migrations, the direct service regression passes
the preceding inspector, inventory, Persistence, Spectrogram and snapshot/cache
sets (including 121/121 in `Signal Analyser snapshot and cache`), the injected
Peaks set 17/17 and the provider failure/display scope set 31/31. It next stops
at Cascade 5 lines 1502/1508/1513/1520, whose call counts still expect the
passive Peaks enable/clear lifecycle to invoke the provider once. TASK-0083
must migrate those remaining expectations to zero passive calls or explicit
active-output materialization. Cascade 7's former deep-copy cache equality was
also Tester-owned: `SignalAnalyserPlotCacheEntry` uses identity equality, so
retained entry/context/plots semantics are the meaningful last-good contract.
These fixture migrations are not reasons to restore eager Peaks calculation.

No frontend/test/dependency file and no local application runtime was changed.
