---
name: export-to-jld2
version: 0.1.0
---
# Export to JLD2

## When to Use
- Уже сформированные Julia objects и metadata нужно сохранить в `.jld2`.
- Нужны explicit dataset keys и binary round-trip.

## When NOT to Use
- Нужно сформировать объекты или вычислить их параметры.
- Нужен session format приложения — используй session import/export contract.
- Нужен переносимый текстовый Julia script.

## Input Contract
Получай:

```text
output_path
overwrite
datasets:
  key => prepared value
metadata: optional prepared value
```

- Состав datasets и metadata определяет вызывающий domain module.
- Export skill не добавляет предметные coefficients, characteristics или units самостоятельно.
- Session-only поля вроде `__genie_app_name` не добавляй в обычный object export.

## Workflow
1. Лениво загрузи JLD2 через стандартный Julia package mechanism.
2. Нормализуй path и потребуй расширение `.jld2`.
3. Проверь overwrite до изменения target.
4. Проверь, что выбран хотя бы один dataset, keys непустые и не конфликтуют.
5. Запиши prepared values под explicit keys через `JLD2.jldopen`/`jldsave`.
6. Для надёжной file operation сначала запиши temporary file, затем замени target.
7. Верни нормализованный итоговый path.

## Guardrails
- Не превращай JLD2 в неявный dump всего backend process.
- Не сохраняй worker threads, locks, tasks, open handles и runtime logs.
- Не подменяй prepared typed objects строковым JSON, если контракт требует Julia round-trip.
- Не перезаписывай файл без `overwrite=true`.
- Не считай возможность загрузить файл проверкой предметной математики.

## Verification
- Проверь extension, overwrite, duplicate/empty keys и отсутствие partial file.
- Загрузи JLD2 обратно и проверь набор keys.
- Сравни types, shapes, values и caller-provided metadata с исходными prepared values.
- Проверь загрузку в чистом подходящем Julia environment с required packages.
- Финальный application test проверяет математическое содержимое datasets по domain/calculation contract.
