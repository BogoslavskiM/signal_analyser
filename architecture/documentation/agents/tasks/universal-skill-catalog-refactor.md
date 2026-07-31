# Universal skill catalog refactor

Status: complete  
Owner: Architect  
Roles: Architect

## Goal

Устранить противоречия универсального каталога skills и отделить contract
refactor от переписывания исполняемых frontend templates.

## Scope

- `architecture/skills/**`
- соответствующие role contracts и generated adapters;
- ADR и internal task memory.

## Stage 1 acceptance

- `manifest.yaml` является единственным источником версии.
- Все manifests используют schema 2 и `requires-skills`.
- App creation работает как capability router.
- Составные skills объявляют core и stable optional ids.
- Зафиксированы vanilla/API/visual/calculation defaults и exception policy.
- E2E различает universal skill и project product capability flags.
- Clean gate, partial DevOps checkpoints и role-thread replacement согласованы.
- Catalog validator и documentation validator проходят.

## Stage 2 acceptance

- Все legacy Vue JS assets переписаны на vanilla JavaScript.
- Каждый bundle проходит syntax/static/behavior validation.
- Legacy migration warning удалён только после полного подтверждения assets.

## Out of scope for stage 1

- Изменение product code Signal Analyser.
- Переписывание `architecture/skills/frontend/**/assets/template.js`.
- Deployment, E2E target run, commit или merge.

## Risks

- Bundled assets являются generic reference implementations; при переносе всё
  равно требуется связать project API handlers и explicit capabilities.

## Stage 1 result

- 40 manifests переведены на schema 2 и прошли catalog validator.
- Версии удалены из `SKILL.md`; источником версии остался manifest.
- Универсальные contracts отделены от project feature configuration.
- Generated Codex adapters обновлены из `architecture/agents/`.
- Stage 2 переписал 10 frontend bundles и 9 HTML templates на единый vanilla
  lifecycle contract.
- Syntax/static/behavior asset validator проходит.

## Stage 2 result

- Framework directives и Vue-shaped lifecycle удалены из исполняемых assets.
- Каждый bundle экспортирует `create(options)` и instance contract
  `state/actions/render/mount/unmount`.
- HTML templates являются чистыми mount points.
- `frontend/validate_vanilla_assets.js` проверяет регистрацию, lifecycle,
  отсутствие framework syntax и ключевое поведение каждого bundle.
