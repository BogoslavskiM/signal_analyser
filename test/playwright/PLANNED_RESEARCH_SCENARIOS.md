# Planned research-to-E2E scenarios

Этот файл — план пользовательских Playwright scenarios, а не spec. Он не
подхватывается `run_playwright_tests.js` и не меняет default runner до
появления frontend handoff с feature flags и stable selectors.

## SA-UI-002 — display state and normalization

| Scenario | Feature flags | Stable selector contract | Acceptance | Cascade |
|---|---|---|---|---|
| Active-display membership | `layout-geometry`, `frontend-state-management`, `inspector-ui`, `graph-output-zone` | Existing: `display-canvas`, `active-plot-host`, `plot-type-select`, `signal-row-*`; no extra membership selector is required. | После выбора Display существует ровно один active graph host; membership visible signals и selected plot type восстанавливаются только для этой page. | **Cascade 3 core** |
| Single-signal transactional rollback | `frontend-state-management`, `inspector-ui`, `graph-output-zone` | Existing: `signal-row-*`. Required: `signal-transaction-action`, `signal-transaction-error`, `signal-transaction-state`. | На единственном eligible signal reject/failure не удаляет row, не меняет selected/visible state и не частично изменяет Plotly traces; видимый error сообщает rollback. | **Cascade 3 core** |
| Normalize local/global markers | `settings-controls`, `frontend-state-management`, `graph-output-zone` | Required: `normalize-mode-local`, `normalize-mode-global`, `plot-normalization-marker-*`, `normalization-scope-state`. | Local marker изменяет только active display; global marker согласованно появляется на всех applicable displays; переключение scope не оставляет stale marker и сохраняет явный scope text. | **Cascade 3 core** |

## SA-UI-003 — measurements and cursors

| Scenario | Feature flags | Stable selector contract | Acceptance | Cascade |
|---|---|---|---|---|
| Statistics + peaks dependency/table | `settings-controls`, `inspector-ui`, `graph-output-zone` | Required: `statistics-toggle`, `statistics-dependency-state`, `statistics-table`, `statistics-row-*`, `peaks-toggle`, `peaks-table`, `peaks-row-*`. | Пока prerequisites выключены, dependency state объясняет отсутствие table. После включения statistics/peaks rows непусты, column labels стабильны, selected signal/display определяет table scope; выключение очищает table и marker state. | After Cascade 3 |
| Two cursors | `settings-controls`, `graph-output-zone`, `layout-geometry` | Required: `cursor-a`, `cursor-b`, `cursor-readout-a`, `cursor-readout-b`, `plot-cursor-marker-a`, `plot-cursor-marker-b`. | Два cursors имеют независимые positions/readouts и marker identity; перемещение A не изменяет B; removal одного не удаляет другой и не меняет plot geometry. | After Cascade 3 |

## Cascade 3 boundary

Минимальный Cascade 3 включает только SA-UI-002: membership, transactional
rollback и normalize local/global markers. Эти scenarios используют один
display/state contract и не требуют measurement tables или drag-cursor model.
SA-UI-003 откладывается до появления их dedicated controls и данных; E2E не
подменяет DSP-вычисления peaks/statistics.

## Implementation gate

Перед созданием runnable spec Frontend (session unspecified) передаёт enabled
feature ids и final `data-testid` values. E2E Tester (session unspecified)
добавляет spec только после этого handoff; planned rows выше не являются
разрешением на fallback selectors или на ослабление acceptance.
