# DEC-20260731-008: универсальный каталог скиллов

ID: `DEC-20260731-008`  
Дата: 2026-07-31  
Статус: accepted  
Supersedes: none

## Контекст

Каталог процедур должен переноситься между Genie-приложениями. Ранее часть
описаний одновременно задавала универсальный workflow и обязательный состав
конкретного типового приложения: Vue 3, toolbar, inspector, session
import/export, worker queue и единый набор E2E flags. Это противоречило
фактическим проектам с другим набором возможностей.

## Альтернативы

- Сохранить один обязательный состав приложения.
- Полностью отказаться от defaults и выбирать все решения заново.
- Использовать capability router, универсальные defaults и явные проектные
  исключения.

## Решение

- Наличие skill не делает возможность обязательной. Blueprint выбирает
  capabilities, после чего подключаются только соответствующие skills.
- Составной skill имеет `Core Contract` и stable ids в
  `Optional Capabilities`; handoff перечисляет включённые ids.
- `requires-skills` включает только core contracts зависимостей.
- Версия хранится только в `manifest.yaml`; `SKILL.md` хранит имя и инструкции.
- Frontend default — vanilla JavaScript без bundler. Другой stack требует
  прямого решения пользователя и отдельного ADR.
- Default visual profile — светлая тема, локальный Roboto, Engee-подобный язык
  и fixed canvas `920 × 680`; отклонение требует решения пользователя и ADR.
- Default API semantics — HTTP 200 для semantic validation и HTTP 500 для
  wrong API type. Другие statuses/revisions являются проектным решением.
- Worker queue/revision/cancellation включается как optional capability после
  измерений либо явного требования.
- Универсальный E2E skill задаёт механизм capability flags, а конкретные
  product flag ids и их состояние принадлежат проекту и проверяемому target.
- DevOps выполняет начальный clean gate, затем может делать частичные
  commit/push checkpoints завершённых handoff, пока атрибутированные изменения
  других активных работ остаются в дереве.
- После restart сначала используется сохранённый role thread; недоступный
  thread заменяется с явной записью связи.
- Документационные artifacts создаются и обновляются только по реальному
  trigger; пустые записи ради формального DoD не создаются.

## Последствия

Каталог становится универсальным без потери defaults. Этап 1 обновляет
контракты, manifests и validation. Этап 2 отдельно переписывает legacy Vue
templates на vanilla JavaScript и проверяет каждый bundle.

## Связи и evidence

- [`../../../skills/README.md`](../../../skills/README.md)
- [`../../../skills/architect/app-creation-workflow/SKILL.md`](../../../skills/architect/app-creation-workflow/SKILL.md)
- [`../../../skills/validate_skills.rb`](../../../skills/validate_skills.rb)

## Датированные уточнения

- 2026-07-31: принято разделение изменения на contract/manifests stage и
  отдельный vanilla-assets stage.
- 2026-07-31: vanilla-assets stage завершён; frontend bundles используют
  `create → state/actions/render/mount/unmount`, а HTML содержит только mount
  points без framework directives.
