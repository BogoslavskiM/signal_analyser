---
id: HND-0025
type: research
from: orchestrator
to: matlab_researcher
title: Расширить background lane сценариями multi-layout и UI cleanup
task_section: ../tasks/TASK-0014-engee-signal-analyser-ui-parity.md#user-ts-зоны-и-наблюдаемые-элементы
description: >
  background_research: true. Продолжи существующий single-writer lane HND-0023,
  не создавая вторую MATLAB GUI session. Добавь независимые requirements по
  layout 1x1..4x4, topology variants, Apply/Cancel draft, active pane,
  per-pane type и signal-checkbox bindings, Display tab overflow/reorder,
  column visibility, Settings form geometry и session round-trip. Проверь
  canonical clicker catalog и явно отметь отсутствующие reference artifacts;
  текущую product development не блокировать.
acceptance_criteria:
  - Coverage matrix расширена новыми requirement IDs и gaps.
  - Existing catalog не выдается за evidence для отсутствующего multi-layout.
  - UI scenarios подготовлены для E2E routing, math/session — для нужного owner.
---
