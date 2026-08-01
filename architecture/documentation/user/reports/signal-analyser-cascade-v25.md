# Cascade 25: строгий snapshot выбранных Statistics

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-031](../decisions/DEC-20260801-031-measurement-kinds-snapshot-boundary.md)
разделяет legacy absence и повреждённое present значение `measurement_kinds`.
Отсутствующее поле сохраняет первые три метрики по умолчанию; present массив
обязан содержать только уникальные известные IDs, включая допустимый empty.

Повреждённый snapshot становится видимым и блокирует server mutations этого
Display, вместо тихой подстановки defaults. Очередь и stale replay очищаются.
Backend/API/math не меняются; это frontend snapshot-boundary hardening.

## Датированное уточнение 2026-08-01 — реализовано локально

Frontend теперь использует display-only exact validator и общий quarantine
path, переиспользует accessible Statistics error и отключает все metric
checkboxes при corruption. Initial/root precedence, valid empty/unordered,
malformed classes, 200/409 queue purge, exact full body и A/B isolation прошли;
frontend 2/2 и independent audit CLEAN. Local commit:
`0d7bd7ed72cd92a74174abb7210778da5cd62e2a`; не deployed.
