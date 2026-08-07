---
id: HND-0256
type: report
from: tester
to: orchestrator
title: Updated active-only regressions expose Backend defect
task_section: ../tasks/TASK-0068-update-layout-active-only-regressions.md#verification-and-results
description: |
  Updated test/back/lib/multilayout_integration_test.jl and pane_outputs_test.jl
  encode 1..10/100 metadata, active-only outputs, zero inactive provider calls
  and exact session round-trip. Multilayout passes 1760/1760. Pane outputs
  passes 83 and fails 11 of 94; full runner reaches 1813 passes and 5 failures
  before stopping. Actual snapshots invoke Spectrum/Spectrogram providers for
  inactive panes (e.g. counters 2/1/0 before selecting Spectrum), and a failing
  active Spectrogram throws ArgumentError instead of typed failed output. No
  product code was changed; syntax and diff checks pass. Coverage is deferred
  until product fix.
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
skipped_requested_skills: []
---
