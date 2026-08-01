# Signal Analyser: Cascade 16 Spectrogram Frequency Scale

Status: implemented-and-locally-verified; not-deployed

## Результат

Spectrogram settings расширены до exact object
`{overlap_percent,leakage,frequency_limits,frequency_scale}`. Requested
`frequency_scale` — строгий Display-local `linear|log`, default `linear`.
Backend-authoritative metadata разделяет intent и возможность отображения:
no-source публикует effective `null`/available `[]`, real разрешает Linear/Log,
complex сохраняет requested Log, но использует effective Linear.

Scale является presentation-only: она не входит в typed query, raw cache key
или EngeeDSP options и не меняет backend `x/y/z`. Scale-only mutation на
холодном cache не вызывает Spectrum/Spectrogram provider. Frontend применяет
effective к Plotly y-axis и создаёт только transient `y` clone; zero bin
становится `minPositive/2`, `z` и authoritative payload не меняются. Для
непустой оси без положительной частоты предусмотрена стабильная plot error.

Exact request, no-op/+1/422/bounded 409, A/B, Clear/re-add, real↔complex,
Spectrum isolation и cleanup покрыты тестами. Финальный независимый audit после
трёх циклов исправлений дал `CLEAN`.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS |
| C16 typed state/cache/metadata | PASS, 47/47 |
| C16 API strict validation | PASS, 16/16 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse | PASS |
| Playwright syntax/support/help | PASS |
| Final integration audit | CLEAN |
| Local Engee contract | unavailable: EngeeDSP absent; Devhub MCP 404 |

Product/test checkpoint:
`83308222896379eb72f1923006de39ce07265d8d`
(`feat: добавить Frequency Scale Spectrogram`). Contract checkpoint:
`899be0bb7f1fc2ecdbcc670bfc670efad0ef24f6`.

Runtime E2E, push, deployment и merge не выполнялись. Отсутствие local package
и MCP не изолирует продуктовый Engee defect; `engee_bug_candidate` не создан.

## Следующий узкий кандидат

C17 исследует Spectrogram Power Limits отдельно. До нового ADR продукт не
получает Power Limits, Fit Colormap или дополнительные provider options.

## Источники

- [DEC-20260801-022](../decisions/DEC-20260801-022-spectrogram-frequency-scale.md)
- [UI/API specification](../specifications/signal-visibility-and-plots.md)
- [Mathematics](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
