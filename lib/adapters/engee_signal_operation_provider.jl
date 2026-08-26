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
    eval_fn = try
        getproperty(genie_api, :eval)
    catch
        throw(WorkspaceUnavailableError(
            "Операции над сигналами недоступны: engee.genie.eval не найден",
        ))
    end
    send_value, receive, eval_fn
end

function signal_operation_recv(
    receive,
    name::AbstractString;
    retry_safe::Bool = false,
)
    attempts = retry_safe ? 2 : 1
    for attempt in 1:attempts
        result = try
            Base.invokelatest(receive, String(name); context = Main)
        catch err
            if attempt < attempts
                @warn "Engee read-only signal operation receive failed; retrying once" attempt exception = (
                    err,
                    catch_backtrace(),
                )
                yield()
                continue
            end
            @error "Engee signal operation receive failed" exception = (err, catch_backtrace())
            throw(SignalOperationProviderError(
                "engee_transport_error",
                "Не удалось связаться с вычислительным окружением Engee",
            ))
        end
        if result isa Exception && attempt < attempts
            @warn "Engee read-only signal operation receive returned an exception; retrying once" attempt returned_error =
                sprint(showerror, result)
            yield()
            continue
        elseif result isa Exception
            @error "Engee signal operation returned an exception" returned_error =
                sprint(showerror, result)
            throw(SignalOperationProviderError(
                "engee_transport_error",
                "Вычислительное окружение Engee не выполнило операцию",
            ))
        end
        return result
    end
    throw(SignalOperationProviderError(
        "engee_transport_error",
        "Вычислительное окружение Engee не выполнило операцию",
    ))
end

function signal_operation_eval(
    eval_fn,
    code::AbstractString;
    retry_safe::Bool = false,
)
    attempts = retry_safe ? 2 : 1
    for attempt in 1:attempts
        result = try
            Base.invokelatest(eval_fn, String(code))
        catch err
            if attempt < attempts
                @warn "Engee read-only signal operation evaluation failed; retrying once" attempt exception = (
                    err,
                    catch_backtrace(),
                )
                yield()
                continue
            end
            @error "Engee signal operation evaluation failed" exception = (err, catch_backtrace())
            throw(SignalOperationProviderError(
                "engee_transport_error",
                "Не удалось связаться с вычислительным окружением Engee",
            ))
        end
        if result isa Exception && attempt < attempts
            @warn "Engee read-only signal operation evaluation returned an exception; retrying once" attempt returned_error =
                sprint(showerror, result)
            yield()
            continue
        elseif result isa Exception
            @error "Engee signal operation evaluation returned an exception" returned_error =
                sprint(showerror, result)
            throw(SignalOperationProviderError(
                "engee_transport_error",
                "Вычислительное окружение Engee не выполнило операцию",
            ))
        end
        return result
    end
    throw(SignalOperationProviderError(
        "engee_transport_error",
        "Вычислительное окружение Engee не выполнило операцию",
    ))
end

function signal_operation_send_checked(send_value, receive, name::String, value)::Nothing
    result = try
        Base.invokelatest(send_value, name, value)
    catch err
        @error "Engee signal operation send failed" exception = (err, catch_backtrace())
        throw(SignalOperationProviderError(
            "engee_transport_error",
            "Не удалось передать данные операции в Engee",
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
        name,
        retry_safe = true,
    )
    typeof(remote) == typeof(value) && remote == value || throw(
        SignalOperationProviderError(
            "engee_transport_error",
            "Engee не подтвердил точную запись данных операции",
        ),
    )
    nothing
end

signal_operation_julia_string(value::AbstractString)::String = repr(String(value))

function signal_operation_filter_body(command::DeriveSignalCommand)::String
    parameters = command.parameters::FilterSignalOperationParameters
    function_name = command.operation
    frequency_argument = if command.operation in ("bandpass", "bandstop")
        "[$(repr(parameters.lower_passband::Float64)), " *
            "$(repr(parameters.upper_passband::Float64))]"
    else
        repr(parameters.passband::Float64)
    end
    frequency_call = parameters.frequency_units == "hertz" ?
        "$(frequency_argument), __signal_sample_rate_hz__" : frequency_argument
    steepness = command.operation in ("bandpass", "bandstop") ?
        "[$(repr(parameters.steepness)), $(repr(parameters.steepness))]" :
        repr(parameters.steepness)
    "vec(EngeeDSP.Functions.$(function_name)(" *
        "init_signal, $(frequency_call), " *
        "\"ImpulseResponse\", $(signal_operation_julia_string(parameters.impulse_response)), " *
        "\"Steepness\", $(steepness), " *
        "\"StopbandAttenuation\", $(repr(parameters.stopband_attenuation_db))))"
end

function signal_operation_detrend_body(command::DeriveSignalCommand)::String
    parameters = command.parameters::DetrendSignalOperationParameters
    degree = parameters.method == "constant" ? 0 : 1
    breakpoints = Float64.(parameters.breakpoints)
    "vec(EngeeDSP.Functions.detrend(init_signal, $(degree), " *
        "$(repr(breakpoints)), " *
        "$(signal_operation_julia_string(parameters.nan_policy))))"
end

function signal_operation_fill_missing_body(command::DeriveSignalCommand)::String
    parameters = command.parameters::FillMissingSignalOperationParameters
    method = parameters.method
    primary = if method == "constant"
        "filled[missing_indices] .= $(repr(parameters.constant_value::Float64))"
    elseif method in ("previous", "next", "nearest", "linear", "spline", "pchip", "makima")
        "filled[missing_indices] = EngeeDSP.Functions.interp1(" *
            "Float64.(finite_indices), filled[finite_indices], " *
            "Float64.(missing_indices), $(signal_operation_julia_string(method)), \"extrap\")"
    elseif method in ("moving_mean", "moving_median")
        function_name = method == "moving_mean" ? "movmean" : "movmedian"
        "replacement = EngeeDSP.Functions.$(function_name)(filled, " *
            "$(parameters.window_length::Int), \"omitnan\"); " *
            "filled[missing_indices] = replacement[missing_indices]"
    elseif method == "autoregressive"
        "filled = vec(EngeeDSP.Functions.fillgaps(" *
            "filled, length(filled), $(parameters.ar_order::Int)))"
    else
        throw(SignalOperationProviderError(
            "invalid_operation",
            "Неподдерживаемый метод заполнения пропусков",
        ))
    end
    edge_method = parameters.end_method
    edge_override = if edge_method == "same" || method == "autoregressive"
        "nothing"
    else
        "isempty(edge_indices) || (filled[edge_indices] = EngeeDSP.Functions.interp1(" *
            "Float64.(finite_indices), filled[finite_indices], Float64.(edge_indices), " *
            "$(signal_operation_julia_string(edge_method)), \"extrap\"))"
    end
    minimum_finite = if method == "constant"
        0
    elseif method in ("previous", "next", "nearest", "linear", "spline", "pchip", "makima")
        2
    else
        1
    end
    edge_method in ("previous", "next", "nearest") &&
        (minimum_finite = max(minimum_finite, 2))
    edge_setup = if edge_method == "same" || method == "autoregressive"
        "edge_indices = Int[]"
    else
        "edge_indices = filter(index -> index < first(finite_indices) || " *
            "index > last(finite_indices), missing_indices)"
    end
    """
    let
        filled = copy(init_signal)
        missing_indices = findall(index ->
            isnan(real(filled[index])) || isnan(imag(filled[index])),
            eachindex(filled),
        )
        if !isempty(missing_indices)
            finite_indices = setdiff(collect(eachindex(filled)), missing_indices)
            length(finite_indices) >= $(minimum_finite) || throw(ArgumentError(
                "not enough finite samples for the selected fill method"
            ))
            $(edge_setup)
            $(primary)
            $(edge_override)
        end
        filled
    end
    """
end

function signal_operation_smooth_window_samples(
    source::AnalysedSignal,
    parameters::SmoothSignalOperationParameters,
)::Union{Nothing,Int}
    parameters.window_type == "duration" || return nothing
    parameters.window_duration === nothing && return nothing
    raw = parameters.duration_units == "seconds" ?
        parameters.window_duration * source.sample_rate_hz : parameters.window_duration
    raw <= SIGNAL_DERIVED_MAX_SAMPLES || throw(SignalOperationProviderError(
        "invalid_operation_parameters",
        "Длительность окна не должна превышать $(SIGNAL_DERIVED_MAX_SAMPLES) отсчётов",
        "window_duration",
    ))
    rounded = round(Int, raw)
    rounded >= 1 || throw(SignalOperationProviderError(
        "invalid_operation_parameters",
        "Длительность окна должна соответствовать хотя бы одному отсчёту",
        "window_duration",
    ))
    rounded
end

function signal_operation_smooth_body(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::String
    parameters = command.parameters::SmoothSignalOperationParameters
    method = Dict(
        "moving_mean" => "movmean",
        "moving_median" => "movmedian",
        "gaussian" => "gaussian",
        "linear_regression" => "lowess",
        "quadratic_regression" => "loess",
        "robust_linear" => "rlowess",
        "robust_quadratic" => "rloess",
        "savitzky_golay" => "sgolay",
    )[parameters.method]
    arguments = String["init_signal", signal_operation_julia_string(method)]
    if parameters.window_type == "duration"
        window = signal_operation_smooth_window_samples(source, parameters)
        window === nothing || push!(arguments, string(window))
    else
        factor = parameters.smoothing_factor::Float64
        factor in (0.0, 1.0) && throw(SignalOperationProviderError(
            "provider_parameter_unavailable",
            "EngeeDSP пока не поддерживает крайнее значение коэффициента сглаживания; выберите значение строго между 0 и 1",
            "smoothing_factor",
        ))
        append!(arguments, ["\"SmoothingFactor\"", repr(factor)])
    end
    if parameters.polynomial_degree !== nothing
        append!(arguments, ["\"Degree\"", string(parameters.polynomial_degree::Int)])
    end
    "vec(first(EngeeDSP.Functions.smoothdata($(join(arguments, ", ")))))"
end

function signal_operation_envelope_count(
    source::AnalysedSignal,
    value::Union{Nothing,Float64},
    units::Union{Nothing,String},
    field_label::String,
)::Int
    value === nothing && throw(SignalOperationProviderError(
        "invalid_operation_parameters",
        "Укажите значение поля «$(field_label)»: автоматический выбор для этого метода EngeeDSP недоступен",
        field_label == "Длина окна" ? "window_length" : "maxima_separation",
    ))
    raw = units == "seconds" ? value * source.sample_rate_hz : value
    field = field_label == "Длина окна" ? "window_length" : "maxima_separation"
    raw <= SIGNAL_DERIVED_MAX_SAMPLES || throw(SignalOperationProviderError(
        "invalid_operation_parameters",
        "Поле «$(field_label)» не должно превышать $(SIGNAL_DERIVED_MAX_SAMPLES) отсчётов",
        field,
    ))
    rounded = round(Int, raw)
    rounded >= 1 || throw(SignalOperationProviderError(
        "invalid_operation_parameters",
        "Поле «$(field_label)» должно соответствовать хотя бы одному отсчёту",
        field,
    ))
    rounded
end

function signal_operation_envelope_body(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::String
    parameters = command.parameters::EnvelopeSignalOperationParameters
    call = if parameters.method == "hilbert"
        "EngeeDSP.Functions.envelope(init_signal; out = :data)"
    elseif parameters.method == "fir"
        parameters.filter_order === nothing && throw(SignalOperationProviderError(
            "invalid_operation_parameters",
            "Укажите порядок фильтра: автоматический выбор КИХ-порядка EngeeDSP недоступен",
            "filter_order",
        ))
        "EngeeDSP.Functions.envelope(init_signal, $(parameters.filter_order::Int), " *
            "\"analytic\"; out = :data)"
    elseif parameters.method == "rms"
        count = signal_operation_envelope_count(
            source,
            parameters.window_length,
            parameters.length_units,
            "Длина окна",
        )
        "EngeeDSP.Functions.envelope(init_signal, $(count), \"rms\"; out = :data)"
    else
        count = signal_operation_envelope_count(
            source,
            parameters.maxima_separation,
            parameters.separation_units,
            "Расстояние между максимумами",
        )
        "EngeeDSP.Functions.envelope(init_signal, $(count), \"peak\"; out = :data)"
    end
    property = parameters.side == "upper" ? "yupper" : "ylower"
    "let result = $(call); vec(result.$(property)); end"
end

function signal_operation_resample_body(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::String
    parameters = command.parameters::ResampleSignalOperationParameters
    if parameters.mode == "factor"
        return "vec(EngeeDSP.Functions.resample(init_signal, " *
            "$(parameters.upsample_factor::Int), " *
            "$(parameters.downsample_factor::Int)).y)"
    end
    target_rate = parameters.target_sample_rate_hz::Float64
    interpolation = something(parameters.interpolation, "linear")
    """
    let
        source_time = collect(0:(length(init_signal) - 1)) ./ __signal_sample_rate_hz__
        result = EngeeDSP.Functions.resample(
            init_signal,
            source_time,
            $(repr(target_rate)),
            $(signal_operation_julia_string(interpolation)),
        )
        keep = findall(time -> time <= last(source_time), result.ty)
        isempty(keep) && throw(ArgumentError("resample result is outside source time domain"))
        vec(result.y[keep])
    end
    """
end

function signal_operation_remote_defined(eval_fn, name::String)::Bool
    value = signal_operation_eval(
        eval_fn,
        "isdefined(Main, Symbol($(signal_operation_quoted(name))))",
        retry_safe = true,
    )
    value isa Bool || throw(SignalOperationProviderError(
        "engee_transport_error",
        "Engee вернул некорректный результат проверки временного имени",
    ))
    value
end

function signal_operation_unique_names(eval_fn)::NTuple{3,String}
    suffix = replace(string(UUIDs.uuid4()), "-" => "")
    names = (
        "__signal_analyser_operation_input_$(suffix)__",
        "__signal_analyser_operation_stage_$(suffix)__",
        "__signal_analyser_operation_output_$(suffix)__",
    )
    any(name -> signal_operation_remote_defined(eval_fn, name), names) && throw(
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
    eval_fn,
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
        signal_operation_eval(eval_fn, assignment) == last_index || throw(
            SignalOperationProviderError(
                "engee_transport_error",
                "Engee не подтвердил сборку входного сигнала",
            ),
        )
        signal_operation_send_checked(send_value, receive, stage_name, nothing)
    end
    signal_operation_eval(
        eval_fn,
        "length(getfield(Main, Symbol($(signal_operation_quoted(input_name)))))",
        retry_safe = true,
    ) == total || throw(SignalOperationProviderError(
        "engee_transport_error",
        "Engee собрал входной сигнал неверной длины",
    ))
    nothing
end

function signal_operation_body(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::String
    command.operation_kind == "preprocess" || throw(SignalOperationProviderError(
        "invalid_operation",
        "Неподдерживаемый раздел операции",
    ))
    command.operation in ("bandpass", "bandstop", "highpass", "lowpass") &&
        return signal_operation_filter_body(command)
    command.operation == "detrend" && return signal_operation_detrend_body(command)
    command.operation == "fill-missing" && return signal_operation_fill_missing_body(command)
    command.operation == "smooth" && return signal_operation_smooth_body(source, command)
    command.operation == "envelope" && return signal_operation_envelope_body(source, command)
    command.operation == "resample" && return signal_operation_resample_body(source, command)
    command.operation == "custom-preprocess" && return command.body::String
    throw(SignalOperationProviderError("invalid_operation", "Неподдерживаемая операция"))
end

signal_operation_value_is_finite(value)::Bool =
    isfinite(real(value)) && isfinite(imag(value))

signal_operation_value_is_infinite(value)::Bool =
    isinf(real(value)) || isinf(imag(value))

function signal_operation_validate_source(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::Nothing
    command.operation_kind == "preprocess" || throw(SignalOperationProviderError(
        "invalid_operation",
        "Неподдерживаемый раздел операции",
    ))
    if command.operation in ("envelope", "detrend") && source.is_complex
        throw(SignalOperationProviderError(
            "incompatible_signal_type",
            command.operation == "envelope" ?
                "Огибающая доступна только для вещественного сигнала" :
                "Удаление тренда доступно только для вещественного сигнала",
        ))
    end
    if command.operation == "fill-missing"
        any(signal_operation_value_is_infinite, source.values) && throw(
            SignalOperationProviderError(
                "incompatible_signal_values",
                "Сначала удалите бесконечные значения из исходного сигнала",
            ),
        )
        parameters = command.parameters::FillMissingSignalOperationParameters
        missing_count = count(value -> !signal_operation_value_is_finite(value), source.values)
        finite_count = length(source.values) - missing_count
        if source.is_complex && parameters.method == "moving_median"
            throw(SignalOperationProviderError(
                "incompatible_signal_type",
                "Скользящая медиана не поддерживает комплексный сигнал",
            ))
        end
        if parameters.method in ("moving_mean", "moving_median") &&
            (parameters.window_length::Int) > length(source.values)
            throw(SignalOperationProviderError(
                "invalid_operation_parameters",
                "Длина окна не должна превышать длину сигнала",
                "window_length",
            ))
        elseif parameters.method == "autoregressive" &&
            (parameters.ar_order::Int) >= finite_count
            throw(SignalOperationProviderError(
                "invalid_operation_parameters",
                "Порядок модели должен быть меньше числа конечных отсчётов",
                "ar_order",
            ))
        end
    elseif !all(signal_operation_value_is_finite, source.values)
        throw(SignalOperationProviderError(
            "incompatible_signal_values",
            "Операция требует конечных значений исходного сигнала",
        ))
    end
    if command.operation in ("bandpass", "bandstop", "highpass", "lowpass")
        parameters = command.parameters::FilterSignalOperationParameters
        nyquist = parameters.frequency_units == "hertz" ? source.sample_rate_hz / 2 : 1.0
        frequencies = command.operation in ("bandpass", "bandstop") ?
            [parameters.lower_passband::Float64, parameters.upper_passband::Float64] :
            [parameters.passband::Float64]
        all(value -> 0.0 < value < nyquist, frequencies) || throw(
            SignalOperationProviderError(
                "invalid_operation_parameters",
                "Частоты должны быть больше нуля и меньше частоты Найквиста",
                command.operation in ("bandpass", "bandstop") ?
                    "upper_passband" : "passband",
            ),
        )
    elseif command.operation == "detrend"
        parameters = command.parameters::DetrendSignalOperationParameters
        all(index -> 1 <= index <= length(source.values), parameters.breakpoints) || throw(
            SignalOperationProviderError(
                "invalid_operation_parameters",
                "Точки разбиения должны входить в диапазон отсчётов сигнала",
                "breakpoints",
            ),
        )
    elseif command.operation == "smooth"
        parameters = command.parameters::SmoothSignalOperationParameters
        window = signal_operation_smooth_window_samples(source, parameters)
        if window !== nothing && parameters.polynomial_degree !== nothing &&
            parameters.polynomial_degree >= window
            throw(SignalOperationProviderError(
                "invalid_operation_parameters",
                "Степень полинома должна быть меньше длины окна",
                "polynomial_degree",
            ))
        end
    elseif command.operation == "resample"
        parameters = command.parameters::ResampleSignalOperationParameters
        output_length_estimate = if parameters.mode == "factor"
            Float64(length(source.values)) *
                Float64(parameters.upsample_factor::Int) /
                Float64(parameters.downsample_factor::Int)
        else
            signal_duration_s(source) * (parameters.target_sample_rate_hz::Float64) + 1.0
        end
        field = parameters.mode == "factor" ? "upsample_factor" :
            "target_sample_rate_hz"
        output_length = ceil(output_length_estimate)
        isfinite(output_length) &&
            2.0 <= output_length <= SIGNAL_DERIVED_MAX_SAMPLES || throw(
            SignalOperationProviderError(
                "invalid_operation_parameters",
                "Передискретизация должна дать от 2 до $(SIGNAL_DERIVED_MAX_SAMPLES) отсчётов",
                field,
            ),
        )
        result_rate = parameters.mode == "factor" ?
            source.sample_rate_hz *
                (Float64(parameters.upsample_factor::Int) /
                    Float64(parameters.downsample_factor::Int)) :
            parameters.target_sample_rate_hz::Float64
        isfinite(result_rate) && result_rate > 0.0 || throw(
            SignalOperationProviderError(
                "invalid_operation_parameters",
                "Результирующая частота дискретизации должна быть положительной и конечной",
                field,
            ),
        )
    end
    nothing
end

function signal_operation_wrapper(
    input_name::String,
    output_name::String,
    operation_body::String,
    ;
    import_engee_dsp::Bool = false,
    sample_rate_hz::Real = 1.0,
)::String
    import_statement = import_engee_dsp ? "import EngeeDSP" : ""
    """
    begin
        $(import_statement)
        let init_signal = getfield(Main, Symbol($(signal_operation_quoted(input_name)))),
            __signal_sample_rate_hz__ = $(repr(Float64(sample_rate_hz)))
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
                Int64[1, Int64(length(normalized)), operation_is_complex ? 1 : 0]
            catch err
                global $(output_name) = sprint(showerror, err)
                Int64[0, 0, 0]
            end
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
        @error "Signal operation wrapper syntax error" exception = (err, catch_backtrace())
        throw(SignalOperationProviderError(
            "invalid_operation_body",
            "Тело операции содержит синтаксическую ошибку",
            "body",
        ))
    end
    signal_operation_parse_has_error(parsed) && throw(SignalOperationProviderError(
        "invalid_operation_body",
        "Тело операции содержит синтаксическую ошибку",
        "body",
    ))
    nothing
end

function signal_operation_receive_chunked(
    eval_fn,
    output_name::String,
    total::Int,
    is_complex::Bool,
    sample_rate_hz::Union{Nothing,Float64} = nothing,
)::SignalOperationProviderResult
    values = Vector{ComplexF64}(undef, total)
    for first_index in 1:ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES:total
        last_index = min(total, first_index + ENGEE_SIGNAL_OPERATION_CHUNK_SAMPLES - 1)
        chunk = signal_operation_eval(
            eval_fn,
            "getfield(Main, Symbol($(signal_operation_quoted(output_name))))" *
                "[$(first_index):$(last_index)]",
            retry_safe = true,
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
    SignalOperationProviderResult(values, is_complex, sample_rate_hz)
end

function signal_operation_result_sample_rate(
    source::AnalysedSignal,
    command::DeriveSignalCommand,
)::Union{Nothing,Float64}
    command.operation == "resample" || return nothing
    parameters = command.parameters::ResampleSignalOperationParameters
    parameters.mode == "factor" ?
        source.sample_rate_hz *
            (Float64(parameters.upsample_factor::Int) /
                Float64(parameters.downsample_factor::Int)) :
        parameters.target_sample_rate_hz::Float64
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
                name,
                retry_safe = true,
            ) === nothing || error("cleanup value was not released")
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
    signal_operation_validate_source(source, command)
    operation_body = signal_operation_body(source, command)
    send_value, receive, eval_fn = signal_operation_genie_functions()
    names = signal_operation_unique_names(eval_fn)
    input_name, stage_name, output_name = names
    transport_values = source.is_complex ? copy(source.values) : Float64[real(value) for value in source.values]
    try
        wrapper = signal_operation_wrapper(
            input_name,
            output_name,
            operation_body;
            import_engee_dsp = command.operation != "custom-preprocess",
            sample_rate_hz = source.sample_rate_hz,
        )
        signal_operation_preflight_wrapper(wrapper)
        signal_operation_send_chunked!(
            send_value,
            receive,
            eval_fn,
            input_name,
            stage_name,
            transport_values,
        )
        metadata = signal_operation_eval(eval_fn, wrapper)
        metadata isa Vector{Int64} && length(metadata) == 3 || throw(SignalOperationProviderError(
            "engee_transport_error",
            "Engee вернул некорректный статус операции",
        ))
        status_flag, result_length, complex_flag = metadata
        status_flag in (0, 1) && complex_flag in (0, 1) || throw(
            SignalOperationProviderError(
                "engee_transport_error",
                "Engee вернул некорректные флаги статуса операции",
            ),
        )
        if status_flag == 0
            remote_error = try
                value = signal_operation_recv(
                    receive,
                    output_name,
                    retry_safe = true,
                )
                value isa AbstractString ? String(value) : "Некорректный тип текста ошибки"
            catch err
                @error "Failed to read sanitized Engee signal operation error" exception = (
                    err,
                    catch_backtrace(),
                )
                "Текст ошибки недоступен"
            end
            @error "Engee signal operation failed" operation = command.operation remote_error
            throw(SignalOperationProviderError(
                "operation_failed",
                "Операция не выполнена в Engee",
            ))
        end
        total = result_length
        2 <= total <= SIGNAL_DERIVED_MAX_SAMPLES || throw(SignalOperationProviderError(
            "invalid_operation_result",
            "Engee вернул результат недопустимой длины",
        ))
        result_is_complex = complex_flag == 1
        result = signal_operation_receive_chunked(
            eval_fn,
            output_name,
            total,
            result_is_complex,
            signal_operation_result_sample_rate(source, command),
        )
        if command.operation == "custom-preprocess" &&
            result.is_complex != source.is_complex
            throw(SignalOperationProviderError(
                "invalid_operation_result",
                "Пользовательская операция не должна менять вещественный или комплексный тип сигнала",
            ))
        end
        result
    finally
        signal_operation_cleanup!(send_value, receive, names)
    end
end
