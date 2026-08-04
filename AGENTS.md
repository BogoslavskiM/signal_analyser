# Generated Agent Instructions

Generated from `architecture/agents/`. Do not edit by hand.

## Bootstrap

- Read `architecture/agents/manifest.toml`.
- Read the active role in `architecture/agents/roles/`.
- Treat `architecture/` as the source of truth.
- Return the structured handoff required by the role contract.

## Target

- Engee: production only at `https://engee.com`.
- Devhub and fallback are forbidden.
- Never persist credentials.

## Roles

| Role | Label | Model |
|---|---|---|
| `backender` | Backender | high |
| `devops` | DevOps | medium |
| `e2e` | E2E | medium |
| `engee_user` | Engee User | high |
| `frontend` | Frontend | medium |
| `matlab_researcher` | MATLAB Researcher | high |
| `orchestrator` | Orchestrator | high |
| `tester` | Tester | medium |
