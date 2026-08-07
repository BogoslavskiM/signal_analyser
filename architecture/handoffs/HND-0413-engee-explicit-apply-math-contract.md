---
id: HND-0413
type: research
from: orchestrator
to: engee_user
title: Establish Engee and MATLAB-compatible math contracts
task_section: ../tasks/TASK-0079-engee-math-contract-audit.md#scope
description: |
  Establish backend-consumable production Engee contracts for every EngeeDSP
  function currently used by time/spectrum/spectrogram/persistence flows. Add or
  refine persistent tests under test/engee, exercise production only, compare
  documented and observed behavior with MATLAB-compatible expectations, and
  localize discrepancies. Do not modify product code or invent fallbacks.
acceptance_criteria:
  - Public module/function/signature/defaults and observed behavior are explicit.
  - Persistent real/complex/edge contract tests have exact execution results.
  - Tolerances and convention differences are evidence-backed.
  - Any bug status follows the confirmed/suspected evidence rules.
requested_skills: [engee-user/engee-user-workflow, engee-user/required-functionality-analysis, engee-user/engee-contract-testing, engee-user/bug-reporting]
---
