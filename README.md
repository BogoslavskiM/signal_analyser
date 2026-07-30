# example_project

Шаблон структуры для типового Julia/Genie-приложения.

## Структура

```text
example_project/
  app/                  # bootstrap, API helpers, HTTP routes
  config/initializers/  # настройки Genie до загрузки приложения
  lib/                  # бизнес-логика и Julia-модули приложения
    app_blocks/         # серверные блоки UI и вычислений для страниц
    domain/             # предметные модели и чистая логика
    persistence/        # чтение/запись файлов, импорт/экспорт, хранилища
    services/           # сценарии приложения поверх domain/persistence
  public/               # фронтенд: HTML, CSS, JS, icons, fonts
    js/ui_blocks/       # переиспользуемые Vue/JS UI-блоки
  test/
    back/               # Julia-тесты backend/app/lib
    front/              # JS/frontend-тесты
  architecture/         # роли, скиллы, workflow и память многоагентной разработки
    agents/             # TOML-контракты ролей и адаптеры инструментов
    skills/             # переиспользуемые процедуры по ролям
    documentation/      # задачи, отчёты, бэклог и сведения о проекте
  docs/                 # архитектурные заметки, решения, схемы
  scripts/              # вспомогательные команды разработки
```

Каноническая архитектура агентов находится в `architecture/`. Для генерации
runtime-файлов выбранного инструмента используй:

```bash
bash architecture/agents/adapt.sh
```

## Запуск

```bash
julia --project=. run.jl
```

По умолчанию приложение слушает `127.0.0.1:8000`. Можно переопределить:

```bash
GENIE_HOST=0.0.0.0 GENIE_PORT=8080 julia --project=. run.jl
```

## Тесты

Backend:

```bash
julia --project=. test/back/runtests.jl
```

Frontend:

```bash
node test/front/run_front_tests.js
```
