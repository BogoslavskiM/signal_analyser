# Архитектура workflow

`architecture/` — новая каноническая система управления задачами и агентами.
Архивы [`../architecture_0/`](../architecture_0/) и
[`../architecture_1/`](../architecture_1/) не являются источником истины для
новых задач.

## Цикл задачи

```text
Orchestrator: intake → parallel MATLAB / Engee contract / design evidence
             backlogging → новая крупная feature → DevOps feature branch от neuro_dev
             → task separation → agent TS → product-question gate при ambiguity
       ↓
Designer (clickable prototype) / MATLAB Researcher / Engee User (параллельно)
       ↓ backend-consumable Engee contract
Backender: authoritative state / Julia math / state-lite / active-page cache / API
       ↓ ready versioned design + sufficient API
Frontend: production DOM/state/API → pinned design + fast lazy rendering
       ↓
Tester: backend unit/API + frontend static/behavior
       ↓
DevOps: полный deploy pipeline, когда runtime должен получить revision
       ↳ при package-environment blocker: diagnostics → Engee instantiate →
         successful restart → sync Project.toml + Manifest.toml локально
       ↓
E2E: quick после обычной task / new-functionality + quick после новой feature
       ↓
Orchestrator: review → automatic integration gate → merge request без user approval
       ↓ после прохождения gate
DevOps: полный merge pipeline feature → neuro_dev
       ↓
Orchestrator: user report → backlogging
       ↓ при пустом actionable backlog
E2E: analysis regression → test fixes → functional/performance follow-up
```

## Порядок чтения

1. [`agents/manifest.toml`](agents/manifest.toml)
2. контракт активной роли в [`agents/roles/`](agents/roles/)
3. соответствующий workflow в [`skills/`](skills/)
4. task registry в [`tasks/`](tasks/)

## Жёсткие правила

- Orchestrator — единственный владелец backlogging, task separation, handoff и
  итоговых пользовательских отчётов.
- При старте проекта Orchestrator, если доступен `ai_manager`, выполняет
  `ai_manager load_skill --force`, затем `ai_manager connect` без project ID и
  использует установленный `$ask-to-ceo`. Вопрос субагента становится
  продуктовым после одной попытки релевантного skill. Без utility autonomous
  mode означает самостоятельное решение Orchestrator, interactive mode —
  остановку зависимой работы и вопрос пользователю в чате.
- Роли редактируют только свои зоны проекта; пересечение зон оформляется
  handoff.
- Designer владеет `architecture/design/**`, screen/zone composition, visual
  system, states, responsive rules, local fully clickable mock prototype and
  screenshots. Canonical references включают local Roboto/SVG, template colors/
  menus/proportions и catalogs screenshots других приложений.
  Frontend владеет production DOM/state/API/accessibility implementation и не
  выбирает parallel design source.
- Для UI scope Orchestrator pin-ит `design_ref` и `design_version`. Visual gap
  получает `design_revision`; silent deviation запрещён.
- E2E сначала читает `DESIGN.md`, открывает static prototype через `file://` и
  прокликивает interaction map, затем повторяет путь в production Engee.
  Prototype не является локальным application runtime или functional pass.
- Заголовки используют local Roboto Medium; SVG сохраняют aspect ratio;
  settings menus и colors следуют canonical templates. В menu видимости
  столбцов используются eye/eye-off, а не checkmark. Toolbar/settings/graphs/
  controls сохраняют proportions, если ТЗ не требует другой layout. Designer
  выбирает целиком `analytical-dense` либо `form-workbench` source-derived
  profile; controls `32px`, control radius `6px`, panel radius `8px`, dialog
  radius `12px` не заменяются приблизительными значениями.
- Plotly canvas, paper и modebar всегда белые `#ffffff`; стандартные modebar
  icons серые (`#b8b8b8`, hover `#7a7a7a`, active `#5f5f5f`) на canonical
  hover/active surfaces `#f8f8f8`/`#f2f2f2`. Plotly logo, тёмная или
  полупрозрачная общая подложка modebar, border и shadow запрещены.
- E2E запускает один foreground worker в установленном Google Chrome с
  `headless: false`, выводит текущую page на передний план и не принимает
  hidden/background Chromium как runtime evidence.
- Для data-heavy UI Julia backend выполняет DSP и готовит Plotly payload.
  `/api/state-lite` показывает form/controls раньше graphs; `plot_cache` и
  `need_update_pages` запускают только active page, heavy task работает в фоне
  и возвращает lightweight pending. Frontend использует `state_revision`,
  debounce 150/350 ms, local lazy Plotly, latest-only rAF/`Plotly.react`,
  coalesced resize и Vue 3 production zone modules.
- Исследование, контракт, реализация, тестирование и deployment — разные
  статусы. Успешный unit-тест не означает deployment.
- Секреты Engee не сохраняются в репозитории, отчётах, командах или логах.
- Production target проекта: `https://engee.com`; devhub не используется как
  runtime target или fallback.
- Приложение запускается только внутри production Engee через
  `engee.genie.start(app_path, log_file=log_file)`; абсолютный и относительный
  app path разрешены. Канонический абсолютный пример:
  `engee.genie.start("/path/app.jl", log_file="/path/app_log.log")`. Локальный
  `app.jl`, локальный Genie server и localhost запрещены; локальные
  source/unit/API/static tests разрешены.
- Backlogging может выполняться в фоне, пока независимые агенты реализуют
  текущие handoff: он не должен задерживать уже начатую разработку.
- Для каждого нового MATLAB-derived product scope Orchestrator сразу запускает
  или расширяет единственный background MATLAB research lane. Он читает
  сохранённые clicker scenarios, строит critical coverage matrix и не блокирует
  implementation.
- Для каждого Engee-dependent scope Orchestrator одновременно с MATLAB lane и
  Designer запускает Engee User. Persistent Engee contract report является
  dependency для Backend; Backend не реализует Engee behavior по предположению.
- Только Engee User подтверждает Engee bug. При confirmed blocker Backender
  оставляет реальный Engee call закомментированным рядом с typed unavailable
  stub; Frontend сохраняет action видимым и вызывает обычный API; Tester
  проверяет отсутствие fake success, а recovery task ждёт pass исходного Engee
  contract test.
- `all_critical_scenarios_covered: true` относится только к объявленному
  MATLAB reference catalog scope; E2E execution, Engee parity и production
  regression отражаются отдельными результатами.
- После каждой `done` task Orchestrator немедленно отправляет E2E handoff:
  `quick_regression` для обычной task либо `new_functionality_regression` для
  новой функциональности; второй режим уже включает quick regression.
- Quick regression использует порог 75% от planned checks при обязательной
  доступности приложения. При пустом actionable backlog запускается один
  `analysis_regression`, который допускает исправление E2E tests только внутри
  `test/playwright/**` и порождает functional или performance follow-up.
- Engee User владеет required-functionality analysis, `test/engee/**`,
  discrepancy localization и bug evidence.
- E2E владеет только Playwright/runtime/visual regression.
- `neuro_dev` — постоянная основная ветка автономной разработки. Перед каждым
  новым крупным feature-cycle Orchestrator запрашивает у DevOps feature branch
  от `neuro_dev`; после автоматического технического integration gate
  запрашивает её merge обратно. Отдельное подтверждение пользователя не нужно,
  если пользователь явно не поставил merge на паузу.
- DevOps — единственный владелец Git publication и deployment. Один request
  запускает полный conditional pipeline pod status/start →
  checkout/add/commit/push/Engee update/application restart; ненужные этапы
  помечаются `not_needed`. Перед remote Engee operation он всегда вызывает
  `engee_status`, а остановленный pod поднимает через `engee_start` и ждёт ready.
- После получения pod lock и readiness DevOps проверяет только exact checkout
  текущего проекта на production Engee pod. Если checkout dirty, DevOps только
  на pod выполняет `git add .`, затем `git stash` и требует чистый status перед
  продолжением. Локально эти команды в таком cleanup запрещены; созданный stash
  остаётся сохранённым и не восстанавливается или удаляется автоматически.
- Экран технических работ — диагностический симптом, а не автоматический баг
  Engee. DevOps сопоставляет main-document HTTP status, pod state,
  `engee.genie.start`, readiness и application logs. HTTP 500/failed backend
  bootstrap маршрутизируется Backender. Maintenance/pod/ingress/platform
  availability не относится к Engee User: DevOps исправляет pipeline, а
  неясный случай возвращается Orchestrator как `undetermined`. Engee User
  получает только конкретный function/package contract из application evidence.
- DevOps не синхронизирует environment после каждого deploy. Только при
  подтверждённой package-environment deployment problem он может один раз
  выполнить `geniepkg_instantiate` внутри production Engee, повторить
  `engee.genie.start`, а после успешного readiness скачать непосредственно из
  exact Engee project root оба файла `Project.toml` и `Manifest.toml` в корень
  локального проекта. Пара валидируется и заменяется целиком без ручного edit;
  один файл без второго не переносится, локальный instantiate запрещён.
- Неуспешный deploy/start не возвращается без диагностики: DevOps сохраняет
  очищенные ограниченные logs в `architecture/logs/**`, определяет владельца и
  отправляет `deployment_failure` с file refs. Backend failure идёт Backender,
  frontend bootstrap failure — Frontend, любой suspected/confirmed Engee bug —
  Engee User; Orchestrator получает FYI.
- Если overlays сосуществуют, Designer задаёт semantic priority, Frontend
  реализует его, а E2E проверяет screenshots, фактический hit testing через
  `elementFromPoint`, focus/pointer blocking и восстановление после закрытия.
