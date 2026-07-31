# Документация: выбор аудитории

Этот каталог физически разделён на два слоя. Authoritative content не
дублируется: документы второго слоя дают ссылку на источник первого.

- [`user/`](user/README.md) — документация для клиента и человека: обзор
  продукта, текущие спецификации и математика, ADR-решения, датированная
  история, отчёты о релизах/тестах/deploy, traceability и Engee bugs.
- [`agents/`](agents/README.md) — внутренняя память выполнения: active tasks,
  backlog, handoff, persistent role registry, research/coordination reports и
  templates.

## Граница

Клиентский слой ведётся на русском, различает `planned`, `implemented`,
`verified`, `deployed` и не содержит agent IDs, внутренних инструкций,
случайных nicknames или секретов. Внутренний слой может хранить canonical role,
agent ID/session и status, но никогда не хранит PAT, cookies, пароли и иные
секреты.

История, ADR, опубликованные reports, handoff и Engee bug reproduction ведутся
append-only: исправления оформляются новой датированной записью и ссылкой, а не
молчаливым переписыванием.

Authoritative delivery — versioned Markdown и artifacts внутри репозитория.
Site/PDF build или publish pipeline не создаётся без отдельного будущего
запроса.
