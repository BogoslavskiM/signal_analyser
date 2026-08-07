# Структура зон и подключение API

Начинай после `task-analysis` и готового Designer package. Используй только
подтверждённые API contracts. Базовый формат — HTML + JS + CSS.

## Входные данные

Прочитай screen/zone map из `DESIGN.md`, matrix
`design element → API → frontend state → selector → test`, существующие
modules and selected technical component skills.

## Technical routing

| Designer zone | Frontend skill |
|---|---|
| object inspector | `frontend/inspector-ui` |
| typed settings | `frontend/settings-controls` |
| Plotly output | `frontend/graph-output-zone` + `frontend/output-loading-flow` |
| tabs/pages | `frontend/multi-page-element` |
| toolbar | `frontend/application-toolbar` |
| modal/file/session/object export | соответствующий technical dialog skill |

## Порядок работы

1. Реализуй каждую Designer zone как production DOM/module, сохраняя stable
   screen and zone identity.
2. Загрузи только JS reference выбранных technical component skills; не ищи в
   них visual layout.
3. Свяжи actions/data с method, path, request, response, errors and lifecycle
   из `task-analysis`.
4. Храни authoritative data в backend snapshots; на frontend оставляй view
   state and допустимый local draft.
5. Реализуй state transitions и request guards, соответствующие каждому
   design state.
6. Добавь stable `data-testid` observable actions and states.
7. При API gap отправь Backender handoff. При visual/geometry gap отправь
   Designer `design_revision`. Не создавай временный contract.
8. В data-heavy app root coordinator сначала принимает `/api/state-lite`,
   хранит latest `state_revision`, отвергает старые snapshots и запускает data
   flow только active output. Settings queue использует 150 ms, noncritical
   serializable UI state — 350 ms; semantic actions не попадают в debounce.

На этом этапе не выбирай colors, typography, visual geometry or assets — их
применяет `frontend/design-implementation`. Custom technical module допустим,
когда Designer zone не совпадает с типовым component contract.

## Проверка и завершение

Проверь registration/order, API mapping, state transitions, cleanup, selectors
and absence of duplicated visual templates. Верни changed modules, contracts,
states, selectors and gaps.
