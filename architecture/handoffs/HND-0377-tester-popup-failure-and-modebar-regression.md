---
id: HND-0377
type: task
from: orchestrator
to: tester
title: Test direct workspace dialog failure lifecycle and modebar removal
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Update the stale assertion that treated workspace-dialog Escape as inert. The
  accepted requirement is: Signals + directly opens the main blocking dialog;
  on a catalog 502 it exits loading, shows retry, keeps focus inside; Escape
  closes and restores focus to Signals +. Nested dirty confirmation remains the
  newer Escape owner when present. Add regression coverage proving obsolete
  signals-add-workspace-action is not used as active trigger/restore ownership.
  Also prove both Plotly render paths remove generated .modebar and
  .modebar-container after react while preserving plot readiness. Run full
  frontend corpus.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - Direct +, 502 retry/focus and Escape restoration pass.
  - Nested confirmation priority remains covered.
  - Both Plotly paths remove modebar DOM and remain ready.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
