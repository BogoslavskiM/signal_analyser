---
name: agent-handoff-plan
version: 0.5.0
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
8. Укажи risks и ожидаемые handoff, если агент найдёт проблему вне своей зоны.

## Guardrails
- Не отдавай одному агенту задачу, которая требует редактировать чужой ownership.
- Handoff должен говорить о поведении и контрактах, не только о путях.
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
  системному пути и одновременно уведомляет Architect.

## Reference
Шаблон:

```text
owner:
goal:
scope:
files_or_folders:
contracts:
out_of_scope:
acceptance:
verification:
risks:
```
