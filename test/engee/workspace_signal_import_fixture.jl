using Test

"""
Create a collision-free Signal Analyser workspace fixture through the public
Engee Genie API. Pass the returned names to
`cleanup_signal_analyser_workspace_fixture` in `finally`.
"""
function create_signal_analyser_workspace_fixture(
    engee_api;
    prefix::AbstractString,
)
    prefix_text = String(prefix)
    occursin(r"^[A-Za-z_][A-Za-z0-9_]{0,95}$", prefix_text) || error(
        "fixture prefix must be a bounded Julia identifier",
    )
    values = [
        "$(prefix_text)_real_short" => Float64[0.0, 0.5, -1.0, 0.25],
        "$(prefix_text)_real_long" => Float64[sinpi(index / 16) for index in 0:63],
        "$(prefix_text)_complex" => ComplexF64[
            1.0 + 0.0im,
            0.0 + 1.0im,
            -1.0 + 0.5im,
            0.25 - 0.75im,
        ],
    ]
    names = first.(values)
    any(name -> engee_api.genie.eval(
        "isdefined(Main, Symbol($(repr(name))))",
    ) !== false, names) && error("fixture binding already exists")

    created = String[]
    try
        for (name, value) in values
            result = engee_api.genie.send(name, value)
            getproperty(result, :status) == "change" || error(
                "unexpected Engee send status for $(name)",
            )
            received = engee_api.genie.recv(name; context = Main)
            typeof(received) === typeof(value) || error("fixture type mismatch for $(name)")
            received == value || error("fixture value mismatch for $(name)")
            push!(created, name)
        end
        return (
            names = names,
            sample_rate_hz = 2048.0,
            expected_lengths = Dict(name => length(value) for (name, value) in values),
        )
    catch
        cleanup_signal_analyser_workspace_fixture(engee_api, created)
        rethrow()
    end
end

"""Hide only fixture-owned workspace bindings from the application catalog."""
function cleanup_signal_analyser_workspace_fixture(engee_api, names)
    for name in names
        engee_api.genie.send(String(name), nothing)
        engee_api.genie.recv(String(name); context = Main) === nothing || error(
            "fixture cleanup failed for $(name)",
        )
    end
    true
end

function run_signal_analyser_workspace_fixture_contract(
    engee_api;
    prefix::AbstractString,
)
    fixture = create_signal_analyser_workspace_fixture(engee_api; prefix = prefix)
    try
        @test length(fixture.names) == 3
        @test fixture.sample_rate_hz == 2048.0
        @test sort!(collect(values(fixture.expected_lengths))) == [4, 4, 64]
        @test all(name -> engee_api.genie.eval(
            "isdefined(Main, Symbol($(repr(name))))",
        ) === true, fixture.names)
        fixture
    finally
        cleanup_signal_analyser_workspace_fixture(engee_api, fixture.names)
    end
end
