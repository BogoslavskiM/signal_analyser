# Cascade 20: Persistence OverlapPercent NO-GO

Дата: 2026-08-01
Статус: закрыто без product implementation; fallback выбран

## Результат

Persistence OverlapPercent поддерживается EngeeDSP и детерминированно меняет
occurrence histogram, но не прошёл resource gate. На bounded `N=256` уже 50%
выделял 543–627 MiB, 75% — 1.02–1.18 GiB, omitted — до 1.75 GiB. Поздний
option-order loop пересёк 512 MiB даже при 0%, поэтому 25% нельзя считать
безопасным cap, несмотря на отдельные вызовы ниже порога.

`99/99.9` не запускались. Полная Leakage×Overlap/order matrix намеренно
остановлена. Temporary prod pod очищен, остановлен и подтверждён `stopped`.
Repository/model/dependency/MATLAB/browser не менялись; Engee bug не заявлен.

## Решение

[DEC-026](../decisions/DEC-20260801-026-persistence-overlap-no-go.md)
запрещает product/API/UI exposure OverlapPercent до нового resource evidence.
Следующий узкий кандидат — Persistence Frequency Limits. Предварительный probe
уже подтверждает real interior и complex cross-zero bands, но exact Auto,
strict product domain, output deltas, option order и Leakage interaction должны
пройти отдельный bounded gate до successor ADR.

Связано с [provider report](../../agents/reports/persistence-overlap-engeedsp-contract-probe-20260801.md)
и [traceability](../traceability/signal-analyser-cascades.md).
