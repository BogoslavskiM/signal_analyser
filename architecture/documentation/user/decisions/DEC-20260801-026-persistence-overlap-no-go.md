# DEC-20260801-026: Persistence OverlapPercent resource NO-GO

ID: `DEC-20260801-026`
Дата: `2026-08-01`
Статус: accepted-no-go
Extends: [DEC-025 Persistence Leakage](DEC-20260801-025-persistence-leakage.md)
Implementation: blocked; no product control

## Контекст

Официальный `pspectrum` применяет OverlapPercent к Spectrogram и Persistence в
provider domain `[0,100)`. Persistence сначала строит spectrogram, затем
суммирует нормированные power-frequency histograms. Omitted overlap зависит от
Kaiser window/ENBW, а окно — от Leakage; percentage округляется вниз до числа
samples. Поэтому omitted не является независимой фиксированной константой.

Prod EngeeDSP `0.72.0` подтвердил детерминированный эффект explicit `0/25` и
стабильную output topology, но resource guard сработал раньше полного contract
gate. Уже `50` выделял 543–627 MiB, `75` — 1.02–1.18 GiB, omitted — до
1.75 GiB. Поздние option-order вызовы даже при `0` пересекли 512 MiB.

## Решение

Не добавлять Persistence `overlap_percent` в product payload, state, query,
cache key, provider adapter или UI. Не показывать декоративный/disabled
control. Не объявлять `25` безопасным cap: transient real `25` достиг 490.22
MiB, а более поздний `0` пересёк guard из-за runtime variance.

Не копировать Spectrogram default/range и не использовать provider Auto как
product default. Не выполнять hand-written segmentation/histogram, hidden
clamping, fallback или dependency edit. Текущий C19 вызов остаётся без нового
Overlap-контракта; отдельное изменение его resource policy требует successor
ADR и нового bounded evidence.

Cascade 20 закрывается как evidence-backed NO-GO и переключается на
Persistence Frequency Limits. Это capability/resource решение, а не
подтверждённый Engee bug.

## Условия пересмотра

1. Появляется изолированный lower-resource runtime/fixture plan и новый
   явно ограниченный allocation/RSS guard.
2. Полная real/complex Leakage×Overlap и option-order matrix проходит без
   threshold crossings.
3. Successor ADR задаёт explicit product default, cap и percent rounding без
   заявления неподтверждённой MATLAB GUI parity.
4. Unit/API/Engee/frontend/E2E gates подтверждают exact expanded settings и
   cache isolation.

`99/99.9` из остановленного probe нельзя возобновлять автоматически.

## Источники

- [Prod Persistence Overlap probe](../../agents/reports/persistence-overlap-engeedsp-contract-probe-20260801.md)
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-with-signal-processing-toolbox.html
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
