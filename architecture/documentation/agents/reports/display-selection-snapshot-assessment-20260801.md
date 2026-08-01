# Display selection snapshot boundary assessment

Date: 2026-08-01

Role: Architect (`/root/architect_c27_contract`)

## Authoritative contract trace

[DEC-009](../../user/decisions/DEC-20260731-009-display-pages.md) assigns each
Display an independent membership and selection while keeping row selection
separate. [DEC-012](../../user/decisions/DEC-20260731-012-display-selection-separation.md)
requires a known non-null global row, ordered page membership that may be empty,
and a nullable analysis source that is null exactly for an empty Display and
otherwise belongs to its membership. `selected_signal` is only the nullable
legacy alias of that source.

The domain expresses those invariants in `GlobalSignalSelection`,
`SignalDisplayMembership` and `SignalAnalyserDisplayState`. State construction
also requires a nonempty global inventory. Request validation accepts the
canonical and legacy analysis fields independently, requires equality when both
are present, rejects unknown membership/source values and returns membership in
inventory order.

The serializer publishes both aliases and ordered membership for every Display,
then repeats the active Display selection at root. Each `signals[].visible` is
the boolean projection of active membership. There is no authoritative absence
compatibility for these response fields.

## Frontend gap

Current `normalize()` derives a missing global row from root
`selected_signal`, coerces malformed membership to `[]`, coerces malformed
source to `null` and falls back from missing `analysis_signal` to the legacy
alias. Those invented values can reach a complete `/api/view` body.
`accept()` currently establishes only the global DEC-032 envelope and nested
settings boundaries; the quarantine map has no selection/membership error.

## Frozen boundary

After the DEC-032 envelope, C27 validates in this order:

1. Require own nonempty known `row_selected_signal`. Failure, including empty
   inventory, is global fatal/reset/Retry; no alias/first-row fallback.
2. Validate every Display selection block. Membership is a required array of
   unique known nonempty names already in inventory order. Both response
   aliases are required, nullable/known, equal, and satisfy empty/nonempty
   membership-source invariants. Failure quarantines only that Display without
   coercion or View serialization.
3. If and only if the active Display selection block is valid, require root
   membership/aliases and every `signals[].visible` boolean to match that page
   exactly. Failure is global fatal. When active selection is invalid, root
   selection projections are ignored; the active page remains local
   quarantine. This precedence prevents accidental escalation of the promised
   C27 per-Display boundary.

Snapshot strictness does not alter request compatibility. `/api/view` continues
to accept one analysis alias or two equal aliases. Display topology operations
may continue through quarantine because they use DEC-032-validated IDs and do
not serialize the invalid selection block. `state_revision` remains an
authoritative input of the existing mutation contract, but is not validated by
DEC-032 or C27.

## Frozen lifecycle matrix

- Initial global row/root corruption: full DEC-032 reset, zero POST, Retry GET
  only.
- Initial Display corruption: retain topology/inventory/valid row; active
  invalid gets empty/error graph and zero View mutation; inactive invalid does
  not affect valid active page.
- Successful `200`: purge desired/queued/pending/replay View work only for each
  invalid Display. Continue independent valid-display intents from returned
  revision. Global row/root corruption purges all.
- `409 current`: never replay an invalid target; independent valid-display
  work may continue. Global row/root corruption remains fatal/no replay.
- A later authoritative valid snapshot clears the relevant quarantine but does
  not resurrect discarded work. Global fatal recovery remains Retry-only.

## Deliberate exclusions

C27 does not validate root active plot, Time/Spectrum/Spectrogram/Persistence or
Statistics projections, plot payload selection metadata, traces, panel,
Measurements, Peaks, DSP data or mathematics. These are separate existing or
future boundaries.

## Contradictions resolved

- DEC-032 permits `signals=[]` as an outer array shape. C27 refines that state to
  global fatal because DEC-012/domain require a known non-null row; DEC-032 is
  not rewritten.
- Legacy response alias does not authorize recovery of a missing canonical
  response field. Serializer publishes both; leniency remains request-side.
- Earlier discovery named per-Display quarantine and global root consistency
  but omitted precedence for malformed active selection. The active-first rule
  above makes the two promises compatible.
- Unlike the accepted unordered Statistics subset, Display membership is an
  ordered authoritative state and backend publishes inventory order. C27
  therefore rejects unordered membership instead of silently sorting it.

## Source evidence

- `architecture/documentation/user/decisions/DEC-20260731-009-display-pages.md:20-34`
- `architecture/documentation/user/decisions/DEC-20260731-012-display-selection-separation.md:22-43`
- `architecture/documentation/user/decisions/DEC-20260801-032-global-snapshot-envelope.md:28-57`
- `architecture/documentation/agents/handoff/tester-cascades.md:526-538`
- `lib/domain/signal_analyser_state.jl:1471-1509`
- `lib/domain/signal_analyser_state.jl:1517-1558`
- `lib/domain/signal_analyser_state.jl:1843-1884`
- `lib/services/signal_analyser_service.jl:59-68`
- `lib/services/signal_analyser_service.jl:900-915`
- `lib/services/signal_analyser_service.jl:2083-2144`
- `lib/services/signal_analyser_service.jl:2316-2349`
- `lib/services/signal_analyser_service.jl:2740-2843`
- `public/js/app.js:21-30`
- `public/js/app.js:45`
- `public/js/app.js:87-91`
- `public/js/app.js:204`

This assessment authorizes a future frontend/test implementation only. No
product, test, backend, API, runtime, deployment or mathematics change is
claimed.
