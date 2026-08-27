using Test

const TASK0162 = Main.AppTestContext

mutable struct Task0162PeaksProvider <: TASK0162.AbstractPeaksProvider
    calls::Vector{TASK0162.SignalPeaksQuery}
    failures_remaining::Int
end

function TASK0162.signal_peaks_detect(
    provider::Task0162PeaksProvider,
    query::Task0162.SignalPeaksQuery,
)
    push!(provider.calls, query)
    if provider.failures_remaining > 0
        provider.failures_remaining -= 1
        throw(ArgumentError("deterministic extrema provider failure"))
    end
    TASK0162.SignalPeaksProviderResult(
        [query.values[2]], [2], [1.0], [1.0], length(query.values),
    )
end

function task0162_bound_state(provider::Task0162PeaksProvider; include_short::Bool = false)
    state = TASK0162.default_signal_analyser_state(peaks_provider = provider)
    primary = only(state.signals)
    if include_short
        push!(state.signals, TASK0162.AnalysedSignal(
            "task0162-short", "Короткий сигнал", "#dc2626", 10.0,
            [1.0, -1.0], false, true,
        ))
    end
    pane_id = state.display_layouts[state.active_display_id].active_pane_id
    bindings = include_short ? [primary.name, "Короткий сигнал"] : [primary.name]
    TASK0162.apply_signal_analyser_layout!(state, Dict(
        "state_revision" => state.view.state_revision,
        "operation" => "update_pane",
        "display_id" => state.active_display_id,
        "version" => 1,
        "pane_id" => pane_id,
        "plot_type" => "time",
        "signal_bindings" => bindings,
    ); lightweight = true)
    TASK0162.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "peaks_enabled" => true,
    ))
    state, pane_id, primary
end

function task0162_wait_peaks!(state, display_id, pane_id)
    task = state.output_manager.active_task
    task isa Task && wait(task)
    TASK0162.signal_analyser_active_peaks(state, display_id, pane_id)
end

function task0162_with_limits(pane, limits)
    TASK0162.SignalDisplayPaneState(
        pane.id, pane.name, pane.plot_type, pane.membership, pane.analysis_source,
        limits, pane.measurement_selection, pane.spectrum_settings,
        pane.spectrogram_settings, pane.persistence_settings, pane.stored_settings,
        pane.peaks_enabled, pane.peaks_settings,
    )
end

@testset "HND-0738 mixed/all-empty TIME ROI keeps successful per-signal extrema" begin
    provider = Task0162PeaksProvider(TASK0162.SignalPeaksQuery[], 0)
    state, pane_id, primary = task0162_bound_state(provider; include_short = true)
    display_id = state.active_display_id

    mixed = TASK0162.signal_analyser_calculate_active_peaks!(
        state, display_id, pane_id;
        expected_state_revision = state.view.state_revision,
        visible_range = TASK0162.SignalTimePeaksVisibleRange(0.15, 0.20),
    )
    @test mixed["isready"] === false && mixed["success"] === false
    ready = task0162_wait_peaks!(state, display_id, pane_id)
    @test ready["isready"] === true && ready["success"] === true
    @test !occursin("Time Limits не содержат ни одного отсчёта", ready["error"])
    @test length(provider.calls) == 1 && only(provider.calls).signal_name == primary.name
    @test [item["signal_name"] for item in ready["data"]["signals"]] == [primary.name, "Короткий сигнал"]
    @test [item["peak_count"] for item in ready["data"]["signals"]] == [1, 0]
    @test length(ready["data"]["rows"]) == 1 && ready["data"]["rows"][1]["signal_name"] == primary.name

    empty_provider = Task0162PeaksProvider(TASK0162.SignalPeaksQuery[], 0)
    empty_state, empty_pane_id, _ = task0162_bound_state(empty_provider; include_short = true)
    all_empty = TASK0162.signal_analyser_calculate_active_peaks!(
        empty_state, empty_state.active_display_id, empty_pane_id;
        expected_state_revision = empty_state.view.state_revision,
        visible_range = TASK0162.SignalTimePeaksVisibleRange(0.30, 0.40),
    )
    @test all_empty["isready"] === false
    all_empty_ready = task0162_wait_peaks!(empty_state, empty_state.active_display_id, empty_pane_id)
    @test all_empty_ready["isready"] === true && all_empty_ready["success"] === true
    @test isempty(empty_provider.calls)
    @test isempty(all_empty_ready["data"]["rows"])
    @test [item["peak_count"] for item in all_empty_ready["data"]["signals"]] == [0, 0]
end

@testset "HND-0738 terminal extrema error and ready result both start a new revision" begin
    provider = Task0162PeaksProvider(TASK0162.SignalPeaksQuery[], 1)
    state, pane_id, _ = task0162_bound_state(provider)
    display_id = state.active_display_id
    range = TASK0162.SignalTimePeaksVisibleRange(0.02, 0.12)

    first = TASK0162.signal_analyser_calculate_active_peaks!(state, display_id, pane_id;
        expected_state_revision = state.view.state_revision, visible_range = range)
    @test first["isready"] === false
    failed = task0162_wait_peaks!(state, display_id, pane_id)
    @test failed["isready"] === true && failed["success"] === false
    failure_revision = failed["calculation_revision"]

    retry = TASK0162.signal_analyser_calculate_active_peaks!(state, display_id, pane_id;
        expected_state_revision = state.view.state_revision, visible_range = range)
    @test retry["isready"] === false && retry["calculation_revision"] > failure_revision
    ready = task0162_wait_peaks!(state, display_id, pane_id)
    @test ready["isready"] === true && ready["success"] === true
    ready_revision = ready["calculation_revision"]

    recalculate = TASK0162.signal_analyser_calculate_active_peaks!(state, display_id, pane_id;
        expected_state_revision = state.view.state_revision, visible_range = range)
    @test recalculate["isready"] === false && recalculate["calculation_revision"] > ready_revision
    final = task0162_wait_peaks!(state, display_id, pane_id)
    @test final["isready"] === true && final["success"] === true
    @test length(provider.calls) == 3
end

@testset "HND-0738 TIME ROI boundaries, offsets and peak snapshot preparation stay bounded" begin
    provider = Task0162PeaksProvider(TASK0162.SignalPeaksQuery[], 0)
    state, pane_id, _ = task0162_bound_state(provider)
    display = TASK0162.signal_analyser_active_display(state)
    pane = TASK0162.signal_analyser_layout_pane_by_id(
        TASK0162.signal_analyser_layout_by_display_id(state, state.active_display_id), pane_id,
    )
    precise = TASK0162.AnalysedSignal(
        "task0162-precise", "Точный сигнал", "#16a34a", 10.0,
        [0.0, 1.0, 5.0, 3.0, 0.0, -1.0, -2.0, 0.0], false, true,
    )
    exact_limits = TASK0162.SignalTimeLimits(0.2, 0.4)
    range = TASK0162.signal_time_sample_range_or_nothing(
        state.peaks_service.ordinate_service.roi_service, precise, exact_limits,
    )
    @test range !== nothing && (range.first_index, range.last_index) == (3, 5)
    projected = TASK0162.signal_analyser_display_for_pane(display, task0162_with_limits(pane, exact_limits))
    snapshot = TASK0162.signal_peaks_snapshot(
        state.peaks_service, 0, projected, precise; materialize = true,
    )
    query = only(provider.calls)
    @test query.values == [5.0, 3.0, 0.0] && query.sample_offset == 2
    position = only(snapshot.items).position
    @test position.sample_index == 3 && position.time_s == 0.3

    large = TASK0162.AnalysedSignal(
        "task0162-large", "Большой сигнал", "#7c3aed", 10_000.0,
        zeros(ComplexF64, 1_000_000), false, true,
    )
    large_limits = TASK0162.SignalTimeLimits(40.0, 40.1)
    roi_service = state.peaks_service.ordinate_service.roi_service
    TASK0162.signal_time_sample_range_or_nothing(roi_service, large, large_limits)
    @test @allocated(TASK0162.signal_time_sample_range_or_nothing(roi_service, large, large_limits)) <= 256

    values = zeros(Float64, 409_601)
    settings = TASK0162.SignalPeaksSettings()
    TASK0162.SignalPeaksQuery(0, "display-1", "large", TASK0162.REAL_ORDINATE, values, 1.0, 0, settings)
    query_allocations = @allocated TASK0162.SignalPeaksQuery(
        0, "display-1", "large", TASK0162.REAL_ORDINATE, values, 1.0, 0, settings,
    )
    query = TASK0162.SignalPeaksQuery(0, "display-1", "large", TASK0162.REAL_ORDINATE, values, 1.0, 0, settings)
    @test query.values === values && query_allocations <= 2_048

    state.plot_cache["rendered"] = Dict{String,Any}("x" => zeros(1_000_000), "y" => zeros(1_000_000))
    TASK0162.signal_analyser_clone_state_for_peaks(state)
    clone_allocations = @allocated TASK0162.signal_analyser_clone_state_for_peaks(state)
    clone = TASK0162.signal_analyser_clone_state_for_peaks(state)
    @test clone.plot_cache !== state.plot_cache && clone.plot_cache["rendered"] === state.plot_cache["rendered"]
    @test clone_allocations < 500_000
end
