using Test

const TASK0120_HIDDEN_MAIN = Main.AppTestContext

function task0120_update_pane!(state, pane_id, bindings)
    TASK0120_HIDDEN_MAIN.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => bindings,
    ); lightweight = true)
end

function task0120_active_pane(state)
    layout = state.display_layouts[state.active_display_id]
    only(filter(pane -> pane.id == layout.active_pane_id, layout.panes))
end

@testset "TASK-0120 hidden pane main is independent from graph bindings" begin
    state = TASK0120_HIDDEN_MAIN.test_state_with_complex_signal()
    primary, hidden, unrelated = [signal.name for signal in state.signals]
    # The fixture intentionally has two signals; a third inventory member is
    # needed to prove that a later unrelated binding does not become main.
    push!(state.signals, TASK0120_HIDDEN_MAIN.AnalysedSignal(
        "task0120-unrelated", "#0f766e", 2048.0, ComplexF64[1, 2, 3], false, true,
    ))
    unrelated = state.signals[end].name
    pane_id = state.display_layouts[state.active_display_id].active_pane_id
    task0120_update_pane!(state, pane_id, [primary, hidden])
    TASK0120_HIDDEN_MAIN.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "analysis_signal" => hidden,
    ))

    # Removing the checkbox binding hides the graph trace but must not clear
    # the pane/display main and must remain present in state-lite layouts.
    task0120_update_pane!(state, pane_id, [primary])
    pane = task0120_active_pane(state)
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_members(pane) == [primary]
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(pane) == hidden
    @test TASK0120_HIDDEN_MAIN.signal_analyser_display_analysis_name(
        TASK0120_HIDDEN_MAIN.signal_analyser_active_display(state),
    ) == hidden
    lite = TASK0120_HIDDEN_MAIN.signal_analyser_layouts_snapshot_unlocked(state)
    pane_lite = only(lite["layouts"])["layout"]["panes"][1]
    @test pane_lite["signal_bindings"] == [primary]
    @test pane_lite["analysis_signal"] == hidden

    # Graph membership alone drives rendering. Binding a third signal later
    # must not promote it over the hidden persisted main.
    task0120_update_pane!(state, pane_id, [primary, unrelated])
    pane = task0120_active_pane(state)
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_members(pane) == [primary, unrelated]
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(pane) == hidden
    prepared = TASK0120_HIDDEN_MAIN.signal_analyser_prepare_pane_output!(
        state,
        TASK0120_HIDDEN_MAIN.signal_analyser_active_display(state),
        pane,
    )
    @test prepared.analysis_signal == hidden
    @test prepared.signal_bindings == [primary, unrelated]
    traces = prepared.data
    @test Set(trace["name"] for trace in traces) == Set([primary, unrelated])

    # New v4 documents persist a nullable pane field. The original v4 shape
    # without it remains a supported deterministic migration path.
    service = TASK0120_HIDDEN_MAIN.SignalAnalyserSessionService()
    document = TASK0120_HIDDEN_MAIN.export_signal_analyser_session(service, state)["document"]
    pane_document = document["state"]["displays"][1]["layout"]["panes"][1]
    @test haskey(pane_document, "analysis_signal") && pane_document["analysis_signal"] == hidden
    imported = TASK0120_HIDDEN_MAIN.default_signal_analyser_state()
    @test TASK0120_HIDDEN_MAIN.import_signal_analyser_session!(service, imported, Dict(
        "state_revision" => 0, "document" => document,
    ))["ok"] === true
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(task0120_active_pane(imported)) == hidden

    original_v4 = deepcopy(document)
    for display in original_v4["state"]["displays"], legacy_pane in display["layout"]["panes"]
        delete!(legacy_pane, "analysis_signal")
    end
    migrated = TASK0120_HIDDEN_MAIN.default_signal_analyser_state()
    @test TASK0120_HIDDEN_MAIN.import_signal_analyser_session!(service, migrated, Dict(
        "state_revision" => 0, "document" => original_v4,
    ))["ok"] === true
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(task0120_active_pane(migrated)) == hidden

    # Inventory rename follows the hidden main; deleting that inventory item
    # alone clears it, without promoting any graph binding.
    hidden_signal = only(filter(signal -> signal.name == hidden, state.signals))
    renamed = "task0120-renamed-main"
    TASK0120_HIDDEN_MAIN.apply_signal_inventory!(
        TASK0120_HIDDEN_MAIN.SignalInventoryService(),
        state,
        TASK0120_HIDDEN_MAIN.UpdateSignalMetadataCommand(
            state.view.state_revision, hidden_signal.id, renamed, hidden_signal.color,
            hidden_signal.sample_rate_hz,
        ),
    )
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(task0120_active_pane(state)) == renamed
    TASK0120_HIDDEN_MAIN.apply_signal_inventory!(
        TASK0120_HIDDEN_MAIN.SignalInventoryService(),
        state,
        TASK0120_HIDDEN_MAIN.DeleteSignalCommand(state.view.state_revision, renamed),
    )
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_analysis_name(task0120_active_pane(state)) === nothing
    @test TASK0120_HIDDEN_MAIN.signal_display_pane_members(task0120_active_pane(state)) == [primary, unrelated]
end
