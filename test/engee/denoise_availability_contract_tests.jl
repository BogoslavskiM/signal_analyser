module DenoiseAvailabilityContractTests

using Test

"""
Reference contract requested by the Signal Analyser preprocessing dialog.

MATLAB `wdenoise` accepts a finite, nonsparse, uniformly sampled real-valued
signal with at least two samples.  The default call uses `sym4`, empirical
Bayes denoising, the posterior median threshold rule and a level-independent
noise estimate.  Sampling frequency is not an argument: a successful adapter
would preserve the source sample-rate metadata.

Sources:
- https://www.mathworks.com/help/wavelet/ref/wdenoise.html
- https://engee.com/helpcenter/stable/en/dsp-functions.html
"""
const DENOISE_REFERENCE_CONTRACT = (
    matlab_function = "wdenoise",
    engee_candidates = (:wdenoise, :denoise),
    input = :finite_uniform_real_vector,
    minimum_samples = 2,
    default_wavelet = "sym4",
    default_method = "Bayes",
    default_threshold_rule = "Median",
    default_noise_estimate = "LevelIndependent",
    sample_rate_relation = :preserve_metadata,
)

"""
Confirm whether EngeeDSP exposes a public denoising contract.

This is an availability contract, not a numerical fallback.  When either
candidate becomes public, this test must fail so that the exact Engee
signature and numerical behavior are researched before enabling the product
capability.
"""
function run_denoise_availability_contract_tests(dsp)
    functions = dsp.Functions
    public_names = Set(names(functions; all = false, imported = false))

    @testset "EngeeDSP 0.75.0 denoise public availability" begin
        @test DENOISE_REFERENCE_CONTRACT.engee_candidates == (:wdenoise, :denoise)
        @test DENOISE_REFERENCE_CONTRACT.sample_rate_relation == :preserve_metadata

        @test :wdenoise ∉ public_names
        @test :denoise ∉ public_names
        @test !isdefined(functions, :wdenoise)
        @test !isdefined(functions, :denoise)
    end
end

end
