# Versioned evidence assets

Здесь хранятся durable client-relevant attachments. Создавай category subdirs
по фактической необходимости: `screenshots/`, `plots/`, `diagrams/`,
`sample-data/`, `logs/`. Пустые категории заранее не создаются.

Для каждого artifact указывай рядом в client document или metadata:

- описательное имя без случайного временного suffix;
- дату и source/provenance;
- license, если artifact сторонний;
- SHA-256, если важна точная воспроизводимость;
- regeneration command/source для generated artifact;
- size/retention rationale для крупного файла.

Не копируй секреты, PAT, cookies, private credentials и лишние полные logs.
Large/generated artifacts сохраняй size-conscious: предпочитай минимальный
fixture, crop или documented regeneration. Ссылки — относительные repo links.

## Signal Analyser visual specification — 2026-07-31

Пользовательские референсы являются частью ТЗ и должны проверяться при каждом
существенном UI-review:

- [`screenshots/signal-analyzer-layout-01-overview.png`](screenshots/signal-analyzer-layout-01-overview.png)
  — общий экран: Display pages, настройки активной страницы и общая нижняя
  таблица сигналов/измерений;
- [`screenshots/signal-analyzer-layout-05-spectrum.png`](screenshots/signal-analyzer-layout-05-spectrum.png)
  — Spectrum-oriented Display page и ожидаемая иерархия правой панели.

Текущий этап намеренно не реализует multi-layout/grid внутри страницы: одна
Display page содержит один активный график, checkbox membership относится к
активной странице, а сами страницы можно создавать, выбирать и закрывать.

| Asset | Source/provenance | SHA-256 |
| --- | --- | --- |
| `signal-analyzer-layout-01-overview.png` | предоставлен пользователем 2026-07-31 | `67789d469c2e3c2a54c06e18500d1668235cb0395097b0bb32d8a1e6bd0ac912` |
| `signal-analyzer-layout-05-spectrum.png` | предоставлен пользователем 2026-07-31 | `ac1b34b0ff62dd054a81f2c3dc963752e1e873f48e55ba33487ddd506a409d5e` |
