using Test

const SS = Main.AppTestContext

settings_field(document, field_id) = only(filter(field -> field["id"] == field_id, document["fields"]))
without_revision(document) = Dict(key => value for (key, value) in document if key != "state_revision")

@testset "Stored settings are typed, revisioned, atomic and display-owned" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    initial = SS.signal_settings_document(service, state, "display-1")

    @test Set(keys(initial)) == Set(["state_revision", "display_id", "groups", "sections", "fields", "readouts"])
    @test initial["display_id"] == "display-1"
    @test all(group -> Set(keys(group)) == Set(["id", "label", "visible"]), initial["groups"])
    @test all(section -> Set(keys(section)) == Set(["id", "group", "label", "order", "visible"]), initial["sections"])
    @test all(field -> Set(keys(field)) == Set([
        "id", "group", "section", "label", "kind", "control_kind", "value", "default", "units", "min", "max", "step", "options",
        "checked_value", "unchecked_value", "visible", "enabled", "effect_status", "effect_reason", "error", "warning",
    ]), initial["fields"])
    @test all(option -> Set(keys(option)) == Set(["value", "label", "disabled"]), Iterators.flatten(field["options"] for field in initial["fields"]))
    @test all(readout -> Set(keys(readout)) == Set(["id", "group", "section", "label", "value", "units", "status", "reason", "visible"]), initial["readouts"])

    before = SS.signal_analyser_snapshot(state)
    caches = (deepcopy(state.plot_cache), deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))
    calls = (copy(SS.SPECTRUM_CALLS), copy(SS.SPECTROGRAM_CALLS), copy(SS.PERSISTENCE_CALLS), copy(SS.PSPECTRUM_CALLS))
    changed = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => 0,
        "display_id" => "display-1",
        "field_id" => "time.units",
        "value" => "minutes",
    ))
    @test Set(keys(changed)) == Set(["state", "settings"])
    @test changed["state"]["state_revision"] == 1
    @test settings_field(changed["settings"], "time.units")["value"] == "minutes"
    @test (state.plot_cache, state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches
    @test (SS.SPECTRUM_CALLS, SS.SPECTROGRAM_CALLS, SS.PERSISTENCE_CALLS, SS.PSPECTRUM_CALLS) == calls
    @test changed["state"]["plots"] == before["plots"]
    @test changed["state"]["plot_payload"] == before["plot_payload"]
    @test without_revision(changed["state"]["measurements"]) == without_revision(before["measurements"])
    @test without_revision(changed["state"]["peaks"]) == without_revision(before["peaks"])

    # An equal write is a no-op; a stale write cannot overwrite the newer one.
    equal = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => 1, "display_id" => "display-1", "field_id" => "time.units", "value" => "minutes",
    ))
    @test equal["state"]["state_revision"] == 1
    @test_throws SS.SignalAnalyserStaleStateError SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => 0, "display_id" => "display-1", "field_id" => "time.units", "value" => "seconds",
    ))

    # Typed failures are atomic: Julia Bool is not interchangeable with a
    # numeric wire value, enums reject unknown values, and non-finite numeric
    # input is rejected before any publication.
    committed = SS.signal_analyser_snapshot(state)
    for payload in (
        Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "display.show_legend", "value" => 1),
        Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "time.units", "value" => "not-a-unit"),
        Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "spectrum.overlap_percent", "value" => Inf),
    )
        @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, payload)
        @test SS.signal_analyser_snapshot(state) == committed
    end

    # Stored state belongs to its display.  A new display starts from its own
    # defaults and selecting the original display restores its saved value.
    created = SS.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    display_two = SS.signal_settings_document(service, state, "display-2")
    @test settings_field(display_two, "time.units")["value"] != "minutes"
    selected = SS.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    @test selected["active_display_id"] == "display-1"
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "time.units")["value"] == "minutes"
end

@testset "Effective settings retain the existing domain command path" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    changed = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => 0,
        "display_id" => "display-1",
        "field_id" => "spectrum.leakage",
        "value" => 0.25,
    ))
    @test changed["state"]["state_revision"] == 1
    @test changed["state"]["spectrum_settings"]["leakage"] == 0.25
    @test settings_field(changed["settings"], "spectrum.leakage")["value"] == 0.25
end

@testset "DEC-022 Spectrogram Log eligibility follows only the analysis source" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    real_source, unrelated_complex_member = [signal.name for signal in state.signals]

    # A complex trace may be a visible member, but it is not the analysis
    # source.  It therefore cannot disable or reject requested Spectrogram Log.
    prepared = SS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrogram",
        "visible_signals" => [real_source, unrelated_complex_member],
        "analysis_signal" => real_source,
    ))
    scale = settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrogram.frequency_scale")
    @test scale["enabled"] == true
    @test only(filter(option -> option["value"] == "log", scale["options"]))["disabled"] == false
    calls = (copy(SS.SPECTRUM_CALLS), copy(SS.SPECTROGRAM_CALLS), copy(SS.PERSISTENCE_CALLS), copy(SS.PSPECTRUM_CALLS))
    caches = (deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))

    logged = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => prepared["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_scale",
        "value" => "log",
    ))
    @test logged["state"]["state_revision"] == prepared["state_revision"] + 1
    @test logged["state"]["plots"]["spectrogram"]["frequency_scale"] == Dict(
        "requested" => "log", "effective" => "log", "available" => ["linear", "log"],
    )
    @test (SS.SPECTRUM_CALLS, SS.SPECTROGRAM_CALLS, SS.PERSISTENCE_CALLS, SS.PSPECTRUM_CALLS) == calls
    @test (state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches

    # Once the analysis source itself is complex, the requested Log intent is
    # retained while backend-effective presentation becomes Linear.
    complex_source = SS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => logged["state"]["state_revision"],
        "analysis_signal" => unrelated_complex_member,
    ))
    @test complex_source["spectrogram_settings"]["frequency_scale"] == "log"
    @test complex_source["plots"]["spectrogram"]["frequency_scale"] == Dict(
        "requested" => "log", "effective" => "linear", "available" => ["linear"],
    )

    # A complex analysis source is a presentation constraint, not a validation
    # failure: Log remains an accepted requested intent and becomes effective
    # Linear until a real analysis source is selected again.
    complex_state = SS.default_signal_analyser_state()
    real_source, complex_analysis = [signal.name for signal in complex_state.signals]
    complex_prepared = SS.apply_signal_analyser_view!(complex_state, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrogram",
        "visible_signals" => [real_source, complex_analysis],
        "analysis_signal" => complex_analysis,
    ))
    complex_scale = settings_field(SS.signal_settings_document(service, complex_state, "display-1"), "spectrogram.frequency_scale")
    @test only(filter(option -> option["value"] == "log", complex_scale["options"]))["disabled"] == true
    complex_logged = SS.apply_signal_setting!(service, complex_state, Dict(
        "state_revision" => complex_prepared["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_scale",
        "value" => "log",
    ))
    @test complex_logged["state"]["state_revision"] == complex_prepared["state_revision"] + 1
    @test complex_logged["state"]["plots"]["spectrogram"]["frequency_scale"] == Dict(
        "requested" => "log", "effective" => "linear", "available" => ["linear"],
    )

    # Spectrum intentionally retains its stricter any-visible-complex rule.
    spectrum_scale = settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrum.frequency_scale")
    @test only(filter(option -> option["value"] == "log", spectrum_scale["options"]))["disabled"] == true
    before_rejected_spectrum = SS.signal_analyser_snapshot(state)
    @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => complex_source["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrum.frequency_scale",
        "value" => "log",
    ))
    @test SS.signal_analyser_snapshot(state) == before_rejected_spectrum
end

@testset "DEC-040 Spectrum DFT Points stores an exact deferred NFFT preference" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    initial = SS.signal_settings_document(service, state, "display-1")
    nfft = settings_field(initial, "spectrum.nfft")
    @test (length(initial["fields"]), length(initial["sections"]), length(initial["readouts"])) == (41, 29, 3)
    @test nfft == Dict(
        "id" => "spectrum.nfft", "group" => "spectrum", "section" => "spectrum.window_options", "label" => "DFT Points",
        "kind" => "resolution", "control_kind" => "resolution", "value" => Dict("mode" => "auto", "nfft" => nothing),
        "default" => Dict("mode" => "auto", "nfft" => nothing), "units" => "", "min" => 2.0, "max" => nothing,
        "step" => 1.0, "options" => Any[], "checked_value" => nothing, "unchecked_value" => nothing,
        "visible" => false, "enabled" => true, "effect_status" => "blocked_contract", "effect_reason" => "milestone_3_contract",
        "error" => "", "warning" => "",
    )

    spectrum = SS.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "active_plot" => "spectrum"))
    resolution = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => spectrum["state_revision"], "display_id" => "display-1", "field_id" => "spectrum.resolution_type", "value" => "window_length",
    ))
    @test settings_field(resolution["settings"], "spectrum.nfft")["visible"] == true
    window = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => resolution["state"]["state_revision"], "display_id" => "display-1", "field_id" => "spectrum.window_length",
        "value" => Dict("mode" => "specified", "samples" => 8),
    ))
    before = SS.signal_analyser_snapshot(state)
    caches = (deepcopy(state.plot_cache), deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))
    calls = (copy(SS.SPECTRUM_CALLS), copy(SS.SPECTROGRAM_CALLS), copy(SS.PERSISTENCE_CALLS), copy(SS.PSPECTRUM_CALLS))
    specified = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => window["state"]["state_revision"], "display_id" => "display-1", "field_id" => "spectrum.nfft",
        "value" => Dict("mode" => "specified", "nfft" => 16),
    ))
    @test specified["state"]["state_revision"] == window["state"]["state_revision"] + 1
    @test settings_field(specified["settings"], "spectrum.nfft")["value"] == Dict("mode" => "specified", "nfft" => 16)
    @test (state.plot_cache, state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches
    @test (SS.SPECTRUM_CALLS, SS.SPECTROGRAM_CALLS, SS.PERSISTENCE_CALLS, SS.PSPECTRUM_CALLS) == calls
    @test specified["state"]["plots"] == before["plots"] && specified["state"]["plot_payload"] == before["plot_payload"]
    @test without_revision(specified["state"]["measurements"]) == without_revision(before["measurements"])
    @test without_revision(specified["state"]["peaks"]) == without_revision(before["peaks"])
    @test SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => specified["state"]["state_revision"], "display_id" => "display-1", "field_id" => "spectrum.nfft",
        "value" => Dict("mode" => "specified", "nfft" => 16),
    ))["state"]["state_revision"] == specified["state"]["state_revision"]

    committed = SS.signal_analyser_snapshot(state)
    revision = specified["state"]["state_revision"]
    for malformed in (
        Dict("mode" => "auto", "nfft" => 2), Dict("mode" => "specified", "nfft" => true), Dict("mode" => "specified", "nfft" => Inf),
        Dict("mode" => "specified", "nfft" => 1), Dict("mode" => "specified"), Dict("mode" => "specified", "nfft" => 16, "extra" => true),
        Dict("mode" => "specified", "nfft" => 4),
    )
        @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, Dict(
            "state_revision" => revision, "display_id" => "display-1", "field_id" => "spectrum.nfft", "value" => malformed,
        ))
        @test SS.signal_analyser_snapshot(state) == committed
    end
    @test_throws SS.SignalAnalyserStaleStateError SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => revision - 1, "display_id" => "display-1", "field_id" => "spectrum.nfft", "value" => Dict("mode" => "auto", "nfft" => nothing),
    ))

    # Auto Window Length deliberately defers the final effective-length check.
    deferred = SS.default_signal_analyser_state()
    SS.apply_signal_analyser_view!(deferred, Dict("state_revision" => 0, "active_plot" => "spectrum"))
    SS.apply_signal_setting!(service, deferred, Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "spectrum.resolution_type", "value" => "window_length"))
    deferred_nfft = SS.apply_signal_setting!(service, deferred, Dict(
        "state_revision" => 2, "display_id" => "display-1", "field_id" => "spectrum.nfft", "value" => Dict("mode" => "specified", "nfft" => 2),
    ))
    @test settings_field(deferred_nfft["settings"], "spectrum.nfft")["value"] == Dict("mode" => "specified", "nfft" => 2)

    # The stored preference is Display-owned and survives Clear/source changes.
    created = SS.apply_signal_analyser_display!(state, Dict("state_revision" => revision, "operation" => "create"))
    @test settings_field(SS.signal_settings_document(service, state, "display-2"), "spectrum.nfft")["value"] == Dict("mode" => "auto", "nfft" => nothing)
    SS.apply_signal_analyser_display!(state, Dict("state_revision" => created["state_revision"], "operation" => "select", "display_id" => "display-1"))
    cleared = SS.apply_signal_analyser_view!(state, Dict("state_revision" => created["state_revision"] + 1, "visible_signals" => String[]))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrum.nfft")["value"] == Dict("mode" => "specified", "nfft" => 16)
    restored = SS.apply_signal_analyser_view!(state, Dict("state_revision" => cleared["state_revision"], "visible_signals" => [state.signals[2].name], "analysis_signal" => state.signals[2].name))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrum.nfft")["value"] == Dict("mode" => "specified", "nfft" => 16)
end

@testset "DEC-041 canonical unit preferences are passive per-Display projections" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    unit_fields = Dict(
        "time.units" => ("seconds", "minutes"),
        "spectrum.frequency_units" => ("hertz", "kilohertz"),
        "spectrogram.time_units" => ("seconds", "years"),
        "spectrogram.frequency_units" => ("hertz", "cycles_per_year"),
        "persistence.time_units" => ("seconds", "picoseconds"),
        "persistence.frequency_units" => ("hertz", "terahertz"),
    )
    initial = SS.signal_settings_document(service, state, "display-1")
    @test all(id -> begin
        field = settings_field(initial, id)
        field["value"] == unit_fields[id][1] && field["default"] == unit_fields[id][1] &&
            field["effect_status"] == "effective_presentation" && field["effect_reason"] == ""
    end, keys(unit_fields))
    @test all(id -> !isempty(settings_field(initial, id)["options"]), keys(unit_fields))
    time_options = ["picoseconds", "nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "days", "years"]
    frequency_options = ["cycles_per_year", "cycles_per_day", "cycles_per_hour", "cycles_per_minute", "millihertz", "hertz", "kilohertz", "megahertz", "gigahertz", "terahertz"]
    @test all(id -> [option["value"] for option in settings_field(initial, id)["options"]] == time_options, ("time.units", "spectrogram.time_units", "persistence.time_units"))
    @test all(id -> [option["value"] for option in settings_field(initial, id)["options"]] == frequency_options, ("spectrum.frequency_units", "spectrogram.frequency_units", "persistence.frequency_units"))

    before = SS.signal_analyser_snapshot(state)
    caches = (deepcopy(state.plot_cache), deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))
    calls = (copy(SS.SPECTRUM_CALLS), copy(SS.SPECTROGRAM_CALLS), copy(SS.PERSISTENCE_CALLS), copy(SS.PSPECTRUM_CALLS))
    revision = 0
    for id in ("time.units", "spectrum.frequency_units", "spectrogram.time_units", "spectrogram.frequency_units", "persistence.time_units", "persistence.frequency_units")
        changed = SS.apply_signal_setting!(service, state, Dict(
            "state_revision" => revision, "display_id" => "display-1", "field_id" => id, "value" => unit_fields[id][2],
        ))
        revision += 1
        @test changed["state"]["state_revision"] == revision
        @test settings_field(changed["settings"], id)["value"] == unit_fields[id][2]
        @test changed["state"]["plots"] == before["plots"] && changed["state"]["plot_payload"] == before["plot_payload"]
        @test without_revision(changed["state"]["measurements"]) == without_revision(before["measurements"])
        @test without_revision(changed["state"]["peaks"]) == without_revision(before["peaks"])
    end
    @test (state.plot_cache, state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches
    @test (SS.SPECTRUM_CALLS, SS.SPECTROGRAM_CALLS, SS.PERSISTENCE_CALLS, SS.PSPECTRUM_CALLS) == calls
    @test SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => revision, "display_id" => "display-1", "field_id" => "time.units", "value" => "minutes",
    ))["state"]["state_revision"] == revision
    committed = SS.signal_analyser_snapshot(state)
    @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => revision, "display_id" => "display-1", "field_id" => "time.units", "value" => "fortnights",
    ))
    @test SS.signal_analyser_snapshot(state) == committed
    @test_throws SS.SignalAnalyserStaleStateError SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => revision - 1, "display_id" => "display-1", "field_id" => "time.units", "value" => "hours",
    ))

    created = SS.apply_signal_analyser_display!(state, Dict("state_revision" => revision, "operation" => "create"))
    @test settings_field(SS.signal_settings_document(service, state, "display-2"), "time.units")["value"] == "seconds"
    @test settings_field(SS.signal_settings_document(service, state, "display-2"), "spectrum.frequency_units")["value"] == "hertz"
    selected = SS.apply_signal_analyser_display!(state, Dict("state_revision" => created["state_revision"], "operation" => "select", "display_id" => "display-1"))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrogram.time_units")["value"] == "years"
    cleared = SS.apply_signal_analyser_view!(state, Dict("state_revision" => selected["state_revision"], "visible_signals" => String[]))
    readded = SS.apply_signal_analyser_view!(state, Dict("state_revision" => cleared["state_revision"], "visible_signals" => [state.signals[2].name], "analysis_signal" => state.signals[2].name))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "persistence.frequency_units")["value"] == "terahertz"
    closed = SS.apply_signal_analyser_display!(state, Dict("state_revision" => readded["state_revision"], "operation" => "close", "display_id" => "display-1"))
    @test closed["active_display_id"] == "display-2"
    @test_throws SS.SignalAnalyserValidationError SS.signal_settings_document(service, state, "display-1")
end

@testset "DEC-042 Spectrogram power scale is backend-authoritative presentation" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    field = settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrogram.scale")
    @test field["value"] == field["default"] == "db"
    @test field["effect_status"] == "effective" && field["effect_reason"] == ""
    @test [option["value"] for option in field["options"]] == ["db", "linear"]

    active = SS.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "active_plot" => "spectrogram"))
    db = SS.signal_analyser_snapshot(state)["plots"]["spectrogram"]
    @test db["z"] == [[0.0, 10 * log10(4.0)], [10 * log10(9.0), 10 * log10(16.0)]]
    @test db["color_label"] == "Мощность, дБ"
    @test Set(keys(db["power_limits"])) == Set(["mode", "requested", "effective", "rendered"])
    @test db["power_limits"]["rendered"] == Dict("min" => 0.0, "max" => 10 * log10(16.0), "units" => "dB")
    calls = (copy(SS.SPECTRUM_CALLS), copy(SS.SPECTROGRAM_CALLS), copy(SS.PERSISTENCE_CALLS), copy(SS.PSPECTRUM_CALLS))
    caches = (deepcopy(state.plot_cache), deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))
    linear = SS.apply_signal_setting!(service, state, Dict(
        "state_revision" => active["state_revision"], "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear",
    ))
    plot = linear["state"]["plots"]["spectrogram"]
    @test plot["z"] == [[1.0, 4.0], [9.0, 16.0]] && plot["x"] == db["x"] && plot["y"] == db["y"]
    @test plot["color_label"] == "Мощность"
    @test plot["power_limits"]["rendered"] == Dict("min" => 1.0, "max" => 16.0, "units" => "power")
    @test (SS.SPECTRUM_CALLS, SS.SPECTROGRAM_CALLS, SS.PERSISTENCE_CALLS, SS.PSPECTRUM_CALLS) == calls
    @test (state.plot_cache, state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches
    @test SS.apply_signal_setting!(service, state, Dict("state_revision" => linear["state"]["state_revision"], "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear"))["state"]["state_revision"] == linear["state"]["state_revision"]
    committed = SS.signal_analyser_snapshot(state)
    @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, Dict("state_revision" => linear["state"]["state_revision"], "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "watts"))
    @test SS.signal_analyser_snapshot(state) == committed
    @test_throws SS.SignalAnalyserStaleStateError SS.apply_signal_setting!(service, state, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "db"))

    # A cold scale mutation stores intent but must neither query nor warm raw data.
    cold = SS.default_signal_analyser_state()
    cold_active = SS.apply_signal_analyser_view!(cold, Dict("state_revision" => 0, "active_plot" => "spectrogram"))
    empty!(cold.spectrogram_cache); empty!(SS.SPECTROGRAM_CALLS)
    cold_linear = SS.apply_signal_setting!(service, cold, Dict("state_revision" => cold_active["state_revision"], "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear"))
    @test isempty(cold.spectrogram_cache) && isempty(SS.SPECTROGRAM_CALLS)
    @test cold_linear["state"]["plots"]["spectrogram"]["z"] == Vector{Vector{Float64}}()

    created = SS.apply_signal_analyser_display!(state, Dict("state_revision" => linear["state"]["state_revision"], "operation" => "create"))
    @test settings_field(SS.signal_settings_document(service, state, "display-2"), "spectrogram.scale")["value"] == "db"
    SS.apply_signal_analyser_display!(state, Dict("state_revision" => created["state_revision"], "operation" => "select", "display_id" => "display-1"))
    cleared = SS.apply_signal_analyser_view!(state, Dict("state_revision" => created["state_revision"] + 1, "visible_signals" => String[]))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "spectrogram.scale")["value"] == "linear"
    closed = SS.apply_signal_analyser_display!(state, Dict("state_revision" => cleared["state_revision"], "operation" => "close", "display_id" => "display-1"))
    @test closed["active_display_id"] == "display-2"

    # Linear cannot publish an explicit dB pair that underflows to a finite,
    # strictly ordered power interval.  Both settings and legacy View paths
    # must roll back atomically.
    edge = SS.default_signal_analyser_state()
    accepted_underflow = Dict("min" => -4000.0, "max" => -3000.0)
    explicit = SS.apply_signal_setting!(service, edge, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "spectrogram.power_limits", "value" => accepted_underflow))
    @test SS.apply_signal_setting!(service, edge, Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear"))["state"]["state_revision"] == 2
    edge = SS.default_signal_analyser_state()
    collapse = Dict("min" => -4000.0, "max" => -3990.0)
    SS.apply_signal_setting!(service, edge, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "spectrogram.power_limits", "value" => collapse))
    before_scale = SS.signal_analyser_snapshot(edge)
    @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, edge, Dict("state_revision" => 1, "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear"))
    @test SS.signal_analyser_snapshot(edge) == before_scale
    linear_edge = SS.default_signal_analyser_state()
    SS.apply_signal_setting!(service, linear_edge, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "spectrogram.scale", "value" => "linear"))
    before_view = SS.signal_analyser_snapshot(linear_edge)
    @test_throws SS.SignalAnalyserValidationError SS.apply_signal_analyser_view!(linear_edge, Dict("state_revision" => 1, "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => Dict("min_db" => -4000.0, "max_db" => -3990.0, "units" => "dB"))))
    @test SS.signal_analyser_snapshot(linear_edge) == before_view
end

@testset "DEC-043 Persistence Density Limits are authoritative presentation" begin
    service = SS.SignalSettingsService()
    state = SS.default_signal_analyser_state()
    field = settings_field(SS.signal_settings_document(service, state, "display-1"), "persistence.density_limits")
    @test field["value"] === nothing && field["effect_status"] == "effective_presentation" && field["effect_reason"] == ""
    @test (field["kind"], field["control_kind"], field["min"], field["max"], field["units"]) == ("optional_range", "range", 0.0, 100.0, "%")
    @test SS.signal_analyser_snapshot(state)["plots"]["persistence"]["density_limits"] == Dict("mode" => "auto", "requested" => nothing, "effective" => nothing, "rendered" => nothing)

    active = SS.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "active_plot" => "persistence"))
    hot = SS.signal_analyser_snapshot(state)
    raw_z = deepcopy(hot["plots"]["persistence"]["z"])
    calls = copy(SS.PERSISTENCE_CALLS); cache = deepcopy(state.persistence_cache)
    explicit = SS.apply_signal_setting!(service, state, Dict("state_revision" => active["state_revision"], "display_id" => "display-1", "field_id" => "persistence.density_limits", "value" => Dict("min" => 10.0, "max" => 80.0)))
    meta = explicit["state"]["plots"]["persistence"]["density_limits"]
    pair = Dict("min" => 10.0, "max" => 80.0, "units" => "percent")
    @test meta == Dict("mode" => "explicit", "requested" => pair, "effective" => pair, "rendered" => pair)
    @test explicit["state"]["plots"]["persistence"]["z"] == raw_z
    @test SS.PERSISTENCE_CALLS == calls && state.persistence_cache == cache
    @test SS.apply_signal_setting!(service, state, Dict("state_revision" => explicit["state"]["state_revision"], "display_id" => "display-1", "field_id" => "persistence.density_limits", "value" => Dict("min" => 10.0, "max" => 80.0)))["state"]["state_revision"] == explicit["state"]["state_revision"]
    before = SS.signal_analyser_snapshot(state)
    for bad in (Dict("min" => true, "max" => 80.0), Dict("min" => 80.0, "max" => 80.0), Dict("min" => -1.0, "max" => 80.0), Dict("min" => 10.0, "max" => 101.0), Dict("min" => 10.0, "max" => Inf), Dict("min" => 10.0, "max" => 80.0, "extra" => true))
        @test_throws SS.SignalSettingValidationError SS.apply_signal_setting!(service, state, Dict("state_revision" => explicit["state"]["state_revision"], "display_id" => "display-1", "field_id" => "persistence.density_limits", "value" => bad))
        @test SS.signal_analyser_snapshot(state) == before
    end
    @test_throws SS.SignalAnalyserStaleStateError SS.apply_signal_setting!(service, state, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "persistence.density_limits", "value" => nothing))
    created = SS.apply_signal_analyser_display!(state, Dict("state_revision" => explicit["state"]["state_revision"], "operation" => "create"))
    @test settings_field(SS.signal_settings_document(service, state, "display-2"), "persistence.density_limits")["value"] === nothing
    selected = SS.apply_signal_analyser_display!(state, Dict("state_revision" => created["state_revision"], "operation" => "select", "display_id" => "display-1"))
    cleared = SS.apply_signal_analyser_view!(state, Dict("state_revision" => selected["state_revision"], "visible_signals" => String[]))
    @test settings_field(SS.signal_settings_document(service, state, "display-1"), "persistence.density_limits")["value"] == Dict("min" => 10.0, "max" => 80.0)
    closed = SS.apply_signal_analyser_display!(state, Dict("state_revision" => cleared["state_revision"], "operation" => "close", "display_id" => "display-1"))
    @test closed["active_display_id"] == "display-2"
end
