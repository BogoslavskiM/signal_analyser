# Внутренняя память разработки

- [Active tasks](tasks/README.md)
- [Backlog](backlog/README.md)
- [Handoff и persistent agent registry](handoff/README.md)
- [Internal research/coordination reports](reports/README.md)
- [Engee bug candidate intake](engee_bug_intake/README.md)

Canonical role + agent ID/session допустимы только здесь. Клиентские контракты
не копируются: используй ссылки на [`../user/`](../user/README.md).

Внутренний handoff может временно ссылаться на ephemeral evidence path. До
cascade DoD Architect переносит клиентски значимое evidence в
[`../user/assets/`](../user/assets/README.md) либо заменяет ссылкой на другой
durable versioned repo file.
