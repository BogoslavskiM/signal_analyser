using Test

const TASK0160_TIME = Main.AppTestContext

@testset "TASK-0160 Time plot bounds indices before numeric materialization" begin
    limit = TASK0160_TIME.SIGNAL_ANALYSER_MAX_LINE_POINTS
    indices = TASK0160_TIME.signal_analyser_bounded_indices(100_000_000, limit)
    @test length(indices) <= limit && limit == 1024
    @test first(indices) == 1 && last(indices) == 100_000_000
    @test issorted(indices) && length(unique(indices)) == length(indices)

    x = Float64.(0:99_999)
    real_values = Float64.(1:100_000)
    bounded_x, bounded_real = TASK0160_TIME.signal_analyser_bounded_line(x, real_values)
    @test length(bounded_x) <= 1024 && length(bounded_real) == length(bounded_x)
    @test first(bounded_x) == first(x) && last(bounded_x) == last(x)
    @test first(bounded_real) == first(real_values) && last(bounded_real) == last(real_values)

    complex_values = ComplexF64.(real_values, reverse(real_values))
    _, bounded_complex_real = TASK0160_TIME.signal_analyser_bounded_line(x, Float64.(real.(complex_values)))
    _, bounded_complex_imag = TASK0160_TIME.signal_analyser_bounded_line(x, Float64.(imag.(complex_values)))
    @test first(bounded_complex_real) == real(complex_values[1]) && last(bounded_complex_real) == real(complex_values[end])
    @test first(bounded_complex_imag) == imag(complex_values[1]) && last(bounded_complex_imag) == imag(complex_values[end])

    source = TASK0160_TIME.source("lib", "services", "signal_analyser_service.jl")
    marker = "function signal_analyser_time_plot"
    start = findfirst(marker, source)
    @test start !== nothing
    if start !== nothing
        tail = source[first(start):end]
        next_function = findnext("\nfunction ", tail, length(marker) + 1)
        time_plot = next_function === nothing ? tail : tail[1:first(next_function)]
        @test occursin("signal_analyser_bounded_indices", time_plot)
        @test !occursin("signal_time_values(signal)", time_plot)
        @test !occursin("Float64.(real.(signal.values))", time_plot)
        @test !occursin("Float64.(imag.(signal.values))", time_plot)
    end
end
