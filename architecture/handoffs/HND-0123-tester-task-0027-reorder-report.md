---
id: HND-0123
type: report
from: tester
to: orchestrator
title: Persistent Display reorder frontend regression passed
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
description: |
  Deterministic VM coverage now verifies mouse drop and Alt+Arrow exact full
  permutation payloads, pending/no-optimistic guards, authoritative 200 and
  409 behavior, 422/network rollback, moved-tab focus restoration and intent
  serialization. Static coverage pins design-v1 geometry contracts for
  1440/1280/1024 and shared feedback tokens. Syntax/focused/full suite passed;
  full frontend result 4/4 and V8 function coverage 369/501 (73.65%). Tester
  changed only test/front paths. Browser hit-testing, computed geometry and
  native accessibility behavior remain for post-deploy E2E.
---
