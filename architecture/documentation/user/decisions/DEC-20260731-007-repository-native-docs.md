# DEC-20260731-007: repository-native delivery клиентской документации

ID: `DEC-20260731-007`  
Дата: 2026-07-31  
Статус: accepted  
Supersedes: none

## Контекст

Требовалось определить, нужна ли отдельная публикация client docs как site/PDF
и где хранить визуальное/численное evidence.

## Альтернативы

Добавить docs site/PDF pipeline; ссылаться на временные внешние artifacts;
доставлять versioned Markdown и attachments прямо в проекте.

## Решение

`architecture/documentation/user/` — authoritative delivery. Site/PDF build и
publish pipeline отсутствуют, пока пользователь не запросит их явно. Links
repo-relative. Durable attachments размещаются в `user/assets/` по категориям
с date/source/provenance/license/hash и regeneration metadata where relevant.

## Последствия

Client docs не ссылаются на `/tmp`, `/private/tmp`, user-specific absolute paths
или ephemeral external artifacts. Agent handoff может временно хранить такой
путь, но перед cascade DoD значимое evidence переносится в assets или получает
ссылку на durable repo file. Large/generated artifacts остаются size-conscious.

## Связи и evidence

[Assets policy](../assets/README.md),
[documentation router](../../README.md).
