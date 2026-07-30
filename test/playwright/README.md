# Playwright E2E: Signal Analyser

Набор подключается к уже доступному Chrome по CDP с `playwright-core`. Он не
скачивает браузер и не выполняет deployment. PROD application URL не хранится в
репозитории: после отдельного deployment DevOps передаёт только `status.open_url`
для canonical application path `/user/apps/signal_analyser`.

## Будущий запуск после deployment

Установить зависимости разрешённой штатной командой (не выполнено этим
изменением):

```bash
cd test/playwright && npm install
```

Запустить весь набор, подставив URL ровно из deployment status:

```bash
./test/playwright/run_devhub_playwright_tests.sh '<status.open_url>'
```

Или выбрать уже открытую PROD-вкладку по canonical path:

```bash
./test/playwright/run_devhub_playwright_tests.sh --current
```

Один сценарий:

```bash
PLAYWRIGHT_SPEC=signal_analyser/plot_contracts \
./test/playwright/run_devhub_playwright_tests.sh '<status.open_url>'
```

Runner принимает URL также как `PLAYWRIGHT_APP_URL`. `PLAYWRIGHT_SPEC` фильтрует
relative spec path, `PLAYWRIGHT_FEATURES` временно заменяет feature flags. Один
CDP endpoint обслуживается только одним runner одновременно.

## Контракт и сценарии

Все product selectors централизованы в `e2e.config.js`; specs используют только
этот handoff для действий и semantic state. Plotly class `.js-plotly-plot`
используется только как observable render host. Сценарии и их documentation
baseline перечислены в `REFERENCE_SCENARIO_COVERAGE.md`.

Текущий статус: **не запущено — ожидается PROD deployment**. Не были выполнены
ни CDP connection, ни browser/Playwright, ни открытие PROD URL, ни установка
зависимостей.
