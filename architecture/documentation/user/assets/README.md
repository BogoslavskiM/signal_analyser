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
