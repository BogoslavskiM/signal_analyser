using Test

"""
Run the production Engee workspace contract required by Save Workspace.

`scratch_name` must identify an existing binding in the Engee workspace.  The
test restores both its value and concrete type in `finally`; callers that
create a unique binding for the run remain responsible for removing that
binding after the test returns.
"""
function run_engee_workspace_dictionary_contract_tests(
    engee_api;
    context::Module = Main,
    scratch_name::AbstractString,
)
    preflight() = engee_api.genie.eval(
        "isdefined(Main, Symbol($(repr(String(scratch_name)))))",
    )
    preflight() === true || error(
        "scratch binding $(scratch_name) must exist before the contract run",
    )
    original = engee_api.genie.recv(scratch_name; context = context)

    @testset "HND-0665 Engee workspace dictionary export contract" begin
        try
            @test preflight() === true

            for scenario in (
                (
                    name = "one selected real signal",
                    value = Float64[0.0, -2.5, 3.25, 1.0e-12],
                    expected_type = Vector{Float64},
                ),
                (
                    name = "one selected complex signal",
                    value = ComplexF64[1.0 + 2.0im, -3.5 - 4.25im, 0.0 + 0.0im],
                    expected_type = Vector{ComplexF64},
                ),
            )
                send_result = engee_api.genie.send(scratch_name, scenario.value)
                received = engee_api.genie.recv(scratch_name; context = context)
                @test received isa scenario.expected_type
                @test typeof(received) === scenario.expected_type
                @test received == scenario.value
                @test getproperty(send_result, :status) == "change"
                @test preflight() === true
            end

            mixed_signals = Dict{String,Any}(
                "Original real signal" => Float64[1.25, -0.0, 4.5],
                "Original complex signal" => ComplexF64[
                    1.0 + 2.0im,
                    -3.5 - 4.25im,
                    0.0 + 0.0im,
                ],
            )
            send_result = engee_api.genie.send(scratch_name, mixed_signals)
            received = engee_api.genie.recv(scratch_name; context = context)

            @test typeof(received) === Dict{String,Any}
            @test Set(keys(received)) == Set(keys(mixed_signals))
            @test typeof(received["Original real signal"]) === Vector{Float64}
            @test typeof(received["Original complex signal"]) === Vector{ComplexF64}
            @test received == mixed_signals
            @test getproperty(send_result, :status) == "change"
            @test preflight() === true

            replacement = Dict{String,Any}(
                "Original real signal" => Float64[-7.0],
                "Original complex signal" => ComplexF64[8.0 - 9.0im],
            )
            overwrite_result = engee_api.genie.send(scratch_name, replacement)
            overwritten = engee_api.genie.recv(scratch_name; context = context)
            @test typeof(overwritten) === Dict{String,Any}
            @test overwritten == replacement
            @test overwritten != mixed_signals
            @test getproperty(overwrite_result, :status) == "change"
            @test preflight() === true
        finally
            engee_api.genie.send(scratch_name, original)
        end

        restored = engee_api.genie.recv(scratch_name; context = context)
        @test restored == original
        @test typeof(restored) === typeof(original)
        @test preflight() === true

        missing_name = String(scratch_name) * "_missing"
        missing_preflight() = engee_api.genie.eval(
            "isdefined(Main, Symbol($(repr(missing_name))))",
        )
        @test missing_preflight() === false
        @test engee_api.genie.recv(missing_name; context = context) === Nothing
        @test missing_preflight() === false
    end
end
