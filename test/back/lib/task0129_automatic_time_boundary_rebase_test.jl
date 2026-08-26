using Test

const TASK0129_TIME_REBASE = Main.AppTestContext

function task0129_state()
    short = TASK0129_TIME_REBASE.AnalysedSignal(
        "task0129-short", "#2563eb", 10.0, ComplexF64.(collect(0:4)), false, true,
    )
    long = TASK0129_TIME_REBASE.AnalysedSignal(
        "task0129-long", "#dc2626", 10.0, ComplexF64.(collect(0:10)), false, true,
    )
    state = TASK0129_TIME_REBASE.SignalAnalyserState(
        TASK0129_TIME_REBASE.AnalysedSignal[short, long],
        TASK0129_TIME_REBASE.SignalAnalyserViewState(0, TASK0129_TIME_REBASE.TIME_PLOT, short.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
    TASK0129_TIME_REBASE.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "row_selected_signal" => short.name,
        "analysis_signal" => short.name,
        "visible_signals" => [short.name],
    ); lightweight = true)
    layout = TASK0129_TIME_REBASE.signal_analyser_layout_by_display_id(state, state.active_display_id)
    state, short, long, layout.active_pane_id
end

function task0129_pane(state, pane_id)
    layout = TASK0129_TIME_REBASE.signal_analyser_layout_by_display_id(state, state.active_display_id)
    only(filter(pane -> pane.id == pane_id, layout.panes))
end

function task0129_replace_pane_limits!(state, pane_id, limits)
    layout = TASK0129_TIME_REBASE.signal_analyser_layout_by_display_id(state, state.active_display_id)
    panes = map(layout.panes) do pane
        pane.id == pane_id || return pane
        TASK0129_TIME_REBASE.SignalDisplayPaneState(
            pane.id, pane.name, pane.plot_type, pane.membership, pane.analysis_source,
            limits, pane.measurement_selection, pane.spectrum_settings,
            pane.spectrogram_settings, pane.persistence_settings, pane.stored_settings,
            pane.peaks_enabled, pane.peaks_settings,
        )
    end
    state.display_layouts[state.active_display_id] = TASK0129_TIME_REBASE.SignalDisplayLayoutState(
        layout.version, layout.variant, layout.rows, layout.columns, panes,
        layout.active_pane_id, layout.next_pane_number,
    )
end

function task0129_update_pane!(state, pane_id, names)
    TASK0129_TIME_REBASE.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => names,
    ); lightweight = true)
end

@testset "TASK-0129 automatic time endpoints rebase independently on update_pane" begin
    # The old full domain is 0.0–0.4 s; adding the second trace extends it to
    # 0.0–1.0 s.  Each endpoint must retain its independent automatic/explicit
    # meaning rather than turning an old automatic value into user input.
    cases = (
        (TASK0129_TIME_REBASE.SignalTimeLimits(0.0, 0.4), TASK0129_TIME_REBASE.SignalTimeLimits(0.0, 1.0)),
        (TASK0129_TIME_REBASE.SignalTimeLimits(0.0, 0.2), TASK0129_TIME_REBASE.SignalTimeLimits(0.0, 0.2)),
        (TASK0129_TIME_REBASE.SignalTimeLimits(0.1, 0.4), TASK0129_TIME_REBASE.SignalTimeLimits(0.1, 1.0)),
        (TASK0129_TIME_REBASE.SignalTimeLimits(0.1, 0.2), TASK0129_TIME_REBASE.SignalTimeLimits(0.1, 0.2)),
    )
    for (before, expected) in cases
        state, short, long, pane_id = task0129_state()
        task0129_replace_pane_limits!(state, pane_id, before)
        task0129_update_pane!(state, pane_id, [short.name, long.name])
        @test task0129_pane(state, pane_id).time_limits == expected
    end
end

@testset "TASK-0129 atomic view carries automatic endpoints to the new membership full range" begin
    state, short, long, pane_id = task0129_state()
    snapshot = TASK0129_TIME_REBASE.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "visible_signals" => [short.name, long.name],
    ); lightweight = true)
    expected = TASK0129_TIME_REBASE.SignalTimeLimits(0.0, 1.0)
    display = TASK0129_TIME_REBASE.signal_analyser_active_display(state)
    @test display.time_limits == expected
    @test task0129_pane(state, pane_id).time_limits == expected
    @test snapshot["time_limits"] == Dict("min_s" => 0.0, "max_s" => 1.0, "units" => "s")

    # The settings wire format represents both rebased full-domain endpoints
    # as automatic, never materialized numeric values.
    document = TASK0129_TIME_REBASE.signal_settings_document(
        TASK0129_TIME_REBASE.SignalSettingsService(), state, display.id,
    )
    @test document["screen"]["time.x_limits"] === nothing
end
