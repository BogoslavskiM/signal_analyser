# Signal Analyser: Cascade 7 Time Limits/ROI

Status: implemented-and-locally-verified; not-deployed

## Результат

Каждый непустой Display получил authoritative Time Limits в секундах. Они
одновременно задают видимый Plotly range и inclusive raw ROI для Statistics и
Peaks. Clear публикует null, первый re-add и новый Display получают полный
range, а смена analysis source сохраняет допустимый диапазон или сбрасывает его
на полный диапазон нового сигнала.

Measurements возвращают абсолютные zero-based индексы и время. Peaks получает
точный ROI с absolute sample offset; диапазон из одного или двух отсчётов даёт
typed empty Peaks без вызова EngeeDSP. Invalid edit возвращает field-level 422,
восстанавливается inline и не меняет state/cache/revision.

В архитектуру добавлены предоставленные пользователем visual-spec PNG с
SHA-256 и зафиксированным ограничением «один график на Display page».

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend unit/API | PASS, 719/719 |
| Frontend static/behavior | PASS, 2/2 |
| Playwright syntax/support/help | PASS |
| Skills catalog | PASS, 40 manifests, schema 2 |
| Vanilla frontend validator | PASS, 10 bundles / 9 templates |
| Diff/Julia parse | PASS |

Product/test checkpoint: `1b7864b`. Runtime E2E, push и deployment не
выполнялись. Реальный EngeeDSP ROI path остаётся target gate; локальные tests
используют точный injected-provider seam.

Sources:

- https://www.mathworks.com/help/signal/ug/measure-signals.html
- https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
