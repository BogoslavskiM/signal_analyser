# DEC-20260801-017: typed Spectrogram foundation без новых controls

ID: `DEC-20260801-017`
Дата: 2026-08-01
Статус: accepted
Supersedes: current untyped Spectrogram placeholder implementation only
Implementation: planned in Cascade 11; not deployed

## Контекст

Текущий Spectrogram напрямую вызывает `pspectrum` внутри render helper,
принудительно задаёт `TwoSided=true`, молча принимает transpose, применяет
epsilon floor и кеширует уже ограниченный presentation dictionary только по
имени сигнала. Он не имеет typed query/data/provider/service/cache и не связан
с Display Time ROI.

Prod EngeeDSP probe подтвердил точный raw contract: вещественный default/
`TwoSided=false` даёт one-sided `0..f_s/2`, complex default/true — centered
`-f_s/2..f_s/2`; matrix имеет exact orientation frequency × segment time,
power real/nonnegative/finite, axes sorted, `N=1` rejected, `N>=2` accepted,
absolute input time сохраняется в segment centers. Provider Auto overlap в
этом probe равен 75%, тогда как MATLAB app docs описывают 50%. Опция
TimeResolution подтверждённо сломана в EngeeDSP 0.72.0
([ENGEE-20260801-003](../engee_bugs/ENGEE-20260801-003-pspectrum-time-resolution-undefined.md)).

## Решение

Cascade 11 реализует только typed Spectrogram foundation. Wire shape и
frontend не меняются:

```json
{
  "type": "heatmap",
  "x": [],
  "y": [],
  "z": [[]],
  "x_label": "Время, с",
  "y_label": "Частота, Гц",
  "color_label": "Мощность, дБ"
}
```

Backend вводит отдельные OOP contracts:

- `SignalSpectrogramQuery`: copied raw values, sample rate и topology;
- `SignalSpectrogramData`: raw nonnegative power matrix с frequency × time
  orientation, frequency axis и absolute segment-center seconds;
- `AbstractSignalSpectrogramProvider`, `EngeeDSPSpectrogramProvider` и
  injectable `SignalSpectrogramService`;
- typed raw cache key/result, отделённые от presentation bounding.

Provider вызывается только как публичный
`EngeeDSP.Functions.pspectrum(values,times,"spectrogram","TwoSided",flag)`.
Real использует false, complex true независимо от более permissive provider.
Ось/shape/finite/nonnegative/topology проверяются до cache/state publication.
Ноль или один sample возвращает typed empty без provider; два передаются.
Provider failure не публикует частичную mutation/cache.

Presentation переводит raw power `P` в точный `10*log10(P)`. Для `P=0`
получается `-Inf`, а общий `json_safe` сериализует его как `null`; новый
конечный floor не изобретается. Только после этого heatmap равномерно
ограничивается до существующих 160×160 для wire rendering. Raw typed cache не
хранит bounded arrays.

Analysis source остаётся единственным source heatmap в Display даже при
нескольких members. MATLAB one-signal-per-time-frequency-display не переносится
в общий membership contract без отдельного решения. Новых settings, tabs,
routes, revision fields или frontend controls нет.

Time ROI/segment filtering, Leakage, FrequencyLimits, FrequencyResolution,
OverlapPercent, TimeResolution, colormap, power limits и Persistence остаются
вне Cascade 11. Spectrogram продолжает использовать полный raw signal. Это
явное ограничение первого foundation slice, а не заявление о MATLAB parity.

## Последствия

- Вещественный Spectrogram становится корректно one-sided, complex — centered.
- Специализированная математика остаётся только в EngeeDSP; fallback нет.
- Дальнейший ROI/settings slice сможет опираться на typed raw data/cache, но
  требует отдельного provider evidence и ADR.
- Frontend/E2E regression проверяет неизменный один heatmap host/wire, но не
  получает новых controls.

## Источники

- [C11 prod probe](../../agents/reports/time-frequency-engeedsp-contract-probe-20260801.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
