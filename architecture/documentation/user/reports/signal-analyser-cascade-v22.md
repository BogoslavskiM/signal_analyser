# Cascade 22: fixed Persistence segmentation NO-GO

Дата: 2026-08-01
Статус: foundation отклонён; current risk зафиксирован

Matched N=64 prod probe показал: current omitted overlap выделяет 1231.86 MiB
и занимает 6.14 s, explicit zero — 369.33 MiB/1.53 s. Zero сохраняет frequency
axis, но меняет power и occurrence, поэтому является breaking algorithm policy.

Guard остановил matrix до complex, Leakage endpoints, repeats и size ladder.
[DEC-028](../decisions/DEC-20260801-028-fixed-persistence-segmentation-no-go.md)
не разрешает fixed-zero foundation на неполном evidence. C21 Frequency Limits
остаётся заблокирован. Current omitted resource cost отдельно признан
operational risk; следующая задача — lazy/materialization containment без
изменения математики.

Pod очищен и подтверждён `stopped`; repo/model/MATLAB/browser не менялись,
Engee bug не заявлен.
