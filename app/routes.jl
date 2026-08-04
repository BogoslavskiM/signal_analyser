using Genie
using Genie.Requests

function public_path(parts::AbstractString...)
    joinpath(@__DIR__, "..", "public", parts...)
end

function public_file(parts::AbstractString...)
    serve_file(public_path(parts...))
end

route("/") do
    public_file("index.html")
end

route("/css/:file", method = GET) do
    public_file("css", basename(String(params(:file))))
end

route("/js/:file", method = GET) do
    public_file("js", basename(String(params(:file))))
end

route("/js/ui_blocks/:file", method = GET) do
    public_file("js", "ui_blocks", basename(String(params(:file))))
end

route("/icons/:file", method = GET) do
    public_file("icons", basename(String(params(:file))))
end

route("/fonts/:file", method = GET) do
    public_file("fonts", basename(String(params(:file))))
end

route("/api/status", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    api_json(status_payload(); headers = response_headers)
end

route("/api/state", method = GET) do
    try
        api_json(signal_analyser_snapshot(SIGNAL_ANALYSER_STATE))
    catch err
        api_error_response("Не удалось получить состояние Signal Analyser", err; status = 500)
    end
end

route("/api/session", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            export_signal_analyser_session(SIGNAL_SESSION_SERVICE, SIGNAL_ANALYSER_STATE);
            headers = response_headers,
        )
    catch err
        api_error_response(
            "Не удалось экспортировать сессию Signal Analyser",
            err;
            status = 500,
            headers = response_headers,
        )
    end
end

route("/api/session", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            import_signal_analyser_session!(
                SIGNAL_SESSION_SERVICE,
                SIGNAL_ANALYSER_STATE,
                jsonpayload(),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserSessionValidationError
            signal_analyser_session_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_session_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response(
                "Не удалось импортировать сессию Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

route("/api/settings", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        display_id = try
            params(:display_id)
        catch err
            err isa KeyError || rethrow()
            nothing
        end
        display_id isa AbstractString && !isempty(String(display_id)) || throw(
            SignalAnalyserValidationError(
                "Некорректный запрос Settings",
                Dict("display_id" => "Требуется непустой идентификатор Display"),
            ),
        )
        api_json(
            signal_settings_document(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                String(display_id),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        else
            api_error_response("Не удалось получить Settings Signal Analyser", err; status = 500)
        end
    end
end

route("/api/settings", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    request_data = nothing
    try
        request_data = jsonpayload()
        api_json(
            apply_signal_setting!(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                request_data,
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalSettingValidationError
            signal_setting_validation_response(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                err,
            )
        elseif err isa SignalAnalyserStaleStateError
            display_id = signal_analyser_payload_value(request_data, "display_id")
            signal_setting_stale_response(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                err,
                String(display_id),
            )
        else
            api_error_response("Не удалось обновить Settings Signal Analyser", err; status = 500)
        end
    end
end

route("/api/workspace/variables", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            workspace_catalog_payload(load_workspace_catalog!(WORKSPACE_CATALOG_SERVICE));
            headers = response_headers,
        )
    catch err
        if err isa WorkspaceUnavailableError
            workspace_api_error_response(
                "workspace_unavailable",
                err;
                status = 503,
                headers = response_headers,
            )
        elseif err isa WorkspaceProviderError
            workspace_api_error_response(
                "workspace_provider_error",
                err;
                status = 502,
                headers = response_headers,
            )
        else
            api_error_response(
                "Не удалось получить каталог рабочей области",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

route("/api/view", method = POST) do
    try
        api_json(apply_signal_analyser_view!(SIGNAL_ANALYSER_STATE, jsonpayload()))
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response("Не удалось обновить состояние Signal Analyser", err; status = 500)
        end
    end
end

route("/api/displays", method = POST) do
    try
        api_json(apply_signal_analyser_display!(SIGNAL_ANALYSER_STATE, jsonpayload()))
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response("Не удалось обновить Display Signal Analyser", err; status = 500)
        end
    end
end

route("/api/layouts", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            signal_analyser_layouts_snapshot(SIGNAL_ANALYSER_STATE);
            headers = response_headers,
        )
    catch err
        api_error_response(
            "Не удалось получить Layout Signal Analyser",
            err;
            status = 500,
            headers = response_headers,
        )
    end
end

route("/api/layouts", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            apply_signal_analyser_layout!(SIGNAL_ANALYSER_STATE, jsonpayload());
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_layout_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response("Не удалось обновить Layout Signal Analyser", err; status = 500)
        end
    end
end

route("/api/signals", method = POST) do
    try
        api_json(apply_signal_inventory!(
            WORKSPACE_BATCH_IMPORT_SERVICE,
            SIGNAL_ANALYSER_STATE,
            jsonpayload(),
        ))
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa StaleWorkspaceCatalogError
            workspace_api_error_response("stale_workspace_catalog", err; status = 409)
        elseif err isa WorkspaceChangedError
            workspace_api_error_response("workspace_changed", err; status = 409)
        elseif err isa WorkspaceUnavailableError
            workspace_api_error_response("workspace_unavailable", err; status = 503)
        elseif err isa WorkspaceProviderError
            workspace_api_error_response("workspace_provider_error", err; status = 502)
        else
            api_error_response("Не удалось изменить Signals inventory", err; status = 500)
        end
    end
end

route("/api/example", method = GET) do
    try
        api_json(example_payload())
    catch err
        api_error_response("Failed to build example payload", err; status = 500)
    end
end
