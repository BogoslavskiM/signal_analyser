include(joinpath(@__DIR__, "..", "lib", "config.jl"))

const RUNTIME_REVISION = runtime_revision_from_git_checkout(
    normpath(joinpath(@__DIR__, "..")),
)

include(joinpath(@__DIR__, "..", "lib", "helpers.jl"))
include(joinpath(@__DIR__, "..", "lib", "domain", "example_model.jl"))
include(joinpath(@__DIR__, "..", "lib", "domain", "signal_analyser_state.jl"))
include(joinpath(@__DIR__, "..", "lib", "domain", "signal_session.jl"))
include(joinpath(@__DIR__, "..", "lib", "persistence", "storage.jl"))
include(joinpath(@__DIR__, "..", "lib", "persistence", "signal_package_archive.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "example_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_analyser_math.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_analyser_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_analyser_startup_warmup.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_session_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "signal_package_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "adapters", "engee_native_io.jl"))
include(joinpath(@__DIR__, "..", "lib", "services", "native_session_io_service.jl"))
include(joinpath(@__DIR__, "..", "lib", "app_blocks", "page_math.jl"))

const SIGNAL_ANALYSER_STARTUP_WARMUP_SUCCEEDED = signal_analyser_startup_warmup()

const EXAMPLE_APP_STATE = Dict{String,Any}(
    "project_name" => EXAMPLE_PROJECT_NAME,
    "ready" => true,
)

const SIGNAL_ANALYSER_STATE = default_signal_analyser_state()
const SIGNAL_SETTINGS_SERVICE = SignalSettingsService()
const SIGNAL_SESSION_SERVICE = SignalAnalyserSessionService()
const SIGNAL_PACKAGE_SERVICE = SignalPackageService(normpath(joinpath(@__DIR__, "..")))
const NATIVE_SESSION_IO_SERVICE = NativeSessionIOService()
const WORKSPACE_VARIABLE_PROVIDER = EngeeWorkspaceVariableProvider()
const WORKSPACE_CATALOG_SERVICE = WorkspaceCatalogService(WORKSPACE_VARIABLE_PROVIDER)
const SIGNAL_INVENTORY_SERVICE = SignalInventoryService(
    EngeeWorkspaceSignalSource(WORKSPACE_VARIABLE_PROVIDER),
)
const SIGNAL_OPERATION_PROVIDER = EngeeSignalOperationProvider()
const WORKSPACE_BATCH_IMPORT_SERVICE = WorkspaceBatchImportService(
    WORKSPACE_CATALOG_SERVICE,
    SIGNAL_INVENTORY_SERVICE,
)
