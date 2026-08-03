---
name: e2e-workflow
---
# Workflow E2E

E2E начинает работу только по отдельному `task` handoff Orchestrator. Такой
handoff приходит после каждой завершённой task либо при переходе к пустому
actionable backlog. Handoff содержит mode, production target link или явный
`target_status: unavailable`, а также ожидаемый scope проверки.

## Типовая архитектура

```text
test/playwright/
  package.json
  package-lock.json
  e2e.config.js              # target, API paths и test IDs
  run_playwright_tests.js    # discovery, browser и report
  specs/
    smoke/                   # доступность и readiness
    <application>/           # feature и regression scenarios
  support/
    app_page.js              # общая загрузка приложения
    <application>_page.js    # page object и API waits
    logger.js
    *.contract.test.js       # контракты support layer
```

Один test-файл покрывает один связный пользовательский workflow. Селекторы,
ожидания API и повторяемые действия выносить в `support/`; product-specific
assertions оставлять в `specs/<application>/`.

## Стек

- Node.js LTS, CommonJS, project assertions и встроенный strict assert для
  contract tests support layer.
- Зафиксированный в lockfile `playwright-core`, Chromium и CDP.
- Собственный project runner; не добавлять `@playwright/test` без отдельного
  архитектурного решения.
- Основной selector — `data-testid`; синхронизация — наблюдаемое UI-состояние
  и ожидаемый API response, а не произвольный sleep.

## Visual gate

Для любого UI-affecting handoff обязательно подключи `e2e/visual-analysis`.
Скриншот служит evidence и материалом анализа; устойчивый результат закрепляй
semantic, interaction и geometry assertions в Playwright tests. Инвентарь
динамических элементов должен покрывать menus, dialogs, dropdowns, popovers,
tooltips, hover/focus row actions, toasts, loaders, errors, success states,
overlays и expandable/collapsible controls.

## Режимы E2E handoff

Глобальный `type` остаётся `task`. В первой строке `description` укажи один из
трёх режимов:

1. `e2e_mode: quick_regression` — после обычной завершённой task проверь
   доступность и ключевой функционал. Запланированный набор не обязан быть
   зелёным на 100%: operational threshold равен 75%.
2. `e2e_mode: analysis_regression` — при пустом actionable backlog прогони
   полный E2E-регресс, исправь test-owned defects, повтори suite, замерь время и
   классифицируй оставшиеся functional/performance findings.
3. `e2e_mode: new_functionality_regression` — после task с новой
   пользовательской функциональностью добавь её E2E coverage и затем выполни
   quick regression.

### Quick regression

- Сначала проверь, что production application доступно и готово к действиям.
- Зафиксируй заранее `planned` checks. В отчёте укажи `passed`, `failed`,
  `skipped_or_not_run` и `success_rate = passed / planned * 100`.
- `success_rate >= 75%` означает operational result, если availability check
  прошёл. Все остальные checks остаются findings и не скрываются.
- Недоступное приложение, отсутствующий runtime evidence, timeout или not-run
  check не превращаются в pass. Quick mode не исправляет tests только ради
  повышения процента.

### Analysis regression

1. Запусти полный suite и собери timing, retries, hangs и failures.
2. Раздели failures на test-owned и runtime/product-owned.
3. Исправь устаревшие, неверные или сломанные tests в своей ownership-зоне
   `test/playwright/**`; product code не меняй.
4. Повтори полный suite после test fixes.
5. Если остаются runtime/product failures, отправь Orchestrator `report` для
   functional-fix handoff.
6. Если всё зелёное, но есть slow paths, отправь `report` для optimization
   handoff с измерениями.
7. Если всё зелёное и медленных мест нет, верни clean report.

### New-functionality regression

1. Добавь или обнови E2E scenario полного нового пользовательского workflow.
2. Запусти новый scenario: он обязан пройти и оценивается отдельно.
3. Запусти quick regression и рассчитай его 75% metric.
4. Верни оба результата; quick threshold не маскирует failure нового workflow.

1. Открой target link и проанализируй страницу.
2. Если для наблюдаемого действия нет стабильного `data-testid`, отправь
   Frontend handoff с требуемым selector; не меняй frontend-код сам.
3. Добавляй или исправляй Playwright tests только когда это требует выбранный
   mode и только в `test/playwright/**`.
4. Запусти требуемый mode suite.
5. Верни Orchestrator `report` handoff: mode, production target, planned/pass/
   fail/not-run counts, success rate для quick, timing, retries, failures,
   test fixes и follow-up classification.

Deployment не входит в regression mode. Для отдельного явного deployment
handoff E2E использует `e2e/genie-deploy`. Runtime failure не считается
static pass.
