# Product Question Resolution

## Назначение

Используй этот skill только для вопроса субагента, который влияет на
пользовательский scope, default, visible behavior, приоритет или продуктовый
trade-off и не разрешён явным ТЗ, evidence либо одним наиболее релевантным
role skill. Orchestrator владеет классификацией и итоговым решением.

Не называй продуктовым вопросом implementation bug, отсутствие логов,
непрочитанный design/API contract, Engee function contract, вопрос ownership
или факт, который должен установить профильный агент.

## Startup bootstrap

Один раз при старте Orchestrator в корне проекта проверь только наличие
`ai_manager` в `PATH`. Версию не запрашивай и не сравнивай. Если utility
доступна, последовательно выполни ровно:

```bash
ai_manager load_skill --force
ai_manager connect
```

Не передавай `--project-id`, не используй `my-project` и не придумывай имя:
`connect` обязан автоматически связать текущий project. Прими bootstrap только
если обе команды завершились успешно и созданный skill `ask-to-ceo` можно
найти в активном Codex skill catalog либо по destination, напечатанному
`load_skill`. Полностью прочитай его `SKILL.md` перед первым вопросом и далее
следуй ему как authoritative transport contract.

Если binary отсутствует, любая из двух команд неуспешна или generated skill
недоступен, запиши `ai_manager_status: unavailable` и используй fallback ниже.
Не делай version gate и не повторяй bootstrap циклом.

## Обработка вопроса

1. Получи handoff/report субагента и связанную task. Запиши сам вопрос,
   затронутую зависимую работу и уже доступные факты.
2. Выбери один наиболее релевантный skill владельца и попытайся снять
   неоднозначность им. Запиши `resolution_attempted_skill` и результат. Если в
   catalog действительно нет подходящего skill, запиши `not_applicable` с
   причиной; не перебирай весь catalog.
3. Если вопрос разрешён, верни решение субагенту обычным handoff и этот skill
   больше не применяй. Если нет, классифицируй его как продуктовый и сформируй:
   один вопрос, 2–3 взаимоисключающих варианта, рекомендацию Orchestrator,
   влияние каждого варианта и точную зависимую работу.
4. Зафиксируй в task `product_question_status`, источник решения и ссылки на
   handoff/evidence. Блокировку представляй существующими `blocked_by` и
   `blocker_reason`, а не новым task status.

## Ветка ai_manager

Если startup bootstrap успешен, применяй установленный `$ask-to-ceo` skill.
Передай вопрос как требующий ответа, а не FYI. Project identity бери только из
автоматического `ai_manager connect`; не подставляй и не передавай project ID
самостоятельно. Сохрани возвращённый external question ID и связь с task.

Не опрашивай ответ циклом. Останови только работу, которая действительно
зависит от ответа; уже запущенную независимую работу не отменяй. Когда ответ
поступит через transport contract `$ask-to-ceo`, сверь project/question IDs,
запиши решение, сними соответствующий blocker и отправь точный decision
владельцу.

Если отправка через `$ask-to-ceo` не удалась, считай ai_manager недоступным для
этого вопроса и немедленно переходи к fallback.

## Fallback по development mode

Определи mode в порядке приоритета: явное указание пользователя в текущем
запросе → `development_mode` task/group → default из
`architecture/agents/manifest.toml`.

- `autonomous`: Orchestrator сам выбирает рекомендованный вариант по ТЗ,
  evidence и минимальному расширению scope. Запиши варианты, допущение,
  решение, влияние и `decision_source: orchestrator_autonomous`, затем передай
  решение субагенту и продолжай работу.
- `interactive`: останови зависимую работу и текущий orchestration turn, задай
  пользователю в чате один короткий вопрос с рекомендацией и 2–3 вариантами.
  Не выдавай зависимую реализацию до явного ответа. Уже запущенных независимых
  агентов не завершай только из-за ожидания.

Не переключай `interactive` в `autonomous` из-за молчания пользователя и не
вызывай другого агента для подмены продуктового решения.

## Результат и проверка

Верни и сохрани: `product_question`, `classification_reason`,
`resolution_attempted_skill`, `ai_manager_status`, `development_mode`,
`product_question_status`, `decision_source`, выбранное решение либо external
question ID и список заблокированной зависимой работы. Перед завершением
проверь, что прямое требование пользователя не было переопределено, project ID
не придуман, а не связанная с вопросом работа не заблокирована.
