# E2E skills

- `e2e-workflow` — post-task quick, idle analysis и new-functionality
  regression с target, timing и visible evidence.
- `visual-analysis` — чтение и прокликивание pinned local Designer prototype,
  затем production screenshots, layout/geometry review, dynamic UI coverage и
  hit/focus/restoration test сосуществующих overlays.

Feature intake, page inspection, scenario authoring, execution и report входят
в обязательный workflow и пока не выделяются в отдельные subskills.
Deployment и Git принадлежат DevOps и всегда приходят отдельным handoff.
Application runtime используется только в production Engee; при failed start
logs запрашиваются у DevOps через Orchestrator.
Экран технических работ считается failed availability symptom: E2E сохраняет
screenshot/status evidence и запрашивает DevOps diagnostics, не объявляя баг
Engee по одному виду страницы.
Статический prototype открывается напрямую через `file://` и не считается
локальным application runtime или production evidence.
Каждый прогон использует один foreground worker в установленном Google Chrome,
`headless: false`; активная page выводится на передний план. Скрытый или
background-only browser не считается E2E evidence.
