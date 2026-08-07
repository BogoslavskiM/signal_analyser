---
id: HND-0184
type: task
from: orchestrator
to: tester
title: Verify expanded Inspector row geometry regression
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#verification-and-results
description: |
  Review the exact four-path Inspector disclosure diff. Verify synchronized
  data-info-expanded/aria-expanded/accessible label, expanded-only height and
  clipping release, deterministic collapse while focus remains, no API mutation,
  fixed action targets and table scroll ownership. Tester owns test/front only;
  add assertions solely for a concrete uncovered risk. Run focused/full frontend
  suites and report exact totals plus production E2E gaps. No product/backend/
  design/dependency/Git/deploy/production edits; never inspect Project.toml or
  Manifest.toml.
acceptance_criteria:
  - Old clipped-row behavior is caught by deterministic regression.
  - Expanded/collapsed focus-safe geometry and no-mutation behavior are covered.
  - Full frontend suite passes without Tester product changes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
