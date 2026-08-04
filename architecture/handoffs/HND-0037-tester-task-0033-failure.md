---
id: HND-0037
type: report
from: tester
to: orchestrator
title: Strict UI cleanup regression failed: obsolete DOM nodes were hidden only
task_section: ../tasks/TASK-0033-test-ui-cleanup.md#acceptance-criteria
description: >
  Static assertions for branding, column visibility/a11y, right action column,
  tab overflow, table height and Settings geometry passed before failure. The
  strict removal assertion failed: open-window-action,
  signals-add-selection-action, signals-copy-action, signals-delete-action,
  display-count-status and active-display-status still exist hidden in
  public/index.html; app.js writes the two status nodes. Full frontend runner
  stopped after app.static, 1/4 files passed. Persistent tab reorder remains
  unaccepted pending TASK-0032.
---
