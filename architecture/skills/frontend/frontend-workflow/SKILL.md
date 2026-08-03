---
name: frontend-workflow
---
# Workflow Frontend

## 1. Task analysis

Примени `task-analysis`: определи UI scope, проанализируй существующие и
изменённые API contracts. Если Frontend не получает нужные данные, отправь
Backender `task` handoff на расширение API и дождись достаточного контракта для
зависимой реализации.

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
`description`:

1. Tester — изменённое UI-поведение, controls/actions, используемые API
   contracts и stable selectors;
2. Orchestrator — реализованный scope, ключевые frontend-решения и нерешённые
   вопросы.
