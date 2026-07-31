# DEC-20260731-002: отдельная роль Documenter пока не вводится

ID: `DEC-20260731-002`  
Дата: 2026-07-31  
Статус: accepted  
Supersedes: none

## Контекст

Документация требует единой редакционной ответственности и согласования
математики с code/test evidence.

## Альтернативы

Создать Documenter немедленно; оставить curator duty у Architect; разрешить
каждой роли писать client docs.

## Решение

Architect сохраняет coherence и утверждает client docs. Backend и MATLAB
Researcher предоставляют source evidence, но не придумывают и не публикуют
математику самостоятельно.

## Последствия

Documenter добавляется отдельным ADR, если выполняется любой устойчивый trigger:
одновременно ведутся более двух продуктов/каскадов; documentation review отстаёт
более чем на один рабочий день; traceability регулярно расходится с diff/tests;
либо документирование занимает более 25 % времени Architect в трёх задачах
подряд. До этого новая роль увеличила бы handoff cost и размыла authority.

## Связи и evidence

[Documentation policy](../../agents/tasks/README.md).
