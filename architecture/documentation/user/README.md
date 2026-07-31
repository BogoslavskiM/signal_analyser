# Документация Signal Analyser для клиента

- [Обзор продукта](product-overview.md)
- [Текущие спецификации](specifications/README.md)
- [Математическая спецификация](specifications/mathematics/signal-analysis.md)
- [Архитектурные решения](decisions/README.md)
- [История](history/README.md)
- [Отчёты о каскадах, тестах и deploy](reports/README.md)
- [Матрица трассируемости](traceability/README.md)
- [Реестр дефектов Engee](engee_bugs/README.md)
- [Versioned evidence assets](assets/README.md)

Статус каждого требования указывается раздельно: `planned`, `implemented`,
`verified`, `deployed`. Этот слой не содержит внутренних role/thread данных.

Этот каталог уже является authoritative delivery; отдельная публикация как
site/PDF не требуется. Используются относительные repo links. Client docs не
ссылаются на `/tmp`, `/private/tmp`, user-specific absolute paths или ephemeral
external artifacts: нужное evidence переносится в `assets/` либо связывается с
durable versioned repo file.
