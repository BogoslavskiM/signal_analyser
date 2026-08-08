using Test

const V5_OUTPUT_API = Main.AppTestContext

@testset "TASK-0086 /api/state-lite and /api/outputs/active preserve the v5 pane boundary" begin
    routes = V5_OUTPUT_API.source("app", "routes.jl")
    output_service = V5_OUTPUT_API.source("lib", "services", "signal_output_service.jl")

    @test length(collect(eachmatch(r"route\(\"/api/state-lite\", method = GET\)", routes))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/outputs/active\", method = GET\)", routes))) == 1
    @test occursin("signal_analyser_state_lite_api_payload(SIGNAL_ANALYSER_STATE)", routes)
    @test occursin("signal_analyser_active_output(", routes)
    @test occursin("params(:display_id)", routes) && occursin("params(:pane_id)", routes) &&
        occursin("String(display_id)", routes) && occursin("String(pane_id)", routes)
    @test occursin("signal_analyser_inactive_output_response", routes)
    @test occursin("signal_analyser_layout_entries_lite_payload", output_service)
    @test occursin("for pane in layout.panes", output_service)
    @test occursin("SIGNAL_ANALYSER_VISIBLE_OUTPUT_MAX_QUEUE", output_service)
    @test occursin("signal_analyser_start_output_worker_unlocked!", output_service)
end
