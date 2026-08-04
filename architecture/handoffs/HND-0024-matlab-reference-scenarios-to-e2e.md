---
id: HND-0024
type: research
from: matlab_researcher
to: e2e
title: Принять критические Signal Analyzer reference scenarios
task_section: ../tasks/TASK-0028-background-matlab-critical-scenarios.md#scope
description: >
  Источник — canonical matlab_clicker catalog
  /Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/.
  Принять SA-UI-001..011 (включая 004A) и UI-часть SA-GRAPH-001..004 как
  research input, а не как passed tests. Ready/high-value: SA-UI-006,
  SA-UI-008..011 и SA-GRAPH-001..003. Сохранить blockers: нет screenshot
  evidence SA-UI-001..004A; неизвестна семантика OK-vs-Close SA-UI-004A;
  re-add не подтверждён в SA-UI-007; complex behavior SA-GRAPH-004 не
  подтверждён; отсутствуют saved reference scenarios для Display add/close,
  session save/import и нового multi-layout. Не превращать blocked evidence в
  assertions. E2E execution остаётся not_run до отдельного regression handoff.
acceptance_criteria:
  - Scenario IDs связаны с будущими Playwright specs либо явными gaps.
  - Blocked reference behavior не выдается за expected product behavior.
  - Runtime/E2E result хранится отдельно от reference catalog coverage.
---
