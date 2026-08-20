using Test

const TASK0126 = Main.AppTestContext

"""Small deterministic extrema provider: it exposes the range passed by production."""
mutable struct Task0126PeaksProvider <: TASK0126.AbstractPeaksProvider
    queries::Vector{TASK0126.SignalPeaksQuery}
end

function TASK0126.signal_peaks_detect(
    provider::Task0126PeaksProvider,
    query::TASK0126.SignalPeaksQuery,
)
    push!(provider.queries, query)
    TASK0126.SignalPeaksProviderResult(
        [maximum(query.values)], [argmax(query.values)], [1.0], [1.0], length(query.values),
    )
end

function task0126_bound_state(; peaks_provider = TASK0126.EngeeDSPPeaksProvider())
    state = TASK0126.default_signal_analyser_state(peaks_provider = peaks_provider)
    layout = TASK0126.signal_analyser_layout_by_display_id(state, state.active_display_id)
    pane = TASK0126.signal_display_active_pane(layout)
    signal = only(state.signals)
    TASK0126.apply_signal_analyser_view!(state, Dict(
        "state_revision" => state.view.state_revision,
        "row_selected_signal" => signal.name,
        "analysis_signal" => signal.name,
        "visible_signals" => [signal.name],
    ); lightweight = true)
    state, signal, pane.id
end

@testset "TASK-0126 summary and original signal palette remain exact" begin
    signal = TASK0126.AnalysedSignal(
        "summary-fixture", "#2563eb", 2.0, ComplexF64[3, -2, 1, 4], false, true,
    )
    state = TASK0126.SignalAnalyserState(
        [signal], TASK0126.SignalAnalyserViewState(11, TASK0126.TIME_PLOT, signal.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
    payload = TASK0126.signal_inventory_summary_payload(state, signal.id)
    summary = payload["summary"]
    @test payload["ok"] === true
    @test payload["state_revision"] == 11
    @test summary == Dict{String,Any}(
        "sample_count" => 4,
        "duration_s" => 1.5,
        "data_type" => "Вещественный",
        "ordinate" => "real",
        "region_start_s" => 0.0,
        "region_end_s" => 1.5,
        "minimum" => -2.0,
        "minimum_time_s" => 0.5,
        "minimum_sample_index" => 1,
        "maximum" => 4.0,
        "maximum_time_s" => 1.5,
        "maximum_sample_index" => 3,
        "mean" => 1.5,
        "median" => 2.0,
        "range" => 6.0,
        "peak_to_peak" => 6.0,
        "rms" => sqrt(7.5),
        "units" => Dict{String,Any}("value" => "1", "time" => "s"),
    )

    original_palette = [
        "#2563eb", "#dc2626", "#16a34a", "#9333ea",
        "#ea580c", "#0891b2", "#ca8a04", "#db2777",
    ]
    palette = TASK0126.SignalColorPalette()
    @test collect(palette.colors) == original_palette
    @test TASK0126.default_signal_catalog()[1].color == first(original_palette)
    @test TASK0126.signal_palette_next_color(palette, Set([first(original_palette)]), 2, first(original_palette)) == original_palette[2]
end

@testset "TASK-0126 pane/display names are output-neutral and warmup binds a valid main" begin
    state, signal, pane_id = task0126_bound_state()
    display_id = state.active_display_id
    TASK0126.signal_analyser_active_output(state, display_id, pane_id)
    task = state.output_manager.active_task
    task === nothing || wait(task)
    ready = TASK0126.signal_analyser_active_output(state, display_id, pane_id)
    @test ready["isready"] === true && ready["success"] === true
    page_id = TASK0126.signal_analyser_output_page_id(display_id, pane_id)
    before_status = state.output_manager.output_statuses[page_id]
    before_need_update = state.output_manager.need_update_pages[page_id]
    before_token = state.output_manager.cancellation_token
    settings = TASK0126.SignalSettingsService()
    for (field_id, value) in (("display.name", "Screen alpha"), ("pane.name", "Area alpha"))
        draft = TASK0126.apply_signal_setting!(settings, state, Dict(
            "state_revision" => state.view.state_revision, "display_id" => display_id,
            "field_id" => field_id, "value" => value,
        ))
        applied = TASK0126.apply_signal_settings!(settings, state, Dict(
            "state_revision" => draft["state"]["state_revision"], "display_id" => display_id,
        ))
        @test applied["success"] === true
        @test state.output_manager.output_statuses[page_id] === before_status
        @test state.output_manager.need_update_pages[page_id] == before_need_update
        @test state.output_manager.cancellation_token === before_token
    end
    pane = TASK0126.signal_display_active_pane(TASK0126.signal_analyser_layout_by_display_id(state, display_id))
    @test (TASK0126.signal_analyser_active_display(state).name, pane.name) == ("Screen alpha", "Area alpha")

    warm_state = TASK0126.default_signal_analyser_state()
    warm_layout = TASK0126.signal_analyser_layout_by_display_id(warm_state, warm_state.active_display_id)
    warm_pane = TASK0126.signal_display_active_pane(warm_layout)
    warm_signal = only(warm_state.signals)
    warmed = TASK0126.apply_signal_analyser_view!(warm_state, Dict(
        "state_revision" => warm_state.view.state_revision,
        "active_plot" => "time", "row_selected_signal" => warm_signal.name,
        "analysis_signal" => warm_signal.name, "selected_signal" => warm_signal.name,
        "visible_signals" => [warm_signal.name], "measurement_kinds" => String[],
        "peaks_enabled" => false,
    ); lightweight = true)
    warm_pane = TASK0126.signal_display_active_pane(TASK0126.signal_analyser_layout_by_display_id(warm_state, warm_state.active_display_id))
    @test warmed["analysis_signal"] == warm_signal.name
    @test TASK0126.signal_display_pane_members(warm_pane) == [warm_signal.name]
    @test TASK0126.signal_display_pane_analysis_name(warm_pane) == warm_signal.name
    @test warm_pane.time_limits == TASK0126.signal_full_time_limits(warm_state.measurements_service, warm_signal)
end

@testset "TASK-0126 visible extrema range is strict, scoped and cache-distinct" begin
    state, signal, pane_id = task0126_bound_state()
    display_id = state.active_display_id
    base = Dict("state_revision" => state.view.state_revision, "display_id" => display_id, "pane_id" => pane_id)
    request = TASK0126.validate_signal_peaks_calculation_request(merge(copy(base), Dict(
        "visible_range" => Dict("min_s" => 0.0, "max_s" => 0.1),
    )))
    @test request.visible_range == TASK0126.SignalTimePeaksVisibleRange(0.0, 0.1)
    for malformed in (
        Dict("min_s" => 0.0), Dict("min_s" => 1.0, "max_s" => 1.0),
        Dict("min_s" => true, "max_s" => 1.0), Dict("min_s" => 0.0, "max_hz" => 1.0),
        Dict("min_s" => 0.0, "max_s" => 1.0, "extra" => 1),
    )
        @test_throws TASK0126.SignalAnalyserValidationError TASK0126.validate_signal_peaks_calculation_request(
            merge(copy(base), Dict("visible_range" => malformed)),
        )
    end
    @test TASK0126.validate_signal_peaks_calculation_request(base).visible_range === nothing

    # Full-domain legacy requests retain `nothing`; an explicit view range is
    # part of the cache identity and therefore cannot reuse that result.
    full = TASK0126.signal_analyser_peaks_context_unlocked(state, display_id, pane_id, nothing)
    visible = TASK0126.signal_analyser_peaks_context_unlocked(
        state, display_id, pane_id, TASK0126.SignalTimePeaksVisibleRange(0.0, 0.1),
    )
    @test full.visible_range === nothing
    @test full != visible
    @test TASK0126.signal_analyser_peaks_context_id(full) != TASK0126.signal_analyser_peaks_context_id(visible)

    provider = Task0126PeaksProvider(TASK0126.SignalPeaksQuery[])
    spectrum_state, spectrum_signal, spectrum_pane_id = task0126_bound_state(peaks_provider = provider)
    spectrum_display_id = spectrum_state.active_display_id
    TASK0126.apply_signal_analyser_layout!(spectrum_state, Dict(
        "state_revision" => spectrum_state.view.state_revision, "operation" => "update_pane",
        "display_id" => spectrum_display_id, "version" => 1, "pane_id" => spectrum_pane_id,
        "plot_type" => "spectrum", "signal_bindings" => [spectrum_signal.name],
    ); lightweight = true)
    typed = TASK0126.validate_signal_peaks_calculation_request(Dict(
        "state_revision" => spectrum_state.view.state_revision, "display_id" => spectrum_display_id,
        "pane_id" => spectrum_pane_id, "visible_range" => Dict("min_hz" => 0.0, "max_hz" => spectrum_signal.sample_rate_hz / 2),
    ))
    @test typed.visible_range == TASK0126.SignalSpectrumPeaksVisibleRange(0.0, spectrum_signal.sample_rate_hz / 2)
    @test_throws TASK0126.SignalAnalyserValidationError TASK0126.calculate_signal_analyser_active_peaks!(
        spectrum_state, Dict("state_revision" => spectrum_state.view.state_revision,
        "display_id" => spectrum_display_id, "pane_id" => spectrum_pane_id,
        "visible_range" => Dict("min_s" => 0.0, "max_s" => 0.1)),
    )
end
