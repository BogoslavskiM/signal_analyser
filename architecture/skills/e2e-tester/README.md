# Скиллы E2E-тестировщика

Скиллы E2E-тестировщика охватывают пользовательские сценарии Playwright/devhub
и подтверждение результатов их выполнения.

Добавляй сюда скилл только для повторяемой проектной процедуры. Базовые правила
передачи задач, отчетности, проверки и границ уже находятся в
`architecture/agents/roles/e2e-tester.toml`.

Доступные скиллы:

- `playwright-test-scaffold/` — создание переносимой `test/playwright`
  инфраструктуры с CDP/vpnp runner, feature flags, базовыми helpers и русским
  coverage map.
- `devhub-playwright-scenario/` — разработка и стабилизация пользовательских
  devhub-сценариев поверх scaffold, включая произвольные внешние reference
  artifacts и сценарии, напрямую переданные MATLAB Researcher. Тесты запускаются
  по доступному URL или текущей browser tab и не требуют deployment.
