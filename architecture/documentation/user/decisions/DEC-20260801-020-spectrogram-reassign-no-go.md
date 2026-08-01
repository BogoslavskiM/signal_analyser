# DEC-20260801-020: Spectrogram Reassign blocked by provider

ID: `DEC-20260801-020`
Дата: `2026-08-01`
Статус: accepted-no-go
Implementation: blocked; no product control

## Контекст

Official MathWorks docs define a logical `Reassign` option, API default false,
and a Signal Analyzer Spectrogram checkbox that relocates power estimates to
energy centers. Two documented displays may hold different runtime states.

Prod Engee false/default behavior is valid, but every valid true probe fails
with undefined `fetchTimeReassignment`. True output topology, numerical effect
and cost are therefore unavailable.

## Решение

Не добавлять `reassign` в product payload/state/query/cache/UI на текущей Engee
prod build. Не показывать disabled или декоративный checkbox, который выглядит
как рабочая функция. Adapter продолжает использовать текущий Spectrogram call
без Reassign; explicit false не нужен для C13 behavior.

Не выполнять silent true→false, hand-rolled reassignment, fallback или
dependency edit. Подтверждённый defect:
[ENGEE-20260801-004](../engee_bugs/ENGEE-20260801-004-pspectrum-reassign-undefined.md).

## Условия разблокировки

1. Engee owner предоставляет исправленную target build/version/commit.
2. Public `pspectrum` true возвращает typed tuple для real/complex one-/
   two-sided inputs.
3. Probe подтверждает deterministic axes/shape/power, combined Leakage/Overlap,
   short inputs и bounded resource behavior.
4. Новый successor ADR замораживает exact Bool payload, cache semantics,
   failure policy и checkbox behavior.
5. Unit/API/Engee/frontend/E2E gates проходят на exact build.

До выполнения всех условий C14 закрыт как evidence-backed NO-GO, а автономный
цикл переходит к другому безопасному Spectrogram slice.

## Источники

- [Prod Reassign probe](../../agents/reports/spectrogram-reassign-engeedsp-contract-probe-20260801.md)
- MathWorks `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- MathWorks Signal Analyzer Reassign example:
  https://www.mathworks.com/help/signal/ug/find-and-track-ridges-using-reassigned-spectrogram.html
