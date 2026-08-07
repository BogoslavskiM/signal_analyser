# Backend Object Export

Единый backend skill для доставки уже подготовленного domain value или model
description. Он не вычисляет предметную математику и не подменяет session
import/export.

Явное требование пользователя и capability текущего приложения определяют
доступные operations. Если operation-specific runtime отсутствует, верни
blocker; не подменяй формат другим и не добавляй скрытый fallback.

## Общий контракт

Вход всегда содержит:

```text
operation: workspace | julia_script | jld2 | engee_model
prepared_value_or_description:
target:
overwrite:
```

Вызывающий domain module отвечает за выбор объектов, расчёт параметров,
coefficients, units и математический смысл. Export отвечает за валидацию
target, безопасную запись/доставку, reproducibility и нормализованный result.

## Общий workflow

1. Проверь, что operation доступна в текущем runtime и разрешена backend
   capability contract.
2. Повторно валидируй target, extension/name и `overwrite` независимо от
   frontend checks.
3. Проверь весь конфликтующий input до первой внешней записи.
4. Выполни operation-specific flow ниже.
5. Для file outputs используй temporary target и замени итоговый path только
   после успешного формирования.
6. Верни `success`, operation и нормализованный variable/path/model target;
   полную ошибку сохрани в backend log, frontend верни короткий текст.

## Workspace

Вход: prepared Julia/Engee value, `variable_name`, `overwrite`.

- Валидируй variable name как Julia identifier; не используй `eval` и не
  интерполируй непроверенное имя.
- Проверяй conflict до записи и передавай value без изменения типа через
  публичный workspace adapter Engee.
- Локальный Julia `Main` не считается Engee workspace.

## Julia script

Вход: `.jl` path, required packages, prepared constructor code и optional
usage section.

- Генерируй deterministic source с explicit imports и escaped literals.
- Не принимай произвольные пользовательские source fragments.
- Не включай absolute app paths, frontend state и backend globals.
- Результат должен parse и запускаться в чистом подходящем Julia/Engee
  environment без исходного Genie application.

## JLD2

Вход: `.jld2` path, explicit dataset keys/values и optional prepared metadata.

- Не превращай export в dump backend process.
- Не сохраняй tasks, threads, locks, open handles и runtime logs.
- Проверяй non-empty unique keys и typed round-trip в чистом environment.
- Не добавляй session-only metadata вроде `__genie_app_name`.

## Engee model

Вход: model name, `.engee` path и validated description: blocks, string
parameters, lines и layout.

- Используй только публичный строчный `engee.*` API; не создавай `.engee`
  прямой file write.
- Не угадывай library paths, parameters и ports. Требуй Engee User evidence
  для используемого public contract.
- Создавай/сохраняй model через Engee API, добавляй validated blocks/lines,
  сохраняй после значимых стадий и проверяй открытие результата.
- Для executable model проверяй simulation contract и To Workspace output.

## Verification

- Для всех operations: invalid target, overwrite conflict, unavailable runtime
  и отсутствие partial output.
- Workspace: read-back value и type/content equality.
- Julia script: parse, clean-process execution и object equality.
- JLD2: keys/types/shapes/values/metadata round-trip.
- Engee model: blocks, parameter strings, connections, layout и contract
  simulation при необходимости.

Успешная доставка не доказывает предметную математику prepared value: её
проверяют domain tests и, для Engee contracts, Engee User.

В завершении сообщи operation, нормализованный target, overwrite policy,
verification evidence и наличие/отсутствие partial output. Не включай в report
prepared value целиком, если он велик или содержит пользовательские данные.
