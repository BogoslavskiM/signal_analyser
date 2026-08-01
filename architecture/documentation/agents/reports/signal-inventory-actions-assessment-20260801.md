# Signal inventory actions assessment

Date: 2026-08-01

Role: Architect

Status: contract assessment complete; implementation and deployment not claimed

## Current facts

- `AnalysedSignal` owns name, color, sample rate and raw complex samples.
- Inventory is a nonempty ordered vector; names are current identity across
  selection, Display membership and caches.
- Row selection is global and distinct from active-Display visibility.
- Startup installs two synthetic signals. No signal mutation or workspace
  adapter exists.
- Existing mutation transport is full-snapshot HTTP 200, `409 state/current`
  for stale revision and field-level 422 for invalid requests.

Source anchors:

- `lib/domain/signal_analyser_state.jl:16,1819,1932-1961`
- `lib/services/signal_analyser_service.jl:622,775,929,2083,3061`
- `app/api.jl:26-49`
- `app/routes.jl:36-80`

## Frozen bounded feature

The inspector adds only Add, Copy and Delete. Add has two sources: an Engee
workspace variable obtained through a typed `engee.genie.recv` adapter, and an
inclusive raw Time ROI extract. Copy is a deep duplicate. Delete is confirmed
and cannot remove the final global signal.

No rename means the existing unique name identity can remain for this bounded
milestone. A broad stable-ID migration, generic inspector table replacement,
workspace enumeration and generic preprocessing would materially expand risk
without being required by the requested three actions.

## Backend architecture

Use an `AbstractWorkspaceSignalSource` port and an Engee implementation that
loads `Engee` lazily and calls only `engee.genie.recv(name; context=Main)`.
Local/test runtime uses a fake source or returns a stable capability error only
when workspace import is requested. Do not add Engee as a bare Project
dependency; Engee documentation says the package is supplied to Genie apps.

Map the strict `POST /api/signals` union to typed commands and dispatch through
an object-oriented inventory application service. Under the existing lock,
prepare the prospective inventory, every Display, filtered/fresh caches and
active outputs before one publish. Extract uses raw `AnalysedSignal.values` and
`signal_time_sample_range`; it must not use `SignalOrdinateRoi` or plot traces.

## Product decisions

- New signals append to global order and active Display membership; the first
  new item becomes row selection and active analysis source.
- Inactive Displays do not gain imported/duplicated/derived signals.
- Delete removes the name from all Displays; each affected page uses its first
  remaining member or becomes empty.
- Names are collision-safe `_Copy`, `_Copy2`, `_Extract`, `_Extract2` or base
  workspace suffixes; colors use deterministic palette allocation.
- Workspace values are snapshots, never live bindings.
- Matrix columns import atomically; any invalid column rejects the batch.

## Research boundary

MathWorks documents workspace drag/import, Duplicate, confirmed Delete and
transactional preprocessing. Genie deliberately provides an Add button because
the requested UI is button-driven. Engee officially documents `recv`; it does
not document a safe variable enumeration API, so the first workspace dialog
accepts an explicit variable name.

No MATLAB GUI evidence was obtained: clicker failed health after three bounded
startup attempts, and no GUI action was performed. Official web documentation
is the research source.

## Test and release sequence

Backend and Frontend implement in parallel after the contract checkpoint;
Tester owns exhaustive domain/API/static/behavior matrices. Frontend then
performs the mandatory per-action interaction design review. E2E remains
ineligible until Architect declares the complete Signals inspector milestone.
Optimization remains after the functional milestones.

## Risks

- Actual Engee workspace runtime types require adapter contract tests on an
  Engee environment; local fake success does not claim platform verification.
- Current cache keys use names. This is safe only while rename/replace remain
  excluded.
- A one-sample ROI is legal for measurements but invalid as a new standalone
  signal under the current Time Limits model and must be rejected.

## Outcome

This assessment authorizes product and ordinary-test implementation. It does
not claim E2E, runtime Engee verification, deployment, stable-ID migration,
settings, plot behavior or optimization.
