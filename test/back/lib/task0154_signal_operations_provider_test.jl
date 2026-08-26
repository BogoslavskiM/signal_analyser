using Test

const TASK0154_PROVIDER = Main.AppTestContext

"""Run the generated remote wrapper in an isolated Main binding.

The provider's transport is an Engee boundary; this test deliberately checks the
generated code which Engee executes.  It therefore catches a package import or
formula regression without requiring an Engee runtime in the unit suite.
"""
function task0154_execute_wrapper(values, command)
    suffix = replace(string(TASK0154_PROVIDER.UUIDs.uuid4()), "-" => "")
    input_name = "__task0154_input_$(suffix)__"
    output_name = "__task0154_output_$(suffix)__"
    body = TASK0154_PROVIDER.signal_operation_builtin_body(command)
    wrapper = TASK0154_PROVIDER.signal_operation_wrapper(
        input_name,
        output_name,
        body;
        import_engee_dsp = command.operation == "fft",
    )
    TASK0154_PROVIDER.signal_operation_preflight_wrapper(wrapper)
    Core.eval(Main, Expr(:(=), Symbol(input_name), copy(values)))
    try
        # Julia 1.12 evaluates the generated wrapper in a newer Main world;
        # dispatch through invokelatest in the test harness only. Production
        # Engee execution owns its independent transport/world boundary.
        metadata = Base.invokelatest(Core.eval, Main, Meta.parse(wrapper))
        result = getfield(Main, Symbol(output_name))
        metadata, result, wrapper
    finally
        Core.eval(Main, Expr(:(=), Symbol(input_name), nothing))
        Core.eval(Main, Expr(:(=), Symbol(output_name), nothing))
    end
end

function task0154_command(operation; multiplier = nothing, body = nothing)
    TASK0154_PROVIDER.DeriveSignalCommand(
        0,
        "source-id",
        operation,
        "derived",
        false,
        multiplier,
        body,
    )
end

@testset "TASK-0154 Engee operation wrapper executes all visible mathematical operations without EngeeDSP" begin
    real_values = [-4.0, -1.0, 0.0, 9.0]
    complex_values = ComplexF64[1 + 2im, -3 + 4im, 2 - im]
    cases = [
        ("abs", real_values, nothing, nothing, [4.0, 1.0, 0.0, 9.0]),
        ("square", real_values, nothing, nothing, [16.0, 1.0, 0.0, 81.0]),
        ("sqrt", [0.0, 1.0, 4.0], nothing, nothing, [0.0, 1.0, 2.0]),
        ("signed_sqrt_abs", real_values, nothing, nothing, [-2.0, -1.0, 0.0, 3.0]),
        ("multiply", real_values, -0.5, nothing, [2.0, 0.5, -0.0, -4.5]),
        ("custom", real_values, nothing, "reverse(init_signal)", [9.0, 0.0, -1.0, -4.0]),
        ("abs", complex_values, nothing, nothing, abs.(complex_values)),
        ("square", complex_values, nothing, nothing, complex_values .^ 2),
        ("sqrt", complex_values, nothing, nothing, sqrt.(complex_values)),
        ("multiply", complex_values, 2.0, nothing, complex_values .* 2.0),
        ("custom", complex_values, nothing, "conj.(init_signal)", conj.(complex_values)),
    ]

    for (operation, values, multiplier, body, expected) in cases
        command = task0154_command(operation; multiplier = multiplier, body = body)
        metadata, result, wrapper = task0154_execute_wrapper(values, command)
        @test metadata.ok === true
        @test metadata.length == length(expected)
        @test result == ComplexF64.(expected)
        @test !occursin("import EngeeDSP", wrapper)
    end

    fft = task0154_command("fft")
    @test occursin("import EngeeDSP", TASK0154_PROVIDER.signal_operation_wrapper(
        "input", "output", TASK0154_PROVIDER.signal_operation_builtin_body(fft);
        import_engee_dsp = true,
    ))
end

@testset "TASK-0154 typed source guards reject incompatible roots before transport" begin
    real_source = TASK0154_PROVIDER.AnalysedSignal("negative", "#2563eb", 10.0, [-1.0, 4.0], true, false)
    complex_source = TASK0154_PROVIDER.AnalysedSignal("complex", "#dc2626", 10.0, ComplexF64[1 + im, 2 - im], true, true)

    sqrt_error = try
        TASK0154_PROVIDER.signal_operation_validate_source(real_source, task0154_command("sqrt"))
        nothing
    catch err
        err
    end
    @test sqrt_error isa TASK0154_PROVIDER.SignalOperationProviderError
    @test sqrt_error.code == "incompatible_signal_values"

    signed_error = try
        TASK0154_PROVIDER.signal_operation_validate_source(complex_source, task0154_command("signed_sqrt_abs"))
        nothing
    catch err
        err
    end
    @test signed_error isa TASK0154_PROVIDER.SignalOperationProviderError
    @test signed_error.code == "incompatible_signal_type"
end
