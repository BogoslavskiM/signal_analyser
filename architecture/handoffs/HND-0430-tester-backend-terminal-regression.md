---
id: HND-0430
type: report
from: tester
to: orchestrator
title: Backend regression reached terminal legacy-contract failure
task_section: ../tasks/TASK-0083-test-explicit-apply-and-math-contracts.md#scope
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
skipped_requested_skills: []
---

`julia --startup-file=no --project=. test/back/runtests.jl` reached a terminal
exit status `1`; this is not an execution-host interruption.

The following completed before the failure, including the new explicit-Apply
coverage: 3/3 example assertions; 15/15 lite metadata; 9/9 active output;
12/12 stale publication; 81/81 terminalization; 17/17 explicit Apply;
5/5 real/imag and min-max; and all listed multilayout/pane sets through
`Signals inspector mutation rollback protects active Log Spectrum` (12/12).

The remaining failure is Tester-owned obsolete contract setup at
`test/back/lib/signal_analyser_service_test.jl:61`: it passes grouped
`spectrum_settings` and `spectrogram_settings` through `apply_signal_analyser_view!`.
The accepted contract rejects this snapshot with `Некорректный запрос
отображения`. It must be migrated to typed draft field updates followed by
snapshot-free `apply_signal_settings!`, then a view-only request. This is not a
backend product defect. The first equivalent scenario has already been migrated
in the preceding test and passes 12/12.

No product, Engee or dependency file was changed.
