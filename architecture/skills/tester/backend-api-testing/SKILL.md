# Backend API Testing

## When to Use
- Нужно проверить Genie route registration и фактическое поведение backend
  API handlers.
- Изменился request/response/state contract endpoint.

## When NOT to Use
- Проверяется чистая domain-функция без API mapping.
- Нужен browser/HTTP E2E-сценарий.
- Проверяется Engee function contract.

## Bundled Templates
Используй:

- `reference/api-test-template.jl` — route и handler testsets;
- `reference/report-template.md` — endpoint/ТЗ/coverage report.

## Current Project Pattern
Сохраняй структуру:

```text
test/back/app/
  routes_test.jl
  api_test.jl
```

- Не поднимай отдельный Genie server в backend API suite.
- Проверяй route registration статическим разбором `app/routes.jl`, как в
  текущем проекте.
- Проверяй фактическое поведение через прямой вызов именованного API
  helper/handler из `app/api.jl`.
- Если business logic находится только внутри анонимной route closure и её
  нельзя вызвать напрямую, оформи backend handoff на выделение именованного
  handler. Не копируй closure в тест.

## Route Registration
- Собери полный ordered список `(path, method)`.
- Сравнивай его с явным expected list без snapshot-файла.
- Проверяй отсутствие удалённых/запрещённых routes.
- Для critical route допускай static assertion, что closure делегирует
  согласованному handler.
- Static source check не заменяет direct behavior test handler.

## Handler Contract
Для каждого endpoint проверь:

- HTTP method;
- обязательные и необязательные request fields;
- API types и нормализацию input;
- HTTP status;
- обязательные response fields и их типы;
- полный согласованный payload field-by-field;
- domain/view state mutation;
- отсутствие частичной mutation при error;
- вызов соответствующего backend helper.

Не используй большие serialized snapshots. Для nested payload создавай явные
typed assertions и небольшие reusable assertion helpers в `test/back/support`.

## Required Cases
- normal request;
- boundary values;
- отсутствующее обязательное поле;
- semantic validation error;
- неверный JSON/API type;
- unexpected handler error;
- regression cases подтверждённых API bugs.

Для endpoint с подтверждённым Engee blocker отдельно проверь:

- request проходит через ту же production ручку, а не через test-only route;
- response имеет согласованный status и типизированные поля `success=false`,
  стабильный unavailable code, короткий error и `blocker_ref`;
- payload не содержит output/result, который можно принять за успешный расчёт;
- state не получает фиктивный ready/result и не остаётся в busy;
- соседний реальный Engee call и recovery marker существуют как source
  contract. Исполнение самого Engee call принадлежит `test/engee/**`, а не
  Backend API suite.

Закрепляй согласованную семантику:

- validation error: HTTP 200 и contract-specific `success=false`/field errors;
- programmer error из-за неверного API type: HTTP 500;
- frontend получает короткий error text, полная диагностика остаётся backend.

## State Isolation
- Свежий state не обязателен для каждого отдельного assertion.
- Связанный API workflow может использовать один явно созданный local state,
  если шаги проверяют последовательные mutations.
- Независимые сценарии и testsets не должны зависеть от скрытого global state
  или порядка выполнения файлов.
- Перед повторным сценарием явно восстанови согласованное начальное состояние.

## Apply and Output APIs
- Проверь, что Apply сначала инвалидирует старую revision/queue, затем
  валидирует settings.
- Apply не выполняет calculation и не возвращает output data/`isready`.
- Success Apply возвращает HTTP 200, `success=true`, monotonic
  `state_revision`; invalid settings — HTTP 200, `success=false`, revision и
  короткий `error`.
- Проверь `/api/state-lite`: form/navigation/capabilities присутствуют, graph
  arrays отсутствуют, `state_revision` присутствует.
- Проверь `need_update_pages` всех затронутых зон и отсутствие eager worker
  queue/calculation после Apply.
- Первый data request current active stale page запускает ровно одну task и
  возвращает lightweight typed pending без large graph arrays; duplicate
  polling не создаёт вторую task.
- Inactive page request не запускает calculation. При page switch старая task
  отменяется/не публикуется, а новая active page получает приоритет.
- Для каждой output route проверь typed `data`, `isready`, `success`, `error`,
  `state_revision`, cache hit/miss, pending, success и calculation error.
- Проверь, что медленный response имеет меньшую revision и не может считаться
  актуальным client snapshot; publication stale `calculation_revision`
  отклоняется backend.

## Files and Sessions
- Используй временную директорию с cleanup.
- Проверяй path normalization, root traversal, extension и explicit overwrite.
- Проверяй atomic session import/export и отсутствие partial state/file.
- Проверяй `__genie_app_name`, replace/merge и восстановление output statuses.

## Coverage
- Минимальный процент coverage не устанавливается.
- В отчёте укажи фактический API line coverage.
- Веди endpoint matrix: route → registration test → handler cases → пункт ТЗ.
- Для built-in Julia coverage используй helper из
  `tester/backend-unit-testing`.

## Ownership and Rerun
- Tester изменяет только `test/back/**`.
- Не исправляй route, handler или product state.
- При product failure передай backend owner route, request, expected contract,
  actual response/state и reproducing test.
- После исправления test code повтори релевантный файл, затем весь backend
  suite.
- После исправления product code повторяй тесты по запросу владельца изменения.

## Verification
- Запусти `julia --project=. test/back/runtests.jl`.
- Не запускай `app.jl` или отдельный/local Genie server и не используй
  localhost как runtime evidence.
- Проверь полный route list и все endpoint matrix rows.
- Проверь active-only CPU/network contract через task/cache counters и payload
  shape, а не через timing-only assertion.
- Заполни `reference/report-template.md`.
