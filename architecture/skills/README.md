# Скиллы

`architecture/skills/` содержит проектные переиспользуемые скиллы для агентов.

Скиллы не являются контрактами ролей. Контракты ролей определяют зоны
ответственности и границы в `architecture/agents/roles/`. Скиллы описывают
повторяемые рабочие процедуры, которые роль может загрузить для задачи.

## Универсальная модель

- Каталог универсален для Genie-приложений. Проектные требования и статусы
  хранятся в `architecture/documentation/`, а не в универсальных skills.
- Наличие skill не делает product capability обязательной. Blueprint выбирает
  возможности, после чего Architect подключает только подходящие skills.
- Составной skill разделяет `Core Contract` и `Optional Capabilities`.
  Указание skill id означает соблюдение ядра. Handoff отдельно перечисляет
  стабильные ids расширений в `enabled_optional_capabilities`.
- `requires-skills` в manifest перечисляет обязательные core contracts других
  skills. Их optional capabilities автоматически не включаются.
- Версия хранится только в `manifest.yaml`; frontmatter `SKILL.md` хранит
  только `name`.

## Defaults

- Frontend по умолчанию использует vanilla JavaScript без bundler. Другой стек
  разрешён только по прямому решению пользователя и фиксируется ADR вместе с
  отдельной технологической инструкцией.
- Visual profile по умолчанию: светлая тема, локальный Roboto, Engee-подобный
  язык и fixed canvas минимум `920 × 680` без responsive-перестройки. Другой
  профиль требует прямого решения пользователя и ADR.
- API по умолчанию использует HTTP 200 для semantic validation и HTTP 500 для
  неверного API type. `409`, `422`, revisions и другие схемы требуют явного
  проектного решения и ADR.
- Worker queue/revision/cancellation — optional capability, включаемая после
  измерений либо явного требования. После включения её инварианты обязательны.

## Frontend assets

Frontend bundles используют vanilla JavaScript contract
`create(options) → { state, actions, render, mount, unmount }`. HTML-assets
являются mount points без framework directives. Проверяй их командой:

```bash
node architecture/skills/frontend/validate_vanilla_assets.js
```

Не используй скиллы для повторения базовых правил поведения агента: отчетности,
передачи задач, проверки или границ каталогов. Эти правила находятся в
`architecture/agents/roles/*.toml`.

Скиллы сгруппированы по ролям. Каждый конкретный скилл хранится в отдельном
каталоге в формате содержимого Engee MCP:

```text
<role>/<skill-name>/
  manifest.yaml
  SKILL.md
```

Каталоги ролей:

- `architect/`
- `backend/`
- `frontend/`
- `tester/`
- `e2e-tester/`
- `devops/`
- `matlab-researcher/`

Используй один каталог скилла на каждую повторяемую проектную процедуру. Зоны
ответственности ролей храни в `architecture/agents/roles/`, а память конкретных
задач — в `architecture/documentation/agents/`, а клиентские спецификации,
решения и история — в `architecture/documentation/user/`.

Проверка каталога:

```bash
ruby architecture/skills/validate_skills.rb
```
