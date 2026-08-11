using Test
const PEAKS_SPLIT_API = Main.AppTestContext
@testset "Compatibility Peaks routes expose typed Extrema API" begin
 routes=PEAKS_SPLIT_API.source("app","routes.jl")
 @test occursin("route(\"/api/peaks/active\", method = GET)",routes)
 @test occursin("route(\"/api/peaks/settings\", method = POST)",routes)
 @test occursin("apply_signal_peaks_settings!",routes)
 service=PEAKS_SPLIT_API.source("lib","services","signal_analyser_service.jl")
 @test occursin("number_of_peaks",service)&&occursin("maximum_cutoff",service)&&occursin("minimum_cutoff",service)&&occursin("minimum_distance_samples",service)&&occursin("threshold",service)&&occursin("mode",service)
 @test occursin("signal_peaks_table_payload",service)&&occursin("graph_number",service)&&occursin("signal_color",service)&&occursin("signal_peak_kind_name",service)
end
