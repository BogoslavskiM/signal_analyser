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
3. Сначала спроектируй object/domain-oriented слой: typed domain entities,
   aggregate/state object, constructors и методы/operations, владеющие
   инвариантами. Не начинай с набора несвязанных свободных функций.
4. Разделяй ответственность: domain objects и их operations — инварианты;
   service object — orchestration/use case; repository/adapter — внешние
   ресурсы; route — только HTTP mapping.
5. Используй Julia multiple dispatch как реализацию поведения объектов, но не
   превращай service module в procedural god-module с общей mutable state и
   длинной цепочкой свободных helper functions.
6. Сохраняй API payloads и generated script strings совместимыми, если задача явно не меняет contract.
7. Держи routes тонкими: route вызывает один use-case/service operation.
8. Добавь или обнови focused backend tests рядом с изменённым поведением.
9. При изменении settings contract передай frontend типы controls, metadata, validation errors и stable field ids.
10. При изменении table contract передай frontend/tester columns, typed rows, order, main object и selected objects.
11. Проверь Julia parse для изменённых файлов.
12. Запусти релевантные unit/API tests или объясни, почему полный прогон невозможен.

## Guardrails
- Не меняй frontend/test/e2e файлы из backend handoff.
- Не делай unrelated refactor рядом с behavioral fix.
- Не используй ad hoc string parsing там, где есть typed model/helper.
- Не добавляй business behavior как новые свободные функции, если оно
  естественно принадлежит существующему domain/service object.
- Не имитируй Java-классы ради формы: OOP здесь означает typed objects,
  инкапсулированные инварианты, single responsibility и dispatch по domain
  types.
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
