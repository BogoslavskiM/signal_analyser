---
id: HND-0165
type: task
from: orchestrator
to: e2e
title: Complete remaining production regression under runtime monitor
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#scope
description: |
  With DevOps concurrently monitoring exact production SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8, first execute HND-0162 healthy
  bootstrap in three clean contexts, then close remaining bounded gaps from
  HND-0156..0159. Prioritize: API layouts GET/200/409 shape/immutability and exact
  restoration; 1440/1280/1024 document geometry; 4x4 sixteen real plot hosts,
  autonomous pane type/bindings and fixed tab actions. Reuse one captured session
  baseline, restore exact final hash, and report availability separately from
  product assertions. Bounded ten-minute window; no repo/Git/dependency mutation.
acceptance_criteria:
  - HND-0162 gets a separate three-context bootstrap report.
  - API, responsive and 4x4 gaps receive separate planned/pass/fail/not-run totals.
  - Final session state exactly equals baseline and all browsers close.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
required_viewports: [1440x900, 1280x720, 1024x768]
---
