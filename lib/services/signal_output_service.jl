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

"""Emit one bounded structured record for a Peaks calculation transition."""
function signal_analyser_log_peaks_lifecycle(
    event::AbstractString,
    context::SignalAnalyserPeaksContextKey;
    reason::AbstractString = "",
)::Nothing
    @info "signal_analyser_peaks_lifecycle" event = String(event) display_id = context.display_id pane_id = context.pane_id context_key = signal_analyser_peaks_context_id(context) calculation_revision = context.calculation_revision reason = String(reason)
    nothing
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
    queued_peaks_contexts = copy(manager.queued_peaks_contexts)
    empty!(manager.queued_peaks_contexts)
    for context in queued_peaks_contexts
        if signal_analyser_peaks_context_is_current_unlocked(state, context)
            push!(manager.queued_peaks_contexts, context)
        else
            signal_analyser_terminalize_peaks_error_unlocked!(
                state,
                context,
                "Расчёт экстремумов отменён: контекст области изменился";
                lifecycle_event = "cancel",
            ) || signal_analyser_log_peaks_lifecycle(
                "cancel",
                context;
                reason = "queued_context_superseded",
            )
        end
    end
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
            token = manager.peaks_cancellation_token
            token === nothing || (token.cancelled[] = true)
            signal_analyser_terminalize_peaks_error_unlocked!(
                state,
                running_context,
                "Расчёт экстремумов отменён: контекст области изменился";
                lifecycle_event = "cancel",
            ) || begin
                manager.active_peaks_context = nothing
                manager.peaks_active_poll_count = 0
                manager.peaks_cancellation_token = nothing
                signal_analyser_log_peaks_lifecycle(
                    "cancel",
                    running_context;
                    reason = "active_context_superseded",
                )
            end
        end
    end
    nothing
end

function signal_analyser_cancel_active_output_unlocked!(state::SignalAnalyserState)::Nothing
    manager = state.output_manager
    token = manager.cancellation_token
    token === nothing || (token.cancelled[] = true)
    peaks_token = manager.peaks_cancellation_token
    peaks_token === nothing || (peaks_token.cancelled[] = true)
    if manager.active_peaks_context !== nothing
        signal_analyser_log_peaks_lifecycle(
            "cancel",
            manager.active_peaks_context::SignalAnalyserPeaksContextKey;
            reason = "calculation_manager_replaced",
        )
    end
    for context in manager.queued_peaks_contexts
        signal_analyser_log_peaks_lifecycle(
            "cancel",
            context;
            reason = "queued_calculation_manager_replaced",
        )
    end
    manager.active_context = nothing
    manager.active_peaks_context = nothing
    manager.active_poll_count = 0
    manager.cancellation_token = nothing
    manager.peaks_active_poll_count = 0
    manager.peaks_cancellation_token = nothing
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
    retained_contexts = SignalAnalyserPeaksContextKey[]
    for context in manager.queued_peaks_contexts
        if signal_analyser_output_page_id(context.display_id, context.pane_id) in requested
            signal_analyser_log_peaks_lifecycle(
                "cancel",
                context;
                reason = "queued_calculation_revision_invalidated",
            )
        else
            push!(retained_contexts, context)
        end
    end
    manager.queued_peaks_contexts = retained_contexts
    for page_id in requested
        delete!(manager.peaks_poll_counts, page_id)
    end
    if manager.active_peaks_context !== nothing
        context = manager.active_peaks_context::SignalAnalyserPeaksContextKey
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        if page_id in requested
            token = manager.peaks_cancellation_token
            token === nothing || (token.cancelled[] = true)
            manager.active_peaks_context = nothing
            manager.peaks_active_poll_count = 0
            manager.peaks_cancellation_token = nothing
            signal_analyser_log_peaks_lifecycle(
                "cancel",
                context;
                reason = "calculation_revision_invalidated",
            )
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
    for display in state.displays
        layout = signal_analyser_layout_by_display_id(state, display.id)
        for pane in layout.panes
            page_id = signal_analyser_output_page_id(display.id, pane.id)
            page_id in requested || continue
            pane.extrema_state.need_update = true
            signal_ids_by_name = Dict(signal.name => signal.id for signal in state.signals)
            valid_signal_ids = Set(
                signal_ids_by_name[name] for name in signal_display_pane_members(pane)
                if haskey(signal_ids_by_name, name)
            )
            filter!(pair -> first(pair) in valid_signal_ids, pane.extrema_by_signal)
        end
    end
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
            "signal_preprocess_resample" => true,
            "signal_preprocess_custom" => true,
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
    x, y, mode = if plot_type == TIME_PLOT
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
        )
    else
        hertz_per_unit, unit_label = signal_analyser_frequency_unit_projection(
            pane.stored_settings.spectrum.frequency_units,
        )
        (
            source_x ./ hertz_per_unit,
            source_y,
            "lines",
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
        "hoverinfo" => "skip",
        "hovertemplate" => nothing,
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
        "colorbar" => Dict{String,Any}(),
        "hoverongaps" => false,
        "hoverinfo" => "skip",
        "hovertemplate" => nothing,
    )
    if pane.stored_settings.display.show_axis_labels
        color_label = pane.plot_type == PERSISTENCE_PLOT ?
            "Вероятность, %" : String(get(source, "color_label", ""))
        trace["colorbar"]["title"] = Dict{String,Any}("text" => color_label)
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
        "type" => axes.x_type,
        "fixedrange" => false,
        "autorange" => true,
        "automargin" => true,
    )
    yaxis = Dict{String,Any}(
        "type" => axes.y_type,
        "fixedrange" => false,
        "autorange" => true,
        "automargin" => true,
    )
    if pane.stored_settings.display.show_axis_labels
        xaxis["title"] = Dict{String,Any}("text" => axes.x_label)
        yaxis["title"] = Dict{String,Any}("text" => axes.y_label)
    end
    layout = Dict{String,Any}(
        "autosize" => true,
        "showlegend" => pane.stored_settings.display.show_legend && length(traces) > 1,
        "hovermode" => false,
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
                # Peaks are queued only by an explicit user action.  Finish the
                # current finite output job, then yield the single worker lane
                # before draining any more background output contexts.
                isempty(manager.queued_peaks_contexts) || return nothing
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
                signal_analyser_start_peaks_worker_unlocked!(state, manager)
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
    if token.cancelled[]
        signal_analyser_log_peaks_lifecycle(
            "publish_refused",
            context;
            reason = "cancellation_token_set_before_publish",
        )
        return nothing
    end
    lock(state.lock) do
        manager = state.output_manager
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        if token.cancelled[]
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                context;
                reason = "cancellation_token_set",
            )
            return nothing
        elseif manager.active_peaks_context != context
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                context;
                reason = "active_context_changed",
            )
            return nothing
        elseif !signal_analyser_peaks_context_is_current_unlocked(state, context)
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                context;
                reason = "context_superseded",
            )
            return nothing
        elseif !get(manager.peaks_need_update_pages, page_id, true)
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                context;
                reason = "page_no_longer_dirty",
            )
            return nothing
        elseif String[snapshot.signal_name::String for snapshot in snapshots] !=
            collect(context.signal_names)
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                context;
                reason = "snapshot_membership_mismatch",
            )
            return nothing
        end

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
        manager.peaks_active_poll_count = 0
        manager.peaks_cancellation_token = nothing
        delete!(manager.peaks_poll_counts, page_id)
        state.view.state_revision += 1
        signal_analyser_log_peaks_lifecycle("publish", context)
    end
    nothing
end

function signal_analyser_terminalize_peaks_error_unlocked!(
    state::SignalAnalyserState,
    context::SignalAnalyserPeaksContextKey,
    error::AbstractString,
    ;
    lifecycle_event::AbstractString = "error",
)::Bool
    manager = state.output_manager
    page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
    status = get(manager.peaks_statuses, page_id, nothing)
    owns_active_context = manager.active_peaks_context == context
    owns_pending_status = status !== nothing &&
        (status::SignalAnalyserPeaksStatus).context == context && !status.isready
    (owns_active_context || owns_pending_status) || return false
    get(manager.peaks_page_calculation_revisions, page_id, -1) ==
        context.calculation_revision || return false
    get(manager.peaks_need_update_pages, page_id, true) || return false

    if owns_active_context
        token = manager.peaks_cancellation_token
        token === nothing || (token.cancelled[] = true)
    end
    manager.peaks_statuses[page_id] = SignalAnalyserPeaksStatus(
        context,
        true,
        false,
        String(error),
    )
    manager.peaks_need_update_pages[page_id] = false
    filter!(queued_context -> queued_context != context, manager.queued_peaks_contexts)
    if owns_active_context
        manager.active_peaks_context = nothing
        manager.peaks_active_poll_count = 0
        manager.peaks_cancellation_token = nothing
    end
    delete!(manager.peaks_poll_counts, page_id)
    state.view.state_revision += 1
    signal_analyser_log_peaks_lifecycle(
        lifecycle_event,
        context;
        reason = String(error),
    )
    true
end

"""Recover a completed Peaks task which escaped its normal finally cleanup."""
function signal_analyser_reap_completed_peaks_task_unlocked!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Bool
    worker = manager.peaks_task
    worker === nothing && return false
    istaskdone(worker::Task) || return false
    context = manager.active_peaks_context
    if context !== nothing
        typed_context = context::SignalAnalyserPeaksContextKey
        error = istaskfailed(worker) ?
            "Фоновый расчёт экстремумов завершился с ошибкой" :
            "Фоновый расчёт экстремумов завершился без публикации результата"
        signal_analyser_terminalize_peaks_error_unlocked!(state, typed_context, error) ||
            signal_analyser_log_peaks_lifecycle(
                "publish_refused",
                typed_context;
                reason = "completed_task_context_superseded",
            )
    end
    if manager.peaks_task === worker
        manager.peaks_task = nothing
    end
    if manager.active_task === worker
        manager.active_task = nothing
        manager.active_task_is_worker = false
    end
    signal_analyser_start_peaks_worker_unlocked!(state, manager)
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
            if state.output_manager === manager && manager.peaks_task === current_task()
                page_id = signal_analyser_output_page_id(
                    context.display_id,
                    context.pane_id,
                )
                status = get(manager.peaks_statuses, page_id, nothing)
                has_terminal_status = status !== nothing &&
                    (status::SignalAnalyserPeaksStatus).context == context && status.isready
                if !has_terminal_status
                    terminal_error = token.cancelled[] ?
                        "Расчёт экстремумов отменён до публикации результата" :
                        "Фоновый расчёт экстремумов завершился без публикации результата"
                    terminalized = signal_analyser_terminalize_peaks_error_unlocked!(
                        state,
                        context,
                        terminal_error;
                        lifecycle_event = token.cancelled[] ? "cancel" : "error",
                    )
                    terminalized || signal_analyser_log_peaks_lifecycle(
                        token.cancelled[] ? "cancel" : "publish_refused",
                        context;
                        reason = "worker_context_superseded_before_terminal_publish",
                    )
                end
                token.cancelled[] = true
                if manager.active_peaks_context == context
                    manager.active_peaks_context = nothing
                end
                manager.peaks_task = nothing
                manager.peaks_active_poll_count = 0
                if manager.peaks_cancellation_token === token
                    manager.peaks_cancellation_token = nothing
                end
                if manager.active_task === current_task()
                    manager.active_task = nothing
                    manager.active_task_is_worker = false
                end
                signal_analyser_start_peaks_worker_unlocked!(state, manager)
            end
        end
    end
    nothing
end

function signal_analyser_start_peaks_worker_unlocked!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Bool
    manager.peaks_task === nothing || return false
    # A reserved non-worker task remains an exclusive control boundary. A real
    # output worker no longer blocks the explicit extrema lane.
    manager.active_task !== nothing && !manager.active_task_is_worker && return false
    while !isempty(manager.queued_peaks_contexts)
        context = popfirst!(manager.queued_peaks_contexts)
        page_id = signal_analyser_output_page_id(context.display_id, context.pane_id)
        if !signal_analyser_peaks_context_is_current_unlocked(state, context)
            signal_analyser_terminalize_peaks_error_unlocked!(
                state,
                context,
                "Расчёт экстремумов отменён: контекст области изменился";
                lifecycle_event = "cancel",
            ) || signal_analyser_log_peaks_lifecycle(
                "cancel",
                context;
                reason = "queued_context_superseded_before_start",
            )
            continue
        elseif !get(manager.peaks_need_update_pages, page_id, true)
            signal_analyser_log_peaks_lifecycle(
                "cancel",
                context;
                reason = "queued_page_no_longer_dirty",
            )
            continue
        end
        token = SignalAnalyserCancellationToken()
        manager.active_peaks_context = context
        manager.peaks_active_poll_count = get(manager.peaks_poll_counts, page_id, 1)
        manager.peaks_cancellation_token = token
        snapshot = signal_analyser_clone_state_for_peaks(state)
        start_gate = Channel{Nothing}(1)
        worker = Threads.@spawn begin
            take!(start_gate)
            signal_analyser_run_peaks_worker!(state, manager, context, token, snapshot)
        end
        manager.peaks_task = worker
        # Keep the aggregate's current-task observable when no graph worker
        # exists. During contention `active_task` identifies the graph worker
        # while `peaks_task` progresses independently.
        if manager.active_task === nothing
            manager.active_task = worker
            manager.active_task_is_worker = true
        end
        signal_analyser_log_peaks_lifecycle("start", context)
        put!(start_gate, nothing)
        return true
    end
    isempty(manager.queued_contexts) || return signal_analyser_start_output_worker_unlocked!(
        state,
        manager,
    )
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

        signal_analyser_reap_completed_peaks_task_unlocked!(state, manager)

        dirty = manager.peaks_need_update_pages[page_id]
        status = get(manager.peaks_statuses, page_id, nothing)
        if !dirty && status !== nothing &&
            (status::SignalAnalyserPeaksStatus).context == context && status.isready
            # POST is explicit user intent. A terminal success or failure must
            # never be reused as the result of a new calculation action.
            signal_analyser_invalidate_peaks_pages_unlocked!(state, String[page_id])
            context = signal_analyser_peaks_context_unlocked(
                state,
                display_id,
                pane_id,
                visible_range,
            )
            passive = signal_analyser_passive_peaks_snapshot_unlocked(state, context)
            dirty = manager.peaks_need_update_pages[page_id]
            status = get(manager.peaks_statuses, page_id, nothing)
        end
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
            is_running && (manager.peaks_active_poll_count = poll_count)
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
        signal_analyser_log_peaks_lifecycle("queue", context)
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
    response = lock(state.lock) do
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

        signal_analyser_reap_completed_peaks_task_unlocked!(state, manager)
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

        has_pending_status = status !== nothing &&
            (status::SignalAnalyserPeaksStatus).context == context && !status.isready
        if has_pending_status
            is_running = manager.active_peaks_context == context
            is_queued = any(queued -> queued == context, manager.queued_peaks_contexts)
            if is_queued
                signal_analyser_start_peaks_worker_unlocked!(state, manager)
                is_running = manager.active_peaks_context == context
                is_queued = any(queued -> queued == context, manager.queued_peaks_contexts)
            end
            if !is_running && !is_queued
                error = "Фоновый расчёт экстремумов потерял задачу до публикации результата"
                signal_analyser_terminalize_peaks_error_unlocked!(state, context, error)
                table = signal_analyser_empty_peaks_table_unlocked(state, context, true)
                return signal_analyser_active_peaks_response_unlocked(
                    state,
                    context,
                    table,
                    passive,
                    true,
                    false,
                    error,
                )
            end

            poll_count = get(manager.peaks_poll_counts, page_id, 1) + 1
            manager.peaks_poll_counts[page_id] = poll_count
            is_running && (manager.peaks_active_poll_count = poll_count)
            if poll_count >= SIGNAL_ANALYSER_ACTIVE_PEAKS_MAX_PENDING_POLLS
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
                )
            end
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
    yield()
    response
end

"""Prepared independent X/Y input for one stable signal id."""
struct SignalAnalyserPaneExtremaSignalWork
    signal_id::String
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    samples::Vector{Int}
    x::Vector{Float64}
    y::Vector{Float64}

    function SignalAnalyserPaneExtremaSignalWork(
        signal_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        samples::AbstractVector{<:Integer},
        x::AbstractVector{<:Real},
        y::AbstractVector{<:Real},
    )
        length(samples) == length(x) == length(y) || throw(DimensionMismatch(
            "Extrema X/Y/sample vectors должны иметь одинаковую длину",
        ))
        new(
            String(signal_id),
            String(signal_name),
            ordinate,
            Int.(samples),
            Float64.(x),
            Float64.(y),
        )
    end
end

"""Immutable provider input for one pane-owned extrema worker pass."""
struct SignalAnalyserPaneExtremaWork{P<:AbstractPeaksProvider}
    key::SignalAnalyserExtremaPaneKey
    settings::SignalPeaksSettings
    provider::P
    signals::Vector{SignalAnalyserPaneExtremaSignalWork}
end

function signal_analyser_extrema_pane_unlocked(
    state::SignalAnalyserState,
    key::SignalAnalyserExtremaPaneKey,
)::SignalDisplayPaneState
    layout = signal_analyser_layout_by_display_id(state, key.display_id)
    signal_analyser_layout_pane_by_id(layout, key.pane_id)
end

signal_analyser_pane_extremum_payload(item::SignalPaneExtremum)::Dict{String,Any} =
    Dict{String,Any}(
        "sample" => item.sample,
        "x" => item.x,
        "y" => item.y,
        "is_maximum" => item.is_maximum,
    )

function signal_analyser_pane_extrema_payload_unlocked(
    state::SignalAnalyserState,
    key::SignalAnalyserExtremaPaneKey,
)::Dict{String,Any}
    pane = signal_analyser_extrema_pane_unlocked(state, key)
    members = signal_display_pane_members(pane)
    signals = AnalysedSignal[signal_by_name(state, name) for name in members]
    by_signal = Dict{String,Any}()
    signal_payloads = Dict{String,Any}[]
    rows = Dict{String,Any}[]
    row_number = 0
    for signal in signals
        items = get(pane.extrema_by_signal, signal.id, SignalPaneExtremum[])
        item_payloads = Dict{String,Any}[
            signal_analyser_pane_extremum_payload(item) for item in items
        ]
        signal_payload = Dict{String,Any}(
            "signal_id" => signal.id,
            "signal_name" => signal.name,
            "signal_color" => signal.color,
            "items" => item_payloads,
        )
        haskey(pane.extrema_by_signal, signal.id) && (by_signal[signal.id] = signal_payload)
        push!(signal_payloads, signal_payload)
        for (graph_number, item_payload) in enumerate(item_payloads)
            row_number += 1
            push!(rows, merge(
                item_payload,
                Dict{String,Any}(
                    "row_number" => row_number,
                    "graph_number" => graph_number,
                    "signal_id" => signal.id,
                    "signal_name" => signal.name,
                    "signal_color" => signal.color,
                ),
            ))
        end
    end
    Dict{String,Any}(
        "display_id" => key.display_id,
        "pane_id" => key.pane_id,
        "plot_type" => signal_analyser_plot_name(pane.plot_type),
        "has_signals" => !isempty(signals),
        "x_unit" => pane.plot_type == SPECTRUM_PLOT ? "Hz" : "s",
        "extrema_by_signal" => by_signal,
        "data" => Dict{String,Any}(
            "signals" => signal_payloads,
            "rows" => rows,
        ),
        "is_extrema_ready" => pane.is_extrema_ready,
        "isready" => pane.is_extrema_ready,
        "success" => pane.success,
        "error" => pane.error,
        "need_update" => pane.need_update,
        "state_revision" => state.view.state_revision,
    )
end

function signal_analyser_prepare_time_extrema_signal_unlocked(
    state::SignalAnalyserState,
    pane::SignalDisplayPaneState,
    signal::AnalysedSignal,
    visible_range::Union{Nothing,SignalPeaksVisibleRange},
)::SignalAnalyserPaneExtremaSignalWork
    ordinate = signal_measurement_ordinate(signal)
    limits = pane.time_limits
    empty_intersection = false
    effective_limits = if limits === nothing && visible_range === nothing
        nothing
    elseif limits === nothing
        visible = visible_range::SignalTimePeaksVisibleRange
        SignalTimeLimits(visible.min_s, visible.max_s)
    elseif visible_range === nothing
        limits
    else
        visible = visible_range::SignalTimePeaksVisibleRange
        minimum_value = max((limits::SignalTimeLimits).min_s, visible.min_s)
        maximum_value = min((limits::SignalTimeLimits).max_s, visible.max_s)
        if minimum_value < maximum_value
            SignalTimeLimits(minimum_value, maximum_value)
        else
            empty_intersection = true
            nothing
        end
    end
    sample_range = if empty_intersection
        nothing
    elseif effective_limits === nothing
        SignalTimeSampleRange(1, length(signal.values))
    else
        signal_time_sample_range_or_nothing(
            state.measurements_service.roi_service,
            signal,
            effective_limits,
        )
    end
    sample_range === nothing && return SignalAnalyserPaneExtremaSignalWork(
        signal.id,
        signal.name,
        ordinate,
        Int[],
        Float64[],
        Float64[],
    )
    roi = signal_ordinate_roi(state.measurements_service.roi_service, signal, sample_range)
    samples = collect(roi.sample_offset:(roi.sample_offset + length(roi.values) - 1))
    x = Float64[sample / roi.sample_rate_hz for sample in samples]
    SignalAnalyserPaneExtremaSignalWork(
        signal.id,
        signal.name,
        roi.ordinate,
        samples,
        x,
        roi.values,
    )
end

function signal_analyser_prepare_spectrum_extrema_signal_unlocked(
    state::SignalAnalyserState,
    pane::SignalDisplayPaneState,
    pane_display::SignalAnalyserDisplayState,
    signal::AnalysedSignal,
    visible_range::Union{Nothing,SignalPeaksVisibleRange},
)::SignalAnalyserPaneExtremaSignalWork
    data = signal_analyser_cached_spectrum_data!(
        state,
        pane_display,
        signal;
        materialize_missing = true,
    )
    frequencies = Float64[data.frequencies_hz...]
    values = signal_spectrum_extrema_ordinate(data, pane.spectrum_settings.scale)
    source_indices = if visible_range === nothing
        collect(eachindex(frequencies))
    else
        visible = visible_range::SignalSpectrumPeaksVisibleRange
        findall(frequency -> visible.min_hz <= frequency <= visible.max_hz, frequencies)
    end
    SignalAnalyserPaneExtremaSignalWork(
        signal.id,
        signal.name,
        MAGNITUDE_ORDINATE,
        source_indices,
        frequencies[source_indices],
        values[source_indices],
    )
end

function signal_analyser_prepare_pane_extrema_work_unlocked(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
    key::SignalAnalyserExtremaPaneKey,
)::SignalAnalyserPaneExtremaWork
    display = signal_analyser_display_by_id(state, key.display_id)
    pane = signal_analyser_extrema_pane_unlocked(state, key)
    pane.extrema_state.need_update = false
    visible_range = pop!(manager.extrema_visible_ranges, key, nothing)
    pane_display = signal_analyser_display_for_pane(display, pane)
    prepared = SignalAnalyserPaneExtremaSignalWork[]
    for signal_name in signal_display_pane_members(pane)
        signal = signal_by_name(state, signal_name)
        push!(
            prepared,
            pane.plot_type == SPECTRUM_PLOT ?
                signal_analyser_prepare_spectrum_extrema_signal_unlocked(
                    state,
                    pane,
                    pane_display,
                    signal,
                    visible_range,
                ) :
                signal_analyser_prepare_time_extrema_signal_unlocked(
                    state,
                    pane,
                    signal,
                    visible_range,
                ),
        )
    end
    SignalAnalyserPaneExtremaWork(
        key,
        pane.peaks_settings,
        state.peaks_service.provider,
        prepared,
    )
end

function signal_analyser_calculate_pane_extrema(
    work::SignalAnalyserPaneExtremaWork,
)::Dict{String,Vector{SignalPaneExtremum}}
    result = Dict{String,Vector{SignalPaneExtremum}}()
    for signal in work.signals
        if length(signal.y) < 3
            result[signal.signal_id] = SignalPaneExtremum[]
            continue
        end
        query = SignalPeaksQuery(
            0,
            work.key.display_id,
            signal.signal_name,
            signal.ordinate,
            signal.y,
            1.0,
            0,
            work.settings,
        )
        peaks = signal_peaks_detect(work.provider, query)
        result[signal.signal_id] = SignalPaneExtremum[
            SignalPaneExtremum(
                signal.samples[peaks.locations_1based[index]],
                signal.x[peaks.locations_1based[index]],
                peaks.peak_values[index],
                peaks.kinds[index] == MAXIMUM_PEAK,
            )
            for index in eachindex(peaks.peak_values)
        ]
    end
    result
end

function signal_analyser_publish_pane_extrema!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
    work::SignalAnalyserPaneExtremaWork,
    result::Dict{String,Vector{SignalPaneExtremum}},
)::Nothing
    lock(state.lock) do
        state.output_manager === manager || return nothing
        pane = try
            signal_analyser_extrema_pane_unlocked(state, work.key)
        catch err
            err isa ArgumentError || rethrow()
            return nothing
        end
        extrema = pane.extrema_state
        if !extrema.need_update
            extrema.extrema_by_signal = result
            extrema.need_update = false
        end
        extrema.is_extrema_ready = true
        extrema.success = true
        extrema.error = ""
        state.view.state_revision += 1
    end
    nothing
end

function signal_analyser_publish_pane_extrema_error!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
    key::SignalAnalyserExtremaPaneKey,
    err,
)::Nothing
    lock(state.lock) do
        state.output_manager === manager || return nothing
        pane = try
            signal_analyser_extrema_pane_unlocked(state, key)
        catch lookup_error
            lookup_error isa ArgumentError || rethrow()
            return nothing
        end
        pane.extrema_state.is_extrema_ready = true
        pane.extrema_state.success = false
        pane.extrema_state.error = signal_analyser_pane_output_error(err)
        pane.extrema_state.need_update = true
        state.view.state_revision += 1
    end
    nothing
end

function signal_analyser_run_pane_extrema_worker!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
    work::SignalAnalyserPaneExtremaWork,
)::Nothing
    try
        result = signal_analyser_calculate_pane_extrema(work)
        signal_analyser_publish_pane_extrema!(state, manager, work, result)
    catch err
        signal_analyser_publish_pane_extrema_error!(state, manager, work.key, err)
    finally
        lock(state.lock) do
            if state.output_manager === manager && manager.extrema_task === current_task()
                manager.extrema_task = nothing
                manager.active_extrema_pane = nothing
                signal_analyser_start_pane_extrema_worker_unlocked!(state, manager)
            end
        end
    end
    nothing
end

function signal_analyser_start_pane_extrema_worker_unlocked!(
    state::SignalAnalyserState,
    manager::SignalAnalyserCalculationManager,
)::Bool
    manager.extrema_task === nothing || return false
    while !isempty(manager.extrema_queue)
        key = popfirst!(manager.extrema_queue)
        work = try
            signal_analyser_prepare_pane_extrema_work_unlocked(state, manager, key)
        catch err
            if err isa ArgumentError
                delete!(manager.extrema_visible_ranges, key)
                continue
            end
            rethrow()
        end
        manager.active_extrema_pane = key
        start_gate = Channel{Nothing}(1)
        worker = Threads.@spawn begin
            take!(start_gate)
            signal_analyser_run_pane_extrema_worker!(state, manager, work)
        end
        manager.extrema_task = worker
        put!(start_gate, nothing)
        return true
    end
    false
end

"""Read one pane-owned extrema state without active-pane checks or scheduling."""
function signal_analyser_pane_extrema(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_pane_extrema_payload_unlocked(
            state,
            SignalAnalyserExtremaPaneKey(display_id, pane_id),
        )
    end
end

"""Move one explicit pane request to the front of the waiting queue."""
function signal_analyser_calculate_pane_extrema!(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString;
    visible_range::Union{Nothing,SignalPeaksVisibleRange} = nothing,
)::Dict{String,Any}
    response = lock(state.lock) do
        key = SignalAnalyserExtremaPaneKey(display_id, pane_id)
        pane = signal_analyser_extrema_pane_unlocked(state, key)
        pane.plot_type in (TIME_PLOT, SPECTRUM_PLOT) || throw(SignalAnalyserValidationError(
            "Некорректный запрос расчёта экстремумов",
            Dict("pane_id" => "Экстремумы доступны только для TIME или SPECTRUM области"),
        ))
        members = signal_display_pane_members(pane)
        isempty(members) && throw(SignalAnalyserValidationError(
            "Некорректный запрос расчёта экстремумов",
            Dict("pane_id" => "В области нет сигналов для расчёта"),
        ))
        pane.plot_type == TIME_PLOT && visible_range isa SignalSpectrumPeaksVisibleRange &&
            throw(SignalAnalyserValidationError(
                "Некорректный диапазон экстремумов",
                Dict("visible_range" => "TIME область требует {min_s,max_s}"),
            ))
        pane.plot_type == SPECTRUM_PLOT && visible_range isa SignalTimePeaksVisibleRange &&
            throw(SignalAnalyserValidationError(
                "Некорректный диапазон экстремумов",
                Dict("visible_range" => "SPECTRUM область требует {min_hz,max_hz}"),
            ))

        extrema = pane.extrema_state
        extrema.need_update = true
        extrema.is_extrema_ready = false
        extrema.success = false
        extrema.error = ""
        manager = state.output_manager
        filter!(queued -> queued != key, manager.extrema_queue)
        pushfirst!(manager.extrema_queue, key)
        manager.extrema_visible_ranges[key] = visible_range
        state.view.state_revision += 1
        signal_analyser_start_pane_extrema_worker_unlocked!(state, manager)
        signal_analyser_pane_extrema_payload_unlocked(state, key)
    end
    yield()
    response
end

"""Clear only one pane's extrema and remove only its waiting occurrence."""
function signal_analyser_clear_pane_extrema!(
    state::SignalAnalyserState,
    display_id::AbstractString,
    pane_id::AbstractString,
)::Dict{String,Any}
    lock(state.lock) do
        key = SignalAnalyserExtremaPaneKey(display_id, pane_id)
        pane = signal_analyser_extrema_pane_unlocked(state, key)
        empty!(pane.extrema_by_signal)
        pane.extrema_state.is_extrema_ready = false
        pane.extrema_state.success = false
        pane.extrema_state.error = ""
        pane.extrema_state.need_update = true
        manager = state.output_manager
        filter!(queued -> queued != key, manager.extrema_queue)
        delete!(manager.extrema_visible_ranges, key)
        state.view.state_revision += 1
        signal_analyser_pane_extrema_payload_unlocked(state, key)
    end
end
