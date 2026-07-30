---
name: engee-environment-deployment
version: 0.1.0
---
# Engee Environment Deployment

## When to Use
- После успешных локальных тестов, commit и push агенты запросили deployment.
- Нужно развернуть одну и ту же ветку в dev или prod.

## When NOT to Use
- Есть незакоммиченные изменения или не прошли обязательные локальные тесты.
- Нужно открыть приложение или выполнить E2E-сценарий.

## Input
```text
environment: dev | prod
repository_url:
repository_name:
branch:
commit_sha:
changed_zones:
```

Dev и prod равноправны: отдельное разрешение для prod не требуется.

## Workflow
1. Подключись к выбранному окружению через Engee MCP или Engee plugin.
2. Выполняй команды на Engee через предоставленный `eval_command`.
3. Используй каталог `/user/apps/<repository_name>`. Если `/user/apps` не
   существует, создай его.
4. Если проекта нет, выполни `git clone` в этот каталог.
5. Если проект уже существует, сначала проверь его рабочее дерево. При локальных
   изменениях или конфликтном состоянии прекрати deployment и передай
   диагностику Architect.
6. Получи remote refs, переключись на запрошенную ветку и обнови её только
   fast-forward способом. Если локальной ветки нет, создай tracking branch от
   соответствующей `origin/<branch>`.
7. Проверь, что разворачиваемый `HEAD` совпадает с переданным `commit_sha`.
8. Если изменился backend, получи список запущенных приложений:

```julia
engee.genie.list()
```

   Если целевое приложение запущено, вызови:

```julia
engee.genie.stop("/user/apps/<repository_name>")
```

Backend включает `app/**`, `lib/**`, `app.jl`, `config/**`, `Project.toml`,
`Manifest.toml` и другие Julia/server-side файлы приложения. Для изменений
только frontend или tests приложение не останавливай.

9. Всегда используй один и тот же файл логов внутри проекта:

```text
/user/apps/<repository_name>/genie.log
```

10. Если приложение не запущено, запусти его:

```julia
status = engee.genie.start(
    "/user/apps/<repository_name>";
    devel=true,
    log_file="/user/apps/<repository_name>/genie.log",
)
```

11. Получи URL из возвращённого `GenieApplicationStatus` (`status.open_url`
    либо соответствующее URL-поле доступной версии API). Не открывай
    приложение.
12. Получи и верни логи приложения через
    `engee.genie.logs("/user/apps/<repository_name>")`.
13. При ошибке верни диагностику и доступные логи. Не выполняй автоматический
    rollback.

## Guardrails
- Не размещай PAT, Git credentials или другие секреты в репозитории и отчёте.
- Не применяй reset, clean или stash к удалённой копии проекта.
- Не останавливай Genie при изменениях только frontend или tests.
- Не подменяй deployment локальным запуском Julia.
- Не запускай Playwright и не открывай URL.

## Output
```text
environment:
branch:
commit_sha:
start_result:
application_url:
log_file:
logs:
diagnostics:
```

## Reference
- https://engee.com/helpcenter/stable/ru/feature/genie-functions.html
- `devops/task-branch-lifecycle`
