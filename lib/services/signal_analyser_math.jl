const SIGNAL_ANALYSER_MAX_LINE_POINTS = 1024
const SIGNAL_ANALYSER_MAX_HEATMAP_COLUMNS = 160
const SIGNAL_ANALYSER_MAX_HEATMAP_ROWS = 160

"""Finite full-raw Spectrogram dB extent; equality is valid for constant power."""
struct SignalSpectrogramPowerExtent
    min_db::Float64
    max_db::Float64

    function SignalSpectrogramPowerExtent(min_db::Real, max_db::Real)
        minimum_power = Float64(min_db)
        maximum_power = Float64(max_db)
        isfinite(minimum_power) && isfinite(maximum_power) || throw(ArgumentError(
            "Effective Power Limits Spectrogram должны быть конечными числами",
        ))
        minimum_power <= maximum_power || throw(ArgumentError(
            "Минимальная effective Power Limit Spectrogram не может превышать максимальную",
        ))
        new(
            minimum_power == 0.0 ? 0.0 : minimum_power,
            maximum_power == 0.0 ? 0.0 : maximum_power,
        )
    end
end

"""Transient dB projection and extrema derived from every full-raw power cell."""
struct SignalSpectrogramPowerProjection
    values_db::Matrix{Float64}
    finite_extent::Union{Nothing,SignalSpectrogramPowerExtent}
end

function SignalSpectrogramPowerProjection(data::SignalSpectrogramData)
    values_db = Matrix{Float64}(undef, size(data.power))
    minimum_power_db = Inf
    maximum_power_db = -Inf
    has_finite_power = false
    for index in eachindex(data.power)
        power_db = 10 * log10(data.power[index])
        values_db[index] = power_db
        if isfinite(power_db)
            minimum_power_db = min(minimum_power_db, power_db)
            maximum_power_db = max(maximum_power_db, power_db)
            has_finite_power = true
        end
    end
    extent = has_finite_power ?
        SignalSpectrogramPowerExtent(minimum_power_db, maximum_power_db) : nothing
    SignalSpectrogramPowerProjection(values_db, extent)
end

"""Typed requested/effective Spectrogram colormap resolution."""
struct SignalSpectrogramPowerLimitsResolution{L<:AbstractSignalSpectrogramPowerLimits}
    requested::L
    effective::Union{Nothing,SignalSpectrogramPowerExtent}
end

SignalSpectrogramPowerLimitsResolution(
    limits::AutomaticSignalSpectrogramPowerLimits,
    projection::SignalSpectrogramPowerProjection,
) = SignalSpectrogramPowerLimitsResolution(limits, projection.finite_extent)

SignalSpectrogramPowerLimitsResolution(
    limits::ExplicitSignalSpectrogramPowerLimits,
    ::SignalSpectrogramPowerProjection,
) = SignalSpectrogramPowerLimitsResolution(
    limits,
    SignalSpectrogramPowerExtent(limits.min_db, limits.max_db),
)

function signal_analyser_engee_dsp_module()
    try
        Base.require(@__MODULE__, :EngeeDSP)
    catch err
        throw(ArgumentError(
            "Для расчёта спектра, спектрограммы и персистентности требуется пакет EngeeDSP. " *
            "Исходная ошибка: $(sprint(showerror, err))",
        ))
    end
end

function signal_analyser_pspectrum(args...)
    engee_dsp = signal_analyser_engee_dsp_module()
    functions_module = getproperty(engee_dsp, :Functions)
    pspectrum = getproperty(functions_module, :pspectrum)
    pspectrum(args...)
end

function signal_analyser_finite_vector(values, label::AbstractString)::Vector{Float64}
    result = Float64.(vec(collect(values)))
    isempty(result) && throw(ArgumentError("EngeeDSP вернул пустой массив: $label"))
    all(isfinite, result) || throw(ArgumentError("EngeeDSP вернул нечисловые значения: $label"))
    result
end

function signal_analyser_power_db(values, label::AbstractString)::Vector{Float64}
    powers = Float64.(abs.(vec(collect(values))))
    isempty(powers) && throw(ArgumentError("EngeeDSP вернул пустой массив: $label"))
    all(isfinite, powers) || throw(ArgumentError("EngeeDSP вернул нечисловые значения: $label"))
    Float64.(10 .* log10.(max.(powers, eps(Float64))))
end

function signal_analyser_oriented_matrix(values, row_count::Int, column_count::Int, label::AbstractString)
    matrix = Matrix(collect(values))
    if size(matrix) == (row_count, column_count)
        return matrix
    end
    if size(matrix) == (column_count, row_count)
        return permutedims(matrix)
    end
    throw(DimensionMismatch(
        "$label имеет размер $(size(matrix)), ожидался ($row_count, $column_count)",
    ))
end

function signal_analyser_bounded_indices(length_value::Int, limit::Int)::Vector{Int}
    length_value > 0 || return Int[]
    length_value <= limit && return collect(1:length_value)
    unique(round.(Int, range(1, length_value; length = limit)))
end

function signal_analyser_bounded_line(x::Vector{Float64}, y::Vector{Float64})
    length(x) == length(y) || throw(DimensionMismatch("Оси линейного графика имеют разную длину"))
    indices = signal_analyser_bounded_indices(length(x), SIGNAL_ANALYSER_MAX_LINE_POINTS)
    x[indices], y[indices]
end

function signal_analyser_bounded_heatmap(
    x::Vector{Float64},
    y::Vector{Float64},
    z::Matrix{Float64},
)
    size(z) == (length(y), length(x)) || throw(DimensionMismatch(
        "Матрица heatmap имеет размер $(size(z)), ожидался ($(length(y)), $(length(x)))",
    ))
    x_indices = signal_analyser_bounded_indices(length(x), SIGNAL_ANALYSER_MAX_HEATMAP_COLUMNS)
    y_indices = signal_analyser_bounded_indices(length(y), SIGNAL_ANALYSER_MAX_HEATMAP_ROWS)
    bounded_z = [
        [z[row_index, column_index] for column_index in x_indices]
        for row_index in y_indices
    ]
    x[x_indices], y[y_indices], bounded_z
end

function signal_analyser_time_plot(signal::AnalysedSignal)::Dict{String,Any}
    x = signal_time_values(signal)
    y = signal.is_complex ? Float64.(abs.(signal.values)) : Float64.(real.(signal.values))
    x, y = signal_analyser_bounded_line(x, y)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Время, с",
        "y_label" => "Амплитуда",
    )
end

function signal_analyser_spectrum_plot(
    data::SignalSpectrumData,
    settings::SignalSpectrumSettings,
)::Dict{String,Any}
    x = Float64[data.frequencies_hz...]
    power = Float64[data.power...]
    y = if settings.scale == DB_SPECTRUM_SCALE
        Float64.(10 .* log10.(power))
    else
        power
    end
    x, y = signal_analyser_bounded_line(x, y)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Частота, Гц",
        "y_label" => settings.scale == DB_SPECTRUM_SCALE ? "Мощность, дБ" : "Мощность",
        "method" => "pspectrum",
        "frequency_limits" => signal_spectrum_frequency_limits_metadata(settings, data),
    )
end

function signal_analyser_spectrum_plot(signal::AnalysedSignal)::Dict{String,Any}
    settings = SignalSpectrumSettings()
    service = SignalSpectrumService()
    data = signal_spectrum_data(
        service,
        signal,
        signal_full_time_limits(SignalMeasurementsService(), signal),
        settings,
    )
    signal_analyser_spectrum_plot(data, settings)
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    frequency_limits_metadata::Dict{String,Any},
    frequency_scale_metadata::Dict{String,Any},
    power_limits::AbstractSignalSpectrogramPowerLimits,
)::Dict{String,Any}
    power_projection = SignalSpectrogramPowerProjection(data)
    power_limits_resolution = SignalSpectrogramPowerLimitsResolution(
        power_limits,
        power_projection,
    )
    x = Float64[data.segment_centers_s...]
    y = Float64[data.frequencies_hz...]
    z = power_projection.values_db
    x, y, z = signal_analyser_bounded_heatmap(x, y, z)
    Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => z,
        "x_label" => "Время, с",
        "y_label" => "Частота, Гц",
        "color_label" => "Мощность, дБ",
        "frequency_limits" => frequency_limits_metadata,
        "frequency_scale" => frequency_scale_metadata,
        "power_limits" => signal_spectrogram_power_limits_metadata(power_limits_resolution),
    )
end


function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    frequency_limits_metadata::Dict{String,Any},
    frequency_scale_metadata::Dict{String,Any},
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        frequency_limits_metadata,
        frequency_scale_metadata,
        AutomaticSignalSpectrogramPowerLimits(),
    )
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        signal_spectrogram_frequency_limits_metadata(settings, data),
        signal_spectrogram_frequency_scale_metadata(settings, data),
        settings.power_limits,
    )
end

function signal_analyser_spectrogram_plot(
    data::SignalSpectrogramData,
    settings::SignalSpectrogramSettings,
    signal::Union{Nothing,AnalysedSignal},
)::Dict{String,Any}
    signal_analyser_spectrogram_plot(
        data,
        signal_spectrogram_frequency_limits_metadata(settings, signal),
        signal_spectrogram_frequency_scale_metadata(settings, signal),
        settings.power_limits,
    )
end

signal_analyser_spectrogram_plot(data::SignalSpectrogramData)::Dict{String,Any} =
    signal_analyser_spectrogram_plot(data, SignalSpectrogramSettings())

function signal_analyser_spectrogram_plot(signal::AnalysedSignal)::Dict{String,Any}
    settings = SignalSpectrogramSettings()
    data = signal_spectrogram_data(SignalSpectrogramService(), signal, settings)
    signal_analyser_spectrogram_plot(data, settings, signal)
end

function signal_analyser_persistence_plot(signal::AnalysedSignal)::Dict{String,Any}
    occurrence, frequencies, power_levels = signal_analyser_pspectrum(
        signal.values,
        signal_time_values(signal),
        "persistence",
        "TwoSided",
        true,
    )
    x = signal_analyser_finite_vector(frequencies, "частоты персистентности")
    linear_power = signal_analyser_finite_vector(power_levels, "уровни мощности персистентности")
    y = Float64.(10 .* log10.(max.(abs.(linear_power), eps(Float64))))
    oriented_occurrence = signal_analyser_oriented_matrix(
        occurrence,
        length(y),
        length(x),
        "Персистентность",
    )
    occurrence_percent = Float64.(oriented_occurrence)
    all(isfinite, occurrence_percent) || throw(ArgumentError(
        "EngeeDSP вернул нечисловые значения: персистентность",
    ))
    all(value -> -1.0e-9 <= value <= 100.0 + 1.0e-9, occurrence_percent) || throw(ArgumentError(
        "EngeeDSP вернул персистентность вне диапазона 0–100 %",
    ))
    occurrence_percent = clamp.(occurrence_percent, 0.0, 100.0)
    x, y, z = signal_analyser_bounded_heatmap(x, y, occurrence_percent)
    Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => z,
        "x_label" => "Частота, Гц",
        "y_label" => "Мощность, дБ",
        "color_label" => "Встречаемость, %",
    )
end

function signal_analyser_plots(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "time" => signal_analyser_time_plot(signal),
        "spectrum" => signal_analyser_spectrum_plot(signal),
        "spectrogram" => signal_analyser_spectrogram_plot(signal),
        "persistence" => signal_analyser_persistence_plot(signal),
    )
end


function signal_analyser_base_plots(signal::AnalysedSignal)::Dict{String,Any}
    Dict{String,Any}(
        "time" => signal_analyser_time_plot(signal),
        "spectrum" => signal_analyser_spectrum_plot(
            SignalSpectrumData(signal.is_complex ? CENTERED_TWO_SIDED_SPECTRUM : ONE_SIDED_SPECTRUM),
            SignalSpectrumSettings(),
        ),
        "spectrogram" => signal_analyser_spectrogram_plot(
            SignalSpectrogramData(signal_spectrum_topology(signal)),
            SignalSpectrogramSettings(),
            signal,
        ),
        "persistence" => signal_analyser_persistence_plot(signal),
    )
end
