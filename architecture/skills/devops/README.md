# DevOps skills

- `devops-workflow` — единый автономный pipeline для `clone_repo`,
  `new_feature_branch`, `deploy`, `merge_feature`, `get_logs`,
  `restart_application` и `restart_engee` поверх основной ветки `neuro_dev`;
  каждый handoff сериализуется временным pod-wide lock
  `mcp_devops_genie_is_bysy`; каждый существующий production checkout перед
  task очищается только на Engee pod через `git add .` → `git stash`, а
  application start разрешён только в Engee через `engee.genie.start`.
- `engee-deployment-diagnostics` — получение и sanitization Engee logs,
  evidence under `architecture/logs/**`, owner classification и
  `deployment_failure` routing.
- `technical-maintenance-screen-diagnostics` — triage экрана технических работ
  через HTTP/pod/start/readiness/log evidence; generic page не считается
  автоматическим багом Engee.
- `engee-project-environment-sync` — один условный recovery package environment
  через production Engee `geniepkg_instantiate`, повторный Engee start и
  post-readiness перенос точной пары `Project.toml` + `Manifest.toml` в
  локальный корень.
- `engee-runtime-restart` — отдельный application restart либо полный
  production pod stop/start с восстановлением приложения и diagnostics, без
  Git pipeline.

Обычный request оценивает ordered pipeline pod status/start → optional clone → checkout → add →
commit → push → automatic-gate integration → Engee update → Engee start.
Failed deploy всегда загружает diagnostics. Environment sync загружается не
на всякий случай, а только для подтверждённого package-environment failure или
явного post-start запроса; `get_logs` выполняет только evidence branch.
Standalone restart requests используют runtime-restart subskill и не меняют
branch/revision; обязательный remote stash preflight остаётся единственным Git
исключением и никогда не выполняется локально. Занятый DevOps lock проверяется
каждые 20 секунд. После последней operational command task следующая production
eval немедленно устанавливает lock в `false`; report и worker idle/termination
происходят только после release attempt.
