include(joinpath(@__DIR__, "..", "lib", "config.jl"))
include(joinpath(@__DIR__, "..", "lib", "helpers.jl"))
include(joinpath(@__DIR__, "..", "lib", "domain", "example_model.jl"))
include(joinpath(@__DIR__, "..", "lib", "domain", "signal_analyser_state.jl"))
include(joinpath(@__DIR__, "..", "lib", "persistence", "storage.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "example_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_analyser_math.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_analyser_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "app_blocks", "page_math.jl"))

const EXAMPLE_APP_STATE = Dict{String,Any}(
    "project_name" => EXAMPLE_PROJECT_NAME,
    "ready" => true,
)

const SIGNAL_ANALYSER_STATE = default_signal_analyser_state()
const SIGNAL_INVENTORY_SERVICE = SignalInventoryService(EngeeWorkspaceSignalSource())
