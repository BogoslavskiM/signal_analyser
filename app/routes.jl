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

route("/api/state-lite", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            signal_analyser_state_lite_api_payload(SIGNAL_ANALYSER_STATE);
            headers = response_headers,
        )
    catch err
        api_error_response(
            "Не удалось получить лёгкое состояние Signal Analyser",
            err;
            status = 500,
            headers = response_headers,
        )
    end
end

# Keep the compatibility bootstrap adjacent to the authoritative lightweight
# startup route.  Its payload contains no Plotly arrays and never starts an
# output calculation.
route("/api/layouts", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            signal_analyser_layouts_bootstrap_payload(
                signal_analyser_layouts_lite_snapshot(SIGNAL_ANALYSER_STATE),
            );
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

route("/api/outputs/active", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        display_id = try
            params(:display_id)
        catch err
            err isa KeyError || rethrow()
            nothing
        end
        pane_id = try
            params(:pane_id)
        catch err
            err isa KeyError || rethrow()
            nothing
        end
        display_id isa AbstractString && !isempty(String(display_id)) || throw(
            SignalAnalyserValidationError(
                "Некорректный запрос active output",
                Dict("display_id" => "Требуется непустой идентификатор Display"),
            ),
        )
        pane_id isa AbstractString && !isempty(String(pane_id)) || throw(
            SignalAnalyserValidationError(
                "Некорректный запрос active output",
                Dict("pane_id" => "Требуется непустой идентификатор pane"),
            ),
        )
        api_json(
            signal_analyser_active_output(
                SIGNAL_ANALYSER_STATE,
                String(display_id),
                String(pane_id),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserInactiveOutputError
            signal_analyser_inactive_output_response(
                SIGNAL_ANALYSER_STATE,
                err;
                headers = response_headers,
            )
        else
            api_error_response(
                "Не удалось получить active output Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

route("/api/peaks/active", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        display_id = try
            params(:display_id)
        catch err
            err isa KeyError || rethrow()
            nothing
        end
        pane_id = try
            params(:pane_id)
        catch err
            err isa KeyError || rethrow()
            nothing
        end
        display_id isa AbstractString && !isempty(String(display_id)) || throw(
            SignalAnalyserValidationError(
                "Некорректный запрос экстремумов",
                Dict("display_id" => "Требуется непустой идентификатор Display"),
            ),
        )
        pane_id isa AbstractString && !isempty(String(pane_id)) || throw(
            SignalAnalyserValidationError(
                "Некорректный запрос экстремумов",
                Dict("pane_id" => "Требуется непустой идентификатор pane"),
            ),
        )
        api_json(
            signal_analyser_active_peaks(
                SIGNAL_ANALYSER_STATE,
                String(display_id),
                String(pane_id),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserInactiveOutputError
            signal_analyser_inactive_output_response(
                SIGNAL_ANALYSER_STATE,
                err;
                headers = response_headers,
            )
        else
            api_error_response(
                "Не удалось получить экстремумы активной области Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

# GET is deliberately passive for opening/polling the Extrema table.  Only this
# explicit POST starts the active-pane worker calculation.
route("/api/peaks/active", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            calculate_signal_analyser_active_peaks!(
                SIGNAL_ANALYSER_STATE,
                jsonpayload(),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa SignalAnalyserInactiveOutputError
            signal_analyser_inactive_output_response(
                SIGNAL_ANALYSER_STATE,
                err;
                headers = response_headers,
            )
        else
            api_error_response(
                "Не удалось рассчитать экстремумы активной области Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

route("/api/peaks/settings", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            apply_signal_peaks_settings!(SIGNAL_ANALYSER_STATE, jsonpayload());
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa SignalAnalyserInactiveOutputError
            signal_analyser_inactive_output_response(
                SIGNAL_ANALYSER_STATE,
                err;
                headers = response_headers,
            )
        else
            api_error_response(
                "Не удалось применить настройки экстремумов",
                err;
                status = 500,
                headers = response_headers,
            )
        end
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

# Stateless native Engee save/import browser.  All filesystem and JLD2 work is
# executed in the production Engee process; there is deliberately no local
# filesystem fallback.
route("/api/save/options", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            native_save_options(NATIVE_SESSION_IO_SERVICE, SIGNAL_ANALYSER_STATE);
            headers = response_headers,
        )
    catch err
        if err isa NativeEngeeIOError
            native_engee_io_error_response(err; headers = response_headers)
        else
            api_error_response("Не удалось получить варианты сохранения", err; status = 500, headers = response_headers)
        end
    end
end

route("/api/file-browser/list", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        request = parse_native_file_browser_request(jsonpayload())
        api_json(
            native_file_browser_payload(NATIVE_SESSION_IO_SERVICE, request);
            headers = response_headers,
        )
    catch err
        if err isa NativeEngeeIOError
            native_engee_io_error_response(err; headers = response_headers)
        elseif err isa WorkspaceUnavailableError || err isa WorkspaceProviderError
            native_engee_provider_error_response(err; headers = response_headers)
        else
            api_error_response("Не удалось прочитать каталог Engee", err; status = 500, headers = response_headers)
        end
    end
end

route("/api/file-browser/action", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        request = parse_native_file_browser_action_request(jsonpayload())
        api_json(
            native_file_browser_action_payload(NATIVE_SESSION_IO_SERVICE, request);
            headers = response_headers,
        )
    catch err
        if err isa NativeEngeeIOError
            native_engee_io_error_response(err; headers = response_headers)
        elseif err isa WorkspaceUnavailableError || err isa WorkspaceProviderError
            native_engee_provider_error_response(err; headers = response_headers)
        else
            api_error_response("Не удалось выполнить действие file browser Engee", err; status = 500, headers = response_headers)
        end
    end
end

route("/api/save", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            save_native_signal_analyser!(
                NATIVE_SESSION_IO_SERVICE,
                SIGNAL_ANALYSER_STATE,
                jsonpayload(),
            );
            headers = response_headers,
        )
    catch err
        if err isa NativeEngeeIOError
            native_engee_io_error_response(err; headers = response_headers)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_session_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa WorkspaceUnavailableError || err isa WorkspaceProviderError
            native_engee_provider_error_response(err; headers = response_headers)
        else
            api_error_response("Не удалось сохранить данные в Engee", err; status = 500, headers = response_headers)
        end
    end
end

route("/api/import/session", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            import_native_signal_analyser_session!(
                NATIVE_SESSION_IO_SERVICE,
                SIGNAL_ANALYSER_STATE,
                jsonpayload(),
            );
            headers = response_headers,
        )
    catch err
        if err isa NativeEngeeIOError
            native_engee_io_error_response(err; headers = response_headers)
        elseif err isa SignalAnalyserSessionValidationError
            signal_analyser_session_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_session_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa WorkspaceUnavailableError || err isa WorkspaceProviderError
            native_engee_provider_error_response(err; headers = response_headers)
        else
            api_error_response("Не удалось импортировать JLD2-сессию", err; status = 500, headers = response_headers)
        end
    end
end


# Portable .sazip v1 is intentionally separate from the legacy JSON session
# routes above.  Validation and import never extract files or execute scripts.
route("/api/session/package", method = GET) do
    try
        signal_package_binary_response(
            export_signal_package(SIGNAL_PACKAGE_SERVICE, SIGNAL_ANALYSER_STATE),
        )
    catch err
        if err isa SignalPackageValidationError || err isa SignalPackageArchiveError
            signal_package_validation_response(err)
        else
            api_error_response(
                "Не удалось создать пакет Signal Analyser",
                err;
                status = 500,
            )
        end
    end
end

route("/api/session/package/validate", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        archive = parse_signal_package_validate_request(jsonpayload())
        package = validate_signal_package(SIGNAL_PACKAGE_SERVICE, archive)
        api_json(signal_package_validation_payload(package); headers = response_headers)
    catch err
        if err isa SignalPackageValidationError || err isa SignalPackageArchiveError
            signal_package_validation_response(err)
        else
            api_error_response(
                "Не удалось проверить пакет Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end

route("/api/session/package/workspace-preflight", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        archive, workspace_prefix =
            parse_signal_package_workspace_preflight_request(jsonpayload())
        api_json(
            preflight_signal_package_workspace(
                SIGNAL_PACKAGE_SERVICE,
                archive,
                workspace_prefix,
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalPackageValidationError || err isa SignalPackageArchiveError
            signal_package_validation_response(err)
        else
            api_error_response(
                "Не удалось проверить публикацию пакета в рабочую область Engee",
                err;
                status = 500,
                headers = response_headers,
            )
        end
    end
end


route("/api/session/package/import", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        expected_revision, archive, publish_workspace, workspace_prefix =
            parse_signal_package_import_request(jsonpayload())
        # Full archive validation happens off-state.  Only the final publish is
        # revision-checked and performed under the aggregate lock.
        package = validate_signal_package(SIGNAL_PACKAGE_SERVICE, archive)
        api_json(
            import_signal_package!(
                SIGNAL_PACKAGE_SERVICE,
                SIGNAL_ANALYSER_STATE,
                package,
                expected_revision,
                publish_workspace = publish_workspace,
                workspace_prefix = workspace_prefix,
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalPackageValidationError || err isa SignalPackageArchiveError
            signal_package_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_session_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response(
                "Не удалось импортировать пакет Signal Analyser",
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
                request_data;
                lightweight = true,
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

route("/api/settings/apply", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    request_data = nothing
    try
        request_data = jsonpayload()
        api_json(
            apply_signal_settings!(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                request_data,
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserStaleStateError
            display_id = request_data isa AbstractDict ?
                signal_analyser_payload_value(request_data, "display_id") : ""
            signal_setting_stale_response(
                SIGNAL_SETTINGS_SERVICE,
                SIGNAL_ANALYSER_STATE,
                err,
                display_id isa AbstractString ? String(display_id) : "",
            )
        else
            api_error_response(
                "Не удалось применить Settings Signal Analyser",
                err;
                status = 500,
                headers = response_headers,
            )
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
        api_json(apply_signal_analyser_view!(
            SIGNAL_ANALYSER_STATE,
            jsonpayload();
            lightweight = true,
        ))
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
        api_json(apply_signal_analyser_display!(
            SIGNAL_ANALYSER_STATE,
            jsonpayload();
            lightweight = true,
        ))
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

route("/api/layouts", method = POST) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            signal_analyser_layouts_bootstrap_payload(
                apply_signal_analyser_layout!(
                    SIGNAL_ANALYSER_STATE,
                    jsonpayload();
                    lightweight = true,
                ),
            );
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
            jsonpayload();
            lightweight = true,
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

route("/api/signals/derive", method = POST) do
    try
        api_json(apply_derived_signal!(
            SIGNAL_OPERATION_PROVIDER,
            SIGNAL_INVENTORY_SERVICE,
            SIGNAL_ANALYSER_STATE,
            parse_derive_signal_command(jsonpayload());
            lightweight = true,
        ))
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        elseif err isa SignalOperationProviderError
            signal_operation_error_response(err)
        elseif err isa WorkspaceUnavailableError
            workspace_api_error_response("workspace_unavailable", err; status = 503)
        elseif err isa WorkspaceProviderError
            workspace_api_error_response("workspace_provider_error", err; status = 502)
        else
            signal_operation_internal_error_response(err)
        end
    end
end

route("/api/signals/crop", method = POST) do
    try
        api_json(apply_cropped_signal!(
            SIGNAL_INVENTORY_SERVICE,
            SIGNAL_ANALYSER_STATE,
            parse_crop_signal_command(jsonpayload());
            lightweight = true,
        ))
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        elseif err isa SignalAnalyserStaleStateError
            signal_analyser_stale_response(SIGNAL_ANALYSER_STATE, err)
        else
            api_error_response("Не удалось обрезать сигнал", err; status = 500)
        end
    end
end

route("/api/signals/:signal_id/summary", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        api_json(
            signal_inventory_summary_payload(
                SIGNAL_ANALYSER_STATE,
                String(params(:signal_id)),
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        else
            api_error_response("Не удалось получить сводку сигнала", err; status = 500)
        end
    end
end

route("/api/signals/:signal_id/samples", method = GET) do
    response_headers = Genie.Renderer.HTTPHeaders(["Cache-Control" => "no-store"])
    try
        cursor_value = try
            params(:cursor)
        catch
            nothing
        end
        limit_value = try
            params(:limit)
        catch
            nothing
        end
        cursor = signal_inventory_query_integer(cursor_value, "cursor", 0)
        limit = signal_inventory_query_integer(
            limit_value,
            "limit",
            SIGNAL_INVENTORY_SAMPLES_DEFAULT_LIMIT,
        )
        api_json(
            signal_inventory_samples_payload(
                SIGNAL_ANALYSER_STATE,
                String(params(:signal_id)),
                cursor,
                limit,
            );
            headers = response_headers,
        )
    catch err
        if err isa SignalAnalyserValidationError
            signal_analyser_validation_response(err)
        else
            api_error_response("Не удалось получить отсчёты сигнала", err; status = 500)
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
