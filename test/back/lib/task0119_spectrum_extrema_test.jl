using Test

const TASK0119_SPECTRUM_EXTREMA = Main.AppTestContext

"""A local three-bin Spectrum double: the production provider remains Engee-only."""
struct Task0119SpectrumProvider <: TASK0119_SPECTRUM_EXTREMA.AbstractSignalSpectrumProvider end

function TASK0119_SPECTRUM_EXTREMA.signal_spectrum_calculate(
    ::Task0119SpectrumProvider,
    query::TASK0119_SPECTRUM_EXTREMA.SignalSpectrumQuery,
)::TASK0119_SPECTRUM_EXTREMA.SignalSpectrumData
    push!(TASK0119_SPECTRUM_EXTREMA.SPECTRUM_CALLS, query)
    TASK0119_SPECTRUM_EXTREMA.SignalSpectrumData(
        [10.0, 20.0, 30.0],
        [1.0, 9.0, 2.0],
        query.topology,
    )
end

mutable struct Task0119PeaksProvider <: TASK0119_SPECTRUM_EXTREMA.AbstractPeaksProvider
    calls::Vector{TASK0119_SPECTRUM_EXTREMA.SignalPeaksQuery}
end

function TASK0119_SPECTRUM_EXTREMA.signal_peaks_detect(
    provider::Task0119PeaksProvider,
    query::TASK0119_SPECTRUM_EXTREMA.SignalPeaksQuery,
)
    push!(provider.calls, query)
    TASK0119_SPECTRUM_EXTREMA.SignalPeaksProviderResult(
        [9.0], [2], [1.0], [8.0], length(query.values),
    )
end

@testset "TASK-0119 Spectrum extrema stay passive until explicit calculation" begin
    empty!(TASK0119_SPECTRUM_EXTREMA.SPECTRUM_CALLS)
    peaks_provider = Task0119PeaksProvider(TASK0119_SPECTRUM_EXTREMA.SignalPeaksQuery[])
    state = TASK0119_SPECTRUM_EXTREMA.default_signal_analyser_state(
        peaks_provider = peaks_provider,
        spectrum_provider = Task0119SpectrumProvider(),
    )
    signal = only(state.signals)
    display_id = state.active_display_id
    pane_id = state.display_layouts[display_id].active_pane_id

    TASK0119_SPECTRUM_EXTREMA.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "spectrum",
        "signal_bindings" => [signal.name],
    ); lightweight = true)
    TASK0119_SPECTRUM_EXTREMA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "peaks_enabled" => true,
    ))

    # Regression: building a Spectrum state/snapshot must not dispatch the
    # legacy TIME cache path or call either provider.
    snapshot = TASK0119_SPECTRUM_EXTREMA.signal_analyser_snapshot(state)
    @test snapshot["active_plot"] == "spectrum"
    @test snapshot["peaks"]["enabled"] === true
    @test isempty(TASK0119_SPECTRUM_EXTREMA.SPECTRUM_CALLS)
    @test isempty(peaks_provider.calls)

    passive = TASK0119_SPECTRUM_EXTREMA.signal_analyser_active_peaks(
        state, display_id, pane_id,
    )
    @test passive["isready"] === false && passive["success"] === false
    @test passive["data"]["signals"][1]["ordinate"] == "magnitude"
    @test passive["data"]["signals"][1]["units"]["time"] == "Hz"
    @test isempty(TASK0119_SPECTRUM_EXTREMA.SPECTRUM_CALLS)
    @test isempty(peaks_provider.calls)

    pending = TASK0119_SPECTRUM_EXTREMA.calculate_signal_analyser_active_peaks!(
        state,
        Dict(
            "state_revision" => state.view.state_revision,
            "display_id" => display_id,
            "pane_id" => pane_id,
        ),
    )
    @test pending["isready"] === false && pending["success"] === false
    worker = state.output_manager.active_task
    @test worker isa Task
    wait(worker::Task)

    ready = TASK0119_SPECTRUM_EXTREMA.signal_analyser_active_peaks(
        state, display_id, pane_id,
    )
    @test ready["isready"] === true && ready["success"] === true
    @test length(TASK0119_SPECTRUM_EXTREMA.SPECTRUM_CALLS) == 1
    @test length(peaks_provider.calls) == 1
    @test peaks_provider.calls[1].ordinate == TASK0119_SPECTRUM_EXTREMA.MAGNITUDE_ORDINATE
    @test ready["data"]["rows"][1]["frequency_hz"] == 20.0
    @test ready["data"]["rows"][1]["frequency"] == 20.0
end
