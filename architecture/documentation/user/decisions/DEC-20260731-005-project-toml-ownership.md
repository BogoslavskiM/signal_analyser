# DEC-20260731-005: Project.toml принадлежит Backend role

ID: `DEC-20260731-005`  
Дата: 2026-07-31  
Статус: accepted  
Supersedes: none

## Контекст

`Project.toml` влияет на Julia runtime dependency contract, но ранее не имел
write owner: Backend мог только читать, DevOps не мог изменять.

## Альтернативы

Оставить файл без owner; отдать DevOps; закрепить за Backend с обязательным
Tester/DevOps handoff.

## Решение

Backend владеет `Project.toml`. Любое dependency change требует source/version
evidence, contract tests и deployment preflight handoff. DevOps остаётся
read-only/forbidden для редактирования dependency files.

## Последствия

Это ownership decision не разрешает добавлять EngeeDSP в каскаде v2. Bare
dependency не воспроизводим без доступного internal source contract. Будущее
изменение проходит обычный Backend → Tester → DevOps flow и отдельный ADR при
смене platform contract.

## Связи и evidence

[DEC-20260731-004](DEC-20260731-004-engeedsp-platform-load-path.md).
