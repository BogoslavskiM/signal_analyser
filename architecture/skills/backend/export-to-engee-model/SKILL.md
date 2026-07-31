---
name: export-to-engee-model
---
# Export to Engee Model

## When to Use
- Подготовленное model description нужно превратить в валидный `.engee`.
- Domain/model-generation module уже определил blocks, parameters, lines и layout.

## When NOT to Use
- Нужно спроектировать схему или вычислить параметры блоков.
- Нужно вручную создать бинарный `.engee`.
- Engee runtime недоступен.

## Input Contract
Получай подготовленное описание:

```text
model_name
output_path
overwrite
blocks
parameters
lines
layout
```

- Смысл blocks, их набор, параметры и связи определяет отдельный model-generation/domain skill.
- Export skill отвечает за корректное применение description через публичный Engee API.

## Workflow
1. Нормализуй output path и потребуй расширение `.engee`.
2. Проверь overwrite и доступность Engee runtime.
3. Создай model через `engee.create(model_name)`.
4. Сразу сохрани model через `engee.save(model_name, output_path; force=true)`.
5. Добавляй blocks, string parameters и lines только публичными `engee.*` calls.
6. Задавай читаемые positions из prepared layout.
7. Сохраняй после значимых стадий и финально перед возвратом.
8. При необходимости открой model через `engee.open(model_name)`.
9. Верни нормализованный итоговый path.

## Guardrails
- Никогда не создавай и не изменяй `.engee` как обычный бинарный/текстовый файл.
- Используй только строчный публичный `engee.*`; не используй внутренний API.
- Все block parameter values передавай строками.
- Не угадывай library paths, parameter names и ports: получай validated model description либо handoff от Engee contract tester.
- Не заменяй model export чистым Julia calculation.
- Не помещай domain mathematics и topology design в этот skill.
- Если модель должна отдавать simulation data, проверяй её через To Workspace contract.

## Verification
- Проверь extension, overwrite, runtime availability и отсутствие прямой file write.
- Загрузи/открой сохранённую model через Engee.
- Проверь block types, parameter strings, connections и layout против prepared description.
- Запусти contract simulation, если model должна быть исполняемой.
- Проверь data через To Workspace и отсутствие NaN/Inf/численного расхождения.
- Финальный application test проверяет математическое поведение model по model-generation/domain contract.
