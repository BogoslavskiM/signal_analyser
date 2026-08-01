# DEC-20260801-038: единственный Engee target — production

ID: `DEC-20260801-038`  
Дата: `2026-08-01`  
Статус: accepted  
Supersedes: none  
Implementation: workflow policy active; runtime deployment and E2E results are
reported separately

## Контекст

Проект использовал универсальные процедуры, в которых Engee environment мог
выбираться между development и production. Для SignalAnalyser это создавало
неоднозначность: contract probes и E2E могли уйти в другое окружение, хотя
рабочее приложение доступно на `engee.com`.

Универсальные контракты каталога сохраняются: конкретный проект выбирает target
через свой manifest, а не через переименование product capabilities или
произвольный выбор агента.

## Альтернативы

1. Разрешить выбор environment в каждой задаче.
2. Использовать development как fallback при недоступности production.
3. Зафиксировать один project target без fallback.

## Решение

Для SignalAnalyser единственный Engee target:

```text
environment: prod
base_url: https://engee.com
mcp_server: prod
allow_devhub: false
allow_fallback: false
```

Политика хранится в `[engee_target]` файла
`architecture/agents/manifest.toml` и обязательна для:

- Engee MCP contract probes;
- Genie runtime operations и deployment;
- Playwright E2E URL и current browser tab;
- availability/maintenance triage.

Недоступность production фиксируется как environment failure. Она не разрешает
повтор в development environment. Production PAT берётся только из защищённой
runtime-конфигурации и не переносится в source, documentation, fixtures, logs
или сохранённые commands.

Имена существующего skill id и runner file, содержащие `devhub`, временно
сохраняются для совместимости каталога и текущих test paths. Эти имена не
выбирают environment и не ослабляют project target policy.

## Последствия

- Tester, E2E Tester и DevOps до подключения читают `[engee_target]`.
- URL или current tab вне `https://engee.com` отклоняются до E2E.
- Deployment не принимает environment из произвольного task text в обход
  manifest.
- Исторические отчёты о прежних DevHub попытках остаются неизменными как
  датированное evidence; они не являются действующей инструкцией.
- Текущий Playwright runner должен получить отдельную owner-role проверку
  allowed origin; это изменение не входит в Architect ownership.

## Связи и evidence

- [Project agent manifest](../../../agents/manifest.toml)
- [Internal target-policy audit](../../agents/reports/engee-target-policy-audit-20260801.md)

## Датированные уточнения

- `2026-08-01`: пользователь подтвердил, что рабочий target — доступный
  `engee.com`, а DevHub использовать нельзя.
