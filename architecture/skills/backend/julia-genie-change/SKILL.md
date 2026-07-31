---
name: julia-genie-change
---
# Julia Genie Change

## When to Use
- Нужно изменить Julia backend приложения.
- Нужно добавить или исправить module, helper, route, model, save/import или generated script.
- Нужно сохранить Genie/API contracts и backend tests.

## When NOT to Use
- Нужно только изменить JS/CSS/HTML.
- Нужно только написать Playwright сценарий.

## Workflow
1. Прочитай целевой Julia module и ближайшие tests под `test/back/`.
2. Найди существующие helper APIs и data models перед добавлением нового слоя.
3. Сохраняй API payloads и generated script strings совместимыми, если задача явно не меняет contract.
4. Держи business logic в helper/model functions, а routes тонкими.
5. Добавь или обнови focused backend tests рядом с изменённым поведением.
6. При изменении settings contract передай frontend типы controls, metadata, validation errors и stable field ids.
7. При изменении table contract передай frontend/tester columns, typed rows, order, main object и selected objects.
8. Проверь Julia parse для изменённых файлов.
9. Запусти релевантные unit/API tests или объясни, почему полный прогон невозможен.

## Guardrails
- Не меняй frontend/test/e2e файлы из backend handoff.
- Не делай unrelated refactor рядом с behavioral fix.
- Не используй ad hoc string parsing там, где есть typed model/helper.
- Не скрывай breaking contract без tester/frontend handoff.
- Не считай backend-задачу выполненной без покрытия frontend payload и всех пунктов ТЗ.

## Reference
Проверки:

```bash
julia --startup-file=no -e 'for file in ARGS; Meta.parseall(read(file, String)); println("parsed ", file); end' <files>
julia --project=. test/back/runtests.jl
```

Definition of done:

- изменённые Julia files проходят parse;
- релевантные unit/API tests проходят;
- frontend payload покрыт contract tests;
- tester получил изменённые поля, ошибки и stable ids;
- все пункты ТЗ покрыты без неоправданной сложности.
