---
name: matlab-clicker-research-loop
version: 0.1.0
---
# MATLAB Clicker Research Loop

## When to Use
- Architect запросил автономное исследование конкретного MATLAB-приложения.
- Другому агенту нужен новый reference-сценарий или уточнение поведения MATLAB.

## When NOT to Use
- Нужно написать Playwright, unit/API test или исправить Genie-приложение.
- Нужно изменить `matlab_clicker`, его API, профиль или координаты.

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

## Research Loop
1. Найди запрошенное приложение и используй одно существующее окно. Открывай
   приложение только при его отсутствии.
2. На основании server-side skills, профиля, live controls и уже сохранённых
   сценариев определи непокрытые смысловые области.
3. Не перебирай полное декартово произведение настроек. Покрывай значимые
   пользовательские workflow, состояния, зависимости, ошибки, dialogs,
   графики, exports и persistence.
4. Включай static profile commands, live controls и dropdown options.
5. Для каждого числового input проверь минимум три значения: обычное валидное,
   граничное валидное и невалидное.
6. Для одиночной стабильной команды предпочитай `/app/click`.
7. Popup-dependent и многошаговые действия объединяй в один `/run` с настройками
   `exclusive_mouse=true` и `restore_mouse_after_run=true`.
8. Завершай значимые batches screenshot-действием по пути под `/private/tmp`.
9. Открывай PNG через vision tool и проверяй фактическое состояние. HTTP 200 не
   считается доказательством изменения UI.
10. Используй generic `/run`, если named profile command отсутствует, но API
    позволяет надёжно выполнить и подтвердить действие.

## Scenario Stream
1. Один сохранённый сценарий отвечает на один исследовательский вопрос.
2. Как только сценарий готов, найди в актуальном OpenAPI server-side endpoint
   сохранения и отправь сценарий в требуемом формате.
3. Используй только путь файла или каталога, возвращённый сервером. Не угадывай
   локальное расположение и не записывай сценарий напрямую.
4. Немедленно отправь E2E Tester handoff:

```text
scenario_id:
system_path:
research_question:
observable_behavior:
numeric_artifacts:
uncertainties:
```

5. Одновременно уведомь Architect и продолжай исследование, не ожидая E2E.
6. При вопросе любого агента исследуй недостающее поведение и верни новый либо
   уточнённый сценарий тем же способом.

## Completion
- Все смысловые области приложения представлены сохранёнными сценариями.
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
- Не пиши тесты и не сравнивай MATLAB с Genie.
- Не создавай отдельную coverage matrix: покрытие фиксируют сохранённые сценарии
  и явный список блокеров.
- Не редактируй файлы текущего проекта или `matlab_clicker`.
- Не считай скриншот точным численным oracle.
- Не повторяй сохранённые сценарии без причины считать их устаревшими.
