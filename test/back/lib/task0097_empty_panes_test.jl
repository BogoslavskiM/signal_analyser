using Test

const TASK0097_EMPTY_PANES = Main.AppTestContext

if !isdefined(TASK0097_EMPTY_PANES, :SignalAnalyserSessionService)
    Base.include(TASK0097_EMPTY_PANES, joinpath(
        TASK0097_EMPTY_PANES.PROJECT_ROOT, "lib", "domain", "signal_session.jl",
    ))
    Base.include(TASK0097_EMPTY_PANES, joinpath(
        TASK0097_EMPTY_PANES.PROJECT_ROOT, "lib", "services", "signal_session_service.jl",
    ))
end

function task0097_empty_layout!(state, rows::Int, columns::Int)
    TASK0097_EMPTY_PANES.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "resize",
        "display_id" => state.active_display_id,
        "version" => 1,
        "variant" => "$(rows)x$(columns)",
        "rows" => rows,
        "columns" => columns,
    ); lightweight = true)
end

function task0097_update_pane!(state, pane_id::String, signal_names::Vector{String})
    TASK0097_EMPTY_PANES.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => signal_names,
    ); lightweight = true)
end

task0097_members(pane) = TASK0097_EMPTY_PANES.signal_display_pane_members(pane)

@testset "HND-0575 fresh Display and expanded panes deliberately start unbound" begin
    TASK0097_EMPTY_PANES.reset_pspectrum_double!()
    empty!(TASK0097_EMPTY_PANES.SPECTRUM_CALLS)
    empty!(TASK0097_EMPTY_PANES.SPECTROGRAM_CALLS)
    empty!(TASK0097_EMPTY_PANES.PERSISTENCE_CALLS)
    state = TASK0097_EMPTY_PANES.default_signal_analyser_state()
    display = only(state.displays)
    layout = state.display_layouts[display.id]
    pane = only(layout.panes)
    page_id = "$(display.id)::$(pane.id)"

    @test task0097_members(pane) == String[]
    @test TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(pane) === nothing
    @test TASK0097_EMPTY_PANES.signal_analyser_display_members(display) == String[]
    @test TASK0097_EMPTY_PANES.signal_analyser_display_analysis_name(display) === nothing
    @test all(!signal.visible for signal in state.signals)

    # The no-signal pane reports an already successful empty output.  It owns
    # no cache/status/queue/task and therefore cannot trigger any provider.
    empty_output = TASK0097_EMPTY_PANES.signal_analyser_active_output(
        state, display.id, pane.id,
    )
    @test empty_output["isready"] === true && empty_output["success"] === true
    @test empty_output["data"] == Dict{String,Any}[] && empty_output["error"] == ""
    @test !state.output_manager.need_update_pages[page_id]
    @test !haskey(state.output_manager.plot_cache, page_id)
    @test !haskey(state.output_manager.output_statuses, page_id)
    @test !haskey(state.output_manager.output_poll_counts, page_id)
    @test isempty(state.output_manager.queued_contexts) && state.output_manager.active_task === nothing
    @test isempty(TASK0097_EMPTY_PANES.SPECTRUM_CALLS)
    @test isempty(TASK0097_EMPTY_PANES.SPECTROGRAM_CALLS)
    @test isempty(TASK0097_EMPTY_PANES.PERSISTENCE_CALLS)

    grown = task0097_empty_layout!(state, 2, 2)
    grown_layout = only(grown["layouts"])["layout"]
    grown_panes = state.display_layouts[display.id].panes
    @test [pane["signal_bindings"] for pane in grown_layout["panes"]] == [String[] for _ in 1:4]
    @test all(pane -> TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(pane) === nothing, grown_panes)
    @test all(status -> status["isready"] === true && status["success"] === true &&
        status["need_update"] === false && status["output"]["data"] == Dict{String,Any}[],
        only(grown["layouts"])["outputs"])
    @test isempty(TASK0097_EMPTY_PANES.SPECTRUM_CALLS)
    @test isempty(TASK0097_EMPTY_PANES.SPECTROGRAM_CALLS)
    @test isempty(TASK0097_EMPTY_PANES.PERSISTENCE_CALLS)

    created = TASK0097_EMPTY_PANES.apply_signal_analyser_display!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "create",
    ); lightweight = true)
    created_display = only(filter(display -> display.id == "display-2", state.displays))
    created_pane = only(state.display_layouts[created_display.id].panes)
    @test created["active_display_id"] == created_display.id
    @test task0097_members(created_pane) == String[]
    @test TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(created_pane) === nothing
    @test TASK0097_EMPTY_PANES.signal_analyser_display_members(created_display) == String[]
end

@testset "HND-0575 pane binding is explicit, survives resize/import, and stays pane-local" begin
    state = TASK0097_EMPTY_PANES.default_signal_analyser_state()
    signal_name = only(state.signals).name
    task0097_empty_layout!(state, 1, 2)
    response = task0097_update_pane!(state, "pane-1", [signal_name])
    layout = state.display_layouts["display-1"]

    @test response["state_revision"] == state.view.state_revision
    @test task0097_members(layout.panes[1]) == [signal_name]
    @test TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(layout.panes[1]) == signal_name
    @test task0097_members(layout.panes[2]) == String[]
    @test TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(layout.panes[2]) === nothing
    @test only(state.signals).visible
    @test state.output_manager.need_update_pages["display-1::pane-1"]
    @test !state.output_manager.need_update_pages["display-1::pane-2"]

    task0097_empty_layout!(state, 2, 2)
    expanded = state.display_layouts["display-1"].panes
    @test task0097_members(expanded[1]) == [signal_name]
    @test all(pane -> task0097_members(pane) == String[], expanded[2:end])
    @test all(
        pane -> TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(pane) === nothing,
        expanded[2:end],
    )

    service = TASK0097_EMPTY_PANES.SignalAnalyserSessionService()
    document = TASK0097_EMPTY_PANES.export_signal_analyser_session(service, state)["document"]
    imported = TASK0097_EMPTY_PANES.default_signal_analyser_state()
    TASK0097_EMPTY_PANES.import_signal_analyser_session!(service, imported, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    restored = imported.display_layouts["display-1"].panes
    @test task0097_members(restored[1]) == [signal_name]
    @test all(pane -> task0097_members(pane) == String[], restored[2:end])
    @test TASK0097_EMPTY_PANES.signal_display_pane_analysis_name(restored[1]) == signal_name
end
