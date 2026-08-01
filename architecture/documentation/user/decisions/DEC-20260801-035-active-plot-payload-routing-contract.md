# DEC-20260801-035: строгая маршрутизация payload активного графика

ID: `DEC-20260801-035`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-030 latest plot render wins](DEC-20260801-030-latest-plot-render-wins.md),
[DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md),
[DEC-033 display selection snapshot](DEC-20260801-033-display-selection-snapshot-contract.md),
[DEC-034 active plot snapshot](DEC-20260801-034-active-plot-snapshot-contract.md)
Implementation: planned in Cascade 29; not deployed

## Контекст

Backend публикует `plot_payload` active Display как объект ровно с шестью
ключами: `selected_signal`, `visible_signals`, `time_traces`,
`spectrum_traces`, `spectrogram`, `persistence`. Два первых поля повторяют
уже проверенные selection-проекции active Display, а четыре остальных задают
возможные маршруты данных графика.

Frontend пока не проверяет эту envelope. Для Time и Spectrum он может взять
trace-массив из `plot_payload`, но при его отсутствии использует `plots`; для
Spectrogram и Persistence он объединяет `plots` с одноимённой веткой payload.
Missing или malformed `plot_payload` также может превратиться в локальный
пустой объект. Такой fallback способен показать данные не того маршрута либо
изобразить пустой график, которого server snapshot не публиковал.

Официальная документация MATLAB Signal Analyzer описывает одновременное
сравнение разных представлений и отдельные displays для side-by-side Time и
Spectrum/Persistence/Spectrogram. Это внешний documented direction, но не wire
contract Genie:

- [Signal Analyzer — описание приложения](https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html);
- [Explore Signals — View Signals on Multiple Plots](https://www.mathworks.com/help/signal/ug/explore-signals.html).

Архитектурный вывод для Genie является inference: текущая модель приложения
имеет один `active_plot` на Display и один общий graph host, поэтому snapshot
должен однозначно выбрать только одну active branch. DEC не пытается повторить
MATLAB multi-view layout или определить графическую/числовую эквивалентность.

## Альтернативы

- Сохранить fallback на `plots`, другую branch, предыдущий payload или
  синтезированный empty state: отклонено как восстановление server state
  догадкой клиента.
- Проверить полную структуру traces/heatmaps, геометрию, значения и подписи:
  отклонено как преждевременное объединение routing boundary с будущими
  typed/numeric контрактами.
- Строго проверить six-key envelope, selection projections и только
  cardinality/source активной branch: принято.

## Решение

Проверка выполняется после DEC-032, DEC-033 и DEC-034 и до `normalize()`.

### Precedence

Если active Display уже локально изолирована DEC-033 из-за selection либо
DEC-034 из-за `active_plot`, C29 вообще не проверяет поля `plot_payload`.
Существующая более ранняя ошибка сохраняет собственный selector, lifecycle и
scope. В частности, malformed payload не превращает такую страницу в global
fatal и не подменяет её исходную ошибку.

DEC-033 раньше C29 требует, чтобы root `analysis_signal`, `selected_signal` и
`visible_signals` точно совпадали с selection-valid active Display. Нарушение
этой root-проекции остаётся global fatal по DEC-033/DEC-032. C29 не ослабляет и
не повторно классифицирует эту проверку.

### Exact envelope и projection

Для selection-valid и active-plot-valid страницы snapshot обязан иметь
собственный `plot_payload`: plain object, не `null` и не массив, ровно с
ключами:

```text
selected_signal
visible_signals
time_traces
spectrum_traces
spectrogram
persistence
```

Additional или missing key не допускается. `plot_payload.selected_signal`
обязан точно равняться уже проверенному `analysis_signal`/`selected_signal`
active Display, включая `null`. `plot_payload.visible_signals` обязан точно,
включая порядок, равняться её `visible_signals`.

Mismatch этих двух полей с уже согласованными root/Display projections —
локальная ошибка active Display C29, а не новое global corruption. Глобальной
остаётся только более ранняя фактическая несогласованность root snapshot из
DEC-033.

### Единственная active branch

После проверки projection frontend выбирает branch только по уже проверенному
`active_plot`:

| `active_plot` | Обязательная active branch | Routing contract |
| --- | --- | --- |
| `time` | `time_traces` | массив длиной `visible_signals.length`; каждый элемент — plain object с собственным `signal`, точно равным соответствующему имени в ordered `visible_signals` |
| `spectrum` | `spectrum_traces` | тот же cardinality/order/source contract |
| `spectrogram` | `spectrogram` | plain object с собственным `signal`, точно равным `selected_signal` |
| `persistence` | `persistence` | plain object с собственным `signal`, точно равным `selected_signal` |

`name` не является alias для `signal`; missing `signal` не восстанавливается из
label. Значения inactive branches не валидируются этим решением: требуется их
наличие в exact outer keyset, но их container type, metadata и содержимое
остаются вне C29.

Для empty Display routing-empty форма задаётся только явным wire:

- `selected_signal=null`, `visible_signals=[]`;
- active Time/Spectrum branch — точный пустой массив;
- active Spectrogram/Persistence branch — объект с собственным `signal=null`.

Это каноничность только routing-уровня. C29 не делает выводов о `x/y/z` даже в
empty heatmap. Отсутствующая или malformed branch никогда не превращается в
empty автоматически.

### Запрет fallback

Graph routing читает только branch, соответствующую active `active_plot`.
Запрещены fallback на:

- `plots`;
- любую другую ветку `plot_payload`;
- payload предыдущего valid snapshot;
- `name` вместо собственного `signal`;
- fabricated `{}`, `[]` или иной empty state.

`plots` остаётся существующим response field, но C29 не валидирует его и не
использует как резервный источник active graph.

### Локальная изоляция и lifecycle

Malformed exact envelope, projection C29 либо active branch изолирует active
Display по её проверенному ID. Frontend:

- очищает desired/queued/pending/stale-replay View intents только этого ID и не
  строит для него новый `/api/view` body;
- увеличивает generation общего Plotly host, выполняет purge и не разрешает
  позднему settlement прежнего render изменить ошибку или readiness;
- показывает единственную доступную ошибку
  `data-testid="display-active-plot-payload-contract-error-state"`,
  `role="alert"`, с точным текстом
  «Некорректные данные активного графика в ответе сервера.»;
- не рисует active graph из fallback-источника.

Topology actions могут оставаться доступны, потому что используют проверенные
DEC-032 Display IDs. Независимые intents других valid Displays сохраняются.
Malformed successful `200` или `409 current` не replay изолированную View;
следующий authoritative valid snapshot снимает только C29-изоляцию своего
Display и не восстанавливает отброшенные intents. Для global fatal root
selection mismatch продолжает действовать полный reset/Retry DEC-032.

## Вне scope

C29 не валидирует и не меняет:

- numeric `x/y/z`, finite values, lengths или matrix geometry;
- trace/heatmap `type`, axes, scales, normalization и DSP/math semantics;
- metadata keysets, labels, names и colors внутри branches;
- `plots`, `panel`, settings, Measurements или Peaks;
- внутренности inactive branches;
- backend/API/request schema, `state_revision` или MATLAB multi-view layout.

Независимые действующие проверки этих surface сохраняются, но не становятся
частью классификации C29.

## Последствия

- Active graph имеет один wire route без догадок клиента.
- Повреждение presentation payload локализуется по active Display, тогда как
  topology и selection root contradictions остаются global fatal.
- Идентичность источника проверяется без преждевременной фиксации numeric или
  визуальной семантики.
- Inactive payload internals могут получить отдельные typed boundaries позже.

## Проверка

Будущая deterministic matrix должна покрыть exact outer keyset/plain-object,
projection equality, все четыре active routes, missing/nonobject branch,
cardinality и owned `signal` mismatch, отсутствие `name` fallback, canonical
empty routes и принятие malformed inactive branch internals.

Lifecycle matrix включает initial/`200`/`409 current`/recovery, C27/C28
precedence, A/B isolation, exact per-ID queue purge, zero View POST/replay,
валидные `plots` при malformed active payload как доказательство отсутствия
fallback и controlled deferred Plotly settlement после local quarantine.

## Связи и evidence

- [Внутренняя оценка routing boundary](../../agents/reports/active-plot-payload-routing-assessment-20260801.md)
- [Cascade 29](../reports/signal-analyser-cascade-v29.md)
- [DEC-030 latest plot render wins](DEC-20260801-030-latest-plot-render-wins.md)
- [DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md)
- [DEC-033 display selection snapshot](DEC-20260801-033-display-selection-snapshot-contract.md)
- [DEC-034 active plot snapshot](DEC-20260801-034-active-plot-snapshot-contract.md)

Контракт зафиксирован до реализации. Изменения продукта, тестов, runtime,
deployment и математики этим решением не заявляются.
