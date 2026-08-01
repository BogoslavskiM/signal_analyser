---
name: engee-environment-deployment
---
# Engee Environment Deployment

## When to Use
- После успешных локальных тестов, commit и push агенты запросили deployment.
- Нужно развернуть ветку в Engee target, зафиксированный проектным manifest.

## When NOT to Use
- Есть незакоммиченные изменения или не прошли обязательные локальные тесты.
- Нужно открыть приложение или выполнить E2E-сценарий.

## Input
```text
environment: <manifest.engee_target.environment>
repository_url:
repository_name:
branch:
commit_sha:
changed_zones:
```

До подключения прочитай `[engee_target]` в
`architecture/agents/manifest.toml`. Enforce `environment`, `base_url`,
`mcp_server`, `allow_devhub` и `allow_fallback`. PAT выбранного MCP server
получай только из защищённых root AGENTS instructions; не копируй его значение
в repository files, reports, logs или сохранённые commands.

## Workflow
1. Подключись только к `mcp_server` из manifest через Engee MCP или Engee
   plugin. Проверь совпадение фактических environment и base URL с
   `[engee_target]`. При несовпадении прекрати операцию. Fallback допустим
   только когда `allow_fallback=true`, а его target явно задан project policy;
   одного allow flag без target недостаточно.
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

1. HTTP probe `base_url` из `[engee_target]` и auth/account contour отдельно от
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
- Не подключайся к devhub, если `allow_devhub=false`.
- Не используй fallback, если `allow_fallback=false` или fallback target не
  задан project policy.
- Не принимай environment из произвольного task text в обход `[engee_target]`.
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
- Official Engee Help Center: Genie public control functions for the configured
  environment.
- `devops/task-branch-lifecycle`
