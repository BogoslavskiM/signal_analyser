---
name: app-creation-workflow
---
# App Creation Capability Router

## When to Use
- Нужно создать Genie-приложение или крупный новый экран группой агентов.
- Нужно сопоставить blueprint выбранным product capabilities и skills.
- Нужно разделить cross-role contracts до реализации.

## When NOT to Use
- Уже есть готовый handoff, ограниченный одной ownership-зоной.
- Нужно реализовать локальную функцию, UI-элемент или тест.

## Core Contract

1. До начала каскада передай DevOps подготовку через
   `devops/task-branch-lifecycle`. Блокируют только изменения, существовавшие до
   задачи либо не имеющие owner/task attribution.
2. Зафиксируй цель, пользовательские workflow и acceptance.
3. Прими blueprint: экраны, product capabilities, технологический, visual и
   API profiles, calculation mode и нужные роли.
4. Составь capability map:

```text
product_capability:
skill_ids:
owner:
contracts:
enabled_optional_capabilities:
tests:
```

5. Не подключай skill только потому, что он существует в каталоге. В
   универсальной архитектуре нет обязательных toolbar, inspector, graphs,
   dialogs, import/export, session или calculation capabilities.
6. Для составного skill перечисли `enabled_optional_capabilities`.
7. Передай независимые задачи role owners через `agent-handoff-plan` и веди
   rolling queue.

## Optional Capability Routing

- MATLAB reference research → `matlab-researcher/matlab-clicker-research-loop`.
- Frontend structure/layout/zones → `frontend/frontend-project-structure`,
  `frontend/layout-geometry`, `frontend/zone-composition`.
- Toolbar/settings/inspector/pages/graphs → соответствующий frontend skill.
- Dialog/file browser/session/object export → только явно выбранные dialog и
  delivery skills.
- Backend state/API/calculations → `backend/state-model`,
  `backend/api-contract-planning`, `backend/calculation-planning`.
- Worker queue → `backend/apply-calculation-flow` с явно включённой
  `calculation.worker-queue`.
- Output loading/style → `frontend/output-loading-flow`,
  `frontend/style-system`.

Список является router map, а не обязательной последовательностью сборки.

## Integration Workflow

1. Передай Tester только contracts выбранных skills и optional capabilities.
2. Если E2E нужен и scaffold отсутствует, подключи
   `e2e-tester/playwright-test-scaffold`.
3. Объяви project capability flags и включи только доступные на проверяемом
   target.
4. Доведи одну coherent feature или целую вкладку до product-complete и
   ordinary Tester regression. Не открывай E2E milestone после каждой кнопки,
   поля или промежуточного состояния меню.
5. Получи stable `data-testid` и полный `interaction_design_review` каждого
   menu item/button завершённой feature, затем передай единый user workflow
   через `e2e-tester/devhub-playwright-scenario`.
6. Выполни предварительный integration review и continuous documentation.
7. После готового handoff DevOps может commit/push только явно перечисленные
   завершённые файлы. Dirty paths активных ролей допустимы при известном
   owner/task и не попадают в staged set.
8. Deployment запрашивай отдельно только для обновления target после product
   changes.
9. Выполни feature-level E2E, затем финальный integration review и отчёт.
   Отчёт не является принятием.
10. Optimization/performance-only задачи выполняй после функциональных
    features и regression, если measured blocker не изменил приоритет.
11. Только после явного принятия пользователем передай DevOps merge handoff.

## Guardrails
- Architect не реализует детали чужой ownership-зоны.
- Skill availability не создаёт product requirement.
- Другой frontend stack, visual profile или нестандартная API status policy
  требуют прямого решения пользователя и ADR.
- Параллельные изменения допустимы только при owner/task attribution.
- DevOps не добавляет в commit незавершённые или непереданные файлы.
- E2E не требует deployment и использует доступный target/current tab.
- Merge разрешён только после явного принятия пользователя.

## Reference
- `architect/agent-handoff-plan`
- `architect/integration-review`
- `architect/task-documentation`
- `devops/task-branch-lifecycle`
- `devops/engee-environment-deployment`
- `devops/merge-accepted-task`
