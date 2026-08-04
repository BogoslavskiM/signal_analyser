---
id: TASK-0027
kind: task
title: Очистить UI и исправить таблицы, tabs, branding и Settings form
status: in_progress
priority: P1
queue_order: 26
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: [HND-0029, HND-0035, HND-0036, HND-0037, HND-0038]
blocked_by: [TASK-0032, TASK-0034]
blocker_reason: "Persistent Display tab reorder needs TASK-0032; HND-0037 requires physical removal of obsolete DOM nodes in TASK-0034."
---

# Переработать размеры таблиц/settings и покрыть dynamic UI

## User value

Таблицы и settings имеют комфортную плотность, предсказуемые размеры и
визуально корректные динамические состояния в Engee style.

## Source evidence

Пользователя не устраивают текущие высоты строк, ширины колонок, размеры и
наложение controls/settings. Требования детализированы сообщением и screenshot
от 2026-08-04; visual targets выбираются в существующей Engee системе.

## Scope

- Убрать `Добавить из выбранного диапазона`, нижнюю status-плашку (`… displays
  ready`), лишнее троеточие после checkbox controls и неподтверждённые
  дублирующие кнопки верхней строки.
- Переместить inline `duplicate`/`delete` в фиксированный крайний правый action
  column; hover/focus не меняют ширины данных.
- Добавить header control видимости столбцов: eye trigger и соседнее `…` menu;
  скрытие/возврат столбца не меняет данные и имеет keyboard/focus states.
- Исправить Engee mark и заголовок `Engee` с заглавной буквы, используя
  одобренный локальный SVG.
- Сделать Display tabs горизонтально scrollable при overflow и reorderable
  drag-and-drop с keyboard-accessible alternative.
- Увеличить вертикальный размер нижней table zone и сохранить responsive
  пределы основной plot/settings зоны.
- Привести Settings к форме с устойчивыми label/control columns, едиными
  height/padding/gap/wrapping; исключить любое наложение controls.
- Зафиксировать selectors и geometry для последующего `e2e/visual-analysis`.

## Out of scope

- Мультилейаут graph panes (TASK-0029/TASK-0030).
- Копирование CSS с reference images.
- Backend, tests, deployment и произвольное удаление действий session/import.

## Acceptance criteria

- [ ] Все перечисленные лишние controls/status элементы удалены без потери
  согласованных session/import/help workflows.
- [ ] Column eye/menu скрывает и возвращает каждый optional column; required
  identity/action columns защищены от некорректного состояния.
- [ ] Duplicate/delete находятся у правого края и доступны mouse/keyboard.
- [ ] Display tabs прокручиваются и меняют порядок; active tab сохраняется.
- [ ] Engee SVG и `Engee` отображаются корректно без внешней runtime-зависимости.
- [ ] Нижняя зона стала выше, а таблица/settings не перекрываются и не выходят
  за контейнер на desktop/reference viewports.
- [ ] Все новые dynamic states имеют stable selectors и переданы Tester/E2E.
- [ ] Полный frontend suite проходит.

## Queue decision

- Priority: P1.
- Rationale: явный следующий пользовательский запрос исправляет наблюдаемые
  дефекты основного рабочего экрана и подготавливает multi-layout.
- Queue order: 26.
- Eligibility: готова к Frontend dispatch после завершения agent-workflow
  правок; не зависит от multi-layout backend.

## Verification and results

Frontend implementation HND-0035: suite 4/4 PASS. Focused regression выполняет
TASK-0033/HND-0036. Единственный remaining blocker — authoritative persistent
tab order TASK-0032; после него Frontend подключит mutation и task получит
post-task E2E.
