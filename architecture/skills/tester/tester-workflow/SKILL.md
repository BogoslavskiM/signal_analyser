---
name: tester-workflow
---
# Workflow Tester

## Порядок работы

1. Принять Backend/Frontend report или E2E handoff.
2. Прочитать `requested_skills` и выбрать только применимые subskills:
   - domain/state/helper logic → `tester/backend-unit-testing`;
   - Genie routes/handlers/payloads → `tester/backend-api-testing`;
   - frontend source/state/API coordination →
     `tester/frontend-static-behavior-testing`.
3. Добавить backend unit/API или frontend static/behavior tests. Engee
   contract testing передать Engee User.
4. Запустить сначала затронутый набор, затем релевантную регрессию.
5. Вернуть `report` handoff с командами, counts, failures, gaps,
   `applied_skills` и причинами для `skipped_requested_skills`.

## Типовая архитектура

```text
test/
  back/
    runtests.jl              # единая точка запуска
    support/                 # context, fixtures, helpers
    app/                     # routes и API
    lib/                     # domain и services
  front/
    run_front_tests.js       # единая точка запуска
    public/js/               # зеркало public/js
      *.static.test.js
      *.behavior.test.js
```

Тесты повторяют структуру product code. Общие setup и fixtures хранить только
в `support/`; сценарные ожидания оставлять в соответствующем test-файле.
`test/engee/**` является отдельной ownership-зоной Engee User.

## Стек

- Backend: Julia, стандартный `Test`, project environment и Genie для API
  boundary.
- Frontend: Node.js CommonJS, встроенные `fs`, `path`, `vm`, project assertions
  и лёгкий runner без browser automation.
- Playwright относится только к E2E.

Основные команды: `julia --project=. test/back/runtests.jl` и
`node test/front/run_front_tests.js`.

## Формат bug report

Один баг оформлять отдельным `report` handoff для Orchestrator:

```text
title: <краткий смысловой заголовок>

description:
  Краткое описание: <что сломано>
  Сценарий воспроизведения:
    1. <шаг>
    2. <шаг>
  Ожидаемое поведение: <что должно произойти>
  Фактическое поведение: <что произошло>
  Дополнительные материалы: <ссылки на скриншоты и файлы, если нужны>
```

Дополнительные материалы необязательны; прикладывать их, когда они помогают
подтвердить или воспроизвести баг.
