# DEC-20260801-036: структурная форма активного графика

ID: `DEC-20260801-036`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-035 active plot payload routing](DEC-20260801-035-active-plot-payload-routing-contract.md)
Implementation: planned in Cascade 30; not deployed

## Контекст

DEC-035 однозначно выбирает active branch `plot_payload`, проверяет её source
и запрещает fallback, но намеренно не фиксирует внутреннюю форму `x/y/z`.
Backend уже публикует два wire-типа: `line` для Time/Spectrum и `heatmap` для
Spectrogram/Persistence. Без следующей границы malformed координаты, неверный
type или ragged matrix могут попасть в Plotly либо превратиться во
сфабрикованный пустой график.

Официальная документация MathWorks подтверждает только семантику: spectrogram
имеет форму `Nf × Nt` (строки — frequency, столбцы — time), persistence —
`Npwr × Nf` (строки — power, столбцы — frequency). Это conceptual oracle, а не
описание Genie JSON, empty representation или numeric policy:

- [pspectrum](https://www.mathworks.com/help/signal/ref/pspectrum.html);
- [Spectrogram Computation in Signal Analyzer](https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html);
- [Persistence Spectrum in Signal Analyzer](https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html).

Wire contract ниже является самостоятельным решением Genie.

## Решение

C30 выполняется только после успешных DEC-033, DEC-034 и DEC-035. Если active
Display уже изолирована C27, C28 или C29, C30 не инспектирует branch и сохраняет
selector, scope и lifecycle более ранней ошибки.

Проверяется только branch, выбранная уже валидным `active_plot`:

| `active_plot` | Обязательная форма |
| --- | --- |
| `time` | каждый element `time_traces` — plain object с собственными `type="line"`, `x` и `y`; `x` и `y` — массивы одинаковой длины |
| `spectrum` | каждый element `spectrum_traces` имеет ту же line-форму |
| `spectrogram` | plain object с собственными `type="heatmap"`, `x`, `y`, `z`; все три значения — массивы |
| `persistence` | та же heatmap-форма |

`line` является wire-tag Backend, а не непосредственным Plotly type. После
успешной проверки Frontend отображает line как Plotly `scatter/lines`; routing
по `type` запрещён и остаётся функцией `active_plot`.

Для heatmap разрешены ровно две геометрические формы:

- canonical typed-empty: `x=[]`, `y=[]`, `z=[]`;
- непустые `x` и `y`, `z.length===y.length`, каждая строка `z` является
  массивом длиной `x.length`.

Partial-empty axes/matrix, ragged rows, scalar row и неверные dimensions
отклоняются. Для line допустимы `x=[]`, `y=[]`; длины разных traces не обязаны
совпадать. Typed-empty с non-null `signal` допустим для короткого или не
пересекающегося ROI и selective lazy preparation.

C30 проверяет только container, required owned fields, exact wire-tag и
геометрию. Leaves непрозрачны. В частности, JSON `null`, которым API
санитизирует nonfinite dB presentation, не является C30-ошибкой. Numeric type,
finiteness, monotonicity, units, domain и DSP correctness не выводятся из
структурной формы.

Дополнительные branch keys разрешены. C30 не фиксирует labels, names, colors,
method, axes metadata, limits, scales или settings. Существующие downstream
проверки log-frequency, power metadata и Plotly failure применяются только
после C30-valid формы.

## Запрет fallback

Malformed active shape нельзя заменять данными из `plots`, другой branch,
предыдущего snapshot или fabricated `{}`, `[]`, axes, matrix либо Plotly type.
Внутренности inactive branches не инспектируются, включая их type и geometry.

## Локальная изоляция и lifecycle

Shape failure изолирует только active Display по уже проверенному ID.
Frontend:

- очищает desired/queued/pending/stale-replay View work только этого ID и не
  создаёт для него новый `/api/view` body;
- увеличивает generation общего graph host, выполняет purge, вызывает zero
  Plotly render и не разрешает позднему settlement восстановить старый график;
- показывает `data-testid="display-active-plot-shape-contract-error-state"`,
  `role="alert"`, с точным текстом
  «Некорректная структура данных активного графика в ответе сервера.».

Topology actions и независимая работа valid Displays сохраняются. Malformed
successful `200` и `409 current` не replay отброшенный View intent. Следующий
authoritative valid snapshot снимает только C30-изоляцию этого Display и не
восстанавливает отброшенную очередь.

## Вне scope

- значения и numeric/finiteness policy `x/y/z`;
- labels, colors, names, axes, units, scales, limits и normalization;
- DSP/math correctness, resolution и sampling semantics;
- exact inner keysets и metadata;
- `plots`, inactive branches, `panel`, settings, Measurements и Peaks;
- backend request schema, state revision, MATLAB wire или multi-view layout.

## Проверка

Deterministic matrix должна покрыть все четыре routes, required owned fields,
wrong/missing type, non-array axes, unequal line lengths, typed-empty, каждый
класс partial/ragged heatmap, opaque `null` leaves и selected-second trace.
Отдельно проверяются inactive malformed branch acceptance, no-`plots`
fallback, C27/C28/C29 precedence, initial/`200`/`409 current`/recovery,
A/B-isolation, exact per-ID queue purge и deferred Plotly settlement.

## Связи

- [Внутренняя оценка shape boundary](../../agents/reports/active-plot-shape-assessment-20260801.md)
- [Cascade 30](../reports/signal-analyser-cascade-v30.md)
- [DEC-035](DEC-20260801-035-active-plot-payload-routing-contract.md)

Контракт зафиксирован до реализации. Изменения продукта, тестов, runtime,
deployment, Backend и математики этим решением не заявляются.
