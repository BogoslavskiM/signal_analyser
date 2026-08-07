# Critical Scenario Coverage

Формируй доказуемый verdict о полноте сохранённых MATLAB reference scenarios.
Verdict относится только к объявленному research scope и не подменяет
результат E2E, Engee comparison или production regression.

## 1. Зафиксировать независимый scope

1. Задай `coverage_scope_id`, приложение/feature, включённые зоны и timestamp.
2. Построй requirement inventory независимо от уже сохранённых scenarios:
   используй user TS, официальную MathWorks документацию, карту контролов и
   наблюдения приложения. Иначе отсутствующий scenario невозможно обнаружить.
3. Пометь requirement как `critical`, если его отказ блокирует основной
   пользовательский workflow, меняет математический результат/единицы,
   повреждает или теряет данные/session, ломает переход между ключевыми
   режимами либо не даёт восстановиться после validation/error state.
4. Зафиксируй причину criticality. Не размножай варианты, если у них одинаковы
   действия и oracle; разделяй их, когда меняется поведение или риск.

## 2. Получить сохранённый catalog

1. Получи `catalog_path` и ожидаемый project/scope из handoff либо актуального
   `GET /agent/bootstrap`. Не подставляй путь конкретного приложения и не
   угадывай каталог.
2. Проверь, что resolved catalog существует и относится к заявленному project
   root. Прочитай его read-only и построй отсортированный manifest из relative
   path, bytes и SHA-256 каждого scenario artifact до и после audit.
3. Если runtime устойчиво доступен, используй `GET /agent/bootstrap` для
   дополнительной проверки: отфильтруй `documents[]` по
   `kind == "reference_scenario"` и scope/path, возвращённым bootstrap или
   handoff; сравни `path`, `local_path`, `bytes` и `sha256` с filesystem
   manifest.
4. У clicker нет `GET /research/scenarios`. `POST /research/scenarios` — только
   write endpoint и не может служить listing API. Не угадывай другие endpoints.
5. Для bootstrap проверь `ok`, `schema_version`, ожидаемый `project_root` и
   полное совпадение catalog. Connection refusal или stale PID означает
   `api_verification: unavailable`, а не пустой catalog.
6. Не копируй scenarios в product repository. В отчёте храни только стабильные
   scenario ID/path и provenance.
7. Запиши `acquisition_mode`, API verification status, resolved catalog path,
   retrieved-at, число/bytes artifacts и fingerprint отсортированного manifest.
   При изменении membership/content между начальным и конечным snapshot начни
   audit заново.
8. Если path не определён, API и filesystem расходятся либо artifact не
   читается/не соответствует ожидаемому содержанию, выставь отрицательный
   verdict и конкретный gap.

Catalog состоит из неформализованного Markdown без обязательного frontmatter.
Проверяй содержимое, а не ожидай структурные metadata. SHA-256 подтверждает
content identity, но не доказывает актуальность поведения. Ссылку на screenshot
или другой evidence считай доступной только если ресурс действительно
retrievable; исчезнувший ephemeral attachment остаётся gap.

Недоступный runtime не мешает анализу устойчивого filesystem snapshot, но
запрещает заявлять новое live-observation evidence.

## 3. Построить coverage matrix

Одна строка соответствует одному requirement/scenario и содержит:

| Поле | Содержание |
|---|---|
| `requirement_id` | стабильный ID requirement из независимого inventory |
| `scenario_id` / `artifact_path` | ID и возвращённый clicker path либо gap |
| `criticality` / `criticality_reason` | `critical`/`noncritical` и причина |
| `source_evidence` | user TS, docs и/или observation |
| `preconditions_actions_oracle` | проверяемая полнота самого scenario |
| `artifact_status` | `covered`, `missing`, `stale`, `invalid`, `conflict` |
| `downstream_owner` | `e2e`, `engee_user` или `both` |
| `handoff_id` | сохранённый Orchestrator handoff либо `pending` gap |
| `latest_result` | `passed`, `failed`, `blocked` или `not_run` с источником |
| `gap_or_blocker` | конкретный незакрытый разрыв |

`covered` допустим только для retrievable artifact с preconditions, actions,
наблюдаемым oracle и evidence. Имя файла без проверяемого содержимого не
считается покрытием.

## 4. Рассчитать verdict

Верни машинно-читаемый блок:

```yaml
coverage_scope_id: <stable-id>
verdict_scope: matlab_reference_scenario_catalog
catalog_snapshot: <provenance-and-fingerprint>
critical_scenarios_total: <integer>
critical_scenarios_covered: <integer>
critical_scenario_gaps: <integer>
all_critical_scenarios_covered: false
all_critical_scenarios_executed: false
all_critical_scenarios_passing: false
verdict_reason: <concise evidence>
```

Установи `all_critical_scenarios_covered: true` только одновременно при всех
условиях:

- scope и critical requirement inventory объявлены независимо от catalog;
- catalog snapshot читаем, стабилен и имеет provenance;
- каждый critical requirement имеет ровно один актуальный `covered` artifact
  либо явно обоснованный набор variants;
- нет missing/stale/invalid/conflict artifacts, неизвестных critical зон,
  противоречий или незакрытых gaps;
- у каждого critical scenario есть downstream owner и сохранённый handoff ID.

Нулевой critical inventory не даёт автоматический `true`: сначала докажи, что
scope действительно не содержит критических workflows. Любое расширение scope
сбрасывает verdict до повторного audit.

`covered` означает полноту reference-scenario catalog. Отдельно и честно
показывай `executed` и `passing`: не превращай `not_run` в успех и не называй
этот verdict E2E/production coverage.

## 5. Маршрутизировать результат

- UI, dynamic states и пользовательские workflows → E2E.
- Математика, functional parity и compatibility → Engee User.
- Смешанные scenarios → обоим.
- Полную matrix, snapshot и verdict → Orchestrator.

Не поддерживай отдельный backlog. Missing coverage, `pending` routing и
blockers передавай Orchestrator как task candidates.

Перед завершением повтори snapshot, проверь полноту matrix и убедись, что
boolean verdict следует перечисленным условиям, а не субъективной оценке.
