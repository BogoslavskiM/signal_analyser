# Signal Analyser: Cascade 10 Frequency Limits

Status: implemented-and-locally-verified; not-deployed

## Результат

Каждый Display получил Auto либо явный Spectrum interval в расширенном строгом
`spectrum_settings`. Auto хранится как `frequency_limits=null`; explicit форма
равна `{min_hz,max_hz,units:"Hz"}`. Новый Display начинает с Auto, Clear
сохраняет intent, страницы A/B независимы. Допустимый interval сохраняется при
смене analysis source, недопустимый сбрасывается только в Auto одной atomic
revision. Malformed, Bool/non-finite, неупорядоченные, non-Hz и внешние границы
возвращают 422 без частичного state/cache изменения.

Frequency Limits входят в typed Spectrum query/cache и передаются только
`EngeeDSP.Functions.pspectrum`. Auto не добавляет provider option. Для
secondary trace явный диапазон пересекается с его real `[0,f_s/2]` либо complex
`[-f_s/2,f_s/2]` domain; пустое пересечение даёт typed empty без provider.
Post-hoc crop, собственная FFT, padding, resampling, fallback и dependency edit
не добавлены. Backend snapshot разделяет сохранённый `requested` и фактический
`effective` interval.

В существующей Display-вкладке Spectrum появились только F min/F max и inline
error; settings tabs по-прежнему три. Auto-поля отображают backend effective
Hz values. Draft не вызывает API; valid change/blur/Enter отправляет полный
четырёхключевой object через существующую revision-safe queue. Очистка обоих
полей возвращает Auto, локально invalid input и server 422 восстанавливают
canonical values. Отдельный Log-floor control и frontend DSP отсутствуют.
Вещественный Min `0` сохраняется при Log; complex/Log guard остаётся atomic.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS, 944/944 |
| Целевой C10 unit/API | PASS, 37/37 и 40/40 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse и diff | PASS |
| Playwright syntax/support/help | PASS |
| Skills catalog | PASS, 40 manifests, schema 2, versions only in manifests |
| Vanilla frontend validator | PASS, 10 bundles / 9 templates |
| Documentation structure/links | PASS |

Product/test checkpoint:
`9c7cd70ddc10c323f6897afe65cdac2e1a960715`
(`feat: добавить Frequency Limits для Spectrum`). Контрактный docs checkpoint:
`df5451d`.

Runtime E2E, push, deployment и merge не выполнялись. Локальный обязательный
Engee gate проходит findpeaks 16/16 и затем падает при import отсутствующего
`EngeeDSP`; это честное environment limitation. Отдельный prod probe
EngeeDSP `0.72.0` подтвердил exact FrequencyLimits grid, real/complex domains,
partial clipping, outside/order/finite errors и N=2 behavior.

SA-GRAPH-004 сохранён как partial: прямое MATLAB evidence подтверждает только
вещественный Log с сохранённым Min `0`. Complex limits/Log control не были
наблюдены из-за clicker input/activation blocker и не выдаются за oracle.

## Источники

- [DEC-20260801-016](../decisions/DEC-20260801-016-frequency-limits.md)
- [Текущая UI/API спецификация](../specifications/signal-visibility-and-plots.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
