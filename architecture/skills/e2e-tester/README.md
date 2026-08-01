# Скиллы E2E-тестировщика

Скиллы E2E-тестировщика охватывают пользовательские сценарии Playwright на
Engee target из проектного `[engee_target]` и подтверждение результатов их
выполнения. Runner enforce `base_url` как allowed origin и соблюдает
`environment`, `mcp_server`, `allow_devhub` и `allow_fallback` без собственного
выбора окружения.

Добавляй сюда скилл только для повторяемой проектной процедуры. Базовые правила
передачи задач, отчетности, проверки и границ уже находятся в
`architecture/agents/roles/e2e-tester.toml`.

Доступные скиллы:

- `playwright-test-scaffold/` — создание переносимой `test/playwright`
  инфраструктуры с CDP/vpnp runner, capability flags универсальных UI skills и
  предметных функций проекта, базовыми helpers и русским coverage map.
- `devhub-playwright-scenario/` — совместимый id для разработки и стабилизации
  пользовательских Engee-сценариев поверх scaffold, включая произвольные внешние reference
  artifacts и сценарии, напрямую переданные MATLAB Researcher. Тесты запускаются
  только по разрешённому URL или current tab и не требуют deployment. Наличие
  `devhub` в id не выбирает окружение.
