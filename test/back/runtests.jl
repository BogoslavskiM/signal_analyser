using Test

include(joinpath(@__DIR__, "..", "..", "lib", "helpers.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "domain", "example_model.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "domain", "signal_analyser_state.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "domain", "signal_session.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "persistence", "storage.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "persistence", "signal_package_archive.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "example_service.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "signal_analyser_math.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "signal_analyser_service.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "signal_session_service.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "signal_package_service.jl"))
include("support/test_context.jl")

@testset "example_project backend" begin
    include("lib/example_service_test.jl")
end

for test_file in sort(filter(name -> endswith(name, "_test.jl"), readdir(joinpath(@__DIR__, "lib"); join = true)))
    basename(test_file) == "example_service_test.jl" || include(test_file)
end

for test_file in sort(filter(name -> endswith(name, "_test.jl"), readdir(joinpath(@__DIR__, "app"); join = true)))
    include(test_file)
end
