# Engee Project Environment Sync

## Назначение

Применяй этот узкий subskill только в двух случаях:

- deployment diagnostics подтверждает, что запуск блокирует неразвёрнутое или
  устаревшее package environment в production Engee;
- в handoff явно запрошен `devops/engee-project-environment-sync` для
  синхронизации успешно запущенного Engee project environment.

Не запускай его после каждого deploy. Не используй для выбора библиотек,
ручного изменения compat/versions или исправления product source.

## Вход

Получи из DevOps workflow:

```yaml
app_path: <absolute or relative Engee app.jl path>
log_file: <absolute or relative Engee log path>
expected_revision: <exact SHA>
remote_project_dir: <optional; derive from resolved app_path directory>
environment_sync_reason: deployment_recovery | explicit_sync
```

Работай только с project-locked production Engee target. Сначала разреши
`app_path` и `remote_project_dir` в точные remote paths и подтверди checkout
revision. Не принимай произвольный каталог вне подтверждённого checkout.

## Package recovery в Engee

Выполняй этот раздел только для `deployment_recovery` после evidence-based
классификации package/environment failure.

1. Сохрани исходные log refs и exact failure signature.
2. В production Engee проверь доступность и актуальную сигнатуру встроенной
   команды `geniepkg_instantiate`; не угадывай аргументы и не создавай
   одноимённую локальную функцию.
3. Если команда доступна, выполни `geniepkg_instantiate` для подтверждённого
   remote project environment. Не запускай её повторно после успешного
   результата и не используй как обычный шаг каждого deploy.
4. Если команда отсутствует, её вызов неуспешен либо evidence указывает на
   несовместимый/необъявленный package contract в product source, останови
   recovery и верни diagnostics routing владельцу. Не переписывай TOML вручную.
5. После успешного instantiate повтори только Engee start/readiness stage через
   `engee.genie.start(app_path, log_file=log_file)` и подтверди URL, readiness и
   exact revision. Локальный application start запрещён.

## Синхронизация TOML-пары

Скачивай файлы только после успешного Engee start/readiness. Не считай
успешный `geniepkg_instantiate` достаточным без работающего приложения.

1. Через typed Engee file listing проверь наличие обоих файлов в exact
   `remote_project_dir`:
   - `Project.toml`;
   - `Manifest.toml`.
2. Скачай оба файла непосредственно из production Engee через typed file
   download. Не извлекай их из log, browser response или другого checkout.
3. До изменения локального проекта проверь для каждого файла:
   - basename и remote parent совпадают с ожидаемыми;
   - content непустой и успешно декодирован;
   - TOML разбирается без ошибки;
   - файл не содержит credential material.
4. Подготовь оба файла во временной local staging area. Если отсутствует или
   невалиден хотя бы один файл, не изменяй ни один локальный TOML и верни
   `blocked` с remote evidence.
5. Замени в корне локального проекта `Project.toml` и `Manifest.toml` как одну
   проверенную пару. Копируй remote content без merge, formatting, version
   editing или ручного восстановления отдельных sections.
6. После записи повторно разбери оба локальных TOML и зафиксируй для remote и
   local copies размер и checksum. Content должен совпадать byte-for-byte.
7. На этом заверши subskill. Не выполняй дополнительный add/commit/push,
   повторный deploy или локальный instantiate: локальная TOML-пара является
   единственным результатом синхронизации.

## Report

Верни:

```text
reason: deployment_recovery | explicit_sync
production target/revision:
remote project dir:
geniepkg_instantiate: performed | not_needed | blocked
Engee restart/readiness: performed | not_needed | blocked
remote Project.toml/Manifest.toml paths:
remote validation/checksums:
local Project.toml/Manifest.toml paths:
local validation/checksums:
environment_sync: performed | not_needed | blocked
diagnosis/log refs:
```

Добавь `devops/engee-project-environment-sync` в `applied_skills`. Не включай
TOML content, credentials или полный runtime log в handoff.

## Guardrails

- `geniepkg_instantiate`, Engee start и readiness выполняются только в
  production Engee.
- Никогда не запускай локально `Pkg.instantiate`, `julia --project`, `app.jl`,
  Genie server или localhost runtime.
- Не синхронизируй TOML до успешного Engee start/readiness.
- Не заменяй один файл без второго и не редактируй сгенерированный Manifest.
- Не используй subskill как routine cleanup успешного deploy.
- DevOps владеет только точным переносом remote TOML-пары; изменение dependency
  intent или product source передаётся Backender.
