---
id: TASK-0014
kind: group
title: Довести интерфейс Signal Analyzer до Engee-ориентированного ТЗ
status: in_progress
priority: P2
queue_order: null
model: null
reasoning: null
owner: orchestrator
assignees: []
parent: null
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: [HND-0023]
blocked_by: []
blocker_reason: null
---

# Довести интерфейс Signal Analyzer до Engee-ориентированного ТЗ

## User value

Signal Analyzer должен по структуре, доступным зонам и сценариям приблизиться
к согласованным референсам, но использовать ранее утверждённый Engee-стиль, а
не копировать оформление изображений.

## Source evidence

- Пользовательский запрос от 2026-08-03.
- `signal-analyzer-layout-01-overview.png`: overview с четырьмя типами графика,
  Settings и нижним inspector.
- `signal-analyzer-layout-05-spectrum.png`: Spectrum-страница с тремя
  графическими панелями, настройками Spectrum и тем же inspector.
- Допустимые источники иконок/визуальных паттернов для последующего review:
  `../pulse_waveform_analyser/public/icons` и
  `../windowdesigner/public/icons`.

## User TS: зоны и наблюдаемые элементы

### Верхняя панель

- Бренд Engee, название `Signal Analyzer`, версия.
- Справа: действия export/share, open in new window и help.
- Требование: заменить временные текстовые символы на согласованные Engee
  иконки и довести их состояния, подсказки и доступность.

### Рабочая область Display

- Вкладки `Display N`, закрытие вкладки, создание Display (`+`), а также
  control выбора/управления раскладкой, видимый на референсах.
- Каждый видимый график имеет заголовок, селектор типа и overflow-меню.
- Наблюдаемые типы: `Time`, `Spectrum`, `Spectrogram`, `Persistence`.
- Требование: тип каждого отдельного графика должен быть явно задан и
  отображён; унифицировать заголовок, селектор и overflow для каждого
  графика.
- Исключение: мультилейаут/одновременная сетка графиков в этой идее не
  реализуется. Она будет отдельной задачей, даже если присутствует на
  референсах.

### Правая панель Display settings

- Вкладки `Display`, `Time`, `Measurements`.
- Наблюдаемые для Display controls: View; Show legend; Normalize Y axis; Show
  markers; типозависимые единицы/масштабы; границы осей; параметры Spectrum
  (Scale, Frequency scale, Leakage, Resolution bandwidth, F min/F max);
  действия Signal statistics и Find peaks.
- Требование: завершить набор настроек для каждого поддерживаемого типа
  графика и их представление. Полнота каждой настройки должна исходить из
  существующего backend contract и отдельно зафиксированного исследования, а
  не из догадки по изображению.
- Требование пользователя также охватывает настройки каждого сигнала и его
  отображения. Нужно выделить их из общих Display settings в отдельную
  многостраничную структуру и определить, какие поля относятся к signal,
  display и конкретному виду графика; конкретный перечень будет уточнён в
  следующих итерациях.

### Нижняя многостраничная зона / inspector

- Вкладки `Signals`, `Measurements`, `Peaks`; у показанных вспомогательных
  вкладок видны действия закрытия.
- Общий toolbar: add, copy/duplicate, delete, управление таблицей/колонками,
  действие peaks и collapse/expand. Точная семантика не подписанных иконок
  требует дальнейшего уточнения перед реализацией.
- Таблица Signals: чекбокс visibility, Name, Color, Sample rate, Samples,
  Duration, Type, Info.
- При наведении на `Info` показывается всплывающая карточка с Samples, Sample
  rate, Duration и Type.
- При наведении строки в её правом краю появляются row actions. Состав и
  семантика кнопок закрепляются отдельным TS до реализации.
- Требование: добавить недостающие таблицы/страницы нижней зоны и оформить
  многостраничную навигацию без смешения её с мультилейаутом графиков.

### Диалоги и сессия

- Доработать существующие и новые всплывающие окна: единый Engee-паттерн,
  keyboard/focus behavior, понятные loading/error/success states.
- Реализовать полноценные сохранение и импорт сессии: формат, состав
  сохраняемых данных, validation, conflict/error behavior и UX подтверждений
  должны быть спроектированы отдельными backend/frontend контрактами.

### Визуальный review

- Провести самостоятельный review по обоим изображениям после реализации.
- Сверить визуальные паттерны с утверждёнными Engee-стилями и при необходимости
  использовать указанные каталоги только как источник существующих иконок и
  паттернов.
- Не переносить стили с изображений как источник истины.

## Current-project comparison

Уже есть: Display tabs и создание Display, один активный Plot с выбором
`Time/Spectrum/Spectrogram/Persistence`, часть Display/Time/Measurements
settings, Signals/Measurements/Peaks, импорт сигналов из workspace и диалог
удаления.

Требуют отдельной декомпозиции: явная типизация нескольких графических
панелей, доработка полного набора type-specific settings, inspector `Info` и
hover row actions, toolbar/страницы нижней зоны, session save/import, действия
верхней панели и системный Engee visual review.

## Scope

Детализация и последующая role-owned декомпозиция всех перечисленных
интерфейсных, контрактных, persistence и test работ.

## Out of scope

- Реализация мультилейаута графиков.
- Копирование CSS/стилей с референсных изображений.
- Начало реализации, dispatch handoff или deployment в рамках текущей intake
  итерации.

## Acceptance criteria for this intake

- [x] Изображения и прямые требования пользователя сохранены как источник ТЗ.
- [x] Все видимые зоны и controls внесены без выдумывания поведения
  не подписанных иконок.
- [x] Явно зафиксировано исключение мультилейаута.
- [x] Отделены существующие возможности от backlog gaps.
- [x] Следующие итерации могут уточнять идею без начала реализации.

## Open questions for subsequent iterations

- Какие действия требуются у не подписанных иконок toolbar и у row actions?
- Каков точный состав session: только UI/display settings или также данные
  сигналов, их источники и результаты расчётов?
- Нужны ли закрываемые вкладки Measurements/Peaks во всех состояниях?
- Какие типозависимые поля должны быть доступны пользователю для каждого
  графика сверх уже существующего backend contract?

## Decomposition

| ID | Role | Deliverable | Depends on | Status |
|---|---|---|---|---|
| TASK-0015 | Frontend | Inspector, settings presentation, graph type UI, dialogs and Engee visual parity without multi-layout | — | done |
| TASK-0016 | Backender | Typed session export/import contract and persistence implementation | — | done |
| TASK-0017 | Frontend | Session import/export UI against TASK-0016 contract | TASK-0016 | done |
| TASK-0018/TASK-0020/TASK-0021/TASK-0024 | Tester | Unit and frontend regression coverage | implementation tasks | done |
| TASK-0023 | E2E | Complete ready-feature browser workflow | production target URL | blocked before dispatch |

## Queue decision

- Priority: P2.
- Rationale: крупное улучшение UX и функциональности без текущего P0/P1
  blocker; сначала нужна дополнительная декомпозиция.
- Queue order: не назначен, так как `kind: idea` остаётся в backlog.
- Eligibility: не готова к выдаче до фиксации открытых продуктовых решений и
  разделения на frontend, backend, tester и E2E tasks.

## Verification and results

Реализованы Inspector Info/row actions, session export/import с
server-authoritative reload, строгий backend session contract и локальные
Engee SVG. Локальные frontend/backend test gates прошли. E2E не запускался,
поскольку production target URL не предоставлен, а deployment не запрашивался.

## Risks, blockers and follow-ups

Полный состав настроек и session format нельзя выводить только по скриншотам:
их следует подтвердить отдельным TS и, при необходимости, research handoff.
