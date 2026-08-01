# DEC-20260801-027: Persistence Frequency Limits blocked by segmentation policy

ID: `DEC-20260801-027`
Дата: `2026-08-01`
Статус: accepted-blocked
Extends: [DEC-026 Persistence Overlap NO-GO](DEC-20260801-026-persistence-overlap-no-go.md)
Implementation: blocked; provider capability only

## Контекст

Официальные MathWorks/Engee документы и prod EngeeDSP `0.72.0` подтверждают
FrequencyLimits для Persistence. На изолированном probe с explicit
`OverlapPercent=0` in-domain bands создают новую 1024-point grid с exact
endpoints и меняют frequency, power и occurrence. Provider clipping partial
intervals неприемлем для product intent; Bool/matrix permissiveness требует
строгой adapter validation.

Однако текущий C19 adapter не передаёт OverlapPercent. C20 показал, что omitted
overlap output-equivalent explicit 75 на bounded fixture и достигает GiB-scale
allocations. Explicit zero меняет существующие C18/C19 power/occurrence даже
без Frequency Limits и не прошёл полный N=256 resource/order gate.

## Решение

Зафиксировать Frequency Limits как provider capability PASS, но не добавлять
его в product payload/state/query/cache/UI до отдельного fixed Persistence
segmentation/resource foundation.

Нельзя скрыто передать `OverlapPercent=0` только потому, что C21 probe использовал
его для изоляции. Это глобальная breaking numerical policy, а не деталь нового
control. Нельзя также реализовать Frequency Limits поверх текущего omitted
overlap: для такого exact adapter нет безопасного C21 resource evidence.

Сохранённые C21 направления будущего контракта, но не frozen product fields:

- Auto intent отдельно от explicit full-domain, несмотря на fixture equality;
- exact finite non-Bool in-topology Hz pair; partial ranges reject, not clip;
- real one-sided and complex centered validation;
- provider computation/query/cache identity, не frontend cropping;
- независимость от Spectrum/Spectrogram settings;
- A/B/Clear/source, 422/409 и four-cache atomicity после prerequisite ADR.

## Условие разблокировки

Отдельное решение должно:

1. Явно принять или отвергнуть fixed non-user-configurable Persistence overlap
   и supersede соответствующую часть DEC-026.
2. Сравнить omitted/explicit-zero для real/complex, Leakage `0/0.5/1`, C19 и
   application-scale fixtures с resource guard и exact numerical rebaseline.
3. Ввести algorithm-policy/cache identity, исключающую alias старых omitted
   entries, и обязательный cold backend restart при миграции.
4. Перебазировать C18/C19 unit/Engee/E2E evidence до Frequency Limits work.

После foundation successor ADR может использовать C21 exact geometry,
validation и interaction evidence. Engee bug не заявлен.

## Источники

- [C21 prod probe](../../agents/reports/persistence-frequency-limits-engeedsp-contract-probe-20260801.md)
- [DEC-026](DEC-20260801-026-persistence-overlap-no-go.md)
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Persistence Spectrum:
  https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- Engee `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
