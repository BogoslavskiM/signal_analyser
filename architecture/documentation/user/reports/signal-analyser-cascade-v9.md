# Signal Analyser: Cascade 9 Spectrum settings и Time ROI

Status: implemented-and-locally-verified; not-deployed

## Результат

Каждый Display получил независимый строгий объект
`spectrum_settings={scale,frequency_scale,leakage}`. Defaults: dB, линейная
частотная ось и Leakage `0.5`. Clear сохраняет preference, новая страница
получает defaults, а фактическая смена даёт одну revision. Некорректный
вложенный объект, stale revision и provider failure не публикуют частичное
состояние.

Spectrum теперь вычисляется только через `EngeeDSP.Functions.pspectrum` по
inclusive raw Time ROI каждого видимого сигнала. Вещественный сигнал получает
one-sided ось `0..Nyquist`, комплексный — centered two-sided. Leakage входит в
typed raw-cache identity; dB/Linear и Linear/Log являются presentation state и
не вызывают лишнего DSP, кроме изменения Leakage/ROI. Короткие сигналы
пересекаются со своим временным доменом без padding или resampling: 0/1 sample
даёт typed empty без provider, 2+ поддерживаются.

В интерфейсе Spectrum controls расположены внутри существующей Display-вкладки,
поэтому settings tabs остаётся ровно три. Native selects меняют dB/Linear и
Linear/Log, range меняет Leakage только по `change`. Любой видимый complex
member блокирует Log и backend повторяет тот же atomic invariant. Plotly
получает authoritative `xaxis.type`; frontend не вычисляет Spectrum.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend unit/API | PASS, 867/867 |
| Целевой C9 service/API | PASS, 52/52 и 28/28 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse и diff | PASS |
| Playwright syntax/support/help | PASS |
| Skills catalog | PASS, 40 manifests, schema 2, versions only in manifests |
| Vanilla frontend validator | PASS, 10 bundles / 9 templates |
| Documentation structure/links | PASS |

Product/test checkpoint:
`b53d79622dbe926316915d7c55668432434bcc07`
(`feat: добавить настройки Spectrum по Time ROI`).

Runtime E2E, push, deployment и merge не выполнялись. Локальная Julia не
содержит `EngeeDSP`: обязательный contract проходит findpeaks 16/16 и затем
падает при загрузке пакета. Это известное ограничение окружения, не скрытый
skip и не основание для fallback. Prod probe EngeeDSP `0.72.0` отдельно
подтвердил real/complex topology, Leakage boundaries и two-sample behavior.

При raw power `P=0` точная формула `10log10(P)` даёт `-Inf`; общий API слой
преобразует non-finite значение в JSON `null`, то есть Plotly gap, не
подменяя математику epsilon-floor.

## Источники

- [DEC-20260801-015](../decisions/DEC-20260801-015-spectrum-roi-default-settings.md)
- [Текущая UI/API спецификация](../specifications/signal-visibility-and-plots.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
