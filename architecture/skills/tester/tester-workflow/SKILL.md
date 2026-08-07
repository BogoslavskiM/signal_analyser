# Workflow Tester

## Порядок работы

1. Принять Backend/Frontend report либо test task от Orchestrator. Finding E2E
   приходит только через Orchestrator с явно выделенным unit/API/static scope.
2. Прочитать `requested_skills` и выбрать только применимые subskills:
   - domain/state/helper logic → `tester/backend-unit-testing`;
   - Genie routes/handlers/payloads → `tester/backend-api-testing`;
   - frontend source/state/API coordination →
     `tester/frontend-static-behavior-testing`.
3. Добавить backend unit/API или frontend static/behavior tests. Для
   подтверждённого Engee blocker обязательно проверить явную stub boundary:
   Backend возвращает typed unavailable response без fake result, а видимое
   Frontend action вызывает обычный API и показывает unavailable state. Engee
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
`node test/front/run_front_tests.js`. Эти команды проверяют source/contracts;
они не разрешают запуск `app.jl`, локального Genie server или localhost.

Перед завершением проверь, что focused set и релевантная regression реально
запущены, counts совпадают с логом, environment failure не превращён в pass, а
каждый product defect имеет минимальный reproducing test и owning-role handoff.
Приложение для runtime verification запускается только DevOps в production
Engee через `engee.genie.start`; Tester локально его не запускает.

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
