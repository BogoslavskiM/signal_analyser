using Test

include("findpeaks_contract_matrix.jl")

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

    @testset "C9 topology, Leakage and short-input boundaries" begin
        real_two = [1.0, -1.0]
        real_time = [0.0, 1.0 / fs_hz]
        for leakage in (0.0, 1.0)
            power, frequencies, _ = pspectrum(
                real_two, real_time, "power", "Leakage", leakage, "TwoSided", false,
            )
            @test !isempty(vec(collect(power)))
            @test all(value -> value >= 0.0, Float64.(vec(collect(frequencies))))
        end
        complex_two = ComplexF64[1.0 + 0.0im, 0.0 + 1.0im]
        power, frequencies, _ = pspectrum(
            complex_two, real_time, "power", "Leakage", 0.5, "TwoSided", true,
        )
        @test !isempty(vec(collect(power)))
        assert_frequency_axis(frequencies)
        @test_throws ArgumentError pspectrum([1.0], [0.0], "power", "Leakage", 0.5, "TwoSided", false)
        @test_throws ArgumentError pspectrum(real_two, real_time, "power", "Leakage", -0.01, "TwoSided", false)
        @test_throws ArgumentError pspectrum(real_two, real_time, "power", "Leakage", 1.01, "TwoSided", false)
    end

    @testset "C10 FrequencyLimits forwards provider grid semantics" begin
        probe_fs_hz = 100.0
        probe_count = 64
        probe_time = collect(0:(probe_count - 1)) ./ probe_fs_hz
        real_signal = sin.(2pi .* 10.0 .* probe_time)
        complex_signal = ComplexF64.(cis.(2pi .* 10.0 .* probe_time))

        real_power, real_frequency, _ = pspectrum(
            real_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", false,
            "FrequencyLimits", [5.0, 20.0],
        )
        @test !isempty(vec(collect(real_power)))
        @test first(vec(Float64.(collect(real_frequency)))) == 5.0
        @test last(vec(Float64.(collect(real_frequency)))) == 20.0
        @test all(value -> 5.0 <= value <= 20.0, vec(Float64.(collect(real_frequency))))

        complex_power, complex_frequency, _ = pspectrum(
            complex_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", true,
            "FrequencyLimits", [-20.0, 15.0],
        )
        @test !isempty(vec(collect(complex_power)))
        @test first(vec(Float64.(collect(complex_frequency)))) == -20.0
        @test last(vec(Float64.(collect(complex_frequency)))) == 15.0
        @test any(value -> value < 0.0, vec(Float64.(collect(complex_frequency))))
        @test any(value -> value > 0.0, vec(Float64.(collect(complex_frequency))))

        clipped_power, clipped_frequency, _ = pspectrum(
            real_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", false,
            "FrequencyLimits", [40.0, 60.0],
        )
        @test !isempty(vec(collect(clipped_power)))
        @test first(vec(Float64.(collect(clipped_frequency)))) == 40.0
        @test last(vec(Float64.(collect(clipped_frequency)))) == 50.0
        @test_throws ArgumentError pspectrum(real_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", false, "FrequencyLimits", [60.0, 80.0])
        @test_throws ArgumentError pspectrum(real_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", false, "FrequencyLimits", [20.0, 20.0])
        @test_throws ArgumentError pspectrum(real_signal, probe_time, "power", "Leakage", 0.5, "TwoSided", false, "FrequencyLimits", [NaN, 20.0])
    end

    @testset "spectrogram" begin
        power, frequencies, times = pspectrum(signal, time, "spectrogram", "TwoSided", true)
        @test !isempty(vec(collect(times)))
        @test all(isfinite, vec(collect(times)))
        assert_frequency_axis(frequencies)
        assert_pspectrum_matrix(power, frequencies, times)
    end

    @testset "C13 spectrogram Leakage + OverlapPercent canonical provider matrix" begin
        # This is deliberately the production adapter order: app-level JSON validation
        # rejects Bool and values outside the frozen ranges before this provider boundary.
        real_signal = sin.(2pi .* 32.0 .* time) .+ 0.25 .* sin.(2pi .* 72.0 .* time)
        for (probe_signal, two_sided) in ((real_signal, false), (signal, true))
            default_power, default_frequencies, default_times = pspectrum(probe_signal, time, "spectrogram", "OverlapPercent", 50.0, "TwoSided", two_sided)
            for leakage in (0.0, 0.5, 1.0), overlap_percent in (0.0, 50.0, 75.0)
                power, frequencies, times = pspectrum(
                    probe_signal,
                    time,
                    "spectrogram",
                    "Leakage",
                    leakage,
                    "OverlapPercent",
                    overlap_percent,
                    "TwoSided",
                    two_sided,
                )
                @test !isempty(vec(collect(times)))
                @test all(isfinite, vec(collect(times)))
                if two_sided
                    assert_frequency_axis(frequencies)
                else
                    @test !isempty(vec(collect(frequencies)))
                    @test all(value -> value >= 0.0, Float64.(vec(collect(frequencies))))
                end
                assert_pspectrum_matrix(power, frequencies, times)
                if leakage == 0.5 && overlap_percent == 50.0
                    @test power == default_power
                    @test frequencies == default_frequencies
                    @test times == default_times
                end
            end
        end

        # Provider delta: EngeeDSP accepts Bool permissively; application/API tests
        # prove Bool is rejected before this boundary and it is never dispatched.
        bool_power, bool_frequencies, bool_times = pspectrum(
            signal,
            time,
            "spectrogram",
            "Leakage",
            true,
            "OverlapPercent",
            50.0,
            "TwoSided",
            true,
        )
        @test !isempty(vec(collect(bool_times)))
        @test all(isfinite, vec(collect(bool_times)))
        assert_frequency_axis(bool_frequencies)
        assert_pspectrum_matrix(bool_power, bool_frequencies, bool_times)

        canonical = pspectrum(signal, time, "spectrogram", "Leakage", 0.0, "OverlapPercent", 50.0, "TwoSided", true)
        reordered = pspectrum(signal, time, "spectrogram", "OverlapPercent", 50.0, "Leakage", 0.0, "TwoSided", true)
        @test canonical == reordered
        @test_throws ArgumentError pspectrum(signal, time, "spectrogram", "Leakage", -0.01, "OverlapPercent", 50.0, "TwoSided", true)
        @test_throws ArgumentError pspectrum(signal, time, "spectrogram", "Leakage", 1.01, "OverlapPercent", 50.0, "TwoSided", true)
        @test_throws ArgumentError pspectrum(signal, time, "spectrogram", "Leakage", NaN, "OverlapPercent", 50.0, "TwoSided", true)
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
