---
name: backender-workflow
---
# Workflow Backender

## Основной порядок работы

1. Проанализируй входящий handoff, связанный раздел task, документацию
   приложения и затрагиваемый backend-код.
2. Прочитай `requested_skills` и выбери дополнительные trigger-matched
   subskills по таблице ниже. Не загружай остальные skills.
3. Если не хватает фактов, отправь `research` handoff:
   - поведение MATLAB → MATLAB Researcher;
   - функция или runtime Engee → Engee User.
4. Выполни реализацию по правилам ниже.
5. Для расчёта на библиотеках Engee обязательно получи
   завершённое исследование Engee User с публичной функцией, сигнатурой и
   наблюдаемым поведением. Не реализуй её по предположению и не добавляй
   скрытый fallback.
6. После реализации отправь применимые отчётные handoff по правилам ниже.

Анализ задачи, запрошенная реализация и итоговые handoff обязательны.

| Trigger | Subskill |
|---|---|
| Инициализация backend или новая архитектурная граница | `backender/backend-design` |
| Domain objects, authoritative state, inspector/session state | `backender/state-model` |
| Новый/изменённый route, request или response payload | `backender/api-contract-planning` |
| Derived data, дорогой расчёт, queue/revision/cancellation | `backender/calculation-planning` |
| Apply, dirty flags, readiness или сохранение последнего результата | `backender/apply-calculation-flow` |
| Workspace, Julia script, JLD2 или Engee model export | `backender/object-export` |

`calculation-planning` отвечает за размещение вычислений и при необходимости
за worker/revision/cancellation architecture. `apply-calculation-flow`
отвечает за Apply lifecycle и dirty/readiness semantics. Они используются
вместе только когда задача затрагивает обе границы.

## Реализация

- Следуй принятой backend-архитектуре. Если задача требует обойти её границы
  или добавить новую, верни workflow к анализу архитектуры и при необходимости
  повторно примени `backend-design`; продолжай реализацию после уточнения.
- Стремись к object/domain-oriented модели: typed structures, aggregate root,
  services и методы, сгруппированные вокруг владеющих поведением объектов.
- Сокращай число дублирующих и мелких свободных функций; не дроби одну
  операцию без необходимости.
- Явно задавай конкретные типы полей и ключевых границ. Избегай `Any`,
  нетипизированных globals, абстрактных полей и нестабильных return types,
  чтобы сокращать стоимость инициализации и предкомпиляции.

## Отчёты после реализации

Для каждого применимого отчёта создавай отдельный handoff. Весь отчёт помещай
в `description`, а использованные subskills — в `applied_skills`. Если явно
запрошенный skill неприменим, верни его с причиной в
`skipped_requested_skills`. Если изменений соответствующего вида нет, handoff
можно не отправлять.

1. `FYI` → Tester: затронутые функции и изменения их сигнатур.
2. `FYI` → Frontend: затронутые API-ручки и изменения method, path, request и
   response contract.
3. `report` → Orchestrator: написанная математика, бизнес-логика и принятые
   backend-архитектурные решения — только применимые разделы.
