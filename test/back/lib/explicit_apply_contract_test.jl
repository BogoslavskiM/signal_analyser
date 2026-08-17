using Test

const EXPLICIT_APPLY = Main.AppTestContext

explicit_apply_field(document, field_id) = only(filter(
    field -> field["id"] == field_id,
    document["fields"],
))

function explicit_apply_provider_counts()
    (
        length(EXPLICIT_APPLY.SPECTRUM_CALLS),
        length(EXPLICIT_APPLY.SPECTROGRAM_CALLS),
        length(EXPLICIT_APPLY.PERSISTENCE_CALLS),
        length(EXPLICIT_APPLY.PSPECTRUM_CALLS),
    )
end

@testset "TASK-0083 explicit Apply is snapshot-free, lazy and atomic" begin
    service = EXPLICIT_APPLY.SignalSettingsService()
    state = EXPLICIT_APPLY.default_signal_analyser_state()
    empty!(EXPLICIT_APPLY.SPECTRUM_CALLS)
    empty!(EXPLICIT_APPLY.SPECTROGRAM_CALLS)
    EXPLICIT_APPLY.reset_persistence_double!()
    EXPLICIT_APPLY.reset_pspectrum_double!()
    spectrum_view = EXPLICIT_APPLY.apply_signal_analyser_view!(state, Dict(
        "state_revision" => 0,
        "active_plot" => "spectrum",
    ))

    before = EXPLICIT_APPLY.signal_analyser_snapshot(state)
    caches = (
        deepcopy(state.plot_cache), deepcopy(state.spectrum_cache),
        deepcopy(state.spectrogram_cache), deepcopy(state.persistence_cache),
    )
    calls = explicit_apply_provider_counts()
    draft = EXPLICIT_APPLY.apply_signal_setting!(service, state, Dict(
        "state_revision" => spectrum_view["state_revision"],
        "display_id" => "display-1",
        "field_id" => "spectrum.leakage",
        "value" => 0.25,
    ))
    @test Set(keys(draft)) == Set(["state", "settings"])
    @test draft["state"]["state_revision"] == 2
    @test explicit_apply_field(draft["settings"], "spectrum.leakage")["value"] == 0.25
    @test (state.plot_cache, state.spectrum_cache, state.spectrogram_cache, state.persistence_cache) == caches
    @test explicit_apply_provider_counts() == calls
    @test !haskey(draft["state"], "plots") && !haskey(draft["state"], "plot_payload")

    applied = EXPLICIT_APPLY.apply_signal_settings!(service, state, Dict(
        "state_revision" => 2, "display_id" => "display-1",
    ))
    @test applied == Dict{String,Any}("success" => true, "state_revision" => 3)
    @test explicit_apply_provider_counts() == calls
    @test state.view.state_revision == 3
    # A fresh Display has no bound signal; applying its settings must not turn
    # the intentional empty pane into scheduled provider work.
    @test !state.output_manager.need_update_pages[state.output_manager.active_page_id]
    @test_throws EXPLICIT_APPLY.SignalAnalyserStaleStateError EXPLICIT_APPLY.apply_signal_settings!(
        service, state, Dict("state_revision" => 2, "display_id" => "display-1"),
    )

    invalid_draft = EXPLICIT_APPLY.apply_signal_setting!(service, state, Dict(
        "state_revision" => 3,
        "display_id" => "display-1",
        "field_id" => "spectrum.leakage",
        "value" => 2.0,
    ))
    cache_before_invalid_apply = deepcopy(state.plot_cache)
    rejected = EXPLICIT_APPLY.apply_signal_settings!(service, state, Dict(
        "state_revision" => invalid_draft["state"]["state_revision"], "display_id" => "display-1",
    ))
    @test rejected["success"] === false
    @test rejected["state_revision"] == invalid_draft["state"]["state_revision"] + 1
    @test occursin("spectrum.leakage", rejected["error"])
    @test explicit_apply_field(
        EXPLICIT_APPLY.signal_settings_document(service, state, "display-1"),
        "spectrum.leakage",
    )["value"] == 2.0
    @test state.plot_cache == cache_before_invalid_apply
    @test explicit_apply_provider_counts() == calls
end

@testset "TASK-0083 Time complex components and MATLAB min-max leave raw values intact" begin
    signal = EXPLICIT_APPLY.AnalysedSignal(
        "complex-contract", "#111111", 10.0, ComplexF64[2 + 4im, 4 + 2im, 6 + 0im], true, true,
    )
    traces = EXPLICIT_APPLY.signal_analyser_time_traces_for_payload(signal)
    @test [trace["component"] for trace in traces] == ["real", "imaginary"]
    @test [trace["y"] for trace in traces] == [[2.0, 4.0, 6.0], [4.0, 2.0, 0.0]]
    @test EXPLICIT_APPLY.signal_analyser_minmax_normalized_values([2.0, 4.0, 6.0]) == [0.0, 0.5, 1.0]
    @test EXPLICIT_APPLY.signal_analyser_minmax_normalized_values([7.0, 7.0]) == [0.0, 0.0]
    @test signal.values == ComplexF64[2 + 4im, 4 + 2im, 6 + 0im]
end
