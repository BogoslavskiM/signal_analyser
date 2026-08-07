---
id: HND-0423
type: implementation_report
from: backender
to: orchestrator
title: Explicit Apply backend calculation flow implemented
task_section: ../tasks/TASK-0081-backend-explicit-apply-calculation.md#scope
applied_skills: [backender/backender-workflow, backender/backend-design, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
skipped_requested_skills: []
changed_files: [../../app/routes.jl, ../../lib/services/signal_settings_service.jl, ../../lib/services/signal_analyser_service.jl]
evidence_status: focused_pass_full_suite_test_contract_incompatible
result: accepted_with_tester_owned_expectation_update
description: |
  Calculation fields now use typed per-state/per-display drafts separated from
  published Display settings. POST /api/settings stores a draft without output
  invalidation or provider work. POST /api/settings/apply accepts exactly
  {state_revision,display_id}, logically cancels stale work before atomic
  validation, preserves draft and last-good cache on HTTP-200 semantic failure,
  or publishes once and invalidates only the active pane without eager DSP.
  Stale requests retain the typed 409 envelope. Grouped calculation snapshots
  were removed from /api/view so the Apply boundary cannot be bypassed.

  Every effective-presentation field remains immediate and provider-free by
  rerendering an already-ready active cache with materialize_missing=false;
  calculation revision and need-update flags remain unchanged. Blocked/stored
  fields neither invalidate nor rerender. Complex Time now emits ordered real
  and imaginary traces. Normalize Y uses independent per-trace min-max to 0..1
  with constant traces mapped to zero, while raw measurement and Spectrum input
  values remain unchanged. Unsupported Spectrogram/Persistence ROI is explicit
  and no Engee fallback/provider emulation/dependency edit was introduced.

  Final verification made no further backend edits. Julia syntax parse passed
  for all three changed files; `git diff --check` passed. The focused
  draft/Apply/provider/cache/revision probe passed 25/25, and the focused
  immediate-presentation/complex-Time/min-max/raw-input probe passed 15/15.
  The probes proved zero Spectrum/Spectrogram/Persistence calls during draft,
  invalid/successful Apply and immediate Time rerender; snapshot-free Apply;
  invalid-draft preservation of last-ready cache and dirty/calculation
  revisions; one successful active-page revision with inactive page revisions
  unchanged; deterministic stale rejection; ordered real/imaginary traces; and
  independent 0..1 min-max without raw signal or Spectrum-cache mutation.

  `julia --project=. test/back/runtests.jl` is not yet a complete pass. It exits
  at the first obsolete Tester-owned assertion in
  `test/back/lib/multilayout_integration_test.jl:35`, which expects one complex
  Time trace instead of the accepted real/imag pair. Isolated legacy files also
  locate the same trace-cardinality assumption at
  `test/back/lib/pane_outputs_test.jl:84`; settings snapshots still sent via
  `/api/view` at `test/back/lib/signal_analyser_service_test.jl:27` and
  `test/back/app/signal_analyser_api_test.jl:235`; the former heavy field-update
  response expectation at `test/back/lib/signal_settings_service_test.jl:38-41`;
  and its former validation-exception expectation for malformed API types at
  line 61. These are early-stop locations rather than an exhaustive downstream
  failure count. TASK-0083 must migrate those Tester-owned contracts and rerun
  the complete corpus. Until that exact pass exists, TASK-0081 remains
  `in_progress` and dependent tasks must not be unblocked solely by this report.
frontend_contract: |
  POST /api/settings keeps exact {state_revision,display_id,field_id,value} and
  returns {state,settings}. Calculation fields affect only the typed draft.
  POST /api/settings/apply accepts exact {state_revision,display_id}; success is
  {success:true,state_revision}, semantic failure is
  {success:false,state_revision,error}, stale is the existing HTTP 409 envelope.
  Apply sends no settings snapshot or output request. GET /api/outputs/active
  remains the sole lazy materializer. Complex Time has component real/imaginary.
tester_contract: |
  Cover exact shapes/types/409; draft zero-provider/cache preservation; invalid
  Apply retention and correction; pristine Apply; active-pane-only calculation
  revision; no eager provider; stale publication; every provider-free
  presentation field; blocked ROI; real/imag ordering; min-max including
  constant zero; raw measurement/Spectrum invariants; draft lifecycle on display
  close and session import. Update the exact legacy locations documented above
  without weakening inspector/layout invariants, then run
  `julia --project=. test/back/runtests.jl` to a complete pass and report exact
  test counts.
acceptance_criteria:
  - Draft update, provider, cache and revision invariants: focused 25/25 passed.
  - Immediate presentation, complex Time and Normalize Y: focused 15/15 passed.
  - Syntax parse and diff whitespace validation: passed.
  - Existing complete backend suite: pending Tester-owned contract migration.
---
