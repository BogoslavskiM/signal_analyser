# Signal Analyser: Cascade 12 Spectrogram OverlapPercent

Status: implemented-and-locally-verified; not-deployed

## Результат

Spectrogram получил одну строгую Display-local настройку
`spectrogram_settings.overlap_percent`. Новый Display использует explicit 50%;
допустимы конечные non-Bool значения от 0 до 75 включительно. Верхняя граница
— намеренная product safety policy: EngeeDSP допускает `<100`, но bounded prod
probe при 99/99.9% уже выделял около 649 MB и создавал в 15 раз больше
сегментов, чем 50%.

Настройка включена в typed Display state, query и raw-cache identity. Provider
получает canonical options `OverlapPercent`, затем `TwoSided`; real остаётся
one-sided, complex — centered two-sided. A/B независимы, Clear сохраняет
preference без provider call, первый re-add пересчитывает Spectrogram, а source
change сохраняет overlap и меняет source-specific cache identity. Равное
значение — no-op, valid change — одна revision, malformed/Bool/nonfinite/out of
range — atomic 422, stale revision — 409.

Frontend добавил один native `Overlap (%)` input внутри существующей Display
tab. Draft не вызывает API; change/blur/Enter отправляет full view object.
Rollback использует last accepted server snapshot, поэтому цепочка отклонённых
optimistic commits не восстанавливает неканоническое значение. После 409
очередь удаляет дубликаты и повторяет ровно один последний desired target. Один
graph host, три settings tabs, существующий `/api/view` и запрет client DSP
сохранены.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS, 1110/1110 |
| C12 typed settings | PASS, 13/13 |
| C12 lifecycle/cache | PASS, 56/56 |
| C12 API | PASS, 59/59 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse и diff | PASS |
| Playwright syntax/support/help | PASS |
| Skills/vanilla/docs validators | PASS |

Product/test checkpoint:
`f1dac5819ed49438fb249561102f7b2651c4150d`
(`feat: добавить Spectrogram OverlapPercent`). Contract/probe checkpoint:
`981cba563dff07b99e0997bb986805692f3880ef`.

Runtime E2E, push, deployment и merge не выполнялись. Локальный обязательный
Engee gate проходит findpeaks 16/16 и затем честно падает при import
отсутствующего `EngeeDSP`. Prod EngeeDSP evidence подтверждает explicit
0/50/75, Auto=75, option-order invariance и provider permissiveness для Bool;
product Bool отклоняет до dispatch.

## Следующий узкий кандидат

Spectrogram Leakage исследуется отдельно. Нельзя переносить уже существующий
Spectrum Leakage по имени: нужны official docs, prod provider matrix,
независимый typed contract и новый ADR. TimeResolution остаётся заблокирован
`ENGEE-20260801-003`; Persistence, ROI, limits, Reassign, scale и colormap не
входят в C12.

## Источники

- [DEC-20260801-018](../decisions/DEC-20260801-018-spectrogram-overlap-percent.md)
- [C12 prod provider probe](../../agents/reports/spectrogram-overlap-engeedsp-contract-probe-20260801.md)
- [Текущая UI/API спецификация](../specifications/signal-visibility-and-plots.md)
- [Реализованная математика](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
