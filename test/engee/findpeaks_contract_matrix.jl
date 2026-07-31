using Test

"""
Cascade 4 evidence matrix for a future `findpeaks` capability.

Signal Analyser has no `findpeaks` call site today.  This is deliberately an
evidence record, not an assertion that the application implements peaks or a
license to add a mathematical fallback.  The values below were reproduced in
the production Engee MIND pod on 2026-07-31 and are paired with the official
function reference.  A product call site must opt into this matrix explicitly
before an application-level contract test is added.
"""
const FINDPEAKS_CONTRACT_MATRIX = (
    function_name = "EngeeDSP.Functions.findpeaks",
    call_sites = String[],
    target_environment = "prod Engee MIND",
    status = "verified-prod-mcp-no-product-call-site",
    package_uuid = "f9bbbd0e-0dd6-4072-898a-88f8f1250a99",
    official_source = "https://engee.com/helpcenter/stable/en/func-dsp-measurements-and-feature-extraction/func-findpeaks.html",
    import_statement = "import EngeeDSP.Functions: findpeaks",
    methods = (
        "findpeaks(y::AbstractVecOrMat; ...)",
        "findpeaks(y::AbstractVecOrMat, x::AbstractVecOrMat; ...)",
        "findpeaks(y::AbstractVecOrMat, fs::Real; ...)",
    ),
    required_data_output = "out=:data",
    data_shape = "NamedTuple(Ypk, Xpk, Wpk, Ppk), ordered by increasing location with default SortStr=\"none\"",
    deterministic_probe = (
        input = Float64[0, 1, 0, 2, 2, 0, -1, 3, 0],
        output = (Ypk = [1.0, 2.0, 3.0], Xpk = [2, 4, 8], Wpk = [1.0, 2.0, 0.875], Ppk = [1.0, 2.0, 3.0]),
    ),
    coordinate_probe = (
        x_step = 0.25,
        Xpk = [0.25, 0.75, 1.75],
    ),
    sample_rate_probe = (
        fs_hz = 2.0,
        Xpk_s = [0.5, 1.5, 3.5],
    ),
    plateau_probe = (
        input = Float64[0, 2, 2, 0],
        Xpk = [2],
        rule = "flat peak chooses the lowest 1-based index",
    ),
    finite_endpoint_probe = (
        input = Float64[9, 0, 2, 0, 8],
        Xpk = [3],
        rule = "finite endpoints are not returned as peaks",
    ),
    option_probes = (
        NPeaks_descend = (Ypk = [3.0, 2.0], Xpk = [8, 4]),
        MinPeakHeight_2 = (Ypk = [3.0], Xpk = [8]),
        rule = "MinPeakHeight is strict for value 2.0 in the deterministic probe",
    ),
    documented_defaults = (
        SortStr = "none",
        MinPeakHeight = "-Inf",
        MinPeakProminence = 0,
        Threshold = 0,
        MinPeakDistance = 0,
        WidthReference = "halfprom",
        MinPeakWidth = 0,
        MaxPeakWidth = "Inf",
    ),
    safe_errors = (
        short_vector = "ArgumentError: Function `findpeaks`: Argument `y` must have at least 3 elements",
        invalid_out = "ArgumentError: Function `findpeaks`: Named argument `out` most be `:data` or `:plot`",
        invalid_sort = "ArgumentError: SortStr must be ascend, none or descend",
        nonpositive_NPeaks = "ErrorException: NPeaks must be positive",
        complex_input = "MethodError",
    ),
)

@testset "Cascade 4 findpeaks evidence-backed contract matrix" begin
    matrix = FINDPEAKS_CONTRACT_MATRIX
    @test matrix.function_name == "EngeeDSP.Functions.findpeaks"
    @test isempty(matrix.call_sites)
    @test matrix.status == "verified-prod-mcp-no-product-call-site"
    @test matrix.import_statement == "import EngeeDSP.Functions: findpeaks"
    @test length(matrix.methods) == 3
    @test matrix.required_data_output == "out=:data"
    @test matrix.package_uuid == "f9bbbd0e-0dd6-4072-898a-88f8f1250a99"
    @test matrix.deterministic_probe.output == (Ypk = [1.0, 2.0, 3.0], Xpk = [2, 4, 8], Wpk = [1.0, 2.0, 0.875], Ppk = [1.0, 2.0, 3.0])
    @test matrix.plateau_probe.Xpk == [2]
    @test matrix.finite_endpoint_probe.Xpk == [3]
    @test matrix.sample_rate_probe.Xpk_s == [0.5, 1.5, 3.5]
    @test matrix.option_probes.NPeaks_descend.Xpk == [8, 4]
    @test matrix.option_probes.MinPeakHeight_2.Xpk == [8]
    @test occursin("at least 3", matrix.safe_errors.short_vector)
    @test occursin("out", matrix.safe_errors.invalid_out)
    @test occursin("MethodError", matrix.safe_errors.complex_input)
end
