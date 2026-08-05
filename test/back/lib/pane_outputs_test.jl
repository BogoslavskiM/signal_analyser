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

@testset "TASK-0046 ordered real renderer outputs for all pane types" begin
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
    @test pane_output_ids(snapshot) == ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test [output["plot_type"] for output in outputs] == [
        "time", "spectrum", "spectrogram", "persistence",
    ]
    @test all(Set(keys(output)) == Set([
        "pane_id", "plot_type", "signal_bindings", "analysis_signal", "output",
    ]) for output in outputs)
    @test all(Set(keys(output["output"])) == Set([
        "isready", "success", "error", "data",
    ]) for output in outputs)
    @test all(output["output"]["isready"] === true for output in outputs)
    @test all(output["output"]["success"] === true for output in outputs)
    @test all(isempty(output["output"]["error"]) for output in outputs)

    time_output = outputs[1]
    spectrum_output = outputs[2]
    spectrogram_output = outputs[3]
    persistence_output = outputs[4]
    @test time_output["signal_bindings"] == [second_name, first_name]
    @test [trace["signal"] for trace in time_output["output"]["data"]] == [second_name, first_name]
    @test spectrum_output["signal_bindings"] == [second_name, first_name]
    @test [trace["signal"] for trace in spectrum_output["output"]["data"]] == [second_name, first_name]
    @test all(trace["frequency_scale"] == "linear" for trace in spectrum_output["output"]["data"])
    @test spectrogram_output["analysis_signal"] == second_name
    @test spectrogram_output["output"]["data"]["type"] == "heatmap"
    @test spectrogram_output["output"]["data"]["signal"] == second_name
    @test !isempty(spectrogram_output["output"]["data"]["z"])
    @test persistence_output["analysis_signal"] == first_name
    @test persistence_output["output"]["data"]["type"] == "heatmap"
    @test persistence_output["output"]["data"]["signal"] == first_name
    @test !isempty(persistence_output["output"]["data"]["z"])
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id

    calls = (
        length(PANE_OUTPUTS.SPECTRUM_CALLS),
        length(PANE_OUTPUTS.SPECTROGRAM_CALLS),
        length(PANE_OUTPUTS.PERSISTENCE_CALLS),
    )
    repeated = PANE_OUTPUTS.signal_analyser_layouts_snapshot(state)
    @test repeated == snapshot
    @test calls == (
        length(PANE_OUTPUTS.SPECTRUM_CALLS),
        length(PANE_OUTPUTS.SPECTROGRAM_CALLS),
        length(PANE_OUTPUTS.PERSISTENCE_CALLS),
    )

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
    @test pane_output_ids(imported_snapshot) == ["pane-1", "pane-2", "pane-3", "pane-4"]
    @test [output["plot_type"] for output in only(imported_snapshot["layouts"])["outputs"]] == [
        "time", "spectrum", "spectrogram", "persistence",
    ]
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
    logged = PANE_OUTPUTS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => response["state_revision"],
        "spectrum_settings" => Dict(
            "scale" => "db",
            "frequency_scale" => "log",
            "leakage" => 0.5,
            "frequency_limits" => nothing,
        ),
    ))
    service = PANE_OUTPUTS.SignalAnalyserSessionService()
    document = PANE_OUTPUTS.export_signal_analyser_session(service, state)["document"]
    inactive = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => logged["state_revision"],
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-1",
    ))

    log_output = pane_output_by_id(inactive, "pane-2")
    @test only(inactive["layouts"])["layout"]["active_pane_id"] == "pane-1"
    @test state.display_layouts["display-1"].panes[2].spectrum_settings.frequency_scale ==
        PANE_OUTPUTS.LOG_SPECTRUM_FREQUENCY_SCALE
    @test all(trace["frequency_scale"] == "log" for trace in log_output["output"]["data"])
    @test all(trace["frequency_scale"] == "log" for trace in
        pane_output_by_id(PANE_OUTPUTS.signal_analyser_layouts_snapshot(state), "pane-2")["output"]["data"])

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
    imported_output = pane_output_by_id(imported_inactive, "pane-2")
    @test only(imported_inactive["layouts"])["layout"]["active_pane_id"] == "pane-1"
    @test imported.display_layouts["display-1"].panes[2].spectrum_settings.frequency_scale ==
        PANE_OUTPUTS.LOG_SPECTRUM_FREQUENCY_SCALE
    @test all(trace["frequency_scale"] == "log" for trace in imported_output["output"]["data"])
end

@testset "TASK-0046 empty panes and bounded 16-pane topology" begin
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
        empty_output = pane_output_by_id(response, "pane-2")
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
    end

    bounded = PANE_OUTPUTS.default_signal_analyser_state()
    max_response = PANE_OUTPUTS.apply_signal_analyser_layout!(bounded, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "4x4",
        "rows" => 4,
        "columns" => 4,
    ))
    max_entry = only(max_response["layouts"])
    @test length(max_entry["layout"]["panes"]) == 16
    @test length(max_entry["outputs"]) == 16
    @test [pane["id"] for pane in max_entry["layout"]["panes"]] == [
        output["pane_id"] for output in max_entry["outputs"]
    ]
    @test count(output -> isempty(output["signal_bindings"]), max_entry["outputs"]) == 15
    @test all(output["output"]["success"] === true for output in max_entry["outputs"])
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
    PANE_OUTPUTS.SPECTROGRAM_FAILURE[] = true
    failed = PANE_OUTPUTS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => resized["state_revision"],
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
        "plot_type" => "spectrogram",
        "signal_bindings" => [second_name],
    ))
    first_output = pane_output_by_id(failed, "pane-1")
    failed_output = pane_output_by_id(failed, "pane-2")
    @test first_output["output"]["success"] === true
    @test failed_output["output"]["isready"] === true
    @test failed_output["output"]["success"] === false
    @test occursin("deterministic Spectrogram provider failure", failed_output["output"]["error"])
    @test failed_output["output"]["data"]["type"] == "heatmap"
    @test isempty(failed_output["output"]["data"]["z"])
    @test state.display_layouts["display-1"].panes[2].plot_type == PANE_OUTPUTS.SPECTROGRAM_PLOT

    PANE_OUTPUTS.SPECTROGRAM_FAILURE[] = false
    revision = state.view.state_revision
    active_pane_id = state.display_layouts["display-1"].active_pane_id
    recovered = PANE_OUTPUTS.signal_analyser_layouts_snapshot(state)
    recovered_output = pane_output_by_id(recovered, "pane-2")
    @test recovered_output["output"]["success"] === true
    @test recovered_output["output"]["error"] == ""
    @test !isempty(recovered_output["output"]["data"]["z"])
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id

    stale = PANE_OUTPUTS.signal_analyser_layout_stale_response(
        state,
        PANE_OUTPUTS.SignalAnalyserStaleStateError(revision - 1, revision),
    )
    @test stale.status == 409
    @test Set(keys(stale.body["current"])) == Set(keys(recovered))
    @test Set(keys(only(stale.body["current"]["layouts"]))) == Set([
        "display_id", "layout", "outputs",
    ])
    @test pane_output_ids(stale.body["current"]) == pane_output_ids(recovered)
    @test state.view.state_revision == revision
    @test state.display_layouts["display-1"].active_pane_id == active_pane_id
    reset_pane_output_doubles!()
end
