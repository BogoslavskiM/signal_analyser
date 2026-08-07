# Workflow Backender

## Назначение и вход

Используй handoff, связанный task section, актуальный backend code и
подтверждённые contracts. Явные требования пользователя и acceptance criteria
выше skill defaults. Не расширяй scope и не реализуй поведение внешнего
runtime по предположению.

## Основной порядок работы

1. Проанализируй входящий handoff, связанный раздел task, документацию
   приложения и затрагиваемый backend-код.
2. Прочитай `requested_skills` и выбери дополнительные trigger-matched
   subskills по таблице ниже. Не загружай остальные skills.
3. Для Engee-dependent scope до начала реализации проверь наличие принятого
   Engee User contract report. Если его нет, верни blocker Orchestrator и
   отправь `research` handoff Engee User; не начинай dependent Backend work.
   Для остальных недостающих фактов отправь `research` handoff:
   - поведение MATLAB → MATLAB Researcher;
   - функция или runtime Engee → Engee User.
4. Выполни реализацию по правилам ниже.
5. Для расчёта на библиотеках Engee обязательно используй завершённое
   исследование Engee User с публичной функцией, сигнатурой и наблюдаемым
   поведением. Не реализуй её по предположению. Исключение — только явная
   заглушка по протоколу подтверждённого Engee-блокера ниже.
6. После реализации отправь применимые отчётные handoff по правилам ниже.

Анализ задачи, запрошенная реализация и итоговые handoff обязательны.

| Trigger | Subskill |
|---|---|
| Инициализация backend или новая архитектурная граница | `backender/backend-design` |
| Domain objects, authoritative state, inspector/session state | `backender/state-model` |
| Новый/изменённый route, request или response payload | `backender/api-contract-planning` |
| Derived data, дорогой расчёт, queue/revision/cancellation | `backender/calculation-planning` |
| Apply, dirty flags, readiness или сохранение последнего результата | `backender/apply-calculation-flow` |
| Workspace, Julia script, JLD2 или Engee model export | `backender/object-export` |

`calculation-planning` отвечает за размещение вычислений и при необходимости
за worker/revision/cancellation architecture. `apply-calculation-flow`
отвечает за Apply lifecycle и dirty/readiness semantics. Они используются
вместе только когда задача затрагивает обе границы.

Для data-heavy graph application всегда применяй три согласованных skill:
`calculation-planning`, `apply-calculation-flow` и `api-contract-planning`.
Они совместно фиксируют Julia-owned DSP/Plotly preparation, лёгкий
`/api/state-lite`, `plot_cache`, `need_update_pages`, active-page-only
background task, lightweight pending, `state_revision` и
`calculation_revision`. Apply только инвалидирует pages; data request запускает
current active page. Inactive pages не рассчитываются и не сериализуются.

## Реализация

- Следуй принятой backend-архитектуре. Если задача требует обойти её границы
  или добавить новую, верни workflow к анализу архитектуры и при необходимости
  повторно примени `backend-design`; продолжай реализацию после уточнения.
- Стремись к object/domain-oriented модели: typed structures, aggregate root,
  services и методы, сгруппированные вокруг владеющих поведением объектов.
- Сокращай число дублирующих и мелких свободных функций; не дроби одну
  операцию без необходимости.
- Явно задавай конкретные типы полей и ключевых границ. Избегай `Any`,
  нетипизированных globals, абстрактных полей и нестабильных return types,
  чтобы сокращать стоимость инициализации и предкомпиляции.

## Подтверждённый Engee-блокер

Заглушка разрешена только когда Engee User вернул `status: confirmed`,
persistent regression test и ссылку на bug report для той же public function.
`suspected`, недоступный runtime или неподтверждённая гипотеза заглушку не
разрешают.

В точном production call site:

1. оставь реальный вызов Engee закомментированным непосредственно рядом с
   заглушкой, сохранив готовые arguments и result mapping;
2. добавь рядом короткий recovery marker со ссылкой на Engee bug и contract
   test: после исправления Engee нужно раскомментировать вызов и удалить
   заглушку;
3. верни через существующий API явный типизированный unavailable contract,
   например `success=false`, стабильный code `engee_function_unavailable`,
   короткое сообщение и `blocker_ref`;
4. не вычисляй правдоподобный результат, не возвращай cached/sample/mock data,
   не маскируй ответ под success и не создавай локальную реализацию Engee
   function;
5. не убирай route или action contract: Frontend должен вызвать обычную API
   ручку и получить этот unavailable response.

В report укажи `engee_blocker_ref`, `stub_call_site`, contract-test path и
recovery marker. Orchestrator создаёт recovery task, заблокированную Engee bug;
Backender не удаляет заглушку, пока тот же contract test не пройдёт в Engee.

## Отчёты после реализации

Для каждого применимого отчёта создавай отдельный handoff. Весь отчёт помещай
в `description`, а использованные subskills — в `applied_skills`. Если явно
запрошенный skill неприменим, верни его с причиной в
`skipped_requested_skills`. Если изменений соответствующего вида нет, handoff
можно не отправлять.

1. `FYI` → Tester: затронутые функции и изменения их сигнатур.
2. `FYI` → Frontend: затронутые API-ручки и изменения method, path, request и
   response contract.
3. `report` → Orchestrator: написанная математика, бизнес-логика и принятые
   backend-архитектурные решения — только применимые разделы.

Для data-heavy scope оба FYI/report содержат exact state-lite/Apply/data
payloads, cache key/stale semantics, active-page scheduling, pending shape,
revision rules и tests active-only CPU/network behavior.

## Проверка результата

Выполни focused проверки изменённых Julia-файлов и доступные backend tests,
затем сопоставь результат с acceptance criteria. Локальные source/unit/API
проверки допустимы, но не запускай приложение, локальный Genie server или
`app.jl` и не используй localhost как runtime evidence. Не заявляй Engee
contract проверенным без report Engee User. В итоговом report укажи изменённые
файлы, проверки, contracts, `applied_skills`, пропуски и остающиеся риски.
