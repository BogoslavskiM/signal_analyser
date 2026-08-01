struct EngeeWorkspaceSignalSource <: AbstractWorkspaceSignalSource end

function engee_workspace_module(::EngeeWorkspaceSignalSource)
    try
        Base.require(@__MODULE__, :Engee)
    catch err
        throw(SignalWorkspaceSourceError(
            "Импорт из рабочей области Engee недоступен: $(sprint(showerror, err))",
        ))
    end
end

function workspace_signal_value(
    source::EngeeWorkspaceSignalSource,
    variable_name::String,
)
    engee_module = engee_workspace_module(source)
    engee_api = try
        getproperty(engee_module, :engee)
    catch
        throw(SignalWorkspaceSourceError(
            "Импорт из рабочей области Engee недоступен: Engee.engee не найден",
        ))
    end
    genie_api = try
        getproperty(engee_api, :genie)
    catch
        throw(SignalWorkspaceSourceError(
            "Импорт из рабочей области Engee недоступен: engee.genie не найден",
        ))
    end
    recv = try
        getproperty(genie_api, :recv)
    catch
        throw(SignalWorkspaceSourceError(
            "Импорт из рабочей области Engee недоступен: engee.genie.recv не найден",
        ))
    end
    try
        Base.invokelatest(recv, variable_name; context = Main)
    catch err
        throw(SignalWorkspaceSourceError(
            "Не удалось получить переменную $(variable_name) из рабочей области Engee: " *
            sprint(showerror, err),
        ))
    end
end
