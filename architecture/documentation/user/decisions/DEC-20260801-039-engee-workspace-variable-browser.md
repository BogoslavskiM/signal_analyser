# DEC-20260801-039: встроенный браузер переменных Engee

ID: `DEC-20260801-039`
Дата: `2026-08-01`
Статус: accepted
Supersedes in part:
[DEC-037 signal inventory actions](DEC-20260801-037-signal-inventory-actions.md)
для workspace Add
Implementation: planned; not verified; not deployed

## Контекст

DEC-037 предполагал ручной ввод имени одной переменной рабочей области. Этот
workflow заменяется встроенным браузером переменных Engee: пользователь видит
серверный каталог, отмечает несколько строк checkbox и одной кнопкой добавляет
весь выбранный набор.

Публичный Engee API не предоставляет документированный метод перечисления
переменных. Поэтому обычный typed provider для каталога пока невозможен. При
этом чтение уже выбранного значения через `engee.genie.recv` остаётся
подтверждённой границей.

Это не файловый браузер. `frontend/file-browser-dialog` используется только как
interaction analogy для server-owned loading/error/busy lifecycle. Пути,
директории, root navigation, native picker и filesystem API не применяются;
его single-select ограничение заменено явным multi-select контрактом этого
решения.

## Решение

### Пользовательский workflow

Существующее действие `signals-add-workspace-action` открывает modal dialog со
списком переменных Engee. Каждая строка имеет native checkbox. Пользователь
может выбрать одну или несколько переменных и завершает операцию только
видимой кнопкой «Добавить выбранные».

Ручного поля имени переменной и per-variable rename больше нет. Имена в
каталоге read-only и обрабатываются как непрозрачные строки: frontend не
обрезает их, не меняет регистр и не строит из них выражения. Один общий sample
rate применяется ко всем выбранным raw vector/matrix. Для них по-прежнему
требуется finite positive `sample_rate_hz`; timed value по-прежнему выводит
частоту из uniform finite time и получает `sample_rate_hz=null` независимо от
общего input.

Refresh всегда получает новый immutable catalog snapshot с новой revision.
Checked selection принадлежит одной revision и при refresh полностью
сбрасывается; `signals-workspace-selection-count` доступно сообщает, что список
обновлён и переменные нужно выбрать снова. Закрытие, «Отмена» и refresh не
меняют Signals или app revision. Add недоступен без выбора и выполняет ровно
одну batch mutation независимо от числа выбранных переменных и созданных matrix
columns.

Copy, Extract from Time Limits и Delete целиком сохраняют DEC-037: deep copy,
raw inclusive ROI, confirmed Delete, запрет удаления последнего сигнала,
collision-safe names/colors и согласование всех Displays при удалении не
изменяются.

### Каталог и ограниченное исключение `eval`

Для каталога разрешается ровно одно security-reviewed исключение из запрета
DEC-037 на `eval`: provider-owned константная introspection-команда Engee,
которая возвращает только имена и ограниченную metadata типа/размерности.

Обязательные ограничения:

- текст команды является literal constant внутри provider adapter;
- команда не принимает пользовательский ввод, interpolation, concatenation,
  path, expression или fragment кода;
- context фиксирован provider adapter и не является Julia `Main` процесса
  приложения;
- результат не содержит values, samples, previews или сериализованное
  содержимое переменных;
- backend ограничивает число entries, длину имени, размер metadata и число
  dimensions до публикации response;
- malformed, oversized или расширенный content отклоняется целиком;
- unsupported constant introspection даёт явную capability failure; fallback
  на local `Main`, filesystem, guessed API или user-derived `eval` запрещён.

Prod proofs подтвердили обе provider-границы:

- прямой return `engee.genie.eval(code::AbstractString)`: одна constant
  bounded-metadata expression возвращает `(entries, truncated, total)` без
  временной workspace variable, `send` или cleanup;
- `engee.genie.recv(resolved_name; context=Main)` для имени, разрешённого самим
  catalog, возвращает vector с согласованными catalog type/shape.

Catalog ограничен первыми 1000 normalized entries, исключает
internal/imported bindings и не содержит values. Literal introspection code
остаётся implementation-private: контракт фиксирует его константность,
отсутствие interpolation и ограниченный result, но не копирует строку команды в
клиентскую документацию. Proof выполнен во внешней prod session; deployed-app
contract test всё ещё обязателен до E2E gate.

### App routes и payload

Catalog route является read-only и отвечает с
`Cache-Control: no-store`:

```text
GET /api/workspace/variables

200:
{
  catalog_revision: string,
  expires_at: RFC3339 UTC string,
  truncated: boolean,
  total: integer,
  variables: [
    {
      variable_id: string,
      name: string,
      type: string,
      shape: integer[],
      sample_count: integer,
      source_kind: "raw_vector"|"raw_matrix"|"timed_vector"|"timed_matrix"|"unsupported",
      compatibility: "requires_sample_rate"|"compatible"|"incompatible",
      reason: string|null,
      sample_rate_requirement: "required"|"not_needed"|"unsupported",
      selectable: boolean
    }
  ]
}
```

`name` и `type` — exact display metadata из authoritative catalog; `shape`
содержит bounded неотрицательные dimensions, а `sample_count` — число samples
на один создаваемый signal до column expansion. Ни одно поле не содержит value
или preview. Raw vector/matrix имеют
`compatibility="requires_sample_rate"`,
`sample_rate_requirement="required"`; timed vector/matrix — `"compatible"` и
`"not_needed"`; structurally unsupported — `"incompatible"`,
`"unsupported"`, `source_kind="unsupported"`, `selectable=false` и непустую
пользовательскую `reason`. Для selectable entry `reason=null`.

Catalog normalization имеет обязательные bounds:

- 1–256 UTF-8 bytes в `name`;
- не более 200 Unicode scalars в `type`; UI `reason` — не более 500;
- все `shape` dimensions и `sample_count` — JSON safe integers от 0 до
  `2^53-1`;
- selectable rank только 1 или 2; `sample_count`/rows не менее 2;
- matrix columns от 1 до 1000 включительно;
- не более 1000 catalog rows.

Нарушение dimension/rank/sample/output bounds не вызывает exception и не
публикует значение: entry нормализуется как structurally incompatible,
`selectable=false`, с bounded reason. Response по-прежнему не содержит values.

Backend исключает internal/imported bindings, сортирует `variables`
детерминированно по exact `name` без locale/case normalization и возвращает не
более 1000 строк. `total` отражает число normalized metadata rows до cap, а
`truncated` точно равен `total > variables.length`.

Каждый GET создаёт новую `catalog_revision="wc_" + lowercase canonical UUID` и
`expires_at`, точно равный времени создания плюс 5 минут. Registry хранит
immutable snapshots отдельно для авторизованной runtime session: TTL 5 минут и
не более 8 newest snapshots. Refresh не изменяет предыдущий unexpired snapshot;
он остаётся допустимым для POST, пока не истёк либо не вытеснен oldest-first при
лимите 8. Expired/evicted snapshots удаляются и не восстанавливаются.

`variable_id` точно равен `"wv_" + lowercase hex SHA-256(...)`, где hash input
— UTF-8 bytes строки `"SignalAnalyser\0WorkspaceVariableId\0v1\0"` + exact
`catalog_revision` + `"\0"` + exact authoritative `name`. Ни revision, ни имя
не проходят Unicode normalization. Допустимый формат ID:
`^wv_[0-9a-f]{64}$`; revision:
`^wc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`.
Registry владеет отображением ID→entry/name. Backend отклоняет duplicate names
и любую ID collision, а frontend не вычисляет ID самостоятельно. ID не является
authorization token или секретом. Catalog route не содержит app
`state_revision` и не меняет её.

Обязательные ID test vectors:

```text
revision=wc_00000000-0000-4000-8000-000000000000, name=x
variable_id=wv_166dc21f1b7379cc746253cfd2558ec9ed148a243e1c9bbb34e66c5e501f1bef

revision=wc_123e4567-e89b-42d3-a456-426614174000, name=sig
variable_id=wv_f87f6440468ba126add2585d29fd183fdde2fef0f0bb677dceb973256167ed79
```

`POST /api/signals` расширяет operation union DEC-037 новым UI workflow:

```text
{
  state_revision,
  operation="import_workspace_batch",
  catalog_revision,
  selections: [
    {
      variable_id,
      sample_rate_hz: number|null
    }
  ]
}
```

Body имеет exact keyset. `selections` — непустой массив без duplicate
`variable_id`, длиной 1–1000; каждая entry имеет ровно два показанных ключа.
Frontend строит
массив в порядке строк authoritative catalog, не в порядке кликов. Для всех
выбранных raw entries он повторяет одно значение общего sample-rate input; для
timed entries отправляет `null`. Backend сохраняет order selections, а для
matrix — порядок columns, поэтому результирующий порядок равен selected-variable
order, затем column order.

Один vector создаёт один signal; matrix создаёт `shape[2]` signals. Суммарный
batch output после matrix expansion обязан быть от 1 до 1000. Individual matrix
свыше 1000 columns уже nonselectable в catalog; комбинация допустимых entries,
которая превышает 1000 outputs, получает atomic `422 invalid_request` до
`recv`/preparation/publication.

Старый singular `operation="import_workspace"` с полями DEC-037 сохраняется
только как backward-compatible non-UI command. Встроенный browser никогда его
не отправляет. `import_workspace_batch` не принимает `signal_name`: имена новых
signals выводятся из workspace names.

Success возвращает полный authoritative snapshot HTTP 200. Stale app revision
сохраняет `409 stale_state` с одинаковыми `state` и `current`; bounded retry не
более одного раза разрешён только если после канонизации тот же active Display
и та же catalog revision ещё valid. Catalog conflicts никогда не replay
автоматически: dialog требует refresh и повторного выбора.

### Atomic state transition

Под app mutation lock backend выполняет ровно такой порядок:

1. Strict request shape/key/type/regex и `selections.length ∈ 1..1000`;
   нарушение даёт `422 invalid_request`.
2. Проверка app `state_revision`; stale даёт существующий `409 stale_state` с
   одинаковыми `state`/`current`.
3. Lookup exact `catalog_revision` в session registry; missing, expired или
   evicted даёт `409 stale_workspace_catalog`.
4. Resolution всех ID через immutable stored metadata/name map. Duplicate,
   unknown, collision либо nonselectable ID даёт `422 invalid_request`.
   Request перестраивается в catalog order, независимо от checkbox click order.
5. Fresh constant enumeration. Отсутствующий target/capability даёт
   `503 workspace_unavailable`; provider execution/result protocol failure —
   `502 workspace_provider_error`.
6. Exact comparison selected stored/fresh `name`, `type`, `shape` и
   `source_kind`. Missing/mismatch даёт `409 workspace_changed`. Здесь же
   проверяется expanded batch output `1..1000`; превышение даёт
   `422 invalid_request` до `recv`.
7. `engee.genie.recv(resolved_name; context=Main)` каждого selected value в
   catalog order. Capability/provider failures сохраняют те же 503/502 codes.
8. Typed actual-value revalidation, matrix columns по возрастанию и semantic
   sample-rate validation: raw требует общий finite positive rate, timed
   игнорирует input и использует `null`. Нарушение даёт `422 invalid_request`.
9. Prospective construction всех names/colors, inventory, active Display,
   caches и active outputs, затем одна publication полного snapshot с общей
   revision `+1`.

Это одновременно является executable error precedence. Любая ошибка сохраняет
app state/revision. `stale_workspace_catalog` и `workspace_changed` сохраняют
dialog fields, но сбрасывают selections и требуют новый GET; provider errors не
превращаются в пустой catalog. Catalog conflicts никогда не replay
автоматически.

Любая ошибка любого selected value, column, name, sample rate, provider call
или preparation отклоняет весь batch: inventory, Displays, caches и revision
остаются прежними. Успешный batch добавляет все новые signals в global order и
membership active Display; inactive Displays не меняются. Первый созданный
signal становится global row selection и analysis source active Display, как в
DEC-037. Вся команда увеличивает общую `state_revision` ровно на один.

Порядок создания всегда равен порядку выбранных entries в catalog, затем
возрастающему индексу matrix column; порядок checkbox clicks не учитывается.
Для каждого candidate base name allocator сначала пробует `base`, затем первое
свободное имя с concatenated integer suffix начиная с 2: `base2`, `base3`, … .
После каждого созданного signal имя немедленно добавляется в prospective
`existing_names`, поэтому collisions проверяются не только с исходным
inventory, но и между всеми variables/columns одного batch. Это фиксирует
действующий allocator по evidence
`lib/services/signal_inventory_service.jl:167-174,240-267`; существующие tests
подтверждают `_Copy`, `_Copy2` и matrix uniqueness в
`test/back/lib/signal_analyser_service_test.jl:142-154`. Новый batch получает
отдельные regression tests `base`/`base2`/`base3`.

### Frontend state, accessibility и selectors

Catalog, selection, общий sample rate, loading/error и busy являются локальным
dialog state. UI не добавляет optimistic rows и принимает Signals только из
полного server snapshot. Mutation error сохраняет список, checked rows и sample
rate. Любой refresh создаёт новую catalog revision, поэтому selections всегда
сбрасываются независимо от совпадения имён/metadata. Live status сообщает:
«Каталог обновлён. Выберите переменные снова.» После successful authoritative
snapshot form dialog сначала закрывается, затем открывается отдельный success
dialog с количеством созданных signals и видимой кнопкой «Готово»; два dialogs
не показываются одновременно.

Form и success dialogs используют `role="dialog"`, `aria-modal="true"` и
`aria-labelledby`: form ссылается на `signals-workspace-title`, а success — на
видимый `signals-workspace-success-count`. При open/loading focus устанавливается
на `signals-workspace-title` с `tabindex="-1"`. После успешного list load он
переходит на первый selectable `signals-workspace-select-<variable_id>`, а при
его отсутствии — на `signals-workspace-refresh`. При load error focus получает
`signals-workspace-retry`; отдельный success dialog начинает с
`signals-workspace-done`. Tab/Shift+Tab циклически обходят все и только видимые
controls текущего form/success dialog. Cancel, Close и Done всегда возвращают
focus на `signals-add-workspace-action`.

Имя переменной является видимой label native checkbox; dynamic text вставляется
только как text, не HTML. Loading/reset используют polite live status, ошибки —
alert. Form/list публикуют
`aria-busy=true` во время GET/POST. При busy блокируются checkbox, refresh,
close, cancel и Add. Overlay, Escape и Enter не закрывают dialog и не запускают
Add; закрытие выполняют только видимые actions.

Stable selectors сохраняют существующий root namespace:

- `signals-workspace-dialog`, `signals-workspace-title`;
- `signals-workspace-refresh`;
- `signals-workspace-loading`, `signals-workspace-empty`,
  `signals-workspace-list`;
- `signals-workspace-entry-<variable_id>`,
  `signals-workspace-select-<variable_id>`;
- `signals-workspace-name-<variable_id>`,
  `signals-workspace-type-<variable_id>`,
  `signals-workspace-shape-<variable_id>`,
  `signals-workspace-sample-count-<variable_id>`,
  `signals-workspace-source-kind-<variable_id>`,
  `signals-workspace-compatibility-<variable_id>`,
  `signals-workspace-sample-rate-requirement-<variable_id>`,
  `signals-workspace-reason-<variable_id>`;
- `signals-workspace-selection-count`;
- `signals-workspace-sample-rate-group`,
  `signals-workspace-sample-rate-label`,
  `signals-workspace-sample-rate-input`,
  `signals-workspace-sample-rate-hint`,
  `signals-workspace-sample-rate-error`;
- `signals-workspace-batch-error`, `signals-workspace-retry`;
- `signals-workspace-submit`, `signals-workspace-cancel`,
  `signals-workspace-close`;
- `signals-workspace-success`, `signals-workspace-success-count`,
  `signals-workspace-done`.

Dynamic selector suffix использует только server-issued `variable_id`; raw name
не вставляется в selector. Checkbox получает видимую label с исходным opaque
name и связывается через `aria-describedby` с reason, когда entry недоступна.
Metadata имеет видимые labels и связанные значения. Sample-rate input связан с
`signals-workspace-sample-rate-label`, а `aria-describedby` перечисляет hint и,
при ошибке, error. `required=true` применяется только когда выбран хотя бы один
raw vector/matrix; в этом состоянии invalid value устанавливает
`aria-invalid=true`. Для набора только из timed entries input не required, не
участвует в validation, а payload содержит `null`.

`signals-workspace-submit` disabled при zero selection, invalid required global
sample rate или busy и показывает busy label во время единственного POST.
`signals-workspace-selection-count` имеет `role="status"`, `aria-live="polite"`
и сообщает количество выбора либо stale-reset. Batch error связан с form через
alert semantics. Success count является содержимым отдельного success dialog;
`signals-workspace-done` закрывает его и возвращает focus на workspace Add.

## Security boundary

- Catalog не возвращает values/samples и не логирует их.
- Client ID никогда не является authority: backend заново разрешает его только
  через текущий provider catalog; client import payload вообще не содержит
  имени.
- ID не является authorization token или секретом; единственный gate —
  unexpired session registry membership и совпадение с заново полученным
  authoritative catalog.
- Вывод имён и metadata экранируется; raw имя не становится HTML,
  неэкранированным selector, path, Julia symbol или кодом.
- Нет local Julia `Main`, filesystem browsing, upload, environment inspection,
  arbitrary context или live binding.
- Catalog/provider state не разделяется между пользователями или сессиями.
- Responses имеют `Cache-Control: no-store`; catalog revision, registry entries
  и ID→name mapping не сохраняются в browser storage или shared cache.
- Server применяет request/body/list/name bounds и duplicate rejection до
  provider reads.
- Постоянная introspection-команда получает static/source audit, который
  доказывает отсутствие interpolation и user-derived fragments.

## Production target gate

Deployed-app catalog/recv probe и интегральный E2E выполняются только на exact
origin `https://engee.com`. Перед подключением проверяется project lock
`[engee_target]` в `architecture/agents/manifest.toml`:

```text
environment = "prod"
base_url = "https://engee.com"
mcp_server = "prod"
allow_devhub = false
allow_fallback = false
```

DevHub, другой origin и fallback запрещены даже при недоступности production.
Legacy `devhub` в имени runner/skill не выбирает environment. Этот gate
расширяет [DEC-038](DEC-20260801-038-engee-production-target.md), но не заявляет
deployment.

## Проверка и E2E gate

Backend/unit/API:

- direct-return constant introspection без temp/send/cleanup и отсутствие
  interpolation;
- bounded names/type/shape/sample metadata, malformed/oversized/provider failure
  и capability failure без empty fallback;
- exact capped/sorted
  `{catalog_revision,expires_at,truncated,total,variables}` response,
  `Cache-Control: no-store` и coexistence legacy
  `import_workspace` с новым
  exact `import_workspace_batch` request union;
- exact entry keyset/enums; immutable TTL=5min/max8 registry, refresh revision,
  prior validity, expiry и oldest-first eviction;
- exact revision/ID regex, два зафиксированных SHA-256 vector,
  revision-bound domain-separated ID, registry/current-catalog ID→name
  resolution перед каждым `recv`, duplicate/collision/unknown ID;
- name/type/reason, safe-integer shape/sample, rank/rows/columns, selection и
  expanded-output bounds; incompatible normalization without exception;
- fresh exact name/type/shape/source-kind comparison и revalidated values;
- vector/matrix/timed import, global raw sample rate, timed `null`, duplicate
  selection, unknown ID и unsupported variable;
- catalog-variable-then-ascending-column order, `base`/`base2`/`base3` across
  prospective batch, rollback любой ошибки, one publish и
  ровно `+1` revision;
- полный snapshot; precedence всех `409 stale_state`,
  `409 stale_workspace_catalog`, `409 workspace_changed`,
  `422 invalid_request`, `502 workspace_provider_error` и
  `503 workspace_unavailable`; inactive-Display isolation и сохранённые
  Copy/Extract/Delete contracts.

Frontend/static/behavior:

- exact selectors, dialog semantics, native labelled checkboxes и focus return;
- exact metadata selectors, `aria-labelledby`, focus trap/return, reason
  associations, `aria-busy` и sample-rate label/describedby/required/invalid;
- exact title → first selectable or Refresh → Retry → Done focus destinations,
  visible-control trap и Cancel/Close/Done return to Add trigger;
- initial loading, empty, refresh, catalog/provider errors и unconditional
  selection reset with polite live warning on new revision;
- multi-select, global sample rate, zero-selection disabled, one busy POST и no
  typed variable-name control;
- exact revision-bound payload, no optimistic rows, error preservation, bounded
  app-stale retry and no catalog-conflict replay;
- authoritative success snapshot followed by form close and a separate
  success-count/Done dialog without modal overlap;
- visible-only close/cancel, no overlay/Escape/Enter submit и безопасный render
  opaque names.

E2E становится допустим только после:

1. deployed-app contract test constant introspection и catalog-resolved `recv`
   только на `https://engee.com` после проверки manifest production lock;
2. завершения Backend/Frontend и ordinary suites;
3. action-by-action design/accessibility review всего Signals inspector.

После gate выполняется один интегральный Signals workflow: открыть встроенный
catalog, выбрать несколько реальных переменных, одним Add получить весь batch
в global Signals и active Display, доказать неизменность inactive Display,
затем проверить сохранённые Copy/Extract/Delete. E2E фиксирует
`browser_workspace_setup`, timing/retry logs и не перемещает MATLAB.

## Вне scope

- filesystem/local/OS browser и file import;
- произвольный `eval`, пользовательский код и каталог values/previews;
- live workspace binding, polling и background auto-refresh;
- rename, reorder, search, columns customization и generic preprocessing;
- частичный import либо optimistic rows;
- изменение Copy/Extract/Delete, stable signal IDs или deployment.

## Связи

- [DEC-037 signal inventory actions](DEC-20260801-037-signal-inventory-actions.md)
- [DEC-038 production target](DEC-20260801-038-engee-production-target.md)
- [Внутренняя assessment](../../agents/reports/engee-workspace-variable-browser-assessment-20260801.md)
- [Внутренняя task record](../../agents/tasks/engee-workspace-variable-browser-20260801.md)

Контракт зафиксирован до реализации. Product, deployed-app tests, E2E runtime и
deployment этим ADR не заявляются; внешние prod proofs являются provider
evidence, а не проверкой приложения.
