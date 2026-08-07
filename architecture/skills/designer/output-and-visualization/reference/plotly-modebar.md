# Canonical Plotly modebar

Этот reference сохраняет утверждённый вид инструментов Plotly.

- Canvas и Plotly paper всегда белые: `#ffffff`.
- Подложка modebar белая и непрозрачная, без border и shadow.
- Стандартные иконки Plotly не заменяются и не переставляются.
- Default icon: `#b8b8b8`.
- Hover: icon `#7a7a7a`, button surface `#f8f8f8`.
- Active/selected tool: icon `#5f5f5f`, button surface `#f2f2f2`.
- Plotly logo скрыт.
- Hover и active не меняют размеры, padding и положение modebar.

Designer переносит этот внешний вид в `DESIGN.md` и prototype. Frontend
реализует его через Plotly layout/config и canonical CSS. E2E проверяет
computed colors и screenshot реального foreground Chrome.
