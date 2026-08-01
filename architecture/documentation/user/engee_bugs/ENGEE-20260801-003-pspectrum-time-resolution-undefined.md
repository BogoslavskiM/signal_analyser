# ENGEE-20260801-003: pspectrum TimeResolution вызывает отсутствующий validator

ID: `ENGEE-20260801-003-pspectrum-time-resolution-undefined`
Status: confirmed
First seen: 2026-08-01
Last verified: 2026-08-01
Affected surface: EngeeDSP runtime API

## Environment

- server/environment: Engee prod MIND
- Julia: `1.12.4`
- package: `EngeeDSP`, platform Manifest version `0.72.0`, UUID
  `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`
- source tree: `/usr/local/ijulia-core/packages/EngeeDSP/XobDm/`
- app checkpoint: `9c7cd70`; дефект изолирован чистым in-memory вызовом вне app

## Prerequisites

Официальная Engee-документация `pspectrum` перечисляет name-value argument
`TimeResolution` для time-frequency representations:
https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html

## Minimal safe reproduction

```julia
import EngeeDSP
fs = 100.0
t = collect(0:255) ./ fs
x = cos.(2pi * 10 .* t)
EngeeDSP.Functions.pspectrum(
    x, t, "spectrogram", "TimeResolution", 0.64
)
```

## Expected

Публичная функция проверяет конечное положительное TimeResolution и возвращает
спектрограмму с соответствующей сегментной сеткой либо documented validation
error для недопустимого значения.

## Actual

```text
UndefVarError: validateTimeResolution not defined in EngeeDSP.Functions
```

Stack anchor:
`EngeeDSP.Functions.parseNVPairInputs`,
`dsp_functions/toolbox_functions/signal/parseNVPairInputs.jl:172`.

## Frequency

Детерминированно воспроизведено с `TimeResolution` отдельно и совместно с
`OverlapPercent` на том же prod pod.

## Impact and severity

Medium. Опция блокирует перенос настройки временного разрешения для
Spectrogram/Persistence. Текущий Spectrum Frequency Limits не затронут.

## Isolation evidence

- `isdefined(EngeeDSP.Functions, :validateTimeResolution)` вернул `false`.
- `FrequencyResolution` и `OverlapPercent` успешно работают на том же input,
  функции, pod и session.
- Ошибка возникает в parser EngeeDSP до вычисления; Genie, приложение,
  repository tests, model API и network payload не участвуют.

## Workaround

Не публиковать TimeResolution control и не передавать option до upstream fix.
Hand-rolled STFT запрещён; обход не закрывает дефект.

## Regression test/link

Probe record:
[`../../agents/reports/time-frequency-engeedsp-contract-probe-20260801.md`](../../agents/reports/time-frequency-engeedsp-contract-probe-20260801.md).
После исправления нужен target contract для valid value, invalid finite/range
values и совместимости с OverlapPercent.

## Owner/upstream ticket

EngeeDSP runtime owner; внешний ticket пока не создан.

## Resolution/fixed version

Не исправлено на дату проверки.

## Append-only history

### 2026-08-01 — confirmed

Minimal reproduction повторён; missing symbol изолирован, положительные
контроли FrequencyResolution/OverlapPercent прошли.
