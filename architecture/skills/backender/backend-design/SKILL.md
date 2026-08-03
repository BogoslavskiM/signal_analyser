---
name: backend-design
---
# Backend Design

Используй этот опциональный этап при инициализации backend, расширении его
архитектуры или изменении границ ответственности. Для локальной правки сохраняй
существующую структуру.

## Пример структуры

```text
app/
  routes/       # bootstrap и HTTP mapping
lib/
  domain/       # typed objects, aggregate root и инварианты
  services/     # координация use cases
  adapters/     # Engee и другие внешние ресурсы
  persistence/  # optional storage
```

Названия можно адаптировать к проекту; границы ответственности сохраняй.

## Основная модель

- Храни authoritative state в одном typed aggregate root: objects, stable ids,
  order, main/selection, settings и состояния outputs.
- Добавляй к aggregate необходимые операции `add`, `delete`, `duplicate`,
  `rename`, `select`, `update`; они проверяют его инварианты.
- Services координируют use case, adapters работают с внешними ресурсами,
  routes только преобразуют HTTP и вызывают service operation.
- Не заменяй стабильную domain model набором глобальных `Dict` и свободных
  mutation helpers.

## Settings и ошибки

- Сохраняй корректно типизированное значение настройки, даже если у него есть
  semantic validation error.
- Рассчитывай validation `error` и `warning` из текущих settings, не сохраняй
  их как authoritative state и возвращай раздельными полями настройки.
- Calculation error не является validation error. Передавай его через состояние
  соответствующего output: `isready=true`, `success=false`, короткий `error`,
  сохраняя последнее успешное `data`.

## Расчёты, графики и API

- Держи typed math functions вне routes и отдельно от frontend formatting.
- Apply помечает все расчётные outputs внутренним `dirty`.
- Пересчитывай dirty output по запросу его data route. Для каждого output
  используй отдельную ручку с `data`, `isready`, `success`, `error`; `dirty`
  остаётся внутренним полем.
- После math преобразуй graph result на backend в Plotly-ready
  `{data, layout, config}`, не связывая саму math function с Plotly.
- Выделяй общий дорогой промежуточный результат только при реальном
  переиспользовании несколькими outputs.

## Многопоточность

- По умолчанию не добавляй worker и многопоточность.
- Для измеренно долгих расчётов используй одну worker queue, immutable input
  snapshot, `calculation_revision` и cooperative cancellation.
- Новый Apply инвалидирует прежнюю revision. Перед записью проверяй revision и
  не публикуй устаревший результат.
- Не создавай поток на каждый output и не используй multiprocessing.
