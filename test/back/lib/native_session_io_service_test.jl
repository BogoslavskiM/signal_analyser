using Test

const NIO = Main.AppTestContext

@testset "TASK-0106 native Engee I/O parser and safe service contracts" begin
    browser = NIO.parse_native_file_browser_request(Dict(
        "path" => "/user/sessions",
        "selection_mode" => "file",
        "extension" => ".JLD2",
        "sort_direction" => "desc",
    ))
    @test browser.path == "/user/sessions"
    @test browser.selection_mode == "file" && browser.extension == ".jld2"
    @test !browser.sort_ascending

    for path in ("user", "/tmp/session.jld2", "/user/../secret", "/user/.hidden", "/user/a/./b")
        @test_throws NIO.NativeEngeeIOError NIO.native_normalize_user_path(path)
    end
    @test_throws NIO.NativeEngeeIOError NIO.parse_native_file_browser_request(Dict(
        "path" => "/user", "selection_mode" => "directory", "extension" => ".jld2", "sort_direction" => "asc",
    ))
    @test_throws NIO.NativeEngeeIOError NIO.parse_native_file_browser_request(Dict(
        "path" => "/user", "selection_mode" => "file", "extension" => nothing, "sort_direction" => "asc", "extra" => true,
    ))

    session = NIO.parse_native_save_command(Dict(
        "state_revision" => 3, "operation" => "session", "scope" => "session",
        "signal_names" => String[], "target" => "/user/session.jld2", "overwrite" => false,
    ))
    @test session.operation == "session" && isempty(session.signal_names)
    for invalid in (
        Dict("state_revision" => 3, "operation" => "session", "scope" => "signal", "signal_names" => ["x"], "target" => "/user/x.jld2", "overwrite" => false),
        Dict("state_revision" => 3, "operation" => "workspace", "scope" => "signal", "signal_names" => String[], "target" => "x", "overwrite" => false),
        Dict("state_revision" => 3, "operation" => "workspace", "scope" => "signal", "signal_names" => ["x"], "target" => "x", "overwrite" => false, "extra" => true),
    )
        @test_throws NIO.NativeEngeeIOError NIO.parse_native_save_command(invalid)
    end
    @test_throws NIO.NativeEngeeIOError NIO.parse_native_import_command(Dict(
        "state_revision" => 3, "path" => "/user/session.sazip", "replace" => true,
    ))
    @test_throws NIO.NativeEngeeIOError NIO.parse_native_import_command(Dict(
        "state_revision" => 3, "path" => "/user/session.jld2", "replace" => false,
    ))

    @test NIO.native_require_workspace_name("signal_1", "target") == "signal_1"
    for name in ("1signal", "signal-name", "Main", repeat("x", 129))
        @test_throws NIO.NativeEngeeIOError NIO.native_require_workspace_name(name, "target")
    end

    source = NIO.source("lib", "services", "native_session_io_service.jl")
    @test occursin("root_real = realpath", source) && occursin("child_real = try\n                realpath(child)", source)
    @test occursin("inside(child_real) || continue", source) && occursin("startswith(name, \".\") && continue", source)
    @test occursin("item.kind == \"directory\" ? 0 : 1", source) && occursin("sort_direction", source)
    @test occursin("native_remote_file_write_script", source) && occursin("finally\n            !isempty(temp)", source)
    @test occursin("NATIVE_IO_SCRATCH_NAME", source) && occursin("transfer_lock::ReentrantLock", source)
    @test occursin("previous = native_engee_recv(service.scratch_name)", source) && occursin("internal_name_conflict", source)
    @test length(collect(eachmatch(r"lock\(service\.transfer_lock\) do", source))) == 3
    @test length(collect(eachmatch(r"native_clear_scratch\(service\)", source))) == 3
    @test occursin("NATIVE_REPRODUCER_MAX_BYTES", source) && occursin("script_too_large", source)
    @test occursin("NATIVE_SIGNAL_JLD2_SCHEMA", source) && occursin("imag_values = payload.imag_values", source)
    @test occursin("__genie_app_name", source) && occursin("SIGNAL_ANALYSER_SESSION_VERSION", source)
    @test occursin("signal_analyser_session_candidate", source) && occursin("signal_analyser_publish_session!", source)
    @test occursin("command.state_revision == state.view.state_revision", source)

    routes = NIO.source("app", "routes.jl")
    for route in ("/api/save/options", "/api/file-browser/list", "/api/save", "/api/import/session")
        @test length(collect(eachmatch(Regex("route\\(\\\"" * route * "\\\""), routes))) == 1
    end
    @test occursin("native_engee_provider_error_response", routes)
    api = NIO.source("app", "api.jl")
    @test occursin("\"engee_unavailable\"", api) && occursin("status = err isa WorkspaceUnavailableError ? 503 : 502", api)
end
