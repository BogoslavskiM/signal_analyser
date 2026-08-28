using Test

const TASK0097_EXPLICIT_EXTREMA = Main.AppTestContext

mutable struct Task0097ExplicitPeaksProvider <: TASK0097_EXPLICIT_EXTREMA.AbstractPeaksProvider
    calls::Vector{TASK0097_EXPLICIT_EXTREMA.SignalPeaksQuery}
    started::Channel{Nothing}
    release::Channel{Nothing}
    result::TASK0097_EXPLICIT_EXTREMA.SignalPeaksProviderResult
end

function TASK0097_EXPLICIT_EXTREMA.signal_peaks_detect(
    provider::Task0097ExplicitPeaksProvider,
    query::TASK0097_EXPLICIT_EXTREMA.SignalPeaksQuery,
)
    push!(provider.calls, query)
    put!(provider.started, nothing)
    take!(provider.release)
    provider.result
end

function task0097_explicit_provider()
    Task0097ExplicitPeaksProvider(
        TASK0097_EXPLICIT_EXTREMA.SignalPeaksQuery[],
        Channel{Nothing}(1),
        Channel{Nothing}(1),
        TASK0097_EXPLICIT_EXTREMA.SignalPeaksProviderResult(
            [0.95], [2], [1.0], [0.5], length(only(
                TASK0097_EXPLICIT_EXTREMA.default_signal_catalog(),
            ).values),
        ),
    )
end

"""Spectrum double that parks only the graph's first provider call."""
mutable struct Task0755BlockingSpectrumProvider <: TASK0097_EXPLICIT_EXTREMA.AbstractSignalSpectrumProvider
    calls::Threads.Atomic{Int}
    started::Channel{Nothing}
    release::Channel{Nothing}
end

function TASK0097_EXPLICIT_EXTREMA.signal_spectrum_calculate(
    provider::Task0755BlockingSpectrumProvider,
    query::TASK0097_EXPLICIT_EXTREMA.SignalSpectrumQuery,
)::TASK0097_EXPLICIT_EXTREMA.SignalSpectrumData
    call_number = Threads.atomic_add!(provider.calls, 1) + 1
    if call_number == 1
        put!(provider.started, nothing)
        take!(provider.release)
    end
    TASK0097_EXPLICIT_EXTREMA.SignalSpectrumData(
        [0.0, query.sample_rate_hz / 2],
        [1.0, 4.0],
        query.topology,
    )
end

struct Task0755ReadyPeaksProvider <: TASK0097_EXPLICIT_EXTREMA.AbstractPeaksProvider end

function TASK0097_EXPLICIT_EXTREMA.signal_peaks_detect(
    ::Task0755ReadyPeaksProvider,
    query::TASK0097_EXPLICIT_EXTREMA.SignalPeaksQuery,
)
    TASK0097_EXPLICIT_EXTREMA.SignalPeaksProviderResult(
        [4.0], [2], [1.0], [1.0], length(query.values),
    )
end

function task0097_bind_and_enable_extrema!(state)
    signal_name = only(state.signals).name
    pane_id = state.display_layouts[state.active_display_id].active_pane_id
    TASK0097_EXPLICIT_EXTREMA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "active_plot" => "time",
        "row_selected_signal" => signal_name,
        "analysis_signal" => signal_name,
        "selected_signal" => signal_name,
        "visible_signals" => [signal_name],
        "measurement_kinds" => String[],
        "peaks_enabled" => true,
    ); lightweight = true)
    pane_id
end

@testset "HND-0581 Extrema defaults and explicit calculation request validation" begin
    state = TASK0097_EXPLICIT_EXTREMA.default_signal_analyser_state()
    layout = state.display_layouts["display-1"]
    pane = only(filter(item -> item.id == layout.active_pane_id, layout.panes))
    @test pane.peaks_settings == TASK0097_EXPLICIT_EXTREMA.SignalPeaksSettings()
    @test pane.peaks_settings.number_of_peaks == 5
    fields = TASK0097_EXPLICIT_EXTREMA.signal_peaks_settings_fields_payload(
        pane.peaks_settings,
    )
    count_field = only(filter(field -> field["id"] == "number_of_peaks", fields))
    @test count_field["value"] == 5
    @test count_field["default_value"] == 5

    exact = TASK0097_EXPLICIT_EXTREMA.validate_signal_peaks_calculation_request(Dict(
        "state_revision" => 0,
        "display_id" => "display-1",
        "pane_id" => "pane-1",
    ))
    @test (exact.state_revision, exact.display_id, exact.pane_id) ==
        (0, "display-1", "pane-1")
    @test_throws TASK0097_EXPLICIT_EXTREMA.SignalAnalyserValidationError begin
        TASK0097_EXPLICIT_EXTREMA.validate_signal_peaks_calculation_request(Dict(
            "state_revision" => 0,
            "display_id" => "display-1",
        ))
    end
    @test_throws TASK0097_EXPLICIT_EXTREMA.SignalAnalyserValidationError begin
        TASK0097_EXPLICIT_EXTREMA.validate_signal_peaks_calculation_request(Dict(
            "state_revision" => 0,
            "display_id" => "display-1",
            "pane_id" => "pane-1",
            "settings" => Dict{String,Any}(),
        ))
    end
end

@testset "HND-0581 passive GET never schedules; explicit POST progresses pending to ready" begin
    provider = task0097_explicit_provider()
    state = TASK0097_EXPLICIT_EXTREMA.default_signal_analyser_state(
        peaks_provider = provider,
    )
    pane_id = task0097_bind_and_enable_extrema!(state)
    manager = state.output_manager
    page_id = "display-1::$pane_id"

    graph_revision = manager.calculation_revision
    graph_dirty = copy(manager.need_update_pages)
    graph_cache = deepcopy(manager.plot_cache)
    passive = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_peaks(
        state, "display-1", pane_id,
    )
    @test passive["isready"] === false && passive["success"] === false
    @test passive["error"] == ""
    @test passive["settings"]["number_of_peaks"] == 5
    @test isempty(provider.calls)
    @test manager.active_task === nothing
    @test isempty(manager.queued_peaks_contexts)
    @test !haskey(manager.peaks_statuses, page_id)

    pending = TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(
        state,
        Dict(
            "state_revision" => state.view.state_revision,
            "display_id" => "display-1",
            "pane_id" => pane_id,
        ),
    )
    @test pending["isready"] === false && pending["success"] === false
    @test pending["error"] == ""
    take!(provider.started)
    @test length(provider.calls) == 1
    @test provider.calls[1].settings.number_of_peaks == 5
    @test manager.calculation_revision == graph_revision
    @test manager.need_update_pages == graph_dirty
    @test manager.plot_cache == graph_cache
    @test isempty(manager.queued_contexts)

    polled = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_peaks(
        state, "display-1", pane_id,
    )
    @test polled["isready"] === false && polled["success"] === false
    @test length(provider.calls) == 1

    worker = manager.active_task
    @test worker isa Task
    put!(provider.release, nothing)
    wait(worker::Task)
    ready = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_peaks(
        state, "display-1", pane_id,
    )
    @test ready["isready"] === true && ready["success"] === true
    @test ready["error"] == ""
    @test ready["data"]["signals"][1]["peak_count"] == 1
    @test length(ready["data"]["rows"]) == 1
    @test length(provider.calls) == 1

    recalculation = TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(
        state,
        Dict(
            "state_revision" => state.view.state_revision,
            "display_id" => "display-1",
            "pane_id" => pane_id,
        ),
    )
    @test recalculation["isready"] === false && recalculation["success"] === false
    take!(provider.started)
    recalculate_worker = manager.peaks_task
    @test recalculate_worker isa Task
    @test length(provider.calls) == 2
    put!(provider.release, nothing)
    wait(recalculate_worker::Task)
    recalculated = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_peaks(
        state, "display-1", pane_id,
    )
    @test recalculated["isready"] === true && recalculated["success"] === true
    @test manager.peaks_task === nothing
end

@testset "HND-0755 extrema worker completes while an independent graph worker is busy" begin
    spectrum = Task0755BlockingSpectrumProvider(
        Threads.Atomic{Int}(0), Channel{Nothing}(1), Channel{Nothing}(1),
    )
    state = TASK0097_EXPLICIT_EXTREMA.default_signal_analyser_state(
        peaks_provider = Task0755ReadyPeaksProvider(),
        spectrum_provider = spectrum,
    )
    display_id = state.active_display_id
    pane_id = state.display_layouts[display_id].active_pane_id
    signal_name = only(state.signals).name
    TASK0097_EXPLICIT_EXTREMA.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "active_plot" => "spectrum",
        "row_selected_signal" => signal_name,
        "analysis_signal" => signal_name,
        "selected_signal" => signal_name,
        "visible_signals" => [signal_name],
        "measurement_kinds" => String[],
        "peaks_enabled" => true,
    ); lightweight = true)

    graph_worker = nothing
    graph_released = false
    try
        graph_pending = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_output(
            state, display_id, pane_id,
        )
        @test graph_pending["isready"] === false && graph_pending["success"] === false
        take!(spectrum.started)
        graph_worker = state.output_manager.active_task
        @test graph_worker isa Task && !istaskdone(graph_worker::Task)

        peaks_pending = TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(
            state,
            Dict(
                "state_revision" => state.view.state_revision,
                "display_id" => display_id,
                "pane_id" => pane_id,
            ),
        )
        @test peaks_pending["isready"] === false && peaks_pending["success"] === false
        peaks_worker = state.output_manager.peaks_task
        @test peaks_worker isa Task && peaks_worker !== graph_worker
        wait(peaks_worker::Task)

        peaks_ready = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_peaks(
            state, display_id, pane_id,
        )
        @test peaks_ready["isready"] === true && peaks_ready["success"] === true
        @test !istaskdone(graph_worker::Task)
        @test state.output_manager.active_task === graph_worker

        put!(spectrum.release, nothing)
        graph_released = true
        wait(graph_worker::Task)
        graph_ready = TASK0097_EXPLICIT_EXTREMA.signal_analyser_active_output(
            state, display_id, pane_id,
        )
        @test graph_ready["isready"] === true && graph_ready["success"] === true
        @test spectrum.calls[] == 2
    finally
        graph_released || put!(spectrum.release, nothing)
        graph_worker isa Task && wait(graph_worker::Task)
    end
end

@testset "HND-0581 explicit Extrema rejects stale, inactive, invalid and empty contexts atomically" begin
    provider = task0097_explicit_provider()
    state = TASK0097_EXPLICIT_EXTREMA.default_signal_analyser_state(
        peaks_provider = provider,
    )
    pane_id = task0097_bind_and_enable_extrema!(state)
    revision = state.view.state_revision
    manager = state.output_manager
    peaks_revision = manager.peaks_calculation_revision
    peaks_dirty = copy(manager.peaks_need_update_pages)

    @test_throws TASK0097_EXPLICIT_EXTREMA.SignalAnalyserStaleStateError begin
        TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(state, Dict(
            "state_revision" => revision - 1,
            "display_id" => "display-1",
            "pane_id" => pane_id,
        ))
    end
    @test_throws TASK0097_EXPLICIT_EXTREMA.SignalAnalyserInactiveOutputError begin
        TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(state, Dict(
            "state_revision" => revision,
            "display_id" => "display-1",
            "pane_id" => "pane-missing",
        ))
    end
    @test manager.peaks_calculation_revision == peaks_revision
    @test manager.peaks_need_update_pages == peaks_dirty
    @test isempty(provider.calls)
    @test manager.active_task === nothing

    empty_provider = task0097_explicit_provider()
    empty_state = TASK0097_EXPLICIT_EXTREMA.default_signal_analyser_state(
        peaks_provider = empty_provider,
    )
    empty_result = TASK0097_EXPLICIT_EXTREMA.calculate_signal_analyser_active_peaks!(
        empty_state,
        Dict(
            "state_revision" => 0,
            "display_id" => "display-1",
            "pane_id" => "pane-1",
        ),
    )
    @test empty_result["isready"] === true && empty_result["success"] === true
    @test empty_result["data"]["signals"] == Dict{String,Any}[]
    @test empty_result["data"]["rows"] == Dict{String,Any}[]
    @test isempty(empty_provider.calls)
    @test empty_state.output_manager.active_task === nothing
end

@testset "HND-0581 route source distinguishes passive GET from explicit POST" begin
    routes = TASK0097_EXPLICIT_EXTREMA.source("app", "routes.jl")
    @test occursin("route(\"/api/peaks/active\", method = GET)", routes)
    @test occursin("signal_analyser_active_peaks(", routes)
    @test occursin("route(\"/api/peaks/active\", method = POST)", routes)
    @test occursin("calculate_signal_analyser_active_peaks!(", routes)
end
