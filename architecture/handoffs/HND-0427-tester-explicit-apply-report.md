---
id: HND-0427
type: report
from: tester
to: orchestrator
title: TASK-0083 explicit Apply regression report
task_section: ../tasks/TASK-0083-test-explicit-apply-and-math-contracts.md#scope
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
result: frontend_passed_backend_environment_blocked
---

## Completed tester changes

- Corrected obsolete Time component expectations in
  `test/back/lib/multilayout_integration_test.jl` and
  `test/back/lib/pane_outputs_test.jl`: a complex signal expands in ordered
  `real`/`imaginary` traces; a real signal has exactly one trace with empty
  `component`. This replaces the invalid assumption that every signal expands
  to two components.
- Migrated the legacy grouped `spectrum_settings` `/api/view` mutation in
  `test/back/lib/pane_outputs_test.jl` to the accepted one-field,
  provider-free `spectrum.frequency_scale` settings update. The test still
  verifies that an inactive Spectrum pane retains the log scale through
  session export/import and returns log traces once active.
- Migrated the inspector rollback setup in
  `test/back/lib/signal_analyser_service_test.jl` from an invalid grouped view
  settings path to the accepted immediate, provider-free one-field
  `spectrum.frequency_scale=log` update. The rollback commands now use the
  returned state-lite revision; inspector failure/cache assertions remain.
- Made the lower-Fs inventory regression's explicit-range requests independent
  `Dict{String,Any}("min" => 100.0, "max" => 500.0)` fixtures. This is the
  exact accepted wire shape for draft ranges and prevents a later request from
  sharing mutable test input; no parser/product change was made.
- Made the active-output/snapshot regression deterministic: after requesting
  active output it awaits the owned background task, reads the authoritative
  current revision, and only then performs the unrelated selected-signal view
  mutation. Passive snapshots remain explicitly cache-only; this does not
  weaken the zero-provider assertion.
- Began Cascade 7 migration: the one-sample ROI now uses exact typed
  `time.x_limits` draft plus snapshot-free Apply, then independently enables
  Peaks so its provider sees the accepted ROI. It no longer passes grouped
  `time_limits` through the view route.
- Migrated Cascade 7 provider-failure expectation to HND-0423's accepted
  boundary: typed draft + successful snapshot-free Apply publishes the ROI;
  lazy active-output materialization then returns a ready/unsuccessful pane
  error containing the provider failure and preserves the last-good output
  cache. Semantic invalid Apply remains separately asserted as atomic.
- Added `test/back/lib/explicit_apply_contract_test.jl` with deterministic
  service-level coverage for typed calculation drafts, snapshot-free Apply,
  zero provider work during draft/Apply, stale rejection, invalid draft
  preservation, complex real/imag trace order, min-max endpoints and constant
  traces, and raw complex-value preservation.
- Added `test/front/public/js/explicit_apply.behavior.test.js` for the Vue
  coordinator: ordered flush → exact `{state_revision, display_id}` Apply →
  active-output refresh; semantic failure and 409 stale recovery retain a
  retryable draft.
- Added `test/front/public/js/explicit_apply.static.test.js` for one local Vue
  root/load ordering, local API route, snapshot-free payload, 150 ms setting
  debounce, active-output ownership and no CDN.

## Exact verification

Focused frontend execution (before the static product assertion):

```text
node test/front/run_front_tests.js
ok - public/js/explicit_apply.behavior.test.js
```

The initial static contract correctly found client-side Time normalization.
Frontend removed that product defect and the obsolete `app.static` expectation
was migrated to the same backend-payload/no-browser-DSP contract. Final
complete frontend execution passed:

```text
node test/front/run_front_tests.js
ok - public/js/app.behavior.test.js
ok - public/js/app.static.test.js
ok - public/js/design_v2.static.test.js
ok - public/js/explicit_apply.behavior.test.js
ok - public/js/explicit_apply.static.test.js
ok - public/js/layouts.behavior.test.js
ok - public/js/layouts.static.test.js
ok - public/js/overlay.static.test.js
ok - public/js/page_minimum_checkmark.static.test.js
ok - public/js/settings.behavior.test.js
ok - public/js/settings.static.test.js
ok - public/js/settings_debounce.behavior.test.js
ok - public/js/settings_debounce.static.test.js
ok - public/js/settings_select_width.static.test.js
ok - public/js/state_lite_active_output.static.test.js
front tests: 15 file(s) passed
```

V8 coverage command and result:

```text
NODE_V8_COVERAGE=<mktemp> node test/front/run_front_tests.js
node architecture/skills/tester/frontend-static-behavior-testing/reference/v8-coverage-summary.js <mktemp>
scripts=4 functions=666 covered_functions=456 function_coverage=68.47%
```

The default `julia` launcher cannot start because it cannot create its lockfile.
The direct Julia 1.11 fallback begins precompilation but exits before the test
runner with dependency precompile failures (`OpenSSL_jll`, `HTTP`, `JSON`, and
their prerequisites); it produces no backend test summary. Therefore the
required backend command still has no valid exact result:

```text
julia --project=. test/back/runtests.jl
Julia launcher failed to load a configuration file: could not create lockfile
(Operation not permitted).
```

The isolated-depot fallback also failed before Julia started because the
restricted network prevented Juliaup from resolving its release channel. No
application was started and no runtime/localhost evidence was used.

### Follow-up: direct Julia 1.12.6 binary

The existing direct binary did run the required backend command without a
launcher, dependency, environment, or application change:

```text
/Users/makar/.julia/juliaup/julia-1.12.6+0.x64.apple.darwin14/bin/julia --startup-file=no --project=. test/back/runtests.jl
Test Summary:           | Pass  Total  Time
example_project backend |    3      3  1.2s
Test Summary:                                      | Pass  Total   Time
TASK-0065 lite metadata and legacy state contracts |   15     15  11.5s
```

This is successful execution evidence for the direct binary. The captured
output does not contain a complete-suite aggregate/count, so it is not used to
claim complete backend coverage or completion of TASK-0083.

After the Time-component migration, the same direct command was rerun. Its
captured progress again reached the first two passing summaries (`3/3` and
`15/15`) without a complete aggregate in the captured output; no later failure
can be claimed from this local capture.

## Gaps and next action

Frontend regression is now green. Restore a usable Julia environment (or have
an environment owner provide it) and run
`julia --project=. test/back/runtests.jl`, followed by the requested coverage
run. `TASK-0083` must remain `in_progress`: exact complete backend results and
coverage are unavailable.

Latest direct Julia 1.12 regression invocation again emitted
`example_project backend | 3 / 3` before this terminal capture closed without
an exit code or suite aggregate. It is recorded as inconclusive progress, not
a pass or failure.

Persistent-process attempt: `pgrep` is unavailable in this sandbox
(`sysmond service not found`). A detached direct-Julia invocation returned PID
13523 but produced no log output and was no longer observable by the next
sandbox shell; that shell's `wait` correctly returned 127 because the PID was
not its child. This is not a test-suite exit code and is not reported as one.

## Exact persistent-PTY backend result

The direct Julia 1.12.6 suite was subsequently run in one persistent PTY and
polled through that same session. It exited **1**. Every preceding testset
passed, including `TASK-0083 explicit Apply is snapshot-free, lazy and atomic`
**17/17** and `TASK-0083 Time complex components and MATLAB min-max leave raw
values intact` **5/5**. The first remaining failing set is:

```text
Cascade 7 Time Limits ROI publication, Peaks and lifecycle
25 passed, 5 failed, 2 errored, 32 total
```

The failures are confined to the still-in-progress migration of that legacy
ROI scenario: it assumes zero Peak-provider calls from a later snapshot,
instant ready data from active output, and an unchanged cache after a provider
failure. The observed new contracts differ at lines 1576, 1579, 1585–1586 and
1625–1629 of `signal_analyser_service_test.jl`. No conclusion of a full
backend pass is made.

After HND-0432, a same-session direct run again exited **1**. It progressed
through `Signal Analyser snapshot and cache` **121/121**; the next first set,
`Signal Analyser Peaks use an injected provider over full raw samples`, showed
**13 passed, 1 failed, 1 errored**. The assertions had retained the obsolete
pre-materialization revision `1`; active output correctly advanced it to `2`.
The following view mutation also used stale revision `1`. Both Tester fixture
revisions were corrected to the authoritative cached revision; product code
was not changed. Cascade 7 awaits this predecessor passing before it can run.

The next persistent-PTY full run again exited **1**, but the preceding injected
provider set then passed **17/17**. Its next first failure is the legacy
`Signal Analyser Peaks provider failures and display scope are atomic` set:
**0 passed, 3 failed, 1 errored**. It still expects toggling Peaks to invoke a
provider and roll state back. HND-0432 defines the opposite accepted contract:
the passive toggle publishes enabled/cache-only state and advances the
revision; failure belongs to active-output materialization. The migration is
pending; no product failure is claimed.

Backend HND-0432 subsequently fixed the confirmed typed-empty Peaks cache
reconstruction. Its focused `Signal Analyser Peaks provider failures and
display scope are atomic` evidence is **31/31**: passive enable/view makes zero
calls, active output makes one, and following passive empty-items read makes
zero additional calls. The next known legacy migration is Cascade 5 passive
provider call-count expectations; no product-code edit was made by Tester.
