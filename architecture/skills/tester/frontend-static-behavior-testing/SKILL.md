---
name: frontend-static-behavior-testing
version: 0.1.0
---
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

- `assets/run_front_tests.js` — текущий dependency-free sorted runner;
- `assets/static-test-template.js` — static JS/CSS/HTML contract;
- `assets/behavior-test-template.js` — VM/Vue/API behavior contract;
- `assets/v8-coverage-summary.js` — dependency-free V8 script/function summary;
- `assets/report-template.md` — frontend skill/ТЗ/coverage report.

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
- локальные fonts и только используемые SVG;
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
  tests → E2E handoff.

## Browser Boundary
Обычный frontend tester не подтверждает:

- геометрию и overlap;
- реальный CSS rendering;
- mouse hit targets;
- Plotly canvas pixels;
- browser navigation/download;
- полный пользовательский workflow.

Передавай эти проверки E2E tester вместе со stable `data-testid`.

## Coverage Report
- Минимальный процент coverage не устанавливается.
- Запускай runner с `NODE_V8_COVERAGE=<temp-dir>`.
- Формируй script/function summary через
  `assets/v8-coverage-summary.js`.
- Укажи coverage и skill/ТЗ matrix в `assets/report-template.md`.
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
- Проверь отсутствие случайных app-specific names в переносимой
  инфраструктуре.
- Сформируй coverage и заполни report.
