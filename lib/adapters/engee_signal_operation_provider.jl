const ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES = 50_000
const ENGEE_SIGNAL_OPERATION_SEND_OK = "UInt8[0x4f, 0x4b]"

struct EngeeSignalOperationProvider <: AbstractSignalOperationProvider end

signal_operation_quoted(value::AbstractString)::String = repr(String(value))

function signal_operation_genie_functions()
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    send_value = try
        getproperty(genie_api, :send)
    catch
        throw(WorkspaceUnavailableError(
            "Операции над сигналами недоступны: engee.genie.send не найден",
        ))
    end
    receive = try
        getproperty(genie_api, :recv)
    catch
        throw(WorkspaceUnavailableError(
            "Операции над сигналами недоступны: engee.genie.recv не найден",
        ))
    end
    send_value, receive
end

function signal_operation_recv(receive, code::AbstractString)
    result = try
        Base.invokelatest(receive, String(code); context = Main)
    catch err
        throw(SignalOperationProviderError(
            "engee_transport_error",
            "Engee не выполнил операцию: $(sprint(showerror, err))",
        ))
    end
    result isa Exception && throw(SignalOperationProviderError(
        "engee_transport_error",
        "Engee не выполнил операцию: $(sprint(showerror, result))",
    ))
    result
end

function signal_operation_send_checked(send_value, receive, name::String, value)::Nothing
    result = try
        Base.invokelatest(send_value, name, value)
    catch err
        throw(SignalOperationProviderError(
            "engee_transport_error",
            "Engee не принял данные операции: $(sprint(showerror, err))",
        ))
    end
    status = try
        getproperty(result, :status)
    catch
        nothing
    end
    payload = try
        getproperty(result, :result)
    catch
        nothing
    end
    status == "change" && payload == ENGEE_SIGNAL_OPERATION_SEND_OK || throw(
        SignalOperationProviderError(
            "engee_transport_error",
            "Engee отклонил данные операции",
        ),
    )
    remote = signal_operation_recv(
        receive,
        "getfield(Main, Symbol($(signal_operation_quoted(name))))",
    )
    typeof(remote) == typeof(value) && remote == value || throw(
        SignalOperationProviderError(
            "engee_transport_error",
            "Engee не подтвердил точную запись данных операции",
        ),
    )
    nothing
end

function signal_operation_remote_defined(receive, name::String)::Bool
    value = signal_operation_recv(
        receive,
        "isdefined(Main, Symbol($(signal_operation_quoted(name))))",
    )
    value isa Bool || throw(SignalOperationProviderError(
        "engee_transport_error",
        "Engee вернул некорректный результат проверки временного имени",
    ))
    value
end

function signal_operation_unique_names(receive)::NTuple{3,String}
    suffix = replace(string(UUIDs.uuid4()), "-" => "")
    names = (
        "__signal_analyser_operation_input_$(suffix)__",
        "__signal_analyser_operation_stage_$(suffix)__",
        "__signal_analyser_operation_output_$(suffix)__",
    )
    any(name -> signal_operation_remote_defined(receive, name), names) && throw(
        SignalOperationProviderError(
            "engee_scratch_collision",
            "Engee уже содержит одно из временных имён операции",
        ),
    )
    names
end

function signal_operation_send_chunked!(
    send_value,
    receive,
    input_name::String,
    stage_name::String,
    values::AbstractVector,
)::Nothing
    total = length(values)
    for first_index in 1:ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES:total
        last_index = min(total, first_index + ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES - 1)
        chunk = collect(@view values[first_index:last_index])
        signal_operation_send_checked(send_value, receive, stage_name, chunk)
        assignment = if first_index == 1
            """
            begin
                chunk = getfield(Main, Symbol($(signal_operation_quoted(stage_name))))
                global $(input_name) = Vector{eltype(chunk)}(undef, $(total))
                $(input_name)[$(first_index):$(last_index)] = chunk
                $(last_index)
            end
            """
        else
            """
            begin
                chunk = getfield(Main, Symbol($(signal_operation_quoted(stage_name))))
                $(input_name)[$(first_index):$(last_index)] = chunk
                $(last_index)
            end
            """
        end
        signal_operation_recv(receive, assignment) == last_index || throw(
            SignalOperationProviderError(
                "engee_transport_error",
                "Engee не подтвердил сборку входного сигнала",
            ),
        )
        Base.invokelatest(send_value, stage_name, nothing)
    end
    signal_operation_recv(
        receive,
        "length(getfield(Main, Symbol($(signal_operation_quoted(input_name)))))",
    ) == total || throw(SignalOperationProviderError(
        "engee_transport_error",
        "Engee собрал входной сигнал неверной длины",
    ))
    nothing
end

function signal_operation_builtin_body(command::DeriveSignalCommand)::String
    command.operation == "abs" && return "abs.(init_signal)"
    command.operation == "square" && return "init_signal .^ 2"
    command.operation == "sqrt" && return "sqrt.(init_signal)"
    command.operation == "signed_sqrt_abs" &&
        return "all(item -> item isa Real, init_signal) || " *
            "throw(ArgumentError(\"signed_sqrt_abs requires a real signal\")); " *
            "sqrt.(abs.(init_signal)) .* sign.(init_signal)"
    command.operation == "multiply" &&
        return "init_signal .* $(repr(command.multiplier::Float64))"
    command.operation == "fft" &&
        return "ComplexF64.(EngeeDSP.Functions.fft(init_signal))"
    command.operation == "custom" && return command.body::String
    throw(SignalOperationProviderError("invalid_operation", "Неподдерживаемая операция"))
end

function signal_operation_wrapper(
    input_name::String,
    output_name::String,
    operation_body::String,
)::String
    """
    import EngeeDSP
    let init_signal = getfield(Main, Symbol($(signal_operation_quoted(input_name))))
        try
            value = begin
                $(operation_body)
            end
            value isa AbstractVector || throw(ArgumentError("operation must return a vector"))
            2 <= length(value) <= $(SIGNAL_DERIVED_MAX_SAMPLES) || throw(ArgumentError(
                "operation result length must be between 2 and $(SIGNAL_DERIVED_MAX_SAMPLES)"
            ))
            all(item -> item isa Number && !(item isa Bool), value) || throw(ArgumentError(
                "operation result must contain numeric values"
            ))
            operation_is_complex = !all(item -> item isa Real, value)
            normalized = operation_is_complex ? ComplexF64.(value) : Float64.(value)
            all(item -> isfinite(real(item)) && isfinite(imag(item)), normalized) || throw(
                ArgumentError("operation result must contain finite values")
            )
            global $(output_name) = normalized
            (
                ok=true,
                length=length(normalized),
                is_complex=operation_is_complex,
                error_type="",
                error_message="",
            )
        catch err
            (
                ok=false,
                length=0,
                is_complex=false,
                error_type=string(typeof(err)),
                error_message=sprint(showerror, err),
            )
        end
    end
    """
end

function signal_operation_parse_has_error(value)::Bool
    value isa Expr || return false
    value.head in (:error, :incomplete) && return true
    any(signal_operation_parse_has_error, value.args)
end

function signal_operation_preflight_wrapper(code::String)::Nothing
    parsed = try
        Meta.parseall(code)
    catch err
        throw(SignalOperationProviderError(
            "invalid_operation_body",
            "Тело операции содержит синтаксическую ошибку: $(sprint(showerror, err))",
        ))
    end
    signal_operation_parse_has_error(parsed) && throw(SignalOperationProviderError(
        "invalid_operation_body",
        "Тело операции содержит синтаксическую ошибку",
    ))
    nothing
end

function signal_operation_receive_chunked(
    receive,
    output_name::String,
    total::Int,
    is_complex::Bool,
)::SignalOperationProviderResult
    values = Vector{ComplexF64}(undef, total)
    for first_index in 1:ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES:total
        last_index = min(total, first_index + ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES - 1)
        chunk = signal_operation_recv(
            receive,
            "getfield(Main, Symbol($(signal_operation_quoted(output_name))))" *
                "[$(first_index):$(last_index)]",
        )
        chunk isa AbstractVector || throw(SignalOperationProviderError(
            "engee_transport_error",
            "Engee вернул некорректный фрагмент результата",
        ))
        length(chunk) == last_index - first_index + 1 || throw(
            SignalOperationProviderError(
                "engee_transport_error",
                "Engee вернул фрагмент результата неверной длины",
            ),
        )
        values[first_index:last_index] = ComplexF64.(chunk)
    end
    SignalOperationProviderResult(values, is_complex)
end

function signal_operation_cleanup!(send_value, receive, names)::Nothing
    for name in names
        try
            result = Base.invokelatest(send_value, name, nothing)
            getproperty(result, :status) == "change" &&
                getproperty(result, :result) == ENGEE_SIGNAL_OPERATION_SEND_OK ||
                error("cleanup send was not acknowledged")
            signal_operation_recv(
                receive,
                "getfield(Main, Symbol($(signal_operation_quoted(name)))) === nothing",
            ) === true || error("cleanup value was not released")
        catch err
            @error "Engee signal operation scratch cleanup failed" scratch_name = name exception = (
                err,
                catch_backtrace(),
            )
        end
    end
    nothing
end

function signal_operation_execute(
    ::EngeeSignalOperationProvider,
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::SignalOperationProviderResult
    send_value, receive = signal_operation_genie_functions()
    names = signal_operation_unique_names(receive)
    input_name, stage_name, output_name = names
    transport_values = source.is_complex ? copy(source.values) : Float64[real(value) for value in source.values]
    try
        operation_body = signal_operation_builtin_body(command)
        wrapper = signal_operation_wrapper(input_name, output_name, operation_body)
        signal_operation_preflight_wrapper(wrapper)
        signal_operation_send_chunked!(
            send_value,
            receive,
            input_name,
            stage_name,
            transport_values,
        )
        metadata = signal_operation_recv(receive, wrapper)
        metadata isa NamedTuple && all(
            property -> hasproperty(metadata, property),
            (:ok, :length, :is_complex, :error_type, :error_message),
        ) || throw(SignalOperationProviderError(
            "engee_transport_error",
            "Engee вернул некорректный статус операции",
        ))
        metadata.ok === true || throw(SignalOperationProviderError(
            "operation_failed",
            isempty(String(metadata.error_message)) ?
                "Операция Engee завершилась ошибкой" : String(metadata.error_message),
        ))
        total = metadata.length isa Integer ? Int(metadata.length) : 0
        2 <= total <= SIGNAL_DERIVED_MAX_SAMPLES || throw(SignalOperationProviderError(
            "invalid_operation_result",
            "Engee вернул результат недопустимой длины",
        ))
        metadata.is_complex isa Bool || throw(SignalOperationProviderError(
            "invalid_operation_result",
            "Engee вернул некорректный тип результата",
        ))
        signal_operation_receive_chunked(receive, output_name, total, metadata.is_complex)
    finally
        signal_operation_cleanup!(send_value, receive, names)
    end
end
