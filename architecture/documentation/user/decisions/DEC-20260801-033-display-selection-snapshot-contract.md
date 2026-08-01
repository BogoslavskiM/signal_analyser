# DEC-20260801-033: строгий snapshot selection и membership Display

ID: `DEC-20260801-033`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-012 selection separation](DEC-20260731-012-display-selection-separation.md),
[DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md)
Implementation: planned in Cascade 27; not deployed

## Контекст

После проверки глобальной topology frontend всё ещё permissive нормализует
selection: подменяет отсутствующий `row_selected_signal` root alias, malformed
membership превращает в `[]`, malformed source — в `null`, а отсутствующий
canonical analysis source восстанавливает legacy alias. Такая нормализация
может отобразить и затем отправить `/api/view` state, которого backend не
публиковал.

Backend различает global row selection, ordered membership каждой Display и
nullable page-local analysis source. Serializer всегда публикует canonical и
legacy aliases как на Display, так и в root-проекции active Display.

## Альтернативы

- Тихо исправлять malformed selection через defaults и первый известный
  signal: отклонено как fabricated server state.
- Считать любую ошибку selection глобальной: отклонено, потому что corruption
  неактивной Display можно изолировать без потери global topology.
- Разделить global row/root corruption и per-Display quarantine: принято.

## Решение

После успешной проверки envelope из DEC-032 frontend строит точную ordered
последовательность имён inventory `N` и применяет проверки до `normalize()`.

### Глобальная row selection

Snapshot обязан иметь собственное поле `row_selected_signal`: непустую string,
точно входящую в `N`. Оно не восстанавливается из root `selected_signal`, root
`analysis_signal` или первого signal. Нарушение переводит приложение в global
fatal state DEC-032. Поскольку backend требует хотя бы один signal, структурно
допустимый DEC-032 пустой `signals=[]` в C27 становится global fatal: для него
невозможно выразить обязательную row selection.

### Selection каждой Display

Каждая Display обязана иметь:

- `visible_signals`: массив уникальных непустых string, известных в `N`, уже в
  canonical inventory order;
- собственные `analysis_signal` и legacy `selected_signal`: `null` либо
  непустая известная string, причём aliases точно равны;
- при пустом membership оба aliases равны `null`;
- при непустом membership source не равен `null` и входит в membership.

Missing canonical response field не восстанавливается legacy alias. Это не
меняет request compatibility: `/api/view` по-прежнему может принимать любой из
aliases отдельно, а при одновременной передаче требует их равенство.

Нарушение quarantines только соответствующую Display. Frontend сохраняет
authoritative page topology и global inventory/row, но не подставляет `[]`,
`null`, first signal или новый порядок, не материализует graph/Measurements/
Peaks этой страницы и не строит из неё View body. Для active quarantined
Display общий Plotly host очищается, показывается стабильная доступная local
contract error, а все `/api/view` controls отключены либо гарантируют zero POST.
Membership checkboxes не изображают invented unchecked set. Corruption
неактивной страницы не влияет на valid active Display.

Desired/queued/pending/stale-replay View intents очищаются только для
quarantined Display. Независимые intents valid Displays сохраняются. Операции
topology `select/create/close` могут оставаться доступны: они используют
проверенные DEC-032 IDs, не сериализуют повреждённый selection block и каждый
их ответ проходит полную повторную проверку. `state_revision` остаётся
authoritative полем существующего mutation-контракта, но не считается частью
валидации DEC-032 или C27.

### Active-root projections и порядок precedence

Root `visible_signals`, `analysis_signal`, `selected_signal` и boolean
`signals[].visible` являются проекциями selection-valid active Display. Они
обязаны точно, включая порядок, совпадать с её membership/source; root aliases
также равны друг другу. Missing, неверный type или mismatch означает
противоречивый global snapshot и приводит к global fatal state DEC-032.

Сначала проверяется selection block active Display. Если он malformed, эта
страница остаётся per-Display quarantined, а root selection projections не
проверяются и не используются. Это обязательный precedence: иначе локальная
ошибка active Display неявно превращалась бы в global fatal и нарушала границу
C27.

## Lifecycle

- Malformed initial global row/root использует полный fatal reset DEC-032,
  очищает все очереди и допускает только Retry GET.
- Malformed initial Display сохраняет tabs/inventory/valid row и quarantines
  только её; valid active A не зависит от invalid inactive B.
- Malformed successful `200` очищает View intents только затронутой Display и
  не replay её; очередь valid другой Display может продолжиться с принятой
  revision. Root/row corruption вместо этого очищает всё глобально.
- Malformed `409 current` никогда не stale-replay quarantined target; intents
  valid другой Display могут продолжиться. Root/row corruption использует
  global fatal/no replay.
- Следующий authoritative valid snapshot снимает только соответствующий
  quarantine. Очищенные intents не восстанавливаются: требуется новое действие
  пользователя. Global fatal по-прежнему восстанавливается только Retry.

## Вне scope

C27 не валидирует root `active_plot`, time/settings projections,
`plot_payload.selected_signal`, `plot_payload.visible_signals`, trace payloads,
Measurements/Peaks/panel coherence, DSP или математику. Существующие решения и
отдельные будущие snapshot boundaries остаются источниками этих контрактов.

## Проверка

Initial/200/409/recovery matrix включает missing/type/empty/unknown global row;
missing/non-array/non-string/unknown/duplicate/unordered membership; missing/
invalid/conflicting aliases; empty/nonempty membership-source invariants;
selection-valid active root and `signals[].visible` projection mismatches;
invalid active precedence; visible local quarantine; zero View POST/replay;
exact per-ID queue purge; A/B isolation и valid authoritative recovery без
resurrection старого intent.

## Связи и evidence

- [DEC-009 Display pages](DEC-20260731-009-display-pages.md)
- [DEC-012 selection separation](DEC-20260731-012-display-selection-separation.md)
- [DEC-032 global snapshot envelope](DEC-20260801-032-global-snapshot-envelope.md)
- [Boundary assessment](../../agents/reports/display-selection-snapshot-assessment-20260801.md)
- `lib/domain/signal_analyser_state.jl`
- `lib/services/signal_analyser_service.jl`
- `public/js/app.js`
