# Engee target policy audit

Date: 2026-08-01

Role: Architect

Status: source workflow policy updated; runtime owner follow-up required

## Accepted project contract

- Engee environment, base URL, MCP server and allow flags: exact values from
  `[engee_target]` in the project manifest.
- Browser origin: exact parsed origin from the configured base URL.
- PAT source: protected root AGENTS instructions only; never persisted.

The authoritative machine-readable policy is `[engee_target]` in
`architecture/agents/manifest.toml`. Universal skills resolve the project
target from that section instead of choosing an environment locally.

## Contradictions corrected

- Architect, Tester, E2E Tester and DevOps role contracts now require the
  project-locked production target.
- Engee deployment and contract-testing skills no longer offer a local
  dev/prod choice for this project.
- E2E scenario/scaffold guidance treats `devhub` in legacy IDs and filenames as
  a compatibility label only.
- Generated adapters expose the target policy next to workflow and reasoning
  policy.

## Intentionally preserved evidence

Published decisions, history, reports and handoffs that describe earlier
DevHub attempts are append-only historical evidence. They were not rewritten;
[DEC-038](../../user/decisions/DEC-20260801-038-engee-production-target.md) is
the current policy.

## Owner-role follow-up

The current project runner is outside Architect ownership. Its legacy filename
does not select an environment. E2E Tester must keep its allowed-origin guard
aligned with the exact project `[engee_target]`; the universal bundled scaffold
now supplies a shell + JS runner + navigation guard as the reusable contract.

No deployment, MCP probe, browser navigation or PAT access was performed by
this audit.
