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
    @test occursin("\"visible_signals\"", SA_API.source("lib", "services", "signal_analyser_service.jl"))
    @test occursin("signal_analyser_validation_response(err)", routes_source)
    @test occursin("signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)", routes_source)
end

@testset "Pinned Plotly vendor static route contract" begin
    routes_source = SA_API.source("app", "routes.jl")
    expected_vendor_file = "plotly-cartesian-3.1.0.min.js"
    frontend_contract_source = read(joinpath(@__DIR__, "..", "..", "front", "public", "js", "app.static.test.js"), String)
    vendor_routes = collect(eachmatch(r"route\(\"/js/vendor/:file\", method = GET\)", routes_source))

    @test length(vendor_routes) == 1
    @test occursin("public_file(\"js\", \"vendor\", basename(String(params(:file))))", routes_source)
    @test occursin("serve_file(public_path(parts...))", routes_source)
    @test occursin("const plotlyVendorUrl = \"./js/vendor/$expected_vendor_file\"", frontend_contract_source)
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
    first_name = state.signals[1].name
    SA_API.apply_signal_analyser_view!(
        state,
        Dict("state_revision" => 0, "active_plot" => "spectrum", "visible_signals" => [first_name]),
    )
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
    @test stale_response.body["current"]["visible_signals"] == [first_name]
    @test stale_response.body["current"]["plot_payload"]["visible_signals"] == [first_name]
end

@testset "Signal Analyser API view payload contract" begin
    SA_API.reset_pspectrum_double!()
    state = SA_API.default_signal_analyser_state()
    names = [signal.name for signal in state.signals]
    first_name, second_name = names

    success = SA_API.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 0,
            "active_plot" => "spectrum",
            "selected_signal" => second_name,
            "visible_signals" => [second_name, first_name],
        ),
    )
    @test success["state_revision"] == 1
    @test success["active_plot"] == "spectrum"
    @test success["selected_signal"] == second_name
    @test success["visible_signals"] == [first_name, second_name]
    @test [signal["visible"] for signal in success["signals"]] == [true, true]
    @test [trace["name"] for trace in success["plot_payload"]["time_traces"]] == [first_name, second_name]
    @test [trace["color"] for trace in success["plot_payload"]["time_traces"]] == ["#2563eb", "#dc2626"]
    @test [trace["name"] for trace in success["plot_payload"]["spectrum_traces"]] == [first_name, second_name]
    @test success["plot_payload"]["spectrogram"]["signal"] == second_name
    @test success["plot_payload"]["persistence"]["signal"] == second_name

    fallback = SA_API.apply_signal_analyser_view!(
        state,
        Dict(
            "state_revision" => 1,
            "selected_signal" => second_name,
            "visible_signals" => [first_name],
        ),
    )
    @test fallback["state_revision"] == 2
    @test fallback["selected_signal"] == first_name
    @test fallback["visible_signals"] == [first_name]
    @test [signal["visible"] for signal in fallback["signals"]] == [true, false]
end

@testset "Signal Analyser API view validation rejects malformed visibility payloads" begin
    for (payload, field) in (
        (Dict("state_revision" => 0, "visible_signals" => nothing), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => "Гармонический сигнал"), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => Any[]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", 1]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "Гармонический сигнал"]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал", "missing"]), "visible_signals"),
        (Dict("state_revision" => 0, "visible_signals" => ["Гармонический сигнал"], "extra" => true), "body"),
        (Dict("state_revision" => "0", "visible_signals" => ["Гармонический сигнал"]), "state_revision"),
        (Dict("state_revision" => true, "visible_signals" => ["Гармонический сигнал"]), "state_revision"),
    )
        SA_API.reset_pspectrum_double!()
        state = SA_API.default_signal_analyser_state()
        before = SA_API.signal_analyser_snapshot(state)
        err = try
            SA_API.apply_signal_analyser_view!(state, payload)
            nothing
        catch caught
            caught
        end
        @test err isa SA_API.SignalAnalyserValidationError
        @test haskey(err.fields, field)
        response = SA_API.signal_analyser_validation_response(err)
        @test response.status == 422
        @test response.body["ok"] === false
        @test response.body["code"] == "invalid_request"
        @test haskey(response.body["error"]["fields"], field)
        @test SA_API.signal_analyser_snapshot(state) == before
    end
end
