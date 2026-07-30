---
name: devhub-playwright-scenario
version: 1.3.0
---
# Devhub Playwright Scenario

## When to Use
- Playwright scaffold уже создан, и нужно добавить или стабилизировать
  пользовательский devhub-сценарий.
- Нужно покрыть композицию frontend skills в работающем приложении.
- Нужно превратить внешний reference scenario произвольного формата, включая
  MATLAB-сценарий, в исполняемую проверку.
- Нужно диагностировать timeout или flaky browser workflow.

## When NOT to Use
- В приложении ещё нет `test/playwright/**` — сначала используй
  `e2e-tester/playwright-test-scaffold`.
- Нужно проверить чистую формулу, API payload или frontend module изолированно:
  это зона обычного tester.
- Нужно изменить product source.

## Inputs
Перед началом получи:

```text
target_app_url_or_current_tab
target_app_context: optional
enabled_frontend_skills
user_workflow
stable_data_testids
expected_observable_result
reference_scenario_path: optional
reference_artifacts: optional
```

- Target передаёт Architect, пользователь или доступный runtime context.
- Создание и запуск E2E-тестов не требуют deployment. E2E tester не запрашивает
  deployment ради тестов.
- Deployment нужен только для обновления целевого приложения после product
  changes и остаётся отдельной операцией Architect → DevOps.
- `reference_scenario_path` может прийти напрямую от MATLAB Researcher. Начинай
  автоматизацию сразу, не дожидаясь завершения всего MATLAB-исследования.

## Select the Coverage
1. Сформулируй observable behavior одним предложением.
2. Найди существующие specs, helpers, feature flags и запись в русском
   `REFERENCE_SCENARIO_COVERAGE.md`.
3. Расширь существующий spec, когда совпадают workflow и setup. Новый spec
   создавай для самостоятельного пользовательского поведения.
4. Объяви `requiredFeatures` по ids из `e2e.config.js`.
5. Не повторяй exhaustive unit/API assertions. E2E должен подтверждать, что
   согласованные contracts работают вместе через реальный UI.
6. Если точной formula/branch проверки нет у обычного tester, передай ему
   численные требования, а не переноси всю математику в browser test.

## Scenario Structure
Копируй `assets/scenario.test.js` в
`test/playwright/specs/<group>/<scenario>.test.js` как стартовый шаблон.

1. Открой приложение через shared `openAppPage`.
2. Сними изменяемое начальное состояние: main object, selection, opened page,
   viewport, dialog и search/filter state.
3. Создавай test data через UI с уникальным `e2e_...` identifier.
4. Выполняй действия только через stable `data-testid` и shared helpers.
5. Делай отдельный timestamped `step` на каждый смысловой переход.
6. Проверяй observable result сразу после перехода.
7. В `finally` удали созданные данные и восстанови исходный UI state.
8. Cleanup failure логируй отдельно и не подменяй им исходное падение.

## Stable Selectors
- Для значимого action/state используй `data-testid` из Frontend → E2E handoff.
- Dynamic selector должен использовать stable backend id.
- Используй role, accessible name и exact visible text как дополнительный
  контракт, но не завязывай действие на локализованный title, если есть id.
- CSS geometry разрешена для измерения overflow, canvas и render host.
- Если `data-testid` отсутствует, запроси frontend handoff. Не закрепляй
  `nth()`, случайную вложенность или domain class как новый шаблонный контракт.

## Synchronization
- Жди HTTP response, применённое значение, idle/pending state, DOM transition,
  scroll geometry или завершённый library render.
- Создавай `waitForResponse` до действия, отправляющего request.
- После controlled input проверяй и DOM value, и применённое состояние.
- Перед Apply дождись flush/debounce и проверь frontend validation.
- Не используй fixed sleep как основную синхронизацию. Короткий локальный sleep
  допустим только для известного debounce, animation или wheel settling.
- Timeout назначай конкретной операции, а не группе несвязанных шагов.

## Bounded Retries
Retry допустим только для доказанно переходного browser/devhub события:

- controlled input был перезаписан более поздним backend response;
- tooltip/hover не активировался после первого pointer transition;
- условная кнопка была remount во время click;
- output остался pending при согласованном devhub stall.

Retry:

1. повторяет минимальную операцию;
2. имеет малое фиксированное число попыток;
3. логирует state после каждой неудачи;
4. не повторяет assertion, validation error, HTTP error или численное
   расхождение.

Reload допустим только после фиксации diagnostic state. После reload восстанови
контекст и активную страницу. Не полагайся на ручной reload пользователя.

## Feature Scenarios

### Settings and State
- Проверь быстрый controlled input, flush перед Apply и сохранение последнего
  typed value.
- Проверь semantic validation как видимое состояние, а не как timeout Apply.
- Проверь, что stale response старого object/context не изменяет текущий UI.

### Inspector
- Определяй созданный object по stable id или разности строк до/после Add.
- Проверяй create/duplicate/delete/main/selection через backend-confirmed UI.
- Для длинного списка прокручивай нужный scroll container колесом и только при
  необходимости.
- Покрывай search, empty state, columns и row actions без предположения о
  конкретных domain columns.

### Multi-page and Overflow
- Проверяй полный page catalog из metadata приложения.
- Покрывай open, select, close active/non-active page и default page после
  закрытия последней.
- Сопоставляй scroll arrows с `scrollWidth`, `clientWidth`, `scrollLeft` и
  `maxScroll`.
- Проверяй разные пропорции viewport. На левом краю нет левой стрелки, на
  правом — правой.
- Условно отрисованную кнопку после проверки geometry можно нажать коротким DOM
  click, чтобы не удерживать detached locator.

### Output and Plotly
- Проверяй output pending/success/error и отсутствие автоматического retry
  после calculation error.
- Для Plotly жди согласованности backend payload, host `data`, `_fullData` и
  `_fullLayout`.
- Проверяй trace count/type, axes/units и meaningful data invariants.
- Для 3D output дополнительно проверяй scene и canvas ненулевого размера.
- Проверяй page controls как отдельный workflow без общего Apply, если таков
  frontend/backend contract.

### Dialogs and File Workflows
- Проверяй закрытие только видимыми actions, disabled/busy state и сохранение
  form при error.
- Проверяй stacking, success sequence и замену unexpected error.
- Для file browser проверяй mode, root boundary, sorting, selection, cancel и
  normalized target.
- Для session/object export проверяй только пользовательскую интеграцию;
  round-trip формата и domain mathematics принадлежат обычному tester.

### Style and Geometry
- Проверяй fixed canvas и отсутствие layout перестройки при узком viewport.
- Hover/focus/disabled/busy проверяй по видимому изменению минимум одного
  согласованного style property или semantic state.
- Не сравнивай полный screenshot как единственное доказательство поведения.

## Arbitrary Reference Scenarios
Формат внешнего сценария, в том числе MATLAB-сценария, пока не фиксирован.
Перед автоматизацией:

1. Если MATLAB Researcher передал системный путь, прочитай сценарий по этому
   пути и зафиксируй его как источник.
2. Определи источник, scenario id, configuration, actions и checkpoints.
3. Отдели точные exported data от UI labels, screenshots и вычисленных
   производных значений.
4. Зафиксируй recipe для производных данных: function, grid, window,
   normalization, units и precision.
5. Перенеси минимальный immutable artifact в `test/playwright/fixtures/`.
6. Добавь checksum, если корректность зависит от точного содержимого.
7. Сравни небольшие vectors полностью; для больших используй обоснованные
   checkpoints и инварианты.
8. Выводи tolerance из source precision, а не из текущего расхождения.
9. Не путай внешний reference с regression snapshot текущего приложения.
10. Обнови русский coverage map; не создавай дубль уже покрытого workflow.
11. Если продуктовая возможность отсутствует, отметь покрытие как `частично`
    или `отложено` и назови конкретную причину.

## Failure Classification
- `syntax/runner`: spec не загрузился; проверь `node --check`.
- `environment`: нет доступного URL/current tab, CDP, сети или авторизации.
- `test synchronization`: wait/selector не отражает реальный переход.
- `stale expectation`: подтверждённое изменение требует обновления fixture.
- `product defect`: наблюдаемый UI/API нарушает согласованный
  contract/reference. Передай discrepancy Architect; MATLAB Researcher при этом
  продолжает свою работу.

Для timeout логируй последнее релевантное состояние: values, request/pending
flags, active id, opened overlays, output hosts или scroll geometry.

## Running and Definition of Done
```bash
PLAYWRIGHT_SPEC=<relative-spec-fragment> \
./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
# или для уже открытого приложения
./test/playwright/run_devhub_playwright_tests.sh --current

./test/playwright/run_devhub_playwright_tests.sh <devhub-app-url>
```

- Сначала запусти affected spec, затем полный enabled suite.
- Runner продолжает после failures и формирует полный отчёт.
- После исправления flaky test нужен хотя бы один непрерывный полный прогон без
  ручного вмешательства.
- Выполни `node --check` для всех изменённых JS и `git diff --check`.
- Отчёт содержит scenario, command, target application context,
  passed/failed/skipped, failing action, observed state и handoff.

## Guardrails
- Не маскируй product bug retry, disabled flag, cache update или tolerance.
- Не включай feature flag только ради запуска отсутствующего UI.
- Не оставляй test data, изменённый viewport, открытый dialog или filter.
- Не запускай несколько runner на одном CDP endpoint.
