---
id: HND-0180
type: task
from: orchestrator
to: e2e
title: Validate Inspector and session export/import workflow
task_section: ../tasks/TASK-0023-e2e-session-and-inspector.md#scope
description: |
  Run full browser E2E on exact production SHA
  17482dc4aef3d86e79815a36ae950045f74fd142 at the confirmed Signal Analyzer URL.
  Verify Inspector Info presentation and row actions, session export download
  File/Blob lifecycle and JSON document content, valid import with server-
  authoritative reload, invalid/malformed import and user-visible recovery,
  stale/conflict behavior where reachable, and multi-layout state round-trip.
  Capture exact baseline before mutation and restore session/layout hashes at end.
  Production only; no repository/Git/dependency/deploy mutation.
acceptance_criteria:
  - Functional, file/blob, negative/recovery, reload and restoration totals are separate.
  - Exported JSON and imported authoritative state are validated, not only UI text.
  - Browser closes and final session/layout hashes exactly match baseline.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---
