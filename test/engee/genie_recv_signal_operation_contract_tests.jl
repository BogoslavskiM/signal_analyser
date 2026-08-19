module GenieRecvSignalOperationContractTests

using Test
using UUIDs

const OK_SEND_RESULT = "UInt8[0x4f, 0x4b]"
const DEFAULT_CHUNK_SAMPLES = 50_000
const LARGE_SEND_REPRODUCER_SAMPLES = 521_000

workspace_eval(engee_api, code::AbstractString) =
    engee_api.genie.recv(String(code); context = Main)

quoted(value::AbstractString) = repr(String(value))

function workspace_defined(engee_api, name::AbstractString)
    workspace_eval(
        engee_api,
        "isdefined(Main, Symbol(" * quoted(name) * "))",
    ) === true
end

function workspace_is_nothing(engee_api, name::AbstractString)
    workspace_eval(
        engee_api,
        "isdefined(Main, Symbol(" * quoted(name) * ")) && " *
        "getfield(Main, Symbol(" * quoted(name) * ")) === nothing",
    ) === true
end

function assert_send_ok(send_result)
    @test getproperty(send_result, :status) == "change"
    # `status == "change"` alone is not sufficient: production Engee also
    # reports it when the embedded result contains an HTTP 500 error.
    @test getproperty(send_result, :result) == OK_SEND_RESULT
end

function cleanup_workspace_values(engee_api, names)
    for name in names
        engee_api.genie.send(name, nothing)
    end
    nothing
end

function unique_names(count::Integer)
    suffix = replace(string(uuid4()), "-" => "")
    ["__signal_analyser_recv_contract_$(suffix)_$(index)__" for index in 1:count]
end

function tagged_wrapper(input_name::AbstractString, operation_body::AbstractString)
    """
    let init_signal = getfield(Main, Symbol($(quoted(input_name))))
        try
            value = begin
                $(String(operation_body))
            end
            value isa AbstractVector || throw(ArgumentError("operation must return a vector"))
            (ok=true, value=collect(value), error_type="", error_message="")
        catch err
            (ok=false, value=nothing, error_type=string(typeof(err)), error_message=sprint(showerror, err))
        end
    end
    """
end

"""
Store `values` in the Engee workspace without sending a single expression
large enough to hit the production parser limit.  Only generated identifiers
are interpolated into executable code; data travels through `genie.send`.
"""
function send_chunked!(
    engee_api,
    accumulator_name::AbstractString,
    chunk_name::AbstractString,
    values::AbstractVector;
    chunk_samples::Integer = DEFAULT_CHUNK_SAMPLES,
)
    chunk_samples > 0 || throw(ArgumentError("chunk_samples must be positive"))
    isempty(values) && throw(ArgumentError("values must not be empty"))

    total = length(values)
    for lo in 1:chunk_samples:total
        hi = min(total, lo + chunk_samples - 1)
        send_result = engee_api.genie.send(chunk_name, collect(@view values[lo:hi]))
        assert_send_ok(send_result)

        assignment = if lo == 1
            """
            begin
                chunk = getfield(Main, Symbol($(quoted(chunk_name))))
                global $(accumulator_name) = Vector{eltype(chunk)}(undef, $(total))
                $(accumulator_name)[$(lo):$(hi)] = chunk
                $(hi)
            end
            """
        else
            """
            begin
                chunk = getfield(Main, Symbol($(quoted(chunk_name))))
                $(accumulator_name)[$(lo):$(hi)] = chunk
                $(hi)
            end
            """
        end
        @test workspace_eval(engee_api, assignment) == hi
        engee_api.genie.send(chunk_name, nothing)
    end
    @test workspace_eval(
        engee_api,
        "length(getfield(Main, Symbol(" * quoted(accumulator_name) * ")))",
    ) == total
    nothing
end

function execute_to_workspace!(
    engee_api,
    input_name::AbstractString,
    output_name::AbstractString,
    operation_body::AbstractString,
)
    code = """
    let init_signal = getfield(Main, Symbol($(quoted(input_name))))
        try
            value = begin
                $(String(operation_body))
            end
            value isa AbstractVector || throw(ArgumentError("operation must return a vector"))
            global $(output_name) = collect(value)
            (
                ok=true,
                length=length(value),
                eltype=string(eltype(value)),
                error_type="",
                error_message="",
            )
        catch err
            (
                ok=false,
                length=0,
                eltype="",
                error_type=string(typeof(err)),
                error_message=sprint(showerror, err),
            )
        end
    end
    """
    workspace_eval(engee_api, code)
end

function recv_chunked(
    engee_api,
    output_name::AbstractString,
    total::Integer;
    chunk_samples::Integer = DEFAULT_CHUNK_SAMPLES,
)
    chunks = Vector{Any}()
    for lo in 1:chunk_samples:total
        hi = min(total, lo + chunk_samples - 1)
        push!(
            chunks,
            workspace_eval(
                engee_api,
                "getfield(Main, Symbol(" * quoted(output_name) * "))[$(lo):$(hi)]",
            ),
        )
    end
    reduce(vcat, chunks)
end

"""
Run the supported production contract for custom signal operations.

Cleanup uses the only public Engee primitive available for workspace values:
`genie.send(name, nothing)`.  The value is released, while Julia keeps a
binding tombstone whose value is `nothing`; callers must therefore always use
fresh UUID-backed identifiers and reject every pre-existing binding.
"""
function run_supported_contract(engee_api; large_samples::Integer = 600_000)
    direct_input, chunk_input, chunk_stage, chunk_output = unique_names(4)
    names = (direct_input, chunk_input, chunk_stage, chunk_output)
    @test all(name -> !workspace_defined(engee_api, name), names)

    report = nothing
    try
        @testset "recv expression wrapper and exact result types" begin
            real_values = Float64[2.0, -3.0, 0.25]
            assert_send_ok(engee_api.genie.send(direct_input, real_values))
            real_result = workspace_eval(
                engee_api,
                tagged_wrapper(direct_input, "init_signal .^ 2"),
            )
            @test real_result.ok === true
            @test typeof(real_result.value) === Vector{Float64}
            @test real_result.value == real_values .^ 2

            complex_values = ComplexF64[1.0 + 2.0im, -3.0 + 4.0im]
            assert_send_ok(engee_api.genie.send(direct_input, complex_values))
            complex_result = workspace_eval(
                engee_api,
                tagged_wrapper(direct_input, "init_signal .^ 2"),
            )
            @test complex_result.ok === true
            @test typeof(complex_result.value) === Vector{ComplexF64}
            @test complex_result.value == complex_values .^ 2

            runtime_error = workspace_eval(
                engee_api,
                tagged_wrapper(direct_input, "error(\"tagged contract error\")"),
            )
            @test runtime_error.ok === false
            @test runtime_error.value === nothing
            @test runtime_error.error_type == "ErrorException"
            @test runtime_error.error_message == "tagged contract error"

            nonvector = workspace_eval(
                engee_api,
                tagged_wrapper(direct_input, "sum(init_signal)"),
            )
            @test nonvector.ok === false
            @test nonvector.error_type == "ArgumentError"
            @test occursin("must return a vector", nonvector.error_message)

            @test workspace_eval(engee_api, "1 + 2") == 3
            raw_error = workspace_eval(engee_api, "error(\"raw recv error\")")
            @test raw_error isa Exception

            delayed = nothing
            elapsed = @elapsed begin
                delayed = workspace_eval(engee_api, "sleep(0.05); [42.0]")
            end
            @test delayed == [42.0]
            @test elapsed >= 0.04
        end

        @testset "chunked operation beyond monolithic send boundary" begin
            large_samples > LARGE_SEND_REPRODUCER_SAMPLES || throw(ArgumentError(
                "large_samples must exceed the observed monolithic send boundary",
            ))
            values = collect(range(-1.0, 1.0; length = large_samples))
            send_chunked!(engee_api, chunk_input, chunk_stage, values)
            metadata = execute_to_workspace!(
                engee_api,
                chunk_input,
                chunk_output,
                "init_signal .* 2",
            )
            @test metadata.ok === true
            @test metadata.length == large_samples
            @test metadata.eltype == "Float64"

            actual = recv_chunked(engee_api, chunk_output, metadata.length)
            @test typeof(actual) === Vector{Float64}
            @test actual == values .* 2
            report = (
                passed = true,
                large_samples,
                chunk_samples = DEFAULT_CHUNK_SAMPLES,
                output_type = string(typeof(actual)),
            )
        end
    finally
        cleanup_workspace_values(engee_api, names)
    end

    @test all(name -> workspace_is_nothing(engee_api, name), names)
    report
end

"""
Run the exact TASK-0115 built-in FFT and square-root contracts.

The FFT result is deliberately normalized to `ComplexF64`, because the public
`EngeeDSP.Functions.fft` implementation returns `Vector{Float64}` when every
coefficient happens to be exactly real and `Vector{ComplexF64}` otherwise.
TASK-0115 exposes one predictable FFT signal type instead of inheriting that
data-dependent representation.

Plain square root follows Julia/Engee typed semantics: a negative real input is
rejected instead of being silently promoted to complex.  An explicitly
complex source uses the principal complex square root.  Signed square root is
the real-only `sqrt(abs(x)) * sign(x)` operation documented by the Engee Sqrt
block and rejects complex inputs.
"""
function run_builtin_operation_contract(engee_api)
    fft_real, fft_complex, sqrt_nonnegative, sqrt_negative, sqrt_complex =
        unique_names(5)
    names = (
        fft_real,
        fft_complex,
        sqrt_nonnegative,
        sqrt_negative,
        sqrt_complex,
    )
    @test all(name -> !workspace_defined(engee_api, name), names)

    report = nothing
    try
        @test workspace_eval(engee_api, "begin; import EngeeDSP; true; end") === true

        @testset "EngeeDSP full forward FFT" begin
            real_values = Float64[0.0, 1.0, 0.0, 0.0]
            complex_values = ComplexF64[
                1.0 + 1.0im,
                2.0 - 1.0im,
                -1.0 + 0.5im,
                0.0 - 2.0im,
            ]
            assert_send_ok(engee_api.genie.send(fft_real, real_values))
            assert_send_ok(engee_api.genie.send(fft_complex, complex_values))

            real_fft = workspace_eval(
                engee_api,
                tagged_wrapper(
                    fft_real,
                    "ComplexF64.(EngeeDSP.Functions.fft(init_signal))",
                ),
            )
            @test real_fft.ok === true
            @test typeof(real_fft.value) === Vector{ComplexF64}
            @test real_fft.value == ComplexF64[1.0, -1.0im, -1.0, 1.0im]
            @test length(real_fft.value) == length(real_values)

            complex_fft = workspace_eval(
                engee_api,
                tagged_wrapper(
                    fft_complex,
                    "ComplexF64.(EngeeDSP.Functions.fft(init_signal))",
                ),
            )
            @test complex_fft.ok === true
            @test typeof(complex_fft.value) === Vector{ComplexF64}
            @test length(complex_fft.value) == length(complex_values)
            @test complex_fft.value == ComplexF64[
                2.0 - 1.5im,
                3.0 - 1.5im,
                -2.0 + 4.5im,
                1.0 + 2.5im,
            ]

            constant_fft = workspace_eval(
                engee_api,
                "EngeeDSP.Functions.fft(fill(1.0, 4))",
            )
            @test constant_fft == [4.0, 0.0, 0.0, 0.0]
            @test first(constant_fft) == 4.0 # No forward 1/N normalization.

            real_roundtrip = workspace_eval(
                engee_api,
                "EngeeDSP.Functions.ifft(EngeeDSP.Functions.fft(" *
                "getfield(Main, Symbol(" * quoted(fft_real) * "))))",
            )
            complex_roundtrip = workspace_eval(
                engee_api,
                "EngeeDSP.Functions.ifft(EngeeDSP.Functions.fft(" *
                "getfield(Main, Symbol(" * quoted(fft_complex) * "))))",
            )
            @test real_roundtrip == real_values
            @test complex_roundtrip == complex_values
        end

        @testset "plain and signed square-root semantics" begin
            nonnegative_values = Float64[0.0, -0.0, 1.0, 4.0, 9.0]
            negative_values = Float64[-4.0, -0.0, 0.0, 9.0]
            complex_values = ComplexF64[-1.0 + 0.0im, 3.0 + 4.0im, 0.0 - 4.0im]
            assert_send_ok(engee_api.genie.send(sqrt_nonnegative, nonnegative_values))
            assert_send_ok(engee_api.genie.send(sqrt_negative, negative_values))
            assert_send_ok(engee_api.genie.send(sqrt_complex, complex_values))

            plain_expression = """
            begin
                if eltype(init_signal) <: Real
                    any(x -> x < 0, init_signal) && throw(DomainError(
                        minimum(init_signal),
                        "plain sqrt requires non-negative real input",
                    ))
                end
                sqrt.(init_signal)
            end
            """
            signed_expression = """
            begin
                eltype(init_signal) <: Real || throw(ArgumentError(
                    "signed sqrt requires real input",
                ))
                sqrt.(abs.(init_signal)) .* sign.(init_signal)
            end
            """

            plain_nonnegative = workspace_eval(
                engee_api,
                tagged_wrapper(sqrt_nonnegative, plain_expression),
            )
            @test plain_nonnegative.ok === true
            @test typeof(plain_nonnegative.value) === Vector{Float64}
            @test plain_nonnegative.value == Float64[0.0, -0.0, 1.0, 2.0, 3.0]

            plain_negative = workspace_eval(
                engee_api,
                tagged_wrapper(sqrt_negative, plain_expression),
            )
            @test plain_negative.ok === false
            @test plain_negative.error_type == "DomainError"
            @test occursin("non-negative real input", plain_negative.error_message)

            plain_complex = workspace_eval(
                engee_api,
                tagged_wrapper(sqrt_complex, plain_expression),
            )
            @test plain_complex.ok === true
            @test typeof(plain_complex.value) === Vector{ComplexF64}
            @test all(isapprox.(
                plain_complex.value,
                ComplexF64[
                    0.0 + 1.0im,
                    2.0 + 1.0im,
                    sqrt(2.0) - sqrt(2.0)im,
                ];
                rtol = 8eps(Float64),
                atol = 0.0,
            ))

            signed_real = workspace_eval(
                engee_api,
                tagged_wrapper(sqrt_negative, signed_expression),
            )
            @test signed_real.ok === true
            @test typeof(signed_real.value) === Vector{Float64}
            @test signed_real.value == Float64[-2.0, -0.0, 0.0, 3.0]

            signed_complex = workspace_eval(
                engee_api,
                tagged_wrapper(sqrt_complex, signed_expression),
            )
            @test signed_complex.ok === false
            @test signed_complex.error_type == "ArgumentError"
            @test occursin("requires real input", signed_complex.error_message)

            report = (
                passed = true,
                fft_function = "EngeeDSP.Functions.fft",
                fft_output_type = "Vector{ComplexF64}",
                fft_output_length = "same as input",
                fft_topology = "full unshifted DFT",
                fft_normalization = "unnormalized forward; inverse divides by N",
                plain_sqrt_negative_real = "DomainError",
                plain_sqrt_complex = "principal complex square root",
                signed_sqrt_complex = "ArgumentError",
            )
        end
    finally
        cleanup_workspace_values(engee_api, names)
    end

    @test all(name -> workspace_is_nothing(engee_api, name), names)
    report
end

"""
Persistent minimal reproducer for the production `genie.send` size defect.

The official contract says `value::Any` is stored and does not document a
size limit.  On the tested production runtime, 521000 deterministic Float64
values return `status == "change"` but embed HTTP 500 `syntax: expression too
large`, and the binding cannot be received.  Keep the expected contract below
unchanged: this test must fail until the provider behavior is fixed.
"""
function run_large_send_reproducer(
    engee_api;
    sample_count::Integer = LARGE_SEND_REPRODUCER_SAMPLES,
)
    name = only(unique_names(1))
    @test !workspace_defined(engee_api, name)
    expected = collect(range(-1.0, 1.0; length = sample_count))
    try
        send_result = engee_api.genie.send(name, expected)
        @test getproperty(send_result, :status) == "change"
        @test getproperty(send_result, :result) == OK_SEND_RESULT
        actual = engee_api.genie.recv(name; context = Main)
        @test typeof(actual) === Vector{Float64}
        @test actual == expected
    finally
        engee_api.genie.send(name, nothing)
    end
end

end
