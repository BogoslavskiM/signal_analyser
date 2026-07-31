---
name: engee-environment-deployment
version: 0.3.0
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
8. Если приложение требует platform-provided package, до остановки приложения
   выполни target runtime preflight: проверь required version, loaded
   module/PkgId UUID, безопасный import и согласованный package contract.
   Platform LOAD_PATH module может иметь
   `Base.find_package(...) === nothing`; это не failure само по себе. Missing
   module, wrong UUID или failed import/contract блокируют deployment. Не
   добавляй dependency в `Project.toml` и не устанавливай package.
9. Если изменился backend, получи список запущенных приложений:

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

10. Всегда используй один и тот же файл логов внутри проекта:

```text
/user/apps/<repository_name>/genie.log
```

11. Если приложение не запущено, запусти его:

```julia
status = engee.genie.start(
    "/user/apps/<repository_name>";
    devel=true,
    log_file="/user/apps/<repository_name>/genie.log",
)
```

12. Получи URL из возвращённого `GenieApplicationStatus` (`status.open_url`
    либо соответствующее URL-поле доступной версии API). Не открывай
    приложение.
13. Получи и верни логи приложения через
    `engee.genie.logs("/user/apps/<repository_name>")`.
14. При ошибке верни диагностику и доступные логи. Не выполняй автоматический
    rollback.

## Maintenance shell diagnosis

Если E2E или HTTP probe видит `Server maintenance` / «Ведутся технические
работы», в том числе с HTTP 200:

1. HTTP probe base `https://engee.com` и auth/account contour отдельно от
   приложения.
2. Probe точный target Genie URL, зафиксируй status, final URL, title/body и
   результат target API probe.
3. Получи `engee.genie.list()`/целевой process status и tail
   `/user/apps/<repository_name>/genie.log`.
4. При доступных base и auth/account классифицируй состояние как
   `target app/proxy failure`, вероятный app-side 5xx. HTTP 200 maintenance
   shell не меняет эту классификацию.
5. При недоступных base или auth/account contour классифицируй как
   `platform outage` и не приписывай сбой только приложению.
6. После разрешённого start/redeploy повтори target URL/API probe и передай E2E
   Tester handoff на повтор исходного scenario.

HTTP probe не является открытием URL в браузере и не запускает E2E внутри
DevOps role.

## Guardrails
- Не размещай PAT, Git credentials или другие секреты в репозитории и отчёте.
- Не применяй reset, clean или stash к удалённой копии проекта.
- Не останавливай Genie при изменениях только frontend или tests.
- Не подменяй deployment локальным запуском Julia.
- Не запускай Playwright и не открывай URL.
- Не объявляй Engee outage только по maintenance shell целевого приложения.
- Вероятный Engee defect передавай Architect как candidate с exact logs,
  versions, branch/SHA, minimal safe reproduction, repeat/isolation evidence,
  workaround и regression link. Workaround не является closure.

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
runtime_package_preflight:
classification:
base_auth_evidence:
target_http_status:
target_title:
target_url:
target_body_evidence:
target_api_probe:
genie_process_status:
application_log_tail:
post_start_target_probe:
e2e_rerun_handoff:
```

## Reference
- https://engee.com/helpcenter/stable/ru/feature/genie-functions.html
- `devops/task-branch-lifecycle`
