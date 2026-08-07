---
id: TASK-0027
kind: task
title: Очистить UI и исправить таблицы, tabs, branding и Settings form
status: done
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
related_handoffs: [HND-0029, HND-0035, HND-0036, HND-0037, HND-0038, HND-0114, HND-0118, HND-0119, HND-0123, HND-0124, HND-0125, HND-0126, HND-0130]
blocked_by: []
blocker_reason: null
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
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

- [x] Все перечисленные лишние controls/status элементы удалены без потери
  согласованных session/import/help workflows.
- [x] Column eye/menu скрывает и возвращает каждый optional column; required
  identity/action columns защищены от некорректного состояния.
- [x] Duplicate/delete находятся у правого края и доступны mouse/keyboard.
- [x] Display tabs прокручиваются и меняют порядок; active tab сохраняется.
- [x] Engee SVG и `Engee` отображаются корректно без внешней runtime-зависимости.
- [x] Нижняя зона стала выше, а таблица/settings не перекрываются и не выходят
  за контейнер на desktop/reference viewports.
- [x] Все новые dynamic states имеют stable selectors и переданы Tester/E2E.
- [x] Полный frontend suite проходит.

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

TASK-0032 и TASK-0034 завершены/deployed; blockers сняты. Ready design package
TASK-0040 v1 pin-нут как visual contract. Final Frontend integration выдана
как `HND-0114`.

Frontend report `HND-0118`: persistent reorder API lifecycle и design-v1
geometry реализованы в `public/js/app.js` и трёх CSS files без deviation;
syntax/diff/full frontend suite PASS `4/4`. Exact new lifecycle regression
выдан Tester как `HND-0119`; task остаётся in_progress до report/deploy/E2E.

Tester report `HND-0123`: deterministic reorder lifecycle, rollback,
serialization/focus и design-v1 static contracts покрыты; focused и full suite
PASS `4/4`, V8 function coverage 73.65%. Orchestrator независимо повторил
syntax/diff/full suite — PASS `4/4`. Exact six-path production deploy выдан
DevOps как `HND-0124`; browser geometry/hit-testing остаются post-deploy E2E.

DevOps report `HND-0125`: exact six paths deployed на совпадающий local/private/
production SHA `a6add263120f41aa1ae66497f3effac6bb493cff`; runtime RUNNING,
root/status HTTP 200, все четыре external JS/CSS assets побайтно соответствуют
commit. Task закрыта; единственный post-task new-functionality E2E выдан как
`HND-0126` для real drag/keyboard и design-v1 geometry.

E2E report `HND-0130`: функциональность 9/9 PASS, trusted pointer/keyboard,
authoritative rollback/focus и exact session restoration подтверждены. Visual
16/21 выявил document overflow на 1280×720 и 1024×768; отдельная TASK-0045
выдана тому же активному Frontend lane до следующего deployment.
