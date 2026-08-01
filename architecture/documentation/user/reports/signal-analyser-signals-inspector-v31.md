# Signals milestone: Add, Copy и Delete

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-037](../decisions/DEC-20260801-037-signal-inventory-actions.md) фиксирует
первый приоритет после review: рабочий Signals inspector с тремя действиями.

- Add открывает выбор «Из рабочей области…» или «Из выбранного диапазона».
- Workspace import использует официальный `engee.genie.recv`, не `eval` и не
  local file browser.
- Range extract создаёт новый сигнал из raw samples current Time Limits.
- Copy создаёт независимую копию выбранного сигнала.
- Delete удаляет сигнал из текущей сессии после подтверждения; последний
  сигнал удалить нельзя.

Visibility checkbox остаётся membership active Display, row click — global
selection. CRUD не применяется optimistic: только полный server snapshot.
Новый сигнал добавляется на active Display и становится его source; inactive
Displays не меняются. Delete согласует все Displays атомарно.

После Backend/Frontend и ordinary tests будет проведён отдельный аналитический
review каждой кнопки/menu item/dialog action. Только затем запускается один
Signals E2E workflow. Настройки графиков, их математическое применение, Jet и
optimization являются последующими milestones.

## Связи

- [DEC-037](../decisions/DEC-20260801-037-signal-inventory-actions.md)
- [Внутренняя assessment](../../agents/reports/signal-inventory-actions-assessment-20260801.md)

## Уточнение 2026-08-01

Этот документ сохраняет состояние до реализации. Ручной ввод имени переменной
заменён решением DEC-039; фактический результат и статус развертывания описаны в
[отчёте о встроенном браузере переменных](signal-analyser-workspace-browser-v32.md).
