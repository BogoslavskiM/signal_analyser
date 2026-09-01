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

    browser_action_base = Dict{String,Any}(
        "file_browser_target" => "native-import-file",
        "mode" => "file",
        "allowed_extensions" => [".JLD2", "jld2"],
        "root_path" => "/user",
        "current_path" => "/user",
        "selected_path" => "",
        "sort_ascending" => true,
        "expanded_paths" => String[],
    )
    action_payload(action; extra = Dict{String,Any}()) = merge(
        browser_action_base,
        Dict{String,Any}("action" => action),
        extra,
    )
    parsed_actions = Dict(
        "open" => NIO.parse_native_file_browser_action_request(action_payload(
            "open"; extra = Dict{String,Any}("initial_path" => "/user/session.jld2"),
        )),
        "path" => NIO.parse_native_file_browser_action_request(action_payload(
            "path"; extra = Dict{String,Any}("current_path" => "/user/sessions"),
        )),
        "toggle" => NIO.parse_native_file_browser_action_request(action_payload(
            "toggle"; extra = Dict{String,Any}("toggle_path" => "/user/sessions"),
        )),
        "sort" => NIO.parse_native_file_browser_action_request(action_payload(
            "sort"; extra = Dict{String,Any}("sort_ascending" => false),
        )),
        "select" => NIO.parse_native_file_browser_action_request(action_payload(
            "select"; extra = Dict{String,Any}("selected_path" => "/user/session.jld2"),
        )),
        "cancel" => NIO.parse_native_file_browser_action_request(action_payload("cancel")),
    )
    @test Set(keys(parsed_actions)) == Set(["open", "path", "toggle", "sort", "select", "cancel"])
    @test parsed_actions["open"].initial_path == "/user/session.jld2"
    @test parsed_actions["path"].current_path == "/user/sessions"
    @test parsed_actions["toggle"].toggle_path == "/user/sessions"
    @test !parsed_actions["sort"].sort_ascending
    @test parsed_actions["select"].selected_path == "/user/session.jld2"
    @test parsed_actions["cancel"].allowed_extensions == [".jld2"]
    for invalid in (
        action_payload("open"),
        action_payload("path"; extra = Dict{String,Any}("initial_path" => "/user")),
        action_payload("toggle"),
        action_payload("unsupported"),
        action_payload("sort"; extra = Dict{String,Any}("sort_ascending" => "asc")),
        action_payload("path"; extra = Dict{String,Any}("root_path" => "/user/subdir")),
        action_payload("path"; extra = Dict{String,Any}("expanded_paths" => ["/user/../secret"])),
        action_payload("path"; extra = Dict{String,Any}("allowed_extensions" => ["../jld2"])),
        merge(action_payload("path"), Dict{String,Any}("extra" => true)),
    )
        @test_throws NIO.NativeEngeeIOError NIO.parse_native_file_browser_action_request(invalid)
    end
    @test_throws NIO.NativeEngeeIOError NIO.parse_native_file_browser_action_request(merge(
        action_payload("path"),
        Dict{String,Any}("mode" => "directory", "allowed_extensions" => [".jld2"]),
    ))

    session = NIO.parse_native_save_command(Dict(
        "state_revision" => 3, "operation" => "session", "scope" => "session",
        "signal_names" => String[], "target" => "/user/session.jld2", "overwrite" => false,
    ))
    @test session.operation == "session" && isempty(session.signal_names)
    @test session.scope == "session"
    single = NIO.parse_native_save_command(Dict(
        "state_revision" => 3, "operation" => "workspace", "scope" => "library",
        "signal_names" => ["one"], "target" => "one_signal", "overwrite" => false,
    ))
    multiple = NIO.parse_native_save_command(Dict(
        "state_revision" => 3, "operation" => "workspace", "scope" => "signal",
        "signal_names" => ["one", "two"], "target" => "signal_library", "overwrite" => false,
    ))
    @test single.scope == "signal" && multiple.scope == "library"
    function_save = NIO.parse_native_save_command(Dict(
        "state_revision" => 3, "operation" => "function", "scope" => "signal",
        "signal_names" => ["one"], "target" => "/user/transform_one.jl", "overwrite" => false,
    ))
    @test function_save.operation == "function" && function_save.scope == "signal"
    for invalid in (
        Dict("state_revision" => 3, "operation" => "session", "scope" => "signal", "signal_names" => ["x"], "target" => "/user/x.jld2", "overwrite" => false),
        Dict("state_revision" => 3, "operation" => "workspace", "scope" => "signal", "signal_names" => String[], "target" => "x", "overwrite" => false),
        Dict("state_revision" => 3, "operation" => "workspace", "scope" => "signal", "signal_names" => ["x"], "target" => "x", "overwrite" => false, "extra" => true),
        Dict("state_revision" => 3, "operation" => "function", "scope" => "library", "signal_names" => ["x", "y"], "target" => "/user/x.jl", "overwrite" => false),
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

    real_signal = NIO.AnalysedSignal("one", "#111111", 10.0, ComplexF64[1, 2], false, true)
    complex_signal = NIO.AnalysedSignal("two", "#222222", 10.0, ComplexF64[3 + 4im, 5 + 6im], true, true)
    single_value = NIO.native_workspace_value([real_signal])
    library_value = NIO.native_workspace_value([real_signal, complex_signal])
    @test single_value isa Vector{Float64} && single_value == [1.0, 2.0]
    @test library_value isa Dict{String,Any}
    @test library_value["one"] == [1.0, 2.0]
    @test library_value["two"] == ComplexF64[3 + 4im, 5 + 6im]

    recipe_signal = NIO.AnalysedSignal(
        "filtered",
        "#333333",
        20.0,
        ComplexF64[1, 2],
        false,
        true,
        NIO.SignalOperationRecipe[
            NIO.SignalOperationRecipe("custom-preprocess", "init_signal .* 2", 10.0, 10.0),
            NIO.SignalOperationRecipe("crop", "copy(init_signal[1:2])", 10.0, 10.0),
            NIO.SignalOperationRecipe("resample", "copy(init_signal)", 10.0, 20.0),
        ],
    )
    generated = NIO.native_reproducer_script(NIO.AnalysedSignal[recipe_signal])
    @test occursin("function transform_filtered(input_signal)", generated)
    @test occursin("init_signal .* 2", generated)
    @test occursin("copy(init_signal[1:2])", generated)
    @test occursin("import EngeeDSP\n\nfunction", generated)
    @test occursin("return (values = init_signal, sample_rate_hz =", generated)
    @test !occursin("engee.genie", generated)
    @test !occursin("SIGNAL_ANALYSER_SIGNALS", generated)
    @test !NIO.signal_operation_parse_has_error(Meta.parseall(generated))
    @test_throws NIO.NativeEngeeIOError NIO.native_reproducer_script(NIO.AnalysedSignal[real_signal])

    source = NIO.source("lib", "services", "native_session_io_service.jl")
    @test occursin("root_real = realpath", source) && occursin("child_real = try\n                realpath(child)", source)
    @test occursin("inside_child = inside(child_real)", source) && occursin("selectable = inside_child &&", source) && occursin("startswith(name, \".\") && continue", source)
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
    @test occursin("scope = length(names) == 1 ? \"signal\" : \"library\"", source)
    @test occursin("length(signals) == 1 && return native_signal_value(only(signals))", source)
    @test occursin("values = Dict{String,Any}()", source) && occursin("values[signal.name] = native_signal_value(signal)", source)
    workspace_start = first(findfirst("function native_save_workspace", source))
    workspace_end = first(findfirst("function native_float_vector_literal", source))
    workspace_save = source[workspace_start:(workspace_end - 1)]
    @test length(collect(eachmatch(r"native_workspace_preflight\(target\)", workspace_save))) == 1
    @test length(collect(eachmatch(r"native_engee_send\(target, native_workspace_value\(signals\)\)", workspace_save))) == 1
    @test length(collect(eachmatch(r"\"variable_name\" => target", workspace_save))) == 1
    @test first(findfirst("if !command.overwrite && existed", workspace_save)) <
        first(findfirst("native_engee_send(target", workspace_save))
    @test occursin("command.operation == \"session\"", source) &&
        first(findfirst("if command.operation == \"session\"", source)) <
        first(findfirst("signals = native_snapshot_signals", source))

    # The new action endpoint owns the complete browser state.  A deterministic
    # String-specialized adapter double verifies the typed response mapping
    # without starting Genie or touching a local/remote filesystem.
    if !isdefined(NIO, :NATIVE_BROWSER_ACTION_TEST_RESULT)
        @eval NIO begin
            const NATIVE_BROWSER_ACTION_TEST_RESULT = Ref{Any}(nothing)
            const NATIVE_BROWSER_ACTION_TEST_CODE = Ref("")
            function native_engee_eval(code::String)
                NATIVE_BROWSER_ACTION_TEST_CODE[] = code
                NATIVE_BROWSER_ACTION_TEST_RESULT[]
            end
        end
    end
    NIO.NATIVE_BROWSER_ACTION_TEST_RESULT[] = (
        open = true,
        root_path = "/user",
        current_path = "/user",
        parent_path = "/user",
        selected_path = "",
        sort_ascending = true,
        entries = [
            (name = "sessions", path = "/user/sessions", kind = "directory", depth = 0, expanded = true, selectable = true),
            (name = "notes.txt", path = "/user/notes.txt", kind = "file", depth = 1, expanded = false, selectable = false),
        ],
    )
    action_response = NIO.native_file_browser_action_payload(
        NIO.NativeSessionIOService(),
        parsed_actions["toggle"],
    )
    @test Set(keys(action_response)) == Set([
        "ok", "open", "root_path", "current_path", "parent_path",
        "selected_path", "sort_ascending", "entries",
    ])
    @test action_response["ok"] === true && action_response["open"] === true
    @test action_response["root_path"] == "/user" && action_response["current_path"] == "/user"
    @test action_response["selected_path"] == "" && action_response["sort_ascending"] === true
    @test length(action_response["entries"]) == 2
    @test Set(keys(action_response["entries"][1])) == Set([
        "name", "path", "kind", "depth", "expanded", "selectable",
    ])
    @test action_response["entries"][1]["depth"] == 0
    @test action_response["entries"][1]["expanded"] === true
    @test action_response["entries"][2]["selectable"] === false
    @test occursin("action = \"toggle\"", NIO.NATIVE_BROWSER_ACTION_TEST_CODE[])

    @test occursin("action in (\"open\", \"path\") ? String[]", source)
    @test occursin("startswith(name, \".\") && continue", source)
    @test occursin("public_path = safe ? String(child_real) : String(lexical_path)", source)
    @test occursin("selectable = item.safe &&", source)
    @test occursin("lowercase(splitext(item.name)[2]) in allowed_extensions", source)
    @test occursin("filter!(path -> !(path == toggle_real || startswith(path, toggle_real * \"/\")), expanded)", source)
    @test occursin("depth = depth", source) && occursin("expanded = is_expanded", source)

    options = NIO.native_save_options(NIO.NativeSessionIOService(), NIO.default_signal_analyser_state())
    @test options["defaults"]["import_session_target"] == "/user/signal-analyser-session.jld2"
    @test options["defaults"]["replace"] === true
    function_option = only(filter(item -> item["id"] == "function", options["operations"]))
    @test function_option["label"] == "Julia-функция"
    @test function_option["file_extension"] == ".jl"
    @test endswith(options["defaults"]["function_signal_target"], ".jl")

    routes = NIO.source("app", "routes.jl")
    for route in ("/api/save/options", "/api/file-browser/list", "/api/file-browser/action", "/api/save", "/api/import/session")
        @test length(collect(eachmatch(Regex("route\\(\\\"" * route * "\\\""), routes))) == 1
    end
    @test occursin("parse_native_file_browser_action_request(jsonpayload())", routes)
    @test occursin("native_file_browser_action_payload(NATIVE_SESSION_IO_SERVICE, request)", routes)
    @test occursin("native_engee_provider_error_response", routes)
    api = NIO.source("app", "api.jl")
    @test occursin("\"engee_unavailable\"", api) && occursin("status = err isa WorkspaceUnavailableError ? 503 : 502", api)
    exists_response = NIO.native_engee_io_error_response(NIO.native_io_error(
        "target_exists",
        "Workspace variable уже существует: signal_1";
        field = "overwrite",
    ))
    @test exists_response.status == 409
    @test exists_response.body["code"] == "target_exists"
    @test exists_response.body["error"]["code"] == "target_exists"
    @test exists_response.body["error"]["fields"] == Dict("overwrite" => "Workspace variable уже существует: signal_1")
    stale_response = NIO.signal_analyser_session_stale_response(
        NIO.default_signal_analyser_state(),
        NIO.SignalAnalyserStaleStateError(99, 0),
    )
    @test stale_response.status == 409
    @test stale_response.body["code"] == "stale_state"
    @test stale_response.body["error"]["code"] == "stale_state"
end
