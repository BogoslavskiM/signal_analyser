---
name: export-to-julia-script
---
# Export to Julia Script

## When to Use
- Нужно сохранить воспроизводимый Julia script, создающий уже описанный domain object или набор objects.
- Вызывающий domain module предоставляет constructors, parameters и required packages.

## When NOT to Use
- Нужно вычислить параметры экспортируемого объекта.
- Достаточно бинарного JLD2.
- Скрипт не должен быть воспроизводимым вне исходного приложения.

## Input Contract
Получай подготовленное описание:

```text
output_path
overwrite
required_packages
constructor_code
optional_usage_code
```

- Domain module отвечает за смысл constructors и parameter values.
- Export skill отвечает за корректный Julia source file.
- Не принимай произвольный пользовательский source без отдельного security contract.

## Workflow
1. Нормализуй output path и потребуй расширение `.jl`.
2. Проверь overwrite до записи.
3. Сформируй deterministic source: required `using`/`import`, constructors, optional usage и явный возвращаемый object/function.
4. Экранируй string literals и валидируй генерируемые identifiers.
5. Не вставляй абсолютные пути исходного приложения и его runtime state.
6. Запиши файл через временный path и замени target только после успешного формирования.
7. Верни нормализованный итоговый path.

## Reproducibility
- Скрипт должен запускаться в подходящем Engee/Julia environment без исходного Genie-приложения.
- Явно подключай необходимые packages.
- Не полагайся на случайный порядок Dict при генерации source.
- Не ссылайся на frontend state, backend globals или открытый inspector.
- Допускай optional plotting code только как отдельную явно запрошенную секцию.

## Guardrails
- Не смешивай code generation с вычислением domain values.
- Не создавай Julia source конкатенацией непроверенных пользовательских fragments.
- Не перезаписывай файл без `overwrite=true`.
- Не считай успешную запись доказательством корректности скрипта.

## Verification
- Проверь `.jl`, path normalization, overwrite и отсутствие partial target при error.
- Выполни Julia parse всего файла.
- Подключи скрипт в чистом module/process с заявленными dependencies.
- Создай exported object и сравни его type/parameters с исходным prepared description.
- Финальный application test проверяет также математическое поведение созданного объекта по domain/calculation contract.
