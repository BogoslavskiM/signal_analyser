struct SignalInventoryService{W<:AbstractWorkspaceSignalSource}
    workspace_source::W
    palette::SignalColorPalette
    source_reconciler::SignalAnalysisSourceReconciler
end

SignalInventoryService(workspace_source::W) where {W<:AbstractWorkspaceSignalSource} =
    SignalInventoryService(
        workspace_source,
        SignalColorPalette(),
        SignalAnalysisSourceReconciler(),
    )

SignalInventoryService(
    workspace_source::W,
    palette::SignalColorPalette,
) where {W<:AbstractWorkspaceSignalSource} = SignalInventoryService(
    workspace_source,
    palette,
    SignalAnalysisSourceReconciler(),
)

struct PreparedSignalInventoryMutation{S<:SignalAnalyserState}
    state::S
    snapshot::Dict{String,Any}
end

function signal_inventory_validation_error(
    field::AbstractString,
    message::AbstractString,
)
    SignalAnalyserValidationError(
        "Некорректный запрос Signals",
        Dict(String(field) => String(message)),
    )
end

function signal_inventory_timed_fields(value)
    if value isa NamedTuple
        (:time in keys(value) && :value in keys(value)) || return nothing
        return (time = getproperty(value, :time), value = getproperty(value, :value))
    elseif value isa AbstractDict
        has_time = haskey(value, "time") || haskey(value, :time)
        has_value = haskey(value, "value") || haskey(value, :value)
        has_time && has_value || return nothing
        return (
            time = haskey(value, "time") ? value["time"] : value[:time],
            value = haskey(value, "value") ? value["value"] : value[:value],
        )
    end
    fields = fieldnames(typeof(value))
    (:time in fields && :value in fields) || return nothing
    (time = getfield(value, :time), value = getfield(value, :value))
end

function signal_inventory_uniform_sample_rate(time_value)::Float64
    time_value isa AbstractVector || throw(signal_inventory_validation_error(
        "variable_name",
        "Поле time должно быть числовым вектором",
    ))
    length(time_value) >= 2 || throw(signal_inventory_validation_error(
        "variable_name",
        "Поле time должно содержать не менее двух значений",
    ))
    all(value -> value isa Real && !(value isa Bool), time_value) ||
        throw(signal_inventory_validation_error(
            "variable_name",
            "Поле time должно содержать числа, но не Bool",
        ))
    times = Float64.(time_value)
    all(isfinite, times) || throw(signal_inventory_validation_error(
        "variable_name",
        "Поле time должно содержать конечные значения",
    ))
    intervals = diff(times)
    all(interval -> interval > 0, intervals) || throw(signal_inventory_validation_error(
        "variable_name",
        "Поле time должно строго возрастать",
    ))
    reference = first(intervals)
    tolerance = max(abs(reference) * 1.0e-9, 64eps(Float64))
    all(interval -> abs(interval - reference) <= tolerance, intervals) ||
        throw(signal_inventory_validation_error(
            "variable_name",
            "Поле time должно иметь равномерный шаг",
        ))
    rate = (length(times) - 1) / (last(times) - first(times))
    isfinite(rate) && rate > 0 || throw(signal_inventory_validation_error(
        "variable_name",
        "По полю time не удалось определить частоту дискретизации",
    ))
    rate
end

function signal_inventory_numeric_series(
    value,
    sample_rate_hz::Float64,
)::Vector{WorkspaceSignalSeries}
    if value isa AbstractVector
        try
            return WorkspaceSignalSeries[WorkspaceSignalSeries(value, sample_rate_hz)]
        catch err
            err isa ArgumentError || rethrow()
            throw(signal_inventory_validation_error("variable_name", sprint(showerror, err)))
        end
    elseif value isa AbstractMatrix
        size(value, 1) >= 2 || throw(signal_inventory_validation_error(
            "variable_name",
            "Матрица должна содержать не менее двух строк",
        ))
        size(value, 2) >= 1 || throw(signal_inventory_validation_error(
            "variable_name",
            "Матрица должна содержать хотя бы один столбец",
        ))
        series = WorkspaceSignalSeries[]
        for column in axes(value, 2)
            try
                push!(series, WorkspaceSignalSeries(collect(view(value, :, column)), sample_rate_hz))
            catch err
                err isa ArgumentError || rethrow()
                throw(signal_inventory_validation_error(
                    "variable_name",
                    "Столбец $(column): $(sprint(showerror, err))",
                ))
            end
        end
        return series
    end
    throw(signal_inventory_validation_error(
        "variable_name",
        "Поддерживаются numeric vector, matrix или timed value",
    ))
end

function signal_inventory_workspace_series(
    value,
    requested_sample_rate_hz::Union{Nothing,Float64},
)::Vector{WorkspaceSignalSeries}
    timed = signal_inventory_timed_fields(value)
    if timed !== nothing
        sample_rate = signal_inventory_uniform_sample_rate(timed.time)
        requested_sample_rate_hz === nothing || isapprox(
            requested_sample_rate_hz,
            sample_rate;
            rtol = 1.0e-9,
            atol = 0.0,
        ) || throw(signal_inventory_validation_error(
            "sample_rate_hz",
            "Частота дискретизации не совпадает с равномерным полем time",
        ))
        expected_count = length(timed.time)
        actual_count = timed.value isa AbstractVector ? length(timed.value) :
            timed.value isa AbstractMatrix ? size(timed.value, 1) : -1
        actual_count == expected_count || throw(signal_inventory_validation_error(
            "variable_name",
            "Число строк value должно совпадать с длиной time",
        ))
        return signal_inventory_numeric_series(timed.value, sample_rate)
    end
    requested_sample_rate_hz === nothing && throw(signal_inventory_validation_error(
        "sample_rate_hz",
        "Для raw vector или matrix требуется частота дискретизации",
    ))
    signal_inventory_numeric_series(value, requested_sample_rate_hz)
end

function signal_inventory_unique_name(existing_names::Set{String}, base::String)::String
    base in existing_names || return base
    suffix = 2
    while "$(base)$(suffix)" in existing_names
        suffix += 1
    end
    "$(base)$(suffix)"
end

function signal_inventory_next_color(
    palette::SignalColorPalette,
    signals::Vector{AnalysedSignal},
    source_color::Union{Nothing,String} = nothing,
)::String
    signal_palette_next_color(
        palette,
        Set(signal.color for signal in signals),
        length(signals) + 1,
        source_color,
    )
end

function signal_inventory_clone_display(display::SignalAnalyserDisplayState)
    SignalAnalyserDisplayState(
        display.id,
        display.name,
        display.active_plot,
        display.membership,
        display.analysis_source,
        display.time_limits,
        display.measurement_selection,
        display.spectrum_settings,
        display.spectrogram_settings,
        display.persistence_settings,
        display.peaks_enabled,
    )
end

function signal_inventory_clone_state(state::SignalAnalyserState)
    typeof(state)(
        copy(state.signals),
        SignalAnalyserViewState(
            state.view.state_revision,
            state.view.active_plot,
            state.view.selected_signal,
        ),
        state.row_selection,
        [signal_inventory_clone_display(display) for display in state.displays],
        state.active_display_id,
        state.next_display_number,
        deepcopy(state.plot_cache),
        copy(state.spectrum_cache),
        copy(state.spectrogram_cache),
        copy(state.persistence_cache),
        state.measurements_service,
        state.peaks_service,
        state.spectrum_service,
        state.spectrogram_service,
        state.persistence_service,
        ReentrantLock(),
    )
end

function signal_inventory_replace_display!(
    state::SignalAnalyserState,
    prospective::SignalAnalyserDisplayState,
)
    index = findfirst(display -> display.id == prospective.id, state.displays)
    index === nothing && throw(ArgumentError("Display не найден: $(prospective.id)"))
    state.displays[index] = prospective
    nothing
end

function signal_inventory_add_series!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    series::Vector{WorkspaceSignalSeries},
    base_name::String,
    source_color::Union{Nothing,String} = nothing,
)::Vector{String}
    isempty(series) && throw(ArgumentError("Signals mutation не может добавить пустой набор"))
    existing_names = Set(signal.name for signal in state.signals)
    added_names = String[]
    added_signals = AnalysedSignal[]
    working_signals = copy(state.signals)
    for item in series
        name = signal_inventory_unique_name(existing_names, base_name)
        color = signal_inventory_next_color(service.palette, working_signals, source_color)
        signal = AnalysedSignal(
            name,
            color,
            item.sample_rate_hz,
            copy(item.values),
            item.is_complex,
            true,
        )
        push!(working_signals, signal)
        push!(added_signals, signal)
        push!(existing_names, name)
        push!(added_names, name)
    end

    active_display = signal_analyser_active_display(state)
    members = vcat(signal_analyser_display_members(active_display), added_names)
    member_names = Set(members)
    prospective_members = [signal for signal in working_signals if signal.name in member_names]
    selected_signal = first(added_signals)
    reconciled_settings = signal_analyser_reconcile_analysis_source(
        service.source_reconciler,
        active_display,
        prospective_members,
        selected_signal,
    )
    append!(state.signals, added_signals)
    first_added = selected_signal.name
    prospective_display = SignalAnalyserDisplayState(
        active_display.id,
        active_display.name,
        active_display.active_plot,
        first_added,
        members,
        signal_full_time_limits(state.measurements_service, selected_signal),
        active_display.measurement_selection,
        reconciled_settings.spectrum,
        reconciled_settings.spectrogram,
        active_display.persistence_settings,
        active_display.peaks_enabled,
    )
    signal_inventory_replace_display!(state, prospective_display)
    state.row_selection = GlobalSignalSelection(first_added)
    signal_analyser_sync_active_display!(state, prospective_display)
    added_names
end

function signal_inventory_execute!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    command::ImportWorkspaceSignalCommand,
)
    value = try
        workspace_signal_value(service.workspace_source, command.variable_name)
    catch err
        err isa SignalWorkspaceSourceError || rethrow()
        throw(signal_inventory_validation_error("variable_name", sprint(showerror, err)))
    end
    series = signal_inventory_workspace_series(value, command.sample_rate_hz)
    base_name = command.signal_name === nothing ? command.variable_name : command.signal_name
    signal_inventory_add_series!(service, state, series, base_name)
end

function signal_inventory_execute!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    command::DuplicateSignalCommand,
)
    source = try
        signal_by_name(state, command.signal_name)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_inventory_validation_error("signal_name", "Неизвестное имя сигнала"))
    end
    existing_names = Set(signal.name for signal in state.signals)
    base_name = signal_inventory_unique_name(existing_names, "$(source.name)_Copy")
    series = WorkspaceSignalSeries[
        WorkspaceSignalSeries(copy(source.values), source.sample_rate_hz, source.is_complex),
    ]
    signal_inventory_add_series!(service, state, series, base_name, source.color)
end

function signal_inventory_execute!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    command::ExtractTimeLimitsSignalCommand,
)
    command.display_id == state.active_display_id || throw(signal_inventory_validation_error(
        "display_id",
        "Извлечение доступно только для active Display",
    ))
    display = try
        signal_analyser_display_by_id(state, command.display_id)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_inventory_validation_error("display_id", "Неизвестный идентификатор Display"))
    end
    analysis_name = signal_analyser_display_analysis_name(display)
    analysis_name === nothing && throw(signal_inventory_validation_error(
        "display_id",
        "Пустой Display не имеет analysis source",
    ))
    display.time_limits === nothing && throw(signal_inventory_validation_error(
        "display_id",
        "Display не имеет Time Limits",
    ))
    source = signal_by_name(state, analysis_name)
    sample_range = signal_time_sample_range(
        state.measurements_service,
        source,
        display.time_limits,
    )
    length(sample_range) >= 2 || throw(signal_inventory_validation_error(
        "display_id",
        "Выбранный диапазон должен содержать не менее двух отсчётов",
    ))
    values = copy(source.values[sample_range.first_index:sample_range.last_index])
    existing_names = Set(signal.name for signal in state.signals)
    base_name = signal_inventory_unique_name(existing_names, "$(source.name)_Extract")
    series = WorkspaceSignalSeries[
        WorkspaceSignalSeries(values, source.sample_rate_hz, source.is_complex),
    ]
    signal_inventory_add_series!(service, state, series, base_name, source.color)
end

function signal_inventory_reconciled_display(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    deleted_name::String,
)::SignalAnalyserDisplayState
    members = [name for name in signal_analyser_display_members(display) if name != deleted_name]
    current_analysis = signal_analyser_display_analysis_name(display)
    analysis_name = if isempty(members)
        nothing
    elseif current_analysis === nothing || current_analysis == deleted_name
        first(members)
    else
        current_analysis
    end
    limits = if analysis_name === nothing
        nothing
    else
        signal = signal_by_name(state, analysis_name)
        if display.time_limits !== nothing && signal_time_limits_are_valid(
            state.measurements_service,
            signal,
            display.time_limits,
        )
            display.time_limits
        else
            signal_full_time_limits(state.measurements_service, signal)
        end
    end
    SignalAnalyserDisplayState(
        display.id,
        display.name,
        display.active_plot,
        analysis_name,
        members,
        limits,
        display.measurement_selection,
        display.spectrum_settings,
        display.spectrogram_settings,
        display.persistence_settings,
        analysis_name === nothing ? false : display.peaks_enabled,
    )
end

function signal_inventory_execute!(
    ::SignalInventoryService,
    state::SignalAnalyserState,
    command::DeleteSignalCommand,
)
    length(state.signals) > 1 || throw(signal_inventory_validation_error(
        "signal_name",
        "Нельзя удалить последний сигнал",
    ))
    any(signal -> signal.name == command.signal_name, state.signals) ||
        throw(signal_inventory_validation_error("signal_name", "Неизвестное имя сигнала"))

    state.signals = [signal for signal in state.signals if signal.name != command.signal_name]
    state.displays = [
        signal_inventory_reconciled_display(state, display, command.signal_name)
        for display in state.displays
    ]
    if state.row_selection.signal_name == command.signal_name
        state.row_selection = GlobalSignalSelection(first(state.signals).name)
    end
    filter!(pair -> first(pair) != command.signal_name, state.plot_cache)
    filter!(pair -> first(pair).signal_name != command.signal_name, state.spectrum_cache)
    filter!(pair -> first(pair).signal_name != command.signal_name, state.spectrogram_cache)
    filter!(pair -> first(pair).signal_name != command.signal_name, state.persistence_cache)
    signal_analyser_sync_active_display!(state, signal_analyser_active_display(state))
    nothing
end

function prepare_signal_inventory_mutation(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    command::AbstractSignalInventoryCommand,
)
    prospective = signal_inventory_clone_state(state)
    try
        signal_inventory_execute!(service, prospective, command)
    catch err
        err isa SignalAnalysisSourceCompatibilityError || rethrow()
        throw(signal_inventory_validation_error(
            err.field,
            sprint(showerror, err),
        ))
    end
    prospective.view.state_revision += 1
    snapshot = signal_analyser_snapshot_unlocked(prospective)
    PreparedSignalInventoryMutation(prospective, snapshot)
end

function publish_signal_inventory_mutation!(
    state::SignalAnalyserState,
    prepared::PreparedSignalInventoryMutation,
)
    prospective = prepared.state
    state.signals = prospective.signals
    state.view = prospective.view
    state.row_selection = prospective.row_selection
    state.displays = prospective.displays
    state.active_display_id = prospective.active_display_id
    state.next_display_number = prospective.next_display_number
    state.plot_cache = prospective.plot_cache
    state.spectrum_cache = prospective.spectrum_cache
    state.spectrogram_cache = prospective.spectrogram_cache
    state.persistence_cache = prospective.persistence_cache
    nothing
end

function apply_signal_inventory!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    command::AbstractSignalInventoryCommand,
)::Dict{String,Any}
    lock(state.lock) do
        requested_revision = signal_inventory_command_revision(command)
        requested_revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            requested_revision,
            state.view.state_revision,
        ))
        prepared = prepare_signal_inventory_mutation(service, state, command)
        publish_signal_inventory_mutation!(state, prepared)
        prepared.snapshot
    end
end

function apply_signal_inventory!(
    service::SignalInventoryService,
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    apply_signal_inventory!(service, state, parse_signal_inventory_command(data))
end
