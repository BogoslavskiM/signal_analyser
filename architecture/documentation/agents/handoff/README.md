# Durable role handoffs and agent registry

Этот каталог относится только к внутренней координации и может содержать
canonical role labels и agent ID/session.

Architect is the only writer of this directory. Working roles return structured
handoffs and retain strict ownership of their product/test zones.

## Thread lifecycle policy

- Keep one open saved thread per declared canonical role.
- Reuse the same canonical role + agent ID/session through `send_input` or
  `resume_agent`.
- Completed assignments move to `completed standby`; do not close an available
  thread solely because its current work finished.
- Assign independent useful work from active tasks/backlog whenever contracts,
  dependencies and ownership permit.
- If no suitable work exists, completed standby is acceptable.
- Do not maintain fake-running loops, empty messages or artificial heartbeat
  traffic.
- If a saved thread becomes unavailable and must be replaced, preserve the old
  ID and replacement reason in its role record.

## Registry fields

Every role record keeps:

- `canonical_role`
- `agent_id_or_session`
- `status`
- `current_task`
- `last_handoff`

Every material handoff also records `goal`, `scope`, `contracts`, `changes`,
`verification`, `risks` and `follow-ups`.

## Role records

- `backend-cascades.md`
- `frontend-cascades.md`
- `tester-cascades.md`
- `e2e-cascades.md`
- `devops-cascades.md`
- `matlab-researcher-cascades.md`
