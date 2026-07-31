# ENGEE-20260731-002-findpeaks-npeaks-casing: неверный регистр NPeaks в reference

ID: `ENGEE-20260731-002-findpeaks-npeaks-casing`
Status: confirmed
First seen: 2026-07-31
Last verified: 2026-07-31
Affected surface: EngeeDSP documentation

## Environment

- server/environment: Engee prod MIND
- package: `EngeeDSP`, UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`
- app branch + SHA: `neuro_signal_analyser_cascade`, evidence checkpoint
  `ab87889`

## Prerequisites

Официальный reference:
<https://engee.com/helpcenter/stable/en/func-dsp-measurements-and-feature-extraction/func-findpeaks.html>.

## Minimal safe reproduction

```julia
import EngeeDSP.Functions: findpeaks
y = Float64[0, 1, 0, 2, 0]
findpeaks(y; Npeaks = 1, out = :data)
```

Контрольный вызов с `NPeaks = 1` успешно возвращает data result.

## Expected

Имя keyword в reference совпадает с регистрозависимым публичным API. Если
reference показывает `Npeaks`, этот keyword принимается функцией.

## Actual

Раздел аргумента reference использует `Npeaks`, но runtime отклоняет его:

```text
ArgumentError: Function `findpeaks`: Invalid named argument `Npeaks`.
Possible argument names are: ... `NPeaks` ...
```

## Frequency

Воспроизводится детерминированно на подтверждённом prod pod.

## Exact error/log/stack trace

См. exact `ArgumentError` выше; ошибка возникает до математического расчёта.

## Impact and severity

Low. Пользователь, копирующий spelling из reference, получает ошибку вызова.
Правильный workaround однозначен.

## Isolation evidence

- `Npeaks=1` отклоняется тем же загруженным методом.
- `NPeaks=1` работает на том же input и pod.
- `methods(findpeaks)` показывает keyword `NPeaks` у overloads `y,x` и `y,fs`.
- Ошибка не зависит от Signal Analyser, Genie, network или test harness.

## Workaround

Использовать точное регистрозависимое имя `NPeaks`.

## Regression test/link

Evidence matrix: `test/engee/findpeaks_contract_matrix.jl`.

## Owner/upstream ticket

EngeeDSP documentation owner; внешний ticket пока не создан.

## Resolution/fixed version

Не исправлено на дату проверки.

## Append-only history

### 2026-07-31 — confirmed

Official reference/runtime spelling mismatch изолирован prod MIND probe и
положительным контролем `NPeaks`.
