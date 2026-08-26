using Test

const TASK0154_PROVIDER = Main.AppTestContext

@testset "TASK-0154 V59 provider uses public EngeeDSP preprocessing calls only" begin
    source = TASK0154_PROVIDER.source("lib", "adapters", "engee_signal_operation_provider.jl")
    @test occursin("command.operation_kind == \"preprocess\"", source)
    for public_call in (
        "EngeeDSP.Functions.bandpass", "EngeeDSP.Functions.bandstop",
        "EngeeDSP.Functions.highpass", "EngeeDSP.Functions.lowpass",
        "EngeeDSP.Functions.detrend", "EngeeDSP.Functions.interp1",
        "EngeeDSP.Functions.movmean", "EngeeDSP.Functions.movmedian",
        "EngeeDSP.Functions.fillgaps", "EngeeDSP.Functions.smoothdata",
        "EngeeDSP.Functions.envelope", "EngeeDSP.Functions.resample",
    )
        @test occursin(public_call, source)
    end
    @test !occursin("wdenoise", source) && !occursin("KNN", source) && !occursin("knn", source)
    @test !occursin("signed_sqrt", source) && !occursin("init_signal .^ 2", source) && !occursin("fft(init_signal", source)
    @test occursin("command.operation == \"custom-preprocess\" && return command.body", source)
end

@testset "TASK-0154 V59 provider guards known Engee endpoint defects before transport" begin
    source = TASK0154_PROVIDER.source("lib", "adapters", "engee_signal_operation_provider.jl")
    @test occursin("factor in (0.0, 1.0)", source) # smoothdata endpoint values
    @test occursin("parameters.filter_order === nothing", source) # envelope FIR overload
    @test occursin("value === nothing && throw(SignalOperationProviderError", source) # envelope RMS/peak automatic overload
    @test occursin("result is outside source time domain", source) # rate-resample domain
    @test occursin("signal_operation_validate_source(source, command)", source)
    @test occursin("signal_operation_preflight_wrapper(wrapper)", source)
end
