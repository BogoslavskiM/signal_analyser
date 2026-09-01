using Test

const SESSION_V5 = Main.AppTestContext

@testset "Session v5 preserves complete operation histories and application identity" begin
    service = SESSION_V5.SignalAnalyserSessionService()
    state = SESSION_V5.default_signal_analyser_state()
    source = state.signals[1]
    state.signals[1] = SESSION_V5.AnalysedSignal(
        source.id,
        source.name,
        source.color,
        source.sample_rate_hz,
        source.values,
        source.is_complex,
        source.visible,
        SESSION_V5.SignalOperationRecipe[
            SESSION_V5.SignalOperationRecipe(
                "custom-preprocess",
                "init_signal .- sum(init_signal) / length(init_signal)",
                source.sample_rate_hz,
                source.sample_rate_hz,
            ),
        ],
    )
    document = SESSION_V5.export_signal_analyser_session(service, state)["document"]
    @test document["format"] == SESSION_V5.SIGNAL_ANALYSER_SESSION_FORMAT
    @test document["application_id"] == SESSION_V5.SIGNAL_ANALYSER_APPLICATION_ID
    @test length(document["state"]["signals"][1]["operations"]) == 1

    target = SESSION_V5.default_signal_analyser_state()
    SESSION_V5.import_signal_analyser_session!(
        service,
        target,
        Dict("state_revision" => 0, "document" => document),
    )
    @test target.signals[1].operations == state.signals[1].operations

    legacy_v4 = deepcopy(document)
    legacy_v4["version"] = SESSION_V5.SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION
    delete!(legacy_v4, "format")
    delete!(legacy_v4, "application_id")
    for signal in legacy_v4["state"]["signals"]
        delete!(signal, "operations")
    end
    parsed_v4 = SESSION_V5.parse_signal_analyser_session_document(legacy_v4)
    @test parsed_v4.version == SESSION_V5.SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION
    @test all(isempty(signal.operations) for signal in parsed_v4.signals)

    wrong_application = deepcopy(document)
    wrong_application["application_id"] = "engee.other-app"
    @test_throws SESSION_V5.SignalAnalyserSessionValidationError SESSION_V5.parse_signal_analyser_session_document(
        wrong_application,
    )
end
