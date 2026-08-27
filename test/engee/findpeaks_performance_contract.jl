using Test

"""Deterministic Float64 signal with a bounded number of prominent peaks."""
function hnd0730_findpeaks_signal(sample_count::Int)::Vector{Float64}
    denominator = max(sample_count - 1, 1)
    Float64[
        sinpi(400 * (index - 1) / denominator) +
        0.05 * cospi(74 * (index - 1) / denominator)
        for index in 1:sample_count
    ]
end

"""Reproduce the current linear ROI-boundary scan without materializing samples."""
function hnd0730_roi_index_scan(values::Vector{Float64}, sample_rate_hz::Float64)
    duration_s = (length(values) - 1) / sample_rate_hz
    minimum_s = 0.1 * duration_s
    maximum_s = 0.9 * duration_s
    first_position = findfirst(eachindex(values)) do index
        time_s = (index - 1) / sample_rate_hz
        minimum_s <= time_s <= maximum_s
    end
    last_position = findlast(eachindex(values)) do index
        time_s = (index - 1) / sample_rate_hz
        minimum_s <= time_s <= maximum_s
    end
    first_position, last_position
end

function hnd0730_convert_findpeaks_result(raw_result, kind::Symbol)
    sign = kind === :maximum ? 1.0 : -1.0
    values = sign .* Float64.(vec(collect(raw_result.Ypk)))
    locations = Int.(vec(collect(raw_result.Xpk)))
    widths = Float64.(vec(collect(raw_result.Wpk)))
    prominences = Float64.(vec(collect(raw_result.Ppk)))
    [
        (
            kind = kind,
            value = values[index],
            location = locations[index],
            width = widths[index],
            prominence = prominences[index],
        )
        for index in eachindex(values)
    ]
end

function hnd0730_merge_findpeaks_results(maxima, minima; limit::Int = 5)
    candidates = vcat(
        hnd0730_convert_findpeaks_result(maxima, :maximum),
        hnd0730_convert_findpeaks_result(minima, :minimum),
    )
    sort!(candidates; by = candidate -> (
        -candidate.prominence,
        candidate.location,
        candidate.kind === :maximum ? 1 : 2,
    ))
    length(candidates) > limit && resize!(candidates, limit)
    sort!(candidates; by = candidate -> (
        candidate.location,
        candidate.kind === :maximum ? 1 : 2,
    ))
    candidates
end

function hnd0730_findpeaks_call(findpeaks, values::Vector{Float64})
    findpeaks(
        values;
        NPeaks = 5,
        MinPeakHeight = -Inf,
        MinPeakDistance = 1,
        Threshold = 0.0,
        out = :data,
    )
end

function hnd0730_all_extrema(findpeaks, values::Vector{Float64}, negated::Vector{Float64})
    maxima = hnd0730_findpeaks_call(findpeaks, values)
    minima = hnd0730_findpeaks_call(findpeaks, negated)
    hnd0730_merge_findpeaks_results(maxima, minima)
end

function hnd0730_measure(stage::String, operation::Function)
    GC.gc()
    measurement = @timed operation()
    (
        stage = stage,
        seconds = measurement.time,
        bytes = measurement.bytes,
        gc_seconds = measurement.gctime,
    )
end

"""
Run the bounded HND-0730 benchmark after warming every measured path.

The two public `findpeaks` calls are timed on already prepared
`Vector{Float64}` inputs. ROI scanning, view materialization, negation,
result conversion and host-side merge are reported separately.
"""
function run_hnd0730_findpeaks_benchmark(findpeaks)
    warm_values = hnd0730_findpeaks_signal(10_000)
    warm_negated = -warm_values
    hnd0730_roi_index_scan(warm_values, 10_000.0)
    collect(@view warm_values[:])
    -collect(@view warm_values[:])
    warm_maxima = hnd0730_findpeaks_call(findpeaks, warm_values)
    warm_minima = hnd0730_findpeaks_call(findpeaks, warm_negated)
    hnd0730_convert_findpeaks_result(warm_maxima, :maximum)
    hnd0730_merge_findpeaks_results(warm_maxima, warm_minima)
    hnd0730_all_extrema(findpeaks, warm_values, warm_negated)

    rows = NamedTuple[]
    counts = NamedTuple[]
    for sample_count in (10_000, 100_000, 1_000_000)
        values = hnd0730_findpeaks_signal(sample_count)
        negated = -values
        maxima = hnd0730_findpeaks_call(findpeaks, values)
        minima = hnd0730_findpeaks_call(findpeaks, negated)
        for measurement in (
            hnd0730_measure("roi_index_scan", () -> hnd0730_roi_index_scan(values, 10_000.0)),
            hnd0730_measure("roi_view_to_vector", () -> collect(@view values[:])),
            hnd0730_measure("negated_input_conversion", () -> -collect(@view values[:])),
            hnd0730_measure("findpeaks_maxima", () -> hnd0730_findpeaks_call(findpeaks, values)),
            hnd0730_measure("findpeaks_minima", () -> hnd0730_findpeaks_call(findpeaks, negated)),
            hnd0730_measure(
                "tuple_vector_conversion_maxima",
                () -> hnd0730_convert_findpeaks_result(maxima, :maximum),
            ),
            hnd0730_measure("host_merge_only", () -> hnd0730_merge_findpeaks_results(maxima, minima)),
            hnd0730_measure(
                "all_two_calls_plus_merge",
                () -> hnd0730_all_extrema(findpeaks, values, negated),
            ),
        )
            push!(rows, merge((sample_count = sample_count,), measurement))
        end
        push!(counts, (
            sample_count = sample_count,
            maxima = length(maxima.Ypk),
            minima = length(minima.Ypk),
            merged = length(hnd0730_merge_findpeaks_results(maxima, minima)),
        ))
    end
    rows, counts
end

function run_hnd0730_findpeaks_contract(findpeaks)
    @testset "HND-0730 EngeeDSP findpeaks contract and bounded benchmark" begin
        probe = Float64[0, 2, 0, -3, 0, 1, 0]
        @test probe isa Vector{Float64}

        result = findpeaks(probe; out = :data)
        @test result isa NamedTuple
        @test keys(result) == (:Ypk, :Xpk, :Wpk, :Ppk)
        @test result.Ypk isa Vector{Float64}
        @test result.Xpk isa Vector{Int64}
        @test result.Wpk isa Vector{Float64}
        @test result.Ppk isa Vector{Float64}
        @test result.Ypk == [2.0, 1.0]
        @test result.Xpk == [2, 6]
        @test result.Wpk == [1.0, 1.0]
        @test result.Ppk == [2.0, 1.0]

        rows, counts = run_hnd0730_findpeaks_benchmark(findpeaks)
        @test length(rows) == 24
        @test [count.sample_count for count in counts] == [10_000, 100_000, 1_000_000]
        @test all(count -> count == (
            sample_count = count.sample_count,
            maxima = 5,
            minima = 5,
            merged = 5,
        ), counts)
        @test all(row -> row.seconds >= 0 && row.bytes >= 0 && row.gc_seconds >= 0, rows)
        rows, counts
    end
end

if abspath(PROGRAM_FILE) == @__FILE__
    import EngeeDSP
    run_hnd0730_findpeaks_contract(EngeeDSP.Functions.findpeaks)
end
