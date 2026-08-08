using Test

const SS = Main.AppTestContext

# TASK-0020 loads the typed session seam into the existing deterministic
# backend context. Production bootstrap loads these files in the same order.
if !isdefined(SS, :SignalAnalyserSessionService)
    Base.include(SS, joinpath(SS.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(SS, joinpath(SS.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

session_cache_families(state) = (
    deepcopy(state.plot_cache),
    deepcopy(state.spectrum_cache),
    deepcopy(state.spectrogram_cache),
    deepcopy(state.persistence_cache),
)

@testset "TASK-0020 session export is an exact typed document" begin
    state = SS.test_state_with_complex_signal()
    state.signals[2] = SS.AnalysedSignal(
        state.signals[2].name,
        state.signals[2].color,
        state.signals[2].sample_rate_hz,
        ComplexF64[1 + 2im, 3 + 4im, 5 + 6im],
        true,
        true,
    )
    exported = SS.export_signal_analyser_session(SS.SignalAnalyserSessionService(), state)
    document = exported["document"]
    payload = document["state"]

    @test exported["ok"] === true
    @test Set(keys(exported)) == Set(["ok", "document"])
    @test Set(keys(document)) == SS.SIGNAL_ANALYSER_SESSION_DOCUMENT_FIELDS
    @test document["schema"] == SS.SIGNAL_ANALYSER_SESSION_SCHEMA
    @test document["version"] == SS.SIGNAL_ANALYSER_SESSION_VERSION
    @test Set(keys(payload)) == SS.SIGNAL_ANALYSER_SESSION_STATE_FIELDS
    @test all(Set(keys(signal)) == SS.SIGNAL_ANALYSER_SESSION_SIGNAL_FIELDS for signal in payload["signals"])
    @test all(Set(keys(signal["values"])) == SS.SIGNAL_ANALYSER_SESSION_VALUES_FIELDS for signal in payload["signals"])
    @test payload["signals"][2]["values"] == Dict("real" => [1.0, 3.0, 5.0], "imag" => [2.0, 4.0, 6.0])
    @test all(Set(keys(display)) == SS.SIGNAL_ANALYSER_SESSION_DISPLAY_FIELDS for display in payload["displays"])
    @test all(Set(keys(display["stored_settings"])) == SS.SIGNAL_ANALYSER_SESSION_STORED_SETTING_FIELDS for display in payload["displays"])
end

@testset "TASK-0020 session round trip, stale gate, and atomic rollback" begin
    service = SS.SignalAnalyserSessionService()
    source = SS.test_state_with_complex_signal()
    document = SS.export_signal_analyser_session(service, source)["document"]
    target = SS.default_signal_analyser_state()
    imported = SS.import_signal_analyser_session!(service, target, Dict("state_revision" => 0, "document" => document))

    @test imported == Dict("ok" => true, "schema" => SS.SIGNAL_ANALYSER_SESSION_SCHEMA, "version" => 1, "imported_source_revision" => 0, "state_revision" => 1)
    @test SS.export_signal_analyser_session(service, target)["document"]["state"] == document["state"]
    @test target.view.state_revision == 1
    @test isempty(target.plot_cache) && isempty(target.spectrum_cache) && isempty(target.spectrogram_cache) && isempty(target.persistence_cache)

    before = SS.export_signal_analyser_session(service, target)["document"]["state"]
    caches = session_cache_families(target)
    stale = try
        SS.import_signal_analyser_session!(service, target, Dict("state_revision" => 0, "document" => document))
        nothing
    catch caught
        caught
    end
    @test stale isa SS.SignalAnalyserStaleStateError
    @test SS.export_signal_analyser_session(service, target)["document"]["state"] == before && session_cache_families(target) == caches

    invalid_document = deepcopy(document)
    invalid_document["state"]["signals"][1]["values"]["imag"][1] = 1.0
    invalid_document["state"]["signals"][1]["is_complex"] = false
    invalid = try
        SS.import_signal_analyser_session!(service, target, Dict("state_revision" => 1, "document" => invalid_document))
        nothing
    catch caught
        caught
    end
    @test invalid isa SS.SignalAnalyserSessionValidationError
    @test haskey(invalid.fields, "document.state.signals[1].values.imag[1]")
    @test SS.export_signal_analyser_session(service, target)["document"]["state"] == before && session_cache_families(target) == caches

    invalid_selection = deepcopy(document)
    invalid_selection["state"]["displays"][1]["visible_signals"] = reverse(
        invalid_selection["state"]["displays"][1]["visible_signals"],
    )
    selection_error = try
        SS.import_signal_analyser_session!(service, target, Dict(
            "state_revision" => 1,
            "document" => invalid_selection,
        ))
        nothing
    catch caught
        caught
    end
    @test selection_error isa SS.SignalAnalyserSessionValidationError
    @test haskey(selection_error.fields, "document.state.displays.display-1.visible_signals")
    @test target.view.state_revision == 1
    @test SS.export_signal_analyser_session(service, target)["document"]["state"] == before &&
        session_cache_families(target) == caches
end

@testset "TASK-0020 session parser and API error envelopes are exact" begin
    service = SS.SignalAnalyserSessionService()
    state = SS.default_signal_analyser_state()
    document = SS.export_signal_analyser_session(service, state)["document"]

    for (mutate, code) in (
        (value -> (value["schema"] = "unknown"), "unsupported_session_schema"),
        (value -> (value["version"] = 2), "unsupported_session_version"),
        (value -> (value["unexpected"] = true), "invalid_session"),
        (value -> delete!(value["state"], "next_display_number"), "invalid_session"),
    )
        invalid = deepcopy(document)
        mutate(invalid)
        err = try
            SS.parse_import_signal_analyser_session_command(Dict("state_revision" => 0, "document" => invalid))
            nothing
        catch caught
            caught
        end
        @test err isa SS.SignalAnalyserSessionValidationError
        @test err.code == code
    end
    @test_throws SS.SignalAnalyserSessionValidationError SS.parse_import_signal_analyser_session_command(Dict("state_revision" => 0, "document" => document, "extra" => true))

    validation = SS.signal_analyser_session_validation_response(SS.signal_analyser_session_error("document.schema", "bad schema"))
    @test validation.status == 422
    @test validation.body["ok"] === false && validation.body["code"] == "invalid_session"
    @test validation.body["error"]["fields"] == Dict("document.schema" => "bad schema")

    stale = SS.signal_analyser_session_stale_response(state, SS.SignalAnalyserStaleStateError(7, 0))
    @test stale.status == 409
    @test stale.body["ok"] === false && stale.body["code"] == "stale_state"
    @test stale.body["state"] == Dict("state_revision" => 0) == stale.body["current"]
    routes = SS.source("app", "routes.jl")
    @test length(collect(eachmatch(r"route\(\"/api/session\", method = GET\)", routes))) == 1
    @test length(collect(eachmatch(r"route\(\"/api/session\", method = POST\)", routes))) == 1
    @test occursin("Cache-Control\" => \"no-store", routes)
end
