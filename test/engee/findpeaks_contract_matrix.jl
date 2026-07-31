using Test

"""
Evidence-only Cascade 4 inventory.

`findpeaks` is not currently called by Signal Analyser.  Consequently this
matrix intentionally makes no claim about EngeeDSP/Engee function arguments,
result shape, or numerical output.  Those assertions may be added only after
an application call site and an Engee MCP probe provide contract evidence.
"""
const FINDPEAKS_CONTRACT_MATRIX = [
    (
        function_name = "findpeaks",
        call_sites = String[],
        target_environment = "devhub",
        evidence = "repository call-site inventory",
        status = "not-applicable-no-product-call-site",
    ),
]

@testset "Cascade 4 findpeaks evidence-only contract matrix" begin
    @test length(FINDPEAKS_CONTRACT_MATRIX) == 1
    entry = only(FINDPEAKS_CONTRACT_MATRIX)
    @test entry.function_name == "findpeaks"
    @test isempty(entry.call_sites)
    @test entry.status == "not-applicable-no-product-call-site"
end
