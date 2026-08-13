const NATIVE_ENGEE_USER_ROOT = "/user"

"""Execute filesystem or JLD2 code in the production Engee Julia process."""
function native_engee_eval(code::AbstractString)
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    evaluate = try
        getproperty(genie_api, :eval)
    catch
        throw(WorkspaceUnavailableError(
            "Файловые операции Engee недоступны: engee.genie.eval не найден",
        ))
    end
    try
        Base.invokelatest(evaluate, String(code))
    catch err
        @error "Native Engee eval failed" exception = (err, catch_backtrace())
        throw(WorkspaceProviderError(
            "Файловая операция Engee завершилась ошибкой",
        ))
    end
end

"""Publish a prepared, concretely typed value through the public Engee API."""
function native_engee_send(variable_name::String, value::T)::Nothing where {T}
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    send_value = try
        getproperty(genie_api, :send)
    catch
        throw(WorkspaceUnavailableError(
            "Публикация в рабочую область Engee недоступна: engee.genie.send не найден",
        ))
    end
    try
        Base.invokelatest(send_value, variable_name, value)
    catch err
        @error "Native Engee send failed" variable_name exception = (err, catch_backtrace())
        throw(WorkspaceProviderError(
            "Не удалось опубликовать '$variable_name'",
        ))
    end
    nothing
end

"""Read one named public Engee workspace binding; a missing binding returns `Nothing`."""
function native_engee_recv(variable_name::String)
    genie_api = engee_workspace_genie_api(EngeeWorkspaceVariableProvider())
    receive = try
        getproperty(genie_api, :recv)
    catch
        throw(WorkspaceUnavailableError(
            "Чтение рабочей области Engee недоступно: engee.genie.recv не найден",
        ))
    end
    try
        Base.invokelatest(receive, variable_name; context = Main)
    catch err
        @error "Native Engee recv failed" variable_name exception = (err, catch_backtrace())
        throw(WorkspaceProviderError(
            "Не удалось прочитать '$variable_name'",
        ))
    end
end
