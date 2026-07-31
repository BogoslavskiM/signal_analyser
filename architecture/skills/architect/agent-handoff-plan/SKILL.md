---
name: agent-handoff-plan
version: 0.6.0
---
# Agent Handoff Plan

## When to Use
- Нужно передать задачу конкретному role-owned агенту.
- Нужно разделить одну большую задачу на backend/frontend/tester/e2e/devops/MATLAB research части.
- Нужно зафиксировать contracts, acceptance и verification до реализации.

## When NOT to Use
- Агент уже получил конкретный scope и работает только в своей зоне.
- Нужна общая архитектурная память без немедленного handoff.

## Workflow
1. Определи owner: backend, frontend, tester, e2e-tester, devops или
   matlab-researcher.
2. Сформулируй goal как проверяемый результат, а не список файлов.
3. Укажи scope: какие поведения, контракты и файлы можно менять.
4. Укажи out_of_scope: что агент не должен чинить или проектировать.
5. Опиши contracts: payloads, state fields, UI actions, tests или scenario evidence.
6. Опиши acceptance: что должно быть истинно после выполнения.
7. Укажи verification commands для роли.
8. Потребуй итоговый структурированный handoff с полями `goal`, `scope`,
   `contracts`, `changes`, `verification`, `risks`, `follow-ups`.
9. Укажи risks и ожидаемые follow-up, если агент найдёт проблему вне своей
   зоны.
10. Architect сохраняет постановку и каждый материальный результат в
    `architecture/documentation/handoff/` и синхронизирует active task,
    durable report и backlog по `architect/task-documentation`.

## Guardrails
- Не отдавай одному агенту задачу, которая требует редактировать чужой ownership.
- Handoff должен говорить о поведении и контрактах, не только о путях.
- Рабочие роли не получают shared write access к architecture documentation;
  они обязаны вернуть структурированный handoff Architect, который один
  сохраняет durable record.
- Backend handoff должен называть state/mutations/routes/tests.
- Frontend handoff должен называть zones/elements/payload fields, typed controls,
  stable `data-testid`, interactions и style constraints.
- Tester handoff должен называть contract surfaces, stable field ids, queue/revision behavior и evidence.
- E2E handoff должен описывать enabled frontend skill ids, пользовательский
  сценарий, stable `data-testid`, target application context и наблюдаемый UI
  результат.
- DevOps handoff перед commit/deployment должен содержать краткое объяснение,
  явный список файлов и локальный verification context.
- Merge handoff DevOps допустим только от Architect после явного принятия
  задачи пользователем.
- MATLAB Researcher получает от Architect имя MATLAB-приложения и цель
  исследования. Каждый сохранённый сценарий он передаёт E2E напрямую по
  системному пути и одновременно уведомляет Architect; Architect зеркалирует
  material handoff в durable documentation.
- MATLAB research handoff всегда содержит `docs_sources`,
  `documented_direction`, `clicker_setup`, `observed_undocumented_behavior`,
  `docs_vs_app_delta`, `product_tasks`, `e2e_scenarios`. Official MathWorks
  docs исследуются обычным internet research вне MATLAB и задают research map;
  clicker дополняет её фактическим undocumented поведением. MATLAB Add-On
  Explorer запрещён, а clicker ограничен workspace/Command Window и Signal
  Analyzer app.
- MATLAB `clicker_setup` подтверждает keyboard precondition: English/ASCII до
  каждого text/code/name/path input, визуальная проверка до Enter, возврат в
  English после русского UI-ввода и полная очистка с повторным набором при
  повреждённой раскладке.
- MATLAB `clicker_setup` фиксирует нативные mouse actions: double-click — stable
  center и два быстрых LMB clicks в system interval без movement;
  drag-and-drop — `mouseDown`, move, pause, `mouseUp`. После каждого нужна
  visual verification; click-click substitutes запрещены.

## Reference
Шаблон:

```text
owner:
goal:
scope:
contracts:
changes:
verification:
risks:
follow-ups:
files_or_folders:
out_of_scope:
acceptance:
```
