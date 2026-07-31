---
name: matlab-clicker-research-loop
version: 0.3.0
---
# MATLAB Clicker Research Loop

## When to Use
- Architect запросил автономное исследование конкретного MATLAB-приложения.
- Другому агенту нужен новый reference-сценарий или уточнение поведения MATLAB.

## When NOT to Use
- Нужно написать Playwright, unit/API test или исправить Genie-приложение.
- Нужно изменить `matlab_clicker`, его API, профиль или координаты.

## Official Documentation Research Map
1. До clicker-исследования найди релевантные official MathWorks pages через
   обычный internet research вне MATLAB. Используй official docs как primary
   source и сохрани прямые URL в `docs_sources`.
2. Никогда не открывай и не используй MATLAB Add-On Explorer. MATLAB app не
   является инструментом поиска документации.
3. Преобразуй документацию в `documented_direction`: список заявленных
   workflows, операций, представлений, ограничений и вопросов, которые должен
   проверить clicker. Это research map, а не исчерпывающая спецификация UI.
4. После каждого существенного clicker handoff уточняй internet research map,
   если фактическое приложение открыло новый workflow или термин. Цикл docs ->
   clicker -> delta -> новые product/tests tasks является постоянным.

## Bootstrap
1. Выполни `matlab_clicker status`.
2. Если сервер остановлен, запусти его через `matlab_clicker up`.
3. Получи актуальный URL из `matlab_clicker status`.
4. Вызови `GET /health`, затем `GET /agent/bootstrap`.
5. Прочитай всё содержимое `documents` с `kind=skill`.
6. Прочитай API guides, OpenAPI, `recommended_workflow`,
   `coordination_rules`, `vision_cycle`, существующие reference-сценарии и
   metadata артефактов.
7. Не используй сохранённую копию bootstrap от предыдущего запуска сервера.

Если detached server завершается вместе с exec-командой, удерживай startup в
долгоживущей exec-сессии и выполняй HTTP-запросы, пока эта сессия активна.

## Keyboard Layout Precondition
1. Для каждой отдельной команды Command Window заново выполни полный цикл:
   focus Command Window -> pre-input Enter для получения fresh prompt ->
   принудительный English/ASCII -> type -> visual verification набранной строки
   -> execution Enter. Цикл нельзя переиспользовать между командами.
2. Для text fields вне Command Window pre-input Enter не выполняй: перед каждым
   text/name/path input установи English/ASCII, набери и визуально проверь текст,
   затем используй штатное действие поля.
3. HTTP success или отправленные key events не подтверждают правильность
   набранного текста; выполнение разрешено только после visual verification.
4. После любого ввода русского текста в UI снова принудительно установи
   English/ASCII до следующего command/name/path input.
5. Если команда или путь повреждены раскладкой либо смешанными символами, не
   выполняй их: полностью очисти поле/Command Window line и набери заново.
6. Выполнение этого precondition обязательно перед каждым соответствующим
   clicker action и фиксируется в `clicker_setup` handoff.

## Native Mouse Actions
- Double-click: выбери подтверждённый stable center цели, выполни нативные два
  быстрых LMB clicks в пределах системного double-click interval без движения
  мыши между clicks, затем сделай screenshot и визуально подтверди результат.
  Не подменяй double-click двумя медленными single-click действиями.
- Drag-and-drop: начни в подтверждённом stable center источника, удерживай ЛКМ
  (`mouseDown`), перемести указатель к подтверждённой target point, выдержи
  короткую pause, затем отпусти (`mouseUp`) и визуально проверь результат. Не
  подменяй drag-and-drop последовательностью click-click.
- Если visual verification не подтверждает ожидаемый state transition, action
  не считается успешным; зафиксируй observed result и повторяй только после
  проверки координат/состояния.

## Research Loop
1. В MATLAB используй только workspace/Command Window и Signal Analyzer app.
   Никогда не открывай Add-On Explorer и не переходи в другие MATLAB apps для
   поиска документации или расширений.
2. Найди запрошенный Signal Analyzer и используй одно существующее окно.
   Открывай приложение только при его отсутствии.
3. На основании `documented_direction`, server-side skills, профиля, live
   controls и уже сохранённых сценариев определи непокрытые смысловые области.
4. Не ограничивайся подтверждением документации. Целенаправленно фиксируй
   undocumented controls, labels, defaults, enabled/disabled states, state
   transitions, dependent workflows, edge cases, errors и visual outcomes.
5. Не перебирай полное декартово произведение настроек. Покрывай значимые
   пользовательские workflow, состояния, зависимости, ошибки, dialogs,
   графики, exports и persistence.
6. Включай static profile commands, live controls и dropdown options.
7. Для каждого числового input проверь минимум три значения: обычное валидное,
   граничное валидное и невалидное.
8. Для одиночной стабильной команды предпочитай `/app/click`.
9. Popup-dependent и многошаговые действия объединяй в один `/run` с настройками
   `exclusive_mouse=true` и `restore_mouse_after_run=true`.
10. Завершай значимые batches screenshot-действием по пути под `/private/tmp`.
11. Открывай PNG через vision tool и проверяй фактическое состояние. HTTP 200 не
   считается доказательством изменения UI.
12. Используй generic `/run`, если named profile command отсутствует, но API
    позволяет надёжно выполнить и подтвердить действие.
13. Перед сообщёнными E2E Tester Space/focus/window actions подтверди безопасный
    coordination point. E2E не получает права перемещать/закрывать MATLAB;
    MATLAB Researcher сохраняет текущее MATLAB window/Space state.

## Scenario Stream
1. Один сохранённый сценарий отвечает на один исследовательский вопрос.
2. Как только сценарий готов, найди в актуальном OpenAPI server-side endpoint
   сохранения и отправь сценарий в требуемом формате.
3. Используй только путь файла или каталога, возвращённый сервером. Не угадывай
   локальное расположение и не записывай сценарий напрямую.
4. Немедленно отправь E2E Tester и Architect структурированный research
   handoff. Поля `product_tasks` и `e2e_scenarios` должны быть actionable, а не
   общими пожеланиями:

```text
docs_sources:
documented_direction:
clicker_setup:
observed_undocumented_behavior:
docs_vs_app_delta:
product_tasks:
e2e_scenarios:
engee_bug_candidate: optional
```

Каждый элемент `e2e_scenarios` содержит `scenario_id`, возвращённый сервером
`system_path`, research question, observable behavior, numeric artifacts и
uncertainties.

5. Одновременно уведомь Architect и продолжай исследование, не ожидая E2E.
6. При вопросе любого агента исследуй недостающее поведение и верни новый либо
   уточнённый сценарий тем же способом.

## Completion
- Все смысловые области приложения представлены сохранёнными сценариями.
- Для каждого направления сохранены official docs source, фактические
  undocumented observations и явный docs/app delta.
- Каждый новый сценарий передан E2E Tester.
- Непокрытые области отсутствуют либо перечислены как `blocked` с
  доказательствами.
- `blocked` допустим только когда действие невозможно выполнить или подтвердить
  через API текущего запуска. Отправь handoff владельцу clicker и Architect:

```text
application:
blocked_control_or_action:
attempted_api_operations:
observed_result:
diagnostics:
required_human_change:
```

- Не изменяй clicker самостоятельно.
- Не останавливай сервер после завершения.
- Не ожидай результатов E2E перед завершением исследования.

## Guardrails
- Только один MATLAB Researcher изменяет MATLAB GUI.
- Остальные агенты могут работать параллельно.
- Никогда не открывай и не используй MATLAB Add-On Explorer.
- Документацию ищи только обычным internet research вне MATLAB.
- В MATLAB clicker ограничен workspace/Command Window и Signal Analyzer app.
- English/ASCII layout и проверка набранного текста до Enter обязательны для
  каждого command/name/path input; повреждённый ввод очищается и набирается
  заново.
- Каждая Command Window команда начинает новый focus -> pre-input Enter ->
  English/ASCII -> type -> verify -> execution Enter цикл. В text fields вне
  Command Window pre-input Enter не используется.
- Double-click и drag-and-drop выполняются только нативными mouse primitives с
  удержанием/системным timing и обязательной visual verification; click-click
  и медленные single-click substitutes запрещены.
- Не пиши тесты и не сравнивай MATLAB с Genie.
- Не создавай отдельную coverage matrix: покрытие фиксируют сохранённые сценарии
  и явный список блокеров.
- Не редактируй файлы текущего проекта или `matlab_clicker`.
- Не считай скриншот точным численным oracle.
- Не повторяй сохранённые сценарии без причины считать их устаревшими.
- При вероятном дефекте Engee верни candidate evidence Architect, но не
  классифицируй `confirmed` без safe repeat и isolation от MATLAB/clicker/app.
