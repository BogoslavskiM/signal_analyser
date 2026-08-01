# Cascade 29: строгая маршрутизация payload активного графика

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-035](../decisions/DEC-20260801-035-active-plot-payload-routing-contract.md)
фиксирует `plot_payload` как exact six-key envelope:
`selected_signal`, `visible_signals`, `time_traces`, `spectrum_traces`,
`spectrogram`, `persistence`.

После успешных проверок selection и `active_plot` frontend обязан сопоставить
payload projections с active Display и выбрать ровно одну ветку. Time и
Spectrum требуют ordered trace-массив той же cardinality, что membership, с
собственным `signal` у каждого trace. Spectrogram и Persistence требуют один
object с собственным `signal`, равным analysis source. `name` не заменяет
`signal`.

Empty Display тоже приходит явно: null source и пустой membership; пустой
trace-массив для active Time/Spectrum либо object с `signal=null` для active
Spectrogram/Persistence. Отсутствующая или malformed branch не превращается в
пустую на клиенте.

Fallback на `plots`, другую branch, предыдущий payload, `name` alias или
fabricated empty state запрещён. Внутренности неактивных branches не
проверяются этим каскадом.

Если active Display уже изолирована C27 или C28, C29 не проверяет её payload и
не меняет precedence исходной ошибки. Фактическое противоречие root selection
с active Display остаётся global fatal по DEC-033. Несогласованность уже
валидной projection с `plot_payload` либо повреждение active branch является
локальной C29-ошибкой: View-очередь этого Display очищается, graph host
generation инвалидируется, поздний Plotly render не заменяет доступное
сообщение
`data-testid="display-active-plot-payload-contract-error-state"`,
`role="alert"` — «Некорректные данные активного графика в ответе сервера.»

Официальный MATLAB Signal Analyzer поддерживает simultaneous multi-view и
предлагает разные displays для side-by-side представлений. Для Genie вывод
ограничен текущей архитектурой одного `active_plot` на Display и одного graph
host; это продуктовая inference, а не утверждение о MATLAB wire или полной
эквивалентности:

- [Signal Analyzer](https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html);
- [View Signals on Multiple Plots](https://www.mathworks.com/help/signal/ug/explore-signals.html).

C29 намеренно не фиксирует numeric `x/y/z`, geometry, axes, DSP/math, plot
types, labels, colors, `plots`, `panel`, settings, Measurements, Peaks и
inactive-branch internals. Backend/API/request schema и математика не меняются.

Это contract-only milestone. Product/test implementation, автоматические и
runtime проверки, MATLAB GUI evidence и deployment пока не заявляются.

## Связи

- [DEC-035](../decisions/DEC-20260801-035-active-plot-payload-routing-contract.md)
- [Внутренняя assessment](../../agents/reports/active-plot-payload-routing-assessment-20260801.md)
- [DEC-033](../decisions/DEC-20260801-033-display-selection-snapshot-contract.md)
- [DEC-034](../decisions/DEC-20260801-034-active-plot-snapshot-contract.md)
