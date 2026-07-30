using Test

"""Return false with a real test failure when the required EngeeDSP runtime is absent."""
function load_engee_dsp()
    try
        @eval import EngeeDSP
        return EngeeDSP
    catch err
        @test false
        @error "EngeeDSP is required for the Signal Analyser contract suite" exception = (err, catch_backtrace())
        return nothing
    end
end

finite_values(values) = all(value -> isfinite(real(value)) && isfinite(imag(value)), vec(collect(values)))

function assert_frequency_axis(frequencies)
    values = Float64.(vec(collect(frequencies)))
    @test !isempty(values)
    @test all(isfinite, values)
    @test minimum(values) < 0.0
    @test maximum(values) > 0.0
end

function assert_pspectrum_matrix(values, row_axis, column_axis)
    matrix = Matrix(collect(values))
    rows = length(vec(collect(row_axis)))
    columns = length(vec(collect(column_axis)))
    @test size(matrix) == (rows, columns) || size(matrix) == (columns, rows)
    @test finite_values(matrix)
end

@testset "EngeeDSP pspectrum Signal Analyser contract" begin
    dsp = load_engee_dsp()
    dsp === nothing && return

    fs_hz = 256.0
    sample_count = 256
    time = collect(0:(sample_count - 1)) ./ fs_hz
    # A deterministic complex two-tone signal requires the TwoSided path.
    signal = ComplexF64.(cis.(2pi .* 32.0 .* time) .+ 0.25 .* cis.(2pi .* 72.0 .* time))
    pspectrum = dsp.Functions.pspectrum

    @testset "power / Welch" begin
        power, frequencies, metadata = pspectrum(
            signal,
            time,
            "power",
            "FrequencyResolution",
            8.0,
            "TwoSided",
            true,
        )
        @test !isnothing(metadata)
        @test !isempty(vec(collect(power)))
        @test finite_values(power)
        assert_frequency_axis(frequencies)
    end

    @testset "spectrogram" begin
        power, frequencies, times = pspectrum(signal, time, "spectrogram", "TwoSided", true)
        @test !isempty(vec(collect(times)))
        @test all(isfinite, vec(collect(times)))
        assert_frequency_axis(frequencies)
        assert_pspectrum_matrix(power, frequencies, times)
    end

    @testset "persistence" begin
        occurrence, frequencies, power_levels = pspectrum(signal, time, "persistence", "TwoSided", true)
        @test !isempty(vec(collect(power_levels)))
        @test all(isfinite, vec(collect(power_levels)))
        assert_frequency_axis(frequencies)
        assert_pspectrum_matrix(occurrence, power_levels, frequencies)
        @test all(value -> 0.0 <= value <= 100.0, vec(Float64.(collect(occurrence))))
    end
end
