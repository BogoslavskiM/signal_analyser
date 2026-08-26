using Test

const TASK0160_TIME = Main.AppTestContext

@testset "TASK-0160 Time plot bounds indices before numeric materialization" begin
    limit = TASK0160_TIME.SIGNAL_ANALYSER_MAX_LINE_POINTS
    indices = TASK0160_TIME.signal_analyser_bounded_indices(100_000_000, limit)
    @test length(indices) <= limit && limit == 1024
    @test first(indices) == 1 && last(indices) == 100_000_000
    @test issorted(indices) && length(unique(indices)) == length(indices)

    real_values = Float64.(1:100_000)
    real_signal = TASK0160_TIME.AnalysedSignal(
        "real-bounded", "#123456", 20.0, real_values, false, true,
    )
    real_trace = only(TASK0160_TIME.signal_analyser_time_traces_for_payload(real_signal))
    selected = TASK0160_TIME.signal_analyser_bounded_indices(length(real_values), limit)
    @test length(real_trace["x"]) <= limit && length(real_trace["y"]) == length(selected)
    @test real_trace["x"] == Float64[(index - 1) / real_signal.sample_rate_hz for index in selected]
    @test real_trace["y"] == Float64[real_values[index] for index in selected]
    @test first(real_trace["y"]) == first(real_values) && last(real_trace["y"]) == last(real_values)

    complex_values = ComplexF64.(real_values, reverse(real_values))
    complex_signal = TASK0160_TIME.AnalysedSignal(
        "complex-bounded", "#654321", 40.0, complex_values, true, true,
    )
    complex_traces = TASK0160_TIME.signal_analyser_time_traces_for_payload(complex_signal)
    @test [trace["component"] for trace in complex_traces] == ["real", "imaginary"]
    @test all(trace -> length(trace["x"]) <= limit && length(trace["y"]) == length(selected), complex_traces)
    @test complex_traces[1]["x"] == Float64[(index - 1) / complex_signal.sample_rate_hz for index in selected]
    @test complex_traces[1]["y"] == Float64[real(complex_values[index]) for index in selected]
    @test complex_traces[2]["y"] == Float64[imag(complex_values[index]) for index in selected]
    @test first(complex_traces[1]["y"]) == real(complex_values[1]) && last(complex_traces[1]["y"]) == real(complex_values[end])
    @test first(complex_traces[2]["y"]) == imag(complex_values[1]) && last(complex_traces[2]["y"]) == imag(complex_values[end])

    source = TASK0160_TIME.source("lib", "services", "signal_analyser_service.jl")
    marker = "function signal_analyser_time_traces_for_payload"
    start = findfirst(marker, source)
    @test start !== nothing
    if start !== nothing
        tail = source[first(start):end]
        next_function = findnext("\nfunction ", tail, length(marker) + 1)
        time_traces = next_function === nothing ? tail : tail[1:first(next_function)]
        @test occursin("signal_analyser_bounded_indices", time_traces)
        @test !occursin("signal_time_values(signal)", time_traces)
        @test !occursin("Float64.(real.(signal.values))", time_traces)
        @test !occursin("Float64.(imag.(signal.values))", time_traces)
    end
end
