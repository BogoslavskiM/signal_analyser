using Test

include("findpeaks_contract_matrix.jl")

@testset "DEC-039 Engee workspace catalog target lock" begin
    manifest = read(joinpath(@__DIR__, "..", "..", "architecture", "agents", "manifest.toml"), String)
    @test occursin("[engee_target]", manifest)
    @test occursin("environment = \"prod\"", manifest)
    @test occursin("base_url = \"https://engee.com\"", manifest)
    @test occursin("mcp_server = \"prod\"", manifest)
    @test occursin("allow_devhub = false", manifest)
    @test occursin("allow_fallback = false", manifest)
end

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
    @test size(matrix) == (rows, columns)
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

    @testset "HND-0413 MATLAB-compatible power normalization and topology" begin
        real_tone = cos.(2pi .* 32.0 .* time)
        real_power, real_frequencies, real_metadata = pspectrum(
            real_tone,
            time,
            "power",
            "Leakage",
            0.5,
            "TwoSided",
            false,
        )
        real_axis = Float64.(vec(collect(real_frequencies)))
        real_values = Float64.(vec(collect(real_power)))
        real_peak = argmax(real_values)
        real_bin_width_hz = maximum(diff(real_axis))
        @test size(real_power) == (length(real_axis), 1)
        @test isempty(real_metadata)
        @test first(real_axis) == 0.0
        @test last(real_axis) == fs_hz / 2
        @test abs(real_axis[real_peak] - 32.0) <= real_bin_width_hz
        # MATLAB/Engee public contract: unit real cosine has average power 1/2.
        @test isapprox(real_values[real_peak], 0.5; rtol = 1e-3, atol = 0.0)
        @test pspectrum(real_tone, time) == (real_power, real_frequencies, real_metadata)

        for (complex_tone, expected_frequency_hz) in (
            (cis.(2pi .* 32.0 .* time), 32.0),
            (cis.(-2pi .* 32.0 .* time), -32.0),
        )
            complex_power, complex_frequencies, complex_metadata = pspectrum(
                complex_tone,
                time,
                "power",
                "Leakage",
                0.5,
                "TwoSided",
                true,
            )
            complex_axis = Float64.(vec(collect(complex_frequencies)))
            complex_values = Float64.(vec(collect(complex_power)))
            complex_peak = argmax(complex_values)
            complex_bin_width_hz = maximum(diff(complex_axis))
            @test size(complex_power) == (length(complex_axis), 1)
            @test isempty(complex_metadata)
            @test first(complex_axis) == -fs_hz / 2
            @test last(complex_axis) == fs_hz / 2
            @test abs(complex_axis[complex_peak] - expected_frequency_hz) <= complex_bin_width_hz
            # MATLAB/Engee public contract: a unit complex exponential has unit power.
            @test isapprox(complex_values[complex_peak], 1.0; rtol = 1e-3, atol = 0.0)
        end

        complex_positive = cis.(2pi .* 32.0 .* time)
        @test pspectrum(complex_positive, time) == pspectrum(
            complex_positive,
            time,
            "power",
            "Leakage",
            0.5,
            "TwoSided",
            true,
        )
    end

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

    @testset "C15 spectrogram FrequencyLimits real/complex provider matrix" begin
        probe_fs_hz = 100.0
        probe_count = 256
        probe_time = collect(0:(probe_count - 1)) ./ probe_fs_hz
        real_signal = sin.(2pi .* 12.0 .* probe_time)
        complex_signal = exp.(2im * pi .* 12.0 .* probe_time)
        endpoint_tolerance = sqrt(eps(Float64)) * max(probe_fs_hz, 1.0)
        for (values, two_sided, bands) in (
            (real_signal, false, ([0.0, 50.0], [5.0, 20.0])),
            (complex_signal, true, ([-50.0, 50.0], [-30.0, -5.0], [-5.0, 15.0])),
        )
            auto_power, auto_frequency, auto_times = pspectrum(values, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", two_sided)
            assert_pspectrum_matrix(auto_power, auto_frequency, auto_times)
            for band in bands
                power, frequency, times = pspectrum(values, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", two_sided, "FrequencyLimits", band)
                axis = Float64.(vec(collect(frequency)))
                @test length(axis) == 1024 && all(diff(axis) .> 0.0)
                @test abs(first(axis) - band[1]) <= endpoint_tolerance
                @test abs(last(axis) - band[2]) <= endpoint_tolerance
                @test times == auto_times
                assert_pspectrum_matrix(power, frequency, times)
                reordered = pspectrum(values, probe_time, "spectrogram", "FrequencyLimits", band, "TwoSided", two_sided, "OverlapPercent", 50.0, "Leakage", 0.5)
                @test (power, frequency, times) == reordered
            end
            full = two_sided ? [-50.0, 50.0] : [0.0, 50.0]
            full_result = pspectrum(values, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", two_sided, "FrequencyLimits", full)
            @test full_result != (auto_power, auto_frequency, auto_times) # C15 cannot alias Auto/full cache identity.
        end
        @test_throws ArgumentError pspectrum(real_signal, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", false, "FrequencyLimits", [20.0, 20.0])
        @test_throws ArgumentError pspectrum(real_signal, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", false, "FrequencyLimits", [NaN, 20.0])
        # Suspected provider boundary intake: product must pre-reject this partial band;
        # the result is intentionally not asserted as a provider defect here.
        nyquist_touch = try
            pspectrum(real_signal, probe_time, "spectrogram", "Leakage", 0.5, "OverlapPercent", 50.0, "TwoSided", false, "FrequencyLimits", [50.0, 60.0])
        catch caught
            caught
        end
        @test nyquist_touch isa Exception || length(unique(Float64.(vec(collect(nyquist_touch[2]))))) < 1024
    end

    @testset "spectrogram" begin
        power, frequencies, times = pspectrum(signal, time, "spectrogram", "TwoSided", true)
        @test !isempty(vec(collect(times)))
        @test all(isfinite, vec(collect(times)))
        assert_frequency_axis(frequencies)
        assert_pspectrum_matrix(power, frequencies, times)
    end

    @testset "HND-0413 documented defaults and exact output orientation" begin
        real_signal = cos.(2pi .* 32.0 .* time)
        implicit_spectrogram = pspectrum(real_signal, time, "spectrogram")
        explicit_spectrogram = pspectrum(
            real_signal,
            time,
            "spectrogram",
            "Leakage",
            0.5,
            "OverlapPercent",
            75.0,
            "TwoSided",
            false,
        )
        # The public default overlap depends on the Kaiser window.  For this
        # fixed Leakage=0.5 probe it resolves to 75%, not the application's
        # explicit Spectrogram default of 50%.
        @test implicit_spectrogram == explicit_spectrogram
        assert_pspectrum_matrix(
            implicit_spectrogram[1],
            implicit_spectrogram[2],
            implicit_spectrogram[3],
        )

        implicit_persistence = pspectrum(real_signal, time, "persistence")
        explicit_persistence = pspectrum(
            real_signal,
            time,
            "persistence",
            "Leakage",
            0.5,
            "NumPowerBins",
            256,
            "TwoSided",
            false,
        )
        @test implicit_persistence == explicit_persistence
        assert_pspectrum_matrix(
            implicit_persistence[1],
            implicit_persistence[3],
            implicit_persistence[2],
        )
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

    @testset "C18 Persistence explicit default provider options" begin
        real_signal = sin.(2pi .* 32.0 .* time) .+ 0.25 .* sin.(2pi .* 72.0 .* time)
        endpoint_tolerance = sqrt(eps(Float64)) * fs_hz
        for (probe_signal, two_sided, expected_domain) in (
            (real_signal, false, (0.0, fs_hz / 2)),
            (signal, true, (-fs_hz / 2, fs_hz / 2)),
        )
            occurrence, frequencies, power_levels = pspectrum(
                probe_signal,
                time,
                "persistence",
                "NumPowerBins",
                256,
                "TwoSided",
                two_sided,
            )
            frequency_axis = Float64.(vec(collect(frequencies)))
            power_axis = Float64.(vec(collect(power_levels)))
            @test length(power_axis) == 256
            @test !isempty(frequency_axis) && all(isfinite, frequency_axis) && all(diff(frequency_axis) .> 0.0)
            @test all(isfinite, power_axis) && all(power_axis .> 0.0) && all(diff(power_axis) .> 0.0)
            @test abs(first(frequency_axis) - expected_domain[1]) <= endpoint_tolerance
            @test abs(last(frequency_axis) - expected_domain[2]) <= endpoint_tolerance
            @test size(occurrence) == (length(power_axis), length(frequency_axis))
            @test all(value -> isfinite(value) && 0.0 <= value <= 100.0, vec(Float64.(collect(occurrence))))
        end
    end

    @testset "C19 Persistence Leakage canonical provider matrix" begin
        # The production adapter freezes this order: Leakage, NumPowerBins, TwoSided.
        # Application validation rejects Bool/non-finite/out-of-range values before this boundary.
        real_signal = sin.(2pi .* 32.0 .* time) .+ 0.25 .* sin.(2pi .* 72.0 .* time)
        for (probe_signal, two_sided) in ((real_signal, false), (signal, true))
            implicit = pspectrum(probe_signal, time, "persistence", "NumPowerBins", 256, "TwoSided", two_sided)
            for leakage in (0.0, 0.5, 1.0)
                occurrence, frequencies, power_levels = pspectrum(
                    probe_signal,
                    time,
                    "persistence",
                    "Leakage",
                    leakage,
                    "NumPowerBins",
                    256,
                    "TwoSided",
                    two_sided,
                )
                frequency_axis = Float64.(vec(collect(frequencies)))
                power_axis = Float64.(vec(collect(power_levels)))
                @test length(power_axis) == 256
                @test !isempty(frequency_axis) && all(isfinite, frequency_axis) && all(diff(frequency_axis) .> 0.0)
                @test all(isfinite, power_axis) && all(diff(power_axis) .> 0.0)
                @test size(occurrence) == (length(power_axis), length(frequency_axis))
                @test all(value -> isfinite(value) && 0.0 <= value <= 100.0, vec(Float64.(collect(occurrence))))
                if leakage == 0.5
                    @test (occurrence, frequencies, power_levels) == implicit
                end
            end
            canonical = pspectrum(probe_signal, time, "persistence", "Leakage", 0.0, "NumPowerBins", 256, "TwoSided", two_sided)
            reordered = pspectrum(probe_signal, time, "persistence", "TwoSided", two_sided, "NumPowerBins", 256, "Leakage", 0.0)
            @test canonical == reordered
        end

        # Provider delta: EngeeDSP accepts Bool at this layer; typed app settings must reject it.
        bool_result = pspectrum(signal, time, "persistence", "Leakage", true, "NumPowerBins", 256, "TwoSided", true)
        @test size(bool_result[1]) == (length(vec(collect(bool_result[3]))), length(vec(collect(bool_result[2]))))
        @test_throws ArgumentError pspectrum(signal, time, "persistence", "Leakage", -0.01, "NumPowerBins", 256, "TwoSided", true)
        @test_throws ArgumentError pspectrum(signal, time, "persistence", "Leakage", 1.01, "NumPowerBins", 256, "TwoSided", true)
        @test_throws ArgumentError pspectrum(signal, time, "persistence", "Leakage", NaN, "NumPowerBins", 256, "TwoSided", true)
    end


    @testset "HND-0413 short, zero and non-finite edge contract" begin
        short_time = [0.0, 1.0 / fs_hz]
        for (probe_signal, two_sided) in (
            ([1.0, -1.0], false),
            (ComplexF64[1.0, 1.0im], true),
        )
            power, frequencies, metadata = pspectrum(
                probe_signal,
                short_time,
                "power",
                "Leakage",
                0.5,
                "TwoSided",
                two_sided,
            )
            @test size(power) == (length(vec(collect(frequencies))), 1)
            @test isempty(metadata)
            @test finite_values(power)

            spectrogram_power, spectrogram_frequencies, segment_centers = pspectrum(
                probe_signal,
                short_time,
                "spectrogram",
                "Leakage",
                0.5,
                "OverlapPercent",
                50.0,
                "TwoSided",
                two_sided,
            )
            assert_pspectrum_matrix(
                spectrogram_power,
                spectrogram_frequencies,
                segment_centers,
            )

            occurrence, persistence_frequencies, power_levels = pspectrum(
                probe_signal,
                short_time,
                "persistence",
                "Leakage",
                0.5,
                "NumPowerBins",
                256,
                "TwoSided",
                two_sided,
            )
            @test length(vec(collect(power_levels))) == 256
            assert_pspectrum_matrix(occurrence, power_levels, persistence_frequencies)
        end

        zero_signal = zeros(sample_count)
        zero_power, _, _ = pspectrum(
            zero_signal,
            time,
            "power",
            "Leakage",
            0.5,
            "TwoSided",
            false,
        )
        @test all(iszero, zero_power)
        zero_spectrogram, _, _ = pspectrum(
            zero_signal,
            time,
            "spectrogram",
            "Leakage",
            0.5,
            "OverlapPercent",
            50.0,
            "TwoSided",
            false,
        )
        @test all(iszero, zero_spectrogram)
        zero_occurrence, _, zero_power_levels = pspectrum(
            zero_signal,
            time,
            "persistence",
            "Leakage",
            0.5,
            "NumPowerBins",
            256,
            "TwoSided",
            false,
        )
        @test all(iszero, zero_occurrence)
        @test length(vec(collect(zero_power_levels))) == 256
        @test all(value -> isfinite(value) && value > 0.0, vec(collect(zero_power_levels)))

        for spectrum_type in ("power", "spectrogram", "persistence")
            @test_throws ArgumentError pspectrum([1.0], [0.0], spectrum_type)
        end
        @test_throws ArgumentError pspectrum(
            [signal[1:end-1]; ComplexF64(NaN)],
            time,
            "power",
            "TwoSided",
            true,
        )
        @test_throws ArgumentError pspectrum(
            real.(signal),
            fill(0.0, sample_count),
            "power",
            "TwoSided",
            false,
        )
    end

    @testset "HND-0413 documented validation regressions" begin
        # Both official Engee and MATLAB contracts restrict one-sided output to
        # real input.  Production EngeeDSP 0.72.0 currently accepts this call.
        @test_throws Exception pspectrum(
            signal,
            time,
            "power",
            "TwoSided",
            false,
        )

        real_signal = real.(signal)
        # Both official contracts constrain NumPowerBins to the inclusive
        # interval 20:1024.  Production EngeeDSP 0.72.0 currently accepts both
        # out-of-contract values and returns matrices with those row counts.
        @test_throws Exception pspectrum(
            real_signal,
            time,
            "persistence",
            "NumPowerBins",
            19,
            "TwoSided",
            false,
        )
        @test_throws Exception pspectrum(
            real_signal,
            time,
            "persistence",
            "NumPowerBins",
            1025,
            "TwoSided",
            false,
        )
    end
end
