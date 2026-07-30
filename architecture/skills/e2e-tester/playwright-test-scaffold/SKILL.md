---
name: playwright-test-scaffold
version: 0.3.0
---
# Playwright Test Scaffold

## When to Use
- В новом Genie-приложении ещё нет `test/playwright/**`.
- Нужно перенести стандартный CDP/devhub runner и базовую структуру E2E-тестов.
- Нужно включить E2E-набор по составу frontend skills приложения.

## When NOT to Use
- Playwright scaffold уже существует и нужен новый пользовательский сценарий —
  используй `e2e-tester/devhub-playwright-scenario`.
- Нужно исправить product source или написать unit/API contract test.

## Bundled Scaffold
Скопируй содержимое `assets/test/playwright/` в `test/playwright/` целевого
приложения. Scaffold включает:

- custom runner с Chrome CDP, runner lock, spec filter и полным отчётом;
- wrapper запуска Chrome через `vpnp google`;
- `e2e.config.js` с feature flags и app-level selectors;
- timestamped logger и generic page helpers;
- обязательный smoke spec;
- русский `REFERENCE_SCENARIO_COVERAGE.md`;
- package metadata для `playwright-core`.

Не копируй `node_modules`. Установи зависимости штатной командой только после
разрешения пользователя или управляющего агента.

## Feature Flags
В `e2e.config.js` включи flags только для frontend skills, реально подключённых
в приложение:

```text
layout-geometry
style-system
frontend-state-management
settings-controls
inspector-ui
multi-page-element
graph-output-zone
output-loading-flow
dialog-system
file-browser-dialog
session-import-export-ui
object-export-dialog
reference-scenarios
```

- `reference-scenarios` включай, когда приложение получает внешний эталонный
  сценарий или численный fixture.
- Каждый feature spec объявляет `requiredFeatures` массивом тех же ids.
- Spec без `requiredFeatures` является обязательным core test.
- Disabled feature spec загружается для проверки синтаксиса, но не выполняется
  и учитывается runner как `skipped`.
- Не создавай новый flag для отдельного поля, страницы или одного test case.
  Flag соответствует переносимой возможности приложения.

## Stable Selector Contract
До написания feature specs получи Frontend → E2E handoff:

```text
enabled_frontend_skills
user_workflows
stable_data_testids
expected_visible_states
```

- `data-testid` обязателен для значимых действий, controls, rows, tabs, dialogs,
  loading/error states и output hosts.
- Dynamic ids строятся из stable backend id, а не из изменяемого title/name.
- CSS classes можно использовать для geometry/render details, но не как
  единственный контракт пользовательского действия.
- Если selector отсутствует, верни frontend handoff; не закрепляй случайную DOM
  вложенность в новом scaffold.

## Workflow
1. Прочитай role contract и список frontend skills целевого приложения.
2. Убедись, что `test/playwright/` отсутствует либо согласуй merge с
   существующим scaffold.
3. Скопируй bundled scaffold без domain names исходного приложения.
4. Измени `name` в `package.json` и `package-lock.json`.
5. Задай `app.readyTestId`, `app.loaderTestId` и `app.pageUrlMatch`.
6. Включи feature flags по фактическому составу приложения.
7. Добавь Frontend → E2E selector handoff в комментарии конфигурации или
   проектную документацию; не дублируй selectors в нескольких helpers.
8. Оставь core smoke spec исполняемым независимо от flags.
9. Создай feature specs через `devhub-playwright-scenario`.
10. Обнови русский coverage map для внешних reference scenarios.

## Runner Contract
- Использует уже открытый Chrome через CDP.
- Wrapper запускает Chrome через `vpnp google`, если endpoint ещё недоступен.
- Один CDP endpoint обслуживает не более одного runner одновременно.
- `PLAYWRIGHT_SPEC` фильтрует specs по относительному пути.
- `PLAYWRIGHT_FEATURES` временно переопределяет enabled flags через список,
  разделённый запятыми.
- Падение одного spec не останавливает остальные.
- Итог содержит passed, failed, skipped и total, затем полный список failures.
- Синтаксическая ошибка disabled spec считается runner failure, а не skip.

## Application Runtime Boundary
- Создание и запуск E2E-тестов не требуют deployment.
- E2E tester использует доступный URL приложения или уже открытую browser tab
  через `--current`.
- Deployment является отдельной операцией обновления приложения. Его выполняет
  DevOps только по явному запросу Architect, когда изменился product source и
  целевой экземпляр действительно нужно обновить.
- Test-only изменения никогда не инициируют deployment.

## Verification
После переноса выполни:

```bash
for file in $(rg --files test/playwright -g '*.js'); do
  node --check "$file" || exit 1
done

bash -n test/playwright/run_devhub_playwright_tests.sh
./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
# или
./test/playwright/run_devhub_playwright_tests.sh --current
```

## Guardrails
- Не переноси names, selectors, fixtures и expected values reference
  приложения.
- Не включай feature, отсутствующую в frontend composition.
- Не отключай failing feature flag ради зелёного отчёта.
- Не заменяй полный runner сторонним test framework без отдельного решения
  архитектора.
- Не добавляй browser download: scaffold использует `playwright-core` и
  существующий Chrome.
