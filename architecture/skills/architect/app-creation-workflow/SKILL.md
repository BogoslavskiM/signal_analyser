---
name: app-creation-workflow
version: 1.5.0
---
# App Creation Workflow

## When to Use
- Нужно создать типовое Genie-приложение или крупный новый экран группой агентов.
- Нужно задать порядок работ от пустого canvas до следующего цикла задач.
- Нужно разделить решения архитектора и реализацию backend/frontend/tester/e2e.

## When NOT to Use
- Нужно реализовать конкретную backend-функцию, frontend-зону или тест.
- Уже есть готовый handoff на роль и агент работает внутри своей зоны владения.

## Workflow
1. До начала изменений передай DevOps подготовку задачи через
   `devops/task-branch-lifecycle`. Если рабочее дерево не чистое, останови
   работу всех агентов до решения пользователя.
2. Зафиксируй цель приложения и главный пользовательский сценарий.
3. Прими blueprint-решения: сколько экранов, какие крупные workflow, какие роли нужны.
4. Если есть близкое MATLAB-приложение, запусти MATLAB Researcher параллельно
   через `matlab-researcher/matlab-clicker-research-loop`. Получай уведомление
   о каждом прямом scenario handoff в E2E, не останавливая остальные роли.
5. Передай frontend создание базовой структуры через `frontend/frontend-project-structure`.
6. Передай frontend выбор геометрии canvas через `frontend/layout-geometry`.
7. Передай frontend композицию зон через `frontend/zone-composition`.
8. Передай frontend обязательную верхнюю панель через
   `frontend/application-toolbar`.
9. Передай backend state model через `backend/state-model`.
10. Передай backend API contracts через `backend/api-contract-planning`.
11. Передай frontend root state и синхронизацию API через `frontend/frontend-state-management`.
12. Передай frontend controls настроек через `frontend/settings-controls`.
13. Передай frontend inspector table/list через `frontend/inspector-ui`.
14. Передай frontend multi-page aggregator через `frontend/multi-page-element`, если он нужен.
15. Передай frontend графические расчётные зоны через `frontend/graph-output-zone`, если нужны графики.
16. Передай frontend общую modal/error/success систему через `frontend/dialog-system`, если приложению нужны dialogs.
17. Передай frontend server-side выбор путей через `frontend/file-browser-dialog`, если import/export использует file browser.
18. Передай frontend обязательный import/export сессии через наследуемый `frontend/session-import-export-ui`.
19. Если приложению нужен экспорт отдельных objects, передай frontend
    `frontend/object-export-dialog`, а backend — только нужные форматы:
    `backend/export-to-workspace`, `backend/export-to-julia-script`,
    `backend/export-to-jld2`, `backend/export-to-engee-model`.
20. Отдельным domain handoff задай формирование экспортируемого значения,
    script description, datasets или model topology. Не помещай предметную
    математику в delivery skills форматов.
21. Передай backend расчёты через `backend/calculation-planning`.
22. Согласуй apply/update contract между backend `backend/apply-calculation-flow` и frontend `frontend/output-loading-flow`.
23. Передай frontend итоговую визуальную унификацию через
    `frontend/style-system`: светлая тема, общие tokens и states, fixed canvas
    без responsive-перестройки.
24. Передай tester требования к unit/API/frontend/Engee contract tests,
    включая проверку формата и предметной математики экспортированного объекта.
25. Если в приложении ещё нет `test/playwright`, передай e2e-tester создание
    инфраструктуры через `e2e-tester/playwright-test-scaffold`. Включи feature
    flags по фактически использованным frontend skills.
26. Получи от frontend handoff со stable `data-testid` и передай e2e-tester
    пользовательские devhub-сценарии через
    `e2e-tester/devhub-playwright-scenario`.
27. Выполни предварительный `architect/integration-review` и зафиксируй итоги
    через `architect/task-documentation`, если решение должно жить дольше чата.
28. Передай DevOps явный список изменённых файлов и краткое объяснение для
    локальных тестов, commit и push. Deployment запрашивай отдельно только
    когда product changes должны обновить целевой экземпляр приложения.
29. E2E Tester запускает тесты против доступного URL или текущей browser tab.
    Создание и запуск тестов не требуют deployment. Reference-сценарии MATLAB
    Researcher передаёт E2E напрямую по мере готовности.
30. Если после E2E появились новые изменения, повтори DevOps handoff на их
    commit и push. Test-only изменения не требуют deployment. Для product
    changes запрашивай deployment только когда нужно обновить приложение.
31. Выполни финальный `architect/integration-review`.
32. Составь итоговый отчёт. Не считай его принятием задачи.
33. Только после явного принятия пользователем передай DevOps явный handoff на
    `devops/merge-accepted-task`.

## Guardrails
- Архитектор принимает cross-role решения, но не пишет детали реализации чужой роли.
- Layout и zone UI-детали принадлежат frontend.
- State, API, Apply, очередь и расчёты принадлежат backend.
- Тестовая стратегия принадлежит tester/e2e-tester, но architect задаёт acceptance.
- E2E tester не выполняет и не требует deployment. Он использует доступное
  приложение; DevOps обновляет его только при product changes.
- DevOps не редактирует product/test/architecture files.
- MATLAB Researcher не редактирует репозиторий, получает актуальные правила с
  matlab_clicker server и передаёт каждый сценарий E2E напрямую.
- Грязное рабочее дерево блокирует начало задачи; Architect передаёт решение
  пользователю.
- Только явное принятие пользователя позволяет Architect запросить squash
  merge в `dev`.
- Любая задача, пересекающая ownership, должна быть разрезана на handoff.

## Reference
- `architect/agent-handoff-plan` — формат передачи задач ролям.
- `architect/integration-review` — финальная проверка cross-role изменений.
- `e2e-tester/playwright-test-scaffold`,
  `e2e-tester/devhub-playwright-scenario` — создание Playwright-инфраструктуры
  и пользовательских devhub-сценариев.
- `devops/task-branch-lifecycle`, `devops/engee-environment-deployment`,
  `devops/merge-accepted-task` — Git-жизненный цикл, deployment и merge
  принятой задачи.
- `matlab-researcher/matlab-clicker-research-loop` — автономное исследование
  MATLAB и поток reference-сценариев для E2E.
- `frontend/frontend-project-structure`, `frontend/style-system`, `frontend/application-toolbar`, `frontend/frontend-state-management`, `frontend/settings-controls`, `frontend/inspector-ui`, `frontend/multi-page-element`, `frontend/graph-output-zone`, `frontend/dialog-system`, `frontend/file-browser-dialog`, `frontend/session-import-export-ui`, `frontend/object-export-dialog` — структура frontend, визуальная система, состояние и типовые UI-элементы.
- `frontend/layout-geometry`, `frontend/zone-composition` — UI-раскладка и зоны.
- `backend/state-model`, `backend/api-contract-planning`, `backend/apply-calculation-flow`, `backend/calculation-planning`, `backend/export-to-workspace`, `backend/export-to-julia-script`, `backend/export-to-jld2`, `backend/export-to-engee-model` — backend-детализация.
