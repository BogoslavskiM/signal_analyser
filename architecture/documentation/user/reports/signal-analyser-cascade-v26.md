# Cascade 26: строгая глобальная структура snapshot

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-032](../decisions/DEC-20260801-032-global-snapshot-envelope.md) запрещает
frontend придумывать global signal/Display identity при повреждённом snapshot.
Signal names и Display IDs обязаны быть уникальными непустыми strings, Displays
— непустым массивом, а `active_display_id` — точно указывать на одну страницу.

Corruption очищает клиентский state, график, tabs/rows и mutation queues,
показывает existing accessible app error и оставляет Retry. Membership,
analysis source, row selection и root projections намеренно вынесены в
следующий каскад.

## Реализация — 2026-08-01

Boundary реализован локально в `f5820bd`: malformed initial/200/409 очищает
authoritative UI и все intents, Retry восстанавливает отличающуюся A/B
topology, а поздний stale Plotly settlement больше не возвращает старый график.
Frontend tests 2/2 и независимый аудит CLEAN. Gated E2E contract — `33df821`;
браузерный runtime и deployment не заявляются.
