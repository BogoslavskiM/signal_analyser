module GenieRecvImportWrapperSerdeContractTests

using Test
using UUIDs

const OK_SEND_RESULT = "UInt8[0x4f, 0x4b]"
const EXPECTED_SMOOTHED = Float64[10 / 3, 2.5, 2.0, 2.0, 2.0, 0.0, 0.0]

quoted(value::AbstractString) = repr(String(value))

function unique_names()
    suffix = replace(string(uuid4()), "-" => "")
    (
        "__signal_analyser_import_wrapper_input_$(suffix)__",
        "__signal_analyser_import_wrapper_output_$(suffix)__",
    )
end

workspace_eval(engee_api, code::AbstractString) =
    engee_api.genie.eval(String(code))

workspace_recv(engee_api, name::AbstractString) =
    engee_api.genie.recv(String(name); context = Main)

function assert_send_ok(result)
    @test getproperty(result, :status) == "change"
    @test getproperty(result, :result) == OK_SEND_RESULT
end

function cleanup!(engee_api, names)
    for name in names
        assert_send_ok(engee_api.genie.send(name, nothing))
    end
    @test workspace_eval(
        engee_api,
        "[" * join(
            [
                "getfield(Main, Symbol($(quoted(name)))) === nothing"
                for name in names
            ],
            ",",
        ) * "]",
    ) == fill(true, length(names))
    nothing
end

function preprocessing_wrapper(
    input_name::AbstractString,
    output_name::AbstractString;
    import_in_wrapper::Bool,
)
    import_statement = import_in_wrapper ? "import EngeeDSP" : ""
    """
    $(import_statement)
    let init_signal = getfield(Main, Symbol($(quoted(input_name)))),
        __signal_sample_rate_hz__ = 2048.0
        try
            value = begin
                vec(first(EngeeDSP.Functions.smoothdata(init_signal, "movmean", 5)))
            end
            value isa AbstractVector || throw(ArgumentError("operation must return a vector"))
            2 <= length(value) <= 100000000 || throw(ArgumentError("bad length"))
            all(item -> item isa Number && !(item isa Bool), value) || throw(
                ArgumentError("not numeric")
            )
            operation_is_complex = !all(item -> item isa Real, value)
            normalized = operation_is_complex ? ComplexF64.(value) : Float64.(value)
            all(item -> isfinite(real(item)) && isfinite(imag(item)), normalized) || throw(
                ArgumentError("not finite")
            )
            global $(output_name) = normalized
            Int[1, length(normalized), operation_is_complex ? 1 : 0]
        catch err
            global $(output_name) = sprint(showerror, err)
            Int[0, 0, 0]
        end
    end
    """
end

function failing_wrapper(output_name::AbstractString)
    """
    let
        try
            error("intentional wire failure")
        catch err
            global $(output_name) = sprint(showerror, err)
            Int[0, 0, 0]
        end
    end
    """
end

"""
Persistent minimal reproducer for Engee 26.8.2-H2.

The documented public `genie.recv` contract accepts a workspace variable name,
not executable Julia code.  An invalid code-shaped name must not expose an
internal Serde deserialization failure.  Production returns a `MethodError`
value from Serde when `import EngeeDSP` and the preprocessing wrapper are
supplied as the name.  Keep this guard unchanged until Engee rejects the input
without the internal `deser` mismatch.
"""
function run_import_wrapper_serde_reproducer(engee_api)
    input_name, output_name = unique_names()
    names = (input_name, output_name)
    @test workspace_eval(
        engee_api,
        "[" * join(
            ["isdefined(Main, Symbol($(quoted(name))))" for name in names],
            ",",
        ) * "]",
    ) == fill(false, length(names))

    try
        assert_send_ok(engee_api.genie.send(
            input_name,
            Float64[0, 0, 10, 0, 0, 0, 0],
        ))
        wrapper = preprocessing_wrapper(
            input_name,
            output_name;
            import_in_wrapper = true,
        )
        result = engee_api.genie.recv(wrapper; context = Main)
        @test !(
            result isa MethodError &&
                occursin("deser(::Engee.Serde.PrimitiveType", sprint(showerror, result))
        )
        @test workspace_eval(
            engee_api,
            "isdefined(Main, Symbol($(quoted(output_name))))",
        ) === false
    finally
        cleanup!(engee_api, names)
    end
end

"""
Supported production shape and recovery gate.

The complete preprocessing wrapper is one `begin ... end` expression executed
through the documented public `genie.eval(code)` API.  The documented public
`genie.recv(name; context=Main)` API only reads the finished output binding.
The same contract also verifies metadata, whole and chunked output, error text
and scratch cleanup twice.
"""
function run_public_eval_supported_contract(engee_api)
    @testset "public eval executes wrapper and recv reads output" begin
        for repetition in 1:2
            input_name, output_name = unique_names()
            names = (input_name, output_name)
            try
                assert_send_ok(engee_api.genie.send(
                    input_name,
                    Float64[0, 0, 10, 0, 0, 0, 0],
                ))
                metadata = workspace_eval(
                    engee_api,
                    "begin\n" * preprocessing_wrapper(
                        input_name,
                        output_name;
                        import_in_wrapper = true,
                    ) * "\nend",
                )
                @test metadata == Int[1, 7, 0]
                @test workspace_recv(engee_api, output_name) == EXPECTED_SMOOTHED
                @test workspace_eval(
                    engee_api,
                    "getfield(Main, Symbol($(quoted(output_name))))[2:4]",
                ) == EXPECTED_SMOOTHED[2:4]

                error_metadata = workspace_eval(
                    engee_api,
                    failing_wrapper(output_name),
                )
                @test error_metadata == Int[0, 0, 0]
                @test workspace_recv(engee_api, output_name) ==
                    "intentional wire failure"
            finally
                cleanup!(engee_api, names)
            end
        end
    end
    nothing
end

run_split_import_supported_contract(engee_api) =
    run_public_eval_supported_contract(engee_api)

end
