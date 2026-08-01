# Cascade 25: строгий snapshot выбранных Statistics

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-031](../decisions/DEC-20260801-031-measurement-kinds-snapshot-boundary.md)
разделяет legacy absence и повреждённое present значение `measurement_kinds`.
Отсутствующее поле сохраняет первые три метрики по умолчанию; present массив
обязан содержать только уникальные известные IDs, включая допустимый empty.

Повреждённый snapshot становится видимым и блокирует server mutations этого
Display, вместо тихой подстановки defaults. Очередь и stale replay очищаются.
Backend/API/math не меняются; это frontend snapshot-boundary hardening.
