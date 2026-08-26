using Test

const TASK0157_API = Main.AppTestContext

function task0157_payload(operation::String, parameters::AbstractDict; kind::String = "preprocess", revision::Int = 0, source_id::String = "source-1", target::String = "результат")
    Dict{String,Any}(
        "state_revision" => revision,
        "source_signal_id" => source_id,
        "operation_kind" => kind,
        "operation" => operation,
        "parameters" => Dict{String,Any}(String(key) => value for (key, value) in parameters),
        "target_name" => target,
        "overwrite" => false,
    )
end

function task0157_validation_error(thunk)
    error = try
        thunk()
        nothing
    catch caught
        caught
    end
    @test error isa TASK0157_API.SignalAnalyserValidationError
    error
end

@testset "TASK-0157 V58 derive parser has one exact envelope and visible-only parameter schemas" begin
    math_cases = Dict(
        "abs" => Dict{String,Any}(),
        "square" => Dict{String,Any}(),
        "sqrt" => Dict{String,Any}(),
        "signed-sqrt" => Dict{String,Any}(),
        "multiply" => Dict("multiplier" => -2.5),
        "custom" => Dict("body" => "reverse(init_signal)"),
    )
    for (operation, parameters) in math_cases
        command = TASK0157_API.parse_derive_signal_command(task0157_payload(operation, parameters; kind = "math"))
        @test command.operation_kind == "math"
        @test command.operation == (operation == "signed-sqrt" ? "signed_sqrt_abs" : operation)
        @test TASK0157_API.signal_operation_parameters_match(command.operation, command.parameters)
    end
    legacy = TASK0157_API.parse_derive_signal_command(Dict{String,Any}(
        "state_revision" => 0, "source_signal_id" => "source-1", "operation" => "signed_sqrt_abs",
        "target_name" => "legacy", "overwrite" => false, "multiplier" => nothing, "body" => nothing,
    ))
    @test legacy.operation_kind == "math" && legacy.operation == "signed_sqrt_abs"

    filter_cases = Dict(
        "bandpass" => Dict("frequency_units" => "hertz", "lower_passband" => 10.0, "upper_passband" => 20.0, "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
        "bandstop" => Dict("frequency_units" => "normalized_pi", "lower_passband" => 0.1, "upper_passband" => 0.8, "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
        "highpass" => Dict("frequency_units" => "hertz", "passband" => 10.0, "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
        "lowpass" => Dict("frequency_units" => "normalized_pi", "passband" => 0.8, "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
    )
    for (operation, parameters) in filter_cases
        command = TASK0157_API.parse_derive_signal_command(task0157_payload(operation, parameters))
        @test command.parameters isa TASK0157_API.FilterSignalOperationParameters
    end
    invalid_filter = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("bandpass", merge(copy(filter_cases["bandpass"]), Dict("invisible" => 1)))))
    @test Set(keys(invalid_filter.errors)) == Set(["parameters"])
    @test all(key -> !occursin('.', key), keys(invalid_filter.errors))

    detrend = TASK0157_API.parse_derive_signal_command(task0157_payload("detrend", Dict("method" => "piecewise_linear", "breakpoints" => "2, 5, 8")))
    @test detrend.parameters.breakpoints == [2, 5, 8]
    bad_breakpoints = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("detrend", Dict("method" => "piecewise_linear", "breakpoints" => "5,2"))))
    @test haskey(bad_breakpoints.errors, "breakpoints")

    fill_dependency = Dict("constant" => "constant_value", "moving_mean" => "window_length", "moving_median" => "window_length", "knn" => "neighbors", "autoregressive" => "ar_order")
    for method in ("constant", "previous", "next", "nearest", "linear", "spline", "pchip", "makima", "moving_mean", "moving_median", "knn", "autoregressive")
        parameters = Dict{String,Any}("method" => method, "end_method" => "same")
        haskey(fill_dependency, method) && (parameters[fill_dependency[method]] = method in ("constant",) ? 0.0 : 2)
        command = TASK0157_API.parse_derive_signal_command(task0157_payload("fill-missing", parameters))
        @test command.parameters isa TASK0157_API.FillMissingSignalOperationParameters
    end
    fill_edges = TASK0157_API.parse_derive_signal_command(task0157_payload("fill-missing", Dict("method" => "constant", "constant_value" => 0.0, "end_method" => "constant", "end_constant_value" => 0.0)))
    @test fill_edges.parameters.constant_value == 0.0 && fill_edges.parameters.end_constant_value == 0.0

    smooth_auto = TASK0157_API.parse_derive_signal_command(task0157_payload("smooth", Dict("method" => "savitzky_golay", "window_type" => "duration", "duration_units" => "seconds", "window_duration" => nothing, "polynomial_degree" => nothing)))
    @test smooth_auto.parameters.window_duration === nothing && smooth_auto.parameters.polynomial_degree === nothing
    smooth_factor = TASK0157_API.parse_derive_signal_command(task0157_payload("smooth", Dict("method" => "moving_mean", "window_type" => "factor", "smoothing_factor" => 0.0)))
    @test smooth_factor.parameters.smoothing_factor == 0.0
    for invalid_factor in (-0.1, 1.1)
        error = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("smooth", Dict("method" => "moving_mean", "window_type" => "factor", "smoothing_factor" => invalid_factor))))
        @test haskey(error.errors, "smoothing_factor")
    end

    for (side, method, extra) in (("upper", "hilbert", Dict()), ("lower", "fir", Dict("filter_order" => nothing)), ("upper", "rms", Dict("length_units" => "samples", "window_length" => nothing)), ("lower", "peak", Dict("separation_units" => "seconds", "maxima_separation" => nothing)))
        command = TASK0157_API.parse_derive_signal_command(task0157_payload("envelope", merge(Dict{String,Any}("side" => side, "method" => method), extra)))
        @test command.parameters isa TASK0157_API.EnvelopeSignalOperationParameters
    end

    rate = TASK0157_API.parse_derive_signal_command(task0157_payload("resample", Dict("mode" => "rate", "target_sample_rate_hz" => 2000.0)))
    factor = TASK0157_API.parse_derive_signal_command(task0157_payload("resample", Dict("mode" => "factor", "upsample_factor" => 3, "downsample_factor" => 2)))
    @test rate.parameters.target_sample_rate_hz == 2000.0 && factor.parameters.upsample_factor == 3
    custom_preprocess = TASK0157_API.parse_derive_signal_command(task0157_payload("custom-preprocess", Dict("body" => "init_signal .* 2")))
    @test custom_preprocess.parameters.body == "init_signal .* 2"
end

@testset "TASK-0157 source guards, typed unavailable response and state-lite preprocessing flags" begin
    source = TASK0157_API.AnalysedSignal("source-v58", "source-v58", "#2563eb", 1000.0, [1.0, NaN, 3.0, 4.0], false, true)
    fill_command = TASK0157_API.parse_derive_signal_command(task0157_payload("fill-missing", Dict("method" => "linear", "end_method" => "same"); source_id = source.id))
    @test TASK0157_API.signal_operation_validate_source(source, fill_command) === nothing
    @test_throws ArgumentError TASK0157_API.AnalysedSignal("inf-v58", "inf-v58", "#2563eb", 1000.0, [1.0, Inf], false, true)

    denoise = TASK0157_API.parse_derive_signal_command(task0157_payload("denoise", Dict("wavelet_family" => "sym", "wavelet_number" => 4, "method" => "blockjs", "levels" => nothing); source_id = source.id))
    unavailable = try TASK0157_API.signal_operation_validate_source(source, denoise); nothing catch err; err end
    @test unavailable isa TASK0157_API.SignalOperationProviderError && unavailable.code == "operation_unavailable"
    response = TASK0157_API.signal_operation_error_response(unavailable)
    @test response.status == 503 && response.body["ok"] === false && response.body["error"]["code"] == "operation_unavailable"
    @test isempty(response.body["error"]["fields"]) && !haskey(response.body, "derived_signal")

    real_source = TASK0157_API.AnalysedSignal("real-v58", "real-v58", "#2563eb", 1000.0, collect(1.0:8.0), false, true)
    resample = TASK0157_API.parse_derive_signal_command(task0157_payload("resample", Dict("mode" => "factor", "upsample_factor" => 3, "downsample_factor" => 2); source_id = real_source.id))
    @test TASK0157_API.signal_operation_result_sample_rate(real_source, resample) == 1500.0
    enormous = TASK0157_API.parse_derive_signal_command(task0157_payload("resample", Dict("mode" => "rate", "target_sample_rate_hz" => 1e20); source_id = real_source.id))
    overflow = try TASK0157_API.signal_operation_validate_source(real_source, enormous); nothing catch err; err end
    @test overflow isa TASK0157_API.SignalOperationProviderError && overflow.field == "target_sample_rate_hz"

    lite = TASK0157_API.signal_analyser_state_lite(TASK0157_API.default_signal_analyser_state())
    @test lite["capabilities"]["signal_preprocess_denoise"] === false
    @test lite["capabilities"]["signal_preprocess_resample"] === true
    @test lite["capabilities"]["signal_preprocess_custom"] === true
end
