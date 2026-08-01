# DEC-20260801-031: строгая граница snapshot для `measurement_kinds`

ID: `DEC-20260801-031`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-014 selectable Statistics](DEC-20260731-014-selectable-statistics.md)
Implementation: planned in Cascade 25; not deployed

## Контекст

Backend публикует `measurement_kinds` для каждого Display и root-проекцию
active Display. Request validator принимает только массив уникальных известных
string IDs и канонизирует порядок. Frontend сейчас permissive: present `null` и
не-массив тихо становятся default first three, а unknown IDs и duplicates
фильтруются или дедуплицируются в другую valid subset. Fabricated selection
затем может попасть в unrelated full `/api/view` body.

## Альтернативы

- Всегда нормализовать malformed snapshot в defaults: отклонено как fabricated
  server state.
- Использовать root как fallback для отсутствующего Display field: отклонено;
  root является проекцией active Display, а не независимым preference source.
- Различать absent compatibility и present corruption: принято.

## Решение

Полностью отсутствующий per-Display `measurement_kinds` получает legacy default
`["minimum","maximum","mean"]`. Present значение обязано быть массивом
уникальных известных string IDs; `[]` допустим. Любая уникальная subset может
прийти в произвольном порядке, а UI отображает её в каноническом порядке
`minimum, maximum, mean, median, peak_to_peak, rms`.

Present `null`, non-array, non-string member, unknown ID и duplicate являются
contract corruption. Display quarantined: Statistics показывает стабильную
accessible error, все его metric checkboxes disabled, а desired/queued/pending
View intents очищаются. Malformed initial/200/409 snapshot не вызывает replay
и не может породить следующий server POST. Local-only presentation toggles
могут оставаться локальными по существующей policy.

API/backend/domain/math и valid request body не меняются. Root fallback для
этого поля не добавляется.

## Последствия

- Legacy snapshots без поля сохраняют defaults.
- Present corruption становится видимым и не маскируется canonical defaults.
- Quarantine Display может блокировать unrelated server mutation до получения
  валидного snapshot; это намеренная защита full-body contract.

## Проверка

Absent with valid nondefault root still defaults locally; present malformed
with valid root still quarantines; valid empty, unordered subset/full set;
null/non-array/non-string/
unknown/duplicate matrix; visible error/disabled controls; zero unrelated POST;
malformed 409 queued drain; malformed successful 200 immediate purge; exact
valid full View request и A/B isolation.

## Связи и evidence

- [DEC-014](DEC-20260731-014-selectable-statistics.md)
- [Backend/frontend boundary assessment](../../agents/reports/measurement-kinds-snapshot-assessment-20260801.md)

## Датированное уточнение 2026-08-01 — local implementation

Контракт реализован и локально проверен в
`0d7bd7ed72cd92a74174abb7210778da5cd62e2a`. Frontend 2/2, initial/root,
valid empty/unordered, malformed matrix, successful 200/409 queue purge, exact
body и A/B isolation прошли; independent final audit CLEAN. Deployment не
заявляется.
