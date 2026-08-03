---
name: e2e-workflow
---
# Workflow E2E

E2E начинает работу только по отдельному `task` handoff Orchestrator после
готовности feature и обычной регрессии. Handoff содержит target link и
ожидаемый пользовательский workflow.

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

## Режимы E2E handoff

Глобальный `type` остаётся `task`. В первой строке `description` укажи один из
трёх режимов:

1. `e2e_mode: quick_regression` — проверь доступность приложения и ключевой
   функционал; верни короткий отчёт о работоспособности.
2. `e2e_mode: analysis_regression` — прогони полный E2E-регресс, замерь время,
   найди медленные и нестабильные места и предложи, что стоит ускорить.
3. `e2e_mode: new_functionality_regression` — покрой полный пользовательский
   workflow новой готовой feature и релевантную регрессию.

1. Открой target link и проанализируй страницу.
2. Если для наблюдаемого действия нет стабильного `data-testid`, отправь
   Frontend handoff с требуемым selector; не меняй frontend-код сам.
3. Напиши Playwright-сценарий полного пользовательского workflow.
4. Запусти сценарий и релевантный набор тестов.
5. Верни Orchestrator `report` handoff. Для `quick_regression` — краткий
   результат ключевых проверок; для двух остальных режимов — target, действия,
   результат, timing, retries, failures и findings.

Deployment не входит в E2E. Runtime failure не считается static pass.
