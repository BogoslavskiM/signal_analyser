---
id: HND-0039
type: research
from: matlab_researcher
to: e2e
title: Принять R-SA-19..26/28 multi-layout UI scenarios
task_section: ../tasks/TASK-0030-multilayout-frontend.md#scope
description: >
  Покрыть как новые product scenarios: R-SA-19 topology 1x1..4x4/max16;
  R-SA-20 popover draft/Apply/Cancel/Escape/focus; R-SA-21 stable pane
  identity/active fallback/preserve-drop; R-SA-22 per-pane type isolation;
  R-SA-23 active-pane signal bindings и checkbox projection; R-SA-24 tab
  overflow/reorder mouse+keyboard с active preservation; R-SA-25 column
  visibility/protected identity/actions geometry; R-SA-26 Settings non-overlap
  geometry; R-SA-28 loading/error/conflict/empty recovery. Canonical MATLAB
  catalog не содержит target multi-layout artifact. MATLAB-specific 8x8
  immediate grid picker — comparison evidence, не oracle для целевого
  Apply/Cancel/per-pane workflow. latest_result: not_run.
acceptance_criteria:
  - Каждая requirement row связана с Playwright scenario либо явным blocker.
  - Все transient states получают semantic, interaction и geometry coverage.
  - MATLAB grid screenshot не используется как целевой CSS/behavior baseline.
---
