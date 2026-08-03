# DEC-20260801-040: полные меню и per-Display хранение настроек

ID: `DEC-20260801-040`
Дата: `2026-08-01`
Статус: accepted
Implementation: product-complete locally; ordinary verification passed;
production E2E prepared but not run; not deployed

Supersedes in part:

- DEC-020 — только запрет UI/state для Spectrogram Reassign;
- DEC-026 — только запрет UI/state для Persistence Overlap;
- DEC-027 — только запрет UI/state для Persistence Frequency Limits;
- DEC-028 — только запрет UI/state для пользовательского Overlap `0`.

Provider, resource и prerequisite запреты этих решений сохраняются до
отдельного milestone-3 решения о применении.

## Контекст

Пользователь разделил работу на два разных milestone: сначала приложение
должно показать полные меню, валидировать и сохранять каждую настройку, затем
отдельно научить графики и математику применять новые значения. Уже работающие
Time/Spectrum/Spectrogram/Persistence настройки нельзя временно отключать или
переписывать как исторически не применённые.

Официальная документация MathWorks и живое исследование Signal Analyzer R2024b
подтвердили условные группы Time, Spectrum, Spectrogram и Persistence Spectrum.
Значения конкретного исследовательского сигнала не являются defaults.

## Решение

### Граница milestone

- Существующие эффективные настройки сохраняют принятые ранее provider,
  cache, math и frontend-presentation эффекты.
- Новые поля получают typed per-Display runtime state, валидацию и полный UI,
  но не попадают в provider query, cache identity, plot payload или Plotly
  layout/data до milestone 3.
- У новых полей UI показывает `Сохранено — пока не применяется` и конкретную
  capability-причину. Это не disabled decoration: source-independent значение
  можно менять и хранить.
- `View`/`active_plot` остаётся эффективной навигацией и не дублируется в новом
  settings store.
- `Fit Colormap`, zoom, cursors, Clear, Statistics и Find Peaks являются
  actions, а не сохраняемыми scalar settings; этот ADR не превращает их в
  значения.
- Jet остаётся milestone 4 и не добавляется скрытым setting.

Под «сохранением» понимается состояние Display в текущей runtime session. Оно
переживает переключение Display и plot, Clear и несвязанные мутации. Disk/file
session persistence, import/export и новый storage dependency не включаются.

### OOP-модель

Каждый `SignalAnalyserDisplayState` получает один immutable typed
`SignalDisplayStoredSettings` только для новых полей. Существующие
`SignalTimeLimits`, `SignalSpectrumSettings`, `SignalSpectrogramSettings`,
`SignalPersistenceSettings`, measurement selection и Peaks state остаются
отдельными эффективными value objects.

Backend добавляет:

- `SignalDisplayStoredSettings` с typed вложенными Time/Spectrum/Spectrogram/
  Persistence preferences;
- `SignalSettingsFieldDefinition` и immutable `SignalSettingsCatalog`;
- `UpdateSignalSettingCommand{T}`;
- `SignalSettingsService`, который строит prospective Display, валидирует,
  сериализует полный settings document и только затем публикует его под
  существующим aggregate lock;
- pure serializer settings payload; routes остаются mapping-only.

Diagnostics не хранятся в domain state. Ошибки и warnings выводятся из catalog,
command и текущего Display/source context.

### API

Read-only endpoint:

```text
GET /api/settings?display_id=<stable-display-id>
```

Mutation endpoint:

```text
POST /api/settings
{
  "state_revision": 42,
  "display_id": "display-1",
  "field_id": "spectrogram.time_resolution",
  "value": {"mode":"specified","seconds":0.25}
}
```

Request имеет exact keyset. `display_id` обязателен и устраняет race active
Display. `field_id` выбирается из закрытого catalog; `value` обязан точно
соответствовать kind поля. Frontend не отправляет label, units, bounds,
capability или произвольный settings object.

GET возвращает полный authoritative document целевого Display. Root имеет
exact keyset `state_revision, display_id, groups, sections, fields, readouts`:

```text
{
  "state_revision": 42,
  "display_id": "display-1",
  "groups": [{"id":"time","label":"Time","visible":true}],
  "sections": [{
    "id":"time.time_limits",
    "group":"time",
    "label":"Time Limits",
    "order":20,
    "visible":true
  }],
  "fields": [{
    "id":"time.units",
    "group":"time",
    "section":"time.time_limits",
    "label":"Time units",
    "kind":"enum",
    "control_kind":"combobox",
    "value":"seconds",
    "default":"seconds",
    "units":"",
    "min":null,
    "max":null,
    "step":null,
    "options":[{"value":"seconds","label":"s","disabled":false}],
    "checked_value":null,
    "unchecked_value":null,
    "visible":true,
    "enabled":true,
    "effect_status":"stored_only",
    "effect_reason":"milestone_3",
    "error":"",
    "warning":""
  }],
  "readouts": [{
    "id":"spectrogram.actual_rbw",
    "group":"spectrogram",
    "section":"spectrogram.frequency_resolution",
    "label":"Actual RBW",
    "value":null,
    "units":"Hz",
    "status":"unavailable",
    "reason":"milestone_3",
    "visible":false
  }]
}
```

Каждый group, section, field, option и readout имеет показанный exact keyset.
Group keyset: `id,label,visible`; section keyset:
`id,group,label,order,visible`; option keyset: `value,label,disabled`.
Field keyset:
`id,group,section,label,kind,control_kind,value,default,units,min,max,step,options,checked_value,unchecked_value,visible,enabled,effect_status,effect_reason,error,warning`.
Readout keyset:
`id,group,section,label,value,units,status,reason,visible`.

Kinds: `boolean`, `enum`, `number`, `integer`, `optional_range`, `resolution`,
`power_bins`. `control_kind` является закрытым enum: `checkbox`, `combobox`,
`number`, `integer`, `range`, `resolution`, `power_bins`. Обычный boolean
использует `checkbox` и null mapping. Три `*.scale` остаются enum
`db|linear`, но используют `checkbox`, `checked_value="db"` и
`unchecked_value="linear"`; это единственный разрешённый enum-checkbox
mapping. Для остальных controls оба mapping-поля равны null.

Составные wire values закрыты:

- `optional_range`: только `null` либо exact `{min:<finite number>,
  max:<finite number>}`; `min < max`; единица задаётся field metadata;
- `spectrum.rbw`: exact `{mode:"auto",hz:null}` либо
  `{mode:"specified",hz:<finite > 0>}`;
- `spectrum.window_length`: exact `{mode:"auto",samples:null}` либо
  `{mode:"specified",samples:<integer >= 2>}`;
- `spectrum.nfft`: exact `{mode:"auto",nfft:null}` либо
  `{mode:"specified",nfft:<integer >= 2>}`; при specified Window Length
  также требуется `nfft >= window_length.samples`;
- `spectrogram.time_resolution` и `persistence.time_resolution`: exact
  `{mode:"auto",seconds:null}` либо
  `{mode:"specified",seconds:<finite > 0>}`;
- `persistence.power_bins`: exact `{mode:"auto",count:null}` либо
  `{mode:"specified",count:<integer 20..1024>}`.

Лишний/пропущенный ключ, Bool вместо числа/целого, nonfinite и несовместимая
пара `mode`/payload дают 422. `effect_status` закрыт:
`effective`, `effective_presentation`, `stored_only`, `blocked_contract`,
`blocked_provider`, `blocked_prerequisite`, `blocked_resource`.
`effect_reason` закрыт текущим catalog: `""`, `milestone_3`,
`milestone_3_contract`, `ENGEE-20260801-003`, `ENGEE-20260801-004`,
`DEC-20260801-026`, `DEC-20260801-027`. Readout status — `available` либо
`unavailable`; в milestone 2 все три derived readout имеют null,
`unavailable`, `milestone_3`.

POST 200 возвращает:

```text
{"state": <full authoritative application snapshot>,
 "settings": <full target-Display settings document>}
```

409 сохраняет существующий application envelope и добавляет settings document;
exact keyset:

```text
{"ok":false,
 "code":"stale_state",
 "error":{"code":"stale_state","message":"State revision is stale"},
 "state":<full authoritative application snapshot>,
 "current":<тот же full authoritative application snapshot>,
 "settings":<full target-Display settings document>}
```

422 имеет exact keyset:

```text
{"ok":false,
 "code":"invalid_setting",
 "field_id":<request field id or empty string when it cannot be parsed>,
 "error":{"code":"invalid_setting",
          "message":<nonempty string>,
          "field_id":<то же значение>},
 "settings":<full unchanged target-Display settings document or null only
             when display_id cannot be resolved>}
```

Changed canonical value увеличивает глобальную `state_revision` ровно один
раз. Equal canonical value — HTTP 200 cold no-op без revision/provider/cache/
plot delta. Stale revision использует существующий 409 full-state envelope;
frontend refetch settings целевого Display и может replay последний valid
intent ровно один раз. Второй 409 завершает retry.

Wrong type, nonfinite number, unknown field, malformed discriminated value или
semantic violation дают `422 invalid_setting` с `field_id` и полным accepted
settings document. Ничего не публикуется. Backend не хранит invalid draft;
frontend сохраняет исходный текст в поле и показывает inline error.

### Единая mutation authority

`/api/settings` является write endpoint инспектора. Для уже эффективных field
ID `SignalSettingsService` не пишет копию в `SignalDisplayStoredSettings`, а
делегирует существующему typed domain command/value object и затем строит
document из него. `/api/view` остаётся совместимым facade для уже выпущенного
UI/API, но использует те же validators, тот же aggregate lock и ту же
глобальную revision. Одновременные мутации через оба endpoint разрешаются
только optimistic concurrency: первый canonical commit получает +1, второй со
старой revision получает описанный 409. Replay делает только инициировавший
клиент и не более одного раза.

Нет кнопки Apply. Parseable value коммитится после обычного control commit;
незавершённые `-`, `1e`, `1e-` остаются локальными. Paired inputs образуют одно
atomic range value и коммитятся один раз по Enter или выходу за пределы пары.

### Общие enums и canonical units

Time unit values и labels:

```text
picoseconds=ps, nanoseconds=ns, microseconds=μs, milliseconds=ms,
seconds=s, minutes=minutes, hours=hours, days=days, years=years
```

Frequency unit values и labels:

```text
cycles_per_year=cycles/year, cycles_per_day=cycles/day,
cycles_per_hour=cycles/hour, cycles_per_minute=cycles/minute,
millihertz=mHz, hertz=Hz, kilohertz=kHz, megahertz=MHz,
gigahertz=GHz, terahertz=THz
```

Ranges сериализуются только в base units: seconds, Hz, dB или percent. Unit
selector меняет menu input/output conversion и labels, но не переписывает
canonical range и сам по себе не меняет plot.

Product conversion constants exact: `ps=1e-12 s`, `ns=1e-9 s`, `μs=1e-6 s`,
`ms=1e-3 s`, `minute=60 s`, `hour=3600 s`, `day=86400 s`,
`year=31556952 s` (MATLAB fixed-length year, 365.2425 days). Frequency conversions являются
обратными этим durations; `mHz=1e-3 Hz`, `kHz=1e3 Hz`, `MHz=1e6 Hz`,
`GHz=1e9 Hz`, `THz=1e12 Hz`. Canonical serialization не округляет; UI display
использует не более 12 significant digits и никогда не отправляет
отформатированную label-строку. `samples` не входит в Time enum milestone 2:
текущий продукт принимает только сигналы с заданным или выведенным sample
rate; sample-index mode требует отдельного контракта.

## Exact field catalog

`effective` означает уже принятое backend применение. `effective_presentation`
означает сохранение существующего frontend эффекта при переносе значения в
backend. Остальные значения только хранятся.

### Stable groups, sections и readouts

Порядок groups фиксирован: `display`, `time`, `spectrum`, `spectrogram`,
`persistence`. `display` видим всегда; из четырёх plot groups видим ровно
active plot group. Порядок sections задаётся числом `order` внутри group:

| Group | Ordered section IDs (label) |
| --- | --- |
| `display` | `display.view` (View) |
| `time` | `time.options` (Options), `time.time_limits` (Time Limits), `time.y_axis_limits` (Y-axis Limits), `time.linking` (Link Time) |
| `spectrum` | `spectrum.frequency_limits` (Frequency Limits), `spectrum.y_axis_limits` (Y-axis Limits), `spectrum.scale` (Scale), `spectrum.resolution_type` (Resolution Type), `spectrum.leakage` (Leakage), `spectrum.rbw` (RBW), `spectrum.window_options` (Window Options), `spectrum.frequency_resolution` (Frequency Resolution) |
| `spectrogram` | `spectrogram.time_limits` (Time Limits), `spectrogram.frequency_limits` (Frequency Limits), `spectrogram.power_limits` (Power Limits), `spectrogram.scale` (Scale), `spectrogram.leakage` (Leakage), `spectrogram.time_resolution` (Time Resolution), `spectrogram.frequency_resolution` (Frequency Resolution), `spectrogram.options` (Options) |
| `persistence` | `persistence.frequency_limits` (Frequency Limits), `persistence.power_limits` (Power Limits), `persistence.density_limits` (Density Limits), `persistence.scale` (Scale), `persistence.leakage` (Leakage), `persistence.time_resolution` (Time Resolution), `persistence.power_bins` (Power Bins), `persistence.frequency_resolution` (Frequency Resolution) |

Orders начинаются с 10 и увеличиваются на 10 в указанной последовательности.
Section видим тогда и только тогда, когда видим его group и в нём есть хотя
бы один visible field/readout. Один field имеет одну canonical section.
Повторное представление `time.x_limits` в Spectrogram — projection alias:
Backend возвращает тот же field ID/value один раз в `time.time_limits`, а
Frontend также проецирует его в `spectrogram.time_limits`; commit всегда
отправляет исходный `field_id="time.x_limits"`. Дубликат state не создаётся.

Derived readouts milestone 2 имеют exact IDs:

- `spectrum.frequency_resolution` в одноимённой section, label
  `Frequency Resolution`;
- `spectrogram.actual_rbw` в `spectrogram.frequency_resolution`, label
  `Actual RBW`;
- `persistence.rbw` в `persistence.frequency_resolution`, label `RBW`.

Все три сериализуются в canonical Hz как `value:null`, `units:"Hz"`,
`status:"unavailable"`, `reason:"milestone_3"`. Это явные недоступные
readouts, а не disabled editable settings. Frontend показывает placeholder
`Доступно после подключения расчёта`.

Field-to-section mapping exact:

- `display.view`: `display.show_legend`;
- `time.options`: `time.normalize_y`, `time.show_markers`;
- `time.time_limits`: `time.units`, `time.x_limits`;
- `time.y_axis_limits`: `time.y_limits`; `time.linking`: `time.link_time`;
- `spectrum.frequency_limits`: `spectrum.frequency_units`,
  `spectrum.frequency_limits`; `spectrum.y_axis_limits`: `spectrum.y_limits`;
- `spectrum.scale`: `spectrum.frequency_scale`, `spectrum.scale`;
- `spectrum.resolution_type`: `spectrum.resolution_type`;
  `spectrum.leakage`: `spectrum.leakage`; `spectrum.rbw`: `spectrum.rbw`;
- `spectrum.window_options`: `spectrum.window_length`, `spectrum.window`,
  `spectrum.sidelobe_attenuation_db`, `spectrum.overlap_percent`,
  `spectrum.nfft`;
- `spectrogram.time_limits`: `spectrogram.time_units` plus projection alias
  `time.x_limits`;
- `spectrogram.frequency_limits`: `spectrogram.frequency_units`,
  `spectrogram.frequency_limits`; `spectrogram.power_limits`:
  `spectrogram.power_limits`;
- `spectrogram.scale`: `spectrogram.frequency_scale`, `spectrogram.scale`;
  `spectrogram.leakage`: `spectrogram.leakage`;
- `spectrogram.time_resolution`: `spectrogram.time_resolution`,
  `spectrogram.overlap_percent`; `spectrogram.options`:
  `spectrogram.reassign`;
- `persistence.frequency_limits`: `persistence.frequency_units`,
  `persistence.frequency_limits`; `persistence.power_limits`:
  `persistence.power_limits`; `persistence.density_limits`:
  `persistence.density_limits`;
- `persistence.scale`: `persistence.frequency_scale`, `persistence.scale`;
  `persistence.leakage`: `persistence.leakage`;
- `persistence.time_resolution`: `persistence.time_units`,
  `persistence.time_resolution`, `persistence.overlap_percent`;
  `persistence.power_bins`: `persistence.power_bins`.

### Display и Time

| Field ID | Kind/default | Валидация и UI | Effect |
| --- | --- | --- | --- |
| `display.show_legend` | boolean, `true` | все plot types | `effective_presentation` |
| `time.normalize_y` | boolean, `false` | Time | `effective_presentation` |
| `time.show_markers` | boolean, `false` | Time | `effective_presentation` |
| `time.units` | enum, `seconds` | полный Time unit enum | `stored_only` |
| `time.x_limits` | existing optional range | canonical seconds; текущая source/domain проверка сохраняется | `effective` |
| `time.y_limits` | optional range, `null` | finite strict pair; ordinate unit unresolved | `blocked_contract` |
| `time.link_time` | boolean, `false` | видим при двух и более Display; topology пока не применяется | `blocked_contract` |

Measurements и Peaks остаются существующими отдельными контрактами и не
дублируются в `SignalDisplayStoredSettings`.

### Spectrum

| Field ID | Kind/default | Валидация/условие | Effect |
| --- | --- | --- | --- |
| `spectrum.frequency_units` | enum, `hertz` | полный Frequency unit enum | `stored_only` |
| `spectrum.frequency_limits` | existing optional range | canonical Hz, текущая topology/domain проверка | `effective` |
| `spectrum.y_limits` | optional range, `null` | finite strict pair | `stored_only` |
| `spectrum.frequency_scale` | enum `linear|log`, `linear` | current complex-membership rule | `effective_presentation` |
| `spectrum.scale` | enum `db|linear`, `db` | UI checkbox `Spectrum in dB` | `effective` |
| `spectrum.resolution_type` | enum `leakage|rbw|window_length`, `leakage` | управляет conditional groups | `stored_only` |
| `spectrum.leakage` | number `0..1`, `0.5` | видим при `leakage` | `effective` |
| `spectrum.rbw` | resolution `{mode:auto|specified, hz:null|>0}`, Auto | только при `rbw` | `blocked_contract` |
| `spectrum.window_length` | resolution `{mode:auto|specified, samples:null|integer>=2}`, Auto | только при `window_length` | `blocked_contract` |
| `spectrum.window` | enum, `hamming` | Blackman-Harris, Chebyshev, Flat-top, Hamming, Hann, Kaiser, Rectangular; RBW/Window Length modes | `stored_only` |
| `spectrum.sidelobe_attenuation_db` | number, `60` | Chebyshev `>=45`; Kaiser `>=21`; иначе readonly | `stored_only` |
| `spectrum.overlap_percent` | number `[0,100)`, `50` | RBW/Window Length modes | `stored_only` |
| `spectrum.nfft` | resolution `{mode:auto|specified, nfft:null|integer>=2}`, Auto | Window Length mode; при specified Window Length требуется `nfft >= window_length.samples`; при Auto Window Length окончательная effective-проверка откладывается до milestone 3 | `blocked_contract` |

Spectrum Frequency Resolution/RBW readout является derived output, не
сохраняемым setting.

`leakage=0.5`, `window=hamming`, attenuation `60` и overlap `50` здесь являются
явно выбранными product compatibility defaults текущего Signal Analyser, а не
утверждением о fresh MATLAB defaults. До milestone 3 stored-only
`resolution_type` не скрывает уже эффективный `spectrum.leakage`: Leakage
остаётся видимым с пометкой текущего effective path, а RBW/Window sections
показывают только requested/unapplied значения. Условное скрытие Leakage
разрешается лишь когда `resolution_type` сам станет effective.

NFFT/DFT Points включён по текущей официальной документации Signal Analyzer:
в Window Length mode пользователь может оставить Auto (effective NFFT равен
effective window length) либо задать целое NFFT не меньше window length.
R2024b live inventory не раскрыл этот условный control, поэтому label продукта
— `DFT Points`, а status явно сообщает, что effective проверка Auto Window
Length станет доступна только в milestone 3.

### Spectrogram

| Field ID | Kind/default | Валидация/условие | Effect |
| --- | --- | --- | --- |
| `spectrogram.time_units` | enum, `seconds` | полный Time unit enum | `stored_only` |
| `time.x_limits` | existing shared range | показывается также в Spectrogram menu | `effective` |
| `spectrogram.frequency_units` | enum, `hertz` | полный Frequency unit enum | `stored_only` |
| `spectrogram.frequency_limits` | existing optional range | canonical Hz, current topology | `effective` |
| `spectrogram.power_limits` | existing optional range | canonical dB | `effective_presentation` |
| `spectrogram.frequency_scale` | enum `linear|log`, `linear` | current requested/effective complex rule | `effective_presentation` |
| `spectrogram.scale` | enum `db|linear`, `db` | UI checkbox `Spectrum in dB` | `stored_only` |
| `spectrogram.leakage` | number `0..1`, `0.5` | независим от других Leakage | `effective` |
| `spectrogram.time_resolution` | resolution `{mode:auto|specified, seconds:null|>0}`, Auto | `seconds <= signal duration`; без source explicit disabled | `blocked_provider:ENGEE-20260801-003` |
| `spectrogram.overlap_percent` | number `[0,75]`, `50` | active и в Auto, и в Specify | `effective` |
| `spectrogram.reassign` | boolean, `false` | Options group | `blocked_provider:ENGEE-20260801-004` |

Spectrogram Frequency Resolution содержит только derived `Actual RBW`; это
read-only output, а не setting.

Диапазон Spectrogram Overlap `0..75` — намеренная product-safety граница
DEC-018, а не MATLAB parity: public `pspectrum` допускает `[0,100)`, но
значения выше 75 остаются заблокированы до отдельного resource evidence.

### Persistence

| Field ID | Kind/default | Валидация/условие | Effect |
| --- | --- | --- | --- |
| `persistence.frequency_units` | enum, `hertz` | полный Frequency unit enum | `stored_only` |
| `persistence.frequency_limits` | optional range, `null` | canonical Hz; explicit pair требует source | `blocked_prerequisite:DEC-027` |
| `persistence.power_limits` | optional range, `null` | finite strict dB pair | `stored_only` |
| `persistence.density_limits` | optional range, `null` | finite strict percent pair внутри `[0,100]` | `stored_only` |
| `persistence.frequency_scale` | enum `linear|log`, `linear` | MATLAB R2024b показывает Linear; current product application отсутствует | `stored_only` |
| `persistence.scale` | enum `db|linear`, `db` | UI checkbox `Spectrum in dB` | `stored_only` |
| `persistence.leakage` | number `0..1`, `0.5` | independent | `effective` |
| `persistence.time_units` | enum, `seconds` | полный Time unit enum для requested Resolution | `stored_only` |
| `persistence.time_resolution` | resolution `{mode:auto|specified, seconds:null|>0}`, Auto | без source explicit disabled | `blocked_contract` |
| `persistence.overlap_percent` | number `[0,100)`, `50` | Time Resolution group | `blocked_resource:DEC-026` |
| `persistence.power_bins` | power_bins `{mode:auto|specified, count:null|20..1024}`, authoritative default `{mode:auto,count:null}` | integer; official `NumPowerBins` range; `256` may be a documented draft suggestion after Specify, never claimed as a live GUI default or persisted before commit | `stored_only` |

Persistence Frequency Resolution/RBW — derived read-only output, не setting.
`MinThreshold`, Reassign и fixed segmentation не присутствуют в исследованном
R2024b Persistence menu и не добавляются как выдуманные controls.

Persistence overlap `50` является новым явным product default этого successor
ADR, выбранным для совместимости с текущим инспектором; это не вывод о fresh
MATLAB default и не отмена resource запрета DEC-026. Effective provider до
milestone 3 продолжает использовать прежнее omitted/default поведение.

## Lifecycle и атомарность

- Новый Display получает все defaults; A/B не разделяют mutable objects.
- Clear сохраняет preferences. Закрытие Display удаляет их вместе с aggregate.
- Source replacement сохраняет source-independent values. Existing effective
  source-bound limits продолжают свои принятые reset/canonicalization rules.
- New explicit source-bound values без source не публикуются; Auto clear
  разрешён.
- Mutation нового поля не вызывает provider, cache preparation, plot payload
  materialization, Plotly render, Measurements или Peaks delta.
- `show_legend`, `normalize_y`, `show_markers` имеют backend defaults
  `true/false/false`. При первом GET новой версии Frontend принимает их как
  authority до первого render; client-to-server seed отсутствует. Обновление
  приложения требует полной перезагрузки открытой вкладки, поэтому перенос
  произвольного старого in-memory frontend state не поддерживается.
- Изменение этих трёх `effective_presentation` fields применяет только
  существующий frontend Plotly-presentation path целевого Display. Для
  неактивного Display сохраняется document без render; при его активации
  presentation применяется. Это не даёт новым stored-only полям права на
  render.
- Frontend ведёт draft/request context по `display_id`, request id и context
  epoch. Ответ старого Display никогда не применяется к текущему.

## Frontend и accessibility

Видимы Display controls и ровно одна plot-specific группа. Stored-only или
blocked field получает текстовый статус и `aria-describedby`; цвет не является
единственным носителем состояния. Invalid control имеет `aria-invalid` и
inline `role=alert`. Busy state локален полю/паре, без global plot loader.

Stable selectors образуются из field id:

```text
setting-<field-id-with-dots-replaced-by-dashes>
setting-...-error
setting-...-effect-status
```

Enums используют keyboard-operable searchable combobox; boolean — native
checkbox; range — два labelled inputs под одним atomic field. После полной
готовности каждого меню Frontend проводит action-by-action interaction design
review. E2E не стартует по отдельным controls: один integrated scenario
разрешается после coherent settings-inspector milestone, ordinary regression и
design review.

## Проверка

Обязательная обычная test matrix:

- exact defaults/keysets/metadata всех fields;
- type, Bool-as-number, nonfinite, enum, bounds, pair и discriminated-mode
  ошибки;
- changed +1 revision, canonical no-op, stale 409 и one replay;
- 422 full rollback с сохранением frontend draft;
- A/B isolation, new/close/Clear/source lifecycle;
- для каждого нового поля zero provider/cache/plot/Measurements/Peaks delta;
- для существующих полей отсутствие regression их текущего эффекта;
- frontend stale-context, local busy/error/status и keyboard behavior.

E2E — только после полного settings-inspector milestone. Optimization остаётся
последним этапом.

## Источники

- https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ref/pspectrum.html
- https://www.mathworks.com/help/matlab/ref/duration.html
- https://www.mathworks.com/help/matlab/ref/duration.years.html
- живые R2024b screenshots под `/private/tmp/matlab-settings-*` и MATLAB
  Researcher handoff; fixture values не являются product defaults.
