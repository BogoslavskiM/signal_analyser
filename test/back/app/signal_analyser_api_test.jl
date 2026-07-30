using Test

const SA_API = Main.AppTestContext

@testset "Signal Analyser API route registration" begin
    routes_source = SA_API.source("app", "routes.jl")
    state_routes = collect(eachmatch(r"route\(\"/api/state\", method = GET\)", routes_source))
    view_routes = collect(eachmatch(r"route\(\"/api/view\", method = POST\)", routes_source))

    @test length(state_routes) == 1
    @test length(view_routes) == 1
    @test occursin("api_json(signal_analyser_snapshot(SIGNAL_ANALYSER_STATE))", routes_source)
    @test occursin("api_json(apply_signal_analyser_view!(SIGNAL_ANALYSER_STATE, jsonpayload()))", routes_source)
    @test occursin("signal_analyser_validation_response(err)", routes_source)
    @test occursin("signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)", routes_source)
end

@testset "Signal Analyser API error envelopes" begin
    validation = SA_API.SignalAnalyserValidationError(
        "Некорректный запрос отображения",
        Dict("state_revision" => "Требуется целое число"),
    )
    validation_response = SA_API.signal_analyser_validation_response(validation)
    @test validation_response.status == 422
    @test Set(keys(validation_response.body)) == Set(["ok", "code", "error"])
    @test validation_response.body["ok"] === false
    @test validation_response.body["code"] == "invalid_request"
    @test Set(keys(validation_response.body["error"])) == Set(["code", "message", "fields"])
    @test validation_response.body["error"] == Dict(
        "code" => "invalid_request",
        "message" => "Некорректный запрос отображения",
        "fields" => Dict("state_revision" => "Требуется целое число"),
    )

    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    SA_API.apply_signal_analyser_view!(state, Dict("state_revision" => 0, "active_plot" => "spectrum"))
    stale_response = SA_API.signal_analyser_stale_response(state, SA_API.SignalAnalyserStaleStateError(0, 1))
    expected_snapshot = SA_API.signal_analyser_snapshot(state)
    @test stale_response.status == 409
    @test Set(keys(stale_response.body)) == Set(["ok", "code", "error", "state", "current"])
    @test stale_response.body["ok"] === false
    @test stale_response.body["code"] == "stale_state"
    @test stale_response.body["error"] == Dict(
        "code" => "stale_state",
        "message" => "Состояние устарело: ожидалась ревизия 0, текущая ревизия 1",
    )
    @test stale_response.body["state"] == expected_snapshot
    @test stale_response.body["current"] == expected_snapshot
    @test stale_response.body["state"] == stale_response.body["current"]
end
