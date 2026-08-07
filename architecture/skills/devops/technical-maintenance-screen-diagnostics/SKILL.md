# Technical Maintenance Screen Diagnostics

## Назначение

Применяй этот subskill, когда production browser вместо приложения показывает
экран «Технические работы», generic maintenance/error page или аналогичный
branded fallback. Не считай внешний вид страницы доказательством бага Engee:
частая причина — приложение не стартовало, backend bootstrap завершился
ошибкой или main document/API возвращает HTTP 500.

## Диагностика

1. Зафиксируй exact URL, timestamp, expected revision и screenshot
   `technical-maintenance-screen.png`.
2. Получи status main document, redirect chain и безопасные response metadata;
   сохрани их в `main-document-response.txt`. Не сохраняй cookies, PAT или
   Authorization headers.
3. Сопоставь browser symptom с `engee_status`, результатом `engee_start`, pod
   readiness, фактическим `engee.genie.start`, application readiness и логом,
   переданным через `log_file`.
4. После подтверждённого pod ready и application start выполни не более одного
   bounded reload/probe, чтобы отличить stale gateway page от устойчивой
   ошибки. Не маскируй проблему циклическими retry.
5. Классифицируй только по совокупности evidence:
   - main document/API `500`, failed Genie start/readiness, Julia
     exception/stacktrace или backend bootstrap error → `backender`;
   - Backend readiness и базовый HTTP успешны, но static/JS/Vue bootstrap
     сломан → `frontend`;
   - pod не был поднят, использован неверный target/path/revision или нарушен
     pipeline → `devops`;
   - pod/ingress/platform symptom не имеет конкретной product signature →
     `devops`, если исправление относится к deploy/pod pipeline, иначе
     `undetermined` для решения Orchestrator;
   - недостаточно evidence → `undetermined`.
6. Передай classification в `devops/engee-deployment-diagnostics`; он владеет
   каталогом логов, итоговым SUMMARY и handoff routing.

## Guardrails

- Не объявляй Engee blocker по одному branded maintenance screen.
- Не направляй maintenance, pod или platform availability failure Engee User:
  эта роль не владеет инфраструктурой и запуском приложения.
- Не исправляй backend/frontend и не создавай заглушку.
- Не запускай приложение локально и не используй localhost.
- Не запускай Playwright suite; разрешён только минимальный production probe.
- Не подменяй HTTP status DOM-текстом: если network evidence недоступно,
  отметь status как `unknown`.

## Результат

Верни `screen_detected`, URL/time, pod/start/readiness states, main-document
status, screenshot/network/log refs, bounded-retry result, evidence-based
`failure_owner` и rationale.
