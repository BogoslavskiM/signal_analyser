# Workflow E2E

E2E начинает работу только по отдельному `task` handoff Orchestrator. Такой
handoff приходит после каждой завершённой task либо при переходе к пустому
actionable backlog. Handoff содержит mode, production target link или явный
`target_status: unavailable`, а также ожидаемый scope проверки.

Feature intake, первичный анализ страницы, написание scenario, запуск и report
являются последовательными шагами этого обязательного workflow, а не
отдельными subskills. Для UI-affecting scope подключается один
специализированный subskill `e2e/visual-analysis`.

Вход обязан содержать mode, exact production target/revision, trigger task,
planned scope и acceptance criteria. Если target/revision не подтверждены,
сразу верни blocker; не тестируй старую или fallback-среду.

Application runtime разрешён только в production Engee. Не запускай `app.jl`,
локальный Genie server или localhost. Если приложение не поднялось, верни
blocker Orchestrator для `devops_request: get_logs`; E2E не подменяет DevOps
диагностику и не считает static checks runtime evidence.

Если вместо приложения открылся экран «Технические работы» или generic
maintenance/error page, останови functional scenarios, но сохрани screenshot,
exact URL/time и доступный main-document HTTP status/network evidence. Отметь
availability как failed и запроси через Orchestrator DevOps diagnostics с
`devops/technical-maintenance-screen-diagnostics`. Не классифицируй такой
экран как Engee bug: он может быть HTTP 500 из-за того, что product application
или Backend не стартовали.

Для UI-affecting handoff локальный Designer prototype является отдельным
статическим contract artifact: открой его напрямую через `file://`, прочитай и
прокликай до production проверки по `e2e/visual-analysis`. Это не разрешает
локальный запуск product application и не заменяет Engee evidence.

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

## Обязательный видимый Chrome

Каждый интерактивный E2E run выполняй в обычном foreground Google Chrome:

- запускай Playwright через `chromium.launch({ channel: "chrome",
  headless: false })` либо подключайся по CDP только к уже открытому видимому
  окну Google Chrome;
- используй один наблюдаемый worker и выполняй scenarios последовательно,
  чтобы активная вкладка соответствовала текущему шагу;
- после создания страницы, переключения между design/production pages и перед
  каждым scenario вызывай `await page.bringToFront()`;
- если browser window осталось позади других приложений, активируй Google
  Chrome средствами ОС до продолжения прогона;
- не минимизируй окно, не размещай его за пределами экрана и не запускай
  `--headless`, скрытый/offscreen Chromium или фоновый screenshot-only process.

До открытия test pages сохрани множество pre-existing page handles в текущем
Chrome context. Каждую созданную этим run вкладку — prototype, production и
служебную — сразу добавляй в отдельный tracked set. Весь browser lifecycle
оборачивай в `try/finally`: после сохранения screenshots/logs/traces закрой
каждый ещё открытый tracked page, в том числе при assertion failure, timeout или
blocker. Не закрывай pre-existing пользовательские вкладки, вкладки другого
агента или shared Chrome process. Если E2E сам запустил отдельный browser
process, его можно закрыть только после cleanup собственных pages.

Весь пользовательский путь до cleanup должен быть виден на компьютере.
В report укажи `browser_channel: chrome`, `headless: false`,
`browser_visibility: foreground`, фактический worker count,
`opened_tab_count`, `closed_tab_count` и `tab_cleanup_status`. Невидимый run не
является E2E evidence и должен быть повторён в foreground.

## Visual gate

Для любого UI-affecting handoff обязательно подключи `e2e/visual-analysis`.
Сначала проверь exact design version и пройди локальный prototype interaction
map кликами/keyboard actions на required viewports, затем повтори этот путь в
production Engee.
Для page-layout scope обязательно проверь pinned `page_sizing_contract` на
minimum, минимум двух larger и одном undersized viewport: composition остаётся
неизменной, зоны растут в заданных proportions без structural maxima, а
undersized viewport прокручивает minimum application canvas.
Скриншот служит evidence и материалом анализа; устойчивый результат закрепляй
semantic, interaction и geometry assertions в Playwright tests. Инвентарь
динамических элементов должен покрывать menus, dialogs, dropdowns, popovers,
tooltips, hover/focus row actions, toasts, loaders, errors, success states,
overlays и expandable/collapsible controls.
Если overlays могут сосуществовать, overlay-stack scenario обязателен и
проверяет фактические hit/focus/restoration semantics; computed `z-index` без
interaction evidence недостаточен.

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

## Общий порядок выполнения

1. Запусти или подключи foreground Chrome по обязательному visible-browser
   contract и выведи test page на передний план.
2. Для UI scope прочитай pinned `DESIGN.md`, открой `prototype_entry` через
   `file://`, прокликай interaction map и зафиксируй observed design states.
3. Открой production target link в видимой вкладке и проанализируй страницу.
4. Если для наблюдаемого действия нет стабильного `data-testid`, отправь
   Frontend handoff с требуемым selector; не меняй frontend-код сам.
5. Добавляй или исправляй Playwright tests только когда это требует выбранный
   mode и только в `test/playwright/**`.
6. Запусти требуемый mode suite последовательно в foreground Chrome.
7. Для UI scope с overlays выполни priority combinations из pinned Designer
   contract и приложи screenshots плюс hit/focus/restoration assertions.
8. В `finally` закрой только вкладки/pages, созданные текущим run, и проверь,
   что pre-existing user tabs остались открыты.
9. Верни Orchestrator `report` handoff: mode, exact design/prototype evidence,
   production target, planned/pass/
   fail/not-run counts, success rate для quick, timing, retries, failures,
   test fixes, browser visibility/channel/worker count, opened/closed tab
   counts, cleanup status и follow-up
   classification.

Deployment и Git не входят в E2E ownership. Если target отсутствует или не
содержит требуемую revision либо приложение не стартовало, верни blocker для
отдельного DevOps deploy/get-logs handoff.
Runtime failure не считается static pass.
