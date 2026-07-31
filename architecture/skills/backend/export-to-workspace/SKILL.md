---
name: export-to-workspace
---
# Export to Workspace

## When to Use
- Уже сформированное Julia/Engee value нужно записать в workspace Engee.
- Нужны проверка variable name, overwrite и нормализованный target.

## When NOT to Use
- Нужно сформировать domain object или выполнить математический расчёт.
- Нужно записать файл.
- Приложение запущено вне Engee workspace environment.

## Input Contract
Получай от вызывающего domain module:

```text
value
variable_name
overwrite
```

- Не создавай и не пересчитывай `value` внутри export skill.
- При нескольких values предпочитай один заранее сформированный container либо сначала проверь все names/conflicts.
- Не стандартизируй математическую структуру value.

## Workflow
1. Проверь доступность workspace adapter Engee.
2. Нормализуй и валидируй `variable_name` как допустимый Julia identifier.
3. Если `overwrite=false`, проверь существование переменной до записи.
4. Передай уже сформированный value через доступный Engee Genie `send`.
5. Если прямой `send` для типа недоступен, используй существующий безопасный workspace adapter приложения; не сериализуй значение строкой ad hoc.
6. Верни нормализованное имя переменной.
7. Запиши полную техническую ошибку в backend log, frontend верни короткий текст.

## Guardrails
- Не выполняй `eval` над пользовательским variable name.
- Не интерполируй непроверенное имя в workspace code.
- Не перезаписывай существующую переменную без `overwrite=true`.
- Не выдавай локальный Julia `Main` за workspace Engee.
- Не помещай domain constructors, coefficients или calculation logic в этот skill.

## Verification
- Проверь valid/invalid identifier, existing/missing variable и overwrite.
- Проверь отсутствие workspace adapter вне Engee.
- Проверь, что value передан без изменения типа и содержимого.
- Для нескольких targets проверь конфликты до первой записи.
- В integration environment прочитай variable обратно и сравни с исходным value.
- Финальный application test дополнительно проверяет предметную математику экспортированного value по domain/calculation contract.
