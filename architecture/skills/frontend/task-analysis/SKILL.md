# Анализ задачи Frontend

Применяй перед implementation для каждого frontend handoff.

## Вход

Прочитай handoff/task, user TS, `design_ref`, pinned `design_version`, текущий
frontend code, API client and backend reports. Не считай technical reference
продуктовым требованием.

## Порядок работы

1. Зафиксируй implementation scope and out of scope.
2. Для UI-affecting work проверь `design_status: ready`, version, screens,
   states, viewports, clickable prototype map, proportions, local assets,
   visual references and evidence.
3. Если design package отсутствует или неполон, отправь Designer
   `design_revision`. Укажи affected screen/state/viewport, точный gap,
   текущий screenshot/code evidence and expected answer. Не предлагай Designer
   API или visual solution вместо описания ограничения.
4. Определи controls, displayed data and user actions из task/design package.
5. Для каждого action/data изучи method, path, request, response, errors and
   lifecycle; отдельно отметь changed contracts.
6. Если не хватает data/field/endpoint, отправь Backender отдельный `task`
   handoff с affected UI and desired contract extension.
7. Заверши списком deliverables, design/API gaps and independent work, которое
   можно продолжать во время ожидания.
8. Для data-heavy outputs явно проверь наличие `/api/state-lite`,
   `state_revision`, active-page data/pending contract и назначь
   settings/output/graph/project-structure skills; отсутствие любого контракта
   является Backender gap, а не поводом считать DSP на frontend.

Не начинай зависимую visual implementation до design revision и зависимую API
implementation до backend response. Верни matrix
`design element → prototype action/state → API → frontend state → selector → test`
и pinned design
version, которая должна быть реализована.

Перед завершением проверь, что каждое observable action связано с contract или
explicit gap, а каждый required state/viewport покрыт Designer package.
