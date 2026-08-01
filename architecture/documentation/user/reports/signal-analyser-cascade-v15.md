# Signal Analyser: Cascade 15 Spectrogram Frequency Limits

Status: implemented-and-locally-verified; not-deployed

## Результат

Spectrogram settings расширены до exact object
`{overlap_percent, leakage, frequency_limits}`. `frequency_limits=null` означает
Auto; explicit intent — точный `{min_hz,max_hz,units:"Hz"}`. Значения конечны,
не Bool, строго возрастают и полностью лежат в topology analysis source: real
`[0,Fs/2]`, complex centered `[-Fs/2,Fs/2]`. Spectrum state независим.

Auto/Explicit входят в typed query и raw-cache identity. EngeeDSP получает
Leakage, OverlapPercent, TwoSided и затем FrequencyLimits. Возвращённая explicit
ось должна быть строго возрастающей, лежать внутри interval и сохранять обе
границы с численной tolerance. Клиент не выполняет crop, FFT/STFT или fallback.
Metadata `mode/requested/effective` сохраняется и для short typed-empty result.

Frontend показывает backend-effective Auto значения и хранит per-Display pair
draft. Переход F min → F max не отправляет request; Enter либо выход фокуса из
пары отправляет ровно один полный объект. Очистка обоих полей возвращает Auto.
422 откатывает accepted state, первый 409 повторяет один latest intent, второй
409 завершает replay и показывает ошибку.

Три read-only audit pass обнаружили и закрыли промежуточный blur-request,
устаревшие C12/C13 E2E shapes и неполный cleanup Spectrum. Финальная структура
имеет одну Spectrogram render/bind реализацию и полный natural-focus regression.

## Проверки

| Проверка | Результат |
| --- | --- |
| Backend full gate | PASS, 1263/1263 |
| C15 typed/lifecycle matrix | PASS, 34/34 |
| Frontend static/behavior | PASS, 2/2 |
| Julia parse | PASS |
| Playwright syntax/support/help | PASS |
| Skills/vanilla/docs/diff | PASS |
| Local Engee contract | findpeaks 16/16 PASS; EngeeDSP package absent |

Product/test checkpoint:
`5602ccb20c773c00bac29bb66d8e602a866114c9`
(`feat: добавить границы частот Spectrogram`). Contract/probe checkpoint:
`034ccec1a9b26d2a1892be85b094c9b0519a07f2`.

Runtime E2E, push, deployment и merge не выполнялись. Prod real/complex probe
является capability evidence. Плавающий Nyquist-touch edge остаётся suspected
`ENGEE-20260801-005`; strict product validation и output guard не допускают его
в опубликованный result.

## Следующий узкий кандидат

Spectrogram Frequency Scale рассматривается отдельно как presentation-only
Linear/Log state. Он не входит в трёхключевой C15 contract и требует successor
decision. Power Limits остаются отдельным более крупным исследованием.

## Источники

- [DEC-20260801-021](../decisions/DEC-20260801-021-spectrogram-frequency-limits.md)
- [Prod Frequency Limits probe](../../agents/reports/spectrogram-frequency-limits-engeedsp-contract-probe-20260801.md)
- [UI/API specification](../specifications/signal-visibility-and-plots.md)
- [Mathematics](../specifications/mathematics/signal-analysis.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
