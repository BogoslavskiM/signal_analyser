using Test

const EXTREMA = Main.AppTestContext

if !isdefined(EXTREMA, :SignalAnalyserSessionService)
    Base.include(EXTREMA, joinpath(EXTREMA.PROJECT_ROOT, "lib", "domain", "signal_session.jl"))
    Base.include(EXTREMA, joinpath(EXTREMA.PROJECT_ROOT, "lib", "services", "signal_session_service.jl"))
end

@testset "TASK-0097 Extrema mode defaults, directional math, and exact payload" begin
    @test EXTREMA.SignalPeaksSettings().mode == EXTREMA.MAXIMA_EXTREMA_MODE
    @test EXTREMA.SignalPeaksSettings(5, nothing, 1, 0).mode == EXTREMA.MAXIMA_EXTREMA_MODE
    @test EXTREMA.signal_extrema_mode_name(EXTREMA.ALL_EXTREMA_MODE) == "all"

    query = EXTREMA.SignalPeaksQuery(3, "display-1", "s", EXTREMA.MAGNITUDE_ORDINATE, [1.0, -4.0, 2.0], 10.0, 0,
        EXTREMA.SignalPeaksSettings(EXTREMA.MINIMA_EXTREMA_MODE, 7, nothing, 2, 0.25))
    calls = Any[]
    fake_findpeaks = function(values; kwargs...)
        push!(calls, (copy(values), kwargs))
        (Ypk = [-99.0], Xpk = [2], Wpk = [1.0], Ppk = [4.0])
    end
    minima = EXTREMA.signal_peaks_detect_direction(fake_findpeaks, query, EXTREMA.MINIMUM_PEAK)
    @test calls[1][1] == [-1.0, 4.0, -2.0]
    @test calls[1][2][:MinPeakHeight] == -Inf && calls[1][2][:NPeaks] == 7
    @test minima.peak_values == (-4.0,) && minima.kinds == (EXTREMA.MINIMUM_PEAK,)

    maxima = EXTREMA.SignalPeaksProviderResult([8.0, 6.0], [4, 8], [1.0, 1.0], [5.0, 2.0], [EXTREMA.MAXIMUM_PEAK, EXTREMA.MAXIMUM_PEAK], 10)
    minima = EXTREMA.SignalPeaksProviderResult([-7.0, -9.0], [3, 4], [1.0, 1.0], [5.0, 4.0], [EXTREMA.MINIMUM_PEAK, EXTREMA.MINIMUM_PEAK], 10)
    all = EXTREMA.signal_peaks_merge_directions(maxima, minima, 3, 10)
    @test all.peak_values == (-7.0, 8.0, -9.0)
    @test all.locations_1based == (3, 4, 4) && all.kinds == (EXTREMA.MINIMUM_PEAK, EXTREMA.MAXIMUM_PEAK, EXTREMA.MINIMUM_PEAK)

    settings = EXTREMA.SignalPeaksSettings(EXTREMA.ALL_EXTREMA_MODE, 3, nothing, 1, 0)
    items = [EXTREMA.SignalPeakItem(EXTREMA.MINIMUM_PEAK, -7.0, 2, 0.2, 1.0, 5.0), EXTREMA.SignalPeakItem(EXTREMA.MAXIMUM_PEAK, 8.0, 3, 0.3, 1.0, 5.0)]
    snapshot = EXTREMA.SignalPeaksSnapshot(true, EXTREMA.ALL_EXTREMA_MODE, 4, "display-1", "s", EXTREMA.MAGNITUDE_ORDINATE, EXTREMA.SignalPeaksUnits(), items)
    rows = [EXTREMA.SignalPeaksTableRow(1, "s", "#123456", 1, items[1]), EXTREMA.SignalPeaksTableRow(2, "s", "#123456", 2, items[2])]
    payload = EXTREMA.signal_peaks_table_payload(EXTREMA.SignalPeaksTableSnapshot(true, 4, "display-1", "pane-1", settings, ["#123456"], [snapshot], rows))
    @test payload["mode"] == "all" && payload["settings"]["mode"] == "all"
    @test [(row["type"], row["value"], row["graph_number"]) for row in payload["rows"]] == [("minimum", -7.0, 1), ("maximum", 8.0, 2)]
end

@testset "TASK-0097 session v1 migration exports v2 maxima mode" begin
    service = EXTREMA.SignalAnalyserSessionService()
    v2 = EXTREMA.export_signal_analyser_session(service, EXTREMA.default_signal_analyser_state())["document"]
    v1 = deepcopy(v2)
    v1["version"] = 1
    for pane in v1["state"]["displays"][1]["layout"]["panes"]
        delete!(pane["peaks_settings"], "mode")
    end
    target = EXTREMA.default_signal_analyser_state()
    imported = EXTREMA.import_signal_analyser_session!(service, target, Dict("state_revision" => 0, "document" => v1))
    exported = EXTREMA.export_signal_analyser_session(service, target)["document"]
    @test imported["version"] == 1
    @test exported["version"] == 2
    @test all(pane["peaks_settings"]["mode"] == "maxima" for pane in exported["state"]["displays"][1]["layout"]["panes"])
end
