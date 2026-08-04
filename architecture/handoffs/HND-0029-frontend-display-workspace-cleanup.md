---
id: HND-0029
type: task
from: orchestrator
to: frontend
title: TASK-0027 — очистить Display workspace, inspector, Settings и вкладки
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#scope
description: >
  Выполни TASK-0027 только в public/**. Pulse Waveform Analyser является
  визуальным/interaction эталоном: сверяй плотность таблиц, Settings form,
  tab overflow и drag-reorder с /Users/makar/work/Genie_Tests/pulse_waveform_analyser,
  но используй утверждённые Engee styles и локальные assets, не копируй CSS
  reference images. Обязательны: удаление перечисленных лишних controls/status,
  корректный Engee mark/`Engee`, крайний правый action column, eye + adjacent
  overflow column menu, выше table zone, отсутствие settings overlaps,
  горизонтальный scroll и accessible reorder Display tabs. Не реализуй
  multi-layout panes — он ждёт TASK-0029 backend contract. Не меняй backend,
  tests или architecture; не откатывай чужие изменения.
acceptance_criteria:
  - Выполнены acceptance criteria TASK-0027 и сохранены stable selectors/a11y.
  - Проверены reference desktop viewport и narrow responsive viewport без overlap.
  - Полный frontend suite проходит; report перечисляет визуальные states для E2E.
---
