---
id: TASK-0040
kind: task
title: Сгенерировать детальный дизайн текущей раскладки Signal Analyzer
status: done
priority: P0
queue_order: 38
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [designer]
parent: null
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: [HND-0094, HND-0102, HND-0103, HND-0121]
blocked_by: []
blocker_reason: null
ui_impact: new_or_changed
design_mode: autonomous
design_ref: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---

# Сгенерировать детальный дизайн текущей раскладки Signal Analyzer

## User value

Текущая компоновка приложения получает достаточно точный и проверяемый
дизайн-контракт, по которому Frontend сможет реализовать единые размеры,
выравнивание элементов и поведение overlays без визуальных догадок.

## Source evidence

Прямой запрос пользователя: сохранить текущую раскладку и детализировать
размеры строк, положение полей ввода и всплывающие окна. Задача дополняет
существующие требования TASK-0014/TASK-0036, но создаёт отдельный versioned
design package и не начинает frontend implementation.

## Scope

Designer должен на основе текущего приложения создать один versioned package
`architecture/design/TASK-0040-detailed-current-layout/` со следующей
детализацией:

- геометрия основных зон текущей раскладки, их gaps, padding, boundaries,
  resize и overflow rules;
- точные высоты строк, header rows и tab rows, vertical rhythm и alignment;
- размеры, min/max widths и положение labels, text/number inputs, selects,
  checkboxes, icon buttons и связанных validation/status messages;
- alignment и wrapping Settings form, включая длинные labels и
  type-dependent поля;
- геометрия Signals/Inspector table: columns, row actions, Info popover,
  hover/focus behavior и overflow;
- положение, размеры, anchor rules, stacking, viewport collision behavior и
  keyboard/focus states для dropdowns, popovers, menus, dialogs и overlays;
- responsive решения для `1440x900`, `1280x720` и `1024x768` без изменения
  согласованной информационной архитектуры;
- применимые состояния `default`, `hover`, `focus`, `active`, `disabled`,
  `loading`, `empty`, `error`, `warning` и `success`;
- локальный prototype с mock data/state toggles и reference screenshots для
  обязательных viewport/state combinations.

Порядок источников: требования этой task, канонические Designer templates,
corporate Engee Figma, затем автономное решение Designer. Применимые skills:
`designer/visual-system`, `designer/application-composition`,
`designer/data-entry-and-inspection`, `designer/output-and-visualization` и
`designer/dialog-and-file-flows`.

## Out of scope

- Изменения `public/**`, backend, API, tests, Git, runtime или production.
- Добавление новых пользовательских функций и изменение текущей
  информационной архитектуры.
- Реализация frontend до готового и закреплённого design package/version.
- Использование `Project.toml` или `Manifest.toml`.

## Acceptance criteria

- [x] Создан package с `DESIGN.md`, локальным HTML/CSS/JS prototype и
  screenshots; package имеет `design_status: ready` и `design_version`.
- [x] Для каждой основной зоны зафиксированы измеримые размеры, spacing,
  alignment, resize и overflow rules на трёх обязательных viewports.
- [x] Размеры строк и положение labels/inputs/selects/checkboxes описаны без
  неоднозначности, включая validation и длинные значения.
- [x] Для каждого dropdown, menu, popover, dialog и overlay заданы anchor,
  geometry, stacking, collision, focus и dismiss rules.
- [x] Все применимые dynamic states представлены в prototype/evidence либо
  имеют явное `not_applicable` обоснование.
- [x] Designer report перечисляет `applied_skills`, autonomous decisions,
  evidence paths и итоговые `design_ref`/`design_version`.

## Queue decision

- Priority: P0 — пользователь явно потребовал поставить генерацию детального
  дизайна в приоритет; задача должна быть следующей после снятия паузы.
- Queue order: 38; межприоритетный выбор P0 ставит её перед оставшими P1/P2.
- Model/reasoning: `gpt-5.6-sol` / `high` для автономного application design и
  сложной visual composition.
- Eligibility: scope и acceptance полностью определены, dependencies и
  blockers отсутствуют; задача подготовлена, но по текущему указанию
  пользователя не dispatch и остаётся только записью очереди.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| Designer | required | Нужен versioned detailed design package. |
| Frontend implementation | deferred | Отдельная задача после принятия ready design. |
| Backend/Engee/MATLAB | not_applicable | Функциональность и расчётные контракты не меняются. |
| Tests/runtime/E2E | not_applicable | В этой task создаётся только design artifact. |

## Expected handoff result

Designer получает один `design_task` в режиме `autonomous` с обязательными
viewports/states. Orchestrator принимает только полный versioned package и
проверяет его по acceptance criteria до выдачи видимой реализации Frontend.

## Dispatch

- `HND-0094` — Designer design task, запущен после явного снятия паузы
  пользователем 2026-08-04.

## Verification and results

Designer report `HND-0102` принят: package v1 имеет `design_status: ready`,
`DESIGN.md`, local HTML/CSS/JS prototype, local Engee SVG и 44 PNG screenshots
для всех 10 states × 3 viewports плюс overlays/dialogs. Orchestrator полностью
прочитал DESIGN.md, выполнил `node --check`, подтвердил 49 files, 44/44
documented screenshots и соответствие PNG dimensions именам, отсутствие
API/CDN/polling/`data-testid`, а также визуально проверил default 1440/1024,
workspace dialog 1024 и error 1280 evidence. Product/test/runtime/dependency
files Designer не менял. Post-task visual quick regression — `HND-0103`.

E2E report `HND-0121`: 50/50 visual/package checks PASS для 10 states, трёх
viewports, overlays и aggregate overflow gate без page errors. Production
baseline overflow на 1280x720 и 1024x768 зафиксирован как ожидаемая исходная
разница до реализации design v1.
