using Test

const TASK0127_LIMITS = Main.AppTestContext

function task0127_bound_state()
    state = TASK0127_LIMITS.default_signal_analyser_state()
    signal = only(state.signals)
    TASK0127_LIMITS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "row_selected_signal" => signal.name,
        "analysis_signal" => signal.name,
        "visible_signals" => [signal.name],
    ); lightweight = true)
    state, signal
end

function task0127_with_limits(pane, limits)
    TASK0127_LIMITS.SignalDisplayPaneState(
        pane.id, pane.name, pane.plot_type, pane.membership, pane.analysis_source,
        limits, pane.measurement_selection, pane.spectrum_settings,
        pane.spectrogram_settings, pane.persistence_settings, pane.stored_settings,
        pane.peaks_enabled, pane.peaks_settings,
    )
end

function task0127_replace_panes!(state, display_id, panes)
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    state.display_layouts[display_id] = TASK0127_LIMITS.SignalDisplayLayoutState(
        layout.version, layout.variant, layout.rows, layout.columns, panes,
        layout.active_pane_id, layout.next_pane_number,
    )
end

@testset "TASK-0127 persisted occupied panes recover Time Limits before output" begin
    state, signal = task0127_bound_state()
    display_id = state.active_display_id
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    pane = TASK0127_LIMITS.signal_display_active_pane(layout)
    task0127_replace_panes!(state, display_id, [task0127_with_limits(pane, nothing)])

    recovered = TASK0127_LIMITS.signal_analyser_recover_time_limits_unlocked!(state)
    pane = TASK0127_LIMITS.signal_display_active_pane(TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id))
    @test recovered.changed_page_ids == ["$(display_id)::$(pane.id)"]
    @test pane.time_limits == TASK0127_LIMITS.signal_full_time_limits(state.measurements_service, signal)

    output = TASK0127_LIMITS.signal_analyser_active_output(state, display_id, pane.id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    output = TASK0127_LIMITS.signal_analyser_active_output(state, display_id, pane.id)
    @test output["isready"] === true && output["success"] === true
    @test !occursin("ArgumentError", string(get(output, "error", "")))
end

@testset "TASK-0127 explicit limits and empty panes are not rewritten" begin
    state, _ = task0127_bound_state()
    display_id = state.active_display_id
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    pane = TASK0127_LIMITS.signal_display_active_pane(layout)
    explicit = TASK0127_LIMITS.SignalTimeLimits(0.01, 0.02)
    task0127_replace_panes!(state, display_id, [task0127_with_limits(pane, explicit)])
    @test isempty(TASK0127_LIMITS.signal_analyser_recover_time_limits_unlocked!(state).changed_page_ids)
    @test TASK0127_LIMITS.signal_display_active_pane(TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)).time_limits == explicit

    empty_state = TASK0127_LIMITS.default_signal_analyser_state()
    empty_layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(empty_state, empty_state.active_display_id)
    empty_pane = TASK0127_LIMITS.signal_display_active_pane(empty_layout)
    @test isempty(TASK0127_LIMITS.signal_analyser_recover_time_limits_unlocked!(empty_state).changed_page_ids)
    @test empty_pane.time_limits === nothing
end

@testset "TASK-0127 legacy 2x2 recovers occupied nonactive panes independently" begin
    state, signal = task0127_bound_state()
    display_id = state.active_display_id
    TASK0127_LIMITS.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision, "operation" => "resize",
        "display_id" => display_id, "version" => 1, "variant" => "2x2",
        "rows" => 2, "columns" => 2,
    ); lightweight = true)
    for pane_id in ("pane-1", "pane-4")
        TASK0127_LIMITS.apply_signal_analyser_layout!(state, Dict(
            "state_revision" => state.view.state_revision, "operation" => "update_pane",
            "display_id" => display_id, "version" => 1, "pane_id" => pane_id,
            "plot_type" => "time", "signal_bindings" => [signal.name],
        ); lightweight = true)
    end
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    legacy = [pane.id in ("pane-1", "pane-4") ? task0127_with_limits(pane, nothing) : pane for pane in layout.panes]
    task0127_replace_panes!(state, display_id, legacy)
    recovered = TASK0127_LIMITS.signal_analyser_recover_time_limits_unlocked!(state)
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    @test Set(recovered.changed_page_ids) == Set(["$(display_id)::pane-1", "$(display_id)::pane-4"])
    @test all(pane -> pane.time_limits == TASK0127_LIMITS.signal_full_time_limits(state.measurements_service, signal), filter(pane -> pane.id in ("pane-1", "pane-4"), layout.panes))
    @test all(pane -> pane.time_limits === nothing, filter(pane -> pane.id in ("pane-2", "pane-3"), layout.panes))
end

@testset "TASK-0127 unknown persisted binding returns typed recoverable output failure" begin
    state, _ = task0127_bound_state()
    display_id = state.active_display_id
    layout = TASK0127_LIMITS.signal_analyser_layout_by_display_id(state, display_id)
    pane = TASK0127_LIMITS.signal_display_active_pane(layout)
    missing = TASK0127_LIMITS.SignalDisplayMembership(["removed-legacy-signal"])
    legacy = TASK0127_LIMITS.SignalDisplayPaneState(
        pane.id, pane.name, pane.plot_type, missing,
        TASK0127_LIMITS.SignalAnalysisSource("removed-legacy-signal"), nothing,
        pane.measurement_selection, pane.spectrum_settings, pane.spectrogram_settings,
        pane.persistence_settings, pane.stored_settings, pane.peaks_enabled, pane.peaks_settings,
    )
    task0127_replace_panes!(state, display_id, [legacy])
    response = TASK0127_LIMITS.signal_analyser_active_output(state, display_id, pane.id)
    @test response["isready"] === true && response["success"] === false
    @test response["code"] == "time_limits_recovery_failed" && response["recoverable"] === true
    @test !occursin("ArgumentError", response["error"])
end
