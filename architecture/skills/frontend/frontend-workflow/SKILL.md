# Workflow Frontend

## Назначение и вход

Прими frontend handoff с task section, `design_ref`, pinned `design_version`,
required states/viewports, `page_sizing_contract` и подтверждёнными API
contracts. Явные требования
пользователя выше implementation references. Не меняй backend semantics и не
расширяй UI scope из-за возможностей technical template.

## 1. Design coverage and task analysis

Примени `frontend/task-analysis`. Для UI-affecting scope проверь готовность и
полноту Designer package до visible implementation. Если package отсутствует,
устарел, противоречит ТЗ или не покрывает screen/state/viewport, отправь
Designer `design_revision` с evidence. Не исследуй Figma и не выбирай visual
pattern самостоятельно. Для нового/изменённого page, shell или zone layout
отсутствующий либо расплывчатый page sizing contract также является design gap.

Проанализируй API contracts. Если Frontend не получает нужные данные, отправь
Backender `task` handoff и дождись достаточного контракта для зависимой части.
Design gap и API gap являются разными handoff.

Подключи дополнительные technical subskills только по trigger:

| Trigger | Subskill |
|---|---|
| Создание/разделение modules и каталогов | `frontend/frontend-project-structure` |
| Global toolbar actions and capabilities | `frontend/application-toolbar` |
| Typed scalar drafts, parsing and validation mapping | `frontend/settings-controls` |
| Object snapshots, selection and actions | `frontend/inspector-ui` |
| Opened/main page state and lifecycle | `frontend/multi-page-element` |
| Plotly payload and rendering | `frontend/graph-output-zone` |
| Apply polling, readiness and calculation errors | `frontend/output-loading-flow` |
| Modal lifecycle, focus, async state and stacking | `frontend/dialog-system` |
| Server-side path/file API | `frontend/file-browser-dialog` |
| Full session import/export API | `frontend/session-import-export-ui` |
| Selected-object export API | `frontend/object-export-dialog` |

Несколько subskills допустимы для одного реального workflow. Не подключай
component skill только из-за похожего visual DOM.

## 2. Implementation

Базовый формат Frontend — HTML + JS + CSS. Выполняй этапы по порядку:

1. `zone-structure-api` — реализуй заданные Designer zones как production DOM
   and modules, затем подключи state, actions and confirmed API lifecycle;
2. technical component skills — примени только необходимые JS contracts,
   request guards, parsing, polling and cleanup;
3. `design-implementation` — перенеси pinned design geometry, CSS and assets,
   реализуй states/viewports, page/application minima, invariant resize,
   proportional growth, undersized document scrolling and accessibility
   semantics.

Designer prototype является visual specification. Не копируй его demo JS в
production и не используй его mock data как backend contract. Любое требуемое
видимое отклонение оформляй `design_revision` и применяй только после получения
новой version.

### Обязательный performance contract для data-heavy UI

Если приложение содержит signals, spectra, spectrograms, ambiguity functions
или другие тяжёлые outputs:

- оставляй DSP, engineering calculations и подготовку Plotly payload в Julia
  backend; browser получает готовые `data/layout/config`;
- начинай с лёгкого `/api/state-lite`, затем загружай только active output;
- соблюдай backend `plot_cache`/`need_update_pages`: не делай eager requests
  inactive pages, pending poll только active page;
- signal/settings changes отправляй trailing debounce 150 ms, noncritical UI
  state — trailing debounce 350 ms; semantic actions выполняй сразу;
- храни latest accepted `state_revision` и отвергай более старые responses;
- загружай локальный Plotly лениво и сериализуй render через
  `requestAnimationFrame`, one-render-in-flight, latest-only queue и
  `Plotly.react`;
- coalesce `ResizeObserver` events и выполняй отложенный resize;
- используй Vue 3 production build и modules by zones, чтобы изменять только
  затронутые reactive DOM sections.

Cold load локальных Vue/Plotly assets, сетевой размер больших graph arrays и
собственный render Plotly остаются измеряемыми bottlenecks. Не возвращай из-за
них DSP в browser и не подключай CDN: runtime assets остаются project-local.

### UI при подтверждённом Engee-блокере

Если handoff содержит подтверждённый `engee_blocker_ref` и Backend unavailable
contract:

- сохрани кнопку или другое предусмотренное ТЗ действие видимым; не удаляй
  capability из интерфейса и не подменяй её локальным вычислением;
- действие вызывает обычную Backend API ручку. Frontend никогда не вызывает
  Engee напрямую и не выбирает между real call и stub;
- обработай стабильный `engee_function_unavailable` как отдельное явное
  состояние, не как success: покажи короткое сообщение о временной
  недоступности и доступный recovery/retry путь, если он определён дизайном;
- не показывай fake/sample/cached result как результат текущей операции;
- если pinned package не содержит unavailable state, отправь Designer
  `design_revision` и не придумывай видимый паттерн самостоятельно.

После будущего восстановления Engee API contract для Frontend не меняется:
Backender удаляет stub, а action продолжает вызывать ту же ручку.

Отдельные frontend zoning, styling, state-management, ui-contract-change,
layout-geometry and style-system skills не используются: composition and
visual system принадлежат Designer; API/state остаются в technical Frontend
skills; geometry проверяет E2E по design evidence.

## 3. Reports

После implementation отправь report Tester и Orchestrator. Tester получает
изменённое UI behavior, controls/actions, API contracts and stable selectors.
Orchestrator получает реализованный scope, `design_ref`,
`implemented_design_version`, covered states/viewports, approved deviations
and unresolved issues. Для page-layout scope отдельно отчитай реализацию
`page_sizing_contract`: minima, growth ratios, отсутствие structural maxima,
неизменность composition и document scroll в undersized viewport.

Укажи `applied_skills` и причины skipped requested skills. Запусти frontend
static/behavior tests and syntax checks, проверь cleanup and stale-response
guards. Для data-heavy UI отдельно отчитай state-lite, debounce timings,
active-only loading, revision guard и graph render serialization. Локальные
source/tests допустимы, но локальный application/Genie server
и localhost запрещены. Отдели локальные проверки от ещё не выполненной
production Engee E2E/visual verification.
