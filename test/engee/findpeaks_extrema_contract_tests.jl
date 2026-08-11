using Test

"""Assert the public `out=:data` shape and numeric arrays."""
function assert_findpeaks_data(
    result;
    values,
    locations,
    widths,
    prominences,
)
    @test result isa NamedTuple
    @test keys(result) == (:Ypk, :Xpk, :Wpk, :Ppk)
    @test collect(result.Ypk) == values
    @test collect(result.Xpk) == locations
    @test collect(result.Wpk) ≈ widths
    @test collect(result.Ppk) ≈ prominences
end

"""
Convert two public `findpeaks` results to original-ordinate extrema.

This is a contract probe only.  A minimum negates `Ypk` back to the original
ordinate while location, width and prominence remain unchanged.
"""
function extrema_contract_merge(maxima, negated_minima)
    merged = vcat(
        [(
            kind = :maximum,
            value = Float64(maxima.Ypk[index]),
            location = Int(maxima.Xpk[index]),
            width = Float64(maxima.Wpk[index]),
            prominence = Float64(maxima.Ppk[index]),
        ) for index in eachindex(maxima.Ypk)],
        [(
            kind = :minimum,
            value = -Float64(negated_minima.Ypk[index]),
            location = Int(negated_minima.Xpk[index]),
            width = Float64(negated_minima.Wpk[index]),
            prominence = Float64(negated_minima.Ppk[index]),
        ) for index in eachindex(negated_minima.Ypk)],
    )
    sort!(merged; by = item -> item.location)
end

function run_findpeaks_extrema_contract_tests(findpeaks)
    @testset "TASK-0096 EngeeDSP findpeaks extrema contract" begin
        base = Float64[0, 1, 0, 2, 2, 0, -1, 3, 0]

        @testset "maxima, inverted minima and combined original ordinate" begin
            maxima = findpeaks(base; out = :data)
            minima = findpeaks(-base; out = :data)
            @test findpeaks(
                base;
                NPeaks = 99,
                MinPeakHeight = -Inf,
                MinPeakDistance = 1,
                Threshold = 0.0,
                out = :data,
            ) == maxima
            @test findpeaks(
                -base;
                NPeaks = 99,
                MinPeakHeight = -Inf,
                MinPeakDistance = 1,
                Threshold = 0.0,
                out = :data,
            ) == minima
            assert_findpeaks_data(
                maxima;
                values = [1.0, 2.0, 3.0],
                locations = [2, 4, 8],
                widths = [1.0, 2.0, 0.875],
                prominences = [1.0, 2.0, 3.0],
            )
            assert_findpeaks_data(
                minima;
                values = [-0.0, 1.0],
                locations = [3, 7],
                widths = [0.75, 1.625],
                prominences = [1.0, 3.0],
            )
            @test extrema_contract_merge(maxima, minima) == [
                (kind = :maximum, value = 1.0, location = 2, width = 1.0, prominence = 1.0),
                (kind = :minimum, value = 0.0, location = 3, width = 0.75, prominence = 1.0),
                (kind = :maximum, value = 2.0, location = 4, width = 2.0, prominence = 2.0),
                (kind = :minimum, value = -1.0, location = 7, width = 1.625, prominence = 3.0),
                (kind = :maximum, value = 3.0, location = 8, width = 0.875, prominence = 3.0),
            ]
        end

        @testset "MATLAB R2024b exact reference vector" begin
            matlab_signal = Float64[0, 2, 0, -3, 0, 1, 0, -2, 0]
            assert_findpeaks_data(
                findpeaks(matlab_signal; out = :data);
                values = [2.0, 1.0],
                locations = [2, 6],
                widths = [1.0, 2.4166666666666665],
                prominences = [2.0, 3.0],
            )
            assert_findpeaks_data(
                findpeaks(-matlab_signal; out = :data);
                values = [3.0, 2.0],
                locations = [4, 8],
                widths = [1.3333333333333333, 1.0],
                prominences = [4.0, 2.0],
            )
        end

        @testset "NPeaks and polarity-sensitive MinPeakHeight" begin
            assert_findpeaks_data(
                findpeaks(base; NPeaks = 1, out = :data);
                values = [1.0], locations = [2], widths = [1.0], prominences = [1.0],
            )
            assert_findpeaks_data(
                findpeaks(-base; NPeaks = 1, out = :data);
                values = [-0.0], locations = [3], widths = [0.75], prominences = [1.0],
            )
            assert_findpeaks_data(
                findpeaks(base; NPeaks = 2, SortStr = "descend", out = :data);
                values = [3.0, 2.0], locations = [8, 4], widths = [0.875, 2.0],
                prominences = [3.0, 2.0],
            )
            assert_findpeaks_data(
                findpeaks(base; MinPeakHeight = 2.0, out = :data);
                values = [3.0], locations = [8], widths = [0.875], prominences = [3.0],
            )
            # The same H on -y means original minima y < -H; it is not an
            # original-ordinate lower bound and must not be presented as one.
            assert_findpeaks_data(
                findpeaks(-base; MinPeakHeight = 0.0, out = :data);
                values = [1.0], locations = [7], widths = [1.625], prominences = [3.0],
            )
            per_polarity = extrema_contract_merge(
                findpeaks(base; NPeaks = 1, out = :data),
                findpeaks(-base; NPeaks = 1, out = :data),
            )
            @test length(per_polarity) == 2
        end

        @testset "Threshold, prominence and distance are inversion invariant" begin
            controlled = Float64[0, 3, 0, -2, 0, 2, 0, -1, 0]
            assert_findpeaks_data(
                findpeaks(controlled; Threshold = 2.0, out = :data);
                values = [3.0, 2.0], locations = [2, 6], widths = [1.0, 1.5],
                prominences = [3.0, 3.0],
            )
            assert_findpeaks_data(
                findpeaks(-controlled; Threshold = 2.0, out = :data);
                values = [2.0], locations = [4], widths = [2.0], prominences = [4.0],
            )
            assert_findpeaks_data(
                findpeaks(base; MinPeakProminence = 2.0, out = :data);
                values = [2.0, 3.0], locations = [4, 8], widths = [2.0, 0.875],
                prominences = [2.0, 3.0],
            )
            assert_findpeaks_data(
                findpeaks(-base; MinPeakProminence = 2.0, out = :data);
                values = [1.0], locations = [7], widths = [1.625], prominences = [3.0],
            )
            assert_findpeaks_data(
                findpeaks(controlled; MinPeakDistance = 5, out = :data);
                values = [3.0], locations = [2], widths = [1.0], prominences = [3.0],
            )
            assert_findpeaks_data(
                findpeaks(-controlled; MinPeakDistance = 5, out = :data);
                values = [2.0], locations = [4], widths = [2.0], prominences = [4.0],
            )
        end

        @testset "plateau, finite endpoints and ties" begin
            assert_findpeaks_data(
                findpeaks(Float64[0, 2, 2, 0]; out = :data);
                values = [2.0], locations = [2], widths = [2.0], prominences = [2.0],
            )
            assert_findpeaks_data(
                findpeaks(-Float64[0, -2, -2, 0]; out = :data);
                values = [2.0], locations = [2], widths = [2.0], prominences = [2.0],
            )
            @test isempty(findpeaks(Float64[0, 2, 2, 0]; Threshold = eps(Float64), out = :data).Ypk)
            @test isempty(findpeaks(-Float64[0, -2, -2, 0]; Threshold = eps(Float64), out = :data).Ypk)

            endpoints = Float64[9, 0, 2, 0, 8]
            @test findpeaks(endpoints; out = :data).Xpk == [3]
            @test findpeaks(-endpoints; out = :data).Xpk == [2, 4]

            ties = Float64[0, 2, 0, 2, 0]
            @test findpeaks(ties; out = :data).Xpk == [2, 4]
            @test findpeaks(ties; MinPeakDistance = 1, out = :data).Xpk == [2, 4]
            # MATLAB R2024b uses strict separation > MinPeakDistance.  At an
            # exact-distance equal-height tie the stable earlier location wins.
            @test findpeaks(ties; MinPeakDistance = 1.999, out = :data).Xpk == [2, 4]
            @test findpeaks(ties; MinPeakDistance = 2, out = :data).Xpk == [2]
            @test findpeaks(ties; MinPeakDistance = 3, out = :data).Xpk == [2]
        end

        @testset "location units and current complex magnitude strategy" begin
            coordinate_signal = Float64[0, 2, 0, -1, 0]
            coordinates = findpeaks(
                coordinate_signal,
                Float64[0, 0.25, 0.5, 0.75, 1.0];
                out = :data,
            )
            sampled = findpeaks(coordinate_signal, 4.0; out = :data)
            @test coordinates.Xpk == [0.25]
            @test coordinates.Wpk ≈ [0.25]
            @test sampled.Xpk == [0.25]
            @test sampled.Wpk ≈ [0.25]

            complex_signal = ComplexF64[0, 3 + 4im, 0, 0 + 2im, 0]
            @test_throws MethodError findpeaks(complex_signal; out = :data)
            magnitude = abs.(complex_signal)
            assert_findpeaks_data(
                findpeaks(magnitude; out = :data);
                values = [5.0, 2.0], locations = [2, 4], widths = [1.0, 1.0],
                prominences = [5.0, 2.0],
            )
            assert_findpeaks_data(
                findpeaks(-magnitude; out = :data);
                values = [-0.0], locations = [3], widths = [0.7], prominences = [2.0],
            )
        end

        @testset "documented input errors remain failures" begin
            @test_throws ErrorException findpeaks(base; NPeaks = 0, out = :data)
            @test_throws ErrorException findpeaks(base; MinPeakDistance = -1, out = :data)
            @test_throws ErrorException findpeaks(base; Threshold = -1, out = :data)
            @test_throws ArgumentError findpeaks(Float64[0, 1]; out = :data)
        end
    end
end

if abspath(PROGRAM_FILE) == @__FILE__
    import EngeeDSP
    run_findpeaks_extrema_contract_tests(EngeeDSP.Functions.findpeaks)
end
