# DEC-20260801-028: fixed Persistence segmentation foundation NO-GO

ID: `DEC-20260801-028`
Дата: `2026-08-01`
Статус: accepted-no-go
Extends: [DEC-027 Frequency Limits blocked](DEC-20260801-027-persistence-frequency-limits-blocked.md)
Implementation: blocked; current numerical policy unchanged

## Контекст

C21 Frequency Limits был безопасно исследован только с explicit internal
`OverlapPercent=0`. Чтобы не скрывать breaking migration внутри другого
feature, C22 отдельно сравнил current omitted overlap и proposed fixed zero.

На первом же real `N=64`, Leakage `0.5` matched pair current omitted call
выделил 1231.86 MiB и занял 6.14 s, explicit zero — 369.33 MiB и 1.53 s.
Frequency axis совпала, но power/occurrence существенно изменились. Guard
остановил complex, Leakage endpoints, repeats, option order и size ladder.

Official docs не называют zero default MATLAB Signal Analyzer. Generated
script сохраняет явно выбранный zero только в конкретном interference example.
Fixed zero может быть лишь раскрытой product policy, не parity claim.

## Решение

Не менять глобальный Persistence adapter с omitted overlap на fixed zero и не
вводить algorithm epoch в product на текущем evidence. Resource improvement
одной пары не заменяет обязательную real/complex/Leakage/order/size matrix.

DEC-027 остаётся заблокирован: Persistence Frequency Limits не реализуется.
DEC-026 также продолжает запрещать Overlap API/state/UI control.

Current omitted algorithm не объявляется безопасным: 1.23 GiB на N=64 —
зафиксированный operational risk. Следующая безопасная задача — исследовать
семантически прозрачное lazy materialization/resource containment, которое не
меняет provider options или heatmap math.

## Условия пересмотра

1. Изолированный runtime/RSS plan позволяет безопасно завершить real/complex,
   Leakage `0/0.5/1`, repeats, exact future order и representative size matrix.
2. Successor явно принимает numerical/parity delta и фиксирует публичное
   disclosure при отсутствии overlap control.
3. Query/cache получает algorithm-policy epoch; deployment выполняет cold
   restart и исключает hot reuse legacy entries.
4. C18/C19 Engee/unit/E2E baselines перебазированы до Frequency Limits work.

Нельзя автоматически продолжать N128/N256 omitted probe под текущим guard.
Engee bug не заявлен.

## Источники

- [C22 prod probe](../../agents/reports/persistence-fixed-zero-foundation-probe-20260801.md)
- [DEC-027](DEC-20260801-027-persistence-frequency-limits-blocked.md)
- MathWorks Find Interference:
  https://www.mathworks.com/help/signal/ug/find-interference-using-persistence-spectrum.html
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
