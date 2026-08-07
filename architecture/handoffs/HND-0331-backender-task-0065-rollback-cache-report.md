---
id: HND-0331
type: report
from: backender
to: orchestrator
title: Inventory rollback cache fixed; active-view rollback remains
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Backender moved legacy inventory and batch full-snapshot preparation onto a
  prospective clone before commit. Focused inventory rollback now passes 11/11
  and state/caches remain unchanged on provider error. A dependency-independent
  full run then reached the Cascade 23 active-view failure: switching cold Time
  to Persistence commits revision/active_plot/cache before the provider error,
  violating atomic rollback. HND-0332 owns the same prepare-before-commit rule
  for apply_signal_analyser_view!.
acceptance_criteria:
  - Inventory/batch rollback last-good preservation: passed.
  - Full backend corpus: failed on three active-view rollback assertions.
  - Dependency-file isolation: passed on this rerun.
applied_skills: [backender/backender-workflow, backender/state-model, backender/apply-calculation-flow, backender/calculation-planning, backender/api-contract-planning]
---
