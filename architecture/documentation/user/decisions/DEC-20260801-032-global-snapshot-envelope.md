# DEC-20260801-032: строгая глобальная envelope snapshot

ID: `DEC-20260801-032`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-009 Display pages](DEC-20260731-009-display-pages.md)
Implementation: planned in Cascade 26; not deployed

## Контекст

Frontend `normalize()` сейчас предполагает корректные `signals`/`displays`.
`null` Display может crash, missing ID становится строкой `"undefined"`, а
unknown `active_display_id` тихо выбирает первую страницу. Backend всегда
публикует эту topology, поэтому fallback создаёт state, которого сервер не
отправлял.

## Альтернативы

- Нормализовать malformed topology и выбрать первый Display: отклонено как
  fabricated global identity.
- Quarantine только active Display: отклонено, потому что inventory/page IDs и
  active identity задают envelope всего snapshot.
- Перейти в global fatal state с Retry: принято.

## Решение

До `normalize()` snapshot обязан быть object и содержать:

- `signals`: массив object entries с уникальными непустыми string `name`;
- `displays`: непустой массив object entries с уникальными непустыми string
  `id`;
- `active_display_id`: непустая string, совпадающая ровно с одним Display ID.

Additional signal/display fields не валидируются этим каскадом. Membership,
analysis aliases, `row_selected_signal` и root projections остаются C27.

Envelope corruption переводит приложение в global fatal state. Frontend не
выбирает fallback Display, не вызывает `render()` с malformed data, очищает
state/displays/active ID, desired/queued/pending View и Display intents,
инвалидирует C24 render generation, purges graph host, очищает tabs/rows и
блокирует server-mutating controls. Existing `app-error` (`role="alert"`)
показывает стабильный текст «Некорректная структура snapshot сервера.»; Retry
остаётся доступным и выполняет новый GET.

Malformed initial, successful 200 и 409 `current` не вызывают replay. После
успешного Retry valid snapshot полностью восстанавливает UI и снимает fatal
state. API/backend/HTML/schema/math не меняются; существующий error/Retry node
переиспользуется.

## Последствия

- Глобальная identity никогда не восстанавливается догадкой клиента.
- Последний valid DOM не считается authoritative после corruption и очищается.
- Retry — единственное recovery/server действие до valid snapshot. Локальные
  toolbar/help/tabs могут оставаться focusable, но не меняют server state.
- Per-Display selection/membership quarantine будет отдельным DEC/C27.

## Проверка

Initial/200/409: null/nonobject snapshot; missing/nonarray/empty `displays`;
null/nonobject Display; missing/empty/non-string/duplicate ID; missing/invalid/
unknown active ID; missing/nonarray `signals`; null/nonobject Signal; missing/
empty/non-string/duplicate name. Assert exact error/Retry, empty host/tabs/rows,
all queues/pending purged, zero replay/POST and no uncaught exception. Valid
Retry and valid two-Display snapshot recover deterministically. Attempt every
server-mutating Display/settings/signal control while fatal and assert disabled
or zero POST; local toolbar/tab navigation may remain local. Preserve C24/C25
matrices unchanged.

## Связи и evidence

- [Envelope assessment](../../agents/reports/global-snapshot-envelope-assessment-20260801.md)
- [DEC-009](DEC-20260731-009-display-pages.md)
- [DEC-012](DEC-20260731-012-display-selection-separation.md)

## Реализация — 2026-08-01

Frontend boundary и deterministic matrix приняты локально в `f5820bd`.
Проверены initial/200/409 corruption, Peaks и bounded stale-replay paths,
fatal-state controls, Retry A/B recovery и позднее завершение `Plotly.react`
после reset. Frontend suite 2/2 и независимый финальный аудит CLEAN. Отдельный
disabled-by-default E2E contract сохранён в `33df821`; runtime, deployment,
push и merge не заявляются.
