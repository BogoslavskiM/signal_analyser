using Test

include(joinpath(@__DIR__, "..", "..", "lib", "helpers.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "domain", "example_model.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "persistence", "storage.jl"))
include(joinpath(@__DIR__, "..", "..", "lib", "services", "example_service.jl"))

@testset "example_project backend" begin
    include("lib/example_service_test.jl")
end

