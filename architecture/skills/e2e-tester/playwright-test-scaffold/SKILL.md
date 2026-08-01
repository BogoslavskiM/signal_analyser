---
name: playwright-test-scaffold
---
# Playwright Test Scaffold

## When to Use
- В новом Genie-приложении ещё нет `test/playwright/**`.
- Нужно перенести стандартный CDP/Engee runner и базовую структуру E2E-тестов.
- Нужно включить E2E-набор по универсальным UI-возможностям и предметным
  функциям приложения, доступным на проверяемом target.

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

Skill id и legacy runner filename с `devhub` сохранены только для совместимости
каталога. Они не выбирают окружение. Scaffold обязан получать разрешённый
target из `[engee_target]` проектного `architecture/agents/manifest.toml` и
enforce `environment`, `base_url`, `mcp_server`, `allow_devhub` и
`allow_fallback`.

## Feature Flags

`e2e.config.js` объявляет известные конкретному проекту E2E capability flags
двух видов:

1. Универсальные UI capabilities используют ids реально подключённых frontend
   skills:

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

2. Предметные product capabilities определяет только конкретный проект,
   например `measurements-statistics`. Не добавляй их имена в универсальный
   каталог skills или scaffold template.

- `reference-scenarios` включай, когда приложение получает внешний эталонный
  сценарий или численный fixture.
- Каждый feature spec объявляет `requiredFeatures` массивом ids, уже известных
  его проектному `e2e.config.js`.
- Spec без `requiredFeatures` является обязательным core test.
- Disabled feature spec загружается для проверки синтаксиса, но не выполняется
  и учитывается runner как `skipped`.
- Значение flag отражает наличие capability на обычно проверяемом target.
  Временно передавай точный доступный набор через `PLAYWRIGHT_FEATURES`, не
  меняя разрешённое окружение из `[engee_target]`.
- Называй project-specific flag в lower kebab-case по наблюдаемой продуктовой
  функции, а не по отдельному полю, странице или test case.
- Не создавай новый flag для отдельного поля, страницы или одного test case.
  Flag соответствует переносимой возможности приложения.
- Не выключай flag capability, которая должна присутствовать на target, чтобы
  скрыть regression или product failure.

## Stable Selector Contract
До написания feature specs получи Frontend → E2E handoff:

```text
enabled_frontend_skills
enabled_optional_capabilities
enabled_product_features
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
1. Прочитай role contract, список frontend skills и product capabilities
   целевого приложения.
2. Убедись, что `test/playwright/` отсутствует либо согласуй merge с
   существующим scaffold.
3. Скопируй bundled scaffold без domain names исходного приложения.
4. Измени `name` в `package.json` и `package-lock.json`.
5. Задай `app.readyTestId`, `app.loaderTestId` и `app.pageUrlMatch`.
   При существующем project manifest `[engee_target].base_url` является locked
   effective origin. `target.allowedOrigins` и `PLAYWRIGHT_ALLOWED_ORIGINS`
   могут только совпадать с ним, но не override. Только при физически
   отсутствующем canonical manifest они являются fallback config.
   `PLAYWRIGHT_TARGET_MANIFEST` также не может скрыть существующий canonical
   manifest: другой или отсутствующий override является hard error. Shell
   отклоняет запрещённый explicit URL до browser launch; JS runner отклоняет
   explicit URL/current tab до specs.
6. Объяви skill и project-specific flags в проектном config и включи только
   capabilities, фактически доступные на обычно проверяемом target.
7. Добавь Frontend → E2E selector handoff в комментарии конфигурации или
   проектную документацию; не дублируй selectors в нескольких helpers.
8. Оставь core smoke spec исполняемым независимо от flags.
9. Создай feature specs через `devhub-playwright-scenario`.
10. Обнови русский coverage map для внешних reference scenarios.

## Runner Contract
- Allowed origins обязательны. Если project manifest существует,
  `[engee_target].base_url` является locked effective origin; отсутствующие
  section/base URL и любой конфликт env/config являются hard error. Env/config
  fallback и alternate manifest разрешены только когда canonical manifest
  физически отсутствует. При существующем canonical manifest отличный или
  nonexistent `PLAYWRIGHT_TARGET_MANIFEST` является hard error; override не
  меняет precedence. Конфликт fallback env/config или пустой effective allow
  list также являются hard error.
- Explicit app URL проверяется shell до browser launch и повторно JS runner до
  specs. `--current` page проверяется JS runner до specs. `openAppPage` повторяет
  guard непосредственно перед navigation или ожиданием current page.
- Сравнивай exact parsed URL origin, а не string prefix. Разрешай только HTTP(S)
  origins без credentials.
- Использует уже открытый Chrome через CDP.
- Wrapper запускает Chrome через `vpnp google`, если endpoint ещё недоступен.
- Один CDP endpoint обслуживает не более одного runner одновременно.
- `PLAYWRIGHT_SPEC` фильтрует specs по относительному пути.
- `PLAYWRIGHT_FEATURES` временно переопределяет enabled flags через список,
  разделённый запятыми.
- Падение одного spec не останавливает остальные.
- Итог содержит passed, failed, skipped и total, затем полный список failures.
- Синтаксическая ошибка disabled spec считается runner failure, а не skip.
- Background CDP является предпочтительным режимом и не должен менять focus.
- Интерактивный Chrome размещается на отдельном macOS Space/desktop; fullscreen
  допустим как fallback. До Space/focus/window actions E2E Tester координируется
  с MATLAB Researcher, не перемещает и не закрывает MATLAB и сохраняет
  `browser_workspace_setup` evidence.

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
./test/playwright/run_devhub_playwright_tests.sh <allowed-engee-app-url>
# или
./test/playwright/run_devhub_playwright_tests.sh --current
```

`<allowed-engee-app-url>` обязан принадлежать configured allowed origins.
Используй target-neutral placeholder и не удаляй allowed-origin guard.

## Guardrails
- Не переноси names, selectors, fixtures и expected values reference
  приложения.
- Не включай capability, отсутствующую на проверяемом target.
- Не удаляй shell/runner/navigation allowed-origin guards и не допускай пустой
  allow list.
- Не используй devhub при `allow_devhub=false`, иной origin в обход
  `[engee_target]` или fallback при `allow_fallback=false`.
- Не переноси project-specific flag в универсальный каталог skills или
  scaffold template.
- Не отключай failing feature flag ради зелёного отчёта.
- Не заменяй полный runner сторонним test framework без отдельного решения
  архитектора.
- Не добавляй browser download: scaffold использует `playwright-core` и
  существующий Chrome.
