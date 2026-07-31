# Signal Analyser: Cascade 5 state separation и Clear Display

Status: implemented-and-locally-verified; not-deployed

## Результат

Приложение теперь различает global row selection, membership активной страницы
и page-local analysis source. Display можно полностью очистить и восстановить
checkbox без удаления сигналов из общего inventory и без изменения неактивных
страниц.

UI получил доступное overflow-действие Clear Display и явные пустые состояния
графика, Measurements и Peaks. Единственный Plotly host сохраняется, а его
старые traces очищаются.

## Контракт

- `row_selected_signal` non-null и глобален.
- `visible_signals` ordered и может быть `[]`.
- `analysis_signal` nullable; legacy `selected_signal` повторяет его.
- Empty Display не вызывает spectral или Peaks provider.
- Actual mutation меняет revision один раз; no-op/stale/error — нет.
- Первый re-add становится source и оставляет Peaks выключенным.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend | PASS, 649/649 |
| Frontend static/behavior | PASS, 2/2 |
| Playwright syntax/support/help | PASS |
| Engee findpeaks evidence matrix | PASS, 16/16 |
| Local EngeeDSP package gate | FAIL: пакет отсутствует в local environment |
| Skills catalog | PASS, 40 manifests, schema 2 |
| Vanilla assets | PASS, 10 bundles, 9 templates |
| Documentation structure | PASS |

Product/test checkpoint: `8d480ac`. Push, deploy и merge не выполнялись.
Runtime E2E ждёт authenticated target и отдельный внешний handoff.

## Связи

- [DEC-20260731-012](../decisions/DEC-20260731-012-display-selection-separation.md)
- [Спецификация](../specifications/signal-visibility-and-plots.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
