const SIGNAL_SETTINGS_FIELD_KINDS = Set([
    "text",
    "boolean",
    "enum",
    "number",
    "integer",
    "optional_range",
    "resolution",
    "power_bins",
])

const SIGNAL_SETTINGS_EFFECT_STATUSES = Set([
    "effective",
    "effective_presentation",
    "stored_only",
    "blocked_contract",
    "blocked_provider",
    "blocked_prerequisite",
    "blocked_resource",
])

const SIGNAL_SETTINGS_EFFECT_REASONS = Set([
    "",
    "milestone_3",
    "milestone_3_contract",
    "ENGEE-20260801-003",
    "ENGEE-20260801-004",
    "DEC-20260801-026",
    "DEC-20260801-027",
])

const SIGNAL_SETTINGS_CONTROL_KINDS = Set([
    "text",
    "checkbox",
    "combobox",
    "number",
    "integer",
    "range",
    "resolution",
    "power_bins",
])

@enum SignalTimeUnitPreference begin
    AUTO_TIME_UNIT
    PICOSECONDS_TIME_UNIT
    NANOSECONDS_TIME_UNIT
    MICROSECONDS_TIME_UNIT
    MILLISECONDS_TIME_UNIT
    SECONDS_TIME_UNIT
    MINUTES_TIME_UNIT
    HOURS_TIME_UNIT
    DAYS_TIME_UNIT
    YEARS_TIME_UNIT
end

"""Resolve automatic time units so the largest displayed value stays in [1, 1000)."""
function signal_resolved_time_unit(
    unit::SignalTimeUnitPreference,
    maximum_seconds::Real,
)::SignalTimeUnitPreference
    unit != AUTO_TIME_UNIT && return unit
    value = abs(Float64(maximum_seconds))
    isfinite(value) && value > 0 || return SECONDS_TIME_UNIT
    candidates = (
        (PICOSECONDS_TIME_UNIT, 1.0e-12),
        (NANOSECONDS_TIME_UNIT, 1.0e-9),
        (MICROSECONDS_TIME_UNIT, 1.0e-6),
        (MILLISECONDS_TIME_UNIT, 1.0e-3),
        (SECONDS_TIME_UNIT, 1.0),
        (MINUTES_TIME_UNIT, 60.0),
        (HOURS_TIME_UNIT, 3600.0),
        (DAYS_TIME_UNIT, 86400.0),
        (YEARS_TIME_UNIT, 31557600.0),
    )
    for (candidate, seconds_per_unit) in candidates
        rendered = value / seconds_per_unit
        1.0 <= rendered < 1000.0 && return candidate
    end
    value < 1.0e-12 ? PICOSECONDS_TIME_UNIT : YEARS_TIME_UNIT
end

function signal_seconds_per_time_unit(
    unit::SignalTimeUnitPreference,
    maximum_seconds::Real = 1.0,
)::Float64
    resolved = signal_resolved_time_unit(unit, maximum_seconds)
    resolved == PICOSECONDS_TIME_UNIT && return 1.0e-12
    resolved == NANOSECONDS_TIME_UNIT && return 1.0e-9
    resolved == MICROSECONDS_TIME_UNIT && return 1.0e-6
    resolved == MILLISECONDS_TIME_UNIT && return 1.0e-3
    resolved == SECONDS_TIME_UNIT && return 1.0
    resolved == MINUTES_TIME_UNIT && return 60.0
    resolved == HOURS_TIME_UNIT && return 3600.0
    resolved == DAYS_TIME_UNIT && return 86400.0
    31557600.0
end

@enum SignalFrequencyUnitPreference begin
    CYCLES_PER_YEAR_FREQUENCY_UNIT
    CYCLES_PER_DAY_FREQUENCY_UNIT
    CYCLES_PER_HOUR_FREQUENCY_UNIT
    CYCLES_PER_MINUTE_FREQUENCY_UNIT
    MILLIHERTZ_FREQUENCY_UNIT
    HERTZ_FREQUENCY_UNIT
    KILOHERTZ_FREQUENCY_UNIT
    MEGAHERTZ_FREQUENCY_UNIT
    GIGAHERTZ_FREQUENCY_UNIT
    TERAHERTZ_FREQUENCY_UNIT
end

function signal_hertz_per_frequency_unit(unit::SignalFrequencyUnitPreference)::Float64
    unit == CYCLES_PER_YEAR_FREQUENCY_UNIT && return 1.0 / 31557600.0
    unit == CYCLES_PER_DAY_FREQUENCY_UNIT && return 1.0 / 86400.0
    unit == CYCLES_PER_HOUR_FREQUENCY_UNIT && return 1.0 / 3600.0
    unit == CYCLES_PER_MINUTE_FREQUENCY_UNIT && return 1.0 / 60.0
    unit == MILLIHERTZ_FREQUENCY_UNIT && return 1.0e-3
    unit == HERTZ_FREQUENCY_UNIT && return 1.0
    unit == KILOHERTZ_FREQUENCY_UNIT && return 1.0e3
    unit == MEGAHERTZ_FREQUENCY_UNIT && return 1.0e6
    unit == GIGAHERTZ_FREQUENCY_UNIT && return 1.0e9
    1.0e12
end

@enum SignalSpectrumResolutionType begin
    LEAKAGE_SPECTRUM_RESOLUTION
    RBW_SPECTRUM_RESOLUTION
    WINDOW_LENGTH_SPECTRUM_RESOLUTION
end

@enum SignalSpectrumWindow begin
    BLACKMAN_HARRIS_SPECTRUM_WINDOW
    CHEBYSHEV_SPECTRUM_WINDOW
    FLAT_TOP_SPECTRUM_WINDOW
    HAMMING_SPECTRUM_WINDOW
    HANN_SPECTRUM_WINDOW
    KAISER_SPECTRUM_WINDOW
    RECTANGULAR_SPECTRUM_WINDOW
end

@enum SignalSettingMode begin
    AUTOMATIC_SIGNAL_SETTING
    SPECIFIED_SIGNAL_SETTING
end

"""Finite strict pair used by stored-only range preferences."""
struct SignalSettingRange
    minimum::Float64
    maximum::Float64

    function SignalSettingRange(minimum::Real, maximum::Real)
        minimum isa Bool && throw(ArgumentError("Минимум диапазона должен быть числом, но не Bool"))
        maximum isa Bool && throw(ArgumentError("Максимум диапазона должен быть числом, но не Bool"))
        min_value = Float64(minimum)
        max_value = Float64(maximum)
        isfinite(min_value) && isfinite(max_value) || throw(ArgumentError(
            "Границы диапазона должны быть конечными числами",
        ))
        min_value < max_value || throw(ArgumentError(
            "Минимум диапазона должен быть меньше максимума",
        ))
        new(
            min_value == 0.0 ? 0.0 : min_value,
            max_value == 0.0 ? 0.0 : max_value,
        )
    end
end

Base.:(==)(left::SignalSettingRange, right::SignalSettingRange) =
    left.minimum == right.minimum && left.maximum == right.maximum

struct SignalSecondsResolution
    mode::SignalSettingMode
    seconds::Union{Nothing,Float64}

    function SignalSecondsResolution(
        mode::SignalSettingMode,
        seconds::Union{Nothing,Real},
    )
        if mode == AUTOMATIC_SIGNAL_SETTING
            seconds === nothing || throw(ArgumentError("Auto resolution требует seconds=null"))
            return new(mode, nothing)
        end
        seconds === nothing && throw(ArgumentError("Specified resolution требует seconds"))
        seconds isa Bool && throw(ArgumentError("Seconds должны быть числом, но не Bool"))
        value = Float64(seconds)
        isfinite(value) && value > 0 || throw(ArgumentError(
            "Seconds должны быть положительным конечным числом",
        ))
        new(mode, value)
    end
end

SignalSecondsResolution() = SignalSecondsResolution(AUTOMATIC_SIGNAL_SETTING, nothing)
Base.:(==)(left::SignalSecondsResolution, right::SignalSecondsResolution) =
    left.mode == right.mode && left.seconds == right.seconds

struct SignalHertzResolution
    mode::SignalSettingMode
    hz::Union{Nothing,Float64}

    function SignalHertzResolution(
        mode::SignalSettingMode,
        hz::Union{Nothing,Real},
    )
        if mode == AUTOMATIC_SIGNAL_SETTING
            hz === nothing || throw(ArgumentError("Auto resolution требует hz=null"))
            return new(mode, nothing)
        end
        hz === nothing && throw(ArgumentError("Specified resolution требует hz"))
        hz isa Bool && throw(ArgumentError("Hz должны быть числом, но не Bool"))
        value = Float64(hz)
        isfinite(value) && value > 0 || throw(ArgumentError(
            "Hz должны быть положительным конечным числом",
        ))
        new(mode, value)
    end
end

SignalHertzResolution() = SignalHertzResolution(AUTOMATIC_SIGNAL_SETTING, nothing)
Base.:(==)(left::SignalHertzResolution, right::SignalHertzResolution) =
    left.mode == right.mode && left.hz == right.hz

struct SignalSamplesResolution
    mode::SignalSettingMode
    samples::Union{Nothing,Int}

    function SignalSamplesResolution(
        mode::SignalSettingMode,
        samples::Union{Nothing,Integer},
    )
        if mode == AUTOMATIC_SIGNAL_SETTING
            samples === nothing || throw(ArgumentError("Auto resolution требует samples=null"))
            return new(mode, nothing)
        end
        samples === nothing && throw(ArgumentError("Specified resolution требует samples"))
        samples isa Bool && throw(ArgumentError("Samples должны быть integer, но не Bool"))
        value = try
            Int(samples)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            throw(ArgumentError("Samples выходят за диапазон Int"))
        end
        value >= 2 || throw(ArgumentError("Samples должны быть не меньше 2"))
        new(mode, value)
    end
end

SignalSamplesResolution() = SignalSamplesResolution(AUTOMATIC_SIGNAL_SETTING, nothing)
Base.:(==)(left::SignalSamplesResolution, right::SignalSamplesResolution) =
    left.mode == right.mode && left.samples == right.samples

struct SignalNfftResolution
    mode::SignalSettingMode
    nfft::Union{Nothing,Int}

    function SignalNfftResolution(
        mode::SignalSettingMode,
        nfft::Union{Nothing,Integer},
    )
        if mode == AUTOMATIC_SIGNAL_SETTING
            nfft === nothing || throw(ArgumentError("Auto NFFT требует nfft=null"))
            return new(mode, nothing)
        end
        nfft === nothing && throw(ArgumentError("Specified NFFT требует nfft"))
        nfft isa Bool && throw(ArgumentError("NFFT должен быть integer, но не Bool"))
        value = try
            Int(nfft)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            throw(ArgumentError("NFFT выходит за диапазон Int"))
        end
        value >= 2 || throw(ArgumentError("NFFT должен быть не меньше 2"))
        new(mode, value)
    end
end

SignalNfftResolution() = SignalNfftResolution(AUTOMATIC_SIGNAL_SETTING, nothing)
Base.:(==)(left::SignalNfftResolution, right::SignalNfftResolution) =
    left.mode == right.mode && left.nfft == right.nfft

struct SignalPowerBinsPreference
    mode::SignalSettingMode
    count::Union{Nothing,Int}

    function SignalPowerBinsPreference(
        mode::SignalSettingMode,
        count::Union{Nothing,Integer},
    )
        if mode == AUTOMATIC_SIGNAL_SETTING
            count === nothing || throw(ArgumentError("Auto power bins требует count=null"))
            return new(mode, nothing)
        end
        count === nothing && throw(ArgumentError("Specified power bins требует count"))
        count isa Bool && throw(ArgumentError("Power bins должны быть integer, но не Bool"))
        value = try
            Int(count)
        catch err
            (err isa InexactError || err isa OverflowError) || rethrow()
            throw(ArgumentError("Power bins выходят за диапазон Int"))
        end
        20 <= value <= 1024 || throw(ArgumentError(
            "Power bins должны быть целым числом от 20 до 1024",
        ))
        new(mode, value)
    end
end

SignalPowerBinsPreference() = SignalPowerBinsPreference(AUTOMATIC_SIGNAL_SETTING, nothing)
Base.:(==)(left::SignalPowerBinsPreference, right::SignalPowerBinsPreference) =
    left.mode == right.mode && left.count == right.count

struct SignalDisplayPreferences
    show_legend::Bool
end

SignalDisplayPreferences() = SignalDisplayPreferences(true)
Base.:(==)(left::SignalDisplayPreferences, right::SignalDisplayPreferences) =
    left.show_legend == right.show_legend

struct SignalTimePreferences
    normalize_y::Bool
    show_markers::Bool
    units::SignalTimeUnitPreference
    y_limits::Union{Nothing,SignalSettingRange}
    link_time::Bool
    link_amplitude::Bool
end

SignalTimePreferences() = SignalTimePreferences(
    false,
    false,
    SECONDS_TIME_UNIT,
    nothing,
    false,
    false,
)
Base.:(==)(left::SignalTimePreferences, right::SignalTimePreferences) =
    left.normalize_y == right.normalize_y &&
    left.show_markers == right.show_markers &&
    left.units == right.units &&
    left.y_limits == right.y_limits &&
    left.link_time == right.link_time &&
    left.link_amplitude == right.link_amplitude

struct SignalSpectrumPreferences
    frequency_units::SignalFrequencyUnitPreference
    y_limits::Union{Nothing,SignalSettingRange}
    resolution_type::SignalSpectrumResolutionType
    rbw::SignalHertzResolution
    window_length::SignalSamplesResolution
    window::SignalSpectrumWindow
    sidelobe_attenuation_db::Float64
    overlap_percent::Float64
    nfft::SignalNfftResolution
    link_frequency::Bool
    link_magnitude::Bool

    function SignalSpectrumPreferences(
        frequency_units::SignalFrequencyUnitPreference,
        y_limits::Union{Nothing,SignalSettingRange},
        resolution_type::SignalSpectrumResolutionType,
        rbw::SignalHertzResolution,
        window_length::SignalSamplesResolution,
        window::SignalSpectrumWindow,
        sidelobe_attenuation_db::Real,
        overlap_percent::Real,
        nfft::SignalNfftResolution,
        link_frequency::Bool,
        link_magnitude::Bool,
    )
        sidelobe_attenuation_db isa Bool && throw(ArgumentError(
            "Sidelobe attenuation должна быть числом, но не Bool",
        ))
        attenuation = Float64(sidelobe_attenuation_db)
        isfinite(attenuation) || throw(ArgumentError(
            "Sidelobe attenuation должна быть конечным числом",
        ))
        window == CHEBYSHEV_SPECTRUM_WINDOW && attenuation < 45 && throw(ArgumentError(
            "Chebyshev sidelobe attenuation должна быть не меньше 45 dB",
        ))
        window == KAISER_SPECTRUM_WINDOW && attenuation < 21 && throw(ArgumentError(
            "Kaiser sidelobe attenuation должна быть не меньше 21 dB",
        ))
        overlap_percent isa Bool && throw(ArgumentError(
            "Spectrum overlap должен быть числом, но не Bool",
        ))
        overlap = Float64(overlap_percent)
        isfinite(overlap) && 0.0 <= overlap < 100.0 || throw(ArgumentError(
            "Spectrum overlap должен быть конечным числом от 0 включительно до 100 исключительно",
        ))
        if window_length.mode == SPECIFIED_SIGNAL_SETTING &&
            nfft.mode == SPECIFIED_SIGNAL_SETTING &&
            (nfft.nfft::Int) < (window_length.samples::Int)
            throw(ArgumentError(
                "Specified NFFT должен быть не меньше specified Window Length",
            ))
        end
        new(
            frequency_units,
            y_limits,
            resolution_type,
            rbw,
            window_length,
            window,
            attenuation == 0.0 ? 0.0 : attenuation,
            overlap == 0.0 ? 0.0 : overlap,
            nfft,
            link_frequency,
            link_magnitude,
        )
    end
end

SignalSpectrumPreferences(
    frequency_units::SignalFrequencyUnitPreference,
    y_limits::Union{Nothing,SignalSettingRange},
    resolution_type::SignalSpectrumResolutionType,
    rbw::SignalHertzResolution,
    window_length::SignalSamplesResolution,
    window::SignalSpectrumWindow,
    sidelobe_attenuation_db::Real,
    overlap_percent::Real,
    nfft::SignalNfftResolution,
) = SignalSpectrumPreferences(
    frequency_units,
    y_limits,
    resolution_type,
    rbw,
    window_length,
    window,
    sidelobe_attenuation_db,
    overlap_percent,
    nfft,
    false,
    false,
)

SignalSpectrumPreferences(
    frequency_units::SignalFrequencyUnitPreference,
    y_limits::Union{Nothing,SignalSettingRange},
    resolution_type::SignalSpectrumResolutionType,
    rbw::SignalHertzResolution,
    window_length::SignalSamplesResolution,
    window::SignalSpectrumWindow,
    sidelobe_attenuation_db::Real,
    overlap_percent::Real,
) = SignalSpectrumPreferences(
    frequency_units,
    y_limits,
    resolution_type,
    rbw,
    window_length,
    window,
    sidelobe_attenuation_db,
    overlap_percent,
    SignalNfftResolution(),
)

SignalSpectrumPreferences() = SignalSpectrumPreferences(
    HERTZ_FREQUENCY_UNIT,
    nothing,
    LEAKAGE_SPECTRUM_RESOLUTION,
    SignalHertzResolution(),
    SignalSamplesResolution(),
    HAMMING_SPECTRUM_WINDOW,
    60.0,
    50.0,
    SignalNfftResolution(),
)
Base.:(==)(left::SignalSpectrumPreferences, right::SignalSpectrumPreferences) =
    left.frequency_units == right.frequency_units &&
    left.y_limits == right.y_limits &&
    left.resolution_type == right.resolution_type &&
    left.rbw == right.rbw &&
    left.window_length == right.window_length &&
    left.window == right.window &&
    left.sidelobe_attenuation_db == right.sidelobe_attenuation_db &&
    left.overlap_percent == right.overlap_percent &&
    left.nfft == right.nfft &&
    left.link_frequency == right.link_frequency &&
    left.link_magnitude == right.link_magnitude

struct SignalSpectrogramPreferences
    time_units::SignalTimeUnitPreference
    frequency_units::SignalFrequencyUnitPreference
    scale::SignalSpectrumScale
    time_resolution::SignalSecondsResolution
    reassign::Bool
end

SignalSpectrogramPreferences() = SignalSpectrogramPreferences(
    SECONDS_TIME_UNIT,
    HERTZ_FREQUENCY_UNIT,
    DB_SPECTRUM_SCALE,
    SignalSecondsResolution(),
    false,
)
Base.:(==)(left::SignalSpectrogramPreferences, right::SignalSpectrogramPreferences) =
    left.time_units == right.time_units &&
    left.frequency_units == right.frequency_units &&
    left.scale == right.scale &&
    left.time_resolution == right.time_resolution &&
    left.reassign == right.reassign

struct SignalPersistencePreferences
    time_units::SignalTimeUnitPreference
    frequency_units::SignalFrequencyUnitPreference
    frequency_limits::Union{Nothing,SignalSettingRange}
    power_limits::Union{Nothing,SignalSettingRange}
    density_limits::Union{Nothing,SignalSettingRange}
    frequency_scale::SignalSpectrumFrequencyScale
    scale::SignalSpectrumScale
    time_resolution::SignalSecondsResolution
    overlap_percent::Float64
    power_bins::SignalPowerBinsPreference

    function SignalPersistencePreferences(
        time_units::SignalTimeUnitPreference,
        frequency_units::SignalFrequencyUnitPreference,
        frequency_limits::Union{Nothing,SignalSettingRange},
        power_limits::Union{Nothing,SignalSettingRange},
        density_limits::Union{Nothing,SignalSettingRange},
        frequency_scale::SignalSpectrumFrequencyScale,
        scale::SignalSpectrumScale,
        time_resolution::SignalSecondsResolution,
        overlap_percent::Real,
        power_bins::SignalPowerBinsPreference,
    )
        overlap_percent isa Bool && throw(ArgumentError(
            "Persistence overlap должен быть числом, но не Bool",
        ))
        overlap = Float64(overlap_percent)
        isfinite(overlap) && 0.0 <= overlap < 100.0 || throw(ArgumentError(
            "Persistence overlap должен быть конечным числом от 0 включительно до 100 исключительно",
        ))
        if density_limits !== nothing
            0.0 <= density_limits.minimum < density_limits.maximum <= 100.0 || throw(ArgumentError(
                "Density Limits должны находиться внутри диапазона 0–100 процентов",
            ))
        end
        new(
            time_units,
            frequency_units,
            frequency_limits,
            power_limits,
            density_limits,
            frequency_scale,
            scale,
            time_resolution,
            overlap == 0.0 ? 0.0 : overlap,
            power_bins,
        )
    end
end

SignalPersistencePreferences() = SignalPersistencePreferences(
    SECONDS_TIME_UNIT,
    HERTZ_FREQUENCY_UNIT,
    nothing,
    nothing,
    nothing,
    LINEAR_SPECTRUM_FREQUENCY_SCALE,
    DB_SPECTRUM_SCALE,
    SignalSecondsResolution(),
    50.0,
    SignalPowerBinsPreference(),
)
Base.:(==)(left::SignalPersistencePreferences, right::SignalPersistencePreferences) =
    left.time_units == right.time_units &&
    left.frequency_units == right.frequency_units &&
    left.frequency_limits == right.frequency_limits &&
    left.power_limits == right.power_limits &&
    left.density_limits == right.density_limits &&
    left.frequency_scale == right.frequency_scale &&
    left.scale == right.scale &&
    left.time_resolution == right.time_resolution &&
    left.overlap_percent == right.overlap_percent &&
    left.power_bins == right.power_bins

"""Immutable typed preferences owned by exactly one Display aggregate."""
struct SignalDisplayStoredSettings
    display::SignalDisplayPreferences
    time::SignalTimePreferences
    spectrum::SignalSpectrumPreferences
    spectrogram::SignalSpectrogramPreferences
    persistence::SignalPersistencePreferences
end


SignalDisplayStoredSettings() = SignalDisplayStoredSettings(
    SignalDisplayPreferences(),
    SignalTimePreferences(),
    SignalSpectrumPreferences(),
    SignalSpectrogramPreferences(),
    SignalPersistencePreferences(),
)
Base.:(==)(left::SignalDisplayStoredSettings, right::SignalDisplayStoredSettings) =
    left.display == right.display &&
    left.time == right.time &&
    left.spectrum == right.spectrum &&
    left.spectrogram == right.spectrogram &&
    left.persistence == right.persistence

struct SignalSettingsOptionDefinition
    value::String
    label::String
end

struct SignalSettingsGroupDefinition
    id::String
    label::String
end

struct SignalSettingsSectionDefinition
    id::String
    group::String
    label::String
    order::Int

    function SignalSettingsSectionDefinition(
        id::AbstractString,
        group::AbstractString,
        label::AbstractString,
        order::Integer,
    )
        order isa Bool && throw(ArgumentError("Section order должен быть integer, но не Bool"))
        order > 0 || throw(ArgumentError("Section order должен быть положительным"))
        new(String(id), String(group), String(label), Int(order))
    end
end

struct SignalSettingsReadoutDefinition
    id::String
    group::String
    section::String
    label::String
    units::String
    status::String
    reason::String

    function SignalSettingsReadoutDefinition(
        id::AbstractString,
        group::AbstractString,
        section::AbstractString,
        label::AbstractString,
        units::AbstractString,
        status::AbstractString,
        reason::AbstractString,
    )
        status in ("available", "unavailable") || throw(ArgumentError(
            "Readout status должен быть available или unavailable",
        ))
        new(
            String(id),
            String(group),
            String(section),
            String(label),
            String(units),
            String(status),
            String(reason),
        )
    end
end

struct SignalSettingsFieldDefinition
    id::String
    group::String
    section::String
    label::String
    kind::String
    control_kind::String
    default_value::Any
    units::String
    minimum::Union{Nothing,Float64}
    maximum::Union{Nothing,Float64}
    step::Union{Nothing,Float64}
    options::Tuple{Vararg{SignalSettingsOptionDefinition}}
    checked_value::Any
    unchecked_value::Any
    effect_status::String
    effect_reason::String
    visibility_policy::Symbol
    enabled_policy::Symbol

    function SignalSettingsFieldDefinition(
        id::AbstractString,
        group::AbstractString,
        section::AbstractString,
        label::AbstractString,
        kind::AbstractString,
        control_kind::AbstractString,
        default_value,
        units::AbstractString,
        minimum::Union{Nothing,Real},
        maximum::Union{Nothing,Real},
        step::Union{Nothing,Real},
        options::Tuple{Vararg{SignalSettingsOptionDefinition}},
        checked_value,
        unchecked_value,
        effect_status::AbstractString,
        effect_reason::AbstractString,
        visibility_policy::Symbol,
        enabled_policy::Symbol,
    )
        kind_value = String(kind)
        kind_value in SIGNAL_SETTINGS_FIELD_KINDS || throw(ArgumentError(
            "Неизвестный kind settings field: $kind_value",
        ))
        status_value = String(effect_status)
        status_value in SIGNAL_SETTINGS_EFFECT_STATUSES || throw(ArgumentError(
            "Неизвестный effect_status settings field: $status_value",
        ))
        reason_value = String(effect_reason)
        reason_value in SIGNAL_SETTINGS_EFFECT_REASONS || throw(ArgumentError(
            "Неизвестный effect_reason settings field: $reason_value",
        ))
        control_value = String(control_kind)
        control_value in SIGNAL_SETTINGS_CONTROL_KINDS || throw(ArgumentError(
            "Неизвестный control_kind settings field: $control_value",
        ))
        enum_checkbox = kind_value == "enum" && control_value == "checkbox"
        enum_checkbox == (checked_value !== nothing || unchecked_value !== nothing) || throw(
            ArgumentError("Checked mapping допускается только и обязательно для enum-checkbox"),
        )
        enum_checkbox && (checked_value === nothing || unchecked_value === nothing) && throw(
            ArgumentError("Enum-checkbox требует checked_value и unchecked_value"),
        )
        new(
            String(id),
            String(group),
            String(section),
            String(label),
            kind_value,
            control_value,
            default_value,
            String(units),
            minimum === nothing ? nothing : Float64(minimum),
            maximum === nothing ? nothing : Float64(maximum),
            step === nothing ? nothing : Float64(step),
            options,
            checked_value,
            unchecked_value,
            status_value,
            reason_value,
            visibility_policy,
            enabled_policy,
        )
    end
end

"""Ordered immutable metadata catalog for the settings API."""
struct SignalSettingsCatalog
    groups::Tuple{Vararg{SignalSettingsGroupDefinition}}
    sections::Tuple{Vararg{SignalSettingsSectionDefinition}}
    fields::Tuple{Vararg{SignalSettingsFieldDefinition}}
    readouts::Tuple{Vararg{SignalSettingsReadoutDefinition}}

    function SignalSettingsCatalog(
        groups::Tuple{Vararg{SignalSettingsGroupDefinition}},
        sections::Tuple{Vararg{SignalSettingsSectionDefinition}},
        fields::Tuple{Vararg{SignalSettingsFieldDefinition}},
        readouts::Tuple{Vararg{SignalSettingsReadoutDefinition}},
    )
        group_ids = Tuple(group.id for group in groups)
        length(unique(group_ids)) == length(group_ids) || throw(ArgumentError(
            "Settings groups должны иметь уникальные ids",
        ))
        section_ids = Tuple(section.id for section in sections)
        length(unique(section_ids)) == length(section_ids) || throw(ArgumentError(
            "Settings sections должны иметь уникальные ids",
        ))
        all(section -> section.group in group_ids, sections) || throw(ArgumentError(
            "Каждая settings section должна ссылаться на известную group",
        ))
        field_ids = Tuple(field.id for field in fields)
        length(unique(field_ids)) == length(field_ids) || throw(ArgumentError(
            "Settings fields должны иметь уникальные ids",
        ))
        all(field -> field.group in group_ids, fields) || throw(ArgumentError(
            "Каждый settings field должен ссылаться на известную group",
        ))
        all(field -> field.section in section_ids, fields) || throw(ArgumentError(
            "Каждый settings field должен ссылаться на известную section",
        ))
        all(field -> begin
            section = sections[findfirst(item -> item.id == field.section, sections)]
            section.group == field.group
        end, fields) || throw(ArgumentError(
            "Group settings field должна совпадать с group section",
        ))
        readout_ids = Tuple(readout.id for readout in readouts)
        length(unique(readout_ids)) == length(readout_ids) || throw(ArgumentError(
            "Settings readouts должны иметь уникальные ids",
        ))
        all(readout -> readout.group in group_ids && readout.section in section_ids, readouts) ||
            throw(ArgumentError("Каждый settings readout должен ссылаться на известные group/section"))
        new(groups, sections, fields, readouts)
    end
end


function signal_settings_field(
    catalog::SignalSettingsCatalog,
    field_id::AbstractString,
)::Union{Nothing,SignalSettingsFieldDefinition}
    index = findfirst(field -> field.id == field_id, catalog.fields)
    index === nothing ? nothing : catalog.fields[index]
end

struct UpdateSignalSettingCommand{T}
    state_revision::Int
    display_id::String
    field_id::String
    value::T

    function UpdateSignalSettingCommand(
        state_revision::Integer,
        display_id::AbstractString,
        field_id::AbstractString,
        value::T,
    ) where {T}
        state_revision isa Bool && throw(ArgumentError("Revision должна быть integer, но не Bool"))
        revision = Int(state_revision)
        revision >= 0 || throw(ArgumentError("Revision не может быть отрицательной"))
        isempty(display_id) && throw(ArgumentError("Display id не может быть пустым"))
        isempty(field_id) && throw(ArgumentError("Field id не может быть пустым"))
        new{T}(revision, String(display_id), String(field_id), value)
    end
end
