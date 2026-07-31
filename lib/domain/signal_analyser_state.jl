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

@enum SignalMeasurementOrdinate begin
    REAL_ORDINATE
    MAGNITUDE_ORDINATE
end

@enum SignalMeasurementKind begin
    MINIMUM_MEASUREMENT
    MAXIMUM_MEASUREMENT
    MEAN_MEASUREMENT
end

const SIGNAL_MEASUREMENT_ORDINATE_NAMES = Dict(
    REAL_ORDINATE => "real",
    MAGNITUDE_ORDINATE => "magnitude",
)

const SIGNAL_MEASUREMENT_ITEM_METADATA = Dict(
    MINIMUM_MEASUREMENT => (id = "minimum", label = "Минимум"),
    MAXIMUM_MEASUREMENT => (id = "maximum", label = "Максимум"),
    MEAN_MEASUREMENT => (id = "mean", label = "Среднее"),
)

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
        if kind == MEAN_MEASUREMENT
            position === nothing || throw(ArgumentError("Среднее значение не имеет позиции отсчёта"))
        else
            position === nothing && throw(ArgumentError("Экстремум должен иметь позицию отсчёта"))
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
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    units::SignalMeasurementUnits
    items::NTuple{3,SignalMeasurementItem}

    function SignalMeasurementsSnapshot(
        state_revision::Int,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        units::SignalMeasurementUnits,
        items::NTuple{3,SignalMeasurementItem},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия snapshot не может быть отрицательной"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала snapshot не может быть пустым"))
        kinds = map(item -> item.kind, items)
        kinds == (MINIMUM_MEASUREMENT, MAXIMUM_MEASUREMENT, MEAN_MEASUREMENT) || throw(ArgumentError(
            "Измерения snapshot должны идти в порядке minimum, maximum, mean",
        ))
        new(state_revision, String(signal_name), ordinate, units, items)
    end
end

"""Stateless domain service that derives raw-sample measurements."""
struct SignalMeasurementsService end

signal_measurement_ordinate_name(ordinate::SignalMeasurementOrdinate)::String =
    SIGNAL_MEASUREMENT_ORDINATE_NAMES[ordinate]
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

    function SignalPeaksQuery(
        state_revision::Int,
        display_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        values::AbstractVector{<:Real},
        sample_rate_hz::Real,
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
        new(
            state_revision,
            String(display_id),
            String(signal_name),
            ordinate,
            Tuple(peak_values),
            Float64(sample_rate_hz),
        )
    end
end

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
    signal_name::String
    ordinate::SignalMeasurementOrdinate
    units::SignalPeaksUnits
    items::Tuple{Vararg{SignalPeakItem}}

    function SignalPeaksSnapshot(
        enabled::Bool,
        state_revision::Int,
        display_id::AbstractString,
        signal_name::AbstractString,
        ordinate::SignalMeasurementOrdinate,
        units::SignalPeaksUnits,
        items::AbstractVector{SignalPeakItem},
    )
        state_revision >= 0 || throw(ArgumentError("Ревизия peaks snapshot не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Идентификатор Display peaks snapshot не может быть пустым"))
        isempty(signal_name) && throw(ArgumentError("Имя сигнала peaks snapshot не может быть пустым"))
        peak_items = collect(items)
        !enabled && !isempty(peak_items) && throw(ArgumentError("Выключенный peaks snapshot не может содержать items"))
        indices = [item.sample_index for item in peak_items]
        issorted(indices) && allunique(indices) || throw(ArgumentError(
            "Peaks items должны быть уникальными и следовать в порядке появления",
        ))
        new(enabled, state_revision, String(display_id), String(signal_name), ordinate, units, Tuple(peak_items))
    end
end

struct SignalPeaksService{P<:AbstractPeaksProvider}
    provider::P
    ordinate_service::SignalMeasurementsService
end

SignalPeaksService(provider::P) where {P<:AbstractPeaksProvider} =
    SignalPeaksService{P}(provider, SignalMeasurementsService())

mutable struct SignalAnalyserViewState
    state_revision::Int
    active_plot::SignalAnalyserPlot
    selected_signal::String
end

mutable struct SignalAnalyserDisplayState
    id::String
    name::String
    active_plot::SignalAnalyserPlot
    selected_signal::String
    visible_signals::Vector{String}
    peaks_enabled::Bool

    function SignalAnalyserDisplayState(
        id::AbstractString,
        name::AbstractString,
        active_plot::SignalAnalyserPlot,
        selected_signal::AbstractString,
        visible_signals::AbstractVector{<:AbstractString},
        peaks_enabled::Bool,
    )
        peaks_enabled && active_plot != TIME_PLOT && throw(ArgumentError(
            "Поиск пиков доступен только для Time plot",
        ))
        new(
            String(id),
            String(name),
            active_plot,
            String(selected_signal),
            String.(visible_signals),
            peaks_enabled,
        )
    end
end

SignalAnalyserDisplayState(
    id::AbstractString,
    name::AbstractString,
    active_plot::SignalAnalyserPlot,
    selected_signal::AbstractString,
    visible_signals::AbstractVector{<:AbstractString},
) = SignalAnalyserDisplayState(id, name, active_plot, selected_signal, visible_signals, false)

function signal_analyser_set_display_view!(
    display::SignalAnalyserDisplayState,
    active_plot::SignalAnalyserPlot,
    selected_signal::AbstractString,
    visible_signals::AbstractVector{<:AbstractString},
    peaks_enabled::Bool,
)
    peaks_enabled && active_plot != TIME_PLOT && throw(ArgumentError(
        "Поиск пиков доступен только для Time plot",
    ))
    display.active_plot = active_plot
    display.selected_signal = String(selected_signal)
    display.visible_signals = String.(visible_signals)
    display.peaks_enabled = peaks_enabled
    nothing
end

mutable struct SignalAnalyserState{P<:AbstractPeaksProvider}
    signals::Vector{AnalysedSignal}
    view::SignalAnalyserViewState
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
    visible_signals = [signal.name for signal in signals if signal.visible]
    display = SignalAnalyserDisplayState(
        "display-1",
        "Display 1",
        view.active_plot,
        view.selected_signal,
        visible_signals,
    )
    SignalAnalyserState(
        signals,
        view,
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
