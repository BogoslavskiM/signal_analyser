const SIGNAL_ANALYSER_SESSION_DOCUMENT_FIELDS = Set([
    "schema",
    "version",
    "source_revision",
    "state",
])
const SIGNAL_ANALYSER_SESSION_STATE_FIELDS = Set([
    "signals",
    "row_selected_signal",
    "displays",
    "active_display_id",
    "next_display_number",
])
const SIGNAL_ANALYSER_SESSION_SIGNAL_FIELDS = Set([
    "name",
    "color",
    "sample_rate_hz",
    "is_complex",
    "visible",
    "values",
])
const SIGNAL_ANALYSER_SESSION_VALUES_FIELDS = Set(["real", "imag"])
const SIGNAL_ANALYSER_SESSION_DISPLAY_FIELDS = Set([
    "id",
    "name",
    "active_plot",
    "analysis_signal",
    "visible_signals",
    "time_limits",
    "measurement_kinds",
    "spectrum_settings",
    "spectrogram_settings",
    "persistence_settings",
    "stored_settings",
    "peaks_enabled",
])
const SIGNAL_ANALYSER_SESSION_DISPLAY_WITH_LAYOUT_FIELDS =
    union(SIGNAL_ANALYSER_SESSION_DISPLAY_FIELDS, Set(["layout"]))
const SIGNAL_ANALYSER_SESSION_LAYOUT_FIELDS = Set([
    "version",
    "variant",
    "rows",
    "columns",
    "active_pane_id",
    "next_pane_number",
    "panes",
])
const SIGNAL_ANALYSER_SESSION_PANE_FIELDS = Set([
    "id",
    "plot_type",
    "signal_bindings",
    "peaks_settings",
])
const SIGNAL_ANALYSER_SESSION_LEGACY_PANE_FIELDS = Set([
    "id",
    "plot_type",
    "signal_bindings",
])
const SIGNAL_ANALYSER_SESSION_PEAKS_SETTINGS_FIELDS = Set([
    "number_of_peaks",
    "minimum_height",
    "minimum_distance_samples",
    "threshold",
])
const SIGNAL_ANALYSER_SESSION_REQUEST_FIELDS = Set(["state_revision", "document"])
const SIGNAL_ANALYSER_SESSION_STORED_SETTING_IDS = (
    "display.show_legend",
    "time.normalize_y",
    "time.show_markers",
    "time.units",
    "time.y_limits",
    "time.link_time",
    "spectrum.frequency_units",
    "spectrum.y_limits",
    "spectrum.resolution_type",
    "spectrum.rbw",
    "spectrum.window_length",
    "spectrum.window",
    "spectrum.sidelobe_attenuation_db",
    "spectrum.overlap_percent",
    "spectrum.nfft",
    "spectrogram.time_units",
    "spectrogram.frequency_units",
    "spectrogram.scale",
    "spectrogram.time_resolution",
    "spectrogram.reassign",
    "persistence.time_units",
    "persistence.frequency_units",
    "persistence.frequency_limits",
    "persistence.power_limits",
    "persistence.density_limits",
    "persistence.frequency_scale",
    "persistence.scale",
    "persistence.time_resolution",
    "persistence.overlap_percent",
    "persistence.power_bins",
)
const SIGNAL_ANALYSER_SESSION_STORED_SETTING_FIELDS =
    Set(SIGNAL_ANALYSER_SESSION_STORED_SETTING_IDS)
const SIGNAL_ANALYSER_SESSION_MAX_SIGNALS = 256
const SIGNAL_ANALYSER_SESSION_MAX_DISPLAYS = 128
const SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES = 5_000_000
const SIGNAL_ANALYSER_SESSION_MAX_TEXT_LENGTH = 1024
const SIGNAL_ANALYSER_SESSION_DISPLAY_ID_REGEX = r"^display-[1-9][0-9]*$"

"""Coordinates versioned session serialization and atomic aggregate replacement."""
struct SignalAnalyserSessionService end

function signal_analyser_session_error(
    path::AbstractString,
    message::AbstractString;
    code::AbstractString = "invalid_session",
)::SignalAnalyserSessionValidationError
    SignalAnalyserSessionValidationError(
        String(code),
        "Некорректный документ сессии",
        Dict(String(path) => String(message)),
    )
end

function signal_analyser_session_exact_object(
    value,
    fields::Set{String},
    path::AbstractString,
)::AbstractDict
    value isa AbstractDict || throw(signal_analyser_session_error(path, "Требуется JSON-объект"))
    actual = signal_analyser_payload_keys(value)
    actual == fields || begin
        missing = sort!(collect(setdiff(fields, actual)))
        unknown = sort!(collect(setdiff(actual, fields)))
        details = String[]
        isempty(missing) || push!(details, "отсутствуют: $(join(missing, ", "))")
        isempty(unknown) || push!(details, "неизвестны: $(join(unknown, ", "))")
        throw(signal_analyser_session_error(path, join(details, "; ")))
    end
    value
end

function signal_analyser_session_string(
    value,
    path::AbstractString;
    allow_empty::Bool = false,
)::String
    value isa AbstractString || throw(signal_analyser_session_error(path, "Требуется строка"))
    result = String(value)
    (!allow_empty && isempty(result)) && throw(signal_analyser_session_error(path, "Строка не может быть пустой"))
    ncodeunits(result) <= SIGNAL_ANALYSER_SESSION_MAX_TEXT_LENGTH || throw(
        signal_analyser_session_error(path, "Строка слишком длинная"),
    )
    result
end

function signal_analyser_session_integer(
    value,
    path::AbstractString;
    minimum::Int = 0,
)::Int
    value isa Integer && !(value isa Bool) || throw(
        signal_analyser_session_error(path, "Требуется целое число"),
    )
    result = try
        Int(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_analyser_session_error(path, "Целое число вне диапазона Int"))
    end
    result >= minimum || throw(signal_analyser_session_error(path, "Минимальное значение: $minimum"))
    result
end

function signal_analyser_session_float(value, path::AbstractString)::Float64
    value isa Real && !(value isa Bool) || throw(
        signal_analyser_session_error(path, "Требуется число, но не Bool"),
    )
    result = try
        Float64(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_analyser_session_error(path, "Число вне диапазона Float64"))
    end
    isfinite(result) || throw(signal_analyser_session_error(path, "Требуется конечное число"))
    result == 0.0 ? 0.0 : result
end

function signal_analyser_session_settings_payload(
    display::SignalAnalyserDisplayState,
)::Dict{String,Any}
    service = SignalSettingsService()
    Dict{String,Any}(
        field_id => signal_settings_field_value(service, display, field_id)
        for field_id in SIGNAL_ANALYSER_SESSION_STORED_SETTING_IDS
    )
end

function signal_analyser_session_signal_payload(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "name" => signal.name,
        "color" => signal.color,
        "sample_rate_hz" => signal.sample_rate_hz,
        "is_complex" => signal.is_complex,
        "visible" => signal.visible,
        "values" => Dict{String,Any}(
            "real" => Float64[real(value) for value in signal.values],
            "imag" => Float64[imag(value) for value in signal.values],
        ),
    )
end

function signal_analyser_session_display_payload(
    display::SignalAnalyserDisplayState,
    layout::SignalDisplayLayoutState,
)::Dict{String,Any}
    payload = Dict{String,Any}(
        "id" => display.id,
        "name" => display.name,
        "active_plot" => signal_analyser_plot_name(display.active_plot),
        "analysis_signal" => signal_analyser_display_analysis_name(display),
        "visible_signals" => signal_analyser_display_members(display),
        "time_limits" => signal_time_limits_payload(display.time_limits),
        "measurement_kinds" => signal_measurement_selection_payload(display.measurement_selection),
        "spectrum_settings" => signal_spectrum_settings_payload(display.spectrum_settings),
        "spectrogram_settings" => signal_spectrogram_settings_payload(display.spectrogram_settings),
        "persistence_settings" => signal_persistence_settings_payload(display.persistence_settings),
        "stored_settings" => signal_analyser_session_settings_payload(display),
        "peaks_enabled" => display.peaks_enabled,
    )
    legacy_layout = signal_display_default_layout(display)
    layout == legacy_layout || (payload["layout"] = signal_display_layout_payload(layout))
    payload
end

function signal_analyser_session_document_unlocked(
    state::SignalAnalyserState,
)::SignalAnalyserSessionDocument
    SignalAnalyserSessionDocument(
        SIGNAL_ANALYSER_SESSION_SCHEMA,
        SIGNAL_ANALYSER_SESSION_VERSION,
        state.view.state_revision,
        copy(state.signals),
        state.row_selection,
        copy(state.displays),
        Dict(
            display_id => copy(layout)
            for (display_id, layout) in state.display_layouts
        ),
        state.active_display_id,
        state.next_display_number,
    )
end

function signal_analyser_session_payload(
    document::SignalAnalyserSessionDocument,
)::Dict{String,Any}
    Dict{String,Any}(
        "schema" => document.schema,
        "version" => document.version,
        "source_revision" => document.source_revision,
        "state" => Dict{String,Any}(
            "signals" => [
                signal_analyser_session_signal_payload(signal) for signal in document.signals
            ],
            "row_selected_signal" => document.row_selection.signal_name,
            "displays" => [
                signal_analyser_session_display_payload(
                    display,
                    document.display_layouts[display.id],
                ) for display in document.displays
            ],
            "active_display_id" => document.active_display_id,
            "next_display_number" => document.next_display_number,
        ),
    )
end

function export_signal_analyser_session(
    ::SignalAnalyserSessionService,
    state::SignalAnalyserState,
)::Dict{String,Any}
    lock(state.lock) do
        document = signal_analyser_session_document_unlocked(state)
        Dict{String,Any}(
            "ok" => true,
            "document" => signal_analyser_session_payload(document),
        )
    end
end

function signal_analyser_session_parse_signal(
    value,
    index::Int,
    maximum_samples::Int,
)::AnalysedSignal
    path = "document.state.signals[$index]"
    data = signal_analyser_session_exact_object(
        value,
        SIGNAL_ANALYSER_SESSION_SIGNAL_FIELDS,
        path,
    )
    name = signal_analyser_session_string(signal_analyser_payload_value(data, "name"), "$path.name")
    color = signal_analyser_session_string(signal_analyser_payload_value(data, "color"), "$path.color")
    sample_rate_hz = signal_analyser_session_float(
        signal_analyser_payload_value(data, "sample_rate_hz"),
        "$path.sample_rate_hz",
    )
    sample_rate_hz > 0 || throw(signal_analyser_session_error(
        "$path.sample_rate_hz",
        "Частота дискретизации должна быть положительной",
    ))
    is_complex = signal_analyser_payload_value(data, "is_complex")
    is_complex isa Bool || throw(signal_analyser_session_error("$path.is_complex", "Требуется boolean"))
    visible = signal_analyser_payload_value(data, "visible")
    visible isa Bool || throw(signal_analyser_session_error("$path.visible", "Требуется boolean"))
    values = signal_analyser_session_exact_object(
        signal_analyser_payload_value(data, "values"),
        SIGNAL_ANALYSER_SESSION_VALUES_FIELDS,
        "$path.values",
    )
    real_values = signal_analyser_payload_value(values, "real")
    imag_values = signal_analyser_payload_value(values, "imag")
    real_values isa AbstractVector || throw(signal_analyser_session_error("$path.values.real", "Требуется массив"))
    imag_values isa AbstractVector || throw(signal_analyser_session_error("$path.values.imag", "Требуется массив"))
    length(real_values) == length(imag_values) || throw(signal_analyser_session_error(
        "$path.values",
        "Массивы real и imag должны иметь одинаковую длину",
    ))
    length(real_values) >= 2 || throw(signal_analyser_session_error(
        "$path.values",
        "Сигнал должен содержать не менее двух отсчётов",
    ))
    length(real_values) <= maximum_samples || throw(signal_analyser_session_error(
        "$path.values",
        "Превышен общий лимит $(SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES) отсчётов",
    ))
    samples = Vector{ComplexF64}(undef, length(real_values))
    for sample_index in eachindex(real_values, imag_values)
        real_part = signal_analyser_session_float(
            real_values[sample_index],
            "$path.values.real[$sample_index]",
        )
        imag_part = signal_analyser_session_float(
            imag_values[sample_index],
            "$path.values.imag[$sample_index]",
        )
        !is_complex && !iszero(imag_part) && throw(signal_analyser_session_error(
            "$path.values.imag[$sample_index]",
            "Вещественный сигнал не может содержать мнимую часть",
        ))
        samples[sample_index] = ComplexF64(real_part, imag_part)
    end
    AnalysedSignal(name, color, sample_rate_hz, samples, is_complex, visible)
end

signal_analyser_session_parse_signal(value, index::Int)::AnalysedSignal =
    signal_analyser_session_parse_signal(
        value,
        index,
        SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES,
    )

function signal_analyser_session_parse_stored_settings(
    value,
    display::SignalAnalyserDisplayState,
)::SignalDisplayStoredSettings
    path = "document.state.displays.$(display.id).stored_settings"
    data = signal_analyser_session_exact_object(
        value,
        SIGNAL_ANALYSER_SESSION_STORED_SETTING_FIELDS,
        path,
    )
    stored = SignalDisplayStoredSettings()
    for field_id in SIGNAL_ANALYSER_SESSION_STORED_SETTING_IDS
        definition = signal_settings_field(SIGNAL_SETTINGS_CATALOG, field_id)::SignalSettingsFieldDefinition
        typed_value = try
            signal_settings_parse_field_value(
                definition,
                display.id,
                field_id,
                signal_analyser_payload_value(data, field_id),
            )
        catch err
            err isa SignalSettingValidationError || rethrow()
            throw(signal_analyser_session_error("$path.$field_id", err.message))
        end
        command = UpdateSignalSettingCommand(0, display.id, field_id, typed_value)
        stored = try
            signal_settings_apply_stored_value(stored, command)
        catch err
            (err isa ArgumentError || err isa SignalSettingValidationError) || rethrow()
            throw(signal_analyser_session_error("$path.$field_id", sprint(showerror, err)))
        end
    end
    stored
end

function signal_analyser_session_parse_display(value, index::Int)::SignalAnalyserDisplayState
    path = "document.state.displays[$index]"
    value isa AbstractDict || throw(signal_analyser_session_error(path, "Требуется JSON-объект"))
    actual_fields = signal_analyser_payload_keys(value)
    actual_fields in (
        SIGNAL_ANALYSER_SESSION_DISPLAY_FIELDS,
        SIGNAL_ANALYSER_SESSION_DISPLAY_WITH_LAYOUT_FIELDS,
    ) || throw(signal_analyser_session_error(
        path,
        "Ожидался exact legacy Display или Display с полем layout",
    ))
    data = value
    id = signal_analyser_session_string(signal_analyser_payload_value(data, "id"), "$path.id")
    occursin(SIGNAL_ANALYSER_SESSION_DISPLAY_ID_REGEX, id) || throw(
        signal_analyser_session_error("$path.id", "Ожидался идентификатор display-N"),
    )
    name = signal_analyser_session_string(signal_analyser_payload_value(data, "name"), "$path.name")
    plot_value = signal_analyser_payload_value(data, "active_plot")
    plot_value isa AbstractString && haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, String(plot_value)) || throw(
        signal_analyser_session_error("$path.active_plot", "Допустимо: time, spectrum, spectrogram, persistence"),
    )
    active_plot = SIGNAL_ANALYSER_PLOTS_BY_NAME[String(plot_value)]
    visible_value = signal_analyser_payload_value(data, "visible_signals")
    visible_value isa AbstractVector || throw(signal_analyser_session_error("$path.visible_signals", "Требуется массив"))
    visible_signals = String[]
    for (signal_index, item) in enumerate(visible_value)
        push!(visible_signals, signal_analyser_session_string(item, "$path.visible_signals[$signal_index]"))
    end
    allunique(visible_signals) || throw(signal_analyser_session_error(
        "$path.visible_signals",
        "Имена сигналов не должны повторяться",
    ))
    analysis_value = signal_analyser_payload_value(data, "analysis_signal")
    analysis_signal = analysis_value === nothing ? nothing :
        signal_analyser_session_string(analysis_value, "$path.analysis_signal")
    field_errors = Dict{String,String}()
    time_limits = signal_analyser_validate_time_limits!(
        field_errors,
        signal_analyser_payload_value(data, "time_limits"),
    )
    measurement_selection = signal_analyser_validate_measurement_kinds!(
        field_errors,
        signal_analyser_payload_value(data, "measurement_kinds"),
    )
    spectrum_settings = signal_analyser_validate_spectrum_settings!(
        field_errors,
        signal_analyser_payload_value(data, "spectrum_settings"),
    )
    spectrogram_settings = signal_analyser_validate_spectrogram_settings!(
        field_errors,
        signal_analyser_payload_value(data, "spectrogram_settings"),
    )
    persistence_settings = signal_analyser_validate_persistence_settings!(
        field_errors,
        signal_analyser_payload_value(data, "persistence_settings"),
    )
    isempty(field_errors) || throw(SignalAnalyserSessionValidationError(
        "invalid_session",
        "Некорректный документ сессии",
        Dict("$path.$field" => message for (field, message) in field_errors),
    ))
    peaks_enabled = signal_analyser_payload_value(data, "peaks_enabled")
    peaks_enabled isa Bool || throw(signal_analyser_session_error("$path.peaks_enabled", "Требуется boolean"))
    base_display = try
        SignalAnalyserDisplayState(
            id,
            name,
            active_plot,
            analysis_signal,
            visible_signals,
            time_limits,
            measurement_selection::SignalMeasurementSelection,
            spectrum_settings::SignalSpectrumSettings,
            spectrogram_settings::SignalSpectrogramSettings,
            persistence_settings::SignalPersistenceSettings,
            peaks_enabled,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_analyser_session_error(path, sprint(showerror, err)))
    end
    stored_settings = signal_analyser_session_parse_stored_settings(
        signal_analyser_payload_value(data, "stored_settings"),
        base_display,
    )
    try
        SignalAnalyserDisplayState(
            id,
            name,
            active_plot,
            base_display.membership,
            base_display.analysis_source,
            time_limits,
            measurement_selection::SignalMeasurementSelection,
            spectrum_settings::SignalSpectrumSettings,
            spectrogram_settings::SignalSpectrogramSettings,
            persistence_settings::SignalPersistenceSettings,
            stored_settings,
            peaks_enabled,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_analyser_session_error(path, sprint(showerror, err)))
    end
end

function signal_analyser_session_parse_layout_pane(
    value,
    display::SignalAnalyserDisplayState,
    active_pane_id::String,
    signals::AbstractVector{AnalysedSignal},
    display_index::Int,
    pane_index::Int,
)::SignalDisplayPaneState
    path = "document.state.displays[$display_index].layout.panes[$pane_index]"
    value isa AbstractDict || throw(signal_analyser_session_error(path, "Требуется JSON-объект"))
    pane_fields = signal_analyser_payload_keys(value)
    data = pane_fields == SIGNAL_ANALYSER_SESSION_LEGACY_PANE_FIELDS ? value :
        signal_analyser_session_exact_object(value, SIGNAL_ANALYSER_SESSION_PANE_FIELDS, path)
    pane_id = signal_analyser_session_string(
        signal_analyser_payload_value(data, "id"),
        "$path.id",
    )
    occursin(SIGNAL_DISPLAY_PANE_ID_REGEX, pane_id) || throw(
        signal_analyser_session_error("$path.id", "Ожидался идентификатор pane-N"),
    )
    plot_value = signal_analyser_payload_value(data, "plot_type")
    plot_value isa AbstractString && haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, String(plot_value)) ||
        throw(signal_analyser_session_error(
            "$path.plot_type",
            "Допустимо: time, spectrum, spectrogram, persistence",
        ))
    bindings_value = signal_analyser_payload_value(data, "signal_bindings")
    bindings_value isa AbstractVector || throw(signal_analyser_session_error(
        "$path.signal_bindings",
        "Требуется массив",
    ))
    bindings = String[
        signal_analyser_session_string(
            item,
            "$path.signal_bindings[$binding_index]",
        )
        for (binding_index, item) in enumerate(bindings_value)
    ]
    allunique(bindings) || throw(signal_analyser_session_error(
        "$path.signal_bindings",
        "Имена сигналов не должны повторяться",
    ))
    plot_type = SIGNAL_ANALYSER_PLOTS_BY_NAME[String(plot_value)]
    peaks_settings = if pane_fields == SIGNAL_ANALYSER_SESSION_LEGACY_PANE_FIELDS
        SignalPeaksSettings()
    else
        peaks_settings_data = signal_analyser_session_exact_object(
            signal_analyser_payload_value(data, "peaks_settings"),
            SIGNAL_ANALYSER_SESSION_PEAKS_SETTINGS_FIELDS,
            "$path.peaks_settings",
        )
        number_of_peaks = signal_analyser_session_integer(
            signal_analyser_payload_value(peaks_settings_data, "number_of_peaks"),
            "$path.peaks_settings.number_of_peaks",
            minimum = 1,
        )
        number_of_peaks <= SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS || throw(
            signal_analyser_session_error(
                "$path.peaks_settings.number_of_peaks",
                "Максимальное значение: $(SIGNAL_PEAKS_MAX_NUMBER_OF_PEAKS)",
            ),
        )
        minimum_height_value = signal_analyser_payload_value(peaks_settings_data, "minimum_height")
        minimum_height = minimum_height_value === nothing ? nothing : signal_analyser_session_float(
            minimum_height_value,
            "$path.peaks_settings.minimum_height",
        )
        minimum_distance_samples = signal_analyser_session_integer(
            signal_analyser_payload_value(peaks_settings_data, "minimum_distance_samples"),
            "$path.peaks_settings.minimum_distance_samples",
            minimum = 1,
        )
        threshold = signal_analyser_session_float(
            signal_analyser_payload_value(peaks_settings_data, "threshold"),
            "$path.peaks_settings.threshold",
        )
        threshold >= 0 || throw(signal_analyser_session_error(
            "$path.peaks_settings.threshold",
            "Требуется неотрицательное число",
        ))
        SignalPeaksSettings(
            number_of_peaks,
            minimum_height,
            minimum_distance_samples,
            threshold,
        )
    end
    display_members = signal_analyser_display_members(display)
    if pane_id == active_pane_id && plot_type == display.active_plot &&
        Set(bindings) == Set(display_members)
        return try
            SignalDisplayPaneState(
                pane_id,
                plot_type,
                SignalDisplayMembership(bindings),
                display.analysis_source,
                display.time_limits,
                display.measurement_selection,
                display.spectrum_settings,
                display.spectrogram_settings,
                display.persistence_settings,
                display.stored_settings,
                display.peaks_enabled,
                peaks_settings,
            )
        catch err
            err isa ArgumentError || rethrow()
            throw(signal_analyser_session_error(path, sprint(showerror, err)))
        end
    end
    known_names = Set(signal.name for signal in signals)
    unknown_name = findfirst(name -> !(name in known_names), bindings)
    unknown_name === nothing || throw(signal_analyser_session_error(
        "$path.signal_bindings[$unknown_name]",
        "Pane ссылается на неизвестный сигнал",
    ))
    analysis_signal = isempty(bindings) ? nothing : signals[
        findfirst(signal -> signal.name == first(bindings), signals)::Int
    ]
    try
        SignalDisplayPaneState(
            pane_id,
            plot_type,
            SignalDisplayMembership(bindings),
            signal_analysis_source(analysis_signal === nothing ? nothing : analysis_signal.name),
            analysis_signal === nothing ? nothing : signal_full_time_limits(
                SignalMeasurementsService(),
                analysis_signal,
            ),
            SignalMeasurementSelection(),
            SignalSpectrumSettings(),
            SignalSpectrogramSettings(),
            SignalPersistenceSettings(),
            SignalDisplayStoredSettings(),
            false,
            peaks_settings,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_analyser_session_error(path, sprint(showerror, err)))
    end
end

function signal_analyser_session_parse_layout(
    value,
    display::SignalAnalyserDisplayState,
    signals::AbstractVector{AnalysedSignal},
    display_index::Int,
)::SignalDisplayLayoutState
    value === nothing && return signal_display_default_layout(display)
    path = "document.state.displays[$display_index].layout"
    data = signal_analyser_session_exact_object(
        value,
        SIGNAL_ANALYSER_SESSION_LAYOUT_FIELDS,
        path,
    )
    version = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "version"),
        "$path.version",
        minimum = 1,
    )
    version == SIGNAL_DISPLAY_LAYOUT_VERSION || throw(signal_analyser_session_error(
        "$path.version",
        "Поддерживается только layout version 1",
    ))
    rows = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "rows"),
        "$path.rows",
        minimum = SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION,
    )
    rows <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION || throw(signal_analyser_session_error(
        "$path.rows",
        "Максимальное значение: $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)",
    ))
    columns = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "columns"),
        "$path.columns",
        minimum = SIGNAL_DISPLAY_LAYOUT_MIN_DIMENSION,
    )
    columns <= SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION || throw(signal_analyser_session_error(
        "$path.columns",
        "Максимальное значение: $(SIGNAL_DISPLAY_LAYOUT_MAX_DIMENSION)",
    ))
    variant = signal_analyser_session_string(
        signal_analyser_payload_value(data, "variant"),
        "$path.variant",
    )
    variant == signal_display_layout_variant(rows, columns) || throw(
        signal_analyser_session_error(
            "$path.variant",
            "Требуется canonical variant $(signal_display_layout_variant(rows, columns))",
        ),
    )
    panes_value = signal_analyser_payload_value(data, "panes")
    panes_value isa AbstractVector || throw(signal_analyser_session_error(
        "$path.panes",
        "Требуется массив",
    ))
    length(panes_value) == rows * columns || throw(signal_analyser_session_error(
        "$path.panes",
        "Число panes должно совпадать с topology layout",
    ))
    active_pane_id = signal_analyser_session_string(
        signal_analyser_payload_value(data, "active_pane_id"),
        "$path.active_pane_id",
    )
    panes = SignalDisplayPaneState[
        signal_analyser_session_parse_layout_pane(
            item,
            display,
            active_pane_id,
            signals,
            display_index,
            pane_index,
        )
        for (pane_index, item) in enumerate(panes_value)
    ]
    next_pane_number = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "next_pane_number"),
        "$path.next_pane_number",
        minimum = 2,
    )
    try
        SignalDisplayLayoutState(
            version,
            variant,
            rows,
            columns,
            panes,
            active_pane_id,
            next_pane_number,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_analyser_session_error(path, sprint(showerror, err)))
    end
end

function signal_analyser_session_validate_candidate!(
    state::SignalAnalyserState,
)::Nothing
    known_names = Set(signal.name for signal in state.signals)
    state.row_selection.signal_name in known_names || throw(signal_analyser_session_error(
        "document.state.row_selected_signal",
        "Выбранный сигнал отсутствует в inventory",
    ))
    display_ids = [display.id for display in state.displays]
    allunique(display_ids) || throw(signal_analyser_session_error(
        "document.state.displays",
        "Идентификаторы Display не должны повторяться",
    ))
    Set(keys(state.display_layouts)) == Set(display_ids) || throw(
        signal_analyser_session_error(
            "document.state.displays",
            "Каждый Display должен иметь ровно один layout",
        ),
    )
    state.active_display_id in display_ids || throw(signal_analyser_session_error(
        "document.state.active_display_id",
        "Active Display отсутствует в displays",
    ))
    display_numbers = Int[]
    for id in display_ids
        display_number = tryparse(Int, split(id, '-')[2])
        display_number === nothing && throw(signal_analyser_session_error(
            "document.state.displays.$id.id",
            "Номер Display находится вне диапазона Int",
        ))
        push!(display_numbers, display_number)
    end
    maximum_display_number = maximum(display_numbers)
    state.next_display_number > maximum_display_number || throw(signal_analyser_session_error(
        "document.state.next_display_number",
        "Значение должно быть больше номера любого сохранённого Display",
    ))
    for display in state.displays
        path = "document.state.displays.$(display.id)"
        layout = signal_analyser_layout_by_display_id(state, display.id)
        for pane in layout.panes
            all(name -> name in known_names, signal_display_pane_members(pane)) || throw(
                signal_analyser_session_error(
                    "$path.layout.panes.$(pane.id).signal_bindings",
                    "Pane ссылается на неизвестный сигнал",
                ),
            )
        end
        active_pane = signal_display_active_pane(layout)
        members = signal_analyser_display_members(display)
        all(name -> name in known_names, members) || throw(signal_analyser_session_error(
            "$path.visible_signals",
            "Display ссылается на неизвестный сигнал",
        ))
        members == signal_analyser_inventory_ordered_names(state, members) || throw(
            signal_analyser_session_error(
                "$path.visible_signals",
                "Порядок должен совпадать с authoritative inventory",
            ),
        )
        active_pane.plot_type == display.active_plot || throw(
            signal_analyser_session_error(
                "$path.layout.active_pane_id",
                "Plot type active pane не совпадает с legacy Display projection",
            ),
        )
        Set(signal_display_pane_members(active_pane)) == Set(members) || throw(
            signal_analyser_session_error(
                "$path.layout.active_pane_id",
                "Состав bindings active pane не совпадает с legacy Display projection",
            ),
        )
        analysis_name = signal_analyser_display_analysis_name(display)
        analysis_signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
        if analysis_signal !== nothing
            signal_time_limits_are_valid(
                state.measurements_service,
                analysis_signal,
                display.time_limits::SignalTimeLimits,
            ) || throw(signal_analyser_session_error(
                "$path.time_limits",
                "Интервал должен содержать отсчёт и лежать в домене analysis source",
            ))
            for (settings_path, limits) in (
                ("spectrum_settings.frequency_limits", display.spectrum_settings.frequency_limits),
                ("spectrogram_settings.frequency_limits", display.spectrogram_settings.frequency_limits),
            )
                limits isa ExplicitSignalSpectrumFrequencyLimits || continue
                signal_spectrum_frequency_limits_valid_for_signal(limits, analysis_signal) || throw(
                    signal_analyser_session_error(
                        "$path.$settings_path",
                        "Интервал лежит вне частотного домена analysis source",
                    ),
                )
            end
            persistence_limits = display.stored_settings.persistence.frequency_limits
            if persistence_limits !== nothing
                limits = ExplicitSignalSpectrumFrequencyLimits(
                    persistence_limits.minimum,
                    persistence_limits.maximum,
                )
                signal_spectrum_frequency_limits_valid_for_signal(limits, analysis_signal) || throw(
                    signal_analyser_session_error(
                        "$path.stored_settings.persistence.frequency_limits",
                        "Интервал лежит вне частотного домена analysis source",
                    ),
                )
            end
            resolution = display.stored_settings.spectrogram.time_resolution
            if resolution.mode == SPECIFIED_SIGNAL_SETTING
                (resolution.seconds::Float64) <= signal_duration_s(analysis_signal) || throw(
                    signal_analyser_session_error(
                        "$path.stored_settings.spectrogram.time_resolution",
                        "Time resolution превышает duration analysis source",
                    ),
                )
            end
        else
            display.stored_settings.persistence.frequency_limits === nothing || throw(
                signal_analyser_session_error(
                    "$path.stored_settings.persistence.frequency_limits",
                    "Явный интервал требует analysis source",
                ),
            )
            display.stored_settings.spectrogram.time_resolution.mode == AUTOMATIC_SIGNAL_SETTING || throw(
                signal_analyser_session_error(
                    "$path.stored_settings.spectrogram.time_resolution",
                    "Specified resolution требует analysis source",
                ),
            )
            display.stored_settings.persistence.time_resolution.mode == AUTOMATIC_SIGNAL_SETTING || throw(
                signal_analyser_session_error(
                    "$path.stored_settings.persistence.time_resolution",
                    "Specified resolution требует analysis source",
                ),
            )
        end
        if display.spectrum_settings.frequency_scale == LOG_SPECTRUM_FREQUENCY_SCALE &&
            any(signal -> signal.is_complex && signal.name in members, state.signals)
            throw(signal_analyser_session_error(
                "$path.spectrum_settings.frequency_scale",
                "Log scale недоступна для Display с комплексным сигналом",
            ))
        end
        try
            SignalSpectrogramPresentationSettings(
                display.stored_settings.spectrogram.scale,
                display.spectrogram_settings.power_limits,
            )
        catch err
            err isa ArgumentError || rethrow()
            throw(signal_analyser_session_error(
                "$path.spectrogram_settings.power_limits",
                sprint(showerror, err),
            ))
        end
    end
    active_display = signal_analyser_active_display(state)
    active_members = Set(active_display.membership.signal_names)
    all(signal -> signal.visible == (signal.name in active_members), state.signals) || throw(
        signal_analyser_session_error(
            "document.state.signals",
            "Поле visible должно совпадать с membership active Display",
        ),
    )
    nothing
end

function parse_signal_analyser_session_document(value)::SignalAnalyserSessionDocument
    data = signal_analyser_session_exact_object(
        value,
        SIGNAL_ANALYSER_SESSION_DOCUMENT_FIELDS,
        "document",
    )
    schema = signal_analyser_session_string(
        signal_analyser_payload_value(data, "schema"),
        "document.schema",
    )
    schema == SIGNAL_ANALYSER_SESSION_SCHEMA || throw(signal_analyser_session_error(
        "document.schema",
        "Неподдерживаемая schema: $schema";
        code = "unsupported_session_schema",
    ))
    version = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "version"),
        "document.version",
        minimum = 1,
    )
    version == SIGNAL_ANALYSER_SESSION_VERSION || throw(signal_analyser_session_error(
        "document.version",
        "Неподдерживаемая версия: $version";
        code = "unsupported_session_version",
    ))
    source_revision = signal_analyser_session_integer(
        signal_analyser_payload_value(data, "source_revision"),
        "document.source_revision",
    )
    state_data = signal_analyser_session_exact_object(
        signal_analyser_payload_value(data, "state"),
        SIGNAL_ANALYSER_SESSION_STATE_FIELDS,
        "document.state",
    )
    signal_values = signal_analyser_payload_value(state_data, "signals")
    signal_values isa AbstractVector || throw(signal_analyser_session_error(
        "document.state.signals",
        "Требуется массив",
    ))
    1 <= length(signal_values) <= SIGNAL_ANALYSER_SESSION_MAX_SIGNALS || throw(
        signal_analyser_session_error(
            "document.state.signals",
            "Допустимо от 1 до $(SIGNAL_ANALYSER_SESSION_MAX_SIGNALS) сигналов",
        ),
    )
    signals = AnalysedSignal[]
    remaining_samples = SIGNAL_ANALYSER_SESSION_MAX_TOTAL_SAMPLES
    for (index, value) in enumerate(signal_values)
        signal = signal_analyser_session_parse_signal(value, index, remaining_samples)
        push!(signals, signal)
        remaining_samples -= length(signal.values)
    end
    allunique(signal.name for signal in signals) || throw(signal_analyser_session_error(
        "document.state.signals",
        "Имена сигналов не должны повторяться",
    ))
    row_selection = GlobalSignalSelection(signal_analyser_session_string(
        signal_analyser_payload_value(state_data, "row_selected_signal"),
        "document.state.row_selected_signal",
    ))
    display_values = signal_analyser_payload_value(state_data, "displays")
    display_values isa AbstractVector || throw(signal_analyser_session_error(
        "document.state.displays",
        "Требуется массив",
    ))
    1 <= length(display_values) <= SIGNAL_ANALYSER_SESSION_MAX_DISPLAYS || throw(
        signal_analyser_session_error(
            "document.state.displays",
            "Допустимо от 1 до $(SIGNAL_ANALYSER_SESSION_MAX_DISPLAYS) Display",
        ),
    )
    displays = SignalAnalyserDisplayState[]
    display_layouts = Dict{String,SignalDisplayLayoutState}()
    for (index, value) in enumerate(display_values)
        display = signal_analyser_session_parse_display(value, index)
        push!(displays, display)
        layout_value = signal_analyser_payload_contains(value, "layout") ?
            signal_analyser_payload_value(value, "layout") : nothing
        display_layouts[display.id] = signal_analyser_session_parse_layout(
            layout_value,
            display,
            signals,
            index,
        )
    end
    active_display_id = signal_analyser_session_string(
        signal_analyser_payload_value(state_data, "active_display_id"),
        "document.state.active_display_id",
    )
    next_display_number = signal_analyser_session_integer(
        signal_analyser_payload_value(state_data, "next_display_number"),
        "document.state.next_display_number",
        minimum = 2,
    )
    SignalAnalyserSessionDocument(
        schema,
        version,
        source_revision,
        signals,
        row_selection,
        displays,
        display_layouts,
        active_display_id,
        next_display_number,
    )
end

function parse_import_signal_analyser_session_command(data)::ImportSignalAnalyserSessionCommand
    request = signal_analyser_session_exact_object(
        data,
        SIGNAL_ANALYSER_SESSION_REQUEST_FIELDS,
        "body",
    )
    expected_revision = signal_analyser_session_integer(
        signal_analyser_payload_value(request, "state_revision"),
        "state_revision",
    )
    document = parse_signal_analyser_session_document(
        signal_analyser_payload_value(request, "document"),
    )
    ImportSignalAnalyserSessionCommand(expected_revision, document)
end

function signal_analyser_session_candidate(
    current::SignalAnalyserState,
    document::SignalAnalyserSessionDocument,
    revision::Int,
)::SignalAnalyserState
    active_index = findfirst(display -> display.id == document.active_display_id, document.displays)
    active_index === nothing && throw(signal_analyser_session_error(
        "document.state.active_display_id",
        "Active Display отсутствует в displays",
    ))
    active_display = document.displays[active_index]
    candidate = try
        SignalAnalyserState(
            copy(document.signals),
            SignalAnalyserViewState(
                revision,
                active_display.active_plot,
                signal_analyser_display_analysis_name(active_display),
            ),
            Dict{String,Dict{String,Any}}(),
            ReentrantLock(),
            peaks_provider = current.peaks_service.provider,
            spectrum_provider = current.spectrum_service.provider,
            spectrogram_provider = current.spectrogram_service.provider,
            persistence_provider = current.persistence_service.provider,
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_analyser_session_error(
            "document.state",
            sprint(showerror, err),
        ))
    end
    candidate.row_selection = document.row_selection
    candidate.displays = copy(document.displays)
    candidate.display_layouts = Dict(
        display_id => copy(layout)
        for (display_id, layout) in document.display_layouts
    )
    candidate.active_display_id = document.active_display_id
    candidate.next_display_number = document.next_display_number
    candidate.view.active_plot = active_display.active_plot
    candidate.view.selected_signal = signal_analyser_display_analysis_name(active_display)
    signal_analyser_session_validate_candidate!(candidate)
    candidate
end

function signal_analyser_publish_session!(
    state::SignalAnalyserState,
    candidate::SignalAnalyserState,
)::Nothing
    signal_analyser_cancel_active_output_unlocked!(state)
    state.signals = candidate.signals
    state.view = candidate.view
    state.row_selection = candidate.row_selection
    state.displays = candidate.displays
    state.display_layouts = candidate.display_layouts
    state.active_display_id = candidate.active_display_id
    state.next_display_number = candidate.next_display_number
    state.plot_cache = candidate.plot_cache
    state.spectrum_cache = candidate.spectrum_cache
    state.spectrogram_cache = candidate.spectrogram_cache
    state.persistence_cache = candidate.persistence_cache
    signal_analyser_sync_output_pages_unlocked!(state)
    signal_analyser_invalidate_all_outputs_unlocked!(state)
    nothing
end

function import_signal_analyser_session!(
    ::SignalAnalyserSessionService,
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    command = parse_import_signal_analyser_session_command(data)
    lock(state.lock) do
        command.expected_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(
                command.expected_revision,
                state.view.state_revision,
            ),
        )
        next_revision = state.view.state_revision + 1
        candidate = signal_analyser_session_candidate(state, command.document, next_revision)
        signal_analyser_publish_session!(state, candidate)
        Dict{String,Any}(
            "ok" => true,
            "schema" => command.document.schema,
            "version" => command.document.version,
            "imported_source_revision" => command.document.source_revision,
            "state_revision" => next_revision,
        )
    end
end
