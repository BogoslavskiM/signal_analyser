# Planned bundled cascade E2E batch

`SA-CASCADE-BATCH-01` — единый будущий Playwright scenario. Файл является
планом и не подхватывается runner. Feature ids и selectors ниже включаются в
`e2e.config.js` только после frozen Frontend handoff; до этого default 7-spec
baseline не меняется.

## Feature bundle

| Order | Planned feature id | User contract | Required stable selectors | Acceptance |
|---|---|---|---|---|
| 1 | `multi-display-tabs` | Несколько Display tabs поверх одной application workspace. | `display-tabs`, `display-tab-*`, `display-add`, `display-close-*`, `display-active-state` | Add создаёт и выбирает новый Display; click и keyboard Arrow/Enter переключают ровно один active tab; close возвращает deterministic соседний tab. |
| 2 | `display-single-graph` | Каждый Display содержит один самостоятельный graph canvas выбранного типа. | `display-canvas`, `active-plot-host`, `plot-type-select` scoped by active display | В каждом tab ровно один ready active host; add/switch/close не добавляет multi-layout editor и восстанавливает page-local plot type. |
| 3 | `display-local-state` | Selection, active plot и inspector values изолированы по Display. | `display-state-revision-*`, existing `signal-row-*`, `active-plot-panel`, `active-plot-field-*` scoped by display | Изменение selected signal/active plot в Display B не меняет snapshot Display A; возврат в A восстанавливает его state/revision без stale B values. |
| 4 | `bottom-measurements` | Нижняя Measurements область относится к active Display и selected signal. | `measurements-dock`, `measurements-display-scope`, existing `measurements-signal-name`, `measurements-table`, `measurement-row-*` | Dock остаётся под fixed grid; scope точно совпадает с active Display + selected signal; tab switch обновляет revision/rows и не меняет geometry. |
| 5 | `inspector-actions` | Inspector actions применяются только к active Display. | `inspector-panel`, `inspector-display-scope`, `inspector-action-*`, `inspector-action-state-*` | Click и keyboard запускают action для active Display; disabled/precondition state доступен; action не мутирует inactive Display. |
| 6 | `action-status-feedback` | Action имеет наблюдаемые pending/success/error status и безопасный retry. | `action-status`, `action-progress`, `action-error`, `action-retry`, `action-request-id` | Один action даёт terminal status; retry доступен только после recoverable error, создаёт новый request id и не дублирует успешную mutation; error не оставляет partial state. |

## Single batch flow

1. Открыть приложение и сохранить active Display, selected signal, active plot,
   Measurements tab/dock state, document scroll и geometry.
2. Создать Display B, подтвердить один graph canvas и переключение tab через click и
   keyboard.
3. В B выбрать другой signal/active plot и выполнить inspector action; снять
   state revision и status request id.
4. Перейти в A и подтвердить полную display-local изоляцию.
5. Открыть bottom Measurements в A и B, подтвердить display/signal scope,
   minimum/maximum/mean raw rows и неизменную geometry.
6. На контролируемом recoverable action проверить pending → error → retry →
   success без duplicate mutation; если injectable failure contract не frozen,
   этот шаг остаётся planned, а не route-mock fallback.
7. Закрыть B и восстановить исходные tab/state/dock/scroll значения.

## Timing and hang evidence

Runner step logs сохраняют ISO timestamp и duration. Scenario дополнительно
логирует durations для app-ready, add/switch/close Display, каждого `/api/view`
или action request, четырёх plot-ready renders, Measurements refresh и полного
batch. Retries логируются с attempt/request id; автоматических скрытых retries
нет. Soft warning budgets назначаются после первого healthy-target baseline по
конкретным действиям; hard timeout остаётся safety bound и не используется как
performance target. Hang evidence включает последний pending action, request id,
terminal network event и elapsed time.

## Runnable gate

- Все шесть feature ids enabled на одном target SHA.
- Frontend передал exact selectors и keyboard semantics.
- Backend/Frontend согласовали revision/request-id и recoverable retry contract.
- Минимум два seed signals и возможность создать второй Display.
- До выполнения gate этот batch не добавляется как `.test.js` и не создаёт
  failing/default-runner skips.
