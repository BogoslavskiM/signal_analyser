# DEC-20260801-022: Display-local Spectrogram Frequency Scale

ID: `DEC-20260801-022`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned in Cascade 16; not deployed
Supersedes: только exact three-key shape и Frequency Scale out-of-scope clauses
в DEC-021; все Frequency Limits semantics DEC-021 сохраняются

## Контекст

MathWorks документирует Linear/Log Frequency Scale для real Spectrogram и
запрещает Log для complex centered two-sided input. Existing saved MATLAB
evidence подтверждает locked Linear для complex Spectrogram; новый GUI-сценарий
не создавался, потому что Command Window содержал незавершённый ввод и безопасно
не трогался.

Frequency Scale меняет только представление уже рассчитанной Spectrogram
матрицы. Она не является EngeeDSP option и не должна менять provider, raw
query/cache identity, частотные bins или power. Frontend-only preference при
этом недостаточна: canonical Display state, A/B, Clear и revision recovery
принадлежат backend.

## Решение

Cascade 16 расширяет exact settings object:

```json
{
  "spectrogram_settings": {
    "overlap_percent": 50.0,
    "leakage": 0.5,
    "frequency_limits": null,
    "frequency_scale": "linear"
  }
}
```

`frequency_scale` — requested Display-local enum, строго lowercase
`"linear"|"log"`, default `"linear"`. Missing/extra key, non-string,
неизвестное значение или иной регистр дают atomic field-level 422. Equal full
object — no-op; changed requested scale — одна revision. Root зеркалирует
active Display; A/B независимы; новый Display получает Linear; Clear сохраняет
requested preference.

Backend публикует:

```json
{
  "frequency_scale": {
    "requested": "log",
    "effective": "linear",
    "available": ["linear"]
  }
}
```

Точные состояния:

| Analysis source | requested | effective | available |
| --- | --- | --- | --- |
| отсутствует | любое | `null` | `[]` |
| real one-sided | любое | равно requested | `["linear","log"]` |
| complex centered | любое | `"linear"` | `["linear"]` |

Log остаётся допустимым requested intent при complex или пустом source и не
вызывает 422. Real → complex сохраняет requested Log, но effective становится
Linear; complex → real автоматически возвращает effective Log без второго
request. N<2 с известным source сохраняет topology-derived effective metadata и
не вызывает provider. Eligibility определяется только analysis source, не всем
membership и не Spectrum policy.

Scale полностью исключена из `SignalSpectrogramQuery`, raw cache key, provider
options и Engee calls. Scale-only mutation не вызывает и не прогревает Spectrum
или Spectrogram provider и не меняет cache. При холодном cache mutation
публикует typed-empty plot с metadata; обычный последующий GET может
материализовать data. Combined scale + Leakage/Overlap/Frequency Limits
пересчитывается только из-за вычислительного поля. Backend `x/y/z` идентичны
между Linear/Log.

Frontend добавляет один select и read-only effective state в существующую
Spectrogram section, не создавая вкладку или graph host. Select показывает
requested; `available` определяет enabled state, `effective` — Plotly
`yaxis.type`. Для effective Log frontend клонирует только presentation `y` и
заменяет nonpositive coordinate на половину минимального положительного bin;
authoritative payload/state и `z` не мутируют, bins не фильтруются и не
переставляются. Empty `y` не требует floor; non-empty axis без положительного
bin является stable plot error, а не поводом придумывать epsilon. Эта политика
относится только к Spectrogram и не меняет Spectrum DEC-016.

Select change отправляет один полный четырёхключевой `/api/view` target. 422
восстанавливает последний accepted object и metadata без retry. Первый 409
rebase/replay выполняется один раз с последним полным desired target; второй
409 принимает canonical server state, показывает error и прекращает replay.
Source-driven effective change не создаёт frontend request.

## Явные отличия от MATLAB и Spectrum

- Сохранение requested Log через complex source — reversible product policy;
  прямое MATLAB persistence evidence отсутствует.
- `available` — backend-authoritative portability contract, чтобы frontend не
  угадывал topology.
- Spectrum запрещает Log при любом visible complex member и не имеет client
  floor. Spectrogram смотрит только на analysis source и использует отдельную
  presentation-only zero-bin policy.

## Вне scope

Power Limits, Fit Colormap, Frequency units, shared spectral band/scale,
MinThreshold, Reassign, TimeResolution, Persistence, session import/export и
любое изменение EngeeDSP/Project.toml. Power Limits переносятся в C17 research.

## Проверка

Backend: dedicated typed enum/parser, exact four-key snapshots, metadata table,
A/B/Clear/source real↔complex/N<2, no-op/+1/422/409, zero provider/cache
mutation and combined-setting recompute. Frontend: select/effective/error,
authoritative availability, transient floor without payload mutation,
accepted/bounded replay and Spectrum/C15 preservation. E2E: real
Linear→Log→Linear, conditional complex retained Log/effective Linear, zero-bin,
source/A/B/Clear and exact cleanup. Runtime claim запрещён до exact deployment.

## Источники

- MathWorks Explore Signals:
  https://www.mathworks.com/help/signal/ug/explore-signals.html
- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- MathWorks Customize Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- [DEC-021 Frequency Limits](DEC-20260801-021-spectrogram-frequency-limits.md)
- [MATLAB Researcher C16 handoff](../../agents/handoff/matlab-researcher-cascades.md)
