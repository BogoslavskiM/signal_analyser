using Test

const PANE_OUTPUTS = Main.AppTestContext

if !isdefined(PANE_OUTPUTS, :SignalAnalyserSessionService)
    Base.include(PANE_OUTPUTS, joinpath(PANE_OUTPUTS.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(PANE_OUTPUTS, joinpath(PANE_OUTPUTS.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

function reset_pane_output_doubles!()
    empty!(PANE_OUTPUTS.SPECTRUM_CALLS)
    empty!(PANE_OUTPUTS.SPECTROGRAM_CALLS)
    empty!(PANE_OUTPUTS.PERSISTENCE_CALLS)
    PANE_OUTPUTS.SPECTRUM_FAILURE[] = false
    PANE_OUTPUTS.SPECTROGRAM_FAILURE[] = false
    PANE_OUTPUTS.PERSISTENCE_FAILURE[] = false
    nothing
end

pane_output_ids(snapshot) = [entry["pane_id"] for entry in only(snapshot["layouts"])["outputs"]]

function pane_output_by_id(snapshot, pane_id::AbstractString)
    only(filter(
        entry -> entry["pane_id"] == pane_id,
        only(snapshot["layouts"])["outputs"],
    ))
end

@testset "TASK-0068 active pane is the only calculated and returned output" begin
    reset_pane_output_doubles!()
    state = PANE_OUTPUTS.default_signal_analyser_state()
    first_name, second_name = [signal.name for signal in state.signals]

    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "2x2",
        "rows" => 2,
        "columns" => 2,
    ))
    for (pane_id, plot_type, bindings) in (
        ("pane-1", "time", [second_name, first_name]),
        ("pane-2", "spectrum", [second_name, first_name]),
        ("pane-3", "spectrogram", [second_name]),
        ("pane-4", "persistence", [first_name]),
    )
        response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => response["state_revision"],
            "operation" => "update_pane",
            "display_id" => "display-1",
            "version" => 1,
            "pane_id" => pane_id,
            "plot_type" => plot_type,
            "signal_bindings" => bindings,
        ))
    end

    revision = state.view.state_revision
    active_pane_id = state.display_layouts["display-1"].active_pane_id
    snapshot = PANE_OUTPUTS.signal_analyser_layouts_snapshot(state)
    entry = only(snapshot["layouts"])
    outputs = entry["outputs"]

    @test Set(keys(entry)) == Set(["display_id", "layout", "outputs"])
    @test pane_output_ids(snapshot) == ["pane-1"]
    @test only(outputs)["plot_type"] == "time"
    @test Set(keys(only(outputs))) == Set([
        "pane_id", "plot_type", "signal_bindings", "analysis_signal", "output",
    ])
    @test Set(keys(only(outputs)["output"])) == Set([
        "isready", "success", "error", "data",
    ])
    @test only(outputs)["output"]["isready"] === true
    @test only(outputs)["output"]["success"] === true
    @test isempty(only(outputs)["output"]["error"])
    @test isempty(PANE_OUTPUTS.SPECTRUM_CALLS)
    @test isempty(PANE_OUTPUTS.SPECTROGRAM_CALLS)
    @test isempty(PANE_OUTPUTS.PERSISTENCE_CALLS)

    time_output = only(outputs)
    @test time_output["signal_bindings"] == [second_name, first_name]
    @test [(trace["signal"], trace["component"]) for trace in time_output["output"]["data"]] == [
        (second_name, "real"), (second_name, "imaginary"),
        (first_name, ""),
    ]
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id

    for (pane_id, expected_calls) in (
        ("pane-2", (1, 0, 0)),
        ("pane-3", (1, 1, 0)),
        ("pane-4", (1, 1, 1)),
    )
        response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => state.view.state_revision,
            "operation" => "select_pane",
            "display_id" => "display-1",
            "version" => 1,
            "pane_id" => pane_id,
        ))
        output = only(only(response["layouts"])["outputs"])
        @test output["pane_id"] == pane_id
        @test output["output"]["success"] === true
        @test (length(PANE_OUTPUTS.SPECTRUM_CALLS), length(PANE_OUTPUTS.SPECTROGRAM_CALLS), length(PANE_OUTPUTS.PERSISTENCE_CALLS)) == expected_calls
    end

    service = PANE_OUTPUTS.SignalAnalyserSessionService()
    document = PANE_OUTPUTS.export_signal_analyser_session(service, state)["document"]
    layout_document = only(document["state"]["displays"])["layout"]
    @test !haskey(layout_document, "outputs")
    @test Set(keys(layout_document)) == PANE_OUTPUTS.SIGNAL_ANALYSER_SESSION_LAYOUT_FIELDS
    imported = PANE_OUTPUTS.default_signal_analyser_state()
    PANE_OUTPUTS.import_signal_analyser_session!(service, imported, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    imported_snapshot = PANE_OUTPUTS.signal_analyser_layouts_snapshot(imported)
    @test pane_output_ids(imported_snapshot) == ["pane-4"]
    @test only(only(imported_snapshot["layouts"])["outputs"])["plot_type"] == "persistence"
    @test PANE_OUTPUTS.export_signal_analyser_session(service, imported)["document"]["state"] == document["state"]
end

@testset "TASK-0068 inactive Displays publish no outputs and call no providers" begin
    reset_pane_output_doubles!()
    state = PANE_OUTPUTS.default_signal_analyser_state()
    signal_name = first(state.signals).name
    resized = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0, "operation" => "resize", "display_id" => "display-1",
        "version" => 1, "variant" => "2x2", "rows" => 2, "columns" => 2,
    ))
    configured = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => resized["state_revision"], "operation" => "update_pane",
        "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
        "plot_type" => "spectrum", "signal_bindings" => [signal_name],
    ))
    created = PANE_OUTPUTS.apply_signal_analyser_display!(state, Dict(
        "state_revision" => configured["state_revision"], "operation" => "create",
    ))
    entries = PANE_OUTPUTS.signal_analyser_layouts_snapshot(state)["layouts"]
    @test [entry["display_id"] for entry in entries] == ["display-1", "display-2"]
    @test isempty(entries[1]["outputs"])
    @test length(entries[2]["outputs"]) == 1
    @test state.output_manager.active_page_id == "display-2::pane-1"
    @test state.output_manager.need_update_pages["display-1::pane-2"]
    @test isempty(PANE_OUTPUTS.PERSISTENCE_CALLS)

    selected_display = PANE_OUTPUTS.apply_signal_analyser_display!(state, Dict(
        "state_revision" => created["state_revision"], "operation" => "select",
        "display_id" => "display-1",
    ))
    active = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => selected_display["state_revision"], "operation" => "select_pane",
        "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
    ))
    @test active["layouts"][1]["display_id"] == "display-1"
    @test only(active["layouts"][1]["outputs"])["pane_id"] == "pane-2"
    @test isempty(active["layouts"][2]["outputs"])
    @test state.output_manager.active_page_id == "display-1::pane-2"
    @test state.output_manager.need_update_pages["display-1::pane-2"]
    @test isempty(PANE_OUTPUTS.PERSISTENCE_CALLS)
end

@testset "TASK-0046 inactive Spectrum frequency scale survives session derivation" begin
    reset_pane_output_doubles!()
    state = PANE_OUTPUTS.default_signal_analyser_state()
    real_name = first(state.signals).name

    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "1x2",
        "rows" => 1,
        "columns" => 2,
    ))
    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => response["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
        "plot_type" => "time",
        "signal_bindings" => [real_name],
    ))
    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => response["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
        "plot_type" => "spectrum",
        "signal_bindings" => [real_name],
    ))
    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => response["state_revision"],
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
    ))
    # Frequency scale is an immediate provider-free presentation setting.
    # Grouped settings snapshots through /api/view are no longer accepted.
    settings_service = PANE_OUTPUTS.SignalSettingsService()
    provider_counts = (
        length(PANE_OUTPUTS.SPECTRUM_CALLS), length(PANE_OUTPUTS.SPECTROGRAM_CALLS),
        length(PANE_OUTPUTS.PERSISTENCE_CALLS), length(PANE_OUTPUTS.PSPECTRUM_CALLS),
    )
    need_update_before = copy(state.output_manager.need_update_pages)
    logged = PANE_OUTPUTS.apply_signal_setting!(settings_service, state, Dict(
        "state_revision" => response["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrum.frequency_scale",
        "value" => "log",
    ))
    @test (
        length(PANE_OUTPUTS.SPECTRUM_CALLS), length(PANE_OUTPUTS.SPECTROGRAM_CALLS),
        length(PANE_OUTPUTS.PERSISTENCE_CALLS), length(PANE_OUTPUTS.PSPECTRUM_CALLS),
    ) == provider_counts
    @test state.output_manager.need_update_pages == need_update_before
    service = PANE_OUTPUTS.SignalAnalyserSessionService()
    document = PANE_OUTPUTS.export_signal_analyser_session(service, state)["document"]
    inactive = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => logged["state"]["state_revision"],
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
    ))

    @test pane_output_ids(inactive) == ["pane-1"]
    @test only(inactive["layouts"])["layout"]["active_pane_id"] == "pane-1"
    @test state.display_layouts["display-1"].panes[2].spectrum_settings.frequency_scale ==
        PANE_OUTPUTS.LOG_SPECTRUM_FREQUENCY_SCALE
    active_log = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => inactive["state_revision"], "operation" => "select_pane",
        "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
    ))
    @test all(trace["frequency_scale"] == "log" for trace in
        only(only(active_log["layouts"])["outputs"])["output"]["data"])

    imported = PANE_OUTPUTS.default_signal_analyser_state()
    imported_response = PANE_OUTPUTS.import_signal_analyser_session!(service, imported, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    imported_inactive = PANE_OUTPUTS.apply_signal_analyser_layout!(imported, Dict(
        "state_revision" => imported_response["state_revision"],
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
    ))
    @test pane_output_ids(imported_inactive) == ["pane-1"]
    @test only(imported_inactive["layouts"])["layout"]["active_pane_id"] == "pane-1"
    @test imported.display_layouts["display-1"].panes[2].spectrum_settings.frequency_scale ==
        PANE_OUTPUTS.LOG_SPECTRUM_FREQUENCY_SCALE
    imported_active_log = PANE_OUTPUTS.apply_signal_analyser_layout!(imported, Dict(
        "state_revision" => imported_inactive["state_revision"], "operation" => "select_pane",
        "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
    ))
    @test all(trace["frequency_scale"] == "log" for trace in
        only(only(imported_active_log["layouts"])["outputs"])["output"]["data"])
end

@testset "TASK-0068 empty panes and bounded 100-pane metadata topology" begin
    reset_pane_output_doubles!()
    state = PANE_OUTPUTS.default_signal_analyser_state()
    response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "1x2",
        "rows" => 1,
        "columns" => 2,
    ))

    for plot_type in ("time", "spectrum", "spectrogram", "persistence")
        response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => response["state_revision"],
            "operation" => "update_pane",
            "display_id" => "display-1",
            "version" => 1,
            "pane_id" => "pane-2",
            "plot_type" => plot_type,
            "signal_bindings" => String[],
        ))
        response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => response["state_revision"], "operation" => "select_pane",
            "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
        ))
        empty_output = only(only(response["layouts"])["outputs"])
        output = empty_output["output"]
        @test empty_output["analysis_signal"] === nothing
        @test output["isready"] === true
        @test output["success"] === true
        @test output["error"] == ""
        if plot_type in ("time", "spectrum")
            @test output["data"] == Dict{String,Any}[]
        else
            @test output["data"]["type"] == "heatmap"
            @test output["data"]["signal"] === nothing
            @test isempty(output["data"]["x"])
            @test isempty(output["data"]["y"])
            @test isempty(output["data"]["z"])
        end
        response = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => response["state_revision"], "operation" => "select_pane",
            "display_id" => "display-1", "version" => 1, "pane_id" => "pane-1",
        ))
    end

    bounded = PANE_OUTPUTS.default_signal_analyser_state()
    reset_pane_output_doubles!()
    max_response = PANE_OUTPUTS.apply_signal_analyser_layout!(bounded, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "10x10",
        "rows" => 10,
        "columns" => 10,
    ))
    max_entry = only(max_response["layouts"])
    @test length(max_entry["layout"]["panes"]) == 100
    @test pane_output_ids(max_response) == ["pane-1"]
    @test count(pane -> isempty(pane["signal_bindings"]), max_entry["layout"]["panes"]) == 99
    @test only(max_entry["outputs"])["output"]["success"] === true
    @test isempty(PANE_OUTPUTS.SPECTRUM_CALLS) && isempty(PANE_OUTPUTS.SPECTROGRAM_CALLS) && isempty(PANE_OUTPUTS.PERSISTENCE_CALLS)
end

@testset "TASK-0046 pane calculation error isolation and GET POST 409 parity" begin
    reset_pane_output_doubles!()
    state = PANE_OUTPUTS.default_signal_analyser_state()
    _, second_name = [signal.name for signal in state.signals]
    resized = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "1x2",
        "rows" => 1,
        "columns" => 2,
    ))
    failed = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => resized["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
        "plot_type" => "spectrogram",
        "signal_bindings" => [second_name],
    ))
    PANE_OUTPUTS.SPECTROGRAM_FAILURE[] = true
    failed = try
        PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => failed["state_revision"], "operation" => "select_pane",
            "display_id" => "display-1", "version" => 1, "pane_id" => "pane-2",
        ))
    catch caught
        caught
    finally
        PANE_OUTPUTS.SPECTROGRAM_FAILURE[] = false
    end
    @test failed isa Dict{String,Any}
    if failed isa Dict{String,Any}
        failed_output = only(only(failed["layouts"])["outputs"])
        @test failed_output["output"]["isready"] === true
        @test failed_output["output"]["success"] === false
        @test occursin("deterministic Spectrogram provider failure", failed_output["output"]["error"])
        @test failed_output["output"]["data"]["type"] == "heatmap"
        @test isempty(failed_output["output"]["data"]["z"])
    end
    @test state.display_layouts["display-1"].panes[2].plot_type == PANE_OUTPUTS.SPECTROGRAM_PLOT

    revision = state.view.state_revision
    active_pane_id = state.display_layouts["display-1"].active_pane_id
    recovered = PANE_OUTPUTS.signal_analyser_layouts_snapshot(state)
    recovered_output = only(only(recovered["layouts"])["outputs"])
    @test recovered_output["output"]["success"] === true
    @test recovered_output["output"]["error"] == ""
    recovered_output["output"]["data"] isa AbstractDict && @test !isempty(
        recovered_output["output"]["data"]["z"],
    )
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id

    stale = PANE_OUTPUTS.signal_analyser_layout_stale_response(
        state,
        PANE_OUTPUTS.SignalAnalyserStaleStateError(revision - 1, revision),
    )
    @test stale.status == 409
    @test Set(keys(stale.body["current"])) == Set([
        "ok", "state_revision", "calculation_revision", "active_display_id", "layouts", "state",
    ])
    @test Set(keys(only(stale.body["current"]["layouts"]))) == Set([
        "display_id", "layout", "outputs",
    ])
    @test pane_output_ids(stale.body["current"]) == pane_output_ids(recovered)
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id
    reset_pane_output_doubles!()
end
