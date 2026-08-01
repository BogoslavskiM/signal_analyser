# DEC-20260801-030: последний запрос рендера Plotly побеждает

ID: `DEC-20260801-030`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-010 local-only Plotly](DEC-20260731-010-local-only-plotly.md)
Implementation: planned in Cascade 24; not deployed

## Контекст

Signal Analyser использует один Plotly host для всех Display и типов графиков.
`draw()` фиксирует данные синхронно, но `ensurePlotly()` и `Plotly.react()`
завершаются асинхронно. Старый render поэтому может изменить общий host или
показать ошибку уже после того, как новый график либо синхронный empty state
стал актуальным. `Plotly.purge()` выполняет cleanup, но не cancellation.

## Альтернативы

- Оставить конкурентные `Plotly.react()` и проверять generation только в
  continuations: отклонено, потому что Plotly может изменить DOM до settlement.
- Создавать отдельный host на каждый Display/plot: отклонено как лишняя смена
  DOM/layout architecture и расход памяти.
- Сериализовать jobs и учитывать generation: принято как минимальная
  frontend-only граница для одного host.

## Решение

Frontend владеет монотонно растущей generation единственного host. Каждый
`draw()`, включая синхронные placeholder/error branches, увеличивает и
запоминает generation. Queued render вызывает `Plotly.react()` только если его
generation всё ещё актуальна. Success/error continuation меняет host readiness
или content только для актуальной generation.

Plotly jobs проходят через serialized generation-aware tail. Если уже
запущенный stale job изменил DOM и затем завершился после того, как новый запрос
стал authoritative, coordinator ограниченно переутверждает newest frame.
Stale rejection никогда не заменяет актуальный график или placeholder на
`plot-error-state`.

API/state/wire/backend, Plotly artifact и graph math не меняются. Tests
используют управляемые deferred Plotly promises без timers/browser sleeps.
Необязательный `data-rendered-plot` допустим только для текущей успешно
отрисованной generation.

## Последствия

- Последний active Display/plot/placeholder детерминированно побеждает.
- Новый Plotly call может ждать уже выполняющийся старый call; cancellation API
  по-прежнему нет.
- Stale completion может вызвать одно bounded reassertion newest frame, но не
  бесконечный redraw loop.
- Provider calls и backend lifecycle остаются вне решения.

## Проверка

Детерминированно покрыть stale success/rejection после того, как новый request
стал authoritative, delayed library load, stale graph после synchronous empty
state, plot switch и Display switch. После serialized completion итоговые host
marker/content/readiness всегда соответствуют newest state, stale error нет.

## Связи и evidence

- [Внутренняя оценка async race](../../agents/reports/plotly-render-race-assessment-20260801.md)
- [Cascade 24](../reports/signal-analyser-cascade-v24.md)

## Датированное уточнение 2026-08-01 — local implementation

Контракт реализован и локально проверен в
`102aa074431167da54c8a639c791f8d096b7df75`. Frontend 2/2, six-case
controlled-promise matrix и independent final audit прошли. Deployment не
заявляется.
