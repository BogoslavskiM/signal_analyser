# Агенты

`architecture/agents/` — каноническое описание многоагентного процесса для
этого шаблона Genie-приложения.

Порядок чтения:

1. `architecture/agents/manifest.toml`
2. Файл активной роли в `architecture/agents/roles/*.toml`.
3. Подходящие скиллы из `architecture/skills/<role>/<skill-name>/SKILL.md`.

`manifest.toml` — индекс проекта. Файлы ролей определяют зоны ответственности
и поведение. `adapt.sh` переносит эти же правила в runtime-файлы Codex, Claude,
Cursor, Windsurf, Cline, Roo и Gemini.

Каждая роль задает абстрактный уровень модели в поле `model_level`: `high`,
`medium` или `low`. `adapt.sh` преобразует этот уровень в модель выбранного
инструмента. Для Codex, Claude и Gemini модель записывается в нативную
конфигурацию агента. Для Cursor, Windsurf, Cline и Roo вычисленная модель
добавляется в инструкции роли, поскольку их текущие rule-файлы не переключают
модель самостоятельно.

Уровень reasoning автоматически выводится из `model_level` по единой шкале:
`high → xhigh`, `medium → medium`, `low → low`. Сама шкала хранится только в
секции `[model_selection]` манифеста; файлы ролей ее не дублируют. Codex
получает значение через `model_reasoning_effort` в сгенерированном TOML роли,
а остальные адаптеры — как обязательную инструкцию роли.

Запускай скрипт адаптера из корня репозитория:

```bash
bash architecture/agents/adapt.sh
```

Полезные неинтерактивные режимы:

```bash
bash architecture/agents/adapt.sh --list
bash architecture/agents/adapt.sh --adapter=codex --dry-run
bash architecture/agents/adapt.sh --adapter=claude --force
```

Скрипт создает runtime-файлы и каталоги выбранного инструмента. Например, для
Codex создаются `AGENTS.md`, `.codex/config.toml` и `.codex/agents/*.toml`.
Для Gemini создаются `GEMINI.md` и `.gemini/agents/*.md`.

## Строгие зоны ответственности

В этом шаблоне используются строгие зоны ответственности по каталогам. Агент
может редактировать только пути, перечисленные в контракте его роли. Если для
работы требуется другой каталог, агент передает задачу владельцу, а не выходит
за границы своей роли.

DevOps не владеет файлами исходного кода. Его зона ответственности —
операции Git и Engee: подготовка ветки, выборочный commit, push, deployment и
merge принятой задачи. Возможность добавить согласованные файлы в commit не
даёт DevOps права редактировать эти файлы.

MATLAB Researcher также не владеет файлами проекта. Он управляет MATLAB только
через внешний `matlab_clicker`, сохраняет сценарии через API сервера и передаёт
полученные системные пути другим агентам.

## Базовые роли

- `architect`
- `backend`
- `frontend`
- `tester`
- `e2e_tester`
- `devops`
- `matlab_researcher`

Чтобы добавить роль, создай TOML-файл в `architecture/agents/roles/`, запись
`[[roles]]` в `architecture/agents/manifest.toml` и добавь файл в `ROLE_FILES`
скрипта `architecture/agents/adapt.sh`.
