using Test

"""
Run the production Engee workspace and portable ZIP primitives required by a
Signal Analyser package.

`scratch_name` must name an existing, non-constant binding in `context`.  The
test snapshots that value and restores it in `finally`, so it does not create
or leave a contract-test workspace variable.  Callers are responsible for
supplying the public lowercase `engee` API and the loaded `ZipFile` module.
"""
function run_engee_session_bundle_contract_tests(
    engee_api,
    zip_file;
    context::Module = Main,
    scratch_name::AbstractString,
)
    scratch_symbol = Symbol(scratch_name)
    isdefined(context, scratch_symbol) || error(
        "scratch binding $(scratch_name) must exist before the contract run",
    )
    Base.isconst(context, scratch_symbol) && error(
        "scratch binding $(scratch_name) must be mutable",
    )
    original = getfield(context, scratch_symbol)

    @testset "Signal Analyser portable Engee session bundle contract" begin
      @testset "Engee Genie workspace portable signal values" begin
        try
            scenarios = (
                (
                    name = "real vector",
                    value = Float64[0.0, -2.5, 3.25, 1.0e-12],
                    expected_type = Vector{Float64},
                ),
                (
                    name = "complex vector",
                    value = ComplexF64[1.0 + 2.0im, -3.5 - 4.25im, 0.0 + 0.0im],
                    expected_type = Vector{ComplexF64},
                ),
                (
                    name = "uniform timed complex vector",
                    value = (
                        time = Float64[0.0, 0.25, 0.5],
                        value = ComplexF64[1.0 + 0.5im, -2.0im, 3.0 - 4.0im],
                    ),
                    expected_type = NamedTuple{
                        (:time, :value),
                        Tuple{Vector{Float64},Vector{ComplexF64}},
                    },
                ),
            )

            for scenario in scenarios
                send_result = engee_api.genie.send(scratch_name, scenario.value)
                received = engee_api.genie.recv(scratch_name; context = context)
                @test received isa scenario.expected_type
                @test received == scenario.value
                @test getproperty(send_result, :status) == "change"
            end

            missing_name = "__signal_analyser_contract_missing_82e87675__"
            @test !isdefined(context, Symbol(missing_name))
            @test engee_api.genie.recv(missing_name; context = context) === Nothing
        finally
            engee_api.genie.send(scratch_name, original)
        end
        @test getfield(context, scratch_symbol) == original
        @test typeof(getfield(context, scratch_symbol)) === typeof(original)
      end

      @testset "ZipFile in-memory portable package primitive" begin
        payloads = [
            "manifest.json" => Vector{UInt8}(codeunits("{\"schema\":\"signal-analyser-package\",\"version\":1}")),
            "signals/real.csv" => Vector{UInt8}(codeunits("time_s,real,imag\n0.0,1.0,0.0\n")),
            "scripts/reproduce.jl" => Vector{UInt8}(codeunits("using DelimitedFiles\n")),
        ]

        buffer = IOBuffer()
        writer = zip_file.Writer(buffer)
        try
            for (name, bytes) in payloads
                entry = zip_file.addfile(writer, name; method = zip_file.Deflate)
                write(entry, bytes)
            end
        finally
            close(writer)
        end

        seekstart(buffer)
        reader = zip_file.Reader(buffer)
        try
            @test [entry.name for entry in reader.files] == first.(payloads)
            for (entry, (_, expected)) in zip(reader.files, payloads)
                @test read(entry) == expected
            end
        finally
            close(reader)
        end
      end
    end
end
