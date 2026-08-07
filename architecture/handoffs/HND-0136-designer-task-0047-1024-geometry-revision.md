---
id: HND-0136
type: design_revision
from: orchestrator
to: designer
title: Revise multi-layout 1024 geometry to inherited 42px tab row
task_section: ../tasks/TASK-0047-revise-multilayout-1024-geometry.md#scope
description: |
  TASK-0040 v1 explicitly sets Display tab row 42px at <=1080. TASK-0044 v1
  inherits that base but documents 1024 plot grid 696x357.53, while the accepted
  implementation preserving the 42px row measures 696x363.53. Produce v2 as a
  bounded correction: verify the arithmetic/browser geometry, update DESIGN
  metadata/tables/rules and refresh only affected 1024 evidence if pixels differ.
  Do not redesign behavior or change product/tests/backend/dependencies/Git.
acceptance_criteria:
  - Ready design v2 resolves all 1024 grid/pane dimensions consistently.
  - 1440/1280 and interaction/state contracts remain unchanged.
  - Exact changed evidence and applied skills are reported.
requested_skills: [designer/visual-system, designer/application-composition, designer/output-and-visualization]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 1
required_viewports: [1024x768]
---
