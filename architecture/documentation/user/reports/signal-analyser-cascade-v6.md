# Signal Analyser: Cascade 6 Time presentation

Status: implemented-and-locally-verified; not-deployed

## Результат

`Normalize Y axis` теперь действительно нормализует каждый обычный Time trace
отдельно в `[0,1]`, а `Show markers` показывает его bounded sample points.
Обе настройки принадлежат Display, работают локально, не вызывают API и не
изменяют revision.

Peak annotations преобразуются тем же affine scale их analysis source без
clipping. Пустой/non-Time Display отключает controls, сохраняя preference.
Некорректные Time samples дают стабильный error state и не вызывают Plotly.

## Проверки

| Проверка | Результат |
| --- | --- |
| Frontend static/behavior | PASS, 2/2 |
| Backend regression | PASS, 649/649 |
| Playwright syntax/support/help | PASS |
| Skills/vanilla/documentation validators | PASS |

Product/test checkpoint: `f546195`. Runtime E2E, push и deployment не
выполнялись.

Official behavior source:
https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
