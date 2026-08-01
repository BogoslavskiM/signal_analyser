# Cascade 21: Persistence Frequency Limits capability

Дата: 2026-08-01
Статус: provider PASS; product blocked

Frequency Limits работает в EngeeDSP Persistence: real/complex in-domain bands
сохраняют exact endpoints, формируют новую 1024-point grid и меняют power/
occurrence. Product обязан отклонять partial intervals вместо provider clipping
и сохранять Auto отдельно от explicit full intent. Probe прошёл resource guard:
28 accepted observations, максимум 382.46 MiB, pod очищен и остановлен.

Но весь probe намеренно использовал explicit `OverlapPercent=0`, тогда как C19
adapter использует omitted overlap. Добавление zero изменит baseline всех
Persistence heatmaps и cache semantics; использование omitted не имеет C21
resource evidence. Поэтому [DEC-027](../decisions/DEC-20260801-027-persistence-frequency-limits-blocked.md)
блокирует implementation до отдельной fixed-segmentation foundation.

MATLAB GUI, Add-On Explorer, Command Window, browser, repository, models и
dependencies в research/probe не менялись. Engee bug не заявлен.
