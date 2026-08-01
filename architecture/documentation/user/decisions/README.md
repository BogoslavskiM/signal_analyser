# Архитектурные решения (ADR)

ADR immutable по смыслу. Старое решение не переписывается: его status
помечается `superseded`, добавляется датированная note и ссылка на successor.

- [DEC-20260731-001: два слоя документации](DEC-20260731-001-documentation-layers.md)
- [DEC-20260731-002: роль Documenter пока не вводится](DEC-20260731-002-documenter-role.md)
- [DEC-20260731-003: fixed 2×2 и visibility — superseded](DEC-20260731-003-fixed-grid-visibility.md)
- [DEC-20260731-004: EngeeDSP как Engee platform LOAD_PATH prerequisite](DEC-20260731-004-engeedsp-platform-load-path.md)
- [DEC-20260731-005: ownership Project.toml](DEC-20260731-005-project-toml-ownership.md)
- [DEC-20260731-006: local-first bundled Plotly — superseded](DEC-20260731-006-local-first-plotly.md)
- [DEC-20260731-007: repository-native documentation delivery](DEC-20260731-007-repository-native-docs.md)
- [DEC-20260731-008: универсальный каталог скиллов](DEC-20260731-008-universal-skill-catalog.md)
- [DEC-20260731-009: страницы Display с одним графиком](DEC-20260731-009-display-pages.md)
- [DEC-20260731-010: локальная Plotly без CDN](DEC-20260731-010-local-only-plotly.md)
- [DEC-20260731-011: lazy per-Display EngeeDSP Peaks](DEC-20260731-011-lazy-engeedsp-peaks.md)
- [DEC-20260731-012: разделение row selection, Display membership и analysis source](DEC-20260731-012-display-selection-separation.md)
- [DEC-20260731-013: authoritative per-Display Time ROI](DEC-20260731-013-authoritative-time-roi.md)
- [DEC-20260731-014: selectable per-Display Statistics](DEC-20260731-014-selectable-statistics.md)
- [DEC-20260801-015: Spectrum по Time ROI и настройки Display](DEC-20260801-015-spectrum-roi-default-settings.md)
- [DEC-20260801-016: редактируемые Frequency Limits для Spectrum](DEC-20260801-016-frequency-limits.md)
- [DEC-20260801-017: typed Spectrogram foundation](DEC-20260801-017-typed-spectrogram-foundation.md)
- [DEC-20260801-018: Spectrogram OverlapPercent](DEC-20260801-018-spectrogram-overlap-percent.md)
- [Шаблон ADR](template.md)
