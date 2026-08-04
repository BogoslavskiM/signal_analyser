---
name: frontend-workflow
---
# Workflow Frontend

## 1. Task analysis

Примени `task-analysis`: определи UI scope, проанализируй существующие и
изменённые API contracts. Если Frontend не получает нужные данные, отправь
Backender `task` handoff на расширение API и дождись достаточного контракта для
зависимой реализации.

Прочитай `requested_skills` и подключи дополнительные subskills только по
фактическому trigger:

| Trigger | Subskill |
|---|---|
| Создание/разделение frontend modules и каталогов | `frontend/frontend-project-structure` |
| Размещение типовых элементов по готовым zones | `frontend/zone-composition` |
| Верхняя application panel и global actions | `frontend/application-toolbar` |
| Typed scalar settings controls и validation states | `frontend/settings-controls` |
| Object table/list, main object, selection, row actions | `frontend/inspector-ui` |
| Tabs/opened pages/main page | `frontend/multi-page-element` |
| Plotly output page, plots, controls и overlays | `frontend/graph-output-zone` |
| Apply polling, readiness, loading и calculation errors | `frontend/output-loading-flow` |
| Modal lifecycle, busy/error/success и stacking | `frontend/dialog-system` |
| Server-side path/file selection | `frontend/file-browser-dialog` |
| Full session import/export UI | `frontend/session-import-export-ui` |
| Export отдельного domain object | `frontend/object-export-dialog` |

Несколько subskills допустимы, когда один пользовательский workflow реально
пересекает несколько компонентов, например session dialog + file browser +
base dialog. Не подключай component skill только из-за наличия похожего DOM.

## 2. Implementation

Базовый формат Frontend — HTML + JS + CSS. Не требуй отдельный framework или
build system, если они не заданы проектом.

Выполняй подпункты по порядку:

1. `zoning` — возьми ТЗ из handoff Orchestrator или связанной task. Если ТЗ
   отсутствует, запроси его у Orchestrator. Проанализируй приложенную картинку
   или ссылку на неё и зафиксируй зоны; отдельный skill не используется;
2. `zone-structure-api` — структура элементов зон, frontend state, actions и
   подключение к API. Прочитай skill и его JS/HTML patterns;
3. `styling` — визуальная система и состояния элементов. Прочитай skill и его
   CSS/HTML examples.

Для zoning дополнительных правил нет.

## 3. Reports

После implementation отправь два handoff типа `report`; весь отчёт помести в
`description`, реально использованные skills — в `applied_skills`, а
неприменимые явно запрошенные skills с причиной — в
`skipped_requested_skills`:

1. Tester — изменённое UI-поведение, controls/actions, используемые API
   contracts и stable selectors;
2. Orchestrator — реализованный scope, ключевые frontend-решения и нерешённые
   вопросы.
