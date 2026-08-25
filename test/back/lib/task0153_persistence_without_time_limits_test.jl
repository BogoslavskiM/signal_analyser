using Test

const TASK0153 = Main.AppTestContext

@testset "TASK-0153 Persistence preparation accepts its no-time-ROI pane state" begin
    TASK0153.reset_pspectrum_double!()
    TASK0153.reset_persistence_double!()
    state = TASK0153.default_signal_analyser_state()
    display = TASK0153.signal_analyser_active_display(state)
    signal = only(state.signals)
    display.time_limits = nothing

    prepared = TASK0153.signal_analyser_prepare_display_plots(
        state,
        display,
        signal,
        [signal.name],
    )

    @test isempty(TASK0153.SPECTRUM_CALLS)
    @test isempty(prepared.spectrum_cache)
    @test isempty(prepared.plots["spectrum"]["x"])
    @test length(TASK0153.PERSISTENCE_CALLS) == 1
    @test !isempty(prepared.plots["persistence"]["x"])
end
