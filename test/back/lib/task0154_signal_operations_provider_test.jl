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

@testset "TASK-0154 502 retry is read-only, bounded and sanitized" begin
    calls = Ref(0)
    read_once_then_value = function (_; context)
        calls[] += 1
        calls[] == 1 ? ErrorException("temporary recv response") : :confirmed
    end
    @test TASK0154_PROVIDER.signal_operation_recv(read_once_then_value, "read"; retry_safe = true) === :confirmed
    @test calls[] == 2

    calls[] = 0
    always_exception = function (_; context)
        calls[] += 1
        ErrorException("persistent recv response")
    end
    error = try
        TASK0154_PROVIDER.signal_operation_recv(always_exception, "read"; retry_safe = true)
        nothing
    catch caught
        caught
    end
    @test error isa TASK0154_PROVIDER.SignalOperationProviderError
    @test error.code == "engee_transport_error" && calls[] == 2

    calls[] = 0
    thrown_transport = function (_; context)
        calls[] += 1
        throw(ErrorException("transport threw"))
    end
    thrown = try
        TASK0154_PROVIDER.signal_operation_recv(thrown_transport, "read"; retry_safe = true)
        nothing
    catch caught
        caught
    end
    @test thrown isa TASK0154_PROVIDER.SignalOperationProviderError
    @test thrown.code == "engee_transport_error" && calls[] == 1

    calls[] = 0
    default_read = function (_; context)
        calls[] += 1
        ErrorException("default is one-shot")
    end
    default_error = try
        TASK0154_PROVIDER.signal_operation_recv(default_read, "write-or-wrapper")
        nothing
    catch caught
        caught
    end
    @test default_error isa TASK0154_PROVIDER.SignalOperationProviderError
    @test calls[] == 1

    source = TASK0154_PROVIDER.source("lib", "adapters", "engee_signal_operation_provider.jl")
    @test occursin("signal_operation_recv(receive, assignment) == last_index", source)
    @test occursin("metadata = signal_operation_recv(receive, wrapper)", source)
    @test occursin("retry_safe = true", source)
end

@testset "TASK-0154 wrapper metadata is Serde-safe and external errors are sanitized" begin
    source = TASK0154_PROVIDER.source("lib", "adapters", "engee_signal_operation_provider.jl")
    wrapper_start = first(findfirst("function signal_operation_wrapper", source))
    wrapper_end = first(findfirst("function signal_operation_parse_has_error", source))
    wrapper = source[wrapper_start:wrapper_end]
    execute_start = first(findfirst("function signal_operation_execute", source))
    execute = source[execute_start:end]

    @test occursin("Int[1, length(normalized), operation_is_complex ? 1 : 0]", wrapper)
    @test occursin("global \$(output_name) = normalized", wrapper)
    @test occursin("global \$(output_name) = sprint(showerror, err)", wrapper)
    @test occursin("Int[0, 0, 0]", wrapper)
    @test !occursin("NamedTuple", wrapper) && !occursin("Dict", wrapper)

    @test occursin("metadata isa AbstractVector && length(metadata) == 3", execute)
    @test occursin("value isa Integer && !(value isa Bool)", execute)
    @test occursin("status_flag in (0, 1) && complex_flag in (0, 1)", execute)
    @test occursin("metadata = signal_operation_recv(receive, wrapper)", execute)
    @test !occursin("metadata = signal_operation_recv(receive, wrapper, retry_safe = true)", execute)
    @test occursin("value isa AbstractString ? String(value)", execute)
    @test occursin("SignalOperationProviderError(\n                \"operation_failed\",\n                \"Операция не выполнена в Engee\"", execute)
    @test !occursin("remote_error,\n            )", execute)
end
