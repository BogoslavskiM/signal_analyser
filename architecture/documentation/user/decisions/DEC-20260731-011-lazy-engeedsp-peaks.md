# DEC-20260731-011: Peaks как lazy per-Display EngeeDSP capability

ID: `DEC-20260731-011`
Дата: 2026-07-31
Статус: accepted, implemented locally, application runtime unverified

## Контекст

MATLAB research подтвердил time-domain Find Peaks lifecycle. Официальный Engee
reference и prod MIND probes подтвердили
`EngeeDSP.Functions.findpeaks(y; out=:data)` с результатом
`Ypk/Xpk/Wpk/Ppk`. При этом пакет отсутствует в локальном clean Julia project,
а обязательный расчёт Peaks в каждом snapshot сделал бы всё приложение
неработоспособным вне Engee runtime.

## Альтернативы

Вычислять Peaks всегда; добавить отдельный endpoint; написать локальный
математический fallback; сделать Peaks явно включаемой capability внутри
существующего revision-safe view contract.

## Решение

Peaks хранится как `peaks_enabled` у каждой Display page и изменяется через
существующий `POST /api/view`. Новый endpoint и fallback не создаются. Пока
capability выключена, snapshot содержит пустой typed Peaks result, а EngeeDSP
не загружается. Включение допустимо только для Time и лениво вызывает
подтверждённый provider; переход на другой plot выключает Peaks.

Backend использует immutable domain query/result/item/snapshot,
`AbstractPeaksProvider`, injectable fake и production
`EngeeDSPPeaksProvider`. Package output индексируется по Julia 1-based; product
публикует zero-based `sample_index` и `time_s`. Любая provider/domain ошибка
возникает до publication и не изменяет revision, Display, selection, membership
или cache.

Frontend не вычисляет пики: таблица и Plotly markers строятся только из
authoritative `peaks.items`. Нижняя вкладка Peaks остаётся локальной навигацией;
сам Find Peaks toggle является revision-safe backend mutation.

## Последствия

Локальная разработка и disabled state не зависят от доступности EngeeDSP.
Production capability сохраняет инженерную функцию без скрытого fallback.
Первый срез не включает thresholds, sorting, NPeaks, x/Fs modes, settings или
Label Peaks. Runtime app E2E требует authenticated deployed target; prod MIND
package contract и lazy-load/world-age path проверяются отдельно.

## Связи и evidence

[SPEC-SA-UI-001](../specifications/signal-visibility-and-plots.md),
[математический контракт](../specifications/mathematics/signal-analysis.md),
[traceability](../traceability/signal-analyser-cascades.md),
[ENGEE-20260731-002](../engee_bugs/ENGEE-20260731-002-findpeaks-npeaks-casing.md).
