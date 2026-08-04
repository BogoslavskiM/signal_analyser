---
id: TASK-0036
kind: task
title: Привести UI-элементы к применимым frontend design-pattern skills
status: backlog
priority: P1
queue_order: null
model: null
reasoning: null
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0035]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Привести UI-элементы к применимым frontend design-pattern skills

## User value

Все элементы Signal Analyzer используют согласованные паттерны интерфейса,
поэтому выглядят и ведут себя единообразно во всех поддерживаемых состояниях.

## Source evidence

Прямой запрос пользователя от 2026-08-04 после добавления конкретных
frontend design-pattern skills в `architecture/skills/frontend/`.

## Scope

Провести element-by-element review и привести реализации к применимым patterns
из `architecture/skills/frontend/`. В handoff Frontend запросить только skills,
которые реально покрывают соответствующую UI-зону:

- `frontend/application-toolbar` — верхняя панель и global actions;
- `frontend/settings-controls` — поля, dropdowns, checkboxes и states настроек;
- `frontend/inspector-ui` — таблицы Signals, selection и row actions;
- `frontend/multi-page-element` — Display и нижние tabs/pages;
- `frontend/graph-output-zone` — plot panes, type menus и overlays;
- `frontend/dialog-system`, `frontend/file-browser-dialog`,
  `frontend/session-import-export-ui`, `frontend/object-export-dialog` — только
  для фактически затронутых dialog/export flows;
- `frontend/zone-composition`, `frontend/zone-structure-api` и
  `frontend/styling` — для связанной структуры зон, поведения и визуальных states.

Зафиксировать в отчётах `applied_skills` и обоснованные
`skipped_requested_skills` по каждому запрошенному pattern.

## Out of scope

- Применение skill, если его trigger не соответствует UI-элементу.
- Изменение backend contracts без отдельной task/handoff.
- Копирование дизайна с внешних screenshots вместо локальных pattern assets.
- Dispatch, реализация, тестирование и deployment в рамках текущего backlog intake.

## Acceptance criteria

- [ ] Для всех поддерживаемых UI-зон составлен inventory элементов и их
  применимых design-pattern skills.
- [ ] Каждый затронутый элемент соответствует structure, states, interaction и
  a11y guidance применимого pattern.
- [ ] Для каждого неиспользованного запрошенного pattern указана причина skip.
- [ ] Существующие stable selectors, согласованные workflows и API semantics не
  нарушены; необходимые изменения переданы Tester и E2E.
- [ ] Frontend и relevant regression suites проходят после реализации.

## Queue decision

- Priority: P1.
- Rationale: прямое требование пользователя устанавливает единый критерий для
  всего текущего UI backlog и должно следовать за консолидацией канонических
  skills.
- Queue order: null; задача остаётся в backlog по прямому указанию пользователя.
- Eligibility: ожидает завершения TASK-0035; после этого требует отдельного
  решения Orchestrator о выдаче Frontend.

## Verification and results

Не начиналась: создана только backlog-запись.
