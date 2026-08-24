"""Raised when a graph request does not identify a pane visible in the active Display."""
struct SignalAnalyserInactiveOutputError <: Exception
    display_id::String
    pane_id::String
    active_display_id::String
    active_pane_id::String
end

const SIGNAL_ANALYSER_ACTIVE_OUTPUT_MAX_PENDING_POLLS::Int = 64
const SIGNAL_ANALYSER_ACTIVE_OUTPUT_POLL_LIMIT_ERROR::String =
    "Расчёт активного графика не завершился за допустимое число опросов"
const SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE::Int =
    SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION * SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION

function Base.showerror(io::IO, err::SignalAnalyserInactiveOutputError)
    print(
        io,
        "Output $(err.display_id)/$(err.pane_id) не входит в активный Display ",
        "$(err.active_display_id); active pane $(err.active_pane_id)",
    )
end

signal_analyser_output_page_id(display_id::AbstractString, pane_id::AbstractString)::String =
    "$(String(display_id))::$(String(pane_id))"

signal_analyser_peaks_cache_key(
    display_id::AbstractString,
    pane_id::AbstractString,
    signal_name::AbstractString,
)::String = "$(String(display_id))::$(String(pane_id))::$(String(signal_name))"

function signal_analyser_output_context_id(context::SignalAnalyserOutputContextKey)::String
    string(
        context.display_id,
        "::",
        context.pane_id,
        "::",
        signal_analyser_plot_name(context.plot_type),
        "::r",
        context.calculation_revision,
    )
end

function signal_analyser_peaks_context_id(context::SignalAnalyserPeaksContextKey)::String
    visible_range_id = if context.visible_range === nothing
        "full"
    elseif context.visible_range isa SignalTimePeaksVisibleRange
        range = context.visible_range::SignalTimePeaksVisibleRange
        "s$(range.min_s):$(range.max_s)"
    else
        range = context.visible_range::SignalSpectrumPeaksVisibleRange
        "hz$(range.min_hz):$(range.max_hz)"
    end
    string(
        context.display_id,
        "::",
        context.pane_id,
        "::peaks::r",
        context.calculation_revision,
        "::",
        visible_range_id,
    )
end

function signal_analyser_output_page_ids(state::SignalAnalyserState)::Vector{String}
    String[
        signal_analyser_output_page_id(display.id, pane.id)
        for display in state.displays
        for pane in signal_analyser_layout_by_display_id(state, display.id).panes
    ]
end

function signal_analyser_active_output_page_id(state::SignalAnalyserState)::String
    layout = signal_analyser_layout_by_display_id(state, state.active_display_id)
    signal_analyser_output_page_id(state.active_display_id, layout.active_pane_id)
end

function signal_analyser_layout_pane_by_id(
    layout::SignalDisplayLayoutState,
    pane_id::AbstractString,
)::SignalDisplayPaneState
    index = findfirst(pane -> pane.id == pane_id, layout.panes)
    index === nothing && throw(ArgumentError("Pane не найдена: $pane_id"))
    layout.panes[index]
end

function signal_analyser_output_context_is_current_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
)::Bool
    context.display_id == state.active_display_id || return false
    layout = signal_analyser_layout_by_display_id(state, state.active_display_id)
    index = findfirst(pane -> pane.id == context.pane_id, layout.panes)
    index === nothing && return false
    pane = layout.panes[index]
    isempty(signal_display_pane_members(pane)) && return false
    page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
    get(state.output_manager.page_calculation_revisions, page_id, -1) ==
        context.calculation_revision && pane.plot_type == context.plot_type
end

function signal_analyser_peaks_context_is_current_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
)::Bool
    context.display_id == state.active_display_id || return false
    layout = signal_analyser_layout_by_display_id(state, context.display_id)
    layout.active_pane_id == context.pane_id || return false
    pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
    pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) || return false
    page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
    get(state.output_manager.peaks_page_calculation_revisions, page_id, -1) ==
        context.calculation_revision || return false
    Tuple(signal_display_pane_members(pane)) == context.signal_names || return false
    pane.plot_type == context.plot_type &&
        isequal(pane.time_limits, context.time_limits) &&
        isequal(
            pane.plot_type == SPECTRUM_PLOT ? pane.spectrum_settings : nothing,
            context.spectrum_settings,
        ) &&
        !(
            pane.plot_type == TIME_PLOT &&
            context.visible_range isa SignalSpectrumPeaksVisibleRange
        ) &&
        !(
            pane.plot_type == SPECTRUM_PLOT &&
            context.visible_range isa SignalTimePeaksVisibleRange
        ) &&
        pane.peaks_settings == context.settings
end

function signal_analyser_sync_output_pages_unlocked!(state::SignalAnalyserState)::Nothing
    manager = state.output_manager
    page_ids = signal_analyser_output_page_ids(state)
    known = Set(page_ids)
    for page_id in page_ids
        get!(manager.page_calculation_revisions, page_id, manager.calculation_revision)
        get!(
            manager.peaks_page_calculation_revisions,
            page_id,
            manager.peaks_calculation_revision,
        )
        get!(manager.need_update_pages, page_id, true)
        get!(manager.peaks_need_update_pages, page_id, true)
    end
    # An unbound pane is a deliberate UI state, not a pending calculation.
    # Keep it ready without retaining output/peaks caches or scheduling work.
    for display in state.displays
        layout = signal_analyser_layout_by_display_id(state, display.id)
        for pane in layout.panes
            isempty(signal_display_pane_members(pane)) || continue
            page_id = signal_analyser_output_page_id(display.id, pane.id)
            manager.need_update_pages[page_id] = false
            manager.peaks_need_update_pages[page_id] = false
            delete!(manager.plot_cache, page_id)
            delete!(manager.output_statuses, page_id)
            delete!(manager.peaks_statuses, page_id)
            delete!(manager.output_poll_counts, page_id)
            delete!(manager.peaks_poll_counts, page_id)
            filter!(pair -> !(
                last(pair).context.display_id == display.id &&
                last(pair).context.pane_id == pane.id
            ), manager.peaks_cache)
        end
    end
    filter!(pair -> first(pair) in known, manager.page_calculation_revisions)
    filter!(pair -> first(pair) in known, manager.peaks_page_calculation_revisions)
    filter!(pair -> first(pair) in known, manager.need_update_pages)
    filter!(pair -> first(pair) in known, manager.peaks_need_update_pages)
    filter!(pair -> first(pair) in known, manager.plot_cache)
    filter!(
        pair -> signal_analyser_output_page_id(
            last(pair).context.display_id,
            last(pair).context.pane_id,
        ) in known,
        manager.peaks_cache,
    )
    filter!(pair -> first(pair) in known, manager.output_statuses)
    filter!(pair -> first(pair) in known, manager.peaks_statuses)
    filter!(pair -> first(pair) in known, manager.output_poll_counts)
    filter!(pair -> first(pair) in known, manager.peaks_poll_counts)
    manager.active_page_id = signal_analyser_active_output_page_id(state)
    filter!(
        context -> signal_analyser_output_context_is_current_unlocked(state, context),
        manager.queued_contexts,
    )
    filter!(
        context -> signal_analyser_peaks_context_is_current_unlocked(state, context),
        manager.queued_peaks_contexts,
    )
    if manager.active_context !== nothing
        running_context = manager.active_context::SignalAnalyserOutputContextKey
        if !signal_analyser_output_context_is_current_unlocked(state, running_context)
            token = manager.cancellation_token
            token === nothing || (token.cancelled[] = true)
            manager.active_context = nothing
            manager.active_poll_count = 0
            manager.cancellation_token = nothing
        end
    end
    if manager.active_peaks_context !== nothing
        running_context = manager.active_peaks_context::SignalAnalyserPeaksContextKey
        if !signal_analyser_peaks_context_is_current_unlocked(state, running_context)
            token = manager.cancellation_token
            token === nothing || (token.cancelled[] = true)
            manager.active_peaks_context = nothing
            manager.active_poll_count = 0
            manager.cancellation_token = nothing
        end
    end
    nothing
end

function signal_analyser_cancel_active_output_unlocked!(state::SignalAnalyserState)::Nothing
    manager = state.output_manager
    token = manager.cancellation_token
    token === nothing || (token.cancelled[] = true)
    manager.active_context = nothing
    manager.active_peaks_context = nothing
    manager.active_poll_count = 0
    manager.cancellation_token = nothing
    if !manager.active_task_is_worker
        manager.active_task = nothing
    end
    empty!(manager.queued_contexts)
    empty!(manager.queued_peaks_contexts)
    empty!(manager.output_poll_counts)
    empty!(manager.peaks_poll_counts)
    nothing
end

function signal_analyser_cancel_peaks_pages_unlocked!(
    state::SignalAnalyserState,
    page_ids::AbstractVector{<:AbstractString},
)::Nothing
    manager = state.output_manager
    requested = Set(String.(page_ids))
    filter!(context -> !(
        signal_analyser_output_page_id(context.display_id, context.pane_id) in requested
    ), manager.queued_peaks_contexts)
    for page_id in requested
        delete!(manager.peaks_poll_counts, page_id)
    end
    if manager.active_peaks_context !== nothing
        context = manager.active_peaks_context::SignalAnalyserPeaksContextKey
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        if page_id in requested
            token = manager.cancellation_token
            token === nothing || (token.cancelled[] = true)
            manager.active_peaks_context = nothing
            manager.active_poll_count = 0
            manager.cancellation_token = nothing
        end
    end
    nothing
end

function signal_analyser_invalidate_peaks_pages_unlocked!(
    state::SignalAnalyserState,
    page_ids::AbstractVector{<:AbstractString},
)::Nothing
    signal_analyser_sync_output_pages_unlocked!(state)
    manager = state.output_manager
    requested = Set(String.(page_ids))
    affected = String[
        page_id for page_id in keys(manager.peaks_need_update_pages)
        if page_id in requested
    ]
    isempty(affected) && return nothing
    manager.peaks_calculation_revision += 1
    revision = manager.peaks_calculation_revision
    for page_id in affected
        manager.peaks_page_calculation_revisions[page_id] = revision
        manager.peaks_need_update_pages[page_id] = true
        delete!(manager.peaks_statuses, page_id)
    end
    signal_analyser_cancel_peaks_pages_unlocked!(state, affected)
    nothing
end

function signal_analyser_cancel_output_pages_unlocked!(
    state::SignalAnalyserState,
    page_ids::AbstractVector{<:AbstractString},
)::Nothing
    manager = state.output_manager
    requested = Set(String.(page_ids))
    filter!(context -> !(
        signal_analyser_output_page_id(context.display_id, context.pane_id) in requested
    ), manager.queued_contexts)
    for page_id in requested
        delete!(manager.output_poll_counts, page_id)
    end
    if manager.active_context !== nothing
        context = manager.active_context::SignalAnalyserOutputContextKey
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        if page_id in requested
            token = manager.cancellation_token
            token === nothing || (token.cancelled[] = true)
            manager.active_context = nothing
            manager.active_poll_count = 0
            manager.cancellation_token = nothing
        end
    end
    nothing
end

function signal_analyser_invalidate_output_pages_unlocked!(
    state::SignalAnalyserState,
    page_ids::AbstractVector{<:AbstractString},
)::Nothing
    signal_analyser_sync_output_pages_unlocked!(state)
    manager = state.output_manager
    requested = Set(String.(page_ids))
    empty_pages = Set(String[
        signal_analyser_output_page_id(display.id, pane.id)
        for display in state.displays
        for pane in signal_analyser_layout_by_display_id(state, display.id).panes
        if isempty(signal_display_pane_members(pane))
    ])
    affected = String[
        page_id for page_id in keys(manager.need_update_pages)
        if page_id in requested && !(page_id in empty_pages)
    ]
    isempty(affected) && return nothing
    manager.calculation_revision += 1
    revision = manager.calculation_revision
    for page_id in affected
        manager.page_calculation_revisions[page_id] = revision
        manager.need_update_pages[page_id] = true
        delete!(manager.output_statuses, page_id)
    end
    signal_analyser_cancel_output_pages_unlocked!(state, affected)
    signal_analyser_invalidate_peaks_pages_unlocked!(state, affected)
    nothing
end

function signal_analyser_invalidate_all_outputs_unlocked!(state::SignalAnalyserState)::Nothing
    signal_analyser_sync_output_pages_unlocked!(state)
    signal_analyser_invalidate_output_pages_unlocked!(
        state,
        collect(keys(state.output_manager.need_update_pages)),
    )
end

function signal_analyser_invalidate_display_outputs_unlocked!(
    state::SignalAnalyserState,
    display_id::AbstractString,
)::Nothing
    display = String(display_id)
    signal_analyser_invalidate_output_pages_unlocked!(
        state,
        String[
            page_id for page_id in signal_analyser_output_page_ids(state)
            if startswith(page_id, "$(display)::")
        ],
    )
end

function signal_analyser_invalidate_active_output_unlocked!(state::SignalAnalyserState)::Nothing
    signal_analyser_invalidate_output_pages_unlocked!(
        state,
        String[signal_analyser_active_output_page_id(state)],
    )
end

function signal_analyser_invalidate_active_peaks_unlocked!(state::SignalAnalyserState)::Nothing
    signal_analyser_invalidate_peaks_pages_unlocked!(
        state,
        String[signal_analyser_active_output_page_id(state)],
    )
end

function signal_analyser_output_context_unlocked(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
)::SignalAnalyserOutputContextKey
    signal_analyser_sync_output_pages_unlocked!(state)
    active_layout = signal_analyser_layout_by_display_id(state, state.active_display_id)
    pane_index = findfirst(pane -> pane.id == pane_id, active_layout.panes)
    if display_id != state.active_display_id || pane_index === nothing
        active_pane = signal_display_active_pane(active_layout)
        throw(SignalAnalyserInactiveOutputError(
            String(display_id),
            String(pane_id),
            state.active_display_id,
            active_pane.id,
        ))
    end
    pane = active_layout.panes[pane_index::Int]
    page_id = signal_analyser_output_page_id(state.active_display_id, pane.id)
    revision = state.output_manager.page_calculation_revisions[page_id]
    SignalAnalyserOutputContextKey(state.active_display_id, pane.id, pane.plot_type, revision)
end

function signal_analyser_peaks_context_unlocked(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
    visible_range::Union{Nothing,SignalPeaksVisibleRange} = nothing,
)::SignalAnalyserPeaksContextKey
    signal_analyser_sync_output_pages_unlocked!(state)
    active_layout = signal_analyser_layout_by_display_id(state, state.active_display_id)
    if display_id != state.active_display_id || pane_id != active_layout.active_pane_id
        active_pane = signal_display_active_pane(active_layout)
        throw(SignalAnalyserInactiveOutputError(
            String(display_id),
            String(pane_id),
            state.active_display_id,
            active_pane.id,
        ))
    end
    pane = signal_display_active_pane(active_layout)
    pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) || throw(SignalAnalyserValidationError(
        "Некорректный запрос экстремумов",
        Dict("pane_id" => "Экстремумы доступны только для активной TIME или SPECTRUM pane"),
    ))
    page_id = signal_analyser_output_page_id(state.active_display_id, pane.id)
    revision = state.output_manager.peaks_page_calculation_revisions[page_id]
    SignalAnalyserPeaksContextKey(
        state.active_display_id,
        pane.id,
        pane.plot_type,
        signal_display_pane_members(pane),
        pane.time_limits,
        pane.plot_type == SPECTRUM_PLOT ? pane.spectrum_settings : nothing,
        visible_range,
        pane.peaks_settings,
        revision,
    )
end

function signal_analyser_output_status_payload_unlocked(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane::SignalDisplayPaneState,
)::Dict{String,Any}
    manager = state.output_manager
    page_id = signal_analyser_output_page_id(display_id, pane.id)
    revision = manager.page_calculation_revisions[page_id]
    context = SignalAnalyserOutputContextKey(display_id, pane.id, pane.plot_type, revision)
    empty_pane = isempty(signal_display_pane_members(pane))
    dirty = empty_pane ? false : manager.need_update_pages[page_id]
    status = get(manager.output_statuses, page_id, nothing)
    cache = get(manager.plot_cache, page_id, nothing)
    isready = empty_pane || (!dirty && (
        (status !== nothing && (status::SignalAnalyserOutputStatus).context == context && status.isready) ||
        (cache !== nothing && (cache::SignalAnalyserPlotCacheEntry).context == context)
    ))
    success = empty_pane || (isready && (
        status === nothing ||
        (status::SignalAnalyserOutputStatus).context != context ||
        status.success
    ))
    error = status !== nothing && (status::SignalAnalyserOutputStatus).context == context ?
        status.error : ""
    signal_bindings = signal_display_pane_members(pane)
    analysis_signal = signal_display_pane_analysis_name(pane)
    Dict{String,Any}(
        "page_id" => page_id,
        "display_id" => String(display_id),
        "pane_id" => pane.id,
        "plot_type" => signal_analyser_plot_name(pane.plot_type),
        "signal_bindings" => signal_bindings,
        "analysis_signal" => analysis_signal,
        "calculation_revision" => revision,
        "context_key" => signal_analyser_output_context_id(context),
        "need_update" => dirty,
        "isready" => isready,
        "success" => success,
        "error" => error,
        "output" => Dict{String,Any}(
            "isready" => isready,
            "success" => success,
            "error" => error,
            "data" => Dict{String,Any}[],
        ),
    )
end

function signal_analyser_layout_entries_lite_payload(
    state::SignalAnalyserState,
)::Vector{Dict{String,Any}}
    signal_analyser_sync_output_pages_unlocked!(state)
    Dict{String,Any}[
        let layout = signal_analyser_layout_by_display_id(state, display.id)
            Dict{String,Any}(
                "display_id" => display.id,
                "layout" => signal_display_layout_payload(layout),
                "outputs" => display.id == state.active_display_id ?
                    Dict{String,Any}[
                        signal_analyser_output_status_payload_unlocked(
                            state,
                            display.id,
                            pane,
                        ) for pane in layout.panes
                    ] : Dict{String,Any}[],
            )
        end
        for display in state.displays
    ]
end

function signal_analyser_state_lite_unlocked(state::SignalAnalyserState)::Dict{String,Any}
    signal_analyser_recover_membership_order_unlocked!(state)
    signal_analyser_recover_time_limits_unlocked!(state)
    signal_analyser_validate_selection_layout_invariants(state)
    signal_analyser_sync_output_pages_unlocked!(state)
    active_display = signal_analyser_active_display(state)
    analysis_name = signal_analyser_display_analysis_name(active_display)
    active_layout = signal_analyser_layout_by_display_id(state, active_display.id)
    active_pane = signal_display_active_pane(active_layout)
    Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "calculation_revision" => state.output_manager.calculation_revision,
        "active_display_id" => state.active_display_id,
        "displays" => Dict{String,Any}[
            signal_analyser_display_payload(display) for display in state.displays
        ],
        "active_plot" => signal_analyser_plot_name(state.view.active_plot),
        "row_selected_signal" => state.row_selection.signal_name,
        "analysis_signal" => analysis_name,
        "selected_signal" => analysis_name,
        "visible_signals" => signal_analyser_visible_signal_names(state),
        "time_limits" => signal_time_limits_payload(active_display.time_limits),
        "measurement_kinds" => signal_measurement_selection_payload(
            active_display.measurement_selection,
        ),
        "peaks_enabled" => active_display.peaks_enabled,
        "spectrum_settings" => signal_spectrum_settings_payload(active_display.spectrum_settings),
        "spectrogram_settings" => signal_spectrogram_settings_payload(
            active_display.spectrogram_settings,
        ),
        "persistence_settings" => signal_persistence_settings_payload(
            active_display.persistence_settings,
        ),
        "signals" => Dict{String,Any}[
            signal_analyser_signal_payload(signal) for signal in state.signals
        ],
        "layouts" => signal_analyser_layout_entries_lite_payload(state),
        "active_output" => signal_analyser_output_status_payload_unlocked(
            state,
            active_display.id,
            active_pane,
        ),
        "need_update_pages" => copy(state.output_manager.need_update_pages),
        "capabilities" => Dict{String,Bool}(
            "state_lite" => true,
            "active_output" => true,
            "background_calculation" => true,
        ),
        "output_scheduling" => Dict{String,Any}(
            "scope" => "active_display",
            "max_concurrent_calculations" => 1,
            "max_queued_outputs" => SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE,
        ),
    )
end

function signal_analyser_state_lite(state::SignalAnalyserState)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_state_lite_unlocked(state)
    end
end

function signal_analyser_layouts_lite_snapshot_unlocked(
    state::SignalAnalyserState,
)::Dict{String,Any}
    lite = signal_analyser_state_lite_unlocked(state)
    Dict{String,Any}(
        "ok" => true,
        "state_revision" => state.view.state_revision,
        "calculation_revision" => state.output_manager.calculation_revision,
        "active_display_id" => state.active_display_id,
        "layouts" => lite["layouts"],
        "state" => lite,
    )
end

function signal_analyser_layouts_lite_snapshot(state::SignalAnalyserState)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_layouts_lite_snapshot_unlocked(state)
    end
end

function signal_analyser_time_unit_projection(
    unit::SignalTimeUnitPreference,
    maximum_seconds::Real = 1.0,
)::Tuple{Float64,String}
    resolved = signal_resolved_time_unit(unit, maximum_seconds)
    (signal_seconds_per_time_unit(resolved), signal_settings_time_unit_label(resolved))
end

function signal_analyser_frequency_unit_projection(
    unit::SignalFrequencyUnitPreference,
)::Tuple{Float64,String}
    label = unit == CYCLES_PER_YEAR_FREQUENCY_UNIT ? "циклов/год" :
        unit == CYCLES_PER_DAY_FREQUENCY_UNIT ? "циклов/день" :
        unit == CYCLES_PER_HOUR_FREQUENCY_UNIT ? "циклов/час" :
        unit == CYCLES_PER_MINUTE_FREQUENCY_UNIT ? "циклов/мин" :
        unit == MILLIHERTZ_FREQUENCY_UNIT ? "мГц" :
        unit == HERTZ_FREQUENCY_UNIT ? "Гц" :
        unit == KILOHERTZ_FREQUENCY_UNIT ? "кГц" :
        unit == MEGAHERTZ_FREQUENCY_UNIT ? "МГц" :
        unit == GIGAHERTZ_FREQUENCY_UNIT ? "ГГц" : "ТГц"
    (signal_hertz_per_frequency_unit(unit), label)
end

function signal_analyser_normalized_values(values::Vector{Float64})::Vector{Float64}
    isempty(values) && return values
    scale = maximum(abs, values)
    scale > 0.0 ? values ./ scale : values
end

function signal_analyser_plotly_line_trace(
    source::Dict{String,Any},
    plot_type::SignalAnalyserPlot,
    pane::SignalDisplayPaneState,
    projected_maximum_seconds::Union{Nothing,Float64} = nothing,
)::Dict{String,Any}
    name = String(get(source, "name", get(source, "signal", "")))
    color = String(get(source, "color", "#2563eb"))
    source_x = Float64.(get(source, "x", Float64[]))
    source_y = Float64.(get(source, "y", Float64[]))
    x, y, mode, hovertemplate = if plot_type == TIME_PLOT
        maximum_seconds = projected_maximum_seconds === nothing ?
            (pane.time_limits === nothing ? maximum(abs, source_x; init = 1.0) :
                (pane.time_limits::SignalTimeLimits).max_s) : projected_maximum_seconds
        seconds_per_unit, unit_label = signal_analyser_time_unit_projection(
            pane.stored_settings.time.units, maximum_seconds,
        )
        values = pane.stored_settings.time.normalize_y ?
            signal_analyser_normalized_values(source_y) : source_y
        (
            source_x ./ seconds_per_unit,
            values,
            pane.stored_settings.time.show_markers ? "lines+markers" : "lines",
            "%{x:.6g} $(unit_label)<br>%{y:.6g}<extra>%{fullData.name}</extra>",
        )
    else
        hertz_per_unit, unit_label = signal_analyser_frequency_unit_projection(
            pane.stored_settings.spectrum.frequency_units,
        )
        (
            source_x ./ hertz_per_unit,
            source_y,
            "lines",
            "%{x:.6g} $(unit_label)<br>%{y:.6g}<extra>%{fullData.name}</extra>",
        )
    end
    Dict{String,Any}(
        "type" => "scatter",
        "mode" => mode,
        "x" => x,
        "y" => y,
        "name" => name,
        "legendgroup" => String(get(source, "signal", name)),
        "line" => Dict{String,Any}("color" => color, "width" => 1.5),
        "hovertemplate" => hovertemplate,
    )
end

function signal_analyser_plotly_heatmap_trace(
    source::Dict{String,Any},
    pane::SignalDisplayPaneState,
)::Dict{String,Any}
    x = Float64.(get(source, "x", Float64[]))
    y = Float64.(get(source, "y", Float64[]))
    maximum_seconds = pane.time_limits === nothing ? maximum(abs, x; init = 1.0) :
        (pane.time_limits::SignalTimeLimits).max_s
    time_scale, _ = signal_analyser_time_unit_projection(
        pane.stored_settings.spectrogram.time_units, maximum_seconds,
    )
    frequency_unit = pane.plot_type == SPECTROGRAM_PLOT ?
        pane.stored_settings.spectrogram.frequency_units :
        pane.stored_settings.persistence.frequency_units
    frequency_scale, _ = signal_analyser_frequency_unit_projection(frequency_unit)
    if pane.plot_type == SPECTROGRAM_PLOT
        x ./= time_scale
        y ./= frequency_scale
    else
        x ./= frequency_scale
    end
    trace = Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => get(source, "z", Vector{Vector{Float64}}()),
        "name" => String(get(source, "name", "")),
        "colorscale" => "Jet",
        "colorbar" => Dict{String,Any}(
            "title" => Dict{String,Any}(
                "text" => String(get(source, "color_label", "")),
            ),
        ),
        "hoverongaps" => false,
    )
    limits_key = pane.plot_type == SPECTROGRAM_PLOT ? "power_limits" : "density_limits"
    limits = get(source, limits_key, nothing)
    if limits isa AbstractDict
        rendered = get(limits, "rendered", nothing)
        if rendered isa AbstractDict
            rendered_minimum = get(rendered, "min", nothing)
            rendered_maximum = get(rendered, "max", nothing)
            rendered_minimum isa Real && (trace["zmin"] = Float64(rendered_minimum))
            rendered_maximum isa Real && (trace["zmax"] = Float64(rendered_maximum))
        end
    end
    trace
end

function signal_analyser_plotly_frequency_range(
    limits::Union{Nothing,SignalSettingRange},
    unit::SignalFrequencyUnitPreference,
    scale::SignalSpectrumFrequencyScale,
)::Union{Nothing,Vector{Float64}}
    limits === nothing && return nothing
    factor = signal_hertz_per_frequency_unit(unit)
    minimum = (limits::SignalSettingRange).minimum / factor
    maximum = limits.maximum / factor
    if scale == LOG_SPECTRUM_FREQUENCY_SCALE
        minimum > 0.0 || return nothing
        return Float64[log10(minimum), log10(maximum)]
    end
    Float64[minimum, maximum]
end

function signal_analyser_plotly_frequency_range(
    limits::AbstractSignalSpectrumFrequencyLimits,
    unit::SignalFrequencyUnitPreference,
    scale::SignalSpectrumFrequencyScale,
)::Union{Nothing,Vector{Float64}}
    limits isa AutomaticSignalSpectrumFrequencyLimits && return nothing
    typed = limits::ExplicitSignalSpectrumFrequencyLimits
    signal_analyser_plotly_frequency_range(
        SignalSettingRange(typed.min_hz, typed.max_hz),
        unit,
        scale,
    )
end


function signal_analyser_plotly_axis_metadata(
    pane::SignalDisplayPaneState,
    source::Dict{String,Any},
    projected_maximum_seconds::Union{Nothing,Float64} = nothing,
)::NamedTuple
    if pane.plot_type == TIME_PLOT
        source_x = Float64.(get(source, "x", Float64[]))
        maximum_seconds = projected_maximum_seconds === nothing ?
            (pane.time_limits === nothing ? maximum(abs, source_x; init = 1.0) :
                (pane.time_limits::SignalTimeLimits).max_s) : projected_maximum_seconds
        seconds_per_unit, unit_label = signal_analyser_time_unit_projection(
            pane.stored_settings.time.units, maximum_seconds,
        )
        x_range = pane.time_limits === nothing ? nothing : Float64[
            (pane.time_limits::SignalTimeLimits).min_s / seconds_per_unit,
            (pane.time_limits::SignalTimeLimits).max_s / seconds_per_unit,
        ]
        y_limits = pane.stored_settings.time.y_limits
        y_range = y_limits === nothing ? nothing : Float64[y_limits.minimum, y_limits.maximum]
        return (
            x_label = "Время, $(unit_label)",
            y_label = String(get(source, "y_label", "Амплитуда")),
            x_type = "linear",
            y_type = "linear",
            x_range = x_range,
            y_range = y_range,
        )
    elseif pane.plot_type == SPECTRUM_PLOT
        _, unit_label = signal_analyser_frequency_unit_projection(
            pane.stored_settings.spectrum.frequency_units,
        )
        y_limits = pane.stored_settings.spectrum.y_limits
        y_range = y_limits === nothing ? nothing : Float64[y_limits.minimum, y_limits.maximum]
        return (
            x_label = "Частота, $(unit_label)",
            y_label = String(get(source, "y_label", "Мощность")),
            x_type = pane.spectrum_settings.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE ?
                "log" : "linear",
            y_type = "linear",
            x_range = signal_analyser_plotly_frequency_range(
                pane.spectrum_settings.frequency_limits,
                pane.stored_settings.spectrum.frequency_units,
                pane.spectrum_settings.frequency_scale,
            ),
            y_range = y_range,
        )
    elseif pane.plot_type == SPECTROGRAM_PLOT
        source_x = Float64.(get(source, "x", Float64[]))
        maximum_seconds = projected_maximum_seconds === nothing ?
            (pane.time_limits === nothing ? maximum(abs, source_x; init = 1.0) :
                (pane.time_limits::SignalTimeLimits).max_s) : projected_maximum_seconds
        seconds_per_unit, time_label = signal_analyser_time_unit_projection(
            pane.stored_settings.spectrogram.time_units, maximum_seconds,
        )
        _, frequency_label = signal_analyser_frequency_unit_projection(
            pane.stored_settings.spectrogram.frequency_units,
        )
        frequency_metadata = get(source, "frequency_scale", nothing)
        effective_scale = frequency_metadata isa AbstractDict ?
            get(frequency_metadata, "effective", "linear") : "linear"
        return (
            x_label = "Время, $(time_label)",
            y_label = "Частота, $(frequency_label)",
            x_type = "linear",
            y_type = effective_scale == "log" ? "log" : "linear",
            x_range = pane.time_limits === nothing ? nothing : Float64[
                (pane.time_limits::SignalTimeLimits).min_s / seconds_per_unit,
                (pane.time_limits::SignalTimeLimits).max_s / seconds_per_unit,
            ],
            y_range = nothing,
        )
    end
    _, frequency_label = signal_analyser_frequency_unit_projection(
        pane.stored_settings.persistence.frequency_units,
    )
    power_limits = pane.stored_settings.persistence.power_limits
    (
        x_label = "Частота, $(frequency_label)",
        y_label = String(get(source, "y_label", "Мощность")),
        x_type = pane.stored_settings.persistence.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE ?
            "log" : "linear",
        y_type = "linear",
        x_range = signal_analyser_plotly_frequency_range(
            pane.stored_settings.persistence.frequency_limits,
            pane.stored_settings.persistence.frequency_units,
            pane.stored_settings.persistence.frequency_scale,
        ),
        y_range = power_limits === nothing ? nothing :
            Float64[power_limits.minimum, power_limits.maximum],
    )
end


function signal_analyser_plotly_payload(
    output::SignalAnalyserPaneOutput,
    pane::SignalDisplayPaneState,
)::Vector{Dict{String,Any}}
    source_items = output.data isa Vector{Dict{String,Any}} ?
        output.data : Dict{String,Any}[output.data::Dict{String,Any}]
    projected_maximum_seconds = if output.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT)
        pane.time_limits === nothing ? maximum((
            maximum(abs, Float64.(get(item, "x", Float64[])); init = 1.0)
            for item in source_items
        ); init = 1.0) : (pane.time_limits::SignalTimeLimits).max_s
    else
        nothing
    end
    traces = if output.plot_type in (TIME_PLOT, SPECTRUM_PLOT)
        Dict{String,Any}[
            signal_analyser_plotly_line_trace(
                item, output.plot_type, pane, projected_maximum_seconds,
            ) for item in source_items
        ]
    else
        Dict{String,Any}[signal_analyser_plotly_heatmap_trace(first(source_items), pane)]
    end
    first_source = isempty(source_items) ? Dict{String,Any}() : first(source_items)
    axes = signal_analyser_plotly_axis_metadata(pane, first_source, projected_maximum_seconds)
    xaxis = Dict{String,Any}(
        "title" => Dict{String,Any}("text" => axes.x_label),
        "type" => axes.x_type,
        "fixedrange" => false,
        "automargin" => true,
    )
    yaxis = Dict{String,Any}(
        "title" => Dict{String,Any}("text" => axes.y_label),
        "type" => axes.y_type,
        "fixedrange" => false,
        "automargin" => true,
    )
    axes.x_range === nothing || (xaxis["range"] = axes.x_range)
    axes.y_range === nothing || (yaxis["range"] = axes.y_range)
    layout = Dict{String,Any}(
        "autosize" => true,
        "showlegend" => pane.stored_settings.display.show_legend && length(traces) > 1,
        "hovermode" => "closest",
        "dragmode" => "zoom",
        "margin" => Dict{String,Int}("l" => 56, "r" => 20, "t" => 18, "b" => 46),
        "xaxis" => xaxis,
        "yaxis" => yaxis,
    )
    config = Dict{String,Any}(
        "responsive" => true,
        "displayModeBar" => false,
        "staticPlot" => false,
        "scrollZoom" => false,
        "doubleClick" => "reset+autosize",
    )
    Dict{String,Any}[
        Dict{String,Any}(
            "data" => traces,
            "layout" => layout,
            "config" => config,
        ),
    ]
end

function signal_analyser_output_response_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
    data::Vector{Dict{String,Any}},
    isready::Bool,
    success::Bool,
    error::AbstractString,
)::Dict{String,Any}
    Dict{String,Any}(
        "display_id" => context.display_id,
        "pane_id" => context.pane_id,
        "plot_type" => signal_analyser_plot_name(context.plot_type),
        "calculation_revision" => context.calculation_revision,
        "context_key" => signal_analyser_output_context_id(context),
        "data" => data,
        "isready" => isready,
        "success" => success,
        "error" => String(error),
        "state_revision" => state.view.state_revision,
    )
end

function signal_analyser_publish_output_task!(
    state::SignalAnalyserState,
    snapshot::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
    token::SignalAnalyserCancellationToken,
    output::SignalAnalyserPaneOutput,
    plots::Vector{Dict{String,Any}},
)::Nothing
    token.cancelled[] && return nothing
    lock(state.lock) do
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        current_context = try
            signal_analyser_output_context_unlocked(
                state,
                context.display_id,
                context.pane_id,
            )
        catch err
            err isa SignalAnalyserInactiveOutputError || rethrow()
            return nothing
        end
        token.cancelled[] && return nothing
        manager.active_context == context || return nothing
        current_context == context || return nothing
        get(manager.need_update_pages, page_id, true) || return nothing

        merge!(state.plot_cache, snapshot.plot_cache)
        merge!(state.spectrum_cache, snapshot.spectrum_cache)
        merge!(state.spectrogram_cache, snapshot.spectrogram_cache)
        merge!(state.persistence_cache, snapshot.persistence_cache)
        if output.success
            manager.plot_cache[page_id] = SignalAnalyserPlotCacheEntry(context, plots)
        end
        manager.output_statuses[page_id] = SignalAnalyserOutputStatus(
            context,
            true,
            output.success,
            output.error,
        )
        manager.need_update_pages[page_id] = false
        manager.active_context = nothing
        manager.active_poll_count = 0
        manager.cancellation_token = nothing
        delete!(manager.output_poll_counts, page_id)
        state.view.state_revision += 1
    end
    nothing
end

function signal_analyser_terminalize_output_error_unlocked!(
    state::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
    error::AbstractString,
)::Bool
    manager = state.output_manager
    manager.active_context == context || return false
    page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
    current_context = try
        signal_analyser_output_context_unlocked(
            state,
            context.display_id,
            context.pane_id,
        )
    catch err
        err isa SignalAnalyserInactiveOutputError || rethrow()
        return false
    end
    current_context == context || return false
    get(manager.need_update_pages, page_id, true) || return false

    token = manager.cancellation_token
    token === nothing || (token.cancelled[] = true)
    manager.output_statuses[page_id] = SignalAnalyserOutputStatus(
        context,
        true,
        false,
        String(error),
    )
    manager.need_update_pages[page_id] = false
    manager.active_context = nothing
    manager.active_poll_count = 0
    manager.cancellation_token = nothing
    if !manager.active_task_is_worker
        manager.active_task = nothing
    end
    delete!(manager.output_poll_counts, page_id)
    state.view.state_revision += 1
    true
end

function signal_analyser_publish_output_task_error!(
    state::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
    error::AbstractString,
)::Nothing
    lock(state.lock) do
        signal_analyser_terminalize_output_error_unlocked!(state, context, error)
    end
    nothing
end

function signal_analyser_run_output_task!(
    state::SignalAnalyserState,
    snapshot::SignalAnalyserState,
    context::SignalAnalyserOutputContextKey,
    token::SignalAnalyserCancellationToken,
)::Nothing
    try
        token.cancelled[] && return nothing
        display = signal_analyser_display_by_id(snapshot, context.display_id)
        layout = signal_analyser_layout_by_display_id(snapshot, context.display_id)
        pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
        pane.id == context.pane_id && pane.plot_type == context.plot_type || throw(
            ArgumentError("Snapshot pane output не соответствует context key"),
        )
        output = try
            signal_analyser_prepare_pane_output!(snapshot, display, pane)
        catch err
            empty_plots = signal_analyser_empty_plots(
                pane.spectrum_settings,
                pane.spectrogram_settings,
                pane.stored_settings.spectrogram.scale,
                pane.stored_settings.persistence.density_limits,
            )
            empty_data = pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) ?
                Dict{String,Any}[] :
                empty_plots[signal_analyser_plot_name(pane.plot_type)]::Dict{String,Any}
            SignalAnalyserPaneOutput(
                pane.id,
                pane.plot_type,
                signal_display_pane_members(pane),
                signal_display_pane_analysis_name(pane),
                true,
                false,
                signal_analyser_pane_output_error(err),
                empty_data,
            )
        end
        token.cancelled[] && return nothing
        plots = Dict{String,Any}[]
        if output.success
            try
                plots = signal_analyser_plotly_payload(output, pane)
            catch err
                output = SignalAnalyserPaneOutput(
                    output.pane_id,
                    output.plot_type,
                    output.signal_bindings,
                    output.analysis_signal,
                    true,
                    false,
                    signal_analyser_pane_output_error(err),
                    output.data,
                )
            end
        end
        signal_analyser_publish_output_task!(
            state,
            snapshot,
            context,
            token,
            output,
            plots,
        )
    catch err
        signal_analyser_publish_output_task_error!(
            state,
            context,
            signal_analyser_pane_output_error(err),
        )
    end
    nothing
end

function signal_analyser_run_output_worker!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Nothing
    try
        while true
            job = lock(state.lock) do
                state.output_manager === manager || return nothing
                signal_analyser_sync_output_pages_unlocked!(state)
                while !isempty(manager.queued_contexts)
                    context = popfirst!(manager.queued_contexts)
                    page_id = signal_analyser_output_page_id(
                        context.display_id,
                        context.pane_id,
                    )
                    signal_analyser_output_context_is_current_unlocked(state, context) || continue
                    get(manager.need_update_pages, page_id, true) || continue
                    token = SignalAnalyserCancellationToken()
                    manager.active_context = context
                    manager.active_poll_count = get(manager.output_poll_counts, page_id, 1)
                    manager.cancellation_token = token
                    snapshot = signal_analyser_clone_state_for_layout(state)
                    return (context = context, token = token, snapshot = snapshot)
                end
                manager.active_task = nothing
                manager.active_task_is_worker = false
                nothing
            end
            job === nothing && return nothing
            signal_analyser_run_output_task!(
                state,
                job.snapshot,
                job.context,
                job.token,
            )
        end
    finally
        lock(state.lock) do
            if state.output_manager === manager && manager.active_task === current_task()
                token = manager.cancellation_token
                token === nothing || (token.cancelled[] = true)
                manager.active_context = nothing
                manager.active_task = nothing
                manager.active_task_is_worker = false
                manager.active_poll_count = 0
                manager.cancellation_token = nothing
            end
        end
    end
end

function signal_analyser_start_output_worker_unlocked!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Bool
    manager.active_task === nothing || return false
    isempty(manager.queued_contexts) && return false
    manager.active_task = Threads.@spawn signal_analyser_run_output_worker!(state, manager)
    manager.active_task_is_worker = true
    true
end

function signal_analyser_active_output(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
)::Dict{String,Any}
    response, yield_scheduler = lock(state.lock) do
        signal_analyser_recover_membership_order_unlocked!(
            state;
            display_ids = String[String(display_id)],
        )
        try
            signal_analyser_recover_time_limits_unlocked!(
                state;
                display_ids = String[String(display_id)],
            )
        catch err
            err isa SignalAnalyserTimeLimitsRecoveryError || rethrow()
            context = signal_analyser_output_context_unlocked(state, display_id, pane_id)
            page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
            manager = state.output_manager
            manager.need_update_pages[page_id] = false
            manager.output_statuses[page_id] = SignalAnalyserOutputStatus(
                context,
                true,
                false,
                err.message,
            )
            result = signal_analyser_output_response_unlocked(
                state,
                context,
                Dict{String,Any}[],
                true,
                false,
                err.message,
            )
            result["code"] = err.code
            result["recoverable"] = true
            return result, false
        end
        context = signal_analyser_output_context_unlocked(state, display_id, pane_id)
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        layout = signal_analyser_layout_by_display_id(state, context.display_id)
        pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
        if isempty(signal_display_pane_members(pane))
            manager.need_update_pages[page_id] = false
            delete!(manager.plot_cache, page_id)
            delete!(manager.output_statuses, page_id)
            delete!(manager.output_poll_counts, page_id)
            return signal_analyser_output_response_unlocked(
                state,
                context,
                Dict{String,Any}[],
                true,
                true,
                "",
            ), false
        end
        current_task = manager.active_task
        if current_task !== nothing && istaskdone(current_task::Task)
            if manager.active_context !== nothing
                abandoned_context = manager.active_context::SignalAnalyserOutputContextKey
                task_error = istaskfailed(current_task) ?
                    "Фоновый расчёт активного графика завершился с ошибкой" :
                    "Фоновый расчёт активного графика завершился без публикации результата"
                signal_analyser_terminalize_output_error_unlocked!(
                    state,
                    abandoned_context,
                    task_error,
                )
            end
            manager.active_task = nothing
            manager.active_task_is_worker = false
        end

        dirty = manager.need_update_pages[page_id]
        cache = get(manager.plot_cache, page_id, nothing)
        status = get(manager.output_statuses, page_id, nothing)
        if !dirty && cache !== nothing &&
            (cache::SignalAnalyserPlotCacheEntry).context == context
            return signal_analyser_output_response_unlocked(
                state,
                context,
                cache.plots,
                true,
                true,
                "",
            ), false
        elseif !dirty && status !== nothing &&
            (status::SignalAnalyserOutputStatus).context == context && status.isready
            return signal_analyser_output_response_unlocked(
                state,
                context,
                Dict{String,Any}[],
                true,
                status.success,
                status.error,
            ), false
        end

        is_running = manager.active_context == context
        is_queued = any(queued -> queued == context, manager.queued_contexts)
        if is_running || is_queued
            is_queued && signal_analyser_start_output_worker_unlocked!(state, manager)
            poll_count = get(manager.output_poll_counts, page_id, 1) + 1
            manager.output_poll_counts[page_id] = poll_count
            is_running && (manager.active_poll_count = poll_count)
            if is_running && poll_count >= SIGNAL_ANALYSER_ACTIVE_OUTPUT_MAX_PENDING_POLLS
                signal_analyser_terminalize_output_error_unlocked!(
                    state,
                    context,
                    SIGNAL_ANALYSER_ACTIVE_OUTPUT_POLL_LIMIT_ERROR,
                )
                return signal_analyser_output_response_unlocked(
                    state,
                    context,
                    Dict{String,Any}[],
                    true,
                    false,
                    SIGNAL_ANALYSER_ACTIVE_OUTPUT_POLL_LIMIT_ERROR,
                ), false
            end
            return signal_analyser_output_response_unlocked(
                state,
                context,
                Dict{String,Any}[],
                false,
                false,
                "",
            ), true
        end

        scheduled_count = length(manager.queued_contexts) +
            (manager.active_context === nothing ? 0 : 1)
        scheduled_count < SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE || throw(ArgumentError(
            "Очередь visible pane outputs достигла предела " *
            "$(SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE)",
        ))
        push!(manager.queued_contexts, context)
        manager.output_poll_counts[page_id] = 1
        manager.output_statuses[page_id] = SignalAnalyserOutputStatus(
            context,
            false,
            false,
            "",
        )
        signal_analyser_start_output_worker_unlocked!(state, manager)
        signal_analyser_output_response_unlocked(
            state,
            context,
            Dict{String,Any}[],
            false,
            false,
            "",
        ), true
    end
    yield_scheduler && yield()
    response
end

const SIGNAL_ANALYSER_ACTIVE_PEAKS_MAX_PENDING_POLLS::Int = 64
const SIGNAL_ANALYSER_ACTIVE_PEAKS_POLL_LIMIT_ERROR::String =
    "Расчёт экстремумов активной области не завершился за допустимое число опросов"

function signal_analyser_peaks_signal_context(
    context::SignalAnalyserPeaksContextKey,
    signal_name::AbstractString,
)::SignalAnalyserPeaksSignalContextKey
    SignalAnalyserPeaksSignalContextKey(context, signal_name)
end

function signal_analyser_passive_peaks_snapshot_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
)::SignalPeaksSnapshot
    display = signal_analyser_display_by_id(state, context.display_id)
    layout = signal_analyser_layout_by_display_id(state, context.display_id)
    pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
    pane_display = signal_analyser_display_for_pane(display, pane)
    analysis_name = signal_display_pane_analysis_name(pane)
    analysis_signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    pane.plot_type == SPECTRUM_PLOT ?
        signal_spectrum_peaks_snapshot(
            state,
            state.view.state_revision,
            pane_display,
            analysis_signal,
            settings = pane.peaks_settings,
            visible_range = context.visible_range === nothing ? nothing :
                context.visible_range::SignalSpectrumPeaksVisibleRange,
        ) :
        signal_peaks_snapshot(
            state.peaks_service,
            state.view.state_revision,
            pane_display,
            analysis_signal,
            settings = pane.peaks_settings,
            visible_range = context.visible_range === nothing ? nothing :
                context.visible_range::SignalTimePeaksVisibleRange,
        )
end

function signal_analyser_empty_peaks_table_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    enabled::Bool,
)::SignalPeaksTableSnapshot
    snapshots = if enabled
        display = signal_analyser_display_by_id(state, context.display_id)
        layout = signal_analyser_layout_by_display_id(state, context.display_id)
        pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
        pane_display = signal_analyser_display_for_pane(display, pane)
        SignalPeaksSnapshot[
            pane.plot_type == SPECTRUM_PLOT ?
                signal_spectrum_peaks_snapshot(
                    state,
                    state.view.state_revision,
                    pane_display,
                    signal_by_name(state, signal_name),
                    settings = context.settings,
                    visible_range = context.visible_range === nothing ? nothing :
                        context.visible_range::SignalSpectrumPeaksVisibleRange,
                ) :
                signal_peaks_snapshot(
                    state.peaks_service,
                    state.view.state_revision,
                    pane_display,
                    signal_by_name(state, signal_name),
                    settings = context.settings,
                    visible_range = context.visible_range === nothing ? nothing :
                        context.visible_range::SignalTimePeaksVisibleRange,
                )
            for signal_name in context.signal_names
        ]
    else
        SignalPeaksSnapshot[]
    end
    colors = enabled ? String[
        signal_by_name(state, signal_name).color for signal_name in context.signal_names
    ] : String[]
    SignalPeaksTableSnapshot(
        enabled,
        state.view.state_revision,
        context.display_id,
        context.pane_id,
        context.settings,
        colors,
        snapshots,
        SignalPeaksTableRow[],
    )
end

function signal_analyser_cached_peaks_table_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
)::Union{Nothing,SignalPeaksTableSnapshot}
    display = signal_analyser_display_by_id(state, context.display_id)
    layout = signal_analyser_layout_by_display_id(state, context.display_id)
    pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
    snapshots = SignalPeaksSnapshot[]
    for signal_name in context.signal_names
        cache_key = signal_analyser_peaks_cache_key(
            context.display_id,
            context.pane_id,
            signal_name,
        )
        entry = get(state.output_manager.peaks_cache, cache_key, nothing)
        signal_context = signal_analyser_peaks_signal_context(context, signal_name)
        entry !== nothing &&
            (entry::SignalAnalyserPeaksCacheEntry).context == signal_context || return nothing
        cached = entry.peaks
        push!(
            snapshots,
            SignalPeaksSnapshot(
                true,
                cached.mode,
                state.view.state_revision,
                context.display_id,
                signal_name,
                cached.ordinate,
                cached.units,
                SignalPeakItem[cached.items...],
            ),
        )
    end
    signal_colors = String[signal_by_name(state, name).color for name in context.signal_names]
    signal_peaks_table_snapshot(
        state.view.state_revision,
        display,
        pane,
        snapshots,
        signal_colors,
    )
end

function signal_analyser_active_peaks_response_unlocked(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    table::SignalPeaksTableSnapshot,
    legacy::SignalPeaksSnapshot,
    isready::Bool,
    success::Bool,
    error::AbstractString,
)::Dict{String,Any}
    table_payload = signal_peaks_table_payload(table)
    layout = signal_analyser_layout_by_display_id(state, context.display_id)
    pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
    position_scale, position_unit = if pane.plot_type == TIME_PLOT
        maximum_seconds = pane.time_limits === nothing ? 1.0 :
            (pane.time_limits::SignalTimeLimits).max_s
        signal_analyser_time_unit_projection(
            pane.stored_settings.time.units,
            maximum_seconds,
        )
    else
        signal_analyser_frequency_unit_projection(
            pane.stored_settings.spectrum.frequency_units,
        )
    end
    for row in table_payload["rows"]
        canonical = pane.plot_type == TIME_PLOT ? row["time_s"] : row["frequency_hz"]
        row["position"] = canonical === nothing ? nothing : canonical / position_scale
        row["position_unit"] = position_unit
    end
    settings_payload = signal_peaks_settings_payload(context.settings)
    visible_range_payload = if context.visible_range === nothing
        nothing
    elseif context.visible_range isa SignalTimePeaksVisibleRange
        range = context.visible_range::SignalTimePeaksVisibleRange
        Dict{String,Any}("min_s" => range.min_s, "max_s" => range.max_s)
    else
        range = context.visible_range::SignalSpectrumPeaksVisibleRange
        Dict{String,Any}("min_hz" => range.min_hz, "max_hz" => range.max_hz)
    end
    legacy_payload = signal_peaks_payload(legacy)
    for item in legacy_payload["items"]
        canonical = pane.plot_type == TIME_PLOT ? item["time_s"] : item["frequency_hz"]
        item["position"] = canonical === nothing ? nothing : canonical / position_scale
        item["position_unit"] = position_unit
    end
    Dict{String,Any}(
        "display_id" => context.display_id,
        "pane_id" => context.pane_id,
        "plot_type" => signal_analyser_plot_name(context.plot_type),
        "mode" => signal_extrema_mode_name(context.settings.mode),
        "calculation_revision" => context.calculation_revision,
        "context_key" => signal_analyser_peaks_context_id(context),
        "visible_range" => visible_range_payload,
        "data" => table_payload,
        "peaks_table" => table_payload,
        "settings" => settings_payload,
        "settings_fields" => signal_peaks_settings_fields_payload(context.settings),
        "peaks" => legacy_payload,
        "isready" => isready,
        "success" => success,
        "error" => String(error),
        "state_revision" => state.view.state_revision,
    )
end

function signal_analyser_publish_peaks_task!(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    token::SignalAnalyserCancellationToken,
    snapshots::Vector{SignalPeaksSnapshot},
)::Nothing
    token.cancelled[] && return nothing
    lock(state.lock) do
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        token.cancelled[] && return nothing
        manager.active_peaks_context == context || return nothing
        signal_analyser_peaks_context_is_current_unlocked(state, context) || return nothing
        get(manager.peaks_need_update_pages, page_id, true) || return nothing
        String[snapshot.signal_name::String for snapshot in snapshots] ==
            collect(context.signal_names) || return nothing

        for snapshot in snapshots
            signal_name = snapshot.signal_name::String
            cache_key = signal_analyser_peaks_cache_key(
                context.display_id,
                context.pane_id,
                signal_name,
            )
            manager.peaks_cache[cache_key] = SignalAnalyserPeaksCacheEntry(
                signal_analyser_peaks_signal_context(context, signal_name),
                snapshot,
            )
        end
        manager.peaks_statuses[page_id] = SignalAnalyserPeaksStatus(
            context,
            true,
            true,
            "",
        )
        manager.peaks_need_update_pages[page_id] = false
        manager.active_peaks_context = nothing
        manager.active_poll_count = 0
        manager.cancellation_token = nothing
        delete!(manager.peaks_poll_counts, page_id)
        state.view.state_revision += 1
    end
    nothing
end

function signal_analyser_terminalize_peaks_error_unlocked!(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    error::AbstractString,
)::Bool
    manager = state.output_manager
    manager.active_peaks_context == context || return false
    page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
    signal_analyser_peaks_context_is_current_unlocked(state, context) || return false
    get(manager.peaks_need_update_pages, page_id, true) || return false

    token = manager.cancellation_token
    token === nothing || (token.cancelled[] = true)
    manager.peaks_statuses[page_id] = SignalAnalyserPeaksStatus(
        context,
        true,
        false,
        String(error),
    )
    manager.peaks_need_update_pages[page_id] = false
    manager.active_peaks_context = nothing
    manager.active_poll_count = 0
    manager.cancellation_token = nothing
    delete!(manager.peaks_poll_counts, page_id)
    state.view.state_revision += 1
    true
end

function signal_analyser_publish_peaks_task_error!(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    error::AbstractString,
)::Nothing
    lock(state.lock) do
        signal_analyser_terminalize_peaks_error_unlocked!(state, context, error)
    end
    nothing
end

function signal_analyser_run_peaks_task!(
    state::SignalAnalyserState,
    snapshot::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    token::SignalAnalyserCancellationToken,
)::Nothing
    try
        display = signal_analyser_display_by_id(snapshot, context.display_id)
        layout = signal_analyser_layout_by_display_id(snapshot, context.display_id)
        pane = signal_analyser_layout_pane_by_id(layout, context.pane_id)
        pane_display = signal_analyser_display_for_pane(display, pane)
        pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) && pane.peaks_enabled || throw(ArgumentError(
            "Snapshot extrema context не соответствует enabled TIME/SPECTRUM pane",
        ))
        snapshots = SignalPeaksSnapshot[]
        for signal_name in context.signal_names
            token.cancelled[] && return nothing
            signal = signal_by_name(snapshot, signal_name)
            push!(
                snapshots,
                pane.plot_type == SPECTRUM_PLOT ?
                    signal_spectrum_peaks_snapshot(
                        snapshot,
                        snapshot.view.state_revision,
                        pane_display,
                        signal,
                        materialize = true,
                        settings = context.settings,
                        visible_range = context.visible_range === nothing ? nothing :
                            context.visible_range::SignalSpectrumPeaksVisibleRange,
                    ) :
                    signal_peaks_snapshot(
                        snapshot.peaks_service,
                        snapshot.view.state_revision,
                        pane_display,
                        signal,
                        materialize = true,
                        settings = context.settings,
                        visible_range = context.visible_range === nothing ? nothing :
                            context.visible_range::SignalTimePeaksVisibleRange,
                    ),
            )
        end
        token.cancelled[] && return nothing
        signal_analyser_publish_peaks_task!(state, context, token, snapshots)
    catch err
        signal_analyser_publish_peaks_task_error!(
            state,
            context,
            signal_analyser_pane_output_error(err),
        )
    end
    nothing
end

function signal_analyser_run_peaks_worker!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
    context::SignalAnalyserPeaksContextKey,
    token::SignalAnalyserCancellationToken,
    snapshot::SignalAnalyserState,
)::Nothing
    try
        signal_analyser_run_peaks_task!(state, snapshot, context, token)
    finally
        lock(state.lock) do
            if state.output_manager === manager && manager.active_task === current_task()
                token.cancelled[] = true
                manager.active_peaks_context = nothing
                manager.active_task = nothing
                manager.active_task_is_worker = false
                manager.active_poll_count = 0
                manager.cancellation_token = nothing
                signal_analyser_start_output_worker_unlocked!(state, manager)
            end
        end
    end
    nothing
end

function signal_analyser_start_peaks_worker_unlocked!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Bool
    manager.active_task === nothing || return false
    isempty(manager.queued_contexts) || begin
        signal_analyser_start_output_worker_unlocked!(state, manager)
        return false
    end
    while !isempty(manager.queued_peaks_contexts)
        context = popfirst!(manager.queued_peaks_contexts)
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        signal_analyser_peaks_context_is_current_unlocked(state, context) || continue
        get(manager.peaks_need_update_pages, page_id, true) || continue
        token = SignalAnalyserCancellationToken()
        manager.active_peaks_context = context
        manager.active_poll_count = get(manager.peaks_poll_counts, page_id, 1)
        manager.cancellation_token = token
        snapshot = signal_analyser_clone_state_for_layout(state)
        manager.active_task = Threads.@spawn signal_analyser_run_peaks_worker!(
            state,
            manager,
            context,
            token,
            snapshot,
        )
        manager.active_task_is_worker = true
        return true
    end
    false
end

"""Schedule calculation only after an explicit user calculation action."""
function signal_analyser_calculate_active_peaks!(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
    ;
    expected_state_revision::Union{Nothing,Int} = nothing,
    visible_range::Union{Nothing,SignalPeaksVisibleRange} = nothing,
)::Dict{String,Any}
    response, yield_scheduler = lock(state.lock) do
        expected_state_revision === nothing ||
            expected_state_revision == state.view.state_revision || throw(
                SignalAnalyserStaleStateError(
                    expected_state_revision,
                    state.view.state_revision,
                ),
            )
        signal_analyser_recover_membership_order_unlocked!(
            state;
            display_ids = String[String(display_id)],
        )
        try
            signal_analyser_recover_time_limits_unlocked!(
                state;
                display_ids = String[String(display_id)],
            )
        catch err
            err isa SignalAnalyserTimeLimitsRecoveryError || rethrow()
            throw(SignalAnalyserValidationError(
                "Временной диапазон области недоступен",
                Dict("pane_id" => err.message),
            ))
        end
        active_layout = signal_analyser_layout_by_display_id(state, state.active_display_id)
        active_pane = signal_display_active_pane(active_layout)
        if active_pane.plot_type == TIME_PLOT &&
            visible_range isa SignalSpectrumPeaksVisibleRange
            throw(SignalAnalyserValidationError(
                "Некорректный запрос расчёта экстремумов",
                Dict("visible_range" => "TIME pane требует {min_s,max_s}"),
            ))
        elseif active_pane.plot_type == SPECTRUM_PLOT &&
            visible_range isa SignalTimePeaksVisibleRange
            throw(SignalAnalyserValidationError(
                "Некорректный запрос расчёта экстремумов",
                Dict("visible_range" => "SPECTRUM pane требует {min_hz,max_hz}"),
            ))
        end
        context = signal_analyser_peaks_context_unlocked(
            state,
            display_id,
            pane_id,
            visible_range,
        )
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        previous_status = get(manager.peaks_statuses, page_id, nothing)
        if previous_status !== nothing && !isequal(
            (previous_status::SignalAnalyserPeaksStatus).context.visible_range,
            visible_range,
        )
            signal_analyser_invalidate_peaks_pages_unlocked!(state, String[page_id])
            context = signal_analyser_peaks_context_unlocked(
                state,
                display_id,
                pane_id,
                visible_range,
            )
        end
        passive = signal_analyser_passive_peaks_snapshot_unlocked(state, context)
        if !passive.enabled
            table = signal_analyser_empty_peaks_table_unlocked(state, context, false)
            return signal_analyser_active_peaks_response_unlocked(
                state,
                context,
                table,
                passive,
                true,
                true,
                "",
            ), false
        end

        current_task = manager.active_task
        if current_task !== nothing && istaskdone(current_task::Task)
            if manager.active_context !== nothing
                signal_analyser_terminalize_output_error_unlocked!(
                    state,
                    manager.active_context::SignalAnalyserOutputContextKey,
                    "Фоновый расчёт активного графика завершился без публикации результата",
                )
            elseif manager.active_peaks_context !== nothing
                signal_analyser_terminalize_peaks_error_unlocked!(
                    state,
                    manager.active_peaks_context::SignalAnalyserPeaksContextKey,
                    "Фоновый расчёт экстремумов завершился без публикации результата",
                )
            end
            manager.active_task = nothing
            manager.active_task_is_worker = false
        end

        dirty = manager.peaks_need_update_pages[page_id]
        status = get(manager.peaks_statuses, page_id, nothing)
        cached = signal_analyser_cached_peaks_table_unlocked(state, context)
        if !dirty && status !== nothing &&
            (status::SignalAnalyserPeaksStatus).context == context && status.isready
            table = status.success && cached !== nothing ?
                cached::SignalPeaksTableSnapshot :
                signal_analyser_empty_peaks_table_unlocked(state, context, true)
            legacy = if status.success && cached !== nothing
                isempty(table.signals) ? passive : first(table.signals)
            else
                passive
            end
            return signal_analyser_active_peaks_response_unlocked(
                state,
                context,
                table,
                legacy,
                true,
                status.success,
                status.error,
            ), false
        end

        is_running = manager.active_peaks_context == context
        is_queued = any(queued -> queued == context, manager.queued_peaks_contexts)
        if is_running || is_queued
            is_queued && signal_analyser_start_peaks_worker_unlocked!(state, manager)
            poll_count = get(manager.peaks_poll_counts, page_id, 1) + 1
            manager.peaks_poll_counts[page_id] = poll_count
            is_running && (manager.active_poll_count = poll_count)
            if is_running && poll_count >= SIGNAL_ANALYSER_ACTIVE_PEAKS_MAX_PENDING_POLLS
                signal_analyser_terminalize_peaks_error_unlocked!(
                    state,
                    context,
                    SIGNAL_ANALYSER_ACTIVE_PEAKS_POLL_LIMIT_ERROR,
                )
                table = signal_analyser_empty_peaks_table_unlocked(state, context, true)
                return signal_analyser_active_peaks_response_unlocked(
                    state,
                    context,
                    table,
                    passive,
                    true,
                    false,
                    SIGNAL_ANALYSER_ACTIVE_PEAKS_POLL_LIMIT_ERROR,
                ), false
            end
            table = signal_analyser_empty_peaks_table_unlocked(state, context, true)
            return signal_analyser_active_peaks_response_unlocked(
                state,
                context,
                table,
                passive,
                false,
                false,
                "",
            ), true
        end

        push!(manager.queued_peaks_contexts, context)
        manager.peaks_poll_counts[page_id] = 1
        manager.peaks_statuses[page_id] = SignalAnalyserPeaksStatus(
            context,
            false,
            false,
            "",
        )
        signal_analyser_start_peaks_worker_unlocked!(state, manager)
        table = signal_analyser_empty_peaks_table_unlocked(state, context, true)
        signal_analyser_active_peaks_response_unlocked(
            state,
            context,
            table,
            passive,
            false,
            false,
            "",
        ), true
    end
    yield_scheduler && yield()
    response
end

"""Read the active-pane Extrema state without scheduling provider work."""
function signal_analyser_active_peaks(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_recover_membership_order_unlocked!(
            state;
            display_ids = String[String(display_id)],
        )
        try
            signal_analyser_recover_time_limits_unlocked!(
                state;
                display_ids = String[String(display_id)],
            )
        catch err
            err isa SignalAnalyserTimeLimitsRecoveryError || rethrow()
            throw(SignalAnalyserValidationError(
                "Временной диапазон области недоступен",
                Dict("pane_id" => err.message),
            ))
        end
        context = signal_analyser_peaks_context_unlocked(state, display_id, pane_id)
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        recorded_status = get(manager.peaks_statuses, page_id, nothing)
        if recorded_status !== nothing
            recorded_context = (recorded_status::SignalAnalyserPeaksStatus).context
            signal_analyser_peaks_context_is_current_unlocked(state, recorded_context) &&
                (context = recorded_context)
        end
        passive = signal_analyser_passive_peaks_snapshot_unlocked(state, context)
        if !passive.enabled
            table = signal_analyser_empty_peaks_table_unlocked(state, context, false)
            return signal_analyser_active_peaks_response_unlocked(
                state,
                context,
                table,
                passive,
                true,
                true,
                "",
            )
        end

        dirty = manager.peaks_need_update_pages[page_id]
        status = get(manager.peaks_statuses, page_id, nothing)
        cached = signal_analyser_cached_peaks_table_unlocked(state, context)
        if !dirty && status !== nothing &&
            (status::SignalAnalyserPeaksStatus).context == context && status.isready
            table = status.success && cached !== nothing ?
                cached::SignalPeaksTableSnapshot :
                signal_analyser_empty_peaks_table_unlocked(state, context, true)
            legacy = status.success && cached !== nothing && !isempty(table.signals) ?
                first(table.signals) : passive
            return signal_analyser_active_peaks_response_unlocked(
                state,
                context,
                table,
                legacy,
                true,
                status.success,
                status.error,
            )
        end

        table = signal_analyser_empty_peaks_table_unlocked(state, context, true)
        signal_analyser_active_peaks_response_unlocked(
            state,
            context,
            table,
            passive,
            false,
            false,
            "",
        )
    end
end
