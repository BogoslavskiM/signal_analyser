using Test

const TASK0159_EXTREMA = Main.AppTestContext

@testset "TASK-0159 V59 findpeaks keeps Ypk/Xpk semantics for maxima and minima" begin
    query = TASK0159_EXTREMA.SignalPeaksQuery(
        0, "display-v59", "сигнал", TASK0159_EXTREMA.MAGNITUDE_ORDINATE,
        [2.0, -5.0, 1.0], 20.0, 7,
        TASK0159_EXTREMA.SignalPeaksSettings(TASK0159_EXTREMA.ALL_EXTREMA_MODE, 4, nothing, nothing, 1, 0),
    )
    seen = Any[]
    fake_findpeaks = function(values; kwargs...)
        push!(seen, (copy(values), kwargs))
        (Ypk = [5.0], Xpk = [2], Wpk = [3.0], Ppk = [4.0])
    end
    minimum = TASK0159_EXTREMA.signal_peaks_detect_direction(fake_findpeaks, query, TASK0159_EXTREMA.MINIMUM_PEAK)
    @test seen[1][1] == [-2.0, 5.0, -1.0]
    @test minimum.peak_values == (-5.0,) # provider Ypk is transformed back for the original ordinate
    @test minimum.locations_1based == (2,) && minimum.kinds == (TASK0159_EXTREMA.MINIMUM_PEAK,)

    maximum = TASK0159_EXTREMA.signal_peaks_detect_direction(fake_findpeaks, query, TASK0159_EXTREMA.MAXIMUM_PEAK)
    @test seen[2][1] == [2.0, -5.0, 1.0]
    @test maximum.peak_values == (5.0,) && maximum.locations_1based == (2,)

    source = TASK0159_EXTREMA.source("lib", "services", "signal_analyser_service.jl")
    @test occursin("raw_result.Ypk", source) && occursin("raw_result.Xpk", source)
    @test occursin("query.sample_offset + result.locations_1based[index] - 1", source)
    @test occursin("signal_analyser_start_peaks_worker_unlocked!", source)
end
