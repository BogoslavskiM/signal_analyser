using Test

const TASK0131_BINDING_ORDER = Main.AppTestContext

function task0131_state()
    harmonic = TASK0131_BINDING_ORDER.AnalysedSignal(
        "harmonic", "#2563eb", 2048.0, ComplexF64.(collect(0:15)), false, true,
    )
    variable = TASK0131_BINDING_ORDER.AnalysedSignal(
        "variable", "#dc2626", 2048.0, ComplexF64.(collect(10:25)), false, true,
    )
    state = TASK0131_BINDING_ORDER.SignalAnalyserState(
        TASK0131_BINDING_ORDER.AnalysedSignal[harmonic, variable],
        TASK0131_BINDING_ORDER.SignalAnalyserViewState(
            0, TASK0131_BINDING_ORDER.TIME_PLOT, harmonic.name,
        ),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
    )
    TASK0131_BINDING_ORDER.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "row_selected_signal" => harmonic.name,
        "analysis_signal" => harmonic.name,
        "visible_signals" => [harmonic.name],
    ); lightweight = true)
    layout = TASK0131_BINDING_ORDER.signal_analyser_layout_by_display_id(
        state, state.active_display_id,
    )
    state, harmonic.name, variable.name, layout.active_pane_id
end

function task0131_update_pane!(state, pane_id, bindings)
    TASK0131_BINDING_ORDER.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => bindings,
    ); lightweight = true)
end

function task0131_active_pane(snapshot)
    only(snapshot["layouts"])["layout"]["panes"][1]
end

@testset "TASK-0131 reverse interaction order remains canonical and atomic" begin
    state, harmonic, variable, pane_id = task0131_state()

    # UI interaction can be reverse to the authoritative signal inventory:
    # variable is checked first, then harmonic. Both the accepted pane and the
    # derived display projection must remain [harmonic, variable].
    task0131_update_pane!(state, pane_id, [variable])
    snapshot = task0131_update_pane!(state, pane_id, [variable, harmonic])
    pane = task0131_active_pane(snapshot)
    @test pane["signal_bindings"] == [harmonic, variable]
    @test snapshot["state"]["visible_signals"] == [harmonic, variable]
    @test snapshot["state"]["analysis_signal"] == harmonic

    # state-lite and active output are independent consumers of the accepted
    # layout. Neither may raise the old inventory-order invariant error.
    lite = TASK0131_BINDING_ORDER.signal_analyser_state_lite_unlocked(state)
    output_snapshot = TASK0131_BINDING_ORDER.signal_analyser_layouts_snapshot_unlocked(state)
    @test lite["visible_signals"] == [harmonic, variable]
    @test task0131_active_pane(output_snapshot)["signal_bindings"] == [harmonic, variable]
    output = only(only(output_snapshot["layouts"])["outputs"])
    @test output["signal_bindings"] == [harmonic, variable]
    @test output["analysis_signal"] == harmonic

    # Invalid layout input must fail before publishing any candidate state: a
    # later state-lite/output read is still healthy and exactly unchanged.
    before_revision = state.view.state_revision
    before_lite = TASK0131_BINDING_ORDER.signal_analyser_state_lite_unlocked(state)
    @test_throws TASK0131_BINDING_ORDER.SignalAnalyserValidationError task0131_update_pane!(
        state, pane_id, [harmonic, harmonic],
    )
    @test state.view.state_revision == before_revision
    @test TASK0131_BINDING_ORDER.signal_analyser_state_lite_unlocked(state) == before_lite
    recovered = TASK0131_BINDING_ORDER.signal_analyser_layouts_snapshot_unlocked(state)
    @test task0131_active_pane(recovered)["signal_bindings"] == [harmonic, variable]
    @test only(only(recovered["layouts"])["outputs"])["signal_bindings"] == [harmonic, variable]
end
