# Реестр дефектов Engee

Stable ID: `ENGEE-YYYYMMDD-NNN-short-slug`. Статусы: `suspected`, `confirmed`,
`reported`, `fixed`, `verified`, `closed`.

До `confirmed` обязательны minimal safe reproduction и isolation evidence. Для
availability issue дополнительно нужны base/auth/target split и безопасный
повтор. Если isolation не отделяет Engee от app/test/config/network, status
остаётся `suspected`. Workaround не закрывает bug.

Original reproduction и history append-only; correction/status update — новая
датированная секция. PAT и другие секреты запрещены.

## Index

| ID | Title | Status | Last verified | Surface |
| --- | --- | --- | --- | --- |
| [ENGEE-20260731-001-engeedsp-project-discovery](ENGEE-20260731-001-engeedsp-project-discovery.md) | EngeeDSP недоступен clean project, но предоставлен platform LOAD_PATH | closed (non-defect limitation) | 2026-07-31 | EngeeDSP/runtime |
| [ENGEE-20260731-002-findpeaks-npeaks-casing](ENGEE-20260731-002-findpeaks-npeaks-casing.md) | Reference пишет `Npeaks`, runtime принимает только `NPeaks` | confirmed | 2026-07-31 | EngeeDSP documentation |
| [ENGEE-20260801-003-pspectrum-time-resolution-undefined](ENGEE-20260801-003-pspectrum-time-resolution-undefined.md) | pspectrum TimeResolution вызывает отсутствующий validator | confirmed | 2026-08-01 | EngeeDSP runtime API |

StipplePlotly world-age warnings пока не зарегистрированы отдельным bug report:
нет exact warning/stack и минимальной изоляции. Это candidate intake, а не
подтверждённый Engee defect.

- [Шаблон bug report](template.md)
