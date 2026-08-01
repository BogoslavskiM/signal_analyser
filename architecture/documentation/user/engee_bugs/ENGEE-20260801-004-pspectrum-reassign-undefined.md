# ENGEE-20260801-004: pspectrum Reassign вызывает отсутствующую функцию

Статус: confirmed
Дата: 2026-08-01
Severity: high for Reassign capability; no current-product regression

## Поверхность

Prod Engee `26.7.2`, Julia `1.12.4`, public
`EngeeDSP.Functions.pspectrum(...,"spectrogram",...)`. EngeeDSP UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, source tree `XobDm`; semantic package
version в pod не доступна.

## Минимальное воспроизведение

```julia
using EngeeDSP
t = collect(0:511) ./ 1000.0
x = sin.(2pi .* 73 .* t)
EngeeDSP.Functions.pspectrum(
    x, t, "spectrogram",
    "Reassign", true,
    "Leakage", 0.5,
    "OverlapPercent", 50,
    "TwoSided", false,
)
```

Ожидается документированный reassigned Spectrogram tuple. Фактически:

```text
UndefVarError: fetchTimeReassignment not defined in EngeeDSP.Functions
```

Stack ведёт в `computeSpectrogramCore`, `computeSpectrogram.jl:375`, через
public `pspectrum.jl:50`.

## Изоляция

Ошибка повторилась 28/28 раз для real/complex, one-/two-sided, разных позиций
option, Leakage 0/0.5/1 и `N=2..4096`. Omitted Reassign и explicit false
битово совпадают и работают детерминированно. Следовательно, причина не в
Genie, UI, тестах, сети, topology или конкретном сигнале.

## Влияние и workaround

Любой продуктовый control, позволяющий `Reassign=true`, будет детерминированно
ломать provider calculation. До upstream fix control не публикуется. Безопасно
только omit/false. Silent downgrade, hand-rolled reassignment и dependency edit
запрещены.

После исправления требуется повторный prod matrix: true success, real/complex
axes/shape, deterministic power redistribution, resource cost и combined
Leakage/Overlap option order.

Источник evidence:
[prod probe](../../agents/reports/spectrogram-reassign-engeedsp-contract-probe-20260801.md).
