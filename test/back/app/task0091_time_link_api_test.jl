using Test

const TASK0091_TIME_LINK_API = Main.AppTestContext

@testset "TASK-0091 settings and layout API retain Display-scoped time-link boundary" begin
    routes = TASK0091_TIME_LINK_API.source("app", "routes.jl")
    api = TASK0091_TIME_LINK_API.source("app", "api.jl")

    @test occursin("route(\"/api/settings\", method = POST)", routes)
    @test occursin("route(\"/api/layouts\", method = POST)", routes)
    @test occursin("apply_signal_setting!", routes)
    @test occursin("apply_signal_analyser_layout!", routes)
    @test occursin("display_id", api)
end
