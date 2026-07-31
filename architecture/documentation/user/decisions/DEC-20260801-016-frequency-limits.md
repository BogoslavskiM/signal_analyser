# DEC-20260801-016: редактируемые Frequency Limits для Spectrum

ID: `DEC-20260801-016`
Дата: 2026-08-01
Статус: accepted
Supersedes: exact three-key `spectrum_settings` shape in
`DEC-20260801-015`; all other DEC-015 behavior remains active
Implementation: planned in Cascade 10; not deployed

## Контекст

Референсные изображения показывают поля Spectrum `F min` и `F max`. Сценарий
SA-GRAPH-002 подтвердил, что MATLAB Signal Analyzer R2024b сохраняет Min `0`
при переключении вещественного Spectrum в Log и не раскрывает применяемый
renderer положительный предел. SA-GRAPH-004 не смог надёжно создать complex
input из-за потери фокуса/усечения ввода, поэтому новые complex UI-утверждения
не делаются; запрет Log для complex остаётся документированным направлением и
уже принятым переносимым контрактом.

Prod-probe `EngeeDSP.Functions.pspectrum` установил, что `FrequencyLimits`
создаёт новую плотную сетку с точными границами, а не фильтрует готовые bins.
Частичное пересечение с Nyquist обрезается provider, полностью внешний,
неупорядоченный или неfinite интервал отклоняется. Вещественный домен равен
`[0, Fs/2]`, комплексный centered домен — `[-Fs/2, Fs/2]`.

## Альтернативы

1. Обрезать готовые arrays во frontend — неэквивалентно provider contract и
   создаёт клиентскую DSP-логику.
2. Хранить всегда только effective clipped limits — теряет пользовательский
   intent и усложняет разные sample rates.
3. Хранить Auto либо явный requested interval, валидировать его по analysis
   source и пересекать с topology каждого secondary trace.

## Решение

Выбран вариант 3. Полный строгий wire-объект каждого Display расширяется до
четырёх ключей:

```json
{
  "scale": "db|linear",
  "frequency_scale": "linear|log",
  "leakage": 0.5,
  "frequency_limits": null
}
```

`frequency_limits=null` означает Auto. Явное значение имеет точную форму:

```json
{
  "min_hz": 0.0,
  "max_hz": 24000.0,
  "units": "Hz"
}
```

Root snapshot зеркалит active Display; каждый `displays[]` хранит собственный
полный объект. Новый Display получает Auto. Clear сохраняет настройку. Display
A/B независимы. `/api/view` по-прежнему принимает только полный
`spectrum_settings`, применяет его атомарно и увеличивает revision ровно один
раз только при фактическом изменении.

Явные границы должны быть JSON numbers, но не Bool, конечными, строго
возрастающими и целиком находиться в topology domain текущего analysis source.
Product отклоняет частично и полностью внешние requested limits с field-level
422 вместо неявной provider canonicalization. `units` строго равно `Hz`.
Сохранённое состояние всегда содержит requested interval, а не provider-clipped
значение.

При смене analysis source явный интервал сохраняется, если полностью допустим
для нового source; иначе атомарно сбрасывается в Auto. Clear без source хранит
последний intent. Первый re-add применяет то же preserve-if-valid/Auto правило.
Ноль или один отсчёт Time ROI возвращает typed empty Spectrum без provider;
валидность Frequency Limits определяется по sample rate/topology signal, а не
по числу отсчётов ROI.

Для analysis source Auto означает полный topology domain. Для явного режима
effective limits analysis source совпадают с requested. Каждый secondary trace
получает пересечение Display limits со своим topology domain: непустое
пересечение передаётся EngeeDSP как `FrequencyLimits`, отсутствие пересечения
даёт typed empty trace без provider. Никаких FFT, post-hoc crop, zero-padding,
resampling или fallback нет.

`FrequencyLimits` входит в typed query и raw spectrum cache key вместе с
Leakage/topology/ROI. `scale` и `frequency_scale` остаются presentation-only.
Backend публикует внутри `plots.spectrum.frequency_limits` canonical metadata:

```json
{
  "mode": "auto|explicit",
  "requested": null,
  "effective": {"min_hz": 0.0, "max_hz": 24000.0, "units": "Hz"}
}
```

В explicit режиме `requested` равен сохранённому объекту. Для пустого Display
`effective=null`. Frontend не выводит Nyquist из samples и не режет arrays.

Spectrum settings остаются внутри существующей вкладки Display; четвёртая
вкладка не создаётся. Два native текстовых поля используют stable test IDs
`spectrum-frequency-min-input` и `spectrum-frequency-max-input`, а ошибка —
`spectrum-frequency-limits-error`. В Auto они показывают backend effective
values; edit создаёт explicit intent. Commit происходит по change/blur/Enter,
но одно пользовательское изменение должно дать один полный request. Equal edit
является no-op; invalid draft и 422 возвращают точное прежнее canonical
состояние. Отдельное поле или вычисляемое значение Log floor не добавляется.

Для вещественного Log сохранённый Min `0` допустим: Plotly выбирает
положительный предел рендера без переписывания state. Любой visible complex
signal сохраняет ранее принятое атомарное ограничение `frequency_scale=log`.

## Последствия

- DEC-015 остаётся источником Spectrum math/ROI/defaults, но его exact
  three-key wire shape заменён этим four-key contract.
- UI повторяет требуемые F min/F max без multi-layout и без клиентского DSP.
- Requested intent, analysis-source validation и secondary intersections
  разделены явно; mixed sample rates детерминированы.
- Actual RBW, bandwidth mode, manual frequency units, Spectrogram,
  Persistence и numeric Log floor остаются вне Cascade 10.
- До реализации и тестов status traceability — `planned`; runtime E2E,
  deployment и merge требуют отдельных оснований.

## Источники

- MathWorks, Explore Signals:
  https://www.mathworks.com/help/signal/ug/explore-signals.html
- MathWorks, `pspectrum`:
  https://www.mathworks.com/help/signal/ref/pspectrum.html
- Engee, `pspectrum`:
  https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html
- Internal provider probe:
  [`../../agents/reports/frequency-limits-engeedsp-contract-probe-20260801.md`](../../agents/reports/frequency-limits-engeedsp-contract-probe-20260801.md)
- Предыдущее решение:
  [DEC-20260801-015](DEC-20260801-015-spectrum-roi-default-settings.md)
