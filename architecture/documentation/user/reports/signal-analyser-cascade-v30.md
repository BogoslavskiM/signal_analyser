# Cascade 30: структурная форма активного графика

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-036](../decisions/DEC-20260801-036-active-plot-shape-contract.md)
добавляет после C29 минимальную проверку формы только active branch.

Time и Spectrum требуют у каждого trace собственные `type="line"`, `x` и `y`,
причём оси являются массивами одинаковой длины. Spectrogram и Persistence
требуют `type="heatmap"` и массивы `x/y/z`: либо все три пусты, либо `x/y`
непусты, число строк `z` равно `y.length`, а ширина каждой строки — `x.length`.
Partial-empty и ragged matrix не допускаются.

`line` — wire-tag Backend; Frontend преобразует его в Plotly `scatter/lines`,
но не использует `type` для routing. Typed-empty с non-null source допустим для
короткого/непересекающегося ROI и lazy preparation. Значения массива остаются
непрозрачными, включая JSON `null` от nonfinite dB presentation.

C30 не валидирует inactive branches, numeric/finiteness, labels, metadata,
axes semantics, settings или DSP. Более ранняя C27/C28/C29-изоляция имеет
precedence и полностью пропускает C30. Downstream log-frequency, power metadata
и Plotly errors применяются только к shape-valid данным.

Malformed active shape локально изолирует Display, очищает только её View
очередь, инвалидирует общий graph generation, не вызывает Plotly и не ищет
fallback в `plots`, другой branch, предыдущем payload или fabricated empty.
Доступное сообщение имеет selector
`display-active-plot-shape-contract-error-state`, `role="alert"` и текст
«Некорректная структура данных активного графика в ответе сервера.».

MathWorks документирует semantic matrix orientation Spectrogram и Persistence,
но не Genie JSON. Поэтому DEC явно разделяет documented direction и собственный
wire contract приложения.

Это contract-only milestone. Product/test implementation, runtime verification,
MATLAB GUI evidence и deployment пока не заявляются.

## Связи

- [DEC-036](../decisions/DEC-20260801-036-active-plot-shape-contract.md)
- [Внутренняя assessment](../../agents/reports/active-plot-shape-assessment-20260801.md)
- [DEC-035](../decisions/DEC-20260801-035-active-plot-payload-routing-contract.md)
