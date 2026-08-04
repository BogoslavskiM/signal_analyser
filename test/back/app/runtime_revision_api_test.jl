using Test

const RUNTIME_API = Main.AppTestContext
const RUNTIME_REVISION_ENV_KEY = "SIGNAL_ANALYSER_RUNTIME_REVISION"
const RUNTIME_REVISION_FIXTURE_SHA = "0123456789abcdef0123456789abcdef01234567"
const RUNTIME_REVISION_OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98"
const RUNTIME_REVISION_CONFIG_PATH = joinpath(
    RUNTIME_API.PROJECT_ROOT,
    "lib",
    "config.jl",
)

function with_runtime_revision_environment(
    callback::Function,
    value::Union{Nothing,String},
)
    was_present = haskey(ENV, RUNTIME_REVISION_ENV_KEY)
    previous = get(ENV, RUNTIME_REVISION_ENV_KEY, nothing)
    try
        if value === nothing
            pop!(ENV, RUNTIME_REVISION_ENV_KEY, nothing)
        else
            ENV[RUNTIME_REVISION_ENV_KEY] = value
        end
        callback()
    finally
        if was_present
            ENV[RUNTIME_REVISION_ENV_KEY] = previous::String
        else
            pop!(ENV, RUNTIME_REVISION_ENV_KEY, nothing)
        end
    end
end

module RuntimeRevisionConfigFixture end
Base.include(RuntimeRevisionConfigFixture, RUNTIME_REVISION_CONFIG_PATH)

@testset "TASK-0043 strict runtime revision source and ENV restoration" begin
    revision = RuntimeRevisionConfigFixture.RuntimeRevision(
        RUNTIME_REVISION_FIXTURE_SHA,
    )
    @test revision.sha == RUNTIME_REVISION_FIXTURE_SHA
    @test typeof(revision) === RuntimeRevisionConfigFixture.RuntimeRevision

    invalid_values = (
        ("missing", nothing),
        ("empty", ""),
        ("padded", " $RUNTIME_REVISION_FIXTURE_SHA "),
        ("uppercase", uppercase(RUNTIME_REVISION_FIXTURE_SHA)),
        ("non-hex", first(RUNTIME_REVISION_FIXTURE_SHA, 39) * "g"),
        ("39-char", first(RUNTIME_REVISION_FIXTURE_SHA, 39)),
        ("41-char", RUNTIME_REVISION_FIXTURE_SHA * "0"),
    )
    for (label, value) in invalid_values
        @testset "$label is rejected" begin
            with_runtime_revision_environment(value) do
                @test_throws ArgumentError RuntimeRevisionConfigFixture.runtime_revision_from_environment()
            end
        end
    end

    with_runtime_revision_environment(RUNTIME_REVISION_FIXTURE_SHA) do
        loaded = RuntimeRevisionConfigFixture.runtime_revision_from_environment()
        @test loaded.sha == RUNTIME_REVISION_FIXTURE_SHA
    end

    environment_was_present = haskey(ENV, RUNTIME_REVISION_ENV_KEY)
    environment_before = get(ENV, RUNTIME_REVISION_ENV_KEY, nothing)
    @test_throws ErrorException with_runtime_revision_environment(
        RUNTIME_REVISION_FIXTURE_SHA,
    ) do
        error("runtime revision ENV restoration probe")
    end
    @test haskey(ENV, RUNTIME_REVISION_ENV_KEY) == environment_was_present
    @test get(ENV, RUNTIME_REVISION_ENV_KEY, nothing) == environment_before
end

module RuntimeRevisionBootstrapFixture end
with_runtime_revision_environment(RUNTIME_REVISION_FIXTURE_SHA) do
    Base.include(RuntimeRevisionBootstrapFixture, RUNTIME_REVISION_CONFIG_PATH)
    Core.eval(
        RuntimeRevisionBootstrapFixture,
        :(const RUNTIME_REVISION = runtime_revision_from_environment()),
    )
end

@testset "TASK-0043 runtime revision is immutable for process lifetime" begin
    initialized = RuntimeRevisionBootstrapFixture.RUNTIME_REVISION
    @test initialized.sha == RUNTIME_REVISION_FIXTURE_SHA
    with_runtime_revision_environment(RUNTIME_REVISION_OTHER_SHA) do
        @test RuntimeRevisionBootstrapFixture.RUNTIME_REVISION === initialized
        @test RuntimeRevisionBootstrapFixture.RUNTIME_REVISION.sha ==
            RUNTIME_REVISION_FIXTURE_SHA
        @test RuntimeRevisionBootstrapFixture.runtime_revision_from_environment().sha ==
            RUNTIME_REVISION_OTHER_SHA
    end

    bootstrap_source = RUNTIME_API.source("app", "bootstrap.jl")
    @test length(collect(eachmatch(
        r"const RUNTIME_REVISION = runtime_revision_from_environment\(\)",
        bootstrap_source,
    ))) == 1
end

if !isdefined(RUNTIME_API, :RuntimeRevision)
    Base.include(RUNTIME_API, RUNTIME_REVISION_CONFIG_PATH)
end
if !isdefined(RUNTIME_API, :EXAMPLE_APP_STATE)
    Core.eval(RUNTIME_API, :(const EXAMPLE_APP_STATE = Dict{String,Any}(
        "project_name" => "example_project",
        "ready" => true,
    )))
end
if !isdefined(RUNTIME_API, :RUNTIME_REVISION)
    fixture_sha = RUNTIME_REVISION_FIXTURE_SHA
    Core.eval(
        RUNTIME_API,
        :(const RUNTIME_REVISION = RuntimeRevision($fixture_sha)),
    )
end

@testset "TASK-0043 status payload and no-store route wiring" begin
    payload = RUNTIME_API.status_payload()
    response = RUNTIME_API.api_json(payload)

    @test response.status == 200
    @test Set(keys(response.body)) == Set([
        "ok",
        "project",
        "ready",
        "runtime_revision",
    ])
    @test response.body["ok"] === true
    @test response.body["project"] == "example_project"
    @test response.body["ready"] === true
    @test response.body["runtime_revision"] == RUNTIME_REVISION_FIXTURE_SHA

    routes_source = RUNTIME_API.source("app", "routes.jl")
    @test length(collect(eachmatch(
        r"route\(\"/api/status\", method = GET\)",
        routes_source,
    ))) == 1
    status_route_match = match(
        r"route\(\"/api/status\", method = GET\) do\n(?s:.*?)\nend",
        routes_source,
    )
    @test status_route_match !== nothing
    status_route = status_route_match === nothing ? "" : status_route_match.match
    @test occursin(
        "Genie.Renderer.HTTPHeaders([\"Cache-Control\" => \"no-store\"])",
        status_route,
    )
    @test occursin(
        "api_json(status_payload(); headers = response_headers)",
        status_route,
    )
    @test !occursin(r"route\(\"/api/status\", method = POST\)", routes_source)
end
