@testset "example payload" begin
    payload = example_payload()

    @test haskey(payload, "items")
    @test length(payload["items"]) == 2
    @test payload["items"][1]["score"] == 0.25
end

