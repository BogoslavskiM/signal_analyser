const NATIVE_SESSION_APP_NAME = "Signal Analyser"
const NATIVE_SIGNAL_JLD2_SCHEMA = "signal-analyser-signals"
const NATIVE_SIGNAL_JLD2_VERSION = 1
const NATIVE_SAVE_OPERATIONS = ("workspace", "function", "jld2", "session")
const NATIVE_SAVE_SCOPES = ("signal", "library", "session")
const NATIVE_FILE_BROWSER_MODES = ("directory", "file")
const NATIVE_SORT_DIRECTIONS = ("asc", "desc")
const NATIVE_WORKSPACE_NAME_REGEX = r"^[A-Za-z_][A-Za-z0-9_]{0,127}$"
const NATIVE_IO_SCRATCH_NAME = "_signal_analyser_native_io_scratch_v1"
const NATIVE_REPRODUCER_MAX_BYTES = 64 * 1024 * 1024
const NATIVE_REPRODUCER_BASE_BYTES = 4096
const NATIVE_REPRODUCER_SIGNAL_METADATA_BYTES = 4096
const NATIVE_REPRODUCER_REAL_SAMPLE_BYTES = 32
const NATIVE_REPRODUCER_COMPLEX_SAMPLE_BYTES = 80
const NATIVE_FILE_BROWSER_REQUEST_FIELDS = Set([
    "path",
    "selection_mode",
    "extension",
    "sort_direction",
])
const NATIVE_FILE_BROWSER_ACTIONS = ("open", "path", "toggle", "sort", "select", "cancel")
const NATIVE_FILE_BROWSER_ACTION_REQUEST_FIELDS = Set([
    "action",
    "file_browser_target",
    "mode",
    "allowed_extensions",
    "root_path",
    "current_path",
    "selected_path",
    "sort_ascending",
    "expanded_paths",
    "initial_path",
    "toggle_path",
])
const NATIVE_SAVE_REQUEST_FIELDS = Set([
    "state_revision",
    "operation",
    "scope",
    "signal_names",
    "target",
    "overwrite",
])
const NATIVE_IMPORT_REQUEST_FIELDS = Set(["state_revision", "path", "replace"])

struct NativeEngeeIOError <: Exception
    code::String
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::NativeEngeeIOError) = print(io, err.message)

native_io_error(
    code::AbstractString,
    message::AbstractString;
    field::AbstractString = "body",
) = NativeEngeeIOError(
    String(code),
    String(message),
    Dict(String(field) => String(message)),
)

struct NativeFileBrowserRequest
    path::String
    selection_mode::String
    extension::Union{Nothing,String}
    sort_ascending::Bool
end

struct NativeFileBrowserActionRequest
    action::String
    file_browser_target::String
    mode::String
    allowed_extensions::Vector{String}
    root_path::String
    current_path::String
    selected_path::String
    sort_ascending::Bool
    expanded_paths::Vector{String}
    initial_path::String
    toggle_path::String
end

struct NativeSaveCommand
    state_revision::Int
    operation::String
    scope::String
    signal_names::Vector{String}
    target::String
    overwrite::Bool
end

struct NativeSessionImportCommand
    state_revision::Int
    path::String
end

struct NativePreparedSessionImport
    path::String
    document::SignalAnalyserSessionDocument
end

struct NativeSessionIOService
    scratch_name::String
    transfer_lock::ReentrantLock

    function NativeSessionIOService(
        scratch_name::AbstractString = NATIVE_IO_SCRATCH_NAME,
        transfer_lock::ReentrantLock = ReentrantLock(),
    )
        name = String(scratch_name)
        name == NATIVE_IO_SCRATCH_NAME || throw(ArgumentError(
            "Native session IO scratch name является зарезервированным контрактом",
        ))
        new(name, transfer_lock)
    end
end

function native_exact_request(data, fields::Set{String})::AbstractDict
    data isa AbstractDict || throw(native_io_error(
        "invalid_request",
        "Body должен быть JSON-объектом",
    ))
    actual = signal_analyser_payload_keys(data)
    actual == fields || throw(native_io_error(
        "invalid_request",
        "Body должен содержать только: $(join(sort!(collect(fields)), ", "))",
    ))
    data
end

function native_request_string(data::AbstractDict, key::String; allow_empty::Bool = false)::String
    raw = signal_analyser_payload_value(data, key)
    raw isa AbstractString || throw(native_io_error(
        "invalid_request",
        "$key должен быть строкой";
        field = key,
    ))
    value = String(raw)
    (!allow_empty && isempty(strip(value))) && throw(native_io_error(
        "invalid_request",
        "$key не может быть пустым";
        field = key,
    ))
    ncodeunits(value) <= 4096 || throw(native_io_error(
        "invalid_request",
        "$key слишком длинный";
        field = key,
    ))
    value
end

function native_request_revision(data::AbstractDict)::Int
    raw = signal_analyser_payload_value(data, "state_revision")
    raw isa Integer && !(raw isa Bool) && raw >= 0 || throw(native_io_error(
        "invalid_request",
        "state_revision должен быть неотрицательным целым числом";
        field = "state_revision",
    ))
    try
        Int(raw)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(native_io_error(
            "invalid_request",
            "state_revision выходит за диапазон Int";
            field = "state_revision",
        ))
    end
end

function native_normalize_user_path(raw_path::AbstractString; allow_root::Bool = true)::String
    value = strip(String(raw_path))
    isempty(value) && (value = NATIVE_ENGEE_USER_ROOT)
    occursin('\0', value) && throw(native_io_error(
        "unsafe_path",
        "Путь содержит недопустимый символ";
        field = "path",
    ))
    isabspath(value) || throw(native_io_error(
        "unsafe_path",
        "Требуется абсолютный путь внутри /user";
        field = "path",
    ))
    raw_parts = split(value, '/'; keepempty = false)
    any(part -> part in (".", "..") || startswith(part, "."), raw_parts) && throw(
        native_io_error(
            "unsafe_path",
            "Traversal и скрытые пути запрещены";
            field = "path",
        ),
    )
    normalized = normpath(value)
    inside = normalized == NATIVE_ENGEE_USER_ROOT ||
        startswith(normalized, NATIVE_ENGEE_USER_ROOT * "/")
    inside || throw(native_io_error(
        "unsafe_path",
        "Путь должен находиться внутри /user";
        field = "path",
    ))
    allow_root || normalized != NATIVE_ENGEE_USER_ROOT || throw(native_io_error(
        "unsafe_path",
        "Требуется путь к файлу внутри /user";
        field = "path",
    ))
    normalized
end

function native_file_extension(raw)::Union{Nothing,String}
    raw === nothing && return nothing
    raw isa AbstractString || throw(native_io_error(
        "invalid_request",
        "extension должен быть null или строкой";
        field = "extension",
    ))
    value = lowercase(strip(String(raw)))
    isempty(value) && return nothing
    startswith(value, ".") || (value = "." * value)
    occursin(r"^\.[a-z0-9]{1,16}$", value) || throw(native_io_error(
        "invalid_request",
        "extension имеет неверный формат";
        field = "extension",
    ))
    value
end

function native_file_extensions(raw)::Vector{String}
    raw isa AbstractVector || throw(native_io_error(
        "invalid_request",
        "allowed_extensions должен быть массивом строк";
        field = "allowed_extensions",
    ))
    extensions = String[]
    for item in raw
        extension = native_file_extension(item)
        extension === nothing && throw(native_io_error(
            "invalid_request",
            "allowed_extensions не должен содержать пустые расширения";
            field = "allowed_extensions",
        ))
        extension in extensions || push!(extensions, extension)
    end
    extensions
end

function native_optional_request_string(
    data::AbstractDict,
    key::String;
    default::String = "",
)::String
    raw = signal_analyser_payload_value(data, key)
    raw === nothing && return default
    raw isa AbstractString || throw(native_io_error(
        "invalid_request",
        "$key должен быть строкой";
        field = key,
    ))
    value = String(raw)
    ncodeunits(value) <= 4096 || throw(native_io_error(
        "invalid_request",
        "$key слишком длинный";
        field = key,
    ))
    value
end

function native_request_paths(data::AbstractDict, key::String)::Vector{String}
    raw = signal_analyser_payload_value(data, key)
    raw isa AbstractVector || throw(native_io_error(
        "invalid_request",
        "$key должен быть массивом строк";
        field = key,
    ))
    paths = String[]
    for item in raw
        item isa AbstractString || throw(native_io_error(
            "invalid_request",
            "$key должен содержать только строки";
            field = key,
        ))
        path = native_normalize_user_path(String(item))
        path in paths || push!(paths, path)
    end
    length(paths) <= 1024 || throw(native_io_error(
        "invalid_request",
        "$key содержит слишком много путей";
        field = key,
    ))
    paths
end

function parse_native_file_browser_action_request(data)::NativeFileBrowserActionRequest
    data isa AbstractDict || throw(native_io_error(
        "invalid_request",
        "Body должен быть JSON-объектом",
    ))
    actual = signal_analyser_payload_keys(data)
    issubset(actual, NATIVE_FILE_BROWSER_ACTION_REQUEST_FIELDS) || throw(native_io_error(
        "invalid_request",
        "Body содержит неподдерживаемые поля file browser",
    ))
    required = Set([
        "action",
        "file_browser_target",
        "mode",
        "allowed_extensions",
        "root_path",
        "current_path",
        "selected_path",
        "sort_ascending",
        "expanded_paths",
    ])
    issubset(required, actual) || throw(native_io_error(
        "invalid_request",
        "Body не содержит обязательные поля file browser",
    ))

    action = native_request_string(data, "action")
    action in NATIVE_FILE_BROWSER_ACTIONS || throw(native_io_error(
        "invalid_request",
        "action должен быть open, path, toggle, sort, select или cancel";
        field = "action",
    ))
    expected = copy(required)
    action == "open" && push!(expected, "initial_path")
    action == "toggle" && push!(expected, "toggle_path")
    actual == expected || throw(native_io_error(
        "invalid_request",
        "Body содержит неверный набор полей для action=$action",
    ))
    target = native_request_string(data, "file_browser_target")
    ncodeunits(target) <= 128 || throw(native_io_error(
        "invalid_request",
        "file_browser_target слишком длинный";
        field = "file_browser_target",
    ))
    mode = native_request_string(data, "mode")
    mode in NATIVE_FILE_BROWSER_MODES || throw(native_io_error(
        "invalid_request",
        "mode должен быть directory или file";
        field = "mode",
    ))
    allowed_extensions = native_file_extensions(
        signal_analyser_payload_value(data, "allowed_extensions"),
    )
    mode == "directory" && !isempty(allowed_extensions) && throw(native_io_error(
        "invalid_request",
        "allowed_extensions допустим только в file mode";
        field = "allowed_extensions",
    ))

    raw_root = native_optional_request_string(data, "root_path")
    root_path = isempty(strip(raw_root)) ? NATIVE_ENGEE_USER_ROOT :
        native_normalize_user_path(raw_root)
    root_path == NATIVE_ENGEE_USER_ROOT || throw(native_io_error(
        "unsafe_path",
        "root_path должен совпадать с /user";
        field = "root_path",
    ))
    raw_current = native_optional_request_string(data, "current_path")
    current_path = isempty(strip(raw_current)) ? NATIVE_ENGEE_USER_ROOT :
        native_normalize_user_path(raw_current)
    raw_selected = native_optional_request_string(data, "selected_path")
    selected_path = isempty(strip(raw_selected)) ? "" : native_normalize_user_path(raw_selected)
    sort_ascending = signal_analyser_payload_value(data, "sort_ascending")
    sort_ascending isa Bool || throw(native_io_error(
        "invalid_request",
        "sort_ascending должен быть boolean";
        field = "sort_ascending",
    ))
    expanded_paths = native_request_paths(data, "expanded_paths")

    initial_path = native_optional_request_string(data, "initial_path")
    toggle_path = native_optional_request_string(data, "toggle_path")
    if action == "open"
        "initial_path" in actual || throw(native_io_error(
            "invalid_request",
            "open требует initial_path";
            field = "initial_path",
        ))
        initial_path = isempty(strip(initial_path)) ? NATIVE_ENGEE_USER_ROOT :
            native_normalize_user_path(initial_path)
    elseif action == "toggle"
        "toggle_path" in actual || throw(native_io_error(
            "invalid_request",
            "toggle требует toggle_path";
            field = "toggle_path",
        ))
        toggle_path = native_normalize_user_path(toggle_path)
    end
    NativeFileBrowserActionRequest(
        action,
        target,
        mode,
        allowed_extensions,
        root_path,
        current_path,
        selected_path,
        sort_ascending,
        expanded_paths,
        initial_path,
        toggle_path,
    )
end

function parse_native_file_browser_request(data)::NativeFileBrowserRequest
    request = native_exact_request(data, NATIVE_FILE_BROWSER_REQUEST_FIELDS)
    path = native_normalize_user_path(native_request_string(request, "path"))
    selection_mode = native_request_string(request, "selection_mode")
    selection_mode in NATIVE_FILE_BROWSER_MODES || throw(native_io_error(
        "invalid_request",
        "selection_mode должен быть directory или file";
        field = "selection_mode",
    ))
    extension = native_file_extension(signal_analyser_payload_value(request, "extension"))
    selection_mode == "directory" && extension !== nothing && throw(native_io_error(
        "invalid_request",
        "extension допустим только при выборе файла";
        field = "extension",
    ))
    sort_direction = native_request_string(request, "sort_direction")
    sort_direction in NATIVE_SORT_DIRECTIONS || throw(native_io_error(
        "invalid_request",
        "sort_direction должен быть asc или desc";
        field = "sort_direction",
    ))
    NativeFileBrowserRequest(path, selection_mode, extension, sort_direction == "asc")
end

function native_payload_value(value, key::Symbol)
    if value isa NamedTuple
        return key in keys(value) ? getproperty(value, key) : nothing
    elseif value isa AbstractDict
        haskey(value, key) && return value[key]
        text = String(key)
        haskey(value, text) && return value[text]
    end
    nothing
end

function native_file_browser_payload(
    ::NativeSessionIOService,
    request::NativeFileBrowserRequest,
)::Dict{String,Any}
    extension_literal = repr(request.extension === nothing ? "" : request.extension)
    code = """
    let
        requested = $(repr(request.path))
        root_real = realpath($(repr(NATIVE_ENGEE_USER_ROOT)))
        current_real = realpath(requested)
        inside(path) = path == root_real || startswith(path, root_real * "/")
        inside(current_real) || error("path outside /user")
        isdir(current_real) || error("path is not a directory")
        extension = $extension_literal
        entries = NamedTuple{
            (:name, :path, :kind, :selectable, :size_bytes),
            Tuple{String,String,String,Bool,Int},
        }[]
        for name in readdir(current_real)
            startswith(name, ".") && continue
            child = joinpath(current_real, name)
            child_real = try
                realpath(child)
            catch
                continue
            end
            inside_child = inside(child_real)
            kind = isdir(child_real) ? "directory" : (isfile(child_real) ? "file" : "other")
            kind == "other" && continue
            extension_allowed = isempty(extension) || lowercase(splitext(name)[2]) == extension
            selectable = inside_child && (
                kind == "directory" ||
                ($(repr(request.selection_mode)) == "file" && kind == "file" && extension_allowed)
            )
            push!(entries, (
                name = String(name),
                path = inside_child ? String(child_real) : String(normpath(child)),
                kind = kind,
                selectable = selectable,
                size_bytes = inside_child && kind == "file" ? Int(filesize(child_real)) : 0,
            ))
        end
        sort!(entries; by = item -> (item.kind == "directory" ? 0 : 1, lowercase(item.name)))
        if !$(repr(request.sort_ascending))
            directories = reverse(filter(item -> item.kind == "directory", entries))
            files = reverse(filter(item -> item.kind == "file", entries))
            entries = vcat(directories, files)
        end
        parent_real = current_real == root_real ? root_real : dirname(current_real)
        (
            root = root_real,
            current = current_real,
            parent = parent_real,
            entries = entries,
        )
    end
    """
    raw = native_engee_eval(code)
    entries_raw = native_payload_value(raw, :entries)
    entries_raw isa AbstractVector || throw(native_io_error(
        "filesystem_provider_error",
        "Engee вернул некорректный список файлов",
    ))
    entries = Dict{String,Any}[]
    for item in entries_raw
        name = native_payload_value(item, :name)
        path = native_payload_value(item, :path)
        kind = native_payload_value(item, :kind)
        selectable = native_payload_value(item, :selectable)
        size_bytes = native_payload_value(item, :size_bytes)
        name isa AbstractString && path isa AbstractString &&
            kind isa AbstractString && selectable isa Bool &&
            size_bytes isa Integer || throw(native_io_error(
                "filesystem_provider_error",
                "Engee вернул некорректную строку списка файлов",
            ))
        push!(entries, Dict{String,Any}(
            "name" => String(name),
            "path" => String(path),
            "kind" => String(kind),
            "selectable" => selectable,
            "size_bytes" => Int(size_bytes),
        ))
    end
    root = native_payload_value(raw, :root)
    current = native_payload_value(raw, :current)
    parent = native_payload_value(raw, :parent)
    all(value -> value isa AbstractString, (root, current, parent)) || throw(
        native_io_error("filesystem_provider_error", "Engee вернул некорректный путь"),
    )
    Dict{String,Any}(
        "ok" => true,
        "root" => String(root),
        "current" => String(current),
        "parent" => String(parent),
        "selection_mode" => request.selection_mode,
        "extension" => request.extension,
        "sort_direction" => request.sort_ascending ? "asc" : "desc",
        "entries" => entries,
    )
end

function native_file_browser_action_payload(
    ::NativeSessionIOService,
    request::NativeFileBrowserActionRequest,
)::Dict{String,Any}
    action = request.action
    current_path = action == "open" ? request.initial_path : request.current_path
    selected_path = action in ("open", "path") ? "" : request.selected_path
    expanded_paths = action in ("open", "path") ? String[] : request.expanded_paths
    allowed_extensions_literal = repr(request.allowed_extensions)
    expanded_paths_literal = repr(expanded_paths)
    code = """
    let
        action = $(repr(action))
        mode = $(repr(request.mode))
        allowed_extensions = Set($allowed_extensions_literal)
        root_real = realpath($(repr(NATIVE_ENGEE_USER_ROOT)))
        inside(path) = path == root_real || startswith(path, root_real * "/")

        requested_current = $(repr(current_path))
        current_candidate = if action == "open" && !isdir(requested_current)
            dirname(requested_current)
        else
            requested_current
        end
        isdir(current_candidate) || error("path is not a directory")
        current_real = realpath(current_candidate)
        inside(current_real) || error("path outside /user")

        expanded = Set{String}()
        for path in $expanded_paths_literal
            candidate_real = try
                realpath(path)
            catch
                continue
            end
            inside(candidate_real) && isdir(candidate_real) && candidate_real != current_real || continue
            push!(expanded, String(candidate_real))
        end

        if action == "toggle"
            toggle_real = realpath($(repr(request.toggle_path)))
            inside(toggle_real) || error("toggle path outside /user")
            isdir(toggle_real) || error("toggle path is not a directory")
            toggle_real == current_real && error("current directory cannot be toggled")
            if toggle_real in expanded
                filter!(path -> !(path == toggle_real || startswith(path, toggle_real * "/")), expanded)
            else
                push!(expanded, String(toggle_real))
            end
        end

        selected_real = ""
        requested_selected = $(repr(selected_path))
        if !isempty(requested_selected)
            candidate_real = try
                realpath(requested_selected)
            catch
                ""
            end
            if !isempty(candidate_real) && inside(candidate_real) && isfile(candidate_real)
                extension_allowed = isempty(allowed_extensions) ||
                    lowercase(splitext(candidate_real)[2]) in allowed_extensions
                extension_allowed && (selected_real = String(candidate_real))
            end
        end
        if action == "select"
            if mode == "file"
                isempty(selected_real) && error("select requires an allowed file")
            else
                selected_real = String(current_real)
            end
        end

        entries = NamedTuple{
            (:name, :path, :kind, :depth, :expanded, :selectable),
            Tuple{String,String,String,Int,Bool,Bool},
        }[]
        parent_real = current_real == root_real ? root_real : dirname(current_real)
        if current_real != root_real
            push!(entries, (
                name = "..",
                path = String(parent_real),
                kind = "directory",
                depth = 0,
                expanded = false,
                selectable = true,
            ))
        end

        function append_directory_entries!(directory_real::String, depth::Int, ancestors::Set{String})
            children = NamedTuple{
                (:name, :path, :real_path, :kind, :safe),
                Tuple{String,String,String,String,Bool},
            }[]
            for name in readdir(directory_real)
                startswith(name, ".") && continue
                lexical_path = normpath(joinpath(directory_real, name))
                child_real = try
                    realpath(lexical_path)
                catch
                    continue
                end
                kind = isdir(lexical_path) ? "directory" :
                    (isfile(lexical_path) ? "file" : "other")
                kind == "other" && continue
                safe = inside(child_real)
                public_path = safe ? String(child_real) : String(lexical_path)
                push!(children, (
                    name = String(name),
                    path = public_path,
                    real_path = String(child_real),
                    kind = kind,
                    safe = safe,
                ))
            end
            sort!(children; by = item -> lowercase(item.name))
            directories = filter(item -> item.kind == "directory", children)
            files = filter(item -> item.kind == "file", children)
            if !$(repr(request.sort_ascending))
                reverse!(directories)
                reverse!(files)
            end
            for item in vcat(directories, files)
                is_expanded = item.safe && item.kind == "directory" &&
                    item.real_path in expanded && !(item.real_path in ancestors)
                extension_allowed = isempty(allowed_extensions) ||
                    lowercase(splitext(item.name)[2]) in allowed_extensions
                selectable = item.safe && (
                    item.kind == "directory" ||
                    (item.kind == "file" && mode == "file" && extension_allowed)
                )
                push!(entries, (
                    name = item.name,
                    path = item.path,
                    kind = item.kind,
                    depth = depth,
                    expanded = is_expanded,
                    selectable = selectable,
                ))
                if is_expanded
                    next_ancestors = copy(ancestors)
                    push!(next_ancestors, item.real_path)
                    append_directory_entries!(item.real_path, depth + 1, next_ancestors)
                end
            end
            nothing
        end
        append_directory_entries!(String(current_real), 0, Set([String(current_real)]))

        (
            open = !(action in ("select", "cancel")),
            root_path = String(root_real),
            current_path = String(current_real),
            parent_path = String(parent_real),
            selected_path = selected_real,
            sort_ascending = $(repr(request.sort_ascending)),
            entries = entries,
        )
    end
    """
    raw = native_engee_eval(code)
    open = native_payload_value(raw, :open)
    root_path = native_payload_value(raw, :root_path)
    current = native_payload_value(raw, :current_path)
    parent = native_payload_value(raw, :parent_path)
    selected = native_payload_value(raw, :selected_path)
    sort_ascending = native_payload_value(raw, :sort_ascending)
    entries_raw = native_payload_value(raw, :entries)
    open isa Bool && sort_ascending isa Bool &&
        all(value -> value isa AbstractString, (root_path, current, parent, selected)) &&
        entries_raw isa AbstractVector || throw(native_io_error(
            "filesystem_provider_error",
            "Engee вернул некорректное состояние file browser",
        ))

    entries = Dict{String,Any}[]
    for item in entries_raw
        name = native_payload_value(item, :name)
        path = native_payload_value(item, :path)
        kind = native_payload_value(item, :kind)
        depth = native_payload_value(item, :depth)
        expanded = native_payload_value(item, :expanded)
        selectable = native_payload_value(item, :selectable)
        name isa AbstractString && path isa AbstractString && kind isa AbstractString &&
            depth isa Integer && expanded isa Bool && selectable isa Bool || throw(
                native_io_error(
                    "filesystem_provider_error",
                    "Engee вернул некорректную строку file browser",
                ),
            )
        push!(entries, Dict{String,Any}(
            "name" => String(name),
            "path" => String(path),
            "kind" => String(kind),
            "depth" => Int(depth),
            "expanded" => expanded,
            "selectable" => selectable,
        ))
    end
    Dict{String,Any}(
        "ok" => true,
        "open" => open,
        "root_path" => String(root_path),
        "current_path" => String(current),
        "parent_path" => String(parent),
        "selected_path" => String(selected),
        "sort_ascending" => sort_ascending,
        "entries" => entries,
    )
end

function native_signal_names(value)::Vector{String}
    value isa AbstractVector || throw(native_io_error(
        "invalid_request",
        "signal_names должен быть массивом строк";
        field = "signal_names",
    ))
    names = String[]
    for item in value
        item isa AbstractString && !isempty(strip(String(item))) || throw(native_io_error(
            "invalid_request",
            "signal_names должен содержать непустые строки";
            field = "signal_names",
        ))
        push!(names, String(item))
    end
    allunique(names) || throw(native_io_error(
        "invalid_request",
        "signal_names не должен содержать повторы";
        field = "signal_names",
    ))
    names
end

function parse_native_save_command(data)::NativeSaveCommand
    request = native_exact_request(data, NATIVE_SAVE_REQUEST_FIELDS)
    revision = native_request_revision(request)
    operation = native_request_string(request, "operation")
    operation in NATIVE_SAVE_OPERATIONS || throw(native_io_error(
        "invalid_request",
        "operation должен быть workspace, function, jld2 или session";
        field = "operation",
    ))
    # Keep scope in the exact wire contract, but derive the authoritative
    # non-session scope from the selected signal count.
    requested_scope = native_request_string(request, "scope")
    requested_scope in NATIVE_SAVE_SCOPES || throw(native_io_error(
        "invalid_request",
        "scope должен быть signal, library или session";
        field = "scope",
    ))
    names = native_signal_names(signal_analyser_payload_value(request, "signal_names"))
    target = native_request_string(request, "target")
    overwrite = signal_analyser_payload_value(request, "overwrite")
    overwrite isa Bool || throw(native_io_error(
        "invalid_request",
        "overwrite должен быть boolean";
        field = "overwrite",
    ))
    if operation == "session"
        requested_scope == "session" && isempty(names) || throw(native_io_error(
            "invalid_request",
            "Session save требует scope=session и пустой signal_names";
            field = "scope",
        ))
        scope = "session"
    elseif operation == "function"
        requested_scope == "signal" && length(names) == 1 || throw(native_io_error(
            "invalid_request",
            "Генерация функции требует ровно один сигнал и scope=signal";
            field = "scope",
        ))
        scope = "signal"
    else
        isempty(names) && throw(native_io_error(
            "invalid_request",
            "Выберите хотя бы один сигнал";
            field = "signal_names",
        ))
        scope = length(names) == 1 ? "signal" : "library"
    end
    NativeSaveCommand(revision, operation, scope, names, target, overwrite)
end

function parse_native_import_command(data)::NativeSessionImportCommand
    request = native_exact_request(data, NATIVE_IMPORT_REQUEST_FIELDS)
    replace = signal_analyser_payload_value(request, "replace")
    replace === true || throw(native_io_error(
        "unsupported_import_mode",
        "Поддерживается только полная замена с replace=true";
        field = "replace",
    ))
    NativeSessionImportCommand(
        native_request_revision(request),
        native_require_file_target(native_request_string(request, "path"), ".jld2"),
    )
end

function native_require_workspace_name(value::AbstractString, field::AbstractString)::String
    name = strip(String(value))
    occursin(NATIVE_WORKSPACE_NAME_REGEX, name) &&
        !(name in SIGNAL_PACKAGE_RESERVED_WORKSPACE_NAMES) || throw(native_io_error(
            "invalid_workspace_name",
            "$field должен быть допустимым незарезервированным Julia identifier";
            field = field,
        ))
    name
end

function native_require_file_target(raw::AbstractString, extension::AbstractString)::String
    path = native_normalize_user_path(raw; allow_root = false)
    name = basename(path)
    startswith(name, ".") && throw(native_io_error(
        "unsafe_path",
        "Скрытые файлы запрещены";
        field = "target",
    ))
    lowercase(splitext(name)[2]) == lowercase(String(extension)) || throw(native_io_error(
        "invalid_extension",
        "Файл должен иметь расширение $extension";
        field = "target",
    ))
    path
end

function native_selected_signals_unlocked(
    state::SignalAnalyserState,
    command::NativeSaveCommand,
)::Vector{AnalysedSignal}
    names = command.signal_names
    isempty(names) && throw(native_io_error(
        "invalid_request",
        "Выберите хотя бы один сигнал";
        field = "signal_names",
    ))
    by_name = Dict(signal.name => signal for signal in state.signals)
    missing = String[name for name in names if !haskey(by_name, name)]
    isempty(missing) || throw(native_io_error(
        "signal_not_found",
        "Сигналы не найдены: $(join(missing, ", "))";
        field = "signal_names",
    ))
    AnalysedSignal[
        let signal = by_name[name]
            AnalysedSignal(
                signal.id,
                signal.name,
                signal.color,
                signal.sample_rate_hz,
                copy(signal.values),
                signal.is_complex,
                signal.visible,
                signal.operations,
            )
        end for name in names
    ]
end

function native_snapshot_signals(
    state::SignalAnalyserState,
    command::NativeSaveCommand,
)::Vector{AnalysedSignal}
    lock(state.lock) do
        command.state_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(command.state_revision, state.view.state_revision),
        )
        native_selected_signals_unlocked(state, command)
    end
end

native_signal_value(signal::AnalysedSignal)::Union{Vector{Float64},Vector{ComplexF64}} =
    signal.is_complex ? copy(signal.values) : Float64[real(value) for value in signal.values]

function native_workspace_value(
    signals::Vector{AnalysedSignal},
)::Union{Vector{Float64},Vector{ComplexF64},Dict{String,Any}}
    length(signals) == 1 && return native_signal_value(only(signals))
    values = Dict{String,Any}()
    for signal in signals
        values[signal.name] = native_signal_value(signal)
    end
    values
end

function native_workspace_preflight(name::String)::Bool
    raw = native_engee_eval("isdefined(Main, Symbol($(repr(name))))")
    raw isa Bool || throw(native_io_error(
        "workspace_provider_error",
        "Engee вернул некорректный результат preflight",
    ))
    raw
end

function native_save_workspace(
    signals::Vector{AnalysedSignal},
    command::NativeSaveCommand,
)::Dict{String,Any}
    target = native_require_workspace_name(command.target, "target")
    existed = native_workspace_preflight(target)
    if !command.overwrite && existed
        throw(native_io_error(
            "target_exists",
            "Workspace variable уже существует: $target";
            field = "overwrite",
        ))
    end
    native_engee_send(target, native_workspace_value(signals))
    Dict{String,Any}(
        "ok" => true,
        "state_revision" => command.state_revision,
        "operation" => "workspace",
        "scope" => command.scope,
        "target" => target,
        "items" => Dict{String,Any}[
            Dict{String,Any}(
                "signal_names" => String[signal.name for signal in signals],
                "variable_name" => target,
                "action" => existed ? "replaced" : "created",
            ),
        ],
        "message" => length(signals) == 1 ?
            "Сигнал сохранён в рабочую область Engee" :
            "Сигналы сохранены одним словарём в рабочую область Engee",
    )
end

function native_float_vector_literal(values::Vector{Float64})::String
    "Float64[" * join(repr.(values), ", ") * "]"
end

function native_complex_vector_literal(values::Vector{ComplexF64})::String
    "ComplexF64[" * join(
        ["ComplexF64($(repr(real(value))), $(repr(imag(value))))" for value in values],
        ", ",
    ) * "]"
end

function native_signal_value_literal(signal::AnalysedSignal)::String
    signal.is_complex ?
        native_complex_vector_literal(signal.values) :
        native_float_vector_literal(Float64[real(value) for value in signal.values])
end

function native_signals_literal(signals::Vector{AnalysedSignal})::String
    items = String[]
    for signal in signals
        push!(items, "(" * join([
            "name=$(repr(signal.name))",
            "color=$(repr(signal.color))",
            "sample_rate_hz=$(repr(signal.sample_rate_hz))",
            "is_complex=$(repr(signal.is_complex))",
            "visible=$(repr(signal.visible))",
            "values=$(native_signal_value_literal(signal))",
        ], ", ") * ",)")
    end
    "[" * join(items, ",\n") * "]"
end

function native_signal_storage_payload(signals::Vector{AnalysedSignal})
    (
        names = String[signal.name for signal in signals],
        colors = String[signal.color for signal in signals],
        sample_rates_hz = Float64[signal.sample_rate_hz for signal in signals],
        is_complex = Bool[signal.is_complex for signal in signals],
        visible = Bool[signal.visible for signal in signals],
        real_values = Vector{Float64}[
            Float64[real(value) for value in signal.values] for signal in signals
        ],
        imag_values = Vector{Float64}[
            Float64[imag(value) for value in signal.values] for signal in signals
        ],
    )
end

function native_publish_scratch(service::NativeSessionIOService, value)::String
    previous = native_engee_recv(service.scratch_name)
    (previous === Nothing || previous === nothing) || throw(native_io_error(
        "internal_name_conflict",
        "Зарезервированная переменная передачи Engee занята";
        field = "target",
    ))
    native_engee_send(service.scratch_name, value)
    service.scratch_name
end

function native_clear_scratch(service::NativeSessionIOService)::Nothing
    native_engee_send(service.scratch_name, nothing)
    nothing
end

function native_reproducer_script_estimated_bytes(signals::Vector{AnalysedSignal})::Int
    estimate = NATIVE_REPRODUCER_BASE_BYTES
    for signal in signals, operation in signal.operations
        estimate = Base.checked_add(estimate, ncodeunits(operation.body) + 512)
    end
    estimate
end

function native_require_reproducer_script_size(
    signals::Vector{AnalysedSignal},
    maximum_bytes::Int = NATIVE_REPRODUCER_MAX_BYTES,
)::Nothing
    maximum_bytes > 0 || throw(ArgumentError("Script byte limit должен быть положительным"))
    estimate = try
        native_reproducer_script_estimated_bytes(signals)
    catch err
        err isa OverflowError || rethrow()
        typemax(Int)
    end
    estimate <= maximum_bytes || throw(native_io_error(
        "script_too_large",
        "Сгенерированная функция превышает лимит $(maximum_bytes) байт";
        field = "target",
    ))
    nothing
end

function native_reproducer_script(signals::Vector{AnalysedSignal})::String
    length(signals) == 1 || throw(native_io_error(
        "invalid_request",
        "Функция генерируется для одного сигнала";
        field = "signal_names",
    ))
    signal = only(signals)
    isempty(signal.operations) && throw(native_io_error(
        "operation_history_empty",
        "У сигнала нет истории преобразований";
        field = "signal_names",
    ))
    any(
        operation -> occursin(r"(?i)\bengee\s*\.\s*genie\b", operation.body),
        signal.operations,
    ) && throw(native_io_error(
        "nonportable_operation_history",
        "История содержит обращение к Engee Genie и не может быть сгенерирована как чистая функция";
        field = "signal_names",
    ))
    native_require_reproducer_script_size(signals)
    function_name = "transform_" * signal_package_identifier_fragment(signal.name)
    uses_engee_dsp = any(
        operation -> !(operation.operation in ("custom-preprocess", "crop")),
        signal.operations,
    )
    steps = String[]
    for (index, operation) in enumerate(signal.operations)
        indented_body = replace(operation.body, "\n" => "\n        ")
        push!(steps, """    # $(index). $(operation.operation)
    __signal_sample_rate_hz__ = $(repr(operation.input_sample_rate_hz))
    init_signal = begin
        $(indented_body)
    end
    __signal_sample_rate_hz__ = $(repr(operation.output_sample_rate_hz))
""")
    end
    imports = uses_engee_dsp ? "import EngeeDSP\n\n" : ""
    initial_rate = first(signal.operations).input_sample_rate_hz
    script = """# Generated by Signal Analyser from the signal operation history.
# This file contains computation only; it does not access Engee Genie or workspace state.
$(imports)function $(function_name)(input_signal)
    init_signal = collect(input_signal)
    __signal_sample_rate_hz__ = $(repr(initial_rate))

$(join(steps, "\n"))
    # Current signal metadata is authoritative after all transformations.
    __signal_sample_rate_hz__ = $(repr(signal.sample_rate_hz))
    return (values = init_signal, sample_rate_hz = __signal_sample_rate_hz__)
end
"""
    ncodeunits(script) <= NATIVE_REPRODUCER_MAX_BYTES || throw(native_io_error(
        "script_too_large",
        "Сгенерированная функция превышает лимит $(NATIVE_REPRODUCER_MAX_BYTES) байт";
        field = "target",
    ))
    script
end

function native_remote_file_write_script(
    path::String,
    overwrite::Bool,
    body::String,
)::String
    """
    let
        target = $(repr(path))
        temp = ""
        try
            root_real = realpath($(repr(NATIVE_ENGEE_USER_ROOT)))
            parent_real = realpath(dirname(target))
            inside(path) = path == root_real || startswith(path, root_real * "/")
            inside(parent_real) || error("path outside /user")
            isdir(parent_real) || error("parent is not a directory")
            if ispath(target) && !$(repr(overwrite))
                (success = false, code = "target_exists", message = "Файл уже существует", path = String(target))
            else
                temp = joinpath(parent_real, ".signal-analyser-" * string(rand(UInt)) * ".tmp")
                $body
                mv(temp, target; force = $(repr(overwrite)))
                (success = true, code = "", message = "", path = String(target))
            end
        catch err
            (success = false, code = "file_write_failed", message = sprint(showerror, err), path = String(target))
        finally
            !isempty(temp) && ispath(temp) && rm(temp; force = true)
        end
    end
    """
end

function native_remote_saved_path(raw)::String
    success = native_payload_value(raw, :success)
    code = native_payload_value(raw, :code)
    message = native_payload_value(raw, :message)
    path = native_payload_value(raw, :path)
    success isa Bool && code isa AbstractString && message isa AbstractString &&
        path isa AbstractString || throw(native_io_error(
            "filesystem_provider_error",
            "Engee вернул некорректный результат записи",
        ))
    if !success
        @warn "Native Engee file write failed" code = String(code) path = String(path) detail =
            String(message)
        public_message = String(code) == "target_exists" ?
            "Файл уже существует" : "Не удалось записать файл в Engee"
        throw(native_io_error(
            String(code),
            public_message;
            field = String(code) == "target_exists" ? "overwrite" : "target",
        ))
    end
    String(path)
end

function native_save_text_file(
    service::NativeSessionIOService,
    path::String,
    content::String,
    overwrite::Bool,
)::String
    lock(service.transfer_lock) do
        scratch = native_publish_scratch(service, content)
        try
            body = """
            content = getfield(Main, :$scratch)
            content isa String || error("scratch content is not a String")
            open(temp, "w") do io
                write(io, content)
            end
            """
            native_remote_saved_path(native_engee_eval(
                native_remote_file_write_script(path, overwrite, body),
            ))
        finally
            native_clear_scratch(service)
        end
    end
end

function native_save_signal_jld2(
    service::NativeSessionIOService,
    path::String,
    signals::Vector{AnalysedSignal},
    overwrite::Bool,
)::String
    lock(service.transfer_lock) do
        scratch = native_publish_scratch(service, native_signal_storage_payload(signals))
        try
            body = """
            payload = getfield(Main, :$scratch)
            jld2 = Base.require(Main, :JLD2)
            getproperty(jld2, :jldsave)(temp;
                schema = $(repr(NATIVE_SIGNAL_JLD2_SCHEMA)),
                version = $(repr(NATIVE_SIGNAL_JLD2_VERSION)),
                names = payload.names,
                colors = payload.colors,
                sample_rates_hz = payload.sample_rates_hz,
                is_complex = payload.is_complex,
                visible = payload.visible,
                real_values = payload.real_values,
                imag_values = payload.imag_values,
            )
            """
            native_remote_saved_path(native_engee_eval(
                native_remote_file_write_script(path, overwrite, body),
            ))
        finally
            native_clear_scratch(service)
        end
    end
end

function native_session_json(
    state::SignalAnalyserState,
    expected_revision::Int,
)::String
    payload = lock(state.lock) do
        expected_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(expected_revision, state.view.state_revision),
        )
        signal_analyser_session_payload(signal_analyser_session_document_unlocked(state))
    end
    String(signal_package_json_bytes(payload))
end

function native_save_session_jld2(
    service::NativeSessionIOService,
    state::SignalAnalyserState,
    command::NativeSaveCommand,
)::String
    path = native_require_file_target(command.target, ".jld2")
    session_json = native_session_json(state, command.state_revision)
    lock(service.transfer_lock) do
        scratch = native_publish_scratch(service, session_json)
        try
            body = """
            session_json = getfield(Main, :$scratch)
            session_json isa String || error("scratch session is not a String")
            jld2 = Base.require(Main, :JLD2)
            getproperty(jld2, :jldsave)(temp;
                __genie_app_name = $(repr(NATIVE_SESSION_APP_NAME)),
                format = $(repr(SIGNAL_ANALYSER_SESSION_FORMAT)),
                application_id = $(repr(SIGNAL_ANALYSER_APPLICATION_ID)),
                schema = $(repr(SIGNAL_ANALYSER_SESSION_SCHEMA)),
                version = $(repr(SIGNAL_ANALYSER_SESSION_VERSION)),
                session_json = session_json,
            )
            """
            native_remote_saved_path(native_engee_eval(
                native_remote_file_write_script(path, command.overwrite, body),
            ))
        finally
            native_clear_scratch(service)
        end
    end
end

function native_save_options(
    ::NativeSessionIOService,
    state::SignalAnalyserState,
)::Dict{String,Any}
    lock(state.lock) do
        selected_name = state.row_selection.signal_name
        fragment = signal_package_identifier_fragment(selected_name)
        Dict{String,Any}(
            "ok" => true,
            "state_revision" => state.view.state_revision,
            "root" => NATIVE_ENGEE_USER_ROOT,
            "operations" => Dict{String,Any}[
                Dict("id" => "workspace", "label" => "Workspace", "file_extension" => nothing),
                Dict("id" => "function", "label" => "Julia-функция", "file_extension" => ".jl"),
                Dict("id" => "jld2", "label" => "JLD2", "file_extension" => ".jld2"),
                Dict("id" => "session", "label" => "Session JLD2", "file_extension" => ".jld2"),
            ],
            "default_operation" => "workspace",
            "scopes" => String["signal", "library", "session"],
            "selected_signal" => selected_name,
            "signal_names" => String[signal.name for signal in state.signals],
            "defaults" => Dict{String,Any}(
                "workspace_signal_target" => signal_package_workspace_names(
                    AnalysedSignal[signal_by_name(state, selected_name)],
                    "signal_",
                )[1],
                "workspace_library_prefix" => "signal_",
                "function_signal_target" => "/user/transform_$(fragment).jl",
                "jld2_signal_target" => "/user/$(fragment).jld2",
                "jld2_library_target" => "/user/signal_library.jld2",
                "session_target" => "/user/signal-analyser-session.jld2",
                "import_session_target" => "/user/signal-analyser-session.jld2",
                "overwrite" => false,
                "replace" => true,
            ),
        )
    end
end

function save_native_signal_analyser!(
    service::NativeSessionIOService,
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    command = parse_native_save_command(data)
    if command.operation == "session"
        path = native_save_session_jld2(service, state, command)
        return Dict{String,Any}(
            "ok" => true,
            "state_revision" => command.state_revision,
            "operation" => command.operation,
            "scope" => command.scope,
            "target" => path,
            "items" => Dict{String,Any}[],
            "message" => "Сессия Signal Analyser сохранена",
        )
    end
    signals = native_snapshot_signals(state, command)
    command.operation == "workspace" && return native_save_workspace(signals, command)
    if command.operation == "function"
        path = native_require_file_target(command.target, ".jl")
        saved = native_save_text_file(
            service,
            path,
            native_reproducer_script(signals),
            command.overwrite,
        )
    else
        path = native_require_file_target(command.target, ".jld2")
        saved = native_save_signal_jld2(service, path, signals, command.overwrite)
    end
    Dict{String,Any}(
        "ok" => true,
        "state_revision" => command.state_revision,
        "operation" => command.operation,
        "scope" => command.scope,
        "target" => saved,
        "items" => Dict{String,Any}[
            Dict("signal_name" => signal.name) for signal in signals
        ],
        "message" => command.operation == "function" ?
            "Julia-функция сгенерирована" : "Сигналы сохранены в $(command.operation)",
    )
end

function prepare_native_session_import(
    ::NativeSessionIOService,
    command::NativeSessionImportCommand,
)::NativePreparedSessionImport
    code = """
    let
        target = $(repr(command.path))
        try
            root_real = realpath($(repr(NATIVE_ENGEE_USER_ROOT)))
            target_real = realpath(target)
            inside(path) = path == root_real || startswith(path, root_real * "/")
            inside(target_real) || error("path outside /user")
            isfile(target_real) || error("session path is not a file")
            jld2 = Base.require(Main, :JLD2)
            load_value(key) = getproperty(jld2, :load)(target_real, key)
            file_version = load_value("version")
            (
                success = true,
                error = "",
                path = String(target_real),
                app_name = load_value("__genie_app_name"),
                session_format = file_version >= $(SIGNAL_ANALYSER_OPERATION_HISTORY_SESSION_VERSION) ?
                    load_value("format") : $(repr(SIGNAL_ANALYSER_SESSION_FORMAT)),
                application_id = file_version >= $(SIGNAL_ANALYSER_OPERATION_HISTORY_SESSION_VERSION) ?
                    load_value("application_id") : $(repr(SIGNAL_ANALYSER_APPLICATION_ID)),
                schema = load_value("schema"),
                version = file_version,
                session_json = load_value("session_json"),
            )
        catch err
            (
                success = false,
                error = sprint(showerror, err),
                path = String(target),
                app_name = "",
                session_format = "",
                application_id = "",
                schema = "",
                version = 0,
                session_json = "",
            )
        end
    end
    """
    raw = native_engee_eval(code)
    success = native_payload_value(raw, :success)
    error = native_payload_value(raw, :error)
    success isa Bool && error isa AbstractString || throw(native_io_error(
        "filesystem_provider_error",
        "Engee вернул некорректный результат чтения сессии",
    ))
    if !success
        @warn "Native Engee session read failed" path = command.path detail = String(error)
        throw(native_io_error(
            "invalid_session_file",
            "Не удалось прочитать JLD2-сессию";
            field = "path",
        ))
    end
    path = native_payload_value(raw, :path)
    app_name = native_payload_value(raw, :app_name)
    session_format = native_payload_value(raw, :session_format)
    application_id = native_payload_value(raw, :application_id)
    schema = native_payload_value(raw, :schema)
    version = native_payload_value(raw, :version)
    session_json = native_payload_value(raw, :session_json)
    path isa AbstractString && app_name isa AbstractString &&
        session_format isa AbstractString && application_id isa AbstractString &&
        schema isa AbstractString && version isa Integer &&
        session_json isa AbstractString || throw(native_io_error(
            "invalid_session_file",
            "JLD2 не содержит обязательные поля сессии";
            field = "path",
        ))
    String(app_name) == NATIVE_SESSION_APP_NAME || throw(native_io_error(
        "wrong_application",
        "JLD2 создан другим приложением";
        field = "path",
    ))
    String(session_format) == SIGNAL_ANALYSER_SESSION_FORMAT || throw(native_io_error(
        "unsupported_session_schema",
        "JLD2 содержит неподдерживаемый формат сессии";
        field = "path",
    ))
    String(application_id) == SIGNAL_ANALYSER_APPLICATION_ID || throw(native_io_error(
        "wrong_application",
        "JLD2 создан другим приложением";
        field = "path",
    ))
    String(schema) == SIGNAL_ANALYSER_SESSION_SCHEMA || throw(native_io_error(
        "unsupported_session_schema",
        "JLD2 содержит неподдерживаемую schema";
        field = "path",
    ))
    Int(version) in (
        SIGNAL_ANALYSER_CUTOFF_SESSION_VERSION,
        SIGNAL_ANALYSER_PREVIOUS_SESSION_VERSION,
        SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION,
        SIGNAL_ANALYSER_SESSION_VERSION,
    ) || throw(native_io_error(
        "unsupported_session_version",
        "JLD2 содержит неподдерживаемую version";
        field = "path",
    ))
    document_value = try
        Genie.JSONParser.parse(String(session_json); allownan = false)
    catch err
        throw(native_io_error(
            "invalid_session_json",
            "session_json содержит некорректный JSON: $(sprint(showerror, err))";
            field = "path",
        ))
    end
    document = parse_signal_analyser_session_document(document_value)
    document.version in (
        SIGNAL_ANALYSER_CUTOFF_SESSION_VERSION,
        SIGNAL_ANALYSER_PREVIOUS_SESSION_VERSION,
        SIGNAL_ANALYSER_IDENTITY_SESSION_VERSION,
        SIGNAL_ANALYSER_SESSION_VERSION,
    ) || throw(native_io_error(
        "unsupported_session_version",
        "Для native import требуется session v3, v4 или v5";
        field = "path",
    ))
    NativePreparedSessionImport(String(path), document)
end

function import_native_signal_analyser_session!(
    service::NativeSessionIOService,
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    command = parse_native_import_command(data)
    prepared = prepare_native_session_import(service, command)
    lock(state.lock) do
        command.state_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(command.state_revision, state.view.state_revision),
        )
        next_revision = state.view.state_revision + 1
        candidate = signal_analyser_session_candidate(state, prepared.document, next_revision)
        signal_analyser_publish_session!(state, candidate)
        response = signal_analyser_state_lite_unlocked(state)
        response["ok"] = true
        response["schema"] = prepared.document.schema
        response["version"] = prepared.document.version
        response["imported_source_revision"] = prepared.document.source_revision
        response["path"] = prepared.path
        response["message"] = "Сессия Signal Analyser импортирована"
        response
    end
end
