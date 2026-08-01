# Signal Analyser: Cascade 11 typed Spectrogram foundation

Status: implemented-and-locally-verified; not-deployed

## Результат

Legacy Spectrogram path заменён typed OOP-контрактом без новых controls,
routes или settings. Backend содержит отдельные `SignalSpectrogramQuery` и
`SignalSpectrogramData`, abstract provider, EngeeDSP adapter, service и raw
cache. Query копирует полный raw signal; real input передаётся provider как
one-sided `TwoSided=false`, complex — centered `TwoSided=true`.

Provider output принимается только в точной orientation frequency × segment
time. Проверяются topology, shape, конечные сортированные axes, временной
домен, полный Nyquist domain и конечная неотрицательная real power. Для `N<2`
возвращается typed empty без provider call. Ошибка provider/validation не
публикует частичный cache или Display mutation.

Raw result кешируется до presentation. Wire остаётся прежним heatmap:
`x=time`, `y=frequency`, `z=10*log10(power)`. Нулевая power намеренно даёт
`-Inf`, который общий API `json_safe` превращает в `null`; epsilon floor не
изобретён. Только wire presentation ограничивается до 160×160, raw cache
сохраняет полный массив. Analysis source остаётся единственным источником
Spectrogram в Display; frontend продолжает использовать один graph host и
ровно три settings tabs.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS, 980/980 |
| Целевой C11 unit | PASS, 36/36 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse и diff | PASS |
| Playwright syntax/support/help | PASS |
| Skills catalog | PASS, 40 manifests, schema 2, versions only in manifests |
| Vanilla frontend validator | PASS, 10 bundles / 9 templates |
| Codex adapter dry-run | PASS, 9 generated targets |

Product/test checkpoint:
`d47e51e61a346803902ce1f5b179ed8fb9f02c14`
(`feat: добавить typed Spectrogram foundation`). Contract checkpoint:
`7d357dd`.

Runtime E2E, push, deployment и merge не выполнялись. Локальный обязательный
Engee gate проходит findpeaks 16/16 и затем честно падает при import
отсутствующего `EngeeDSP`. Отдельный prod probe подтвердил EngeeDSP `0.72.0`
topology, raw shape/units, short inputs, absolute segment centers и
frequency-limit behavior. Он также выявил
`ENGEE-20260801-003`: `TimeResolution` вызывает отсутствующий внутренний
validator, поэтому control и hand-rolled fallback запрещены.

Docs-only MATLAB Researcher определил следующий безопасный кандидат:
Spectrogram `OverlapPercent` отдельно от Time Resolution. MATLAB app
документирует default 50%, тогда как standalone provider Auto зависит от ENBW;
до реализации требуется отдельный explicit 0/50/75 и invalid-boundary probe.

## Short-input correction

Prod follow-up `N=2..16` показал, что valid terminal segment center может быть
на `0.5/f_s` позже последнего raw timestamp. Первоначальный C11 upper bound был
слишком строгим. Hotfix `68016963800bcd89d43ad224a9519d3634ab729b`
разрешил только этот half-sample interval с прежним numeric tolerance. После
исправления backend 982/982, C11 38/38; topology/shape/power/lower-bound checks
не ослаблены.

## Источники

- [DEC-20260801-017](../decisions/DEC-20260801-017-typed-spectrogram-foundation.md)
- [Текущая UI/API спецификация](../specifications/signal-visibility-and-plots.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
- [Prod time-frequency probe](../../agents/reports/time-frequency-engeedsp-contract-probe-20260801.md)
