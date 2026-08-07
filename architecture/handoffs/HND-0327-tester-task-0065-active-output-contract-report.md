---
id: HND-0327
type: report
from: tester
to: orchestrator
title: Active-output tests added; rollback cache gap and invalid runner usage remain
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Tester added 36 focused state-lite/active-output assertions and modernized
  obsolete eager layout expectations. Focused assertions passed. The full run
  reached 1,953 passes, then legacy rollback verification failed because a
  failed inventory mutation no longer allowed the prior cached full snapshot
  while the deterministic Spectrum provider remained unavailable. HND-0328
  owns preservation of the last-good compatible snapshot/cache. This report is
  not an accepted final gate because Tester used forbidden `--project=.` despite
  the explicit instruction not to read or use dependency files. The files were
  not modified, but HND-0329 must rerun all checks without a project environment.
acceptance_criteria:
  - Focused new assertions: 36/36, provisional only.
  - Full corpus: failed after 1,953 passes with one rollback cache error.
  - Dependency-file isolation: failed by command choice; files unchanged.
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
---
