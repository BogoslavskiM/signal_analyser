using Test

const RUNTIME_API = Main.AppTestContext
const RUNTIME_REVISION_FIXTURE_SHA = "0123456789abcdef0123456789abcdef01234567"
const RUNTIME_REVISION_CONFIG_PATH = joinpath(
    RUNTIME_API.PROJECT_ROOT,
    "lib",
    "config.jl",
)

module RuntimeRevisionConfigFixture end
Base.include(RuntimeRevisionConfigFixture, RUNTIME_REVISION_CONFIG_PATH)

function runtime_git_command(repository::String, arguments::String...)
    Cmd(vcat(["git", "-C", repository], collect(arguments)))
end

function run_runtime_git(repository::String, arguments::String...)
    run(runtime_git_command(repository, arguments...))
end

function read_runtime_git(repository::String, arguments::String...)
    readchomp(runtime_git_command(repository, arguments...))
end

function write_runtime_fixture(path::String, contents::String)
    mkpath(dirname(path))
    write(path, contents)
end

function append_runtime_fixture(path::String, contents::String)
    open(path, "a") do io
        write(io, contents)
    end
end

function with_runtime_repository(callback::Function)
    mktempdir() do repository
        run(`git init --quiet $repository`)
        run_runtime_git(repository, "config", "user.name", "Runtime Revision Test")
        run_runtime_git(
            repository,
            "config",
            "user.email",
            "runtime-revision@example.invalid",
        )

        write_runtime_fixture(joinpath(repository, "app", "runtime.txt"), "app\n")
        write_runtime_fixture(joinpath(repository, "lib", "runtime.txt"), "lib\n")
        write_runtime_fixture(joinpath(repository, "public", "runtime.txt"), "public\n")
        write_runtime_fixture(joinpath(repository, "run.jl"), "# runtime entrypoint\n")
        write_runtime_fixture(joinpath(repository, "notes.txt"), "outside runtime surface\n")
        run_runtime_git(repository, "add", "--all")
        run_runtime_git(repository, "commit", "--quiet", "-m", "initial runtime fixture")

        callback(repository)
    end
end

function with_runtime_path(callback::Function, path::String)
    was_present = haskey(ENV, "PATH")
    previous = get(ENV, "PATH", nothing)
    try
        ENV["PATH"] = path
        callback()
    finally
        if was_present
            ENV["PATH"] = previous::String
        else
            pop!(ENV, "PATH", nothing)
        end
    end
end

function captured_exception(callback::Function)
    try
        callback()
        nothing
    catch exception
        exception
    end
end

function write_fake_git(directory::String, contents::String)
    path = joinpath(directory, "git")
    write(path, contents)
    chmod(path, 0o755)
    path
end

@testset "TASK-0043 strict runtime revision value" begin
    revision = RuntimeRevisionConfigFixture.RuntimeRevision(
        RUNTIME_REVISION_FIXTURE_SHA,
    )
    @test revision.sha == RUNTIME_REVISION_FIXTURE_SHA
    @test typeof(revision) === RuntimeRevisionConfigFixture.RuntimeRevision

    invalid_values = (
        ("empty", ""),
        ("padded", " $RUNTIME_REVISION_FIXTURE_SHA "),
        ("uppercase", uppercase(RUNTIME_REVISION_FIXTURE_SHA)),
        ("non-hex", first(RUNTIME_REVISION_FIXTURE_SHA, 39) * "g"),
        ("39-char", first(RUNTIME_REVISION_FIXTURE_SHA, 39)),
        ("41-char", RUNTIME_REVISION_FIXTURE_SHA * "0"),
    )
    for (label, value) in invalid_values
        @testset "$label is rejected" begin
            @test_throws ArgumentError RuntimeRevisionConfigFixture.RuntimeRevision(value)
        end
    end
end

@testset "TASK-0043 clean Git checkout attestation" begin
    with_runtime_repository() do repository
        expected_sha = read_runtime_git(
            repository,
            "rev-parse",
            "--verify",
            "HEAD^{commit}",
        )
        revision = RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
            repository,
        )

        @test revision.sha == expected_sha
        @test occursin(r"\A[0-9a-f]{40}\z", revision.sha)
        @test typeof(revision) === RuntimeRevisionConfigFixture.RuntimeRevision
    end
end

@testset "TASK-0043 runtime revision is immutable for process lifetime" begin
    with_runtime_repository() do repository
        initial_sha = read_runtime_git(repository, "rev-parse", "HEAD")
        process_fixture = Module(gensym(:RuntimeRevisionProcessFixture))
        Core.eval(
            process_fixture,
            :(const RUNTIME_REVISION = Main.RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout($repository)),
        )
        initialized = Base.invokelatest(
            getfield,
            process_fixture,
            :RUNTIME_REVISION,
        )

        append_runtime_fixture(joinpath(repository, "app", "runtime.txt"), "next\n")
        run_runtime_git(repository, "add", "--", "app/runtime.txt")
        run_runtime_git(repository, "commit", "--quiet", "-m", "next runtime fixture")
        current_sha = read_runtime_git(repository, "rev-parse", "HEAD")

        @test current_sha != initial_sha
        @test Base.invokelatest(
            getfield,
            process_fixture,
            :RUNTIME_REVISION,
        ) === initialized
        @test initialized.sha == initial_sha
        @test RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(repository).sha ==
            current_sha
    end

    bootstrap_source = RUNTIME_API.source("app", "bootstrap.jl")
    @test length(collect(eachmatch(
        r"const RUNTIME_REVISION = runtime_revision_from_git_checkout\(\s*normpath\(joinpath\(@__DIR__, \"\.\.\"\)\),\s*\)",
        bootstrap_source,
    ))) == 1
end

@testset "TASK-0043 Git attestation failures are fail-closed" begin
    mktempdir() do non_repository
        @test_throws ProcessFailedException RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
            non_repository,
        )
    end

    with_runtime_repository() do repository
        mktempdir() do empty_path
            missing_git_error = with_runtime_path(empty_path) do
                captured_exception() do
                    RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
                        repository,
                    )
                end
            end
            @test missing_git_error !== nothing
            @test missing_git_error isa Base.IOError
        end

        mktempdir() do fake_path
            write_fake_git(fake_path, "#!/bin/sh\nexit 17\n")
            command_error = with_runtime_path(fake_path) do
                captured_exception() do
                    RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
                        repository,
                    )
                end
            end
            @test command_error isa ProcessFailedException
        end

        mktempdir() do fake_path
            write_fake_git(
                fake_path,
                "#!/bin/sh\ncase \"\$*\" in\n*rev-parse*) printf 'not-a-sha\\n'; exit 0 ;;\n*status*) exit 0 ;;\nesac\nexit 17\n",
            )
            with_runtime_path(fake_path) do
                @test_throws ArgumentError RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
                    repository,
                )
            end
        end
    end
end

@testset "TASK-0043 dirty runtime surface is rejected" begin
    dirty_cases = (
        (
            "staged app change",
            repository -> begin
                append_runtime_fixture(joinpath(repository, "app", "runtime.txt"), "staged\n")
                run_runtime_git(repository, "add", "--", "app/runtime.txt")
            end,
        ),
        (
            "unstaged lib change",
            repository -> append_runtime_fixture(
                joinpath(repository, "lib", "runtime.txt"),
                "unstaged\n",
            ),
        ),
        (
            "untracked public change",
            repository -> write_runtime_fixture(
                joinpath(repository, "public", "untracked.txt"),
                "untracked\n",
            ),
        ),
        (
            "run.jl change",
            repository -> append_runtime_fixture(
                joinpath(repository, "run.jl"),
                "# dirty\n",
            ),
        ),
    )

    for (label, make_dirty) in dirty_cases
        @testset "$label is rejected" begin
            with_runtime_repository() do repository
                make_dirty(repository)
                @test_throws ArgumentError RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
                    repository,
                )
            end
        end
    end
end

@testset "TASK-0043 changes outside runtime surface are allowed" begin
    with_runtime_repository() do repository
        expected_sha = read_runtime_git(repository, "rev-parse", "HEAD")
        append_runtime_fixture(joinpath(repository, "notes.txt"), "unstaged\n")
        write_runtime_fixture(joinpath(repository, "docs", "staged.txt"), "staged\n")
        run_runtime_git(repository, "add", "--", "docs/staged.txt")
        write_runtime_fixture(joinpath(repository, "scratch.txt"), "untracked\n")

        revision = RuntimeRevisionConfigFixture.runtime_revision_from_git_checkout(
            repository,
        )
        @test revision.sha == expected_sha
        @test !isempty(read_runtime_git(repository, "status", "--porcelain=v1"))
    end
end

@testset "TASK-0043 implementation source contracts" begin
    config_source = RUNTIME_API.source("lib", "config.jl")
    bootstrap_source = RUNTIME_API.source("app", "bootstrap.jl")
    implementation_source = config_source * bootstrap_source

    @test occursin(
        r"status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none -- app lib public run\.jl",
        config_source,
    )
    @test !occursin("Project.toml", implementation_source)
    @test !occursin("Manifest.toml", implementation_source)
    @test !occursin(r"\bENV\b", implementation_source)
    @test !occursin("runtime_revision_from_environment", implementation_source)
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
