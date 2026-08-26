module PreprocessContractTests

using Test
using Statistics

"""Return true when every real and imaginary component is finite."""
finite_numeric(values) = all(
    value -> isfinite(real(value)) && isfinite(imag(value)),
    vec(collect(values)),
)

"""
Run the production-supported preprocessing contract against an imported
`EngeeDSP` module.

This suite intentionally normalizes documented provider representation deltas:
the four convenience filters may return an `N×1` matrix for vector input,
`smoothdata` always returns `(values, used_window)`, `envelope` returns a named
tuple, and `resample` returns a named tuple.  Product adapters must perform the
same explicit normalization instead of exposing those provider details.
"""
function run_supported_preprocess_contract_tests(dsp)
    functions = dsp.Functions

    @testset "EngeeDSP 0.75.0 supported preprocessing contracts" begin
        @testset "four delay-compensated filters" begin
            fs_hz = 1_000.0
            time = collect(0:999) ./ fs_hz
            signal = sin.(2pi .* 50.0 .* time) .+
                0.5 .* sin.(2pi .* 150.0 .* time) .+
                0.25 .* sin.(2pi .* 300.0 .* time)
            complex_signal = ComplexF64.(
                cis.(2pi .* 50.0 .* time) .+
                0.25 .* cis.(2pi .* 300.0 .* time),
            )

            cases = (
                (functions.lowpass, 100.0, 0.2),
                (functions.highpass, 100.0, 0.2),
                (functions.bandpass, [100.0, 200.0], [0.2, 0.4]),
                (functions.bandstop, [100.0, 200.0], [0.2, 0.4]),
            )
            for (filter_function, hz_argument, normalized_argument) in cases
                by_hz = filter_function(
                    signal,
                    hz_argument,
                    fs_hz,
                    "ImpulseResponse",
                    "auto",
                    "Steepness",
                    0.85,
                    "StopbandAttenuation",
                    60.0,
                )
                by_normalized = filter_function(
                    signal,
                    normalized_argument,
                    "ImpulseResponse",
                    "auto",
                    "Steepness",
                    0.85,
                    "StopbandAttenuation",
                    60.0,
                )
                complex_result = filter_function(
                    complex_signal,
                    hz_argument,
                    fs_hz,
                    "Steepness",
                    0.85,
                    "StopbandAttenuation",
                    60.0,
                )

                @test length(by_hz) == length(signal)
                @test length(by_normalized) == length(signal)
                @test length(complex_result) == length(complex_signal)
                @test finite_numeric(by_hz)
                @test finite_numeric(complex_result)
                @test vec(by_hz) ≈ vec(by_normalized)
                @test eltype(complex_result) <: Complex

                @test_throws ArgumentError filter_function(signal, hz_argument, 0.0)
                with_nan = copy(signal)
                with_nan[100] = NaN
                @test_throws ArgumentError filter_function(with_nan, hz_argument, fs_hz)
            end

            @test_throws ArgumentError functions.lowpass(signal, 0.0, fs_hz)
            @test_throws ArgumentError functions.highpass(signal, 0.0, fs_hz)
            @test_throws ArgumentError functions.bandpass(signal, [0.0, 200.0], fs_hz)
            @test_throws ArgumentError functions.bandstop(signal, [200.0, 100.0], fs_hz)
        end

        @testset "detrend numeric modes and missing-value policy" begin
            linear = Float64[1, 3, 5, 7, 9]
            @test functions.detrend(linear, 0) ≈ linear .- mean(linear)
            @test functions.detrend(linear, 1) ≈ zeros(length(linear)) atol = 4e-15
            @test functions.detrend(linear) ≈ functions.detrend(linear, 1)

            with_nan = Float64[1, 2, NaN, 4, 5]
            omitted = functions.detrend(
                with_nan,
                1,
                Float64[],
                "omitnan",
            )
            included = functions.detrend(
                with_nan,
                1,
                Float64[],
                "includenan",
            )
            @test isnan(omitted[3])
            @test finite_numeric(omitted[[1, 2, 4, 5]])
            @test all(isnan, included)
            @test_throws ArgumentError functions.detrend(linear, -1)
            @test_throws ArgumentError functions.detrend(
                linear,
                1,
                Float64[],
                "includenan";
                SamplePoints = [0.0, 0.2, 0.1, 0.3, 0.4],
            )
        end

        @testset "Fill Missing building blocks" begin
            sample_points = [1.0, 3.0, 5.0]
            finite_values = [1.0, 3.0, 5.0]
            missing_points = [2.0, 4.0]
            expected_by_method = Dict(
                "previous" => [1.0, 3.0],
                "next" => [3.0, 5.0],
                "nearest" => [3.0, 5.0],
                "linear" => [2.0, 4.0],
                "spline" => [2.0, 4.0],
                "pchip" => [2.0, 4.0],
                "makima" => [2.0, 4.0],
            )
            for (method, expected) in expected_by_method
                @test functions.interp1(
                    sample_points,
                    finite_values,
                    missing_points,
                    method,
                ) ≈ expected
            end

            with_nan = [1.0, NaN, 3.0, NaN, 5.0]
            @test functions.movmean(with_nan, 3, "omitnan") ==
                [1.0, 2.0, 3.0, 4.0, 5.0]
            @test functions.movmedian(with_nan, 3, "omitnan") ==
                [1.0, 2.0, 3.0, 4.0, 5.0]

            time = collect(range(0.0, 2pi; length = 101))
            source = sin.(time)
            gapped = copy(source)
            gapped[41:45] .= NaN
            reconstructed = functions.fillgaps(gapped)
            @test length(reconstructed) == length(source)
            @test finite_numeric(reconstructed)
            @test reconstructed[setdiff(eachindex(source), 41:45)] ==
                source[setdiff(eachindex(source), 41:45)]
        end

        @testset "smoothdata methods, shape, missing and complex support" begin
            source = Float64[0, 0, 10, 0, 0, 0, 0]
            for method in (
                "movmean",
                "movmedian",
                "gaussian",
                "lowess",
                "loess",
                "rlowess",
                "rloess",
                "sgolay",
            )
                smoothed, used_window = functions.smoothdata(source, method, 5)
                @test length(smoothed) == length(source)
                @test finite_numeric(smoothed)
                @test used_window == 5.0
            end

            default_values, default_window = functions.smoothdata(source)
            @test length(default_values) == length(source)
            @test default_window > 0
            @test first(functions.smoothdata(
                [1.0, NaN, 3.0],
                "movmean",
                3,
            )) == [1.0, 2.0, 3.0]
            complex_values, _ = functions.smoothdata(
                ComplexF64[1 + im, 2 + 2im, 3 + 3im],
                "movmean",
                3,
            )
            @test eltype(complex_values) == ComplexF64
            @test_throws ArgumentError functions.smoothdata(source, "movmean", 0)
            @test_throws ArgumentError functions.smoothdata(
                source,
                "sgolay",
                5,
                "Degree",
                5,
            )
        end

        @testset "envelope methods and compatibility guards" begin
            time = collect(range(0.0, 4pi; length = 101))
            source = (1 .+ 0.4 .* sin.(0.5 .* time)) .* sin.(5 .* time)
            cases = (
                functions.envelope(source; out = :data),
                functions.envelope(source, 10, "hilbert"; out = :data),
                functions.envelope(source, 10, "analytic"; out = :data),
                functions.envelope(source, 5, "rms"; out = :data),
                functions.envelope(source, 10, "peak"; out = :data),
            )
            for result in cases
                @test keys(result) == (:yupper, :ylower)
                @test length(result.yupper) == length(source)
                @test length(result.ylower) == length(source)
                @test finite_numeric(result.yupper)
                @test finite_numeric(result.ylower)
            end

            @test_throws ArgumentError functions.envelope(
                source,
                0,
                "rms";
                out = :data,
            )
            with_nan = copy(source)
            with_nan[5] = NaN
            @test_throws ErrorException functions.envelope(with_nan; out = :data)
            @test_throws MethodError functions.envelope(
                ComplexF64.(cis.(time));
                out = :data,
            )
        end

        @testset "uniform and nonuniform resampling" begin
            source = Float64.(0:9)
            rational = functions.resample(source, 3, 2)
            @test keys(rational) == (:y, :b)
            @test length(rational.y) == 15
            @test finite_numeric(rational.y)
            @test length(functions.resample(
                ComplexF64.(source .+ im .* reverse(source)),
                3,
                2,
            ).y) == 15
            @test_throws ArgumentError functions.resample(source, 0, 2)
            @test_throws ArgumentError functions.resample(source, 3, 0)
            @test_throws ArgumentError functions.resample(source, 1.5, 2)

            uniform_time = collect(0.0:0.1:0.9)
            uniform_signal = sin.(2pi .* uniform_time)
            same_grid = functions.resample(uniform_signal, uniform_time)
            @test same_grid.ty ≈ uniform_time
            @test same_grid.y ≈ uniform_signal

            nonuniform_time = [0.0, 0.1, 0.25, 0.4, 0.7, 1.0]
            nonuniform_signal = nonuniform_time .^ 2
            for method in ("linear", "pchip", "spline")
                result = functions.resample(
                    nonuniform_signal,
                    nonuniform_time,
                    10.0,
                    method,
                )
                in_domain = result.ty .<= last(nonuniform_time)
                @test count(in_domain) == 11
                @test result.ty[in_domain] ≈ collect(0.0:0.1:1.0)
                @test finite_numeric(result.y[in_domain])
            end

            with_nan = copy(nonuniform_signal)
            with_nan[3] = NaN
            nan_result = functions.resample(
                with_nan,
                nonuniform_time,
                10.0,
                "linear",
            )
            @test finite_numeric(nan_result.y)
            @test_throws ArgumentError functions.resample(
                nonuniform_signal,
                nonuniform_time[1:5],
                10.0,
                "linear",
            )
            @test_throws ArgumentError functions.resample(
                nonuniform_signal,
                nonuniform_time,
                10.0,
                "unsupported",
            )
        end

        @testset "denoise availability" begin
            @test !isdefined(functions, :wdenoise)
            @test !isdefined(functions, :denoise)
        end
    end
end

"""
Persistent reproducer for public EngeeDSP 0.75.0 preprocessing discrepancies.

Expected assertions come from the official Engee pages and the MATLAB
reference contract.  Keep this function failing until the provider is fixed;
the supported suite above records application-safe normalizations and guards.
"""
function run_documented_preprocess_reproducers(dsp)
    functions = dsp.Functions

    @testset "EngeeDSP 0.75.0 documented preprocessing regressions" begin
        @testset "filter vector shape and open bounds" begin
            fs_hz = 1_000.0
            time = collect(0:999) ./ fs_hz
            signal = sin.(2pi .* 50.0 .* time)

            @test size(functions.lowpass(signal, 100.0, fs_hz)) == size(signal)
            @test_throws ArgumentError functions.lowpass(signal, fs_hz / 2, fs_hz)
            @test_throws ArgumentError functions.highpass(signal, fs_hz / 2, fs_hz)
            @test_throws ArgumentError functions.bandpass(
                signal,
                [100.0, 200.0],
                fs_hz,
                "Steepness",
                1.0,
            )
            @test_throws ArgumentError functions.bandstop(
                signal,
                [100.0, 200.0],
                fs_hz,
                "Steepness",
                1.0,
            )
        end

        @testset "detrend string modes" begin
            linear = Float64[1, 3, 5, 7, 9]
            @test functions.detrend(linear, "constant") ≈ linear .- mean(linear)
            @test functions.detrend(linear, "linear") ≈
                zeros(length(linear)) atol = 4e-15
        end

        @testset "smoothdata documented factor endpoints" begin
            source = Float64[0, 0, 10, 0, 0, 0, 0]
            @test first(functions.smoothdata(
                source,
                "movmean",
                "SmoothingFactor",
                0.0,
            )) isa AbstractVector
            @test first(functions.smoothdata(
                source,
                "movmean",
                "SmoothingFactor",
                1.0,
            )) isa AbstractVector
        end

        @testset "resample time validation and output domain" begin
            time = [0.0, 0.1, 0.25, 0.4, 0.7, 1.0]
            source = time .^ 2
            @test_throws ArgumentError functions.resample(
                source,
                [0.0, 0.2, 0.1, 0.4, 0.7, 1.0],
                10.0,
                "linear",
            )
            @test_throws ArgumentError functions.resample(
                source,
                [0.0, 0.1, 0.1, 0.4, 0.7, 1.0],
                10.0,
                "linear",
            )
            @test_throws ArgumentError functions.resample(
                source,
                [-0.1, 0.1, 0.25, 0.4, 0.7, 1.0],
                10.0,
                "linear",
            )
            result = functions.resample(source, time, 10.0, "linear")
            @test last(result.ty) <= last(time)
        end
    end
end

end
