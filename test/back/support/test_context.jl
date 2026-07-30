module Genie
module Renderer
module Json
json(payload; status::Int = 200) = (status = status, body = payload)
end
end
end

module AppTestContext

using Test

const PROJECT_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))

"""A deterministic double for EngeeDSP.Functions.pspectrum used only by unit/API tests."""
const PSPECTRUM_CALLS = Any[]
const PSPECTRUM_FAILURE = Ref(false)

function reset_pspectrum_double!()
    empty!(PSPECTRUM_CALLS)
    PSPECTRUM_FAILURE[] = false
    nothing
end

function signal_analyser_pspectrum(
    values::Vector{ComplexF64},
    times::Vector{Float64},
    representation::AbstractString,
    options...,
)
    push!(PSPECTRUM_CALLS, (values = copy(values), times = copy(times), representation = String(representation), options = options))
    PSPECTRUM_FAILURE[] && throw(ArgumentError("deterministic EngeeDSP failure"))

    if representation == "power"
        return ([1.0, 4.0, 9.0], [-128.0, 0.0, 128.0], nothing)
    elseif representation == "spectrogram"
        # Deliberately time-by-frequency: production must orient it as frequency-by-time.
        return ([1.0 4.0 9.0; 16.0 25.0 36.0], [-128.0, 0.0, 128.0], [0.0, 0.125])
    elseif representation == "persistence"
        return ([0.0 50.0 100.0; 25.0 75.0 90.0], [-128.0, 0.0, 128.0], [0.01, 0.1])
    end
    throw(ArgumentError("unsupported deterministic pspectrum representation: $representation"))
end

include(joinpath(PROJECT_ROOT, "lib", "domain", "signal_analyser_state.jl"))
include(joinpath(PROJECT_ROOT, "lib", "services", "signal_analyser_math.jl"))
include(joinpath(PROJECT_ROOT, "lib", "services", "signal_analyser_service.jl"))

# The API helpers use the tiny Main.Genie renderer double above. This keeps
# route/API tests in-process and deliberately avoids starting a Genie server.
include(joinpath(PROJECT_ROOT, "app", "api.jl"))

# Keep response-envelope assertions structural and deterministic even when a
# local Genie installation is present: the helpers under test still build the
# real payload, while this more-specific serializer exposes it in-process.
function api_json(payload::Dict{String,Any}; status::Int = 200)
    (status = status, body = json_safe(payload))
end

source(parts::AbstractString...) = read(joinpath(PROJECT_ROOT, parts...), String)
snapshot_keyset(snapshot) = Set(keys(snapshot))
all_finite(values) = all(isfinite, values)
all_finite_matrix(rows) = all(row -> all(isfinite, row), rows)

end
