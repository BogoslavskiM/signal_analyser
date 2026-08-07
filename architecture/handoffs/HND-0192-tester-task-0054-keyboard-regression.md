---
id: HND-0192
type: task
from: orchestrator
to: tester
title: Verify native Inspector keyboard activation regression
task_section: ../tasks/TASK-0054-fix-inspector-keyboard-activation.md#verification-and-results
description: |
  Review exact TASK-0054 four-path diff. Verify native button Enter/Space bypass
  row keydown without preventDefault, dispatch one click per activation, retain
  focus, synchronize row/ARIA/label and make no API mutation. Verify pointer,
  unrelated Info keys and Enter on the row itself remain correct. Tester owns
  test/front only; add assertions only for a concrete uncovered risk. Run focused,
  full and real-browser regression. No product/backend/design/dependency/Git/
  deploy/production edits; never inspect Project.toml or Manifest.toml.
acceptance_criteria:
  - Old erroneous POST/focus-loss is caught deterministically.
  - Pointer/Enter/Space and unrelated shortcut contracts pass without double toggle.
  - Full frontend/browser suites pass without Tester product changes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
