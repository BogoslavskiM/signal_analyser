# Signal Analyser: Cascade 13 Spectrogram Leakage

Status: implemented-and-locally-verified; not-deployed

## Результат

Spectrogram settings атомарно расширены до exact object
`{overlap_percent, leakage}`. Leakage независима от Spectrum Leakage, хранится
в каждом Display и имеет explicit normalized default `0.5`, finite non-Bool
inclusive range `0..1`. Signed zero канонизируется в `0.0` в settings, query и
cache key.

Leakage входит в typed raw-cache identity и меняет provider power, но не
frequency/time grid. Adapter использует public
`EngeeDSP.Functions.pspectrum(...,"spectrogram",...)` и canonical options
Leakage, OverlapPercent, TwoSided. Real остаётся one-sided, complex — centered
two-sided. Spectrum cache/provider полностью независимы.

Frontend добавил native normalized range и доступное value/error внутри
существующей Spectrogram section. `input` меняет Display-local draft, `change`
отправляет один full two-key view target. 422 откатывается к last accepted
server snapshot. Первый 409 повторяет ровно один latest desired target;
повторный 409 прекращает retry, восстанавливает canonical state и показывает
inline error.

Cross-role audit выявил и исправил cold-cache зависимости. Spectrogram-only
mutation не материализует отсутствующий Spectrum. Canonical no-op не вызывает
ни один spectral provider и возвращает stable typed-empty missing data; обычный
последующий GET материализует оба provider результата. Cached unrelated data
переиспользуется. Прямой cache-key constructor валидирует и канонизирует zero,
поэтому equality/hash/Dict contract согласован.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS, 1229/1229 |
| C13 typed settings | PASS, 21/21 |
| Cold Spectrum isolation | PASS, 6/6 |
| Cold canonical no-op | PASS, 27/27 |
| C13 lifecycle/cache | PASS, 76/76 |
| Leakage/Spectrum independence | PASS, 23/23 |
| C13 API | PASS, 94/94 |
| Frontend static/behavior | PASS, 2/2 |
| Playwright syntax/support/help | PASS |
| Skills/vanilla/docs/diff | PASS |

Product/test checkpoint:
`aebd6f96158caa1917de334c1d61abe6ca8ca950`
(`feat: добавить Leakage для Spectrogram`). Contract/probe checkpoint:
`5ef6ce7167039753711badfe68802f94bb8a2849`.

Runtime E2E, push, deployment и merge не выполнялись. Локальный Engee gate
проходит findpeaks 16/16 и затем честно падает из-за отсутствующего EngeeDSP.
Prod real/complex probe подтвердил default=0.5, endpoints, deterministic
power, invariant grids, option-order invariance и permissive Bool delta;
product Bool отклоняет до dispatch.

## Следующий узкий кандидат

Spectrogram `Reassign` исследуется отдельно как возможный boolean. До evidence
и successor ADR он не входит в payload/UI. TimeResolution остаётся
заблокирован ENGEE-20260801-003; app slider display scale Leakage остаётся
неподтверждённой presentation detail и не меняет normalized product contract.

## Источники

- [DEC-20260801-019](../decisions/DEC-20260801-019-spectrogram-leakage.md)
- [Prod Leakage probe](../../agents/reports/spectrogram-leakage-engeedsp-contract-probe-20260801.md)
- [UI/API specification](../specifications/signal-visibility-and-plots.md)
- [Mathematics](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
