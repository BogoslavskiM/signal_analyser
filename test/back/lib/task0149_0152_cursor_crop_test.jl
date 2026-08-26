using Test

const V54 = Main.AppTestContext

@testset "TASK-0149..0152 viewport migration, axis labels, hover policy and crop" begin
    # Legacy persisted Plotly ranges must become automatic/full-domain state, not DSP input.
    state = V54.default_signal_analyser_state()
    layout = state.display_layouts["display-1"]
    pane_index = something(findfirst(candidate -> candidate.id == layout.active_pane_id, layout.panes), 1)
    pane = layout.panes[pane_index]
    @test pane.stored_settings.display.show_axis_labels
    @test V54.signal_settings_value(state, "display-1", "display.show_axis_labels") === true
    document = V54.export_signal_analyser_session(V54.SignalAnalyserSessionService(), state)["document"]
    document["version"] = V54.SIGNAL_ANALYSER_SESSION_VERSION
    legacy_pane = document["state"]["displays"][1]["layout"]["panes"][1]
    legacy_pane["time_limits"] = Dict("min_s" => 0.1, "max_s" => 0.2)
    imported = V54.default_signal_analyser_state()
    result = V54.import_signal_analyser_session!(V54.SignalAnalyserSessionService(), imported, Dict("state_revision" => 0, "document" => document))
    @test result["ok"] === true
    imported_layout = imported.display_layouts["display-1"]
    recovered_index = something(findfirst(candidate -> candidate.id == imported_layout.active_pane_id, imported_layout.panes), 1)
    recovered = imported_layout.panes[recovered_index]
    @test recovered.time_limits !== nothing
    @test recovered.stored_settings.time.x_limits === nothing
    @test recovered.stored_settings.spectrum.frequency_limits === nothing

    # show_axis_labels is persisted per pane/session and only changes presentation state.
    settings = V54.SignalSettingsService()
    changed = V54.apply_signal_setting!(settings, state, Dict(
        "state_revision" => 0, "display_id" => "display-1",
        "field_id" => "display.show_axis_labels", "value" => false,
    ))
    @test V54.signal_settings_value(state, "display-1", "display.show_axis_labels") === false
    @test !haskey(changed["state"], "plots") && !haskey(changed["state"], "plot_payload")
    exported = V54.export_signal_analyser_session(V54.SignalAnalyserSessionService(), state)["document"]
    restored = V54.default_signal_analyser_state()
    V54.import_signal_analyser_session!(V54.SignalAnalyserSessionService(), restored, Dict("state_revision" => 0, "document" => exported))
    @test V54.signal_settings_value(restored, "display-1", "display.show_axis_labels") === false
    app_source = V54.source("app", "api.jl")
    route_source = V54.source("app", "routes.jl")
    @test occursin("function parse_crop_signal_command", app_source)
    @test occursin("route(\"/api/signals/crop\", method = POST)", route_source)
    @test occursin("apply_cropped_signal!", route_source)
    front = V54.source("public", "js", "app.js")
    @test occursin("hovermode:false", front) && occursin("hoverinfo:\"skip\"", front) && occursin("hovertemplate:null", front)

    # Exact parser, real/complex crops, inclusive/clamped/single sample, collisions, source protection and atomicity.
    source = only(state.signals)
    payload = Dict{String,Any}("state_revision" => state.view.state_revision, "source_signal_id" => source.id,
        "min_s" => 0.0, "max_s" => 1 / source.sample_rate_hz, "target_name" => "crop-real", "overwrite" => false)
    command = V54.parse_crop_signal_command(payload)
    @test command isa V54.CropSignalCommand && command.min_s == 0.0
    @test_throws V54.SignalAnalyserValidationError V54.parse_crop_signal_command(merge(copy(payload), Dict("extra" => true)))
    @test_throws V54.SignalAnalyserValidationError V54.parse_crop_signal_command(merge(copy(payload), Dict("min_s" => 1.0, "max_s" => 0.0)))
    inventory = V54.SignalInventoryService()
    before = deepcopy(state.signals)
    crop = V54.apply_cropped_signal!(inventory, state, command)
    @test crop["ok"] === true && crop["derived_signal"]["name"] == "crop-real"
    derived = only(filter(signal -> signal.name == "crop-real", state.signals))
    @test length(derived.values) == 2 && derived.values == source.values[1:2] && !derived.is_complex
    revision = state.view.state_revision
    one = V54.CropSignalCommand(revision, source.id, 0.0, 0.5 / source.sample_rate_hz, "crop-one", false)
    V54.apply_cropped_signal!(inventory, state, one)
    @test length(only(filter(s -> s.name == "crop-one", state.signals)).values) == 1
    current = deepcopy(state.signals)
    @test_throws V54.SignalAnalyserValidationError V54.apply_cropped_signal!(inventory, state, V54.CropSignalCommand(state.view.state_revision, source.id, 0.0, 1/source.sample_rate_hz, source.name, true))
    @test state.signals == current
    @test_throws V54.SignalAnalyserValidationError V54.apply_cropped_signal!(inventory, state, V54.CropSignalCommand(state.view.state_revision, source.id, 0.0, 1/source.sample_rate_hz, "crop-real", false))
    @test state.signals == current
    complex_state = V54.test_state_with_complex_signal(); complex_source = complex_state.signals[2]
    complex_command = V54.CropSignalCommand(0, complex_source.id, -1.0, 1 / complex_source.sample_rate_hz, "crop-complex", false)
    V54.apply_cropped_signal!(inventory, complex_state, complex_command)
    complex_crop = only(filter(s -> s.name == "crop-complex", complex_state.signals))
    @test complex_crop.is_complex && complex_crop.values == complex_source.values[1:2]
end
