using Test

const TASK0157_LIMITS = Main.AppTestContext

function task0157_active_pane(state)
    layout = TASK0157_LIMITS.signal_analyser_layout_by_display_id(
        state,
        state.active_display_id,
    )
    TASK0157_LIMITS.signal_display_active_pane(layout)
end

@testset "TASK-0157 Spectrum and Persistence transitions recover automatic domains without an analysis source" begin
    state = TASK0157_LIMITS.default_signal_analyser_state()
    signal = only(state.signals)

    spectrum = TASK0157_LIMITS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "active_plot" => "spectrum",
        "visible_signals" => [signal.name],
        "analysis_signal" => nothing,
        "selected_signal" => nothing,
    ); lightweight = true)
    spectrum_pane = task0157_active_pane(state)
    @test spectrum["state_revision"] == 1
    @test TASK0157_LIMITS.signal_display_pane_members(spectrum_pane) == [signal.name]
    @test TASK0157_LIMITS.signal_display_pane_analysis_name(spectrum_pane) === nothing
    @test spectrum_pane.time_limits ==
        TASK0157_LIMITS.signal_full_time_limits(state.measurements_service, signal)
    @test spectrum_pane.spectrum_settings.frequency_limits isa
        TASK0157_LIMITS.AutomaticSignalSpectrumFrequencyLimits

    before_recovery = state.view.state_revision
    recovered_spectrum = TASK0157_LIMITS.signal_analyser_recover_time_limits_unlocked!(state)
    @test isempty(recovered_spectrum.changed_page_ids)
    @test state.view.state_revision == before_recovery

    settings = TASK0157_LIMITS.SignalSettingsService()
    immediate = TASK0157_LIMITS.apply_signal_setting!(settings, state, Dict(
        "state_revision" => before_recovery,
        "display_id" => state.active_display_id,
        "field_id" => "spectrum.frequency_scale",
        "value" => "log",
    ))
    @test immediate["state"]["state_revision"] == before_recovery + 1
    @test state.view.state_revision == before_recovery + 1
    @test task0157_active_pane(state).spectrum_settings.frequency_scale ==
        TASK0157_LIMITS.LOG_SPECTRUM_FREQUENCY_SCALE

    persistence = TASK0157_LIMITS.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "active_plot" => "persistence",
        "visible_signals" => [signal.name],
        "analysis_signal" => nothing,
        "selected_signal" => nothing,
    ); lightweight = true)
    persistence_pane = task0157_active_pane(state)
    @test persistence["state_revision"] == before_recovery + 2
    @test TASK0157_LIMITS.signal_display_pane_members(persistence_pane) == [signal.name]
    @test TASK0157_LIMITS.signal_display_pane_analysis_name(persistence_pane) === nothing
    @test persistence_pane.time_limits === nothing

    before_persistence_recovery = state.view.state_revision
    recovered_persistence = TASK0157_LIMITS.signal_analyser_recover_time_limits_unlocked!(state)
    @test isempty(recovered_persistence.changed_page_ids)
    @test state.view.state_revision == before_persistence_recovery
end
