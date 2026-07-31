@enum SignalAnalyserPlot begin
    TIME_PLOT
    SPECTRUM_PLOT
    SPECTROGRAM_PLOT
    PERSISTENCE_PLOT
end

const SIGNAL_ANALYSER_PLOT_NAMES = Dict(
    TIME_PLOT => "time",
    SPECTRUM_PLOT => "spectrum",
    SPECTROGRAM_PLOT => "spectrogram",
    PERSISTENCE_PLOT => "persistence",
)
const SIGNAL_ANALYSER_PLOTS_BY_NAME = Dict(value => key for (key, value) in SIGNAL_ANALYSER_PLOT_NAMES)

struct AnalysedSignal
    name::String
    color::String
    sample_rate_hz::Float64
    values::Vector{ComplexF64}
    is_complex::Bool
    visible::Bool
end

"""Authoritative per-Display Time region in seconds."""
struct SignalTimeLimits
    min_s::Float64
    max_s::Float64

    function SignalTimeLimits(min_s::Real, max_s::Real)
        minimum_time = Float64(min_s)
        maximum_time = Float64(max_s)
        isfinite(minimum_time) && isfinite(maximum_time) || throw(ArgumentError(
            "Time Limits должны быть конечными числами",
        ))
        minimum_time < maximum_time || throw(ArgumentError(
            "Минимальная Time Limit должна быть меньше максимальной",
        ))
        new(minimum_time, maximum_time)
    end
end

Base.:(==)(left::SignalTimeLimits, right::SignalTimeLimits) =
    left.min_s == right.min_s && left.max_s == right.max_s
Base.isequal(left::SignalTimeLimits, right::SignalTimeLimits) = left == right
Base.hash(limits::SignalTimeLimits, seed::UInt) = hash((limits.min_s, limits.max_s), seed)

@enum SignalMeasurementOrdinate begin
    REAL_ORDINATE
    MAGNITUDE_ORDINATE
end

"""Finite raw ordinate samples inside an inclusive Time ROI."""
struct SignalOrdinateRoi
    ordinate::SignalMeasurementOrdinate
    values::Tuple{Vararg{Float64}}
    sample_offset::Int
    sample_rate_hz::Float64

    function SignalOrdinateRoi(
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_offset::Int,
        sample_rate_hz::Real,
    )
        roi_values = Float64.(values)
        isempty(roi_values) && throw(ArgumentError("Time Limits не содержат ни одного отсчёта"))
        all(isfinite, roi_values) || throw(ArgumentError("ROI сигнала содержит нечисловые отсчёты"))
        sample_offset >= 0 || throw(ArgumentError("Смещение ROI не может быть отрицательным"))
        isfinite(sample_rate_hz) && sample_rate_hz > 0 || throw(ArgumentError(
            "Частота дискретизации ROI должна быть положительной и конечной",
        ))
        new(ordinate, Tuple(roi_values), sample_offset, Float64(sample_rate_hz))
    end
end

"""Stateless domain collaborator that resolves inclusive raw Time ROIs."""
struct SignalTimeRoiService end

@enum SignalMeasurementKind begin
    MINIMUM_MEASUREMENT
    MAXIMUM_MEASUREMENT
    MEAN_MEASUREMENT
    MEDIAN_MEASUREMENT
    PEAK_TO_PEAK_MEASUREMENT
    RMS_MEASUREMENT
end

const SIGNAL_MEASUREMENT_CANONICAL_KINDS = (
    MINIMUM_MEASUREMENT,
    MAXIMUM_MEASUREMENT,
    MEAN_MEASUREMENT,
    MEDIAN_MEASUREMENT,
    PEAK_TO_PEAK_MEASUREMENT,
    RMS_MEASUREMENT,
)
const SIGNAL_MEASUREMENT_DEFAULT_KINDS = (
    MINIMUM_MEASUREMENT,
    MAXIMUM_MEASUREMENT,
    MEAN_MEASUREMENT,
)

const SIGNAL_MEASUREMENT_ORDINATE_NAMES = Dict(
    REAL_ORDINATE => "real",
    MAGNITUDE_ORDINATE => "magnitude",
)

const SIGNAL_MEASUREMENT_ITEM_METADATA = Dict(
    MINIMUM_MEASUREMENT => (id = "minimum", label = "Минимум"),
    MAXIMUM_MEASUREMENT => (id = "maximum", label = "Максимум"),
    MEAN_MEASUREMENT => (id = "mean", label = "Среднее"),
    MEDIAN_MEASUREMENT => (id = "median", label = "Медиана"),
    PEAK_TO_PEAK_MEASUREMENT => (id = "peak_to_peak", label = "Размах"),
    RMS_MEASUREMENT => (id = "rms", label = "СКЗ"),
)

"""Canonical, duplicate-free per-Display Statistics preference."""
struct SignalMeasurementSelection
    kinds::Tuple{Vararg{SignalMeasurementKind}}

    function SignalMeasurementSelection(kinds::Tuple{Vararg{SignalMeasurementKind}})
        length(unique(kinds)) == length(kinds) || throw(ArgumentError(
            "Виды измерений не должны повторяться",
        ))
        canonical_kinds = Tuple(
            kind for kind in SIGNAL_MEASUREMENT_CANONICAL_KINDS
            if kind in kinds
        )
        length(canonical_kinds) == length(kinds) || throw(ArgumentError(
            "Выбран неподдерживаемый вид измерения",
        ))
        new(canonical_kinds)
    end
end

SignalMeasurementSelection() = SignalMeasurementSelection(SIGNAL_MEASUREMENT_DEFAULT_KINDS)
SignalMeasurementSelection(kinds::AbstractVector{SignalMeasurementKind}) =
    SignalMeasurementSelection(Tuple(kinds))

Base.:(==)(left::SignalMeasurementSelection, right::SignalMeasurementSelection) =
    left.kinds == right.kinds
Base.isequal(left::SignalMeasurementSelection, right::SignalMeasurementSelection) = left == right
Base.hash(selection::SignalMeasurementSelection, seed::UInt) = hash(selection.kinds, seed)

signal_measurement_selected(selection::SignalMeasurementSelection, kind::SignalMeasurementKind)::Bool =
    kind in selection.kinds

struct SignalMeasurementPosition
    sample_index::Int
    time_s::Float64

    function SignalMeasurementPosition(sample_index::Int, time_s::Real)
        sample_index >= 0 || throw(ArgumentError("Индекс отсчёта измерения не может быть отрицательным"))
        isfinite(time_s) && time_s >= 0 || throw(ArgumentError(
            "Время измерения должно быть неотрицательным конечным числом",
        ))
        new(sample_index, Float64(time_s))
    end
end

struct SignalMeasurementItem
    kind::SignalMeasurementKind
    value::Float64
    position::Union{Nothing,SignalMeasurementPosition}

    function SignalMeasurementItem(
        kind::SignalMeasurementKind,
        value::Real,
        position::Union{Nothing,SignalMeasurementPosition},
    )
        isfinite(value) || throw(ArgumentError("Значение измерения должно быть конечным числом"))
        if kind == MINIMUM_MEASUREMENT || kind == MAXIMUM_MEASUREMENT
            position === nothing && throw(ArgumentError("Экстремум должен иметь позицию отсчёта"))
        else
            position === nothing || throw(ArgumentError(
                "Неэкстремальное измерение не имеет позиции отсчёта",
            ))
        end
        new(kind, Float64(value), position)
    end
end

struct SignalMeasurementUnits
    value::String
    time::String

    function SignalMeasurementUnits(value::AbstractString, time::AbstractString)
        isempty(value) && throw(ArgumentError("Единица значения измерения не может быть пустой"))
        isempty(time) && throw(ArgumentError("Единица времени измерения не может быть пустой"))
        new(String(value), String(time))
    end
end

struct SignalMeasurementsSnapshot
    state_revision::Int
    signal_name::Union{Nothing,String}
    ordinate::Union{Nothing,SignalMeasurementOrdinate}
    units::SignalMeasurementUnits
    items::Tuple{Vararg{SignalMeasurementItem}}

    function SignalMeasurementsSnapshot(
        state_revision::Int,
        signal_name::Union{Nothing,AbstractString},
        ordinate::Union{Nothing,SignalMeasurementOrdinate},
        units::SignalMeasurementUnits,
        items::Tuple{Vararg{SignalMeasurementItem}},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия snapshot не может быть отрицательной"))
        signal_name === nothing || isempty(signal_name) && throw(ArgumentError("Имя сигнала snapshot не может быть пустым"))
        (signal_name === nothing) == (ordinate === nothing) || throw(ArgumentError(
            "Имя сигнала и ordinate measurements snapshot должны одновременно иметь значение или быть null",
        ))
        kinds = map(item -> item.kind, items)
        if signal_name === nothing
            isempty(items) || throw(ArgumentError("Пустой measurements snapshot не может содержать items"))
        else
            canonical_kinds = SignalMeasurementSelection(kinds).kinds
            kinds == canonical_kinds || throw(ArgumentError(
                "Измерения snapshot должны идти в каноническом порядке",
            ))
        end
        new(state_revision, signal_name === nothing ? nothing : String(signal_name), ordinate, units, items)
    end
end

"""Domain service that derives raw-sample measurements through a typed ROI collaborator."""
struct SignalMeasurementsService
    roi_service::SignalTimeRoiService
end

SignalMeasurementsService() = SignalMeasurementsService(SignalTimeRoiService())

signal_measurement_ordinate_name(ordinate::SignalMeasurementOrdinate)::String =
    SIGNAL_MEASUREMENT_ORDINATE_NAMES[ordinate]
signal_measurement_ordinate_name(::Nothing) = nothing
signal_measurement_metadata(kind::SignalMeasurementKind) = SIGNAL_MEASUREMENT_ITEM_METADATA[kind]

abstract type AbstractPeaksProvider end

"""Production provider marker. EngeeDSP is resolved only when peaks are enabled."""
struct EngeeDSPPeaksProvider <: AbstractPeaksProvider end

struct SignalPeaksCapabilityError <: Exception
    message::String
end

Base.showerror(io::IO, err::SignalPeaksCapabilityError) = print(io, err.message)

struct SignalPeaksQuery
    state_revision::Int
    display_id::String
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    values::Tuple{Vararg{Float64}}
    sample_rate_hz::Float64
    sample_offset::Int

    function SignalPeaksQuery(
        state_revision::Int,
        display_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_rate_hz::Real,
        sample_offset::Int,
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks query не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks query не может быть пустым"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks query не может быть пустым"))
        length(values) >= 3 || throw(ArgumentError("Для поиска пиков нужно не менее трёх отсчётов"))
        peak_values = Float64.(values)
        all(isfinite, peak_values) || throw(ArgumentError("Отсчёты peaks query должны быть конечными"))
        isfinite(sample_rate_hz) && sample_rate_hz > 0 || throw(ArgumentError(
            "Частота дискретизации peaks query должна быть положительной и конечной",
        ))
        sample_offset >= 0 || throw(ArgumentError(
            "Абсолютное смещение peaks query не может быть отрицательным",
        ))
        new(
            state_revision,
            String(display_id),
            String(signal_name),
            ordinate,
            Tuple(peak_values),
            Float64(sample_rate_hz),
            sample_offset,
        )
    end
end

SignalPeaksQuery(
    state_revision::Int,
    display_id::AbstractString,
    signal_name::AbstractString,
    ordinate::SignalMeasurementOrdinate,
    values::AbstractVector{<:Real},
    sample_rate_hz::Real,
) = SignalPeaksQuery(
    state_revision,
    display_id,
    signal_name,
    ordinate,
    values,
    sample_rate_hz,
    0,
)

struct SignalPeaksProviderResult
    peak_values::Tuple{Vararg{Float64}}
    locations_1based::Tuple{Vararg{Int}}
    widths_samples::Tuple{Vararg{Float64}}
    prominences::Tuple{Vararg{Float64}}

    function SignalPeaksProviderResult(
        peak_values::AbstractVector{<:Real},
        locations_1based::AbstractVector{<:Integer},
        widths_samples::AbstractVector{<:Real},
        prominences::AbstractVector{<:Real},
        sample_count::Int,
    )
        sample_count >= 3 || throw(ArgumentError("Результат peaks требует не менее трёх исходных отсчётов"))
        count = length(peak_values)
        count == length(locations_1based) == length(widths_samples) == length(prominences) || throw(
            DimensionMismatch("Массивы Ypk, Xpk, Wpk и Ppk должны иметь одинаковую длину"),
        )
        values = Float64.(peak_values)
        locations = Int.(locations_1based)
        widths = Float64.(widths_samples)
        peak_prominences = Float64.(prominences)
        all(isfinite, values) || throw(ArgumentError("Значения Ypk должны быть конечными"))
        all(location -> 1 <= location <= sample_count, locations) || throw(ArgumentError(
            "Индексы Xpk должны находиться внутри исходного сигнала",
        ))
        issorted(locations) && allunique(locations) || throw(ArgumentError(
            "Индексы Xpk должны быть уникальными и следовать в порядке появления",
        ))
        all(value -> isfinite(value) && value >= 0, widths) || throw(ArgumentError(
            "Значения Wpk должны быть неотрицательными и конечными",
        ))
        all(value -> isfinite(value) && value >= 0, peak_prominences) || throw(ArgumentError(
            "Значения Ppk должны быть неотрицательными и конечными",
        ))
        new(Tuple(values), Tuple(locations), Tuple(widths), Tuple(peak_prominences))
    end
end

struct SignalPeakItem
    id::String
    value::Float64
    sample_index::Int
    time_s::Float64
    width_samples::Float64
    prominence::Float64

    function SignalPeakItem(
        value::Real,
        sample_index::Int,
        time_s::Real,
        width_samples::Real,
        prominence::Real,
    )
        isfinite(value) || throw(ArgumentError("Значение пика должно быть конечным"))
        sample_index >= 0 || throw(ArgumentError("Индекс пика не может быть отрицательным"))
        isfinite(time_s) && time_s >= 0 || throw(ArgumentError("Время пика должно быть неотрицательным и конечным"))
        isfinite(width_samples) && width_samples >= 0 || throw(ArgumentError("Ширина пика должна быть неотрицательной и конечной"))
        isfinite(prominence) && prominence >= 0 || throw(ArgumentError("Высота выступа пика должна быть неотрицательной и конечной"))
        new(
            "peak-$sample_index",
            Float64(value),
            sample_index,
            Float64(time_s),
            Float64(width_samples),
            Float64(prominence),
        )
    end
end

struct SignalPeaksUnits
    value::String
    time::String
    width::String
    prominence::String

    function SignalPeaksUnits(
        value::AbstractString,
        time::AbstractString,
        width::AbstractString,
        prominence::AbstractString,
    )
        (value, time, width, prominence) == ("1", "s", "samples", "1") || throw(ArgumentError(
            "Peaks P0 использует фиксированные единицы value/time/width/prominence",
        ))
        new(String(value), String(time), String(width), String(prominence))
    end
end

SignalPeaksUnits() = SignalPeaksUnits("1", "s", "samples", "1")

struct SignalPeaksSnapshot
    enabled::Bool
    state_revision::Int
    display_id::String
    signal_name::Union{Nothing,String}
    ordinate::Union{Nothing,SignalMeasurementOrdinate}
    units::SignalPeaksUnits
    items::Tuple{Vararg{SignalPeakItem}}

    function SignalPeaksSnapshot(
        enabled::Bool,
        state_revision::Int,
        display_id::AbstractString,
        signal_name::Union{Nothing,AbstractString},
        ordinate::Union{Nothing,SignalMeasurementOrdinate},
        units::SignalPeaksUnits,
        items::AbstractVector{SignalPeakItem},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks snapshot не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks snapshot не может быть пустым"))
        signal_name === nothing || isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks snapshot не может быть пустым"))
        (signal_name === nothing) == (ordinate === nothing) || throw(ArgumentError(
            "Имя сигнала и ordinate peaks snapshot должны одновременно иметь значение или быть null",
        ))
        peak_items = collect(items)
        !enabled && !isempty(peak_items) && throw(ArgumentError("Выключенный peaks snapshot не может содержать items"))
        signal_name === nothing && enabled && throw(ArgumentError("Пустой peaks snapshot не может быть enabled"))
        signal_name === nothing && !isempty(peak_items) && throw(ArgumentError("Пустой peaks snapshot не может содержать items"))
        indices = [item.sample_index for item in peak_items]
        issorted(indices) && allunique(indices) || throw(ArgumentError(
            "Peaks items должны быть уникальными и следовать в порядке появления",
        ))
        new(
            enabled,
            state_revision,
            String(display_id),
            signal_name === nothing ? nothing : String(signal_name),
            ordinate,
            units,
            Tuple(peak_items),
        )
    end
end

struct SignalPeaksService{P<:AbstractPeaksProvider}
    provider::P
    ordinate_service::SignalMeasurementsService
end

SignalPeaksService(provider::P) where {P<:AbstractPeaksProvider} =
    SignalPeaksService{P}(provider, SignalMeasurementsService())

struct GlobalSignalSelection
    signal_name::String

    function GlobalSignalSelection(signal_name::AbstractString)
        isempty(signal_name) && throw(ArgumentError("Имя глобально выбранного сигнала не может быть пустым"))
        new(String(signal_name))
    end
end

struct SignalDisplayMembership
    signal_names::Tuple{Vararg{String}}

    function SignalDisplayMembership(signal_names::AbstractVector{<:AbstractString})
        names = String.(signal_names)
        all(name -> !isempty(name), names) || throw(ArgumentError("Имена membership не могут быть пустыми"))
        allunique(names) || throw(ArgumentError("Имена membership не должны повторяться"))
        new(Tuple(names))
    end
end

abstract type AbstractSignalAnalysisSource end

struct NoSignalAnalysisSource <: AbstractSignalAnalysisSource end

struct SignalAnalysisSource <: AbstractSignalAnalysisSource
    signal_name::String

    function SignalAnalysisSource(signal_name::AbstractString)
        isempty(signal_name) && throw(ArgumentError("Имя analysis source не может быть пустым"))
        new(String(signal_name))
    end
end

signal_analysis_name(::NoSignalAnalysisSource) = nothing
signal_analysis_name(source::SignalAnalysisSource) = source.signal_name

function signal_analysis_source(signal_name::Union{Nothing,AbstractString})::AbstractSignalAnalysisSource
    signal_name === nothing ? NoSignalAnalysisSource() : SignalAnalysisSource(signal_name)
end

mutable struct SignalAnalyserViewState
    state_revision::Int
    active_plot::SignalAnalyserPlot
    selected_signal::Union{Nothing,String}
end

mutable struct SignalAnalyserDisplayState
    id::String
    name::String
    active_plot::SignalAnalyserPlot
    membership::SignalDisplayMembership
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource}
    time_limits::Union{Nothing,SignalTimeLimits}
    measurement_selection::SignalMeasurementSelection
    peaks_enabled::Bool

    function SignalAnalyserDisplayState(
        id::AbstractString,
        name::AbstractString,
        active_plot::SignalAnalyserPlot,
        membership::SignalDisplayMembership,
        analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
        time_limits::Union{Nothing,SignalTimeLimits},
        measurement_selection::SignalMeasurementSelection,
        peaks_enabled::Bool,
    )
        analysis_name = signal_analysis_name(analysis_source)
        isempty(membership.signal_names) == (analysis_name === nothing) || throw(ArgumentError(
            "Analysis source должен отсутствовать только у пустого Display",
        ))
        analysis_name === nothing || analysis_name in membership.signal_names || throw(ArgumentError(
            "Analysis source должен входить в membership Display",
        ))
        (analysis_name === nothing) == (time_limits === nothing) || throw(ArgumentError(
            "Time Limits должны отсутствовать только у пустого Display",
        ))
        peaks_enabled && active_plot != TIME_PLOT && throw(ArgumentError(
            "Поиск пиков доступен только для Time plot",
        ))
        peaks_enabled && analysis_name === nothing && throw(ArgumentError(
            "Поиск пиков требует analysis source",
        ))
        new(
            String(id),
            String(name),
            active_plot,
            membership,
            analysis_source,
            time_limits,
            measurement_selection,
            peaks_enabled,
        )
    end
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    membership::SignalDisplayMembership,
    analysis_source::Union{NoSignalAnalysisSource,SignalAnalysisSource},
    time_limits::Union{Nothing,SignalTimeLimits},
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        membership,
        analysis_source,
        time_limits,
        SignalMeasurementSelection(),
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    measurement_selection::SignalMeasurementSelection,
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        SignalDisplayMembership(visible_signals),
        signal_analysis_source(selected_signal),
        time_limits,
        measurement_selection,
        peaks_enabled,
    )
end

function SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::Union{Nothing,AbstractString},
    visible_signals::AbstractVector{<:AbstractString},
    time_limits::Union{Nothing,SignalTimeLimits},
    peaks_enabled::Bool,
)
    SignalAnalyserDisplayState(
        id,
        name,
        active_plot,
        selected_signal,
        visible_signals,
        time_limits,
        SignalMeasurementSelection(),
        peaks_enabled,
    )
end

signal_analyser_display_members(display::SignalAnalyserDisplayState)::Vector{String} =
    collect(display.membership.signal_names)
signal_analyser_display_analysis_name(display::SignalAnalyserDisplayState) =
    signal_analysis_name(display.analysis_source)

function signal_analyser_publish_display_state!(
    display::SignalAnalyserDisplayState,
    prospective::SignalAnalyserDisplayState,
)
    display.id == prospective.id || throw(ArgumentError("Нельзя опубликовать состояние другого Display"))
    display.name = prospective.name
    display.active_plot = prospective.active_plot
    display.membership = prospective.membership
    display.analysis_source = prospective.analysis_source
    display.time_limits = prospective.time_limits
    display.measurement_selection = prospective.measurement_selection
    display.peaks_enabled = prospective.peaks_enabled
    nothing
end

mutable struct SignalAnalyserState{P<:AbstractPeaksProvider}
    signals::Vector{AnalysedSignal}
    view::SignalAnalyserViewState
    row_selection::GlobalSignalSelection
    displays::Vector{SignalAnalyserDisplayState}
    active_display_id::String
    next_display_number::Int
    plot_cache::Dict{String,Dict{String,Any}}
    measurements_service::SignalMeasurementsService
    peaks_service::SignalPeaksService{P}
    lock::ReentrantLock
end

function SignalAnalyserState(
    signals::Vector{AnalysedSignal},
    view::SignalAnalyserViewState,
    plot_cache::Dict{String,Dict{String,Any}},
    lock::ReentrantLock,
    ;
    peaks_provider::AbstractPeaksProvider = EngeeDSPPeaksProvider(),
)
    isempty(signals) && throw(ArgumentError("Signal Analyser требует хотя бы один сигнал в global inventory"))
    known_names = [signal.name for signal in signals]
    visible_signals = [signal.name for signal in signals if signal.visible]
    row_selected_signal = view.selected_signal === nothing ? first(known_names) : view.selected_signal
    row_selected_signal in known_names || throw(ArgumentError("Глобально выбранный сигнал отсутствует в inventory"))
    analysis_name = if view.selected_signal !== nothing && view.selected_signal in visible_signals
        view.selected_signal
    elseif isempty(visible_signals)
        nothing
    else
        first(visible_signals)
    end
    display = SignalAnalyserDisplayState(
        "display-1",
        "Display 1",
        view.active_plot,
        analysis_name,
        visible_signals,
        analysis_name === nothing ? nothing : SignalTimeLimits(
            0.0,
            signal_duration_s(signals[findfirst(signal -> signal.name == analysis_name, signals)::Int]),
        ),
        false,
    )
    view.selected_signal = analysis_name
    SignalAnalyserState(
        signals,
        view,
        GlobalSignalSelection(row_selected_signal),
        SignalAnalyserDisplayState[display],
        display.id,
        2,
        plot_cache,
        SignalMeasurementsService(),
        SignalPeaksService(peaks_provider),
        lock,
    )
end

struct SignalAnalyserValidationError <: Exception
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::SignalAnalyserValidationError) = print(io, err.message)

struct SignalAnalyserStaleStateError <: Exception
    expected_revision::Int
    actual_revision::Int
end

function Base.showerror(io::IO, err::SignalAnalyserStaleStateError)
    print(io, "Состояние устарело: ожидалась ревизия $(err.expected_revision), текущая ревизия $(err.actual_revision)")
end

signal_analyser_plot_name(plot::SignalAnalyserPlot)::String = SIGNAL_ANALYSER_PLOT_NAMES[plot]
signal_data_type(signal::AnalysedSignal)::String = signal.is_complex ? "Комплексный" : "Вещественный"

function signal_analyser_plot(value::AbstractString)::SignalAnalyserPlot
    haskey(SIGNAL_ANALYSER_PLOTS_BY_NAME, value) || throw(ArgumentError("Неизвестный тип графика: $value"))
    SIGNAL_ANALYSER_PLOTS_BY_NAME[String(value)]
end

function signal_duration_s(signal::AnalysedSignal)::Float64
    isempty(signal.values) && return 0.0
    (length(signal.values) - 1) / signal.sample_rate_hz
end

function signal_time_values(signal::AnalysedSignal)::Vector{Float64}
    collect(0:(length(signal.values) - 1)) ./ signal.sample_rate_hz
end

function default_signal_catalog()::Vector{AnalysedSignal}
    sample_rate_hz = 2048.0
    sample_count = 512
    time = collect(0:(sample_count - 1)) ./ sample_rate_hz

    harmonic = @. 0.82 * sin(2pi * 180.0 * time) + 0.28 * sin(2pi * 420.0 * time + 0.35)
    chirp_phase = @. 2pi * (90.0 * time + 0.5 * 1100.0 * time^2)
    complex_chirp = @. cis(chirp_phase) + 0.22 * cis(2pi * 510.0 * time)

    AnalysedSignal[
        AnalysedSignal(
            "Гармонический сигнал",
            "#2563eb",
            sample_rate_hz,
            ComplexF64.(harmonic),
            false,
            true,
        ),
        AnalysedSignal(
            "Комплексный ЛЧМ-сигнал",
            "#dc2626",
            sample_rate_hz,
            ComplexF64.(complex_chirp),
            true,
            true,
        ),
    ]
end

function default_signal_analyser_state(;
    peaks_provider::AbstractPeaksProvider = EngeeDSPPeaksProvider(),
)::SignalAnalyserState
    signals = default_signal_catalog()
    SignalAnalyserState(
        signals,
        SignalAnalyserViewState(0, TIME_PLOT, first(signals).name),
        Dict{String,Dict{String,Any}}(),
        ReentrantLock(),
        peaks_provider = peaks_provider,
    )
end

function signal_by_name(state::SignalAnalyserState, name::AbstractString)::AnalysedSignal
    index = findfirst(signal -> signal.name == name, state.signals)
    index === nothing && throw(ArgumentError("Сигнал не найден: $name"))
    state.signals[index]
end

function signal_analyser_publish_row_selection!(
    state::SignalAnalyserState,
    selection::GlobalSignalSelection,
)
    any(signal -> signal.name == selection.signal_name, state.signals) || throw(ArgumentError(
        "Глобально выбранный сигнал отсутствует в inventory",
    ))
    state.row_selection = selection
    nothing
end
