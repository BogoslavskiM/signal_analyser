const SIGNAL_ANALYSER_MAX_LINE_POINTS = 1024
const SIGNAL_ANALYSER_MAX_HEATMAP_COLUMNS = 160
const SIGNAL_ANALYSER_MAX_HEATMAP_ROWS = 160

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

function signal_analyser_power_db_matrix(values, label::AbstractString)::Matrix{Float64}
    powers = Float64.(abs.(Matrix(collect(values))))
    isempty(powers) && throw(ArgumentError("EngeeDSP вернул пустую матрицу: $label"))
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

function signal_analyser_spectrum_plot(signal::AnalysedSignal)::Dict{String,Any}
    # A deliberately coarser resolution than the full-record resolution makes
    # pspectrum average overlapping segments, i.e. use its Welch path.
    frequency_resolution_hz = 8 * signal.sample_rate_hz / length(signal.values)
    power, frequencies, _ = signal_analyser_pspectrum(
        signal.values,
        signal_time_values(signal),
        "power",
        "FrequencyResolution",
        frequency_resolution_hz,
        "TwoSided",
        true,
    )
    x = signal_analyser_finite_vector(frequencies, "частоты спектра")
    y = signal_analyser_power_db(power, "мощность спектра")
    x, y = signal_analyser_bounded_line(x, y)
    Dict{String,Any}(
        "type" => "line",
        "x" => x,
        "y" => y,
        "x_label" => "Частота, Гц",
        "y_label" => "Мощность, дБ",
        "method" => "welch",
    )
end

function signal_analyser_spectrogram_plot(signal::AnalysedSignal)::Dict{String,Any}
    power, frequencies, times = signal_analyser_pspectrum(
        signal.values,
        signal_time_values(signal),
        "spectrogram",
        "TwoSided",
        true,
    )
    x = signal_analyser_finite_vector(times, "время спектрограммы")
    y = signal_analyser_finite_vector(frequencies, "частоты спектрограммы")
    oriented_power = signal_analyser_oriented_matrix(power, length(y), length(x), "Спектрограмма")
    z = signal_analyser_power_db_matrix(oriented_power, "мощность спектрограммы")
    x, y, z = signal_analyser_bounded_heatmap(x, y, z)
    Dict{String,Any}(
        "type" => "heatmap",
        "x" => x,
        "y" => y,
        "z" => z,
        "x_label" => "Время, с",
        "y_label" => "Частота, Гц",
        "color_label" => "Мощность, дБ",
    )
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
