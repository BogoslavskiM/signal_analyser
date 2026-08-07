using Test

const C = Main.AppTestContext

@testset "app/routes.jl registration" begin
    routes_source = C.source("app", "routes.jl")
    routes = C.discovered_routes(routes_source)

    expected_routes = [
        (path = "/api/example", method = "POST"),
    ]

    @test routes == expected_routes
    @test occursin("example_api_handler!", routes_source)
end

@testset "app/api.jl example handler" begin
    state = C.make_api_test_state()

    @testset "normal request" begin
        response = C.example_api_handler!(state, Dict("value" => 10))

        @test response.status == 200
        @test response.body["success"] === true
        @test response.body["value"] == 10
        @test C.expected_api_state(state)
    end

    @testset "semantic validation error" begin
        response = C.example_api_handler!(state, Dict("value" => -1))

        @test response.status == 200
        @test response.body["success"] === false
        @test response.body["error"] == C.expected_validation_error()
    end

    @testset "wrong API type" begin
        response = C.example_api_handler!(state, Dict("value" => "wrong"))

        @test response.status == 500
        @test response.body["success"] === false
    end
end
