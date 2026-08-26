module PreprocessV59InventoryContractTests

using Test

"""
Accepted preprocessing inventory for the Signal Analyser V59 dialog.

Every built-in operation is backed by a public EngeeDSP function.  The custom
entry is intentionally different: it is user-authored Julia executed in the
Engee session and may call the same public functions.  It is not presented as
an EngeeDSP mathematical function of its own.
"""
const ACCEPTED_PREPROCESS_INVENTORY = (
    (key = "bandpass", label_ru = "Полосовой фильтр", functions = (:bandpass,)),
    (key = "bandstop", label_ru = "Режекторный фильтр", functions = (:bandstop,)),
    (key = "highpass", label_ru = "Фильтр высоких частот", functions = (:highpass,)),
    (key = "lowpass", label_ru = "Фильтр низких частот", functions = (:lowpass,)),
    (key = "detrend", label_ru = "Удаление тренда", functions = (:detrend,)),
    (
        key = "fill-missing",
        label_ru = "Заполнение пропущенных значений",
        functions = (:interp1, :movmean, :movmedian, :fillgaps),
    ),
    (key = "smooth", label_ru = "Сглаживание", functions = (:smoothdata,)),
    (key = "envelope", label_ru = "Огибающая", functions = (:envelope,)),
    (key = "resample", label_ru = "Передискретизация", functions = (:resample,)),
    (
        key = "custom-preprocess",
        label_ru = "Пользовательская операция",
        functions = (),
    ),
)

const EXCLUDED_OLD_OPERATIONS = (
    "absolute",
    "square",
    "root",
    "signed-root",
    "multiply",
    "fft",
)

const UNAVAILABLE_PUBLIC_CAPABILITIES = (
    denoise = (:wdenoise, :denoise),
    fill_missing_knn = (:knnsearch, :fillmissing),
)

const PARAMETER_RULES = (
    filter_frequency = "0 < f < Nyquist; band lower < upper",
    filter_steepness_runtime_safe = "0.5 <= value < 1.0",
    detrend_adapter_modes = "constant=>0, linear=>1",
    smooth_factor_runtime_safe = "0 < value < 1",
    envelope_nondefault_parameter = "required positive integer",
    resample_time = "nonnegative, strictly increasing, unique",
    custom_input_name = "init_signal",
)

function run_preprocess_v59_inventory_contract_tests(dsp)
    functions = dsp.Functions
    public_names = Set(names(functions; all = false, imported = false))

    @testset "V59 public-Engee-only preprocessing inventory" begin
        @test map(item -> item.key, ACCEPTED_PREPROCESS_INVENTORY) == (
            "bandpass",
            "bandstop",
            "highpass",
            "lowpass",
            "detrend",
            "fill-missing",
            "smooth",
            "envelope",
            "resample",
            "custom-preprocess",
        )
        @test length(unique(map(item -> item.key, ACCEPTED_PREPROCESS_INVENTORY))) == 10

        for operation in ACCEPTED_PREPROCESS_INVENTORY
            for function_name in operation.functions
                @test function_name in public_names
                @test isdefined(functions, function_name)
                @test getproperty(functions, function_name) isa Function
            end
        end

        for function_name in UNAVAILABLE_PUBLIC_CAPABILITIES.denoise
            @test function_name ∉ public_names
            @test !isdefined(functions, function_name)
        end
        for function_name in UNAVAILABLE_PUBLIC_CAPABILITIES.fill_missing_knn
            @test function_name ∉ public_names
            @test !isdefined(functions, function_name)
        end

        @test isempty(last(ACCEPTED_PREPROCESS_INVENTORY).functions)
        @test PARAMETER_RULES.custom_input_name == "init_signal"
        @test PARAMETER_RULES.envelope_nondefault_parameter ==
            "required positive integer"
        @test PARAMETER_RULES.smooth_factor_runtime_safe == "0 < value < 1"
        @test Set(EXCLUDED_OLD_OPERATIONS) == Set((
            "absolute",
            "square",
            "root",
            "signed-root",
            "multiply",
            "fft",
        ))
    end
end

end
