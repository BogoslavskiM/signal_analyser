---
id: HND-0340
type: report
from: tester
to: orchestrator
title: Lightweight route assertions updated; full runner exposed stale error-envelope expectations
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Tester updated the two requested route-source assertions and passed their
  focused API suite 30/30 plus the complete frontend corpus 8/8. An initial
  sandboxed Julia run misleadingly stopped after the 3-assertion bootstrap;
  Orchestrator reran the exact dependency-independent command with Julia's
  external lock-file access and reached the complete corpus. It exposed three
  additional stale API error-envelope expectations: the accepted lightweight
  mutation response now returns state-lite/current without legacy plot_payload.
  This is a Tester-owned expectation gap; no product defect is established.
acceptance_criteria:
  - Lightweight view/display route source assertions: passed.
  - Frontend live non-static Plotly static/behavior corpus: 8/8 passed.
  - Complete backend corpus: pending three stale error-envelope assertions.
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
---
