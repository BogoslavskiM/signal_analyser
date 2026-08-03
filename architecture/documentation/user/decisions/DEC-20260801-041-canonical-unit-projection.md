# DEC-20260801-041: canonical unit projection

ID: `DEC-20260801-041`
Дата: `2026-08-01`
Статус: accepted
Implementation: locally complete and ordinary-verified; not deployed

Supersedes: только `stored_only` effect шести unit fields и conversion details
DEC-040. Canonical state, validation, provider и plot contracts предыдущих
решений сохраняются.

## Контекст

Milestone 3 должен последовательно применять сохранённые настройки. Официальная
документация Signal Analyzer уточняет, что выбор Time/Frequency units не
пересчитывает и не меняет plot. Это display/input projection вокруг canonical
seconds/Hz. Поэтому unit cascade можно реализовать без нового EngeeDSP вызова,
raw-cache identity или Plotly render.

## Scope

Решение применяет ровно шесть fields:

- `time.units`;
- `spectrum.frequency_units`;
- `spectrogram.time_units`;
- `spectrogram.frequency_units`;
- `persistence.time_units`;
- `persistence.frequency_units`.

Остальные stored-only/blocked fields не меняют effect status. Time Y Limits,
Link Time, Spectrum Y Limits/resolution aggregate, Spectrogram Scale и все
Persistence computation/presentation поля остаются отдельными cascades.

## Canonical factors

Backend и API продолжают хранить/принимать только seconds и Hz. Exact factors:

```text
picoseconds  = 1e-12 s
nanoseconds  = 1e-9 s
microseconds = 1e-6 s
milliseconds = 1e-3 s
seconds      = 1 s
minutes      = 60 s
hours        = 3600 s
days         = 86400 s
years        = 31556952 s  # MATLAB fixed-length year, 365.2425 days

cycles_per_year   = 1 / 31556952 Hz
cycles_per_day    = 1 / 86400 Hz
cycles_per_hour   = 1 / 3600 Hz
cycles_per_minute = 1 / 60 Hz
millihertz        = 1e-3 Hz
hertz             = 1 Hz
kilohertz         = 1e3 Hz
megahertz         = 1e6 Hz
gigahertz         = 1e9 Hz
terahertz         = 1e12 Hz
```

Canonical → display делит base value на factor. Display → canonical умножает
на factor. Signed zero перед отправкой становится `0`. Frontend отображает не
более 12 significant digits, но никогда не отправляет округлённую label-строку
повторно без пользовательского commit. Backend не получает `units` внутри
range/resolution value и не доверяет client labels.

## Projection map

| Unit field | Converted controls/readouts in its active menu |
| --- | --- |
| `time.units` | `time.x_limits` in Time |
| `spectrogram.time_units` | projection alias `time.x_limits`; specified `spectrogram.time_resolution.seconds` |
| `persistence.time_units` | specified `persistence.time_resolution.seconds` |
| `spectrum.frequency_units` | `spectrum.frequency_limits`; specified `spectrum.rbw.hz`; `spectrum.frequency_resolution` when available |
| `spectrogram.frequency_units` | `spectrogram.frequency_limits`; `spectrogram.actual_rbw` when available |
| `persistence.frequency_units` | `persistence.frequency_limits`; `persistence.rbw` when available |

Window Length и DFT Points остаются samples/points и не конвертируются.
Power/Y/Density limits не конвертируются этим cascade.

Readouts продолжают приходить от Backend в canonical Hz. Пока их status равен
`unavailable`, Frontend показывает прежний placeholder без числового значения.
После будущего provider cascade Frontend применит тот же projection без
frontend-derived RBW.

## Backend contract

- Все шесть preferences остаются typed per-Display enum authority.
- Их catalog status становится `effective_presentation`,
  `effect_reason=""`; option enums и API wire не меняются.
- Canonical unit change — passive transaction: +1 global revision, полный
  settings document, zero provider/query/cache/plot/Measurements/Peaks delta.
- Equal change — cold no-op. 409/422 и one replay сохраняют DEC-040 envelope.
- Новый Display получает seconds/hertz defaults. A/B независимы; Clear и source
  replacement сохраняют units; close удаляет их с Display.
- Backend serializer не масштабирует canonical field/readout values. Это
  исключает двойную конверсию и сохраняет один API contract.

## Frontend contract

- Renderer выбирает factor только из закрытого field-id/unit registry.
- Unit change сразу перерисовывает только Settings inspector целевого Display;
  `render()`, `draw()`, `Plotly.react`, `Plotly.relayout` и plot state event не
  вызываются.
- Canonical accepted document хранится отдельно от display draft. При
  unit-change без user value commit существующий canonical range/resolution не
  отправляется повторно.
- При пользовательском commit Frontend преобразует display number в canonical
  и отправляет прежний exact value shape (`{min,max}`, `{mode,seconds}` либо
  `{mode,hz}`). Backend остаётся единственным владельцем bounds и cross-field
  validation.
- Unit A never converts drafts/document B. Late A response может повысить
  global revision, но не меняет active B controls.
- Stable selectors не меняются. Labelled suffix рядом с каждым projected input
  показывает выбранную unit label; accessible name включает label и unit.

## Проверка

Backend ordinary matrix:

- exact six effect statuses/reasons and unchanged canonical values;
- +1/no-op/409/422, A/B/Clear/source/close;
- zero provider/query/cache/plot/Measurements/Peaks delta.

Frontend ordinary matrix:

- every exact factor in both directions, including cycles/year and years;
- 12-significant-digit display without unintended commit/round-trip drift;
- optional ranges and specified resolution values; Auto/null unchanged;
- Time versus Spectrogram projection alias uses the active menu unit;
- A/B and late-response isolation;
- no plot state event or Plotly/render call.

E2E не запускается отдельно для unit fields. Они добавляются в следующий
coherent milestone-3 inspector/graph workflow после ordinary gate и следующего
graph-affecting cascade.

## Источники

- https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- https://www.mathworks.com/help/matlab/ref/duration.html
- https://www.mathworks.com/help/matlab/ref/duration.years.html
- DEC-040 и settings application research handoff.
