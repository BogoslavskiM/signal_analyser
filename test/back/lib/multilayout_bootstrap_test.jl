using Test

const ML_BOOTSTRAP = Main.AppTestContext

# Keep this test self-contained when sorted before the existing session suite.
if !isdefined(ML_BOOTSTRAP, :SignalAnalyserSessionService)
    Base.include(ML_BOOTSTRAP, joinpath(ML_BOOTSTRAP.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(ML_BOOTSTRAP, joinpath(ML_BOOTSTRAP.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

@testset "TASK-0037 default state builds a complete typed 1x1 pane" begin
    state = ML_BOOTSTRAP.default_signal_analyser_state()
    display = only(state.displays)
    layout = state.display_layouts[display.id]
    pane = ML_BOOTSTRAP.signal_display_active_pane(layout)

    @test state.active_display_id == display.id == "display-1"
    @test [signal.name for signal in state.signals] == ["Гармонический сигнал"]
    @test !only(state.signals).is_complex && all(iszero, imag.(only(state.signals).values))
    @test layout.version == ML_BOOTSTRAP.SIGNAL_DISPLAY_LAYOUT_VERSION
    @test (layout.variant, layout.rows, layout.columns, layout.active_pane_id, layout.next_pane_number) == ("1x1", 1, 1, "pane-1", 2)
    @test length(layout.panes) == 1
    @test pane.plot_type == display.active_plot == ML_BOOTSTRAP.TIME_PLOT
    @test ML_BOOTSTRAP.signal_display_pane_members(pane) == ML_BOOTSTRAP.signal_analyser_display_members(display)
    @test ML_BOOTSTRAP.signal_display_pane_analysis_name(pane) == ML_BOOTSTRAP.signal_analyser_display_analysis_name(display)
    @test pane.time_limits == display.time_limits
    @test pane.measurement_selection == display.measurement_selection
    @test pane.spectrum_settings == display.spectrum_settings
    @test pane.spectrogram_settings == display.spectrogram_settings
    @test pane.persistence_settings == display.persistence_settings
    @test pane.stored_settings == display.stored_settings
    @test pane.peaks_enabled == display.peaks_enabled
    @test !hasmethod(
        ML_BOOTSTRAP.SignalDisplayPaneState,
        Tuple{String, ML_BOOTSTRAP.SignalAnalyserPlot, Vector{String}},
    )
end

@testset "TASK-0037 explicit layout session parse/import/export round trip" begin
    service = ML_BOOTSTRAP.SignalAnalyserSessionService()
    # v5's production default is deliberately one pure real sine.  This
    # session round-trip still needs two bindings, so it owns an explicit test
    # inventory instead of silently restoring a second product default.
    first_signal = only(ML_BOOTSTRAP.default_signal_catalog())
    second_signal = ML_BOOTSTRAP.AnalysedSignal(
        "Тестовый комплексный сигнал", "#dc2626", first_signal.sample_rate_hz,
        ComplexF64[1 + 1im, 2 + 0im, 3 - 1im], true, true,
    )
    source = ML_BOOTSTRAP.SignalAnalyserState(
        ML_BOOTSTRAP.AnalysedSignal[first_signal, second_signal],
        ML_BOOTSTRAP.SignalAnalyserViewState(0, ML_BOOTSTRAP.TIME_PLOT, first_signal.name),
        Dict{String,Dict{String,Any}}(), ReentrantLock(),
    )
    names = [signal.name for signal in source.signals]

    ML_BOOTSTRAP.apply_signal_analyser_layout!(source, Dict(
        "state_revision" => 0,
        "operation" => "resize",
        "display_id" => "display-1",
        "version" => 1,
        "variant" => "1x2",
        "rows" => 1,
        "columns" => 2,
    ))
    ML_BOOTSTRAP.apply_signal_analyser_layout!(source, Dict(
        "state_revision" => 1,
        "operation" => "update_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
        "plot_type" => "spectrogram",
        "signal_bindings" => [names[2]],
    ))
    ML_BOOTSTRAP.apply_signal_analyser_layout!(source, Dict(
        "state_revision" => 2,
        "operation" => "select_pane",
        "display_id" => "display-1",
        "version" => 1,
        "pane_id" => "pane-2",
    ))

    document = ML_BOOTSTRAP.export_signal_analyser_session(service, source)["document"]
    layout_document = only(document["state"]["displays"])["layout"]
    @test Set(keys(layout_document)) == ML_BOOTSTRAP.SIGNAL_ANALYSER_SESSION_LAYOUT_FIELDS
    @test layout_document["variant"] == "1x2"
    @test layout_document["active_pane_id"] == "pane-2"
    @test layout_document["panes"][2] == Dict(
        "id" => "pane-2",
        "name" => "Область 2",
        "plot_type" => "spectrogram",
        "signal_bindings" => [names[2]],
        "peaks_settings" => Dict(
            "mode" => "maxima",
            "number_of_peaks" => 5,
            "maximum_cutoff" => nothing,
            "minimum_cutoff" => nothing,
            "minimum_distance_samples" => 1,
            "threshold" => 0.0,
        ),
    )

    target = ML_BOOTSTRAP.default_signal_analyser_state()
    imported = ML_BOOTSTRAP.import_signal_analyser_session!(service, target, Dict(
        "state_revision" => 0,
        "document" => document,
    ))
    restored_layout = target.display_layouts["display-1"]
    restored_active = ML_BOOTSTRAP.signal_display_active_pane(restored_layout)
    restored_inactive = only(filter(pane -> pane.id == "pane-1", restored_layout.panes))

    @test imported["ok"] === true && imported["state_revision"] == 1
    @test ML_BOOTSTRAP.export_signal_analyser_session(service, target)["document"]["state"] == document["state"]
    @test (restored_layout.variant, restored_layout.active_pane_id, restored_layout.next_pane_number) == ("1x2", "pane-2", 3)
    @test restored_active.plot_type == ML_BOOTSTRAP.SPECTROGRAM_PLOT
    @test ML_BOOTSTRAP.signal_display_pane_members(restored_active) == [names[2]]
    @test restored_active.peaks_settings == ML_BOOTSTRAP.SignalPeaksSettings(5, nothing, 1, 0.0)
    @test restored_inactive.plot_type == ML_BOOTSTRAP.TIME_PLOT
    # Pane 1 was never explicitly bound.  Import must preserve that deliberate
    # empty state rather than recovering the Display-wide signal inventory.
    @test ML_BOOTSTRAP.signal_display_pane_members(restored_inactive) == String[]
    @test ML_BOOTSTRAP.signal_display_pane_analysis_name(restored_inactive) === nothing
end
