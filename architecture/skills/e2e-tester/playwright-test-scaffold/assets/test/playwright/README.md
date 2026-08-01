# Интеграционные тесты Playwright

Тесты подключаются к Chrome через CDP и проверяют доступное Genie-приложение по
URL или в уже открытой вкладке. Создание и запуск тестов не требуют deployment.
Browser package Playwright не устанавливается: используется `playwright-core` и
Chrome, запущенный через `vpnp google`.

## Настройка

1. Укажи app-level selectors и URL fragment в `e2e.config.js`.
2. Если project manifest существует, runner читает `base_url` из
   `[engee_target]` и использует его как locked allowed origin. Значения
   `target.allowedOrigins` и `PLAYWRIGHT_ALLOWED_ORIGINS` могут только точно
   совпадать с lock; конфликт не является override и останавливает runner.
   `PLAYWRIGHT_TARGET_MANIFEST` не может скрыть существующий canonical manifest:
   другой либо отсутствующий override является hard error. Только когда
   canonical manifest физически отсутствует, alternate manifest или config/env
   разрешены как fallback. Их конфликт или пустой effective список — hard error.
3. Объяви flags frontend skills и предметных product capabilities этого
   проекта. Включи только возможности, доступные на проверяемом target.
4. Каждый feature spec объявляет:

```javascript
test.requiredFeatures = ["inspector-ui"];
module.exports = test;
```

Spec без `requiredFeatures` выполняется всегда. Временное переопределение:

```bash
PLAYWRIGHT_FEATURES=settings-controls,inspector-ui \
./test/playwright/run_devhub_playwright_tests.sh <allowed-engee-app-url>
# или
./test/playwright/run_devhub_playwright_tests.sh --current
```

Project-specific ids вроде `measurements-statistics` принадлежат только
конкретному приложению и не добавляются в универсальный scaffold.

Allowed-origin guard выполняется трижды:

- shell отклоняет explicit URL до запуска Chrome;
- JS runner отклоняет explicit URL или `--current` page до specs;
- `openAppPage` повторяет проверку непосредственно перед navigation/current
  page readiness.

Проверка использует exact parsed HTTP(S) origin и не принимает URL credentials
или string-prefix совпадение.

## Запуск

```bash
cd test/playwright
npm install

cd ../..
./test/playwright/run_devhub_playwright_tests.sh <allowed-engee-app-url>
```

Один spec:

```bash
PLAYWRIGHT_SPEC=smoke/app_load \
./test/playwright/run_devhub_playwright_tests.sh <allowed-engee-app-url>
```

Legacy runner filename не выбирает environment. Существующий project manifest
всегда имеет precedence; alternate manifest, copied config и env не могут его
переопределить.

Runner продолжает выполнение после падения отдельного spec и в конце печатает
полный отчёт `passed/failed/skipped/total`.

## Референсные сценарии

Связывай внешние сценарии и fixtures с тестами в русскоязычном
`REFERENCE_SCENARIO_COVERAGE.md`. Не используй regression snapshot текущего
приложения как внешний эталон без подтверждённого источника.
