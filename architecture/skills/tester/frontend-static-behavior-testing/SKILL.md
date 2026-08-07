# Frontend Static and Behavior Testing

## When to Use
- Нужно создать или расширить Node tests frontend JS/CSS/HTML без браузера.
- Изменился frontend module, root state, API coordination или static UI
  contract.

## When NOT to Use
- Нужно проверить реальный layout, overlap, rendering или пользовательский
  browser workflow — используй E2E tester.
- Нужно проверить backend/API/Engee contract.

## Bundled Templates
Используй:

- `reference/run_front_tests.js` — текущий dependency-free sorted runner;
- `reference/static-test-template.js` — static JS/CSS/HTML contract;
- `reference/behavior-test-template.js` — VM/Vue/API behavior contract;
- `reference/v8-coverage-summary.js` — dependency-free V8 script/function summary;
- `reference/report-template.md` — frontend skill/ТЗ/coverage report.

## Project Structure

```text
test/front/
  run_front_tests.js
  public/
    js/
      <mirrored path>.test.js
    css/
      <mirrored path>.test.js
    html/
      <mirrored path>.test.js
```

- Зеркаль ownership paths из `public/**`.
- Cross-asset contract размещай у ближайшего общего owner, не дублируй во всех
  каталогах.
- Runner рекурсивно находит `*.test.js`, сортирует paths и выполняет files
  последовательно.
- Используй CommonJS, встроенные `fs/path/vm` и простой assertion callback.
- Не добавляй Jest, Vitest, jsdom или package dependency без отдельного
  обоснования и согласования.

## Static Tests
Проверяй source contracts без browser rendering:

- подключение JS/CSS/HTML и порядок dependencies;
- module registration и ownership;
- stable selectors и `data-testid`;
- обязательные classes/states/ARIA attributes;
- четыре local Roboto TTF, Roboto Medium headings и только используемые SVG с
  сохранённым aspect ratio;
- canonical template colors/menu dimensions и eye/eye-off icons без checkmark
  в column visibility menu;
- отсутствие runtime CDN и имён исходного приложения;
- fixed canvas и отсутствие responsive-перестройки;
- согласованные payload fields;
- отсутствие запрещённых прямых зависимостей между modules.

Static assertion не заменяет behavior test user action/state transition.

## Behavior Tests
- Загружай browser modules через `vm` с минимальными mock `window`, `document`,
  Vue и внешними libraries.
- Создавай VM-like object из `state/data`, `computed`, `methods` и lifecycle.
- Проверяй state transitions, computed values, methods, lifecycle cleanup,
  API payloads и порядок calls.
- API заменяй управляемыми mocks, записывающими calls.
- Для гонок удерживай responses через Promise resolvers и завершай их в явно
  выбранном порядке.
- Обязательно проверяй stale responses, debounce, request queues, validation,
  busy/disabled state и unexpected errors для подключённых contracts.
- Для data-heavy UI проверь exact 150 ms settings debounce, 350 ms noncritical
  UI-state debounce, flush settings перед Apply и отсутствие delay у semantic
  actions.
- Проверь `/api/state-lite` first paint без graph arrays, active-only output
  request/polling, stop polling on deactivation и rejection меньшей
  `state_revision`.
- Для Plotly module проверь lazy local script load, один render in flight,
  latest-only queue, `requestAnimationFrame`, `Plotly.react`, coalesced
  `ResizeObserver` и cleanup. Static contract также проверяет принудительные
  `paper_bgcolor`/`plot_bgcolor` `#ffffff`, modebar background `#ffffff`, grey
  default/active colors и CSS hover/active states; реальный render остаётся E2E.
- Для подтверждённого Engee blocker проверь, что action остаётся в DOM и
  вызывает обычный API, unavailable response снимает busy и показывает
  предусмотренное явное состояние, а fake result/ready state не создаются.

## Async Timing
- Конкретная техника не стандартизируется: допустимы real timers, fake timers
  или controlled promises.
- Выбирай наиболее простой детерминированный вариант.
- Не используй случайные длительные ожидания для маскировки race condition.
- Если проверяется debounce constant, ожидание должно быть связано с этим
  contract и иметь минимальный запас.

## Coverage Scope
- Как минимум создай static/behavior tests для каждого frontend skill,
  фактически подключённого приложением.
- Добавляй app-specific tests для workflow и contracts, которых нет в общих
  skill templates.
- Не создавай tests неиспользуемой capability.
- Веди matrix: frontend skill/ТЗ → source modules → static tests → behavior
  tests → требуемый E2E scope.

## Browser Boundary
Обычный frontend tester не подтверждает:

- геометрию и overlap;
- реальный CSS rendering;
- mouse hit targets;
- Plotly canvas pixels;
- browser navigation/download;
- полный пользовательский workflow.

Возвращай требуемые browser-проверки и stable `data-testid` Orchestrator,
который формирует отдельный E2E handoff.

## Coverage Report
- Минимальный процент coverage не устанавливается.
- Запускай runner с `NODE_V8_COVERAGE=<temp-dir>`.
- Формируй script/function summary через
  `reference/v8-coverage-summary.js`.
- Укажи coverage и skill/ТЗ matrix в `reference/report-template.md`.
- V8 function coverage не заменяет contract assertions и E2E.

## Ownership and Rerun
- Tester изменяет только `test/front/**`.
- Не исправляй `public/**`.
- При product failure передай frontend owner failing test, expected contract,
  actual state/call и source owner.
- После исправления test code повтори релевантный test file, затем весь
  frontend suite.
- После исправления product code повторяй тесты по запросу владельца изменения.

## Verification
- Запусти `node test/front/run_front_tests.js`.
- Не запускай application/Genie server локально и не используй localhost как
  runtime evidence.
- Проверь отсутствие случайных app-specific names в переносимой
  инфраструктуре.
- Проверь отсутствие runtime CDN и frontend DSP/derived graph calculations.
- Сформируй coverage и заполни report.
