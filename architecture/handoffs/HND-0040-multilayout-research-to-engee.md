---
id: HND-0040
type: research
from: matlab_researcher
to: engee_user
title: Проверить R-SA-21/22/23/27 multi-layout functional compatibility
task_section: ../tasks/TASK-0029-multilayout-state-contract.md#scope
description: >
  При отдельном Engee analysis handoff проверить functional/session aspects:
  R-SA-21 stable pane identity, active fallback и deterministic preserve/drop;
  R-SA-22 per-pane type isolation; R-SA-23 per-pane signal bindings; R-SA-27
  authoritative session round-trip и migration прежнего single-pane document в
  1x1. MATLAB catalog не имеет target artifact; latest_result остаётся not_run
  или blocked до реального comparison. Не выполнять deployment.
acceptance_criteria:
  - Functional evidence отделено от screenshot/UI предположений.
  - Session migration/rollback проверены без потери существующего state.
  - Результат возвращён Orchestrator как analysis/bug evidence, не deploy.
---
