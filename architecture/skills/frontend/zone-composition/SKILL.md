---
name: zone-composition
version: 0.3.0
---
# Zone Composition

## When to Use
- Layout zones уже существуют, и нужно положить в них типовые UI-элементы.
- Нужно описать frontend data/action contract для каждой зоны.
- Нужно встроить multi-page area как агрегатор страниц/outputs.

## When NOT to Use
- Ещё не выбрана базовая layout geometry.
- Нужно проектировать backend object model или database/state internals.

## Workflow
1. Возьми готовый список zones из layout blueprint.
2. Назначь каждой зоне embeddable element: data inspector, settings, graph/output, multi-page area, toolbar или dialog.
3. Для каждой зоны опиши frontend data, user actions и backend contract needed.
4. Для каждого action определи тип: domain mutation, view-state sync или frontend draft-only.
5. Для multi-page area опиши pages, `main_window`, visibility/order, lazy loading и readiness/success/loading contract.
6. Если элементы можно расположить понятнее, предложи альтернативу до реализации.

## Guardrails
- Multi-page area — элемент-агрегатор, который можно встроить в любую зону; это не часть layout geometry.
- Реализуй агрегатор по правилам `frontend/multi-page-element`.
- Реализуй Plotly output по правилам `frontend/graph-output-zone`.
- Не складывай несвязанные workflow в одну тесную зону.
- Settings по умолчанию редактирует main object, если handoff не говорит иначе.
- Graph/output должен иметь явный source payload и loading/error behavior.
- Backend implementation belongs to backend skills; frontend фиксирует только contract needed.

## Reference
Шаблон zone spec:

```text
zone:
  id:
  layout_position:
  element_type:
  frontend_data:
  user_actions:
  backend_contract_needed:
  tests:
```
