# Universal skill catalog — stage 1 report — 2026-07-31

Status: complete

## Задача

Устранить противоречия универсального каталога skills, зафиксировать выбранные
defaults и отделить contracts от конкретных product capabilities и legacy
frontend templates.

## Агент

Architect (`/root`).

## Краткий итог

- `app-creation-workflow` преобразован в capability router.
- Все 40 manifests используют schema 2, `requires-skills` и хранят версии.
- Composite skills разделяют core contract и optional capabilities со
  стабильными идентификаторами.
- Vanilla JavaScript без bundler закреплён как frontend default; отклонение
  требует прямого решения пользователя и ADR.
- Visual, API, worker-queue, E2E feature-gating, documentation DoD, clean gate,
  partial DevOps checkpoints и role-thread replacement согласованы.
- Stage 1 не изменяет product code и не делает legacy Vue assets допустимыми к
  повторному использованию.

## Изменённые области

- `architecture/skills/**`
- `architecture/agents/roles/{architect,devops}.toml`
- generated Codex adapters
- ADR, task memory и этот отчёт

## Проверка

```bash
env LC_ALL=C.UTF-8 LANG=C.UTF-8 ruby architecture/skills/validate_skills.rb
python3 architecture/documentation/agents/verify_documentation.py
bash architecture/agents/adapt.sh --adapter=codex --dry-run
git diff --check
```

## Принятые решения

Полный набор решений зафиксирован в
[`../../user/decisions/DEC-20260731-008-universal-skill-catalog.md`](../../user/decisions/DEC-20260731-008-universal-skill-catalog.md).

## Переданные задачи

Stage 2: переписать legacy Vue frontend assets на vanilla JavaScript и
подтвердить каждый bundle syntax/static/behavior проверками.

## Оставшиеся риски

До завершения stage 2 frontend JS assets с legacy Vue нельзя копировать в новые
проекты. Contract и documentation files уже являются действующим источником
истины.
