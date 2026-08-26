using Test

const TASK0157_API = Main.AppTestContext

function task0157_payload(operation::String, parameters::AbstractDict;
    kind::String = "preprocess", revision::Int = 0, source_id::String = "source-1", target::String = "результат")
    Dict{String,Any}(
        "state_revision" => revision, "source_signal_id" => source_id,
        "operation_kind" => kind, "operation" => operation,
        "parameters" => Dict{String,Any}(String(key) => value for (key, value) in parameters),
        "target_name" => target, "overwrite" => false,
    )
end

function task0157_validation_error(thunk)
    error = try thunk(); nothing catch caught; caught end
    @test error isa TASK0157_API.SignalAnalyserValidationError
    error
end

const TASK0157_VALID_PARAMETERS = Dict{String,Dict{String,Any}}(
    "bandpass" => Dict("frequency_units" => "hertz", "lower_passband" => 10.0, "upper_passband" => 20.0, "impulse_response" => "auto", "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
    "bandstop" => Dict("frequency_units" => "normalized_pi", "lower_passband" => 0.1, "upper_passband" => 0.8, "impulse_response" => "fir", "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
    "highpass" => Dict("frequency_units" => "hertz", "passband" => 10.0, "impulse_response" => "iir", "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
    "lowpass" => Dict("frequency_units" => "normalized_pi", "passband" => 0.8, "impulse_response" => "auto", "steepness" => 0.85, "stopband_attenuation_db" => 60.0),
    "detrend" => Dict("method" => "piecewise_linear", "breakpoints" => "2, 5, 8", "nan_policy" => "omitnan"),
    "fill-missing" => Dict("method" => "moving_mean", "window_length" => 2, "end_method" => "same"),
    "smooth" => Dict("method" => "savitzky_golay", "window_type" => "duration", "duration_units" => "samples", "window_duration" => 7.0, "polynomial_degree" => 2),
    "envelope" => Dict("side" => "upper", "method" => "rms", "length_units" => "samples", "window_length" => 4.0),
    "resample" => Dict("mode" => "factor", "upsample_factor" => 3, "downsample_factor" => 2),
    "custom-preprocess" => Dict("body" => "reverse(init_signal)"),
)

@testset "TASK-0157 V59 derive API accepts exactly ten preprocessing operations" begin
    expected = Set(["bandpass", "bandstop", "highpass", "lowpass", "detrend", "fill-missing", "smooth", "envelope", "resample", "custom-preprocess"])
    @test TASK0157_API.SIGNAL_DERIVED_OPERATION_NAMES == expected
    @test Set(keys(TASK0157_VALID_PARAMETERS)) == expected
    for operation in sort!(collect(expected))
        command = TASK0157_API.parse_derive_signal_command(task0157_payload(operation, TASK0157_VALID_PARAMETERS[operation]))
        @test command.operation_kind == "preprocess"
        @test command.operation == operation
        @test TASK0157_API.signal_operation_parameters_match(operation, command.parameters)
    end
    for removed in ("abs", "square", "sqrt", "signed-root", "signed-sqrt", "multiply", "fft", "custom", "denoise", "knn")
        error = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload(removed, Dict{String,Any}())))
        @test haskey(error.errors, "operation")
    end
    kind_error = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("bandpass", TASK0157_VALID_PARAMETERS["bandpass"]; kind = "math")))
    @test haskey(kind_error.errors, "operation_kind")
end

@testset "TASK-0157 V59 schemas reject invisible fields and invalid bounds" begin
    for operation in keys(TASK0157_VALID_PARAMETERS)
        polluted = merge(copy(TASK0157_VALID_PARAMETERS[operation]), Dict("invisible" => 1))
        error = task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload(operation, polluted)))
        @test Set(keys(error.errors)) == Set(["parameters"])
    end
    for operation in ("bandpass", "bandstop")
        invalid = copy(TASK0157_VALID_PARAMETERS[operation]); invalid["lower_passband"] = invalid["upper_passband"]
        @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload(operation, invalid))).errors, "lower_passband")
    end
    invalid_normalized = copy(TASK0157_VALID_PARAMETERS["lowpass"]); invalid_normalized["passband"] = 1.0
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("lowpass", invalid_normalized))).errors, "passband")
    invalid_steepness = copy(TASK0157_VALID_PARAMETERS["highpass"]); invalid_steepness["steepness"] = 1.0
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("highpass", invalid_steepness))).errors, "steepness")
    invalid_breakpoints = copy(TASK0157_VALID_PARAMETERS["detrend"]); invalid_breakpoints["breakpoints"] = "5,2"
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("detrend", invalid_breakpoints))).errors, "breakpoints")
    invalid_fill = copy(TASK0157_VALID_PARAMETERS["fill-missing"]); invalid_fill["window_length"] = 0
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("fill-missing", invalid_fill))).errors, "window_length")
    invalid_smooth = Dict("method" => "moving_mean", "window_type" => "factor", "smoothing_factor" => 0.0)
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("smooth", invalid_smooth))).errors, "smoothing_factor")
    invalid_envelope = Dict("side" => "upper", "method" => "fir", "filter_order" => 0)
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("envelope", invalid_envelope))).errors, "filter_order")
    invalid_resample = Dict("mode" => "rate", "target_sample_rate_hz" => 0.0)
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("resample", invalid_resample))).errors, "target_sample_rate_hz")
    @test haskey(task0157_validation_error(() -> TASK0157_API.parse_derive_signal_command(task0157_payload("custom-preprocess", Dict("body" => "")))).errors, "body")
end
