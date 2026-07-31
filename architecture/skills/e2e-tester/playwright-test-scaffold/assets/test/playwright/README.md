# Интеграционные тесты Playwright

Тесты подключаются к Chrome через CDP и проверяют доступное Genie-приложение по
URL или в уже открытой вкладке. Создание и запуск тестов не требуют deployment.
Browser package Playwright не устанавливается: используется `playwright-core` и
Chrome, запущенный через `vpnp google`.

## Настройка

1. Укажи app-level selectors и URL fragment в `e2e.config.js`.
2. Объяви flags frontend skills и предметных product capabilities этого
   проекта. Включи только возможности, доступные на проверяемом target.
3. Каждый feature spec объявляет:

```javascript
test.requiredFeatures = ["inspector-ui"];
module.exports = test;
```

Spec без `requiredFeatures` выполняется всегда. Временное переопределение:

```bash
PLAYWRIGHT_FEATURES=settings-controls,inspector-ui \
./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
# или
./test/playwright/run_devhub_playwright_tests.sh --current
```

Project-specific ids вроде `measurements-statistics` принадлежат только
конкретному приложению и не добавляются в универсальный scaffold.

## Запуск

```bash
cd test/playwright
npm install

cd ../..
./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
```

Один spec:

```bash
PLAYWRIGHT_SPEC=smoke/app_load \
./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
```

Runner продолжает выполнение после падения отдельного spec и в конце печатает
полный отчёт `passed/failed/skipped/total`.

## Референсные сценарии

Связывай внешние сценарии и fixtures с тестами в русскоязычном
`REFERENCE_SCENARIO_COVERAGE.md`. Не используй regression snapshot текущего
приложения как внешний эталон без подтверждённого источника.
