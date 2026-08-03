---
id: TASK-0010
kind: task
title: Добавить типовую архитектуру тестовых проектов
status: done
priority: P1
queue_order: 10
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: [TASK-0009]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Добавить типовую архитектуру тестовых проектов

## Scope

Закрепить структуру каталогов и стек в workflow skills Tester и E2E.

## Acceptance criteria

- [x] Tester знает типовую структуру `test/back`, `test/engee`, `test/front`.
- [x] Tester использует Julia Test, Genie и Node.js без Playwright.
- [x] E2E знает типовую структуру `test/playwright`.
- [x] E2E использует Node.js, Playwright Core, Chromium/CDP и `data-testid`.
- [x] Новые skills не добавлены.
- [x] Manifests валидны.

## Verification and results

Типовая архитектура и стек добавлены в существующие workflow Tester и E2E.
Проверены 17 skill manifests.
