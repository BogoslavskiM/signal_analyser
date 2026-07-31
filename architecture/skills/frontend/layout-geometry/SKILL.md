---
name: layout-geometry
---
# Layout Geometry

## When to Use
- Нужно реализовать базовую геометрию canvas.
- Нужно определить число зон, их положение и пропорции.
- Нужно создать пустые placeholder zones до назначения содержимого.

## When NOT to Use
- Нужно решить, какие business элементы находятся внутри зон.
- Нужно проектировать backend state/API.

## Core Contract
- Реализуй только geometry, выбранную в blueprint.
- По default visual profile сохраняй fixed canvas `920 × 680` без responsive
  перестройки; отклонение требует прямого решения пользователя и ADR.

## Optional Capabilities
- `layout.placeholders` — пустые zones до composition.
- `layout.internal-scroll` — явный scroll owner.

## Workflow
1. Получи от архитектора layout blueprint или уточни недостающие proportions.
2. Реализуй только geometry: зоны, fixed размеры и scroll ownership.
3. Создай placeholder для каждой зоны.
4. Не назначай зоне semantic element, пока не используется `frontend/zone-composition`.
5. Проверь, что multi-page area не используется как layout primitive: это embeddable element.
6. Если видишь более эргономичную раскладку, верни рекомендацию architect/user до реализации.

## Guardrails
- Layout отвечает только на вопрос: сколько зон на основном canvas и как они расположены.
- Не зашивай business смысл в имена CSS/layout классов на первом этапе.
- Стабилизируй размеры через grid/flex constraints, чтобы content не ломал layout.
- Определи, какая зона скроллится, а не полагайся на случайный page scroll.
- По умолчанию используй fixed canvas не меньше `920 × 680` по правилам
  `frontend/style-system`.
- Не меняй число, порядок и пропорции зон при уменьшении viewport.
- Не добавляй responsive-перестройку canvas: при узком окне приложение может
  не помещаться целиком.

## Reference
Решения, которые нужно записать:

- number of zones
- desktop proportions
- fixed bands versus flexible areas
- scroll ownership
- fixed canvas minimum size
- placeholder IDs/classes
