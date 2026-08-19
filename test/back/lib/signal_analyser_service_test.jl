using Test

const SA = Main.AppTestContext

mutable struct FakePeaksProvider <: SA.AbstractPeaksProvider
    calls::Vector{SA.SignalPeaksQuery}
    result::SA.SignalPeaksProviderResult
    failure::Union{Nothing,Exception}
end

mutable struct FakeWorkspaceSignalSource <: SA.AbstractWorkspaceSignalSource
    values::Dict{String,Any}
    failure::Union{Nothing,Exception}
end

function SA.workspace_signal_value(source::FakeWorkspaceSignalSource, variable_name::String)
    source.failure === nothing || throw(source.failure)
    haskey(source.values, variable_name) || throw(ArgumentError("unknown deterministic workspace variable"))
    source.values[variable_name]
end

# Calculation controls are draft-only.  Keep the legacy service tests on the
# public field/apply boundary instead of reconstructing a removed grouped view
# snapshot.  A ready snapshot is intentionally requested only after Apply.
function explicit_calculation_snapshot!(state, service, field_id, value)
    draft = SA.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision,
        "display_id" => state.active_display_id,
        "field_id" => field_id,
        "value" => value,
    ))
    applied = SA.apply_signal_settings!(service, state, Dict(
        "state_revision" => draft["state"]["state_revision"],
        "display_id" => state.active_display_id,
    ))
    @test applied["success"] === true
    SA.signal_analyser_snapshot(state)
end

function explicit_calculation_failure!(state, service, field_id, value)
    draft = SA.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision,
        "display_id" => state.active_display_id,
        "field_id" => field_id,
        "value" => value,
    ))
    SA.apply_signal_settings!(service, state, Dict(
        "state_revision" => draft["state"]["state_revision"],
        "display_id" => state.active_display_id,
    ))
end

"""Request the selected pane and wait for its one permitted active calculation."""
function materialize_active_output!(state; plot = nothing)
    if plot !== nothing
        SA.apply_signal_analyser_view!(state, Dict(
            "state_revision" => state.view.state_revision,
            "active_plot" => plot,
        ))
    end
    display_id = state.active_display_id
    pane_id = state.display_layouts[display_id].active_pane_id
    SA.signal_analyser_active_output(state, display_id, pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    SA.signal_analyser_active_output(state, display_id, pane_id)
end

function immediate_setting_snapshot!(state, service, field_id, value)
    update = SA.apply_signal_setting!(service, state, Dict(
        "state_revision" => state.view.state_revision,
        "display_id" => state.active_display_id,
        "field_id" => field_id,
        "value" => value,
    ))
    update["state"]
end

"""Bind an explicit test inventory to the active pane through the public layout boundary."""
function bind_active_test_pane!(state; signal_names = [signal.name for signal in state.signals])
    pane_id = state.display_layouts[state.active_display_id].active_pane_id
    SA.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => signal_names,
    ); lightweight = true)
end

"""Adapt pre-empty-pane regression fixtures without changing their revision-zero baselines."""
function legacy_bind_active_test_pane!(state; signal_names = [signal.name for signal in state.signals])
    bind_active_test_pane!(state; signal_names = signal_names)
    state.view.state_revision = 0
    manager = state.output_manager
    manager.calculation_revision = 0
    manager.peaks_calculation_revision = 0
    for page_id in keys(manager.page_calculation_revisions)
        manager.page_calculation_revisions[page_id] = 0
    end
    for page_id in keys(manager.peaks_page_calculation_revisions)
        manager.peaks_page_calculation_revisions[page_id] = 0
    end
    state
end

function legacy_bound_default_state(; kwargs...)
    legacy_bind_active_test_pane!(SA.default_signal_analyser_state(; kwargs...))
end

@testset "Signals inspector mutation rollback protects active Log Spectrum" begin
    workspace = FakeWorkspaceSignalSource(Dict{String,Any}("complex-import" => ComplexF64[1 + 2im, 3 + 4im, 5 + 6im]), nothing)
    service = SA.SignalInventoryService(workspace)
    state = SA.test_state_with_complex_signal()
    settings_service = SA.SignalSettingsService()
    real_name, complex_name = [signal.name for signal in state.signals]
    # Calculation settings are no longer accepted through the view snapshot.
    # Frequency-scale presentation is an immediate, provider-free one-field
    # update; it is not an explicit-Apply calculation draft.
    view = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrum",
        "visible_signals" => [real_name],
        "row_selected_signal" => complex_name,
    ))
    settings_service = SA.SignalSettingsService()
    log_view = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => view["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrum.frequency_scale",
        "value" => "log",
    ))
    @test log_view["state"]["state_revision"] == view["state_revision"] + 1
    before = SA.signal_analyser_snapshot(state)
    provider_calls = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS), length(SA.PERSISTENCE_CALLS))
    for command in (SA.DuplicateSignalCommand(log_view["state"]["state_revision"], complex_name), SA.ImportWorkspaceSignalCommand(log_view["state"]["state_revision"], "complex-import", nothing, 10.0))
        err = try SA.apply_signal_inventory!(service, state, command) catch caught; caught end
        @test err isa SA.SignalAnalyserValidationError
        @test haskey(err.fields, "spectrum_settings") || haskey(err.fields, "signal_name")
        @test SA.signal_analyser_snapshot(state) == before
        @test (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS), length(SA.PERSISTENCE_CALLS)) == provider_calls
    end
    # Inventory changes are lazy: a provider outage cannot make the mutation
    # fail before the active output endpoint asks to materialize it.
    SA.SPECTRUM_FAILURE[] = true
    copied = SA.apply_signal_inventory!(service, state, SA.DuplicateSignalCommand(log_view["state"]["state_revision"], real_name))
    @test copied["state_revision"] == log_view["state"]["state_revision"] + 1
    @test copied["row_selected_signal"] == real_name * "_Copy"
    @test length(state.signals) == length(before["signals"]) + 1
    SA.SPECTRUM_FAILURE[] = false
end

@testset "Signals inventory lower-Fs source changes reset explicit limits without cache reuse" begin
    workspace = FakeWorkspaceSignalSource(Dict{String,Any}("low-import" => [1.0, 2.0, 3.0]), nothing)
    service = SA.SignalInventoryService(workspace)
    state = SA.test_state_with_complex_signal()
    high_name = state.signals[1].name
    low = SA.AnalysedSignal("low-source", "#111111", 10.0, ComplexF64[1, 2, 3], false, true)
    push!(state.signals, low)
    # Each request gets its own JSON-shaped range object.  Draft parsing
    # accepts only the UI wire keys min/max; do not reuse a value that a later
    # test step could accidentally retain or mutate.
    settings_limits() = Dict{String,Any}("min" => 100.0, "max" => 500.0)
    settings_service = SA.SignalSettingsService()
    selected = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0, "active_plot" => "spectrum", "visible_signals" => [high_name], "row_selected_signal" => low.name,
    ))
    spectrum_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => selected["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => settings_limits(),
    ))
    spectrogram_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => spectrum_draft["state"]["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => settings_limits(),
    ))
    applied = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => spectrogram_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test applied["success"] === true
    view = SA.signal_analyser_snapshot(state)
    before_cache = (deepcopy(state.spectrum_cache), deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache))
    copied = SA.apply_signal_inventory!(service, state, SA.DuplicateSignalCommand(view["state_revision"], low.name))
    @test copied["state_revision"] == view["state_revision"] + 1
    @test copied["analysis_signal"] == copied["row_selected_signal"]
    @test copied["spectrum_settings"]["frequency_limits"] === nothing
    @test copied["spectrogram_settings"]["frequency_limits"] === nothing
    @test copied["plots"]["spectrum"]["frequency_limits"]["requested"] === nothing
    @test copied["plots"]["spectrogram"]["frequency_limits"]["requested"] === nothing
    @test (state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == before_cache

    state = legacy_bound_default_state()
    high_name = state.signals[1].name
    settings_service = SA.SignalSettingsService()
    selected = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0, "active_plot" => "spectrogram", "visible_signals" => [high_name],
    ))
    spectrum_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => selected["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => settings_limits(),
    ))
    spectrogram_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => spectrum_draft["state"]["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => settings_limits(),
    ))
    applied = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => spectrogram_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test applied["success"] === true
    view = SA.signal_analyser_snapshot(state)
    imported = SA.apply_signal_inventory!(service, state, SA.ImportWorkspaceSignalCommand(view["state_revision"], "low-import", nothing, 10.0))
    @test imported["state_revision"] == view["state_revision"] + 1
    @test imported["analysis_signal"] == imported["row_selected_signal"]
    @test imported["spectrum_settings"]["frequency_limits"] === nothing
    @test imported["spectrogram_settings"]["frequency_limits"] === nothing
    @test imported["plots"]["spectrogram"]["frequency_limits"]["requested"] === nothing
end

@testset "Signals inventory palette allocation cycles deterministically" begin
    workspace = FakeWorkspaceSignalSource(Dict{String,Any}(), nothing)
    service = SA.SignalInventoryService(workspace)
    state = SA.default_signal_analyser_state()
    source = state.signals[1].name
    snapshot = SA.signal_analyser_snapshot(state)
    for _ in 1:16
        snapshot = SA.apply_signal_inventory!(service, state, SA.DuplicateSignalCommand(snapshot["state_revision"], source))
    end
    colors = [signal["color"] for signal in snapshot["signals"]]
    palette = SA.SignalColorPalette().colors
    @test all(color -> color in palette, colors)
    source_color = first(colors)
    expected_colors = [
        index <= 2 ? palette[index] : begin
            candidate = palette[mod1(index, length(palette))]
            candidate == source_color && length(palette) > 1 ? palette[mod1(index + 1, length(palette))] : candidate
        end
        for index in eachindex(colors)
    ]
    @test colors == expected_colors
    @test only(filter(signal -> signal["name"] == source * "_Copy", snapshot["signals"]))["color"] != only(filter(signal -> signal["name"] == source, snapshot["signals"]))["color"]
    @test length(snapshot["signals"]) == 17 && snapshot["state_revision"] == 16

    singleton = SA.SignalInventoryService(workspace, SA.SignalColorPalette(["#101010"]))
    state = SA.default_signal_analyser_state()
    source = state.signals[1].name
    repeated = SA.apply_signal_inventory!(singleton, state, SA.DuplicateSignalCommand(0, source))
    @test only(filter(signal -> signal["name"] == source * "_Copy", repeated["signals"]))["color"] == "#101010"
end

@testset "Signals inspector inventory commands are strict, atomic and raw-owned" begin
    workspace = FakeWorkspaceSignalSource(Dict{String,Any}(
        "vector" => [1.0, 2.0, 3.0],
        "matrix" => [1.0 10.0; 2.0 20.0; 3.0 30.0],
        "timed" => (time = [0.0, 0.25, 0.5], value = ComplexF64[1 + 2im, 3 + 4im, 5 + 6im]),
        "one" => [1.0],
        "nonfinite" => [1.0, Inf],
    ), nothing)
    service = SA.SignalInventoryService(workspace)
    state = SA.test_state_with_complex_signal()
    initial = SA.signal_analyser_snapshot(state)
    first_name, second_name = [signal.name for signal in state.signals]

    imported = SA.apply_signal_inventory!(service, state, SA.ImportWorkspaceSignalCommand(0, "vector", nothing, 20.0))
    imported_name = imported["row_selected_signal"]
    @test imported["state_revision"] == 1
    @test length(imported["signals"]) == length(initial["signals"]) + 1
    @test imported_name == imported["selected_signal"] == imported["analysis_signal"]
    @test imported_name in imported["visible_signals"]
    @test imported["signals"][end]["name"] == imported_name
    @test imported["signals"][end]["sample_rate_hz"] == 20.0
    @test imported["signals"][end]["color"] != initial["signals"][end]["color"]

    source_values = only(filter(signal -> signal.name == imported_name, state.signals)).values
    copied = SA.apply_signal_inventory!(service, state, SA.DuplicateSignalCommand(1, imported_name))
    copy_name = copied["row_selected_signal"]
    copied_values = only(filter(signal -> signal.name == copy_name, state.signals)).values
    @test copied["state_revision"] == 2
    @test copy_name == imported_name * "_Copy"
    @test copied_values == source_values && copied_values !== source_values
    @test only(filter(signal -> signal["name"] == copy_name, copied["signals"]))["color"] != only(filter(signal -> signal["name"] == imported_name, copied["signals"]))["color"]
    copied_values[1] = 99 + 0im
    @test source_values[1] == 1 + 0im
    copied_again = SA.apply_signal_inventory!(service, state, SA.DuplicateSignalCommand(2, imported_name))
    @test copied_again["row_selected_signal"] == imported_name * "_Copy2" && copied_again["state_revision"] == 3

    matrix = SA.apply_signal_inventory!(service, state, SA.ImportWorkspaceSignalCommand(3, "matrix", "matrix import", 4.0))
    matrix_names = [signal["name"] for signal in matrix["signals"] if startswith(signal["name"], "matrix import")]
    @test matrix["state_revision"] == 4 && length(matrix_names) == 2 && length(unique(matrix_names)) == 2
    @test all(name -> name in matrix["visible_signals"], matrix_names)
    @test all(signal -> signal["sample_rate_hz"] == 4.0, filter(signal -> signal["name"] in matrix_names, matrix["signals"]))

    timed = SA.apply_signal_inventory!(service, state, SA.ImportWorkspaceSignalCommand(4, "timed", nothing, nothing))
    timed_signal = only(filter(signal -> signal["name"] == timed["row_selected_signal"], timed["signals"]))
    @test timed["state_revision"] == 5 && timed_signal["sample_rate_hz"] == 4.0
    @test only(filter(signal -> signal.name == timed_signal["name"], state.signals)).is_complex

    before_invalid = SA.signal_analyser_snapshot(state)
    for command in (
        SA.ImportWorkspaceSignalCommand(5, "one", nothing, 1.0),
        SA.ImportWorkspaceSignalCommand(5, "nonfinite", nothing, 1.0),
        SA.ImportWorkspaceSignalCommand(5, "vector", nothing, nothing),
    )
        @test_throws SA.SignalAnalyserValidationError SA.apply_signal_inventory!(service, state, command)
        @test SA.signal_analyser_snapshot(state) == before_invalid
    end
    @test_throws ArgumentError SA.ImportWorkspaceSignalCommand(5, "vector", "   ", 1.0)
    workspace.failure = ArgumentError("workspace receive failure")
    @test_throws ArgumentError SA.apply_signal_inventory!(service, state, SA.ImportWorkspaceSignalCommand(5, "vector", nothing, 1.0))
    @test SA.signal_analyser_snapshot(state) == before_invalid
    workspace.failure = nothing

    active_two = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 5, "operation" => "create"))
    selected_one = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 6, "operation" => "select", "display_id" => "display-1"))
    deleted = SA.apply_signal_inventory!(service, state, SA.DeleteSignalCommand(7, imported_name))
    @test deleted["state_revision"] == 8 && !(imported_name in [signal["name"] for signal in deleted["signals"]])
    @test all(display -> !(imported_name in display["visible_signals"]) && display["analysis_signal"] != imported_name, deleted["displays"])
    @test deleted["active_display_id"] == selected_one["active_display_id"]

    complex_state = SA.SignalAnalyserState([SA.AnalysedSignal("complex-roi", "#111111", 10.0, ComplexF64[1 + 2im, 3 + 4im, 5 + 6im], true, true)], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "complex-roi"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    SA.apply_signal_analyser_layout!(complex_state, Dict(
        "state_revision" => 0,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => ["complex-roi"],
    ); lightweight = true)
    settings_service = SA.SignalSettingsService()
    time_draft = SA.apply_signal_setting!(settings_service, complex_state, Dict(
        "state_revision" => complex_state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.x_limits", "value" => Dict("min" => 0.1, "max" => 0.2),
    ))
    time_applied = SA.apply_signal_settings!(settings_service, complex_state, Dict(
        "state_revision" => time_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test time_applied["success"] === true
    extracted = SA.apply_signal_inventory!(service, complex_state, SA.ExtractTimeLimitsSignalCommand(time_applied["state_revision"], "display-1"))
    extract_name = extracted["row_selected_signal"]
    extract = only(filter(signal -> signal.name == extract_name, complex_state.signals))
    @test extracted["state_revision"] == 4 && extract.is_complex && extract.sample_rate_hz == 10.0 && extract.values == ComplexF64[3 + 4im, 5 + 6im]

    singleton = SA.SignalAnalyserState([SA.AnalysedSignal("only", "#111111", 10.0, ComplexF64[1, 2], false, true)], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "only"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    before_last = SA.signal_analyser_snapshot(singleton)
    @test_throws SA.SignalAnalyserValidationError SA.apply_signal_inventory!(service, singleton, SA.DeleteSignalCommand(0, "only"))
    @test SA.signal_analyser_snapshot(singleton) == before_last
end

@testset "Cascade 23 active-view-only Persistence materialization" begin
    empty_persistence_wire(snapshot) = begin
        plot = snapshot["plots"]["persistence"]
        payload = snapshot["plot_payload"]["persistence"]
        source = only(filter(signal -> signal["name"] == payload["signal"], snapshot["signals"]))
        @test Set(keys(plot)) == Set(["type", "x", "y", "z", "x_label", "y_label", "color_label", "density_limits"])
        @test Set(keys(payload)) == Set(["type", "x", "y", "z", "x_label", "y_label", "color_label", "density_limits", "signal", "name", "color"])
        @test plot["type"] == "heatmap"
        @test plot["x_label"] == "Частота, Гц" && plot["y_label"] == "Мощность, дБ" && plot["color_label"] == "Встречаемость, %"
        @test isempty(plot["x"]) && isempty(plot["y"]) && isempty(plot["z"])
        @test isempty(payload["x"]) && isempty(payload["y"]) && isempty(payload["z"])
        @test payload["name"] == payload["signal"] == source["name"]
        @test payload["color"] == source["color"]
        payload
    end
    cache_state(state) = (
        deepcopy(state.plot_cache),
        deepcopy(state.spectrum_cache),
        deepcopy(state.spectrogram_cache),
        deepcopy(state.persistence_cache),
    )

    # Ordinary Time GET is an inactive Persistence view: it must expose the
    # established typed-empty heatmap while leaving the provider/cache cold.
    SA.reset_persistence_double!()
    state = SA.test_state_with_complex_signal()
    first_name, second_name = [signal.name for signal in state.signals]
    bind_active_test_pane!(state)
    initial = SA.signal_analyser_snapshot(state)
    @test initial["active_plot"] == "time"
    @test empty_persistence_wire(initial)["signal"] == first_name
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)
    repeated = SA.signal_analyser_snapshot(state)
    @test empty_persistence_wire(repeated)["signal"] == first_name
    @test repeated == initial # Typed-empty response never depends on cache history.
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)

    # Hidden inactive settings may preserve valid intent but never pay the
    # Persistence provider cost; invalid hidden drafts are covered separately.
    initial_revision = state.view.state_revision
    source_changed = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => initial_revision, "analysis_signal" => second_name,
    ))
    @test source_changed["state_revision"] == initial_revision + 1
    @test empty_persistence_wire(source_changed)["signal"] == second_name
    settings_service = SA.SignalSettingsService()
    leakage_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => source_changed["state_revision"], "display_id" => "display-1",
        "field_id" => "persistence.leakage", "value" => 0.25,
    ))
    leakage_changed = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => leakage_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test leakage_changed["success"] === true
    @test leakage_changed["state_revision"] == source_changed["state_revision"] + 2
    @test haskey(leakage_changed, "settings")
    @test !haskey(leakage_changed, "output")
    leakage_snapshot = SA.signal_analyser_snapshot(state)
    @test leakage_snapshot["persistence_settings"] == Dict("leakage" => 0.25)
    @test leakage_snapshot["displays"][1]["persistence_settings"] == Dict("leakage" => 0.25)
    @test empty_persistence_wire(leakage_snapshot)["signal"] == second_name
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)

    # View navigation only marks the active output pending; it never computes.
    cold = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => leakage_changed["state_revision"], "active_plot" => "persistence",
    ))
    @test cold["state_revision"] == leakage_changed["state_revision"] + 1 && cold["active_plot"] == "persistence"
    @test isempty(SA.PERSISTENCE_CALLS)
    @test isempty(cold["plots"]["persistence"]["x"])
    @test isempty(state.persistence_cache)

    # Source and Apply invalidate only; the active-output endpoint owns DSP.
    active_source = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => cold["state_revision"], "analysis_signal" => first_name,
    ))
    @test active_source["state_revision"] == cold["state_revision"] + 1 && isempty(SA.PERSISTENCE_CALLS)
    active_leakage_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => active_source["state_revision"], "display_id" => "display-1",
        "field_id" => "persistence.leakage", "value" => 0.75,
    ))
    active_leakage = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => active_leakage_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test active_leakage["success"] === true && active_leakage["state_revision"] == active_source["state_revision"] + 2
    @test isempty(SA.PERSISTENCE_CALLS)

    # Leaving and returning remains provider-free until output materialization.
    away = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => active_leakage["state_revision"], "active_plot" => "time",
    ))
    @test away["state_revision"] == active_leakage["state_revision"] + 1
    @test empty_persistence_wire(away)["signal"] == first_name
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)
    warm = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => away["state_revision"], "active_plot" => "persistence",
    ))
    @test warm["state_revision"] == away["state_revision"] + 1 && isempty(warm["plots"]["persistence"]["x"])
    @test isempty(SA.PERSISTENCE_CALLS)

    # A provider failure is not observed before lazy output materialization.
    SA.reset_persistence_double!()
    failing = SA.default_signal_analyser_state()
    before_failure = SA.signal_analyser_snapshot(failing)
    caches_before = cache_state(failing)
    SA.PERSISTENCE_FAILURE[] = true
    caught = try
        SA.apply_signal_analyser_view!(failing, Dict(
            "state_revision" => 0, "active_plot" => "persistence",
        ))
        nothing
    catch err
        err
    end
    SA.PERSISTENCE_FAILURE[] = false
    @test caught === nothing
    @test failing.view.state_revision == 1
    @test failing.view.active_plot == SA.PERSISTENCE_PLOT
    @test cache_state(failing) == caches_before

    # A/B Displays retain distinct intent. A cold Persistence B must not make
    # inactive Time A publish its raw Persistence presentation.
    SA.reset_persistence_double!()
    displays = SA.default_signal_analyser_state()
    bind_active_test_pane!(displays)
    SA.signal_analyser_snapshot(displays)
    created = SA.apply_signal_analyser_display!(displays, Dict(
        "state_revision" => displays.view.state_revision, "operation" => "create",
    ))
    @test created["active_display_id"] == "display-2" && isempty(SA.PERSISTENCE_CALLS)
    active_b = SA.apply_signal_analyser_view!(displays, Dict(
        "state_revision" => created["state_revision"], "active_plot" => "persistence",
    ))
    @test active_b["active_display_id"] == "display-2" && isempty(SA.PERSISTENCE_CALLS)
    selected_a = SA.apply_signal_analyser_display!(displays, Dict(
        "state_revision" => active_b["state_revision"], "operation" => "select", "display_id" => "display-1",
    ))
    @test selected_a["active_plot"] == "time"
    @test empty_persistence_wire(selected_a)["signal"] == first_name
    @test isempty(SA.PERSISTENCE_CALLS)
    returned_b = SA.apply_signal_analyser_display!(displays, Dict(
        "state_revision" => selected_a["state_revision"], "operation" => "select", "display_id" => "display-2",
    ))
    @test returned_b["active_plot"] == "persistence" && isempty(returned_b["plots"]["persistence"]["x"])
    @test isempty(SA.PERSISTENCE_CALLS)

end

@testset "Cascade 15 Spectrogram Frequency Limits typed state, cache and metadata" begin
    auto = SA.AutomaticSignalSpectrumFrequencyLimits()
    explicit = SA.ExplicitSignalSpectrumFrequencyLimits(-2.0, 4.0)
    @test SA.signal_spectrum_frequency_limits_payload(auto) === nothing
    @test SA.signal_spectrum_frequency_limits_payload(explicit) == Dict("min_hz" => -2.0, "max_hz" => 4.0, "units" => "Hz")
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(-0.0, -0.0)
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(NaN, 1.0)

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    state = legacy_bound_default_state()
    settings_service = SA.SignalSettingsService()
    initial = SA.signal_analyser_snapshot(state)
    auto_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test initial["spectrogram_settings"] == auto_settings
    @test initial["plots"]["spectrogram"]["frequency_limits"] == Dict("mode" => "auto", "requested" => nothing,
        "effective" => Dict("min_hz" => 0.0, "max_hz" => state.signals[1].sample_rate_hz / 2, "units" => "Hz"))
    empty!(SA.SPECTRUM_CALLS); empty!(state.spectrum_cache)

    settings_service = SA.SignalSettingsService()
    # The one-field draft boundary rejects malformed API types before mutation.
    @test_throws SA.SignalSettingApiTypeError SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => true,
    ))
    @test SA.signal_analyser_snapshot(state) == initial
    empty!(SA.SPECTRUM_CALLS); empty!(state.spectrum_cache)

    visible_spectrogram = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrogram",
    ))

    limits = Dict("min_hz" => 1.0, "max_hz" => 4.0, "units" => "Hz")
    explicit_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => limits, "frequency_scale" => "linear", "power_limits" => nothing)
    provider_calls_before_apply = (length(SA.SPECTROGRAM_CALLS), length(SA.SPECTRUM_CALLS))
    draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => visible_spectrogram["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => Dict("min" => 1.0, "max" => 4.0),
    ))
    changed = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test changed["success"] === true && changed["state_revision"] == 3
    @test haskey(changed, "settings") && !haskey(changed, "output")
    @test (length(SA.SPECTROGRAM_CALLS), length(SA.SPECTRUM_CALLS)) == provider_calls_before_apply
    @test SA.signal_analyser_snapshot(state)["spectrogram_settings"] == explicit_settings

    # Auto and an explicit full band are distinct provider/cache identities.
    full = Dict("overlap_percent" => 50.0, "leakage" => 0.5,
        "frequency_limits" => Dict("min_hz" => 0.0, "max_hz" => state.signals[1].sample_rate_hz / 2, "units" => "Hz"), "frequency_scale" => "linear", "power_limits" => nothing)
    full_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => changed["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => Dict("min" => 0.0, "max" => state.signals[1].sample_rate_hz / 2),
    ))
    empty!(SA.SPECTROGRAM_CALLS); empty!(SA.SPECTRUM_CALLS)
    full_changed = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => full_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test full_changed["success"] === true && isempty(SA.SPECTROGRAM_CALLS) && isempty(SA.SPECTRUM_CALLS)

    # The domain admits a minimum of two samples; N=2 delegates.
    empty!(SA.SPECTROGRAM_CALLS)
    two = SA.AnalysedSignal("c15-two", "#111111", 10.0, ComplexF64[1, 2], false, true)
    SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), two)
    @test length(SA.SPECTROGRAM_CALLS) == 1

    # Explicit intent is Display-local, survives a valid real→centered-complex source change,
    # and resets atomically when the new authoritative source cannot contain it.
    real = SA.AnalysedSignal("c15-real", "#111111", 100.0, ComplexF64[1, 2, 3], false, true)
    complex = SA.AnalysedSignal("c15-complex", "#222222", 100.0, ComplexF64[1 + im, 2 + im, 3 + im], true, true)
    narrow = SA.AnalysedSignal("c15-narrow", "#333333", 10.0, ComplexF64[1, 2, 3], false, true)
    transitions = SA.SignalAnalyserState([real, complex, narrow], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, real.name), Dict{String,Dict{String,Any}}(), ReentrantLock())
    legacy_bind_active_test_pane!(transitions)
    complex_limits = Dict("min_hz" => 10.0, "max_hz" => 20.0, "units" => "Hz")
    c15_explicit = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => complex_limits, "frequency_scale" => "linear", "power_limits" => nothing)
    transitions_service = SA.SignalSettingsService()
    transition_view = SA.apply_signal_analyser_view!(transitions, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrogram",
    ))
    transition_draft = SA.apply_signal_setting!(transitions_service, transitions, Dict(
        "state_revision" => transition_view["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrogram.frequency_limits", "value" => Dict("min" => 10.0, "max" => 20.0),
    ))
    first = SA.apply_signal_settings!(transitions_service, transitions, Dict(
        "state_revision" => transition_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test first["success"] === true
    centered = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => first["state_revision"], "analysis_signal" => complex.name))
    @test centered["spectrogram_settings"] == c15_explicit
    @test centered["plots"]["spectrogram"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => complex_limits, "effective" => complex_limits)
    reset = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => centered["state_revision"], "analysis_signal" => narrow.name))
    @test reset["spectrogram_settings"]["frequency_limits"] === nothing
    @test reset["plots"]["spectrogram"]["frequency_limits"]["mode"] == "auto"
    empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
end

struct InvalidSpectrogramProvider <: SA.AbstractSignalSpectrogramProvider
    data::SA.SignalSpectrogramData
end
SA.signal_spectrogram_calculate(provider::InvalidSpectrogramProvider, query::SA.SignalSpectrogramQuery) = provider.data

struct WrongTopologyPersistenceProvider <: SA.AbstractSignalPersistenceProvider end
function SA.signal_persistence_calculate(::WrongTopologyPersistenceProvider, query::SA.SignalPersistenceQuery)
    powers = collect(range(0.01, 1.0, length = query.num_power_bins))
    # The datum itself is valid; only its declared topology is incompatible
    # with the query and must be rejected before cache/snapshot publication.
    SA.SignalPersistenceData([0.0, query.sample_rate_hz / 2], powers,
        zeros(Float64, query.num_power_bins, 2), SA.CENTERED_TWO_SIDED_SPECTRUM)
end

@testset "Cascade 23 cold aggregate, lifecycle and plan audit" begin
    caches(state) = (
        deepcopy(state.plot_cache),
        deepcopy(state.spectrum_cache),
        deepcopy(state.spectrogram_cache),
        deepcopy(state.persistence_cache),
    )

    # Navigation is deliberately not output materialization.
    SA.reset_persistence_double!(); SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    cold = SA.default_signal_analyser_state()
    @test isempty(cold.spectrum_cache) && isempty(cold.spectrogram_cache) && isempty(cold.persistence_cache)
    cold_snapshot = SA.apply_signal_analyser_view!(cold, Dict(
        "state_revision" => 0, "active_plot" => "persistence",
    ))
    @test cold_snapshot["state_revision"] == 1 && cold_snapshot["active_plot"] == "persistence"
    @test isempty(SA.PERSISTENCE_CALLS)
    @test isempty(cold.spectrum_cache) && isempty(cold.spectrogram_cache) && isempty(cold.persistence_cache)

    # A typed provider failure is deferred until materialization.
    invalid = SA.default_signal_analyser_state(persistence_provider = WrongTopologyPersistenceProvider())
    display_before = SA.signal_analyser_display_payload(SA.signal_analyser_active_display(invalid))
    caches_before = caches(invalid)
    invalid_error = try
        SA.apply_signal_analyser_view!(invalid, Dict(
            "state_revision" => 0, "active_plot" => "persistence",
        ))
        nothing
    catch caught
        caught
    end
    @test invalid_error === nothing
    @test invalid.view.state_revision == 1
    @test isempty(invalid.persistence_cache)

    # Clear/re-add and display lifecycle stay provider-free before output GET.
    SA.reset_persistence_double!()
    lifecycle = legacy_bound_default_state()
    first_name = lifecycle.signals[1].name
    active = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 0, "active_plot" => "persistence",
    ))
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(active["plots"]["persistence"]["x"])
    cleared = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 1, "visible_signals" => String[],
    ))
    @test cleared["analysis_signal"] === nothing && isempty(cleared["plots"]["persistence"]["x"])
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(lifecycle.persistence_cache)
    readded = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => 2, "visible_signals" => [first_name], "analysis_signal" => first_name,
    ))
    @test readded["active_plot"] == "persistence" && isempty(readded["plots"]["persistence"]["x"])
    @test isempty(SA.PERSISTENCE_CALLS)
    created = SA.apply_signal_analyser_display!(lifecycle, Dict(
        "state_revision" => 3, "operation" => "create",
    ))
    @test created["active_display_id"] == "display-2" && created["active_plot"] == "time"
    restored = SA.apply_signal_analyser_display!(lifecycle, Dict(
        "state_revision" => 4, "operation" => "select", "display_id" => "display-1",
    ))
    @test restored["active_plot"] == "persistence"
    closed = SA.apply_signal_analyser_display!(lifecycle, Dict(
        "state_revision" => 5, "operation" => "close", "display_id" => "display-1",
    ))
    @test closed["active_display_id"] == "display-2" && closed["active_plot"] == "time"
    @test isempty(closed["plots"]["persistence"]["x"]) && isempty(SA.PERSISTENCE_CALLS)

    # The domain admits a minimum of two samples. Preparation delegates the
    # smallest valid signal but does not publish it into the state cache.
    SA.reset_persistence_double!()
    short_state = SA.default_signal_analyser_state()
    short_signal = SA.AnalysedSignal("c23-plan-short", "#333333", 10.0, ComplexF64[1, 2], false, true)
    short_display = SA.signal_analyser_active_display(short_state)
    short_display.active_plot = SA.PERSISTENCE_PLOT
    plan = SA.SignalAnalyserPersistencePreparationPlan(short_display, short_signal)
    @test SA.signal_analyser_persistence_required(plan)
    prepared = SA.signal_analyser_prepared_persistences(short_state, short_display, short_signal)
    @test length(prepared) == 1
    @test isempty(short_state.persistence_cache)
    @test length(SA.PERSISTENCE_CALLS) == 1
    @test only(SA.PERSISTENCE_CALLS).sample_rate_hz == 10.0
    @test length(only(SA.PERSISTENCE_CALLS).values) == 2
end

@testset "Cascade 19 Persistence Leakage typed defaults" begin
    default = SA.SignalPersistenceSettings()
    @test default.leakage == 0.5
    @test copy(default) === default
    zero = SA.SignalPersistenceSettings(-0.0)
    @test zero.leakage == 0.0 && !signbit(zero.leakage)
    @test SA.SignalPersistenceSettings(0.0) == zero
    @test hash(SA.SignalPersistenceSettings(0.0)) == hash(zero)
    @test SA.SignalPersistenceSettings(1.0).leakage == 1.0
    for value in (true, NaN, Inf, -0.1, 1.1)
        @test_throws ArgumentError SA.SignalPersistenceSettings(value)
    end
    base = SA.SignalPersistenceQuery("c19", ComplexF64[1, 2], 10.0, SA.ONE_SIDED_SPECTRUM)
    changed = SA.SignalPersistenceQuery("c19", ComplexF64[1, 2], 10.0, SA.ONE_SIDED_SPECTRUM, 256, 1.0)
    @test base.leakage == 0.5 && changed.leakage == 1.0
    @test SA.SignalPersistenceCacheKey(base) != SA.SignalPersistenceCacheKey(changed)
end

@testset "Cascade 19 Persistence Leakage lifecycle and cache identity" begin
    SA.reset_pspectrum_double!(); SA.reset_persistence_double!()
    state = SA.default_signal_analyser_state()
    SA.signal_analyser_snapshot(state)
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)
    settings_service = SA.SignalSettingsService()
    draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "persistence.leakage", "value" => 1.0,
    ))
    changed = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test changed["success"] === true && changed["state_revision"] == 2
    changed_snapshot = SA.signal_analyser_snapshot(state)
    @test changed_snapshot["persistence_settings"] == Dict("leakage" => 1.0)
    @test isempty(SA.PERSISTENCE_CALLS) && isempty(state.persistence_cache)
    equal = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => changed["state_revision"], "display_id" => "display-1",
        "field_id" => "persistence.leakage", "value" => 1.0,
    ))
    @test equal["state"]["state_revision"] == changed["state_revision"] && isempty(SA.PERSISTENCE_CALLS)
    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => changed["state_revision"], "operation" => "create"))
    @test created["persistence_settings"] == Dict("leakage" => 0.5) && isempty(SA.PERSISTENCE_CALLS)
    back_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => created["state_revision"], "operation" => "select", "display_id" => "display-1"))
    @test back_a["persistence_settings"] == Dict("leakage" => 1.0) && isempty(SA.PERSISTENCE_CALLS)
    SA.reset_pspectrum_double!(); SA.reset_persistence_double!()
end

@testset "Cascade 18 typed Persistence provider, presentation and cache foundation" begin
    values = ComplexF64[1, 2, 3]
    query = SA.SignalPersistenceQuery("persistence-copy", values, 100.0, SA.ONE_SIDED_SPECTRUM)
    @test query.num_power_bins == SA.SIGNAL_PERSISTENCE_DEFAULT_NUM_POWER_BINS == 256
    values[1] = 999 + 0im
    @test query.values[1] == 1 + 0im
    same_key = SA.SignalPersistenceCacheKey(query)
    @test same_key == SA.SignalPersistenceCacheKey("persistence-copy", 100.0, 3, SA.ONE_SIDED_SPECTRUM, 256)
    @test hash(same_key) == hash(SA.SignalPersistenceCacheKey(query))
    @test same_key != SA.SignalPersistenceCacheKey("persistence-copy", 100.0, 3, SA.CENTERED_TWO_SIDED_SPECTRUM, 256)
    @test same_key != SA.SignalPersistenceCacheKey("other", 100.0, 3, SA.ONE_SIDED_SPECTRUM, 256)
    @test same_key != SA.SignalPersistenceCacheKey("persistence-copy", 100.0, 3, SA.ONE_SIDED_SPECTRUM, 128)
    for invalid in (
        () -> SA.SignalPersistenceQuery("", ComplexF64[1, 2], 1.0, SA.ONE_SIDED_SPECTRUM),
        () -> SA.SignalPersistenceQuery("bad", ComplexF64[1, ComplexF64(NaN, 0)], 1.0, SA.ONE_SIDED_SPECTRUM),
        () -> SA.SignalPersistenceQuery("bad", ComplexF64[1, 2], true, SA.ONE_SIDED_SPECTRUM),
        () -> SA.SignalPersistenceQuery("bad", ComplexF64[1, 2], Inf, SA.ONE_SIDED_SPECTRUM),
        () -> SA.SignalPersistenceQuery("bad", ComplexF64[1, 2], 1.0, SA.ONE_SIDED_SPECTRUM, 0),
        () -> SA.SignalPersistenceCacheKey("bad", 1.0, -1, SA.ONE_SIDED_SPECTRUM, 256),
        () -> SA.SignalPersistenceCacheKey("bad", 1.0, 2, SA.ONE_SIDED_SPECTRUM, true),
    )
        @test_throws ArgumentError invalid()
    end
    @test_throws DimensionMismatch SA.SignalPersistenceData([0.0, 1.0], [0.1, 1.0], [0.0 1.0; 2.0 3.0; 4.0 5.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalPersistenceData([0.0, 0.0], [0.1, 1.0], [0.0 1.0; 2.0 3.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalPersistenceData([0.0, 1.0], [0.0, 1.0], [0.0 1.0; 2.0 3.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalPersistenceData([0.0, 1.0], [0.1, 1.0], [0.0 101.0; 2.0 3.0], SA.ONE_SIDED_SPECTRUM)

    SA.reset_persistence_double!()
    real = SA.AnalysedSignal("c18-real", "#111111", 100.0, ComplexF64[1, 2, 3], false, true)
    complex = SA.AnalysedSignal("c18-complex", "#222222", 100.0, ComplexF64[1 + im, 2 + im, 3 + im], true, true)
    real_data = SA.signal_persistence_data(SA.SignalPersistenceService(), real)
    complex_data = SA.signal_persistence_data(SA.SignalPersistenceService(), complex)
    @test length(SA.PERSISTENCE_CALLS) == 2
    @test SA.PERSISTENCE_CALLS[1].topology == SA.ONE_SIDED_SPECTRUM && SA.PERSISTENCE_CALLS[1].num_power_bins == 256
    @test SA.PERSISTENCE_CALLS[2].topology == SA.CENTERED_TWO_SIDED_SPECTRUM && SA.PERSISTENCE_CALLS[2].num_power_bins == 256
    @test real_data.frequencies_hz == (0.0, 25.0, 50.0)
    @test complex_data.frequencies_hz == (-50.0, 0.0, 50.0)
    @test size(real_data.occurrence_percent) == (256, 3) && all(value -> 0.0 <= value <= 100.0, real_data.occurrence_percent)
    # This small raw typed datum proves exact dB conversion happens before the
    # 160×160 presentation bound (which does not alter a 2×3 matrix).
    rendered = SA.signal_analyser_persistence_plot(SA.SignalPersistenceData(
        [0.0, 25.0, 50.0], [0.01, 0.1], [0.0 25.0 50.0; 75.0 90.0 100.0], SA.ONE_SIDED_SPECTRUM,
    ))
    @test rendered["x"] == [0.0, 25.0, 50.0]
    @test rendered["y"] == 10 .* log10.([0.01, 0.1])
    @test rendered["z"] == [[0.0, 25.0, 50.0], [75.0, 90.0, 100.0]]
    @test rendered["x_label"] == "Частота, Гц" && rendered["y_label"] == "Мощность, дБ" && rendered["color_label"] == "Встречаемость, %"
    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS); SA.reset_persistence_double!()
end

function SA.signal_peaks_detect(provider::FakePeaksProvider, query::SA.SignalPeaksQuery)
    push!(provider.calls, query)
    isnothing(provider.failure) || throw(provider.failure)
    provider.result
end

function assert_line_plot(plot)
    @test plot["type"] == "line"
    @test length(plot["x"]) == length(plot["y"])
    @test SA.all_finite(plot["x"])
    @test SA.all_finite(plot["y"])
end

function assert_heatmap_plot(plot; persistence::Bool = false)
    @test plot["type"] == "heatmap"
    @test length(plot["z"]) == length(plot["y"])
    @test all(row -> length(row) == length(plot["x"]), plot["z"])
    @test SA.all_finite(plot["x"])
    @test SA.all_finite(plot["y"])
    @test SA.all_finite_matrix(plot["z"])
    persistence && @test all(value -> 0.0 <= value <= 100.0, Iterators.flatten(plot["z"]))
end

function assert_trace(trace, signal_name, color; component = nothing)
    @test trace["type"] == "line"
    @test trace["signal"] == signal_name
    @test trace["name"] == (component === nothing ? signal_name : "$(signal_name) ($(uppercasefirst(component)))")
    component === nothing || @test trace["component"] == component
    @test trace["color"] == color
    @test length(trace["x"]) == length(trace["y"])
    @test SA.all_finite(trace["x"])
    @test SA.all_finite(trace["y"])
end

function assert_visibility(snapshot, visible_names, analysis_name)
    @test snapshot["visible_signals"] == visible_names
    @test snapshot["analysis_signal"] == analysis_name
    @test snapshot["selected_signal"] == analysis_name
    @test snapshot["plot_payload"]["visible_signals"] == visible_names
    @test snapshot["plot_payload"]["selected_signal"] == analysis_name
end

function p0_measurement_state()
    real_values = fill(ComplexF64(2.0, 9.0), 1100)
    real_values[1026] = 25.0 + 0.0im
    real_values[1071] = 25.0 + 0.0im
    real_values[1051] = -30.0 + 0.0im
    real_values[1100] = -30.0 + 0.0im
    complex_values = fill(ComplexF64(6.0, 8.0), 1100)
    complex_values[1026] = 8.0 + 15.0im
    complex_values[1071] = 8.0 + 15.0im
    complex_values[1051] = 1.0 + 0.0im
    complex_values[1100] = 1.0 + 0.0im
    signals = SA.AnalysedSignal[
        SA.AnalysedSignal("raw-real", "#111111", 1000.0, real_values, false, true),
        SA.AnalysedSignal("raw-complex", "#222222", 1000.0, complex_values, true, true),
    ]
    SA.SignalAnalyserState(signals, SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "raw-real"), Dict{String,Dict{String,Any}}(), ReentrantLock())
end

function raw_measurement_items(signal)
    values = signal.is_complex ? abs.(signal.values) : real.(signal.values)
    ordinate = Float64.(values)
    minimum_index = findfirst(value -> value == minimum(ordinate), ordinate) - 1
    maximum_index = findfirst(value -> value == maximum(ordinate), ordinate) - 1
    expected = Dict(
        "minimum" => Dict("id" => "minimum", "label" => "Минимум", "value" => ordinate[minimum_index + 1], "time_s" => minimum_index / signal.sample_rate_hz, "sample_index" => minimum_index),
        "maximum" => Dict("id" => "maximum", "label" => "Максимум", "value" => ordinate[maximum_index + 1], "time_s" => maximum_index / signal.sample_rate_hz, "sample_index" => maximum_index),
        "mean" => Dict("id" => "mean", "label" => "Среднее", "value" => sum(ordinate) / length(ordinate), "time_s" => nothing, "sample_index" => nothing),
    )
    [expected["minimum"], expected["maximum"], expected["mean"]]
end

function assert_p0_snapshot_measurements(snapshot, signal)
    @test haskey(snapshot, "measurements")
    haskey(snapshot, "measurements") || return
    payload = get(snapshot, "measurements", Dict{String,Any}())
    @test Set(keys(payload)) == Set(["state_revision", "signal_name", "ordinate", "units", "items"])
    @test payload["state_revision"] == snapshot["state_revision"]
    @test payload["signal_name"] == signal.name == snapshot["selected_signal"]
    @test payload["ordinate"] == (signal.is_complex ? "magnitude" : "real")
    @test payload["units"] == Dict("time" => "s", "value" => "1")
    @test payload["items"] == raw_measurement_items(signal)
    @test payload["items"][3]["time_s"] === nothing
    @test payload["items"][3]["sample_index"] === nothing
end

@testset "Signal Analyser snapshot and cache" begin
    SA.reset_pspectrum_double!()
    state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(state)
    snapshot = SA.signal_analyser_snapshot(state)

    @test SA.snapshot_keyset(snapshot) == Set(["state_revision", "active_display_id", "displays", "active_plot", "row_selected_signal", "analysis_signal", "selected_signal", "visible_signals", "time_limits", "measurement_kinds", "spectrum_settings", "spectrogram_settings", "persistence_settings", "signals", "plots", "plot_payload", "measurements", "measurement_rows", "peaks", "panel"])
    @test snapshot["active_display_id"] == "display-1"
    @test snapshot["displays"] == [Dict(
        "id" => "display-1",
        "name" => "Display 1",
        "active_plot" => "time",
        "analysis_signal" => "Гармонический сигнал",
        "selected_signal" => "Гармонический сигнал",
        "visible_signals" => ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"],
        "time_limits" => Dict("min_s" => 0.0, "max_s" => 511 / 2048, "units" => "s"),
        "measurement_kinds" => ["minimum", "maximum", "mean"],
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing),
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        "persistence_settings" => Dict("leakage" => 0.5),
        "peaks_enabled" => false,
    )]
    @test snapshot["state_revision"] == 0
    @test snapshot["active_plot"] == "time"
    @test snapshot["row_selected_signal"] == "Гармонический сигнал"
    @test snapshot["analysis_signal"] == "Гармонический сигнал"
    @test snapshot["time_limits"] == Dict("min_s" => 0.0, "max_s" => 511 / 2048, "units" => "s")
    @test snapshot["measurement_kinds"] == ["minimum", "maximum", "mean"]
    @test snapshot["selected_signal"] == "Гармонический сигнал"
    @test snapshot["visible_signals"] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    @test [signal["name"] for signal in snapshot["signals"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    @test [signal["color"] for signal in snapshot["signals"]] == ["#2563eb", "#dc2626"]
    @test [signal["sample_rate_hz"] for signal in snapshot["signals"]] == [2048.0, 2048.0]
    @test [signal["sample_count"] for signal in snapshot["signals"]] == [512, 512]
    @test all(signal -> signal["duration_s"] == 511 / 2048, snapshot["signals"])
    @test [signal["data_type"] for signal in snapshot["signals"]] == ["Вещественный", "Комплексный"]
    @test all(signal -> signal["visible"] === true, snapshot["signals"])

    @test Set(keys(snapshot["plots"])) == Set(["time", "spectrum", "spectrogram", "persistence"])
    assert_line_plot(snapshot["plots"]["time"])
    assert_line_plot(snapshot["plots"]["spectrum"])
    @test snapshot["plots"]["spectrum"]["method"] == "pspectrum"
    assert_heatmap_plot(snapshot["plots"]["spectrogram"])
    @test snapshot["plots"]["persistence"]["type"] == "heatmap"
    @test isempty(snapshot["plots"]["persistence"]["x"])
    @test isempty(snapshot["plots"]["persistence"]["y"])
    @test isempty(snapshot["plots"]["persistence"]["z"])
    @test Set(keys(snapshot["plot_payload"])) == Set(["selected_signal", "visible_signals", "time_traces", "spectrum_traces", "spectrogram", "persistence"])
    @test [trace["name"] for trace in snapshot["plot_payload"]["time_traces"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал (Real)", "Комплексный ЛЧМ-сигнал (Imaginary)"]
    @test [trace["name"] for trace in snapshot["plot_payload"]["spectrum_traces"]] == ["Гармонический сигнал", "Комплексный ЛЧМ-сигнал"]
    assert_trace(snapshot["plot_payload"]["time_traces"][1], "Гармонический сигнал", "#2563eb")
    assert_trace(snapshot["plot_payload"]["time_traces"][2], "Комплексный ЛЧМ-сигнал", "#dc2626"; component = "real")
    assert_trace(snapshot["plot_payload"]["time_traces"][3], "Комплексный ЛЧМ-сигнал", "#dc2626"; component = "imaginary")
    assert_trace(snapshot["plot_payload"]["spectrum_traces"][1], "Гармонический сигнал", "#2563eb")
    assert_trace(snapshot["plot_payload"]["spectrum_traces"][2], "Комплексный ЛЧМ-сигнал", "#dc2626")
    @test snapshot["plots"]["time"]["x"] == snapshot["plot_payload"]["time_traces"][1]["x"]
    @test snapshot["plots"]["time"]["y"] == snapshot["plot_payload"]["time_traces"][1]["y"]
    @test snapshot["plots"]["spectrum"]["x"] == snapshot["plot_payload"]["spectrum_traces"][1]["x"]
    @test snapshot["plots"]["spectrum"]["y"] == snapshot["plot_payload"]["spectrum_traces"][1]["y"]
    @test snapshot["plot_payload"]["spectrogram"]["signal"] == "Гармонический сигнал"
    @test snapshot["plot_payload"]["persistence"]["signal"] == "Гармонический сигнал"
    assert_p0_snapshot_measurements(snapshot, state.signals[1])
    @test isempty(SA.SPECTRUM_CALLS)
    @test all(query -> query.leakage == 0.5, SA.SPECTRUM_CALLS)

    # Heavy output is requested only by the active-output boundary, never by
    # the lightweight view snapshot above.
    active_pane_id = state.display_layouts["display-1"].active_pane_id
    materialized = SA.signal_analyser_active_output(state, "display-1", active_pane_id)
    @test get(materialized, "success", true) === true || get(materialized, "isready", false) === false
    # The active-output boundary may have scheduled publication.  Settle that
    # task before using a revision for the unrelated view mutation below;
    # snapshots themselves must remain cache-only and never materialize DSP.
    active_task = state.output_manager.active_task
    active_task === nothing || wait(active_task)

    SA.signal_analyser_snapshot(state)
    @test isempty(SA.SPECTRUM_CALLS)

    second_name = snapshot["signals"][2]["name"]
    authoritative_revision = state.view.state_revision
    second_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => authoritative_revision, "selected_signal" => second_name))
    @test second_snapshot["state_revision"] == state.view.state_revision
    @test second_snapshot["selected_signal"] == second_name
    @test second_snapshot["plot_payload"]["spectrogram"]["signal"] == second_name
    @test second_snapshot["plot_payload"]["persistence"]["signal"] == second_name
    @test SA.all_finite(second_snapshot["plots"]["time"]["y"])
    @test any(
        trace -> second_snapshot["plots"]["spectrum"]["y"] == trace["y"],
        second_snapshot["plot_payload"]["spectrum_traces"],
    )
    assert_p0_snapshot_measurements(second_snapshot, state.signals[2])
    @test isempty(SA.SPECTRUM_CALLS)
    assert_heatmap_plot(second_snapshot["plots"]["spectrogram"])

    SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrum"))
    @test isempty(SA.SPECTRUM_CALLS)
    no_op = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrum", "selected_signal" => second_name))
    @test no_op["state_revision"] == state.view.state_revision
end

@testset "Signal Analyser Peaks use an injected provider over full raw samples" begin
    fake = FakePeaksProvider(
        SA.SignalPeaksQuery[],
        SA.SignalPeaksProviderResult([7.0, 11.0], [2, 1051], [1.5, 2.0], [4.0, 6.0], 1100),
        nothing,
    )
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = fake)
    legacy_bind_active_test_pane!(state)
    disabled = SA.signal_analyser_snapshot(state)
    @test isempty(fake.calls)
    @test disabled["peaks"] == Dict("enabled" => false, "mode" => "maxima", "state_revision" => 0, "display_id" => "display-1", "signal_name" => "raw-real", "ordinate" => "real", "units" => Dict("value" => "1", "time" => "s", "width" => "samples", "prominence" => "1"), "items" => Any[])

    enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test isempty(fake.calls)
    @test enabled["peaks"]["enabled"] === true
    @test enabled["peaks"]["items"] == Any[]
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test output["success"] === true && output["isready"] === true
    @test isempty(fake.calls)
    SA.signal_analyser_calculate_active_peaks!(state, "display-1", pane_id;
        expected_state_revision = state.view.state_revision)
    peaks_task = state.output_manager.active_task
    peaks_task === nothing || wait(peaks_task)
    peaks = SA.signal_analyser_active_peaks(state, "display-1", pane_id)
    @test peaks["success"] === true && peaks["isready"] === true
    pane_bindings = SA.signal_display_pane_members(state.display_layouts["display-1"].panes[1])
    @test [query.signal_name for query in fake.calls] == pane_bindings
    @test length(fake.calls) == length(pane_bindings) == 2
    for query in fake.calls
        signal = only(filter(candidate -> candidate.name == query.signal_name, state.signals))
        @test length(query.values) == length(signal.values) == 1100
        @test query.ordinate == SA.signal_measurement_ordinate(signal)
    end
    @test length(enabled["plots"]["time"]["y"]) <= 1024
    cached = SA.signal_analyser_snapshot(state)
    @test cached["peaks"]["enabled"] === true
    @test cached["peaks"]["state_revision"] == cached["state_revision"]
    @test cached["peaks"]["signal_name"] == first(pane_bindings)
    @test cached["peaks"]["items"] == [
        Dict("id" => "peak-1", "type" => "maximum", "value" => 7.0, "sample_index" => 1, "time_s" => 0.001, "width_samples" => 1.5, "prominence" => 4.0),
        Dict("id" => "peak-1050", "type" => "maximum", "value" => 11.0, "sample_index" => 1050, "time_s" => 1.05, "width_samples" => 2.0, "prominence" => 6.0),
    ]
    @test enabled["displays"][1]["peaks_enabled"] === true

    disabled_again = SA.apply_signal_analyser_view!(state, Dict("state_revision" => cached["state_revision"], "active_plot" => "spectrum"))
    @test disabled_again["peaks"]["enabled"] === false
    @test disabled_again["displays"][1]["peaks_enabled"] === false
    @test length(fake.calls) == length(pane_bindings)
end

@testset "Signal Analyser Display pages keep independent view state" begin
    SA.reset_pspectrum_double!()
    state = SA.test_state_with_complex_signal()
    first_name, second_name = [signal.name for signal in state.signals]
    legacy_bind_active_test_pane!(state)

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    @test created["state_revision"] == 1
    @test created["active_display_id"] == "display-2"
    @test [display["id"] for display in created["displays"]] == ["display-1", "display-2"]
    @test created["displays"][2] == Dict(
        "id" => "display-2",
        "name" => "Display 2",
        "active_plot" => "time",
        "analysis_signal" => nothing,
        "selected_signal" => nothing,
        "visible_signals" => String[],
        "time_limits" => nothing,
        "measurement_kinds" => ["minimum", "maximum", "mean"],
        "spectrum_settings" => Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing),
        "spectrogram_settings" => Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing),
        "persistence_settings" => Dict("leakage" => 0.5),
        "peaks_enabled" => false,
    )

    configured_second = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1,
        "active_plot" => "spectrum",
        "selected_signal" => second_name,
        "visible_signals" => [second_name],
    ))
    @test configured_second["state_revision"] == 2
    @test configured_second["active_display_id"] == "display-2"
    @test configured_second["active_plot"] == "spectrum"
    @test configured_second["visible_signals"] == [second_name]
    assert_p0_snapshot_measurements(configured_second, state.signals[2])

    selected_first = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 2,
        "operation" => "select",
        "display_id" => "display-1",
    ))
    @test selected_first["state_revision"] == 3
    @test selected_first["active_display_id"] == "display-1"
    @test selected_first["active_plot"] == "time"
    @test selected_first["selected_signal"] == first_name
    @test selected_first["visible_signals"] == [first_name, second_name]
    assert_p0_snapshot_measurements(selected_first, state.signals[1])

    restored_second = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 3,
        "operation" => "select",
        "display_id" => "display-2",
    ))
    @test restored_second["state_revision"] == 4
    @test restored_second["active_display_id"] == "display-2"
    @test restored_second["active_plot"] == "spectrum"
    @test restored_second["selected_signal"] == second_name
    @test restored_second["visible_signals"] == [second_name]
    @test [trace["name"] for trace in restored_second["plot_payload"]["time_traces"]] == ["$(second_name) (Real)", "$(second_name) (Imaginary)"]
    assert_p0_snapshot_measurements(restored_second, state.signals[2])
end

@testset "Signal Analyser Display page lifecycle is revision-safe and atomic" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    initial = SA.signal_analyser_snapshot(state)

    for invalid_payload in (
        Dict{String,Any}(),
        Dict("state_revision" => 0.0, "operation" => "create"),
        Dict("state_revision" => true, "operation" => "create"),
        Dict("state_revision" => 0, "operation" => "unknown"),
        Dict("state_revision" => 0, "operation" => "create", "display_id" => "display-1"),
        Dict("state_revision" => 0, "operation" => "select"),
        Dict("state_revision" => 0, "operation" => "close", "display_id" => "missing"),
        Dict("state_revision" => 0, "operation" => "create", "extra" => true),
    )
        err = try
            SA.apply_signal_analyser_display!(state, invalid_payload)
            nothing
        catch caught
            caught
        end
        @test err isa SA.SignalAnalyserValidationError
        @test !isempty(err.fields)
        @test SA.signal_analyser_snapshot(state) == initial
    end

    cannot_close_last = try
        SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "close", "display_id" => "display-1"))
        nothing
    catch caught
        caught
    end
    @test cannot_close_last isa SA.SignalAnalyserValidationError
    @test haskey(cannot_close_last.fields, "operation")
    @test SA.signal_analyser_snapshot(state) == initial

    first_created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    stale = try
        SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "select", "display_id" => "display-1"))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == first_created
    after_stale = SA.signal_analyser_snapshot(state)
    @test after_stale["state_revision"] == first_created["state_revision"]
    @test after_stale["measurements"] == first_created["measurements"]

    state = SA.default_signal_analyser_state()
    snapshot = SA.signal_analyser_snapshot(state)
    for number in 2:5
        snapshot = SA.apply_signal_analyser_display!(state, Dict("state_revision" => snapshot["state_revision"], "operation" => "create"))
        @test snapshot["active_display_id"] == "display-$number"
    end
    @test length(snapshot["displays"]) == 5
    @test [display["id"] for display in snapshot["displays"]] == ["display-1", "display-2", "display-3", "display-4", "display-5"]

    closed = SA.apply_signal_analyser_display!(state, Dict("state_revision" => snapshot["state_revision"], "operation" => "close", "display_id" => "display-4"))
    @test closed["active_display_id"] == "display-5"
    @test [display["id"] for display in closed["displays"]] == ["display-1", "display-2", "display-3", "display-5"]
    @test closed["state_revision"] == snapshot["state_revision"] + 1

    closed_active = SA.apply_signal_analyser_display!(state, Dict("state_revision" => closed["state_revision"], "operation" => "close", "display_id" => "display-5"))
    @test closed_active["active_display_id"] == "display-3"
    @test [display["id"] for display in closed_active["displays"]] == ["display-1", "display-2", "display-3"]

    # Closing a non-active page must not change focus.  If the active first page
    # is closed, there is no left neighbour, so focus moves to the right page.
    preserved_active = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => closed_active["state_revision"],
        "operation" => "select",
        "display_id" => "display-2",
    ))
    @test preserved_active["active_display_id"] == "display-2"
    after_nonactive_close = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => preserved_active["state_revision"],
        "operation" => "close",
        "display_id" => "display-3",
    ))
    @test after_nonactive_close["active_display_id"] == "display-2"
    selected_first = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => after_nonactive_close["state_revision"],
        "operation" => "select",
        "display_id" => "display-1",
    ))
    after_first_close = SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => selected_first["state_revision"],
        "operation" => "close",
        "display_id" => "display-1",
    ))
    @test after_first_close["active_display_id"] == "display-2"
    @test [display["id"] for display in after_first_close["displays"]] == ["display-2"]
end

@testset "Signal Analyser view validation and atomicity" begin
    SA.reset_pspectrum_double!()
    state = SA.default_signal_analyser_state()
    SA.signal_analyser_snapshot(state)
    before = SA.signal_analyser_snapshot(state)

    for invalid_payload in (
        Dict{String,Any}(),
        Dict("state_revision" => 0.0),
        Dict("state_revision" => true),
        Dict("state_revision" => 0, "active_plot" => "surface"),
        Dict("state_revision" => 0, "selected_signal" => "missing"),
        Dict("state_revision" => 0, "visible_signals" => "Гармонический сигнал"),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", 1]),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "Гармонический сигнал"]),
        Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "missing"]),
        Dict("state_revision" => 0, "unexpected" => "field"),
        ["state_revision", 0],
    )
        error = try
            SA.apply_signal_analyser_view!(state, invalid_payload)
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test !isempty(error.fields)
        @test SA.signal_analyser_snapshot(state) == before
    end

    stale = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 9, "active_plot" => "spectrum"))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before

    failing_state = SA.test_state_with_complex_signal()
    first_name, second_name = [signal.name for signal in failing_state.signals]
    SA.apply_signal_analyser_view!(failing_state, Dict("state_revision" => 0, "visible_signals" => [first_name]))
    failure_before = SA.signal_analyser_snapshot(failing_state)

    # C23 defers Persistence while Time is active; its provider failure cannot
    # block an inactive source mutation.
    SA.PERSISTENCE_FAILURE[] = true
    dsp_error = try
        SA.apply_signal_analyser_view!(
            failing_state,
            Dict("state_revision" => 1, "selected_signal" => second_name, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test dsp_error === nothing
    SA.PERSISTENCE_FAILURE[] = false
    @test failing_state.view.state_revision == failure_before["state_revision"] + 1
end

@testset "Signal Analyser visible signal mutation contract" begin
    SA.reset_pspectrum_double!()
    state = SA.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    hidden_selected = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 0,
            "visible_signals" => [second_name],
        ),
    )
    @test hidden_selected["state_revision"] == 1
    assert_visibility(hidden_selected, [second_name], second_name)
    @test [trace["name"] for trace in hidden_selected["plot_payload"]["time_traces"]] == ["$(second_name) (Real)", "$(second_name) (Imaginary)"]
    @test [trace["name"] for trace in hidden_selected["plot_payload"]["spectrum_traces"]] == [second_name]
    @test hidden_selected["plot_payload"]["spectrogram"]["signal"] == second_name
    @test hidden_selected["plot_payload"]["persistence"]["signal"] == second_name

    restored = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 1,
            "selected_signal" => second_name,
            "visible_signals" => [second_name, first_name],
        ),
    )
    @test restored["state_revision"] == 2
    assert_visibility(restored, [first_name, second_name], second_name)
    @test [trace["name"] for trace in restored["plot_payload"]["time_traces"]] == [first_name, "$(second_name) (Real)", "$(second_name) (Imaginary)"]
    @test [trace["name"] for trace in restored["plot_payload"]["spectrum_traces"]] == [first_name, second_name]

    no_op = SA.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 2,
            "selected_signal" => second_name,
            "visible_signals" => [first_name, second_name],
        ),
    )
    @test no_op["state_revision"] == 2
    assert_visibility(no_op, [first_name, second_name], second_name)
end

@testset "Signal Analyser visibility failures do not partially mutate state" begin
    SA.reset_pspectrum_double!()
    state = SA.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    one_visible = SA.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 0, "visible_signals" => [first_name]),
    )
    @test one_visible["state_revision"] == 1
    assert_visibility(one_visible, [first_name], first_name)
    before = SA.signal_analyser_snapshot(state)

    stale = try
        SA.apply_signal_analyser_view!(
            state,
            Dict("state_revision" => 0, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before

    SA.SPECTRUM_FAILURE[] = true
    dsp_error = try
        SA.apply_signal_analyser_view!(
            state,
            Dict("state_revision" => state.view.state_revision, "visible_signals" => [first_name, second_name]),
        )
        nothing
    catch caught
        caught
    end
    @test dsp_error === nothing
    SA.SPECTRUM_FAILURE[] = false
    @test state.view.state_revision == 2
    @test SA.signal_analyser_display_payload(SA.signal_analyser_active_display(state))["visible_signals"] == [first_name, second_name]
end

@testset "Signal Analyser raw-sample snapshot measurements contract" begin
    SA.reset_pspectrum_double!()
    state = p0_measurement_state()
    legacy_bind_active_test_pane!(state)
    real_snapshot = SA.signal_analyser_snapshot(state)
    @test length(real_snapshot["plot_payload"]["time_traces"][1]["y"]) <= 1024
    assert_p0_snapshot_measurements(real_snapshot, state.signals[1])
    @test real_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test real_snapshot["measurements"]["items"][2]["sample_index"] == 1025
    @test state.view.state_revision == 0
    repeated = SA.signal_analyser_snapshot(state)
    @test repeated["state_revision"] == real_snapshot["state_revision"]
    @test repeated["visible_signals"] == real_snapshot["visible_signals"]
    @test repeated["measurements"] == real_snapshot["measurements"]

    complex_snapshot = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "selected_signal" => "raw-complex"))
    @test complex_snapshot["state_revision"] == 1
    assert_p0_snapshot_measurements(complex_snapshot, state.signals[2])
    @test complex_snapshot["measurements"]["items"][1]["sample_index"] == 1050
    @test complex_snapshot["measurements"]["items"][2]["sample_index"] == 1025

    fallback = SA.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 1, "visible_signals" => ["raw-real"]),
    )
    @test fallback["state_revision"] == 2
    @test fallback["selected_signal"] == "raw-real"
    assert_p0_snapshot_measurements(fallback, state.signals[1])
end

function invalid_raw_selection_state()
    valid = SA.AnalysedSignal(
        "valid-raw",
        "#111111",
        1000.0,
        ComplexF64[1.0 + 0.0im, 2.0 + 0.0im, 3.0 + 0.0im],
        false,
        true,
    )
    invalid = SA.AnalysedSignal(
        "invalid-raw",
        "#222222",
        1000.0,
        ComplexF64[1.0 + 0.0im, NaN + 0.0im, 3.0 + 0.0im],
        false,
        false,
    )
    SA.SignalAnalyserState(
        SA.AnalysedSignal[valid, invalid],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, valid.name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
    )
end

function state_publication_fingerprint(state)
    (
        revision = state.view.state_revision,
        active_display_id = state.active_display_id,
        active_plot = state.view.active_plot,
        row_selected_signal = state.row_selection.signal_name,
        analysis_signal = state.view.selected_signal,
        displays = [
            (
                id = display.id,
                active_plot = display.active_plot,
                analysis_signal = SA.signal_analyser_display_analysis_name(display),
                visible_signals = SA.signal_analyser_display_members(display),
                peaks_enabled = display.peaks_enabled,
            )
            for display in state.displays
        ],
        plot_cache = deepcopy(state.plot_cache),
    )
end

@testset "Signal Analyser invalid raw measurements abort View and Display publication" begin
    SA.reset_pspectrum_double!()
    state = invalid_raw_selection_state()
    baseline_snapshot = SA.signal_analyser_snapshot(state)
    baseline = state_publication_fingerprint(state)

    @test_throws ArgumentError SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "selected_signal" => "invalid-raw",
        "visible_signals" => ["valid-raw", "invalid-raw"],
    ))
    @test state_publication_fingerprint(state) == baseline
    @test SA.signal_analyser_snapshot(state) == baseline_snapshot

    invalid_display = SA.SignalAnalyserDisplayState(
        "display-invalid",
        "Display invalid",
        SA.TIME_PLOT,
        "invalid-raw",
        ["valid-raw", "invalid-raw"],
        SA.SignalTimeLimits(0.0, 0.002),
        false,
    )
    push!(state.displays, invalid_display)
    display_baseline_snapshot = SA.signal_analyser_snapshot(state)
    display_baseline = state_publication_fingerprint(state)

    @test_throws ArgumentError SA.apply_signal_analyser_display!(state, Dict(
        "state_revision" => 0,
        "operation" => "select",
        "display_id" => "display-invalid",
    ))
    @test state_publication_fingerprint(state) == display_baseline
    @test SA.signal_analyser_snapshot(state) == display_baseline_snapshot
end

@testset "Signal Analyser Peaks provider failures and display scope are atomic" begin
    result = SA.SignalPeaksProviderResult([9.0], [2], [1.0], [3.0], 1100)
    fake = FakePeaksProvider(SA.SignalPeaksQuery[], result, nothing)
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = fake)
    legacy_bind_active_test_pane!(state)
    active_peaks!(target) = begin
        pane_id = target.display_layouts[target.active_display_id].active_pane_id
        SA.signal_analyser_calculate_active_peaks!(target, target.active_display_id, pane_id;
            expected_state_revision = target.view.state_revision)
        task = target.output_manager.active_task
        task === nothing || wait(task)
        SA.signal_analyser_active_peaks(target, target.active_display_id, pane_id)
    end
    before = SA.signal_analyser_snapshot(state)
    # Cache entries do not define structural equality, so compare their
    # user-visible context and Plotly payload rather than object identity.
    cache_signature(cache) = Dict(
        page_id => (entry.context, deepcopy(entry.plots))
        for (page_id, entry) in cache
    )
    fake.failure = ArgumentError("provider failure")
    enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test enabled["state_revision"] == 1
    @test enabled["peaks"]["enabled"] === true
    @test isempty(fake.calls)
    graph = SA.signal_analyser_active_output(state, "display-1", "pane-1")
    graph_task = state.output_manager.active_task
    graph_task === nothing || wait(graph_task)
    graph = SA.signal_analyser_active_output(state, "display-1", "pane-1")
    @test isempty(fake.calls) && graph["isready"] === true && graph["success"] === true
    graph_cache_baseline = cache_signature(state.output_manager.plot_cache)
    failed = active_peaks!(state)
    @test failed["isready"] === true && failed["success"] === false
    @test occursin("provider failure", failed["error"])
    @test length(fake.calls) == 1
    @test cache_signature(state.output_manager.plot_cache) == graph_cache_baseline
    @test state.displays[1].peaks_enabled === true
    @test state.view.state_revision >= enabled["state_revision"]

    fake.failure = nothing
    complex_enabled = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "selected_signal" => "raw-complex",
    ))
    @test isempty(fake.calls) || length(fake.calls) == 1
    complex_output = active_peaks!(state)
    @test complex_output["isready"] === true && complex_output["success"] === true
    @test fake.calls[end].ordinate == SA.MAGNITUDE_ORDINATE
    @test collect(fake.calls[end].values) == Float64.(abs.(state.signals[2].values))
    @test complex_enabled["peaks"]["signal_name"] == "raw-complex"
    @test complex_output["peaks"]["signal_name"] == "raw-real"
    @test [row["signal_name"] for row in complex_output["data"]["rows"]] == ["raw-real", "raw-complex"]
    complex_snapshot = SA.signal_analyser_snapshot(state)
    @test complex_snapshot["peaks"]["items"][1]["sample_index"] == 1

    fake.failure = ArgumentError("provider failure on selected signal")
    selected_change = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision, "selected_signal" => "raw-real",
    ))
    @test selected_change["selected_signal"] == "raw-real"
    calls_before_failure = length(fake.calls)
    selected_failure = active_peaks!(state)
    @test selected_failure["isready"] === true && selected_failure["success"] === false
    @test occursin("selected signal", selected_failure["error"])
    @test length(fake.calls) == calls_before_failure + 1
    fake.failure = nothing

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["displays"][1]["peaks_enabled"] === true
    @test created["displays"][2]["peaks_enabled"] === false
    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    @test first["peaks"]["display_id"] == "display-1"
    @test first["peaks"]["enabled"] === true
    second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-2"))
    @test second["peaks"]["display_id"] == "display-2"
    @test second["peaks"]["enabled"] === false

    empty_fake = FakePeaksProvider(SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult(Float64[], Int[], Float64[], Float64[], 1100), nothing)
    empty_base = p0_measurement_state()
    empty_state = SA.SignalAnalyserState(empty_base.signals, empty_base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = empty_fake)
    legacy_bind_active_test_pane!(empty_state)
    empty = SA.apply_signal_analyser_view!(empty_state, Dict("state_revision" => 0, "peaks_enabled" => true))
    @test empty["peaks"]["enabled"] === true
    @test isempty(empty_fake.calls)
    empty_output = active_peaks!(empty_state)
    @test empty_output["isready"] === true && empty_output["success"] === true
    @test length(empty_fake.calls) == 2
    @test SA.signal_analyser_snapshot(empty_state)["peaks"]["items"] == Any[]
end

function assert_empty_display_snapshot(snapshot)
    @test snapshot["analysis_signal"] === nothing
    @test snapshot["selected_signal"] === nothing
    @test snapshot["visible_signals"] == String[]
    @test snapshot["plot_payload"]["selected_signal"] === nothing
    @test snapshot["plot_payload"]["visible_signals"] == String[]
    @test snapshot["plot_payload"]["time_traces"] == Any[]
    @test snapshot["plot_payload"]["spectrum_traces"] == Any[]
    for key in ("time", "spectrum")
        @test snapshot["plots"][key]["type"] == "line"
        @test snapshot["plots"][key]["x"] == Any[]
        @test snapshot["plots"][key]["y"] == Any[]
    end
    for key in ("spectrogram", "persistence")
        @test snapshot["plots"][key]["type"] == "heatmap"
        @test snapshot["plots"][key]["x"] == Any[]
        @test snapshot["plots"][key]["y"] == Any[]
        @test snapshot["plots"][key]["z"] == Any[]
        @test snapshot["plot_payload"][key]["type"] == "heatmap"
        @test snapshot["plot_payload"][key]["signal"] === nothing
    end
    @test snapshot["measurements"] == Dict(
        "state_revision" => snapshot["state_revision"],
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("time" => "s", "value" => "1"),
        "items" => Any[],
    )
    @test snapshot["peaks"] == Dict(
        "enabled" => false,
        "mode" => "maxima",
        "state_revision" => snapshot["state_revision"],
        "display_id" => snapshot["active_display_id"],
        "signal_name" => nothing,
        "ordinate" => nothing,
        "units" => Dict("value" => "1", "time" => "s", "width" => "samples", "prominence" => "1"),
        "items" => Any[],
    )
end

@testset "Cascade 5 separates rows, membership and analysis lifecycle" begin
    SA.reset_pspectrum_double!()
    names = ["raw-real", "raw-complex"]
    provider = FakePeaksProvider(SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult([9.0], [2], [1.0], [3.0], 1100), nothing)
    base = p0_measurement_state()
    state = SA.SignalAnalyserState(base.signals, base.view, Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = provider)
    legacy_bind_active_test_pane!(state)

    initial = SA.signal_analyser_snapshot(state)
    @test initial["row_selected_signal"] == names[1]
    @test initial["analysis_signal"] == names[1] == initial["selected_signal"]

    independent_canonical = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "row_selected_signal" => names[2],
        "analysis_signal" => names[1],
    ))
    @test independent_canonical["state_revision"] == 1
    @test independent_canonical["row_selected_signal"] == names[2]
    @test independent_canonical["analysis_signal"] == names[1]
    @test independent_canonical["visible_signals"] == names

    enabled = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "peaks_enabled" => true))
    @test enabled["state_revision"] == 2
    @test isempty(provider.calls)
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    active_task = state.output_manager.active_task
    active_task === nothing || wait(active_task)
    active_output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test active_output["isready"] === true && active_output["success"] === true
    @test isempty(provider.calls)
    SA.signal_analyser_calculate_active_peaks!(state, "display-1", pane_id;
        expected_state_revision = state.view.state_revision)
    peaks_task = state.output_manager.active_task
    peaks_task === nothing || wait(peaks_task)
    active_peaks = SA.signal_analyser_active_peaks(state, "display-1", pane_id)
    @test active_peaks["isready"] === true && active_peaks["success"] === true
    @test [query.signal_name for query in provider.calls] == names
    @test length(provider.calls) == 2

    clear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => String[]))
    @test clear["state_revision"] == state.view.state_revision
    @test clear["row_selected_signal"] == names[2]
    @test clear["displays"][1]["peaks_enabled"] === false
    @test length(provider.calls) == 2
    assert_empty_display_snapshot(clear)

    no_op_clear = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => String[], "analysis_signal" => nothing, "selected_signal" => nothing))
    @test no_op_clear["state_revision"] == state.view.state_revision
    @test length(provider.calls) == 2

    recovered = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [names[2]]))
    @test recovered["state_revision"] == state.view.state_revision
    @test recovered["row_selected_signal"] == names[2]
    assert_visibility(recovered, [names[2]], names[2])
    @test recovered["displays"][1]["peaks_enabled"] === false
    @test length(provider.calls) == 2

    before_conflict = SA.signal_analyser_snapshot(state)
    conflict = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "analysis_signal" => names[1], "selected_signal" => names[2]))
        nothing
    catch caught
        caught
    end
    @test conflict isa SA.SignalAnalyserValidationError
    @test haskey(conflict.fields, "analysis_signal") || haskey(conflict.fields, "selected_signal")
    @test SA.signal_analyser_snapshot(state) == before_conflict

    stale = try
        SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3, "visible_signals" => String[]))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError
    @test SA.signal_analyser_snapshot(state) == before_conflict
end

@testset "Cascade 5 Clear Display preserves independent empty and configured pages" begin
    SA.reset_pspectrum_double!()
    state = SA.test_state_with_complex_signal()
    names = [signal.name for signal in state.signals]
    legacy_bind_active_test_pane!(state)
    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 0, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["displays"][1]["visible_signals"] == names
    @test created["displays"][1]["analysis_signal"] == names[1]
    @test created["displays"][2]["visible_signals"] == String[]
    @test created["displays"][2]["analysis_signal"] === nothing

    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "select", "display_id" => "display-1"))
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 2, "visible_signals" => String[]))
    assert_empty_display_snapshot(cleared)
    second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-2"))
    @test second["visible_signals"] == String[]
    @test second["analysis_signal"] === nothing
    @test second["displays"][1]["visible_signals"] == String[]
    @test second["displays"][1]["analysis_signal"] === nothing

    configured_second = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 4,
        "visible_signals" => [names[2]],
    ))
    @test configured_second["visible_signals"] == [names[2]]
    @test configured_second["analysis_signal"] == names[2]
    restored_first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 5, "operation" => "select", "display_id" => "display-1"))
    @test restored_first["visible_signals"] == String[]
    restored = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 6, "visible_signals" => [names[1]]))
    @test restored["analysis_signal"] == names[1]
    @test restored["displays"][2]["visible_signals"] == [names[2]]
    @test restored["displays"][2]["analysis_signal"] == names[2]
end

@testset "Cascade 7 Time Limits ROI" begin
    @test SA.SignalTimeLimits(0, 1) == SA.SignalTimeLimits(0.0, 1.0)
    @test_throws ArgumentError SA.SignalTimeLimits(1, 1)
    @test_throws ArgumentError SA.SignalTimeLimits(NaN, 1)
    roi = SA.SignalOrdinateRoi(SA.REAL_ORDINATE, [1.0], 7, 10.0)
    @test roi.sample_offset == 7
    @test collect(roi.values) == [1.0]
    @test_throws ArgumentError SA.SignalOrdinateRoi(SA.REAL_ORDINATE, Float64[], 0, 1.0)
end

@testset "Cascade 7 Time Limits ROI publication, Peaks and lifecycle" begin
    # Use a deliberately long raw signal: these assertions prove that ROI work is
    # performed before the Time-plot downsampling boundary and uses absolute
    # (zero-based) signal coordinates.
    values = ComplexF64.(collect(0:19))
    signal = SA.AnalysedSignal("roi", "#111111", 10.0, values, false, true)
    provider = FakePeaksProvider(
        SA.SignalPeaksQuery[],
        SA.SignalPeaksProviderResult([8.0], [2], [1.5], [3.0], 4),
        nothing,
    )
    state = SA.SignalAnalyserState(
        SA.AnalysedSignal[signal],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, signal.name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(); peaks_provider = provider,
    )
    legacy_bind_active_test_pane!(state)
    active_pane_id() = state.display_layouts["display-1"].active_pane_id
    materialize() = begin
        # The first output request may legally be lightweight pending while
        # the scheduler owns the single active task.  Await that task before
        # observing its terminal response; tight polling is not a readiness
        # contract.
        SA.signal_analyser_active_output(state, "display-1", active_pane_id())
        task = state.output_manager.active_task
        task === nothing || wait(task)
        SA.signal_analyser_active_output(state, "display-1", active_pane_id())
    end

    # 0.7..1.01 includes raw samples 7,8,9,10 (both endpoints inclusive).
    settings_service = SA.SignalSettingsService()
    four_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "time.x_limits", "value" => Dict("min" => 0.7, "max" => 1.01),
    ))
    four_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => four_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test four_apply["success"] === true && four_apply["state_revision"] == 2
    @test haskey(four_apply, "settings") && !haskey(four_apply, "output")
    @test isempty(provider.calls)
    @test state.output_manager.need_update_pages[state.output_manager.active_page_id]

    # Peaks are intent only. Neither changing it nor graph-output
    # materialization may invoke its provider; the pane-scoped Peaks endpoint
    # owns that work.
    enabled = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => four_apply["state_revision"], "peaks_enabled" => true,
    ))
    @test enabled["state_revision"] == four_apply["state_revision"] + 1
    @test isempty(provider.calls)

    output = materialize()
    # A last-good response can be returned while the current context is being
    # scheduled; poll the normal active endpoint until its awaited task has
    # published the accepted ROI context.
    for _ in 1:3
        output["state_revision"] == state.view.state_revision &&
            output["isready"] === true && break
        output = materialize()
    end
    @test output["isready"] === true && output["success"] === true
    @test isempty(provider.calls)
    peaks_pending = SA.signal_analyser_calculate_active_peaks!(
        state, "display-1", active_pane_id();
        expected_state_revision = state.view.state_revision,
    )
    @test peaks_pending["isready"] === false && peaks_pending["success"] === false
    task = state.output_manager.active_task
    task === nothing || wait(task)
    peaks_ready = SA.signal_analyser_active_peaks(state, "display-1", active_pane_id())
    @test peaks_ready["isready"] === true && peaks_ready["success"] === true
    @test length(provider.calls) == 1
    query = only(provider.calls)
    @test query.sample_offset == 7
    @test collect(query.values) == [7.0, 8.0, 9.0, 10.0]
    @test query.state_revision <= peaks_ready["state_revision"]
    time_plot = only(output["data"])
    @test time_plot["data"][1]["x"] == collect(0.0:0.1:1.9)
    @test time_plot["data"][1]["y"] == collect(0.0:19.0)
    @test time_plot["layout"]["xaxis"]["range"] == [0.7, 1.01]
    ready = SA.signal_analyser_snapshot(state)
    @test ready["measurements"]["items"] == [
        Dict("id" => "minimum", "label" => "Минимум", "value" => 7.0, "time_s" => 0.7, "sample_index" => 7),
        Dict("id" => "maximum", "label" => "Максимум", "value" => 10.0, "time_s" => 1.0, "sample_index" => 10),
        Dict("id" => "mean", "label" => "Среднее", "value" => 8.5, "time_s" => nothing, "sample_index" => nothing),
    ]
    @test ready["peaks"]["items"] == [Dict(
        "id" => "peak-8", "type" => "maximum", "value" => 8.0, "time_s" => 0.8,
        "sample_index" => 8, "width_samples" => 1.5, "prominence" => 3.0,
    )]
    @test peaks_ready["peaks"]["items"] == ready["peaks"]["items"]

    @test_throws SA.SignalSettingApiTypeError SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.x_limits", "value" => Dict("min" => "bad", "max" => 1.0),
    ))
    invalid = explicit_calculation_failure!(state, settings_service, "time.x_limits", Dict("min" => 1.1, "max" => 1.0))
    @test invalid["success"] === false
    @test occursin("time.x_limits", invalid["error"])
    @test only(filter(field -> field["id"] == "time.x_limits", SA.signal_settings_document(settings_service, state, "display-1")["fields"]))["value"] == Dict("min" => 1.1, "max" => 1.0)

    provider.failure = ArgumentError("ROI provider failure")
    failure_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "time.x_limits", "value" => Dict{String,Any}("min" => 0.8, "max" => 1.11),
    ))
    failure_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => failure_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test failure_apply["success"] === true
    # Graph materialization is Peaks-passive. Establish the new ROI graph cache
    # baseline before exercising the independent active-Peaks failure channel.
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    graph_after_apply = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test graph_after_apply["isready"] === true && graph_after_apply["success"] === true
    graph_page_id = state.output_manager.active_page_id
    graph_cache_baseline = state.output_manager.plot_cache[graph_page_id]
    SA.signal_analyser_calculate_active_peaks!(state, "display-1", pane_id;
        expected_state_revision = state.view.state_revision)
    peaks_task = state.output_manager.active_task
    peaks_task === nothing || wait(peaks_task)
    failed_peaks = SA.signal_analyser_active_peaks(state, "display-1", pane_id)
    @test failed_peaks["isready"] === true && failed_peaks["success"] === false
    @test occursin("ROI provider failure", failed_peaks["error"])
    @test state.view.state_revision >= failure_apply["state_revision"]
    @test state.displays[1].time_limits == SA.SignalTimeLimits(0.8, 1.11)
    @test state.output_manager.plot_cache[graph_page_id] === graph_cache_baseline
    provider.failure = nothing

    # A carried range follows a source change only when it is valid for the
    # prospective analysis source; otherwise the new source receives its full range.
    short = SA.AnalysedSignal("short", "#222222", 10.0, ComplexF64.(collect(0:4)), false, true)
    long = SA.AnalysedSignal("long", "#333333", 10.0, ComplexF64.(collect(0:10)), false, true)
    lifecycle = SA.SignalAnalyserState(
        SA.AnalysedSignal[long, short], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, long.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(); peaks_provider = FakePeaksProvider(
            SA.SignalPeaksQuery[], SA.SignalPeaksProviderResult(Float64[], Int[], Float64[], Float64[], 3), nothing,
        ),
    )
    legacy_bind_active_test_pane!(lifecycle)
    lifecycle_settings = SA.SignalSettingsService()
    narrowed = explicit_calculation_snapshot!(lifecycle, lifecycle_settings, "time.x_limits", Dict("min" => 0.5, "max" => 0.7))
    reset_on_short = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => lifecycle.view.state_revision, "analysis_signal" => short.name,
    ))
    @test reset_on_short["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.4, "units" => "s")
    short_narrowed = explicit_calculation_snapshot!(lifecycle, lifecycle_settings, "time.x_limits", Dict("min" => 0.2, "max" => 0.4))
    preserved = SA.apply_signal_analyser_view!(lifecycle, Dict(
        "state_revision" => lifecycle.view.state_revision, "analysis_signal" => long.name,
    ))
    @test preserved["time_limits"] == short_narrowed["time_limits"]
    cleared = SA.apply_signal_analyser_view!(lifecycle, Dict("state_revision" => lifecycle.view.state_revision, "visible_signals" => String[]))
    @test cleared["time_limits"] === nothing
    readded = SA.apply_signal_analyser_view!(lifecycle, Dict("state_revision" => lifecycle.view.state_revision, "visible_signals" => [short.name]))
    @test readded["time_limits"] == Dict("min_s" => 0.0, "max_s" => 0.4, "units" => "s")
    created = SA.apply_signal_analyser_display!(lifecycle, Dict("state_revision" => lifecycle.view.state_revision, "operation" => "create"))
    @test created["time_limits"] === nothing
    returned = SA.apply_signal_analyser_display!(lifecycle, Dict("state_revision" => lifecycle.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    @test returned["time_limits"] == readded["time_limits"]
end

@testset "Cascade 8 selectable measurement kinds are canonical ROI statistics" begin
    signal = SA.AnalysedSignal(
        "statistics-real", "#111111", 10.0,
        ComplexF64[-2, 10, 2, -2, 4], false, true,
    )
    state = SA.SignalAnalyserState(
        SA.AnalysedSignal[signal], SA.SignalAnalyserViewState(0, SA.TIME_PLOT, signal.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
    legacy_bind_active_test_pane!(state)
    initial = SA.signal_analyser_snapshot(state)
    @test initial["measurement_kinds"] == ["minimum", "maximum", "mean"]
    @test initial["displays"][1]["measurement_kinds"] == ["minimum", "maximum", "mean"]

    all_kinds = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        # Request order is intentionally noncanonical: the wire/snapshot order is fixed.
        "measurement_kinds" => ["rms", "peak_to_peak", "median", "mean", "maximum", "minimum"],
    ))
    @test all_kinds["state_revision"] == 1
    @test all_kinds["measurement_kinds"] == ["minimum", "maximum", "mean", "median", "peak_to_peak", "rms"]
    @test all_kinds["displays"][1]["measurement_kinds"] == all_kinds["measurement_kinds"]
    items = all_kinds["measurements"]["items"]
    @test [item["id"] for item in items] == all_kinds["measurement_kinds"]
    @test [item["value"] for item in items][1:5] == [-2.0, 10.0, 2.4, 2.0, 12.0]
    @test items[6]["value"] ≈ sqrt(128 / 5)
    @test items[1]["sample_index"] == 0 && items[1]["time_s"] == 0.0 # first of tied minima
    @test items[2]["sample_index"] == 1 && items[2]["time_s"] == 0.1
    @test all(item -> item["sample_index"] === nothing && item["time_s"] === nothing, items[3:end])
    no_op = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 1, "measurement_kinds" => reverse(all_kinds["measurement_kinds"]),
    ))
    @test no_op["state_revision"] == 1

    empty = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "measurement_kinds" => String[]))
    @test empty["state_revision"] == 2
    @test empty["measurement_kinds"] == String[]
    @test empty["measurements"]["signal_name"] == signal.name
    @test empty["measurements"]["ordinate"] == "real"
    @test empty["measurements"]["items"] == Any[]

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["active_display_id"] == "display-2"
    @test created["measurement_kinds"] == ["minimum", "maximum", "mean"]
    @test created["displays"][1]["measurement_kinds"] == String[] # inactive preference is untouched
    first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    @test first["measurement_kinds"] == String[]
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "visible_signals" => String[]))
    @test cleared["measurement_kinds"] == String[]
    @test cleared["measurements"]["signal_name"] === nothing
    @test cleared["measurements"]["items"] == Any[]
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [signal.name]))
    @test readded["measurement_kinds"] == String[]
    @test readded["measurements"]["signal_name"] == signal.name
    @test readded["measurements"]["items"] == Any[]
end

@testset "Cascade 8 metric edge mathematics and ordinate provenance" begin
    service = SA.SignalMeasurementsService()
    all_selection = SA.SignalMeasurementSelection(collect(SA.SIGNAL_MEASUREMENT_CANONICAL_KINDS))
    even = SA.AnalysedSignal("even", "#111111", 10.0, ComplexF64[1, 10, 2, 7], false, true)
    even_snapshot = SA.signal_measurements_snapshot(service, 0, even, SA.SignalTimeLimits(0, 0.3), all_selection)
    @test [item.value for item in even_snapshot.items] ≈ [1.0, 10.0, 5.0, 4.5, 9.0, sqrt(154 / 4)]
    @test all(item -> item.position === nothing, even_snapshot.items[3:end])

    complex_signal = SA.AnalysedSignal("complex", "#222222", 10.0, ComplexF64[3 + 4im, 5 + 12im, 8 + 15im], true, true)
    complex_snapshot = SA.signal_measurements_snapshot(service, 0, complex_signal, SA.SignalTimeLimits(0, 0.2), all_selection)
    @test complex_snapshot.ordinate == SA.MAGNITUDE_ORDINATE
    @test [item.value for item in complex_snapshot.items] ≈ [5.0, 17.0, 35 / 3, 13.0, 12.0, sqrt(483 / 3)]
    @test complex_snapshot.items[1].position.sample_index == 0
    @test complex_snapshot.items[2].position.sample_index == 2

    # The scale-normalized RMS implementation must remain finite where direct
    # squaring of finite Float64 samples would overflow.
    huge = SA.AnalysedSignal("huge", "#333333", 10.0, ComplexF64[floatmax(Float64) / 2, -floatmax(Float64) / 2], false, true)
    rms_selection = SA.SignalMeasurementSelection([SA.RMS_MEASUREMENT])
    huge_snapshot = SA.signal_measurements_snapshot(service, 0, huge, SA.SignalTimeLimits(0, 0.1), rms_selection)
    @test isfinite(only(huge_snapshot.items).value)
    @test only(huge_snapshot.items).value == floatmax(Float64) / 2

    # Empty selection never resolves raw data: invalid samples cannot turn a
    # selected-empty Measurements request into a hidden validation/DSP call.
    invalid = SA.AnalysedSignal("invalid-empty", "#444444", 10.0, ComplexF64[NaN, 1], false, true)
    empty_snapshot = SA.signal_measurements_snapshot(service, 0, invalid, SA.SignalTimeLimits(0, 0.1), SA.SignalMeasurementSelection(SA.SignalMeasurementKind[]))
    @test empty_snapshot.signal_name == invalid.name
    @test empty_snapshot.ordinate == SA.REAL_ORDINATE
    @test isempty(empty_snapshot.items)
end

@testset "Cascade 9 Spectrum settings provider and mutation contract" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(state)
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test initial["displays"][1]["spectrum_settings"] == initial["spectrum_settings"]
    @test isempty(SA.SPECTRUM_CALLS)
    spectrum_view = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => initial["state_revision"], "active_plot" => "spectrum",
    ))
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    materialized = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test materialized["isready"] === true && materialized["success"] === true
    # A display can list several signals, but active-output materialization
    # calculates only its analysis signal.  The remaining trace is a
    # lightweight placeholder until it becomes the active analysis signal.
    @test length(SA.SPECTRUM_CALLS) == 1
    @test SA.SPECTRUM_CALLS[1].topology == SA.ONE_SIDED_SPECTRUM
    @test all(value -> value isa ComplexF64, SA.SPECTRUM_CALLS[1].values)
    @test only(materialized["data"])["data"][1]["y"] ≈ [0.0, 10 * log10(4.0)]
    @test only(materialized["data"])["data"][2]["x"] == Float64[]
    before = SA.signal_analyser_snapshot(state)
    settings_service = SA.SignalSettingsService()
    invalid = explicit_calculation_failure!(state, settings_service, "spectrum.leakage", 2.0)
    @test invalid["success"] === false
    @test occursin("spectrum.leakage", invalid["error"])
    @test SA.signal_analyser_snapshot(state)["spectrum_settings"] == before["spectrum_settings"]
    @test length(SA.SPECTRUM_CALLS) == 1
    # A rejected Apply retains its draft for correction.  Restoring the
    # published value clears that draft before the independent scale scenario.
    revision_after_invalid_apply = state.view.state_revision
    cleared_invalid_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.leakage", "value" => 0.5,
    ))
    @test cleared_invalid_draft["state"]["state_revision"] == revision_after_invalid_apply + 1

    # Spectrum scale participates in the typed draft/Apply boundary.  Neither
    # stage returns plots or invokes a provider; inspect the normal active
    # output after Apply instead.
    linear_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.scale", "value" => "linear",
    ))
    @test linear_draft["state"]["state_revision"] == before["state_revision"] + 4
    linear_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => linear_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test linear_apply["success"] === true
    @test linear_apply["state_revision"] == linear_draft["state"]["state_revision"] + 1
    @test isempty(SA.SPECTRUM_CALLS[2:end])
    linear_output = materialize_active_output!(state)
    @test linear_output["isready"] === true && linear_output["success"] === true
    @test only(linear_output["data"])["data"][1]["y"] == [1.0, 4.0]
    @test length(SA.SPECTRUM_CALLS) == 1
    noop_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.scale", "value" => "linear",
    ))
    @test noop_draft["state"]["state_revision"] == state.view.state_revision

    # Field drafts validate their own wire type before publishing anything.
    # The removed grouped object is deliberately not reconstructed here.
    before_invalid = SA.signal_analyser_snapshot(state)
    @test_throws SA.SignalSettingApiTypeError SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.leakage", "value" => true,
    ))
    @test SA.signal_analyser_snapshot(state) == before_invalid

    # Scale and frequency presentation are deliberately excluded from raw
    # provider identity; leakage is part of it and must recalculate.
    db_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.scale", "value" => "db",
    ))
    db_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => db_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test db_apply["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 1
    db_output = materialize_active_output!(state)
    @test only(db_output["data"])["data"][1]["y"] ≈ [0.0, 10 * log10(4.0)]
    @test length(SA.SPECTRUM_CALLS) == 1
    leakage_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.leakage", "value" => 0.25,
    ))
    leakage = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => leakage_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test leakage["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 1
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    refreshed = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test refreshed["isready"] === true && refreshed["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 2
    @test SA.SPECTRUM_CALLS[2].leakage == 0.25
    stale = try
        SA.apply_signal_setting!(settings_service, state, Dict(
            "state_revision" => leakage_draft["state"]["state_revision"], "display_id" => "display-1",
            "field_id" => "spectrum.leakage", "value" => 0.25,
        ))
        nothing
    catch caught
        caught
    end
    @test stale isa SA.SignalAnalyserStaleStateError

    # A complex visible member prohibits logarithmic frequency scale, and the
    # rejected mixed mutation is atomic.
    complex_state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(complex_state)
    complex_before = SA.signal_analyser_snapshot(complex_state)
    complex_settings = SA.SignalSettingsService()
    complex_log = try
        SA.apply_signal_setting!(complex_settings, complex_state, Dict(
            "state_revision" => 0, "display_id" => "display-1",
            "field_id" => "spectrum.frequency_scale", "value" => "log",
        ))
        nothing
    catch caught
        caught
    end
    @test complex_log isa SA.SignalSettingValidationError
    @test complex_log.field_id == "spectrum.frequency_scale"
    @test occursin("комплекс", lowercase(complex_log.message))
    @test SA.signal_analyser_snapshot(complex_state) == complex_before

    # Removing the complex member permits log presentation.  Creating and
    # clearing Displays preserve an independent canonical settings object.
    real_name = complex_state.signals[1].name
    log_view = SA.apply_signal_analyser_view!(complex_state, Dict("state_revision" => 0,
        "visible_signals" => [real_name],
    ))
    log_update = SA.apply_signal_setting!(complex_settings, complex_state, Dict(
        "state_revision" => log_view["state_revision"], "display_id" => "display-1",
        "field_id" => "spectrum.frequency_scale", "value" => "log",
    ))
    log_view = log_update["state"]
    @test log_view["state_revision"] == 2
    @test log_view["spectrum_settings"]["frequency_scale"] == "log"
    created = SA.apply_signal_analyser_display!(complex_state, Dict("state_revision" => 2, "operation" => "create"))
    @test created["displays"][2]["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    active_log = SA.apply_signal_analyser_display!(complex_state, Dict("state_revision" => 3, "operation" => "select", "display_id" => "display-1"))
    cleared = SA.apply_signal_analyser_view!(complex_state, Dict("state_revision" => 4, "visible_signals" => String[]))
    @test cleared["spectrum_settings"] == active_log["spectrum_settings"]
    @test cleared["displays"][2]["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)

    # Provider failures are observable only at lazy output materialization;
    # accepted field Apply remains published and last-good output is retained.
    SA.SPECTRUM_FAILURE[] = true
    failure_draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.leakage", "value" => 0.75,
    ))
    provider_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => failure_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test provider_apply["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 2
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    provider_error = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test provider_error["isready"] === true && provider_error["success"] === false
    @test occursin("Spectrum provider failure", provider_error["error"])
    @test length(SA.SPECTRUM_CALLS) == 3
    @test state.displays[1].spectrum_settings.leakage == 0.75
    SA.SPECTRUM_FAILURE[] = false

    # Complex raw samples retain the centered topology, but only after that
    # signal is explicitly made the active Spectrum analysis target.
    empty!(SA.SPECTRUM_CALLS)
    complex_raw = SA.test_state_with_complex_signal()
    complex_name = complex_raw.signals[2].name
    legacy_bind_active_test_pane!(complex_raw; signal_names = [complex_name])
    complex_spectrum = SA.apply_signal_analyser_view!(complex_raw, Dict(
        "state_revision" => 0, "active_plot" => "spectrum", "analysis_signal" => complex_name,
    ))
    complex_pane = complex_raw.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(complex_raw, "display-1", complex_pane)
    task = complex_raw.output_manager.active_task
    task === nothing || wait(task)
    complex_output = SA.signal_analyser_active_output(complex_raw, "display-1", complex_pane)
    @test complex_spectrum["analysis_signal"] == complex_name
    @test complex_output["isready"] === true && complex_output["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 1
    @test only(SA.SPECTRUM_CALLS).topology == SA.CENTERED_TWO_SIDED_SPECTRUM
    @test all(value -> value isa ComplexF64, only(SA.SPECTRUM_CALLS).values)

    # Mixed-duration visible sources intersect the Display ROI independently:
    # a one-sample intersection is represented but never calls the provider,
    # while a two-sample real source remains a legitimate raw provider query.
    empty!(SA.SPECTRUM_CALLS)
    long = SA.AnalysedSignal("long", "#111111", 10.0, ComplexF64[1, 2, 3], false, true)
    short = SA.AnalysedSignal("short", "#222222", 10.0, ComplexF64[1, 2], false, true)
    roi_state = SA.SignalAnalyserState(SA.AnalysedSignal[long, short],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "long"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    legacy_bind_active_test_pane!(roi_state)
    SA.signal_analyser_snapshot(roi_state)
    @test isempty(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTRUM_CALLS)
    roi_settings = SA.SignalSettingsService()
    one_sample = explicit_calculation_snapshot!(roi_state, roi_settings, "time.x_limits", Dict("min" => 0.0, "max" => 0.05))
    @test one_sample["time_limits"]["max_s"] == 0.05
    @test isempty(SA.SPECTRUM_CALLS)
    spectrum_view = SA.apply_signal_analyser_view!(roi_state, Dict(
        "state_revision" => roi_state.view.state_revision, "active_plot" => "spectrum",
    ))
    two_samples = explicit_calculation_snapshot!(roi_state, roi_settings, "time.x_limits", Dict("min" => 0.0, "max" => 0.1))
    @test two_samples["state_revision"] == roi_state.view.state_revision
    pane_id = roi_state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(roi_state, "display-1", pane_id)
    task = roi_state.output_manager.active_task
    task === nothing || wait(task)
    @test SA.signal_analyser_active_output(roi_state, "display-1", pane_id)["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 1
    @test SA.SPECTRUM_CALLS[1].signal_name == "long"
    @test length(SA.SPECTRUM_CALLS[1].values) == 2
end

@testset "Cascade 10 Frequency Limits typed settings and publication" begin
    auto = SA.AutomaticSignalSpectrumFrequencyLimits()
    explicit = SA.ExplicitSignalSpectrumFrequencyLimits(10, 100)
    @test SA.signal_spectrum_frequency_limits_payload(auto) === nothing
    @test SA.signal_spectrum_frequency_limits_payload(explicit) == Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(1, 1)
    @test_throws ArgumentError SA.ExplicitSignalSpectrumFrequencyLimits(NaN, 1)

    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    state = SA.default_signal_analyser_state()
    legacy_bind_active_test_pane!(state)
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrum_settings"] == Dict("scale" => "db", "frequency_scale" => "linear", "leakage" => 0.5, "frequency_limits" => nothing)
    @test initial["plots"]["spectrum"]["frequency_limits"]["mode"] == "auto"
    @test initial["plots"]["spectrum"]["frequency_limits"]["requested"] === nothing
    @test isempty(SA.SPECTRUM_CALLS)
    settings_service = SA.SignalSettingsService()
    before = SA.signal_analyser_snapshot(state)
    @test_throws SA.SignalSettingApiTypeError SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => true,
    ))
    @test SA.signal_analyser_snapshot(state) == before
    explicit_payload = Dict("min_hz" => 10.0, "max_hz" => 100.0, "units" => "Hz")
    draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => Dict("min" => 10.0, "max" => 100.0),
    ))
    applied = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test applied["success"] === true
    applied_snapshot = SA.signal_analyser_snapshot(state)
    @test applied_snapshot["spectrum_settings"]["frequency_limits"] == explicit_payload
    # Apply publishes requested intent only.  The effective provider range is
    # unknown until the normal active Spectrum output is materialized.
    @test applied_snapshot["plots"]["spectrum"]["frequency_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => nothing)
    @test isempty(SA.SPECTRUM_CALLS)
    spectrum_view = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrum"))
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    spectrum_output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test spectrum_output["isready"] === true && spectrum_output["success"] === true
    @test only(spectrum_output["data"])["data"][1]["x"] == [10.0, 100.0]
    @test all(query -> query.frequency_limits == SA.ExplicitSignalSpectrumFrequencyLimits(10, 100), SA.SPECTRUM_CALLS)
    @test SA.signal_analyser_snapshot(state)["plots"]["spectrum"]["frequency_limits"] == Dict(
        "mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload,
    )

    # Requested limits validate against the analysis source, then each
    # secondary trace receives its own topology intersection.  No overlap is
    # a typed empty trace, never an invalid provider call.
    primary = SA.AnalysedSignal("primary", "#111111", 100.0, ComplexF64[1, 2, 3], false, true)
    secondary = SA.AnalysedSignal("secondary", "#222222", 10.0, ComplexF64[1, 2, 3], false, true)
    mixed = SA.SignalAnalyserState(SA.AnalysedSignal[primary, secondary],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "primary"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    legacy_bind_active_test_pane!(mixed)
    SA.signal_analyser_snapshot(mixed)
    empty!(SA.SPECTRUM_CALLS)
    mixed_settings = SA.SignalSettingsService()
    mixed_draft = SA.apply_signal_setting!(mixed_settings, mixed, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => Dict("min" => 10.0, "max" => 20.0),
    ))
    @test SA.apply_signal_settings!(mixed_settings, mixed, Dict(
        "state_revision" => mixed_draft["state"]["state_revision"], "display_id" => "display-1",
    ))["success"] === true
    @test isempty(SA.SPECTRUM_CALLS)
    SA.apply_signal_analyser_view!(mixed, Dict("state_revision" => mixed.view.state_revision, "active_plot" => "spectrum"))
    mixed_pane = mixed.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(mixed, "display-1", mixed_pane)
    task = mixed.output_manager.active_task
    task === nothing || wait(task)
    mixed_result = SA.signal_analyser_active_output(mixed, "display-1", mixed_pane)
    @test mixed_result["success"] === true
    @test length(SA.SPECTRUM_CALLS) == 1
    @test only(SA.SPECTRUM_CALLS).signal_name == "primary"
    @test only(mixed_result["data"])["data"][2]["x"] == Float64[]

    # A carried explicit intent follows a source change only while it remains
    # wholly valid for the new analysis-source topology; invalid carry resets
    # to Auto in the same single revision.
    broad = SA.AnalysedSignal("broad", "#333333", 50.0, ComplexF64[1, 2, 3], false, true)
    narrow = SA.AnalysedSignal("narrow", "#444444", 20.0, ComplexF64[1, 2, 3], false, true)
    transitions = SA.SignalAnalyserState(SA.AnalysedSignal[primary, broad, narrow],
        SA.SignalAnalyserViewState(0, SA.TIME_PLOT, "primary"), Dict{String,Dict{String,Any}}(), ReentrantLock())
    legacy_bind_active_test_pane!(transitions)
    transition_settings = SA.SignalSettingsService()
    carried_draft = SA.apply_signal_setting!(transition_settings, transitions, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrum.frequency_limits", "value" => Dict("min" => 10.0, "max" => 20.0),
    ))
    @test SA.apply_signal_settings!(transition_settings, transitions, Dict(
        "state_revision" => carried_draft["state"]["state_revision"], "display_id" => "display-1",
    ))["success"] === true
    carried = SA.signal_analyser_snapshot(transitions)
    preserved = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => transitions.view.state_revision, "analysis_signal" => "broad"))
    @test preserved["spectrum_settings"]["frequency_limits"] == carried["spectrum_settings"]["frequency_limits"]
    reset = SA.apply_signal_analyser_view!(transitions, Dict("state_revision" => transitions.view.state_revision, "analysis_signal" => "narrow"))
    @test reset["spectrum_settings"]["frequency_limits"] === nothing
end

@testset "Cascade 11 typed Spectrogram query and raw-data invariants" begin
    real_query = SA.SignalSpectrogramQuery("real", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    complex_query = SA.SignalSpectrogramQuery("complex", ComplexF64[1 + 2im, 3 + 4im], 10.0, SA.CENTERED_TWO_SIDED_SPECTRUM)
    @test real_query.values == ComplexF64[1, 2]
    @test complex_query.values == ComplexF64[1 + 2im, 3 + 4im]
    @test SA.SignalSpectrogramCacheKey(real_query) != SA.SignalSpectrogramCacheKey(complex_query)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("one", [1.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("bad", [NaN, 1.0], 10.0, SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramQuery("rate", [1.0, 2.0], 0.0, SA.ONE_SIDED_SPECTRUM)
    owned_samples = ComplexF64[1, 2]
    owned_query = SA.SignalSpectrogramQuery("owned", owned_samples, 10.0, SA.ONE_SIDED_SPECTRUM)
    owned_samples[1] = 99
    @test owned_query.values[1] == 1

    data = SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test size(data.power) == (2, 2)
    @test collect(data.frequencies_hz) == [0.0, 5.0]
    zero_plot = SA.signal_analyser_spectrogram_plot(data)
    @test zero_plot["z"][1][1] == -Inf
    @test SA.json_safe(zero_plot)["z"][1][1] === nothing
    dense_axis = collect(0.0:160.0)
    dense_power = reshape(collect(0.0:(161 * 161 - 1)), 161, 161)
    dense_data = SA.SignalSpectrogramData(dense_axis, dense_axis, dense_power, SA.ONE_SIDED_SPECTRUM)
    dense_plot = SA.signal_analyser_spectrogram_plot(dense_data)
    @test size(dense_data.power) == (161, 161)
    @test length(dense_plot["x"]) == 160 && length(dense_plot["y"]) == 160
    @test length(dense_plot["z"]) == 160 && all(row -> length(row) == 160, dense_plot["z"])
    @test_throws DimensionMismatch SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 1.0 2.0; 3.0 4.0 5.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([5.0, 0.0], [0.1, 0.2], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.2, 0.1], [0.0 1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], [0.0 -1.0; 4.0 9.0], SA.ONE_SIDED_SPECTRUM)
    @test_throws ArgumentError SA.SignalSpectrogramData([0.0, 5.0], [0.1, 0.2], ComplexF64[0 1; 4 9im], SA.ONE_SIDED_SPECTRUM)
    mismatch = InvalidSpectrogramProvider(SA.SignalSpectrogramData([-5.0, 5.0], [0.0, 0.1], [1.0 2.0; 3.0 4.0], SA.CENTERED_TWO_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(mismatch), real_query)
    outside_time = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.2], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(outside_time), real_query)
    short_center = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.15], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(short_center), real_query).segment_centers_s[end] == 0.15
    beyond_short_center = InvalidSpectrogramProvider(SA.SignalSpectrogramData([0.0, 5.0], [0.0, 0.16], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(beyond_short_center), real_query)
    outside_frequency = InvalidSpectrogramProvider(SA.SignalSpectrogramData([-1.0, 5.0], [0.0, 0.1], [1.0 2.0; 3.0 4.0], SA.ONE_SIDED_SPECTRUM))
    @test_throws ArgumentError SA.signal_spectrogram_calculate(SA.SignalSpectrogramService(outside_frequency), real_query)

    empty!(SA.SPECTROGRAM_CALLS)
    state = p0_measurement_state()
    legacy_bind_active_test_pane!(state)
    first = SA.signal_analyser_snapshot(state)
    @test isempty(SA.SPECTROGRAM_CALLS)
    @test isempty(state.spectrogram_cache)
    spectrogram_view = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => first["state_revision"], "active_plot" => "spectrogram",
    ))
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    first_output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test spectrogram_view["active_plot"] == "spectrogram"
    @test first_output["isready"] === true && first_output["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == 1
    @test only(SA.SPECTROGRAM_CALLS).topology == SA.ONE_SIDED_SPECTRUM
    @test only(SA.SPECTROGRAM_CALLS).values == state.signals[1].values
    @test size(only(values(state.spectrogram_cache)).power) == (2, 2)
    @test only(only(first_output["data"])["data"])["z"] == [
        [0.0, 10 * log10(4.0)], [10 * log10(9.0), 10 * log10(16.0)],
    ]
    SA.signal_analyser_snapshot(state)
    @test length(SA.SPECTROGRAM_CALLS) == 1
    second = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision, "analysis_signal" => "raw-complex",
    ))
    @test length(SA.SPECTROGRAM_CALLS) == 1
    @test isempty(second["plots"]["spectrogram"]["z"])
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    second_output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test second_output["isready"] === true && second_output["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == 2
    @test SA.SPECTROGRAM_CALLS[2].topology == SA.CENTERED_TWO_SIDED_SPECTRUM
    @test any(value -> imag(value) != 0.0, SA.SPECTROGRAM_CALLS[2].values)
    @test only(only(second_output["data"])["data"])["z"] == [
        [0.0, 10 * log10(4.0)], [10 * log10(9.0), 10 * log10(16.0)],
    ]

    last_good_page_id = state.output_manager.active_page_id
    last_good_output = state.output_manager.plot_cache[last_good_page_id]
    # Retain the rendered last-good page, but remove its raw provider cache so
    # the next active request reaches the deterministic failing provider.
    empty!(state.spectrogram_cache)
    failed_view = SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision, "analysis_signal" => "raw-real",
    ))
    @test failed_view["analysis_signal"] == "raw-real"
    @test isempty(SA.SPECTROGRAM_CALLS[3:end])
    # The accepted source mutation is provider-free; arm the deterministic
    # provider only for the subsequent active-output materialization.
    SA.SPECTROGRAM_FAILURE[] = true
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    failed_output = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test failed_output["isready"] === true && failed_output["success"] === false
    @test occursin("Spectrogram provider failure", failed_output["error"])
    @test length(SA.SPECTROGRAM_CALLS) == 3
    @test SA.signal_analyser_snapshot(state)["analysis_signal"] == "raw-real"
    @test state.view.state_revision == failed_view["state_revision"] + 1
    @test state.output_manager.plot_cache[last_good_page_id] === last_good_output
    @test isempty(state.spectrogram_cache)
    SA.SPECTROGRAM_FAILURE[] = false
end

@testset "Cascade 13 typed Spectrogram settings invariants" begin
    @test SA.SignalSpectrogramSettings().overlap_percent == 50.0 && SA.SignalSpectrogramSettings().leakage == 0.5
    @test SA.SignalSpectrogramSettings(0, 0).overlap_percent == 0.0 && SA.SignalSpectrogramSettings(0, 0).leakage == 0.0
    @test SA.SignalSpectrogramSettings(75, 1).overlap_percent == 75.0 && SA.SignalSpectrogramSettings(75, 1).leakage == 1.0
    @test SA.SignalSpectrogramSettings(50, -0.0).leakage == 0.0 && !signbit(SA.SignalSpectrogramSettings(50, -0.0).leakage)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(75.1, 0.5)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(-1, 0.5)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, 1.1)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, -0.1)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, Inf)
    @test_throws ArgumentError SA.SignalSpectrogramSettings(50, true)
    query_50 = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 0.5)
    query_overlap = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 75.0, 0.5)
    query_leakage = SA.SignalSpectrogramQuery("leakage", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 1.0)
    @test query_50.overlap_percent == 50.0 && query_50.leakage == 0.5
    @test SA.SignalSpectrogramCacheKey(query_50) != SA.SignalSpectrogramCacheKey(query_overlap)
    @test SA.SignalSpectrogramCacheKey(query_50) != SA.SignalSpectrogramCacheKey(query_leakage)
    negative_zero_key = SA.SignalSpectrogramCacheKey(SA.SignalSpectrogramQuery("leakage-zero", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, -0.0))
    positive_zero_key = SA.SignalSpectrogramCacheKey(SA.SignalSpectrogramQuery("leakage-zero", [1.0, 2.0], 10.0, SA.ONE_SIDED_SPECTRUM, 50.0, 0.0))
    @test negative_zero_key == positive_zero_key
    @test isequal(negative_zero_key, positive_zero_key)
    @test hash(negative_zero_key) == hash(positive_zero_key)
    zero_key_dict = Dict(negative_zero_key => :canonical)
    @test zero_key_dict[positive_zero_key] == :canonical
    state = SA.default_signal_analyser_state()
    SA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "active_plot" => "spectrogram",
    ))
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    settings_service = SA.SignalSettingsService()
    invalid = explicit_calculation_failure!(state, settings_service, "spectrogram.overlap_percent", 75.1)
    @test invalid["success"] === false
    @test SA.signal_analyser_snapshot(state)["spectrogram_settings"] == initial["spectrogram_settings"]
    changed = explicit_calculation_snapshot!(state, settings_service, "spectrogram.overlap_percent", 75.0)
    @test changed["spectrogram_settings"] == Dict("overlap_percent" => 75.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
end

@testset "Cascade 13 Leakage-only mutation never rebuilds Spectrum cache" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    empty!(SA.SPECTRUM_CALLS)
    state = SA.default_signal_analyser_state()
    legacy_bind_active_test_pane!(state)
    empty!(state.spectrum_cache)
    empty!(state.spectrogram_cache)
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)

    settings_service = SA.SignalSettingsService()
    changed = explicit_calculation_snapshot!(state, settings_service, "spectrogram.leakage", 1.0)
    @test changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test isempty(SA.SPECTROGRAM_CALLS)
    @test isempty(SA.SPECTRUM_CALLS)
    @test isempty(state.spectrum_cache)
    @test isempty(state.spectrogram_cache)
    SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrogram"))
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    @test SA.signal_analyser_active_output(state, "display-1", pane_id)["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == 1
end

@testset "Cascade 13 equal Spectrogram settings are cold-cache no-op" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)
    state = SA.default_signal_analyser_state()
    legacy_bind_active_test_pane!(state)
    empty!(state.spectrum_cache)
    empty!(state.spectrogram_cache)
    empty!(SA.SPECTRUM_CALLS)
    empty!(SA.SPECTROGRAM_CALLS)

    settings_service = SA.SignalSettingsService()
    no_op_update = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "spectrogram.overlap_percent", "value" => 50.0,
    ))
    @test Set(keys(no_op_update)) == Set(["settings", "state"])
    no_op = no_op_update["state"]
    @test no_op["state_revision"] == 0
    @test no_op["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test isempty(SA.SPECTRUM_CALLS) && isempty(state.spectrum_cache)
    @test isempty(SA.SPECTROGRAM_CALLS) && isempty(state.spectrogram_cache)
    @test !haskey(no_op, "plots") && !haskey(no_op, "plot_payload")

    # Only the passive snapshot carries typed empty plot placeholders; a
    # setting-update envelope deliberately contains settings/state only.
    passive = SA.signal_analyser_snapshot(state)
    @test passive["plots"]["spectrum"]["type"] == "line"
    @test passive["plots"]["spectrum"]["x"] isa Vector{Float64} && passive["plots"]["spectrum"]["y"] isa Vector{Float64}
    @test isempty(passive["plots"]["spectrum"]["x"]) && isempty(passive["plots"]["spectrum"]["y"])
    @test passive["plots"]["spectrogram"]["type"] == "heatmap"
    @test passive["plots"]["spectrogram"]["x"] isa Vector{Float64} && passive["plots"]["spectrogram"]["y"] isa Vector{Float64} && passive["plots"]["spectrogram"]["z"] isa Vector{Vector{Float64}}
    @test isempty(passive["plots"]["spectrogram"]["x"]) && isempty(passive["plots"]["spectrogram"]["y"]) && isempty(passive["plots"]["spectrogram"]["z"])
    @test Set(keys(passive["plot_payload"])) == Set(["selected_signal", "visible_signals", "time_traces", "spectrum_traces", "spectrogram", "persistence"])

    SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrogram"))
    pane_id = state.display_layouts["display-1"].active_pane_id
    SA.signal_analyser_active_output(state, "display-1", pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    materialized = SA.signal_analyser_active_output(state, "display-1", pane_id)
    @test materialized["state_revision"] == 2
    @test materialized["isready"] === true && materialized["success"] === true
    @test !isempty(only(materialized["data"])["data"])
    @test isempty(SA.SPECTRUM_CALLS) && isempty(state.spectrum_cache)
    @test length(SA.SPECTROGRAM_CALLS) == 1 && length(state.spectrogram_cache) == 1
    materialized_snapshot = SA.signal_analyser_snapshot(state)
    assert_line_plot(materialized_snapshot["plots"]["spectrum"])
    assert_heatmap_plot(materialized_snapshot["plots"]["spectrogram"])

    # Repeating the equal field update is a no-op even after a cold cache has
    # been materialized: no draft, revision, provider call, or cache churn.
    calls_after_materialization = length(SA.SPECTROGRAM_CALLS)
    cache_after_materialization = deepcopy(state.spectrogram_cache)
    repeated_update = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrogram.overlap_percent", "value" => 50.0,
    ))
    @test repeated_update["state"]["state_revision"] == materialized["state_revision"]
    @test length(SA.SPECTROGRAM_CALLS) == calls_after_materialization
    @test state.spectrogram_cache == cache_after_materialization
end

@testset "Cascade 13 Spectrogram settings mutation, cache and display lifecycle" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    SA.SPECTROGRAM_FAILURE[] = false
    state = SA.test_state_with_complex_signal()
    first_name, second_name = [signal.name for signal in state.signals]
    initial = SA.signal_analyser_snapshot(state)
    @test all(display -> display["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing), initial["displays"])
    @test isempty(SA.SPECTROGRAM_CALLS)
    calls_at_default = length(SA.SPECTROGRAM_CALLS)

    for invalid in (
        nothing,
        "50",
        Dict{String,Any}(),
        Dict("overlap_percent" => 50.0),
        Dict("leakage" => 0.5),
        Dict("overlap_percent" => true, "leakage" => 0.5),
        Dict("overlap_percent" => 50.0, "leakage" => true),
        Dict("overlap_percent" => 50.0, "leakage" => NaN),
        Dict("overlap_percent" => 50.0, "leakage" => Inf),
        Dict("overlap_percent" => 50.0, "leakage" => -0.1),
        Dict("overlap_percent" => 50.0, "leakage" => 1.1),
        Dict("overlap_percent" => NaN, "leakage" => 0.5),
        Dict("overlap_percent" => 75.1, "leakage" => 0.5),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "extra" => 1),
    )
        error = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => invalid))
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrogram_settings")
        @test SA.signal_analyser_snapshot(state) == initial
        @test length(SA.SPECTROGRAM_CALLS) == calls_at_default
    end

    overlap_75 = Dict("overlap_percent" => 75.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    settings_service = SA.SignalSettingsService()
    draft = SA.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => state.view.state_revision, "display_id" => "display-1",
        "field_id" => "spectrogram.overlap_percent", "value" => 75.0,
    ))
    updated_apply = SA.apply_signal_settings!(settings_service, state, Dict(
        "state_revision" => draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test updated_apply["success"] === true
    updated = SA.signal_analyser_snapshot(state)
    @test updated["spectrogram_settings"] == overlap_75
    @test updated["displays"][1]["spectrogram_settings"] == overlap_75
    @test isempty(SA.SPECTROGRAM_CALLS)
    calls_at_75 = 0

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    selected_first = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    @test selected_first["spectrogram_settings"] == overlap_75
    selected_second = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-2"))
    @test selected_second["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)

    calls_before_clear = length(SA.SPECTROGRAM_CALLS)
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_clear
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [first_name]))
    @test readded["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    # Re-adding visibility is passive; the normal active-output failure path
    # below is the sole owner of any subsequent provider materialization.
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_clear
    changed_signal = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [first_name, second_name], "analysis_signal" => second_name))
    @test changed_signal["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)

    before_failure = SA.signal_analyser_snapshot(state)
    last_good_cache = deepcopy(state.output_manager.plot_cache)
    SA.SPECTROGRAM_FAILURE[] = true
    failure_draft = SA.apply_signal_setting!(settings_service, state, Dict("state_revision" => state.view.state_revision, "display_id" => "display-2", "field_id" => "spectrogram.leakage", "value" => 0.0))
    failure_apply = SA.apply_signal_settings!(settings_service, state, Dict("state_revision" => failure_draft["state"]["state_revision"], "display_id" => "display-2"))
    @test failure_apply["success"] === true
    SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "active_plot" => "spectrogram"))
    pane_id = state.display_layouts["display-2"].active_pane_id
    SA.signal_analyser_active_output(state, "display-2", pane_id)
    task = state.output_manager.active_task; task === nothing || wait(task)
    failure = SA.signal_analyser_active_output(state, "display-2", pane_id)
    @test failure["success"] === false
    @test state.output_manager.plot_cache == last_good_cache
    SA.SPECTROGRAM_FAILURE[] = false
    @test state.displays[2].spectrogram_settings.leakage == 0.0
end

@testset "Cascade 13 Leakage cache identity and Spectrum independence" begin
    SA.reset_pspectrum_double!()
    empty!(SA.SPECTROGRAM_CALLS)
    empty!(SA.SPECTRUM_CALLS)
    SA.SPECTROGRAM_FAILURE[] = false
    SA.SPECTRUM_FAILURE[] = false
    state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(state)
    first_name, second_name = [signal.name for signal in state.signals]
    initial = SA.signal_analyser_snapshot(state)
    @test initial["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    # Passive snapshots never call a provider.  The sole initial materializer
    # is the active-output request, which establishes the default raw key.
    @test isempty(SA.SPECTROGRAM_CALLS) && isempty(SA.SPECTRUM_CALLS)
    @test materialize_active_output!(state; plot = "spectrogram")["success"] === true
    initial_spectrogram_calls, initial_spectrum_calls = length(SA.SPECTROGRAM_CALLS), length(SA.SPECTRUM_CALLS)

    leakage_zero = Dict("overlap_percent" => 50.0, "leakage" => -0.0, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    settings_service = SA.SignalSettingsService()
    changed = explicit_calculation_snapshot!(state, settings_service, "spectrogram.leakage", -0.0)
    @test changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.0, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test !signbit(changed["spectrogram_settings"]["leakage"])
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls
    @test length(SA.SPECTRUM_CALLS) == initial_spectrum_calls
    @test materialize_active_output!(state)["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls + 1

    restored = explicit_calculation_snapshot!(state, settings_service, "spectrogram.leakage", 0.5)
    @test restored["state_revision"] == state.view.state_revision
    @test materialize_active_output!(state)["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == initial_spectrogram_calls + 1 # default raw cache is reused
    @test length(SA.SPECTRUM_CALLS) == initial_spectrum_calls

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    @test selected_a["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    leaked_a = explicit_calculation_snapshot!(state, settings_service, "spectrogram.leakage", 1.0)
    @test leaked_a["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 1.0, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    selected_b = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-2"))
    @test selected_b["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    calls_before_readd = length(SA.SPECTROGRAM_CALLS)
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [first_name]))
    @test readded["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_readd # passive view remains cold
    @test materialize_active_output!(state; plot = "spectrogram")["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == calls_before_readd # raw cache is reused
    source_changed = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [first_name, second_name], "analysis_signal" => second_name))
    @test source_changed["spectrogram_settings"] == Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)

    before_failure = SA.signal_analyser_snapshot(state)
    # Plot-cache entries have no structural equality; retain their observable
    # context and payload rather than their allocation identity.
    cache_signature(cache) = Dict(
        page_id => (entry.context, deepcopy(entry.plots))
        for (page_id, entry) in cache
    )
    last_good_cache = cache_signature(state.output_manager.plot_cache)
    SA.SPECTROGRAM_FAILURE[] = true
    failure_draft = SA.apply_signal_setting!(settings_service, state, Dict("state_revision" => state.view.state_revision, "display_id" => state.active_display_id, "field_id" => "spectrogram.leakage", "value" => 0.0))
    @test SA.apply_signal_settings!(settings_service, state, Dict("state_revision" => failure_draft["state"]["state_revision"], "display_id" => state.active_display_id))["success"] === true
    failure = materialize_active_output!(state; plot = "spectrogram")
    @test failure["success"] === false
    @test cache_signature(state.output_manager.plot_cache) == last_good_cache
    SA.SPECTROGRAM_FAILURE[] = false
    @test SA.signal_analyser_snapshot(state)["spectrogram_settings"]["leakage"] == 0.0
end

@testset "Cascade 16 Spectrogram Frequency Scale exact state, metadata and cache isolation" begin
    linear = SA.LINEAR_SPECTROGRAM_FREQUENCY_SCALE
    log = SA.LOG_SPECTROGRAM_FREQUENCY_SCALE
    default = SA.SignalSpectrogramSettings()
    @test default.frequency_scale == linear
    @test SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), linear) == default
    @test SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log) != default
    @test SA.signal_spectrogram_provider_settings_equal(default, SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log))

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(state)
    settings_service = SA.SignalSettingsService()
    baseline = SA.signal_analyser_snapshot(state)
    exact_linear = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    exact_log = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "log", "power_limits" => nothing)
    @test baseline["spectrogram_settings"] == exact_linear
    @test baseline["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "linear", "effective" => "linear", "available" => ["linear", "log"])

    for bad in (
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => nothing),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "Linear"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "LOG"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "octave"),
        Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "extra" => true),
    )
        error = try
            SA.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "spectrogram_settings" => bad))
            nothing
        catch caught
            caught
        end
        @test error isa SA.SignalAnalyserValidationError
        @test haskey(error.fields, "spectrogram_settings")
        @test SA.signal_analyser_snapshot(state) == baseline
    end

    # Scale alone advances one revision, preserves raw cache/provider identity, and yields typed-empty data when cold.
    empty!(state.spectrum_cache); empty!(state.spectrogram_cache); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    changed = immediate_setting_snapshot!(state, settings_service, "spectrogram.frequency_scale", "log")
    @test changed["state_revision"] == 1 && changed["spectrogram_settings"] == exact_log
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(state.spectrum_cache) && isempty(state.spectrogram_cache)
    # Immediate field responses contain settings/state only; passive snapshots
    # own presentation metadata and typed-empty cold plot placeholders.
    changed_snapshot = SA.signal_analyser_snapshot(state)
    @test changed_snapshot["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    @test changed_snapshot["plots"]["spectrogram"]["x"] == Float64[] && changed_snapshot["plots"]["spectrogram"]["y"] == Float64[] && changed_snapshot["plots"]["spectrogram"]["z"] == Vector{Vector{Float64}}()
    @test immediate_setting_snapshot!(state, settings_service, "spectrogram.frequency_scale", "log")["state_revision"] == 1
    @test materialize_active_output!(state; plot = "spectrogram")["success"] === true
    materialized_log = SA.signal_analyser_snapshot(state)
    calls_after_get = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS))
    raw_cache_after_get = (length(state.spectrum_cache), length(state.spectrogram_cache))
    back_to_linear = immediate_setting_snapshot!(state, settings_service, "spectrogram.frequency_scale", "linear")
    # Switching to the active Spectrogram pane and publishing its first output
    # consumed revisions 2 and 3; this immediate presentation change is 4.
    @test back_to_linear["state_revision"] == 4
    @test (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS)) == calls_after_get
    @test (length(state.spectrum_cache), length(state.spectrogram_cache)) == raw_cache_after_get
    back_to_linear_snapshot = SA.signal_analyser_snapshot(state)
    @test back_to_linear_snapshot["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "linear", "effective" => "linear", "available" => ["linear", "log"])
    @test back_to_linear_snapshot["plots"]["spectrogram"]["x"] == materialized_log["plots"]["spectrogram"]["x"]
    @test back_to_linear_snapshot["plots"]["spectrogram"]["y"] == materialized_log["plots"]["spectrogram"]["y"]
    @test back_to_linear_snapshot["plots"]["spectrogram"]["z"] == materialized_log["plots"]["spectrogram"]["z"]

    # A/B are independent; Clear preserves requested intent; source topology changes only effective metadata.
    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == exact_linear
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    relogged = immediate_setting_snapshot!(state, settings_service, "spectrogram.frequency_scale", "log")
    selected_b = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-2"))
    @test selected_a["spectrogram_settings"] == exact_linear && relogged["spectrogram_settings"] == exact_log && selected_b["spectrogram_settings"] == exact_linear
    source_real, source_complex = state.signals[1].name, state.signals[2].name
    selected_a = SA.apply_signal_analyser_display!(state, Dict("state_revision" => state.view.state_revision, "operation" => "select", "display_id" => "display-1"))
    centered = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "analysis_signal" => source_complex))
    @test centered["spectrogram_settings"] == exact_log
    @test centered["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "linear", "available" => ["linear"])
    restored = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "analysis_signal" => source_real))
    @test restored["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == exact_log
    @test cleared["plots"]["spectrogram"]["frequency_scale"] == Dict("requested" => "log", "effective" => nothing, "available" => String[])

    # A combined presentation/provider mutation delegates only for the provider field, never Spectrum.
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision, "visible_signals" => [source_real]))
    before_combined = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS))
    combined = Dict("overlap_percent" => 25.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    combined_draft = SA.apply_signal_setting!(settings_service, state, Dict("state_revision" => state.view.state_revision, "display_id" => state.active_display_id, "field_id" => "spectrogram.overlap_percent", "value" => 25.0))
    @test SA.apply_signal_settings!(settings_service, state, Dict("state_revision" => combined_draft["state"]["state_revision"], "display_id" => state.active_display_id))["success"] === true
    immediate_setting_snapshot!(state, settings_service, "spectrogram.frequency_scale", "linear")
    @test length(SA.SPECTRUM_CALLS) == before_combined[1]
    @test length(SA.SPECTROGRAM_CALLS) == before_combined[2]
    @test materialize_active_output!(state; plot = "spectrogram")["success"] === true
    @test length(SA.SPECTROGRAM_CALLS) == before_combined[2] + 1
    stale = try SA.apply_signal_analyser_view!(state, Dict("state_revision" => state.view.state_revision - 1, "active_plot" => "spectrum")); nothing catch caught; caught end
    @test stale isa SA.SignalAnalyserStaleStateError

    short = SA.AnalysedSignal("c16-short", "#111111", 10.0, ComplexF64[1, 2], false, true)
    @test SA.signal_spectrogram_frequency_scale_metadata(SA.SignalSpectrogramSettings(50, 0.5, SA.AutomaticSignalSpectrumFrequencyLimits(), log), short) == Dict("requested" => "log", "effective" => "log", "available" => ["linear", "log"])
    short_calls = length(SA.SPECTROGRAM_CALLS)
    SA.signal_spectrogram_data(SA.SignalSpectrogramService(SA.EngeeDSPSpectrogramProvider()), short)
    @test length(SA.SPECTROGRAM_CALLS) == short_calls + 1
end

@testset "Cascade 17 Spectrogram Power Limits are presentation-only and full-raw" begin
    auto = SA.AutomaticSignalSpectrogramPowerLimits()
    explicit = SA.ExplicitSignalSpectrogramPowerLimits(-80, -20)
    @test SA.signal_spectrogram_power_limits_payload(auto) === nothing
    @test SA.signal_spectrogram_power_limits_payload(explicit) == Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB")
    @test !signbit(SA.ExplicitSignalSpectrogramPowerLimits(-0.0, 1).min_db)
    @test_throws ArgumentError SA.ExplicitSignalSpectrogramPowerLimits(true, 1)
    @test_throws ArgumentError SA.ExplicitSignalSpectrogramPowerLimits(-Inf, 1)
    @test_throws ArgumentError SA.ExplicitSignalSpectrogramPowerLimits(1, 1)
    @test_throws ArgumentError SA.ExplicitSignalSpectrogramPowerLimits(1, -1)

    # Extrema must include a finite raw cell beyond the 160×160 wire envelope.
    power = fill(1.0, 161, 161); power[81, 81] = 1e-12; power[81, 80] = 1e3; power[2, 2] = 0.0
    raw = SA.SignalSpectrogramData(collect(0.0:160.0), collect(0.0:160.0), power, SA.ONE_SIDED_SPECTRUM)
    projection = SA.SignalSpectrogramPowerProjection(raw)
    @test projection.finite_extent == SA.SignalSpectrogramPowerExtent(-120, 30)
    @test projection.values_db[2, 2] == -Inf
    _, _, bounded_db = SA.signal_analyser_bounded_heatmap(collect(raw.segment_centers_s), collect(raw.frequencies_hz), projection.values_db)
    @test !any(value -> value == -120.0 || value == 30.0, bounded_db)
    @test SA.signal_spectrogram_power_limits_metadata(SA.SignalSpectrogramSettings(50, .5, SA.AutomaticSignalSpectrumFrequencyLimits(), SA.LINEAR_SPECTROGRAM_FREQUENCY_SCALE, auto), raw) == Dict("mode" => "auto", "requested" => nothing, "effective" => Dict("min_db" => -120.0, "max_db" => 30.0, "units" => "dB"), "rendered" => Dict("min" => -120.0, "max" => 30.0, "units" => "dB"))
    @test SA.signal_spectrogram_power_limits_metadata(SA.SignalSpectrogramSettings(50, .5, SA.AutomaticSignalSpectrumFrequencyLimits(), SA.LINEAR_SPECTROGRAM_FREQUENCY_SCALE, explicit), raw) == Dict("mode" => "explicit", "requested" => Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB"), "effective" => Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB"), "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
    zero = SA.SignalSpectrogramData([0.0], [0.0], zeros(1, 1), SA.ONE_SIDED_SPECTRUM)
    constant = SA.SignalSpectrogramData([0.0], [0.0], fill(0.01, 1, 1), SA.ONE_SIDED_SPECTRUM)
    mixed = SA.SignalSpectrogramData([0.0, 1.0], [0.0], reshape([0.0, 0.01], 2, 1), SA.ONE_SIDED_SPECTRUM)
    @test SA.SignalSpectrogramPowerProjection(zero).finite_extent === nothing
    @test SA.SignalSpectrogramPowerProjection(constant).finite_extent == SA.SignalSpectrogramPowerExtent(-20, -20)
    @test SA.SignalSpectrogramPowerProjection(mixed).finite_extent == SA.SignalSpectrogramPowerExtent(-20, -20)

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    state = SA.test_state_with_complex_signal()
    legacy_bind_active_test_pane!(state)
    settings_service = SA.SignalSettingsService()
    initial = SA.signal_analyser_snapshot(state)
    auto_settings = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => nothing)
    explicit_payload = Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB")
    explicit_settings = merge(copy(auto_settings), Dict("power_limits" => explicit_payload))
    # A presentation-only C17 change stays cold; the next GET owns materialization.
    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    cold = SA.default_signal_analyser_state()
    legacy_bind_active_test_pane!(cold)
    empty!(cold.spectrum_cache); empty!(cold.spectrogram_cache); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    cold_settings = SA.SignalSettingsService()
    cold_changed = immediate_setting_snapshot!(cold, cold_settings, "spectrogram.power_limits", Dict("min" => -80.0, "max" => -20.0))
    @test cold_changed["state_revision"] == 1 && cold_changed["spectrogram_settings"] == explicit_settings
    cold_snapshot = SA.signal_analyser_snapshot(cold)
    @test cold_snapshot["plots"]["spectrogram"]["x"] == Float64[]
    @test cold_snapshot["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(cold.spectrum_cache) && isempty(cold.spectrogram_cache)
    @test immediate_setting_snapshot!(cold, cold_settings, "spectrogram.power_limits", Dict("min" => -80.0, "max" => -20.0))["state_revision"] == 1
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(cold.spectrum_cache) && isempty(cold.spectrogram_cache)
    SA.signal_analyser_snapshot(cold)
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(cold.spectrum_cache) && isempty(cold.spectrogram_cache)
    cold_output = materialize_active_output!(cold; plot = "spectrogram")
    @test cold_output["success"] === true
    @test isempty(SA.SPECTRUM_CALLS) && length(SA.SPECTROGRAM_CALLS) == 1 && isempty(cold.spectrum_cache) && length(cold.spectrogram_cache) == 1
    cold_materialized = SA.signal_analyser_snapshot(cold)
    @test !isempty(cold_materialized["plots"]["spectrogram"]["z"])
    @test cold_materialized["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))

    SA.reset_pspectrum_double!(); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    combined_cold = SA.default_signal_analyser_state()
    legacy_bind_active_test_pane!(combined_cold)
    empty!(combined_cold.spectrum_cache); empty!(combined_cold.spectrogram_cache); empty!(SA.SPECTRUM_CALLS); empty!(SA.SPECTROGRAM_CALLS)
    combined_settings = Dict("overlap_percent" => 25.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear", "power_limits" => explicit_payload)
    combined_service = SA.SignalSettingsService()
    combined_draft = SA.apply_signal_setting!(combined_service, combined_cold, Dict("state_revision" => 0, "display_id" => "display-1", "field_id" => "spectrogram.overlap_percent", "value" => 25.0))
    @test SA.apply_signal_settings!(combined_service, combined_cold, Dict("state_revision" => combined_draft["state"]["state_revision"], "display_id" => "display-1"))["success"] === true
    combined_changed = immediate_setting_snapshot!(combined_cold, combined_service, "spectrogram.power_limits", Dict("min" => -80.0, "max" => -20.0))
    @test combined_changed["state_revision"] == 3 && combined_changed["spectrogram_settings"] == combined_settings
    combined_snapshot = SA.signal_analyser_snapshot(combined_cold)
    @test combined_snapshot["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
    @test isempty(SA.SPECTRUM_CALLS) && isempty(SA.SPECTROGRAM_CALLS) && isempty(combined_cold.spectrum_cache) && isempty(combined_cold.spectrogram_cache)
    @test materialize_active_output!(combined_cold; plot = "spectrogram")["success"] === true
    @test isempty(SA.SPECTRUM_CALLS) && length(SA.SPECTROGRAM_CALLS) == 1 && isempty(combined_cold.spectrum_cache) && length(combined_cold.spectrogram_cache) == 1
    @test initial["spectrogram_settings"] == auto_settings
    @test initial["plots"]["spectrogram"]["power_limits"]["mode"] == "auto"
    @test initial["plots"]["spectrogram"]["power_limits"]["effective"] === nothing
    calls_before = (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS), length(state.spectrum_cache), length(state.spectrogram_cache))
    xyz_before = (initial["plots"]["spectrogram"]["x"], initial["plots"]["spectrogram"]["y"], initial["plots"]["spectrogram"]["z"])
    changed = immediate_setting_snapshot!(state, settings_service, "spectrogram.power_limits", Dict("min" => -80.0, "max" => -20.0))
    @test changed["state_revision"] == 1 && changed["spectrogram_settings"] == explicit_settings
    @test (length(SA.SPECTRUM_CALLS), length(SA.SPECTROGRAM_CALLS), length(state.spectrum_cache), length(state.spectrogram_cache)) == calls_before
    changed_snapshot = SA.signal_analyser_snapshot(state)
    @test (changed_snapshot["plots"]["spectrogram"]["x"], changed_snapshot["plots"]["spectrogram"]["y"], changed_snapshot["plots"]["spectrogram"]["z"]) == xyz_before
    @test changed_snapshot["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
    @test immediate_setting_snapshot!(state, settings_service, "spectrogram.power_limits", Dict("min" => -80.0, "max" => -20.0))["state_revision"] == 1

    for bad in (nothing, true, Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "dB", "extra" => true), Dict("min_db" => -80.0, "max_db" => -20.0, "units" => "Hz"), Dict("min_db" => true, "max_db" => -20.0, "units" => "dB"), Dict("min_db" => -20.0, "max_db" => -20.0, "units" => "dB"), Dict("min_db" => -20.0, "max_db" => -80.0, "units" => "dB"))
        bad === nothing && continue # Auto is valid; missing fifth key is separately malformed below.
        malformed = merge(copy(auto_settings), Dict("power_limits" => bad))
        before = SA.signal_analyser_snapshot(state)
        @test_throws SA.SignalAnalyserValidationError SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => malformed))
        @test SA.signal_analyser_snapshot(state) == before
    end
    missing_key = Dict("overlap_percent" => 50.0, "leakage" => 0.5, "frequency_limits" => nothing, "frequency_scale" => "linear")
    @test_throws SA.SignalAnalyserValidationError SA.apply_signal_analyser_view!(state, Dict("state_revision" => 1, "spectrogram_settings" => missing_key))

    created = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 1, "operation" => "create"))
    @test created["displays"][2]["spectrogram_settings"] == auto_settings
    selected = SA.apply_signal_analyser_display!(state, Dict("state_revision" => 2, "operation" => "select", "display_id" => "display-1"))
    @test selected["spectrogram_settings"] == explicit_settings
    cleared = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 3, "visible_signals" => String[]))
    @test cleared["spectrogram_settings"] == explicit_settings
    @test cleared["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
    readded = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 4, "visible_signals" => [state.signals[1].name]))
    @test readded["spectrogram_settings"] == explicit_settings
    switched = SA.apply_signal_analyser_view!(state, Dict("state_revision" => 5, "visible_signals" => [state.signals[1].name, state.signals[2].name], "analysis_signal" => state.signals[2].name))
    @test switched["spectrogram_settings"] == explicit_settings && switched["plots"]["spectrogram"]["power_limits"] == Dict("mode" => "explicit", "requested" => explicit_payload, "effective" => explicit_payload, "rendered" => Dict("min" => -80.0, "max" => -20.0, "units" => "dB"))
end
