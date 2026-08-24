const SIGNAL_SETTINGS_UPDATE_FIELDS = Set([
    "state_revision",
    "display_id",
    "field_id",
    "value",
])

const SIGNAL_SETTINGS_APPLY_FIELDS = Set([
    "state_revision",
    "display_id",
])

const SIGNAL_TIME_UNIT_NAMES = Dict(
    AUTO_TIME_UNIT => "auto",
    PICOSECONDS_TIME_UNIT => "picoseconds",
    NANOSECONDS_TIME_UNIT => "nanoseconds",
    MICROSECONDS_TIME_UNIT => "microseconds",
    MILLISECONDS_TIME_UNIT => "milliseconds",
    SECONDS_TIME_UNIT => "seconds",
    MINUTES_TIME_UNIT => "minutes",
    HOURS_TIME_UNIT => "hours",
    DAYS_TIME_UNIT => "days",
    YEARS_TIME_UNIT => "years",
)
const SIGNAL_TIME_UNITS_BY_NAME = Dict(value => key for (key, value) in SIGNAL_TIME_UNIT_NAMES)
const SIGNAL_TIME_UNIT_OPTIONS = (
    SignalSettingsOptionDefinition("auto", "Auto"),
    SignalSettingsOptionDefinition("picoseconds", "ps"),
    SignalSettingsOptionDefinition("nanoseconds", "ns"),
    SignalSettingsOptionDefinition("microseconds", "μs"),
    SignalSettingsOptionDefinition("milliseconds", "ms"),
    SignalSettingsOptionDefinition("seconds", "s"),
    SignalSettingsOptionDefinition("minutes", "minutes"),
    SignalSettingsOptionDefinition("hours", "hours"),
    SignalSettingsOptionDefinition("days", "days"),
    SignalSettingsOptionDefinition("years", "years"),
)

function signal_settings_time_unit_label(
    unit::SignalTimeUnitPreference,
    maximum_seconds::Real = 1.0,
)::String
    resolved = signal_resolved_time_unit(unit, maximum_seconds)
    resolved == PICOSECONDS_TIME_UNIT && return "ps"
    resolved == NANOSECONDS_TIME_UNIT && return "ns"
    resolved == MICROSECONDS_TIME_UNIT && return "μs"
    resolved == MILLISECONDS_TIME_UNIT && return "ms"
    resolved == SECONDS_TIME_UNIT && return "s"
    resolved == MINUTES_TIME_UNIT && return "мин"
    resolved == HOURS_TIME_UNIT && return "ч"
    resolved == DAYS_TIME_UNIT && return "дн"
    "г"
end

function signal_settings_frequency_unit_label(
    unit::SignalFrequencyUnitPreference,
)::String
    unit == CYCLES_PER_YEAR_FREQUENCY_UNIT && return "циклов/год"
    unit == CYCLES_PER_DAY_FREQUENCY_UNIT && return "циклов/день"
    unit == CYCLES_PER_HOUR_FREQUENCY_UNIT && return "циклов/час"
    unit == CYCLES_PER_MINUTE_FREQUENCY_UNIT && return "циклов/мин"
    unit == MILLIHERTZ_FREQUENCY_UNIT && return "мГц"
    unit == HERTZ_FREQUENCY_UNIT && return "Гц"
    unit == KILOHERTZ_FREQUENCY_UNIT && return "кГц"
    unit == MEGAHERTZ_FREQUENCY_UNIT && return "МГц"
    unit == GIGAHERTZ_FREQUENCY_UNIT && return "ГГц"
    "ТГц"
end

const SIGNAL_FREQUENCY_UNIT_NAMES = Dict(
    CYCLES_PER_YEAR_FREQUENCY_UNIT => "cycles_per_year",
    CYCLES_PER_DAY_FREQUENCY_UNIT => "cycles_per_day",
    CYCLES_PER_HOUR_FREQUENCY_UNIT => "cycles_per_hour",
    CYCLES_PER_MINUTE_FREQUENCY_UNIT => "cycles_per_minute",
    MILLIHERTZ_FREQUENCY_UNIT => "millihertz",
    HERTZ_FREQUENCY_UNIT => "hertz",
    KILOHERTZ_FREQUENCY_UNIT => "kilohertz",
    MEGAHERTZ_FREQUENCY_UNIT => "megahertz",
    GIGAHERTZ_FREQUENCY_UNIT => "gigahertz",
    TERAHERTZ_FREQUENCY_UNIT => "terahertz",
)
const SIGNAL_FREQUENCY_UNITS_BY_NAME = Dict(
    value => key for (key, value) in SIGNAL_FREQUENCY_UNIT_NAMES
)
const SIGNAL_FREQUENCY_UNIT_OPTIONS = (
    SignalSettingsOptionDefinition("cycles_per_year", "cycles/year"),
    SignalSettingsOptionDefinition("cycles_per_day", "cycles/day"),
    SignalSettingsOptionDefinition("cycles_per_hour", "cycles/hour"),
    SignalSettingsOptionDefinition("cycles_per_minute", "cycles/minute"),
    SignalSettingsOptionDefinition("millihertz", "mHz"),
    SignalSettingsOptionDefinition("hertz", "Hz"),
    SignalSettingsOptionDefinition("kilohertz", "kHz"),
    SignalSettingsOptionDefinition("megahertz", "MHz"),
    SignalSettingsOptionDefinition("gigahertz", "GHz"),
    SignalSettingsOptionDefinition("terahertz", "THz"),
)

const SIGNAL_SPECTRUM_RESOLUTION_TYPE_NAMES = Dict(
    LEAKAGE_SPECTRUM_RESOLUTION => "leakage",
    RBW_SPECTRUM_RESOLUTION => "rbw",
    WINDOW_LENGTH_SPECTRUM_RESOLUTION => "window_length",
)
const SIGNAL_SPECTRUM_RESOLUTION_TYPES_BY_NAME = Dict(
    value => key for (key, value) in SIGNAL_SPECTRUM_RESOLUTION_TYPE_NAMES
)
const SIGNAL_SPECTRUM_RESOLUTION_TYPE_OPTIONS = (
    SignalSettingsOptionDefinition("leakage", "Leakage"),
    SignalSettingsOptionDefinition("rbw", "RBW"),
    SignalSettingsOptionDefinition("window_length", "Window Length"),
)

const SIGNAL_SPECTRUM_WINDOW_NAMES = Dict(
    BLACKMAN_HARRIS_SPECTRUM_WINDOW => "blackman_harris",
    CHEBYSHEV_SPECTRUM_WINDOW => "chebyshev",
    FLAT_TOP_SPECTRUM_WINDOW => "flat_top",
    HAMMING_SPECTRUM_WINDOW => "hamming",
    HANN_SPECTRUM_WINDOW => "hann",
    KAISER_SPECTRUM_WINDOW => "kaiser",
    RECTANGULAR_SPECTRUM_WINDOW => "rectangular",
)
const SIGNAL_SPECTRUM_WINDOWS_BY_NAME = Dict(value => key for (key, value) in SIGNAL_SPECTRUM_WINDOW_NAMES)
const SIGNAL_SPECTRUM_WINDOW_OPTIONS = (
    SignalSettingsOptionDefinition("blackman_harris", "Blackman-Harris"),
    SignalSettingsOptionDefinition("chebyshev", "Chebyshev"),
    SignalSettingsOptionDefinition("flat_top", "Flat-top"),
    SignalSettingsOptionDefinition("hamming", "Hamming"),
    SignalSettingsOptionDefinition("hann", "Hann"),
    SignalSettingsOptionDefinition("kaiser", "Kaiser"),
    SignalSettingsOptionDefinition("rectangular", "Rectangular"),
)

const SIGNAL_SCALE_OPTIONS = (
    SignalSettingsOptionDefinition("db", "dB"),
    SignalSettingsOptionDefinition("linear", "Linear"),
)
const SIGNAL_FREQUENCY_SCALE_OPTIONS = (
    SignalSettingsOptionDefinition("linear", "Linear"),
    SignalSettingsOptionDefinition("log", "Log"),
)

const SIGNAL_SETTINGS_GROUPS = (
    SignalSettingsGroupDefinition("display", "Display"),
    SignalSettingsGroupDefinition("time", "Time"),
    SignalSettingsGroupDefinition("spectrum", "Spectrum"),
    SignalSettingsGroupDefinition("spectrogram", "Spectrogram"),
    SignalSettingsGroupDefinition("persistence", "Persistence"),
)

const SIGNAL_SETTINGS_SECTIONS = (
    SignalSettingsSectionDefinition("display.view", "display", "View", 10),
    SignalSettingsSectionDefinition("time.options", "time", "Options", 10),
    SignalSettingsSectionDefinition("time.time_limits", "time", "Time Limits", 20),
    SignalSettingsSectionDefinition("time.y_axis_limits", "time", "Y-axis Limits", 30),
    SignalSettingsSectionDefinition("time.linking", "time", "Link Time", 40),
    SignalSettingsSectionDefinition("spectrum.frequency_limits", "spectrum", "Frequency Limits", 10),
    SignalSettingsSectionDefinition("spectrum.y_axis_limits", "spectrum", "Y-axis Limits", 20),
    SignalSettingsSectionDefinition("spectrum.scale", "spectrum", "Scale", 30),
    SignalSettingsSectionDefinition("spectrum.resolution_type", "spectrum", "Resolution Type", 40),
    SignalSettingsSectionDefinition("spectrum.leakage", "spectrum", "Leakage", 50),
    SignalSettingsSectionDefinition("spectrum.rbw", "spectrum", "RBW", 60),
    SignalSettingsSectionDefinition("spectrum.window_options", "spectrum", "Window Options", 70),
    SignalSettingsSectionDefinition("spectrum.frequency_resolution", "spectrum", "Frequency Resolution", 80),
    SignalSettingsSectionDefinition("spectrum.linking", "spectrum", "Spectrum links", 90),
    SignalSettingsSectionDefinition("spectrogram.time_limits", "spectrogram", "Time Limits", 10),
    SignalSettingsSectionDefinition("spectrogram.frequency_limits", "spectrogram", "Frequency Limits", 20),
    SignalSettingsSectionDefinition("spectrogram.power_limits", "spectrogram", "Power Limits", 30),
    SignalSettingsSectionDefinition("spectrogram.scale", "spectrogram", "Scale", 40),
    SignalSettingsSectionDefinition("spectrogram.leakage", "spectrogram", "Leakage", 50),
    SignalSettingsSectionDefinition("spectrogram.time_resolution", "spectrogram", "Time Resolution", 60),
    SignalSettingsSectionDefinition("spectrogram.frequency_resolution", "spectrogram", "Frequency Resolution", 70),
    SignalSettingsSectionDefinition("spectrogram.options", "spectrogram", "Options", 80),
    SignalSettingsSectionDefinition("persistence.frequency_limits", "persistence", "Frequency Limits", 10),
    SignalSettingsSectionDefinition("persistence.power_limits", "persistence", "Power Limits", 20),
    SignalSettingsSectionDefinition("persistence.density_limits", "persistence", "Density Limits", 30),
    SignalSettingsSectionDefinition("persistence.scale", "persistence", "Scale", 40),
    SignalSettingsSectionDefinition("persistence.leakage", "persistence", "Leakage", 50),
    SignalSettingsSectionDefinition("persistence.time_resolution", "persistence", "Time Resolution", 60),
    SignalSettingsSectionDefinition("persistence.power_bins", "persistence", "Power Bins", 70),
    SignalSettingsSectionDefinition("persistence.frequency_resolution", "persistence", "Frequency Resolution", 80),
)

const SIGNAL_SETTINGS_FIELD_SECTIONS = Dict(
    "display.name" => "display.view",
    "pane.name" => "display.view",
    "display.show_legend" => "display.view",
    "time.normalize_y" => "time.options",
    "time.show_markers" => "time.options",
    "time.units" => "time.time_limits",
    "time.x_limits" => "time.time_limits",
    "time.y_limits" => "time.y_axis_limits",
    "time.link_time" => "time.linking",
    "time.link_amplitude" => "time.linking",
    "spectrum.frequency_units" => "spectrum.frequency_limits",
    "spectrum.frequency_limits" => "spectrum.frequency_limits",
    "spectrum.y_limits" => "spectrum.y_axis_limits",
    "spectrum.frequency_scale" => "spectrum.scale",
    "spectrum.scale" => "spectrum.scale",
    "spectrum.resolution_type" => "spectrum.resolution_type",
    "spectrum.leakage" => "spectrum.leakage",
    "spectrum.rbw" => "spectrum.rbw",
    "spectrum.window_length" => "spectrum.window_options",
    "spectrum.window" => "spectrum.window_options",
    "spectrum.sidelobe_attenuation_db" => "spectrum.window_options",
    "spectrum.overlap_percent" => "spectrum.window_options",
    "spectrum.nfft" => "spectrum.window_options",
    "spectrum.link_frequency" => "spectrum.linking",
    "spectrum.link_magnitude" => "spectrum.linking",
    "spectrogram.time_units" => "spectrogram.time_limits",
    "spectrogram.frequency_units" => "spectrogram.frequency_limits",
    "spectrogram.frequency_limits" => "spectrogram.frequency_limits",
    "spectrogram.power_limits" => "spectrogram.power_limits",
    "spectrogram.frequency_scale" => "spectrogram.scale",
    "spectrogram.scale" => "spectrogram.scale",
    "spectrogram.leakage" => "spectrogram.leakage",
    "spectrogram.time_resolution" => "spectrogram.time_resolution",
    "spectrogram.overlap_percent" => "spectrogram.time_resolution",
    "spectrogram.reassign" => "spectrogram.options",
    "persistence.time_units" => "persistence.time_resolution",
    "persistence.frequency_units" => "persistence.frequency_limits",
    "persistence.frequency_limits" => "persistence.frequency_limits",
    "persistence.power_limits" => "persistence.power_limits",
    "persistence.density_limits" => "persistence.density_limits",
    "persistence.frequency_scale" => "persistence.scale",
    "persistence.scale" => "persistence.scale",
    "persistence.leakage" => "persistence.leakage",
    "persistence.time_resolution" => "persistence.time_resolution",
    "persistence.overlap_percent" => "persistence.time_resolution",
    "persistence.power_bins" => "persistence.power_bins",
)

const SIGNAL_SETTINGS_ENUM_CHECKBOX_IDS = Set([
    "spectrum.scale",
    "spectrogram.scale",
    "persistence.scale",
])

const SIGNAL_SETTINGS_READOUTS = (
    SignalSettingsReadoutDefinition(
        "spectrum.frequency_resolution",
        "spectrum",
        "spectrum.frequency_resolution",
        "Frequency Resolution",
        "Hz",
        "unavailable",
        "milestone_3",
    ),
    SignalSettingsReadoutDefinition(
        "spectrogram.actual_rbw",
        "spectrogram",
        "spectrogram.frequency_resolution",
        "Actual RBW",
        "Hz",
        "unavailable",
        "milestone_3",
    ),
    SignalSettingsReadoutDefinition(
        "persistence.rbw",
        "persistence",
        "persistence.frequency_resolution",
        "RBW",
        "Hz",
        "unavailable",
        "milestone_3",
    ),
)

signal_settings_auto_default(key::Symbol) = NamedTuple{(:mode, key)}(("auto", nothing))

function signal_settings_control_kind(id::AbstractString, kind::AbstractString)::String
    kind == "text" && return "text"
    id in SIGNAL_SETTINGS_ENUM_CHECKBOX_IDS && return "checkbox"
    kind == "boolean" && return "checkbox"
    kind == "enum" && return "combobox"
    kind == "number" && return "number"
    kind == "integer" && return "integer"
    kind == "optional_range" && return "range"
    kind == "resolution" && return "resolution"
    kind == "power_bins" && return "power_bins"
    throw(ArgumentError("Нет control_kind для kind=$kind"))
end

function signal_settings_field_definition(
    id::AbstractString,
    group::AbstractString,
    label::AbstractString,
    kind::AbstractString,
    default_value;
    units::AbstractString = "",
    minimum::Union{Nothing,Real} = nothing,
    maximum::Union{Nothing,Real} = nothing,
    step::Union{Nothing,Real} = nothing,
    options::Tuple{Vararg{SignalSettingsOptionDefinition}} = (),
    effect_status::AbstractString = "stored_only",
    effect_reason::AbstractString = "milestone_3",
    visibility_policy::Symbol = Symbol(group),
    enabled_policy::Symbol = :always,
)
    SignalSettingsFieldDefinition(
        id,
        group,
        SIGNAL_SETTINGS_FIELD_SECTIONS[String(id)],
        label,
        kind,
        signal_settings_control_kind(id, kind),
        default_value,
        units,
        minimum,
        maximum,
        step,
        options,
        id in SIGNAL_SETTINGS_ENUM_CHECKBOX_IDS ? "db" : nothing,
        id in SIGNAL_SETTINGS_ENUM_CHECKBOX_IDS ? "linear" : nothing,
        effect_status,
        effect_reason,
        visibility_policy,
        enabled_policy,
    )
end

const SIGNAL_SETTINGS_FIELDS = (
    signal_settings_field_definition(
        "display.name", "display", "Screen name", "text", "";
        effect_status = "effective_presentation", effect_reason = "", visibility_policy = :always,
    ),
    signal_settings_field_definition(
        "pane.name", "display", "Area name", "text", "";
        effect_status = "effective_presentation", effect_reason = "", visibility_policy = :always,
    ),
    signal_settings_field_definition(
        "display.show_legend", "display", "Show legend", "boolean", true;
        effect_status = "effective_presentation", effect_reason = "", visibility_policy = :always,
    ),
    signal_settings_field_definition(
        "time.normalize_y", "time", "Normalize Y", "boolean", false;
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "time.show_markers", "time", "Show markers", "boolean", false;
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "time.units", "time", "Time units", "enum", "seconds";
        options = SIGNAL_TIME_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "time.x_limits", "time", "X limits", "optional_range", nothing;
        units = "s", effect_status = "effective", effect_reason = "",
        visibility_policy = :time_or_spectrogram, enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "time.y_limits", "time", "Y limits", "optional_range", nothing;
        effect_status = "blocked_contract", effect_reason = "milestone_3_contract",
    ),
    signal_settings_field_definition(
        "time.link_time", "time", "Link time", "boolean", false;
        effect_status = "effective", effect_reason = "",
        visibility_policy = :multiple_time_panes,
        enabled_policy = :compatible_time_panes,
    ),
    signal_settings_field_definition(
        "time.link_amplitude", "time", "Link amplitude", "boolean", false;
        effect_status = "effective", effect_reason = "",
        visibility_policy = :multiple_time_panes,
        enabled_policy = :compatible_time_panes,
    ),
    signal_settings_field_definition(
        "spectrum.frequency_units", "spectrum", "Frequency units", "enum", "hertz";
        options = SIGNAL_FREQUENCY_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrum.frequency_limits", "spectrum", "Frequency limits", "optional_range", nothing;
        units = "Hz", effect_status = "effective", effect_reason = "", enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "spectrum.y_limits", "spectrum", "Y limits", "optional_range", nothing;
        effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrum.frequency_scale", "spectrum", "Frequency scale", "enum", "linear";
        options = SIGNAL_FREQUENCY_SCALE_OPTIONS, effect_status = "effective_presentation",
        effect_reason = "", enabled_policy = :spectrum_frequency_scale,
    ),
    signal_settings_field_definition(
        "spectrum.scale", "spectrum", "Spectrum in dB", "enum", "db";
        options = SIGNAL_SCALE_OPTIONS, effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrum.resolution_type", "spectrum", "Resolution type", "enum", "leakage";
        options = SIGNAL_SPECTRUM_RESOLUTION_TYPE_OPTIONS,
    ),
    signal_settings_field_definition(
        "spectrum.leakage", "spectrum", "Leakage", "number", 0.5;
        minimum = 0.0, maximum = 1.0, step = 0.01, effect_status = "effective",
        effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrum.rbw", "spectrum", "RBW", "resolution", signal_settings_auto_default(:hz);
        units = "Hz", minimum = 0.0, visibility_policy = :spectrum_rbw,
        effect_status = "blocked_contract", effect_reason = "milestone_3_contract",
    ),
    signal_settings_field_definition(
        "spectrum.window_length", "spectrum", "Window length", "resolution",
        signal_settings_auto_default(:samples); units = "samples", minimum = 2,
        step = 1, visibility_policy = :spectrum_window_length,
        effect_status = "blocked_contract", effect_reason = "milestone_3_contract",
    ),
    signal_settings_field_definition(
        "spectrum.window", "spectrum", "Window", "enum", "hamming";
        options = SIGNAL_SPECTRUM_WINDOW_OPTIONS, visibility_policy = :spectrum_windowed,
    ),
    signal_settings_field_definition(
        "spectrum.sidelobe_attenuation_db", "spectrum", "Sidelobe attenuation", "number", 60.0;
        units = "dB", step = 1, visibility_policy = :spectrum_windowed,
        enabled_policy = :sidelobe_attenuation,
    ),
    signal_settings_field_definition(
        "spectrum.overlap_percent", "spectrum", "Overlap", "number", 50.0;
        units = "%", minimum = 0.0, maximum = 100.0, step = 1,
        visibility_policy = :spectrum_windowed,
    ),
    signal_settings_field_definition(
        "spectrum.nfft", "spectrum", "DFT Points", "resolution",
        signal_settings_auto_default(:nfft); minimum = 2, step = 1,
        visibility_policy = :spectrum_window_length,
        effect_status = "blocked_contract", effect_reason = "milestone_3_contract",
    ),
    signal_settings_field_definition(
        "spectrum.link_frequency", "spectrum", "Link spectrum frequencies", "boolean", false;
        effect_status = "effective", effect_reason = "",
        visibility_policy = :multiple_spectrum_panes,
        enabled_policy = :compatible_spectrum_panes,
    ),
    signal_settings_field_definition(
        "spectrum.link_magnitude", "spectrum", "Link spectrum magnitudes", "boolean", false;
        effect_status = "effective", effect_reason = "",
        visibility_policy = :multiple_spectrum_panes,
        enabled_policy = :compatible_spectrum_panes,
    ),
    signal_settings_field_definition(
        "spectrogram.time_units", "spectrogram", "Time units", "enum", "seconds";
        options = SIGNAL_TIME_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.frequency_units", "spectrogram", "Frequency units", "enum", "hertz";
        options = SIGNAL_FREQUENCY_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.frequency_limits", "spectrogram", "Frequency limits", "optional_range", nothing;
        units = "Hz", effect_status = "effective", effect_reason = "", enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "spectrogram.power_limits", "spectrogram", "Power limits", "optional_range", nothing;
        units = "dB", effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.frequency_scale", "spectrogram", "Frequency scale", "enum", "linear";
        options = SIGNAL_FREQUENCY_SCALE_OPTIONS, effect_status = "effective_presentation",
        effect_reason = "", enabled_policy = :spectrogram_frequency_scale,
    ),
    signal_settings_field_definition(
        "spectrogram.scale", "spectrogram", "Spectrum in dB", "enum", "db";
        options = SIGNAL_SCALE_OPTIONS, effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.leakage", "spectrogram", "Leakage", "number", 0.5;
        minimum = 0.0, maximum = 1.0, step = 0.01,
        effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.time_resolution", "spectrogram", "Time resolution", "resolution",
        signal_settings_auto_default(:seconds); units = "s", minimum = 0.0,
        effect_status = "blocked_provider", effect_reason = "ENGEE-20260801-003",
        enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "spectrogram.overlap_percent", "spectrogram", "Overlap", "number", 50.0;
        units = "%", minimum = 0.0, maximum = 75.0, step = 1,
        effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "spectrogram.reassign", "spectrogram", "Reassign", "boolean", false;
        effect_status = "blocked_provider", effect_reason = "ENGEE-20260801-004",
    ),
    signal_settings_field_definition(
        "persistence.frequency_units", "persistence", "Frequency units", "enum", "hertz";
        options = SIGNAL_FREQUENCY_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "persistence.frequency_limits", "persistence", "Frequency limits", "optional_range", nothing;
        units = "Hz", effect_status = "blocked_prerequisite", effect_reason = "DEC-20260801-027",
        enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "persistence.power_limits", "persistence", "Power limits", "optional_range", nothing;
        units = "dB",
    ),
    signal_settings_field_definition(
        "persistence.density_limits", "persistence", "Density limits", "optional_range", nothing;
        units = "%", minimum = 0.0, maximum = 100.0,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "persistence.frequency_scale", "persistence", "Frequency scale", "enum", "linear";
        options = SIGNAL_FREQUENCY_SCALE_OPTIONS,
    ),
    signal_settings_field_definition(
        "persistence.scale", "persistence", "Spectrum in dB", "enum", "db";
        options = SIGNAL_SCALE_OPTIONS,
    ),
    signal_settings_field_definition(
        "persistence.leakage", "persistence", "Leakage", "number", 0.5;
        minimum = 0.0, maximum = 1.0, step = 0.01,
        effect_status = "effective", effect_reason = "",
    ),
    signal_settings_field_definition(
        "persistence.time_units", "persistence", "Time units", "enum", "seconds";
        options = SIGNAL_TIME_UNIT_OPTIONS,
        effect_status = "effective_presentation", effect_reason = "",
    ),
    signal_settings_field_definition(
        "persistence.time_resolution", "persistence", "Time resolution", "resolution",
        signal_settings_auto_default(:seconds); units = "s", minimum = 0.0,
        effect_status = "blocked_contract", effect_reason = "milestone_3_contract",
        enabled_policy = :source,
    ),
    signal_settings_field_definition(
        "persistence.overlap_percent", "persistence", "Overlap", "number", 50.0;
        units = "%", minimum = 0.0, maximum = 100.0, step = 1,
        effect_status = "blocked_resource", effect_reason = "DEC-20260801-026",
    ),
    signal_settings_field_definition(
        "persistence.power_bins", "persistence", "Power bins", "power_bins",
        signal_settings_auto_default(:count); minimum = 20, maximum = 1024, step = 1,
    ),
)

const SIGNAL_SETTINGS_CATALOG = SignalSettingsCatalog(
    SIGNAL_SETTINGS_GROUPS,
    SIGNAL_SETTINGS_SECTIONS,
    SIGNAL_SETTINGS_FIELDS,
    SIGNAL_SETTINGS_READOUTS,
)

struct SignalSettingValidationError <: Exception
    display_id::String
    field_id::String
    message::String
end

Base.showerror(io::IO, err::SignalSettingValidationError) = print(io, err.message)

"""Malformed field-update/Apply API input; semantic draft errors use HTTP 200."""
struct SignalSettingApiTypeError <: Exception
    display_id::String
    field_id::String
    message::String
end

Base.showerror(io::IO, err::SignalSettingApiTypeError) = print(io, err.message)

"""Finite but not necessarily ordered range retained until explicit Apply."""
struct SignalSettingDraftRange
    minimum::Union{Nothing,Float64}
    maximum::Union{Nothing,Float64}
end

"""Typed mode/value pair retained without applying semantic bounds early."""
struct SignalSettingDraftResolution
    mode::String
    value_key::Symbol
    value::Union{Nothing,Float64,Int}
end

"""A string-shaped enum draft which is not one of the catalog options."""
struct SignalSettingUnknownEnum
    value::String
end

const SignalSettingDraftValue = Union{
    Nothing,
    String,
    Bool,
    Float64,
    Int,
    SignalTimeUnitPreference,
    SignalFrequencyUnitPreference,
    SignalSpectrumResolutionType,
    SignalSpectrumWindow,
    SignalSpectrumScale,
    SignalSpectrumFrequencyScale,
    SignalSpectrogramFrequencyScale,
    SignalSettingDraftRange,
    SignalSettingDraftResolution,
    SignalSettingUnknownEnum,
}

struct SignalSettingDraftEntry
    field_id::String
    value::SignalSettingDraftValue
end

struct ApplySignalSettingsCommand
    state_revision::Int
    display_id::String
end

mutable struct SignalSettingsDisplayDraft
    entries::Dict{String,SignalSettingDraftEntry}
end

SignalSettingsDisplayDraft() = SignalSettingsDisplayDraft(
    Dict{String,SignalSettingDraftEntry}(),
)

mutable struct SignalSettingsDraftStore
    displays::Dict{String,SignalSettingsDisplayDraft}
end

SignalSettingsDraftStore() = SignalSettingsDraftStore(
    Dict{String,SignalSettingsDisplayDraft}(),
)

"""Application service coordinating typed drafts and atomic explicit Apply."""
mutable struct SignalSettingsService
    catalog::SignalSettingsCatalog
    draft_stores::Dict{UInt,SignalSettingsDraftStore}
end

SignalSettingsService(catalog::SignalSettingsCatalog) = SignalSettingsService(
    catalog,
    Dict{UInt,SignalSettingsDraftStore}(),
)

SignalSettingsService() = SignalSettingsService(SIGNAL_SETTINGS_CATALOG)

signal_settings_wire_value(value::NamedTuple) = Dict(
    string(key) => signal_settings_wire_value(getproperty(value, key)) for key in keys(value)
)
signal_settings_wire_value(value) = value

signal_settings_range_payload(::Nothing) = nothing
signal_settings_range_payload(range::SignalSettingRange) = Dict{String,Any}(
    "min" => range.minimum,
    "max" => range.maximum,
)
signal_settings_range_payload(range::SignalTimeLimits) = Dict{String,Any}(
    "min" => range.min_s,
    "max" => range.max_s,
)
signal_settings_range_payload(range::ExplicitSignalSpectrumFrequencyLimits) = Dict{String,Any}(
    "min" => range.min_hz,
    "max" => range.max_hz,
)
signal_settings_range_payload(::AutomaticSignalSpectrumFrequencyLimits) = nothing
signal_settings_range_payload(range::ExplicitSignalSpectrogramPowerLimits) = Dict{String,Any}(
    "min" => range.min_db,
    "max" => range.max_db,
)
signal_settings_range_payload(::AutomaticSignalSpectrogramPowerLimits) = nothing

signal_settings_mode_name(mode::SignalSettingMode)::String =
    mode == AUTOMATIC_SIGNAL_SETTING ? "auto" : "specified"

function signal_settings_resolution_payload(value::SignalSecondsResolution)::Dict{String,Any}
    Dict{String,Any}("mode" => signal_settings_mode_name(value.mode), "seconds" => value.seconds)
end

function signal_settings_resolution_payload(value::SignalHertzResolution)::Dict{String,Any}
    Dict{String,Any}("mode" => signal_settings_mode_name(value.mode), "hz" => value.hz)
end

function signal_settings_resolution_payload(value::SignalSamplesResolution)::Dict{String,Any}
    Dict{String,Any}("mode" => signal_settings_mode_name(value.mode), "samples" => value.samples)
end

function signal_settings_resolution_payload(value::SignalNfftResolution)::Dict{String,Any}
    Dict{String,Any}("mode" => signal_settings_mode_name(value.mode), "nfft" => value.nfft)
end

function signal_settings_resolution_payload(value::SignalPowerBinsPreference)::Dict{String,Any}
    Dict{String,Any}("mode" => signal_settings_mode_name(value.mode), "count" => value.count)
end

function signal_settings_has_complex_membership(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    member_names = Set(display.membership.signal_names)
    any(signal -> signal.is_complex && signal.name in member_names, state.signals)
end

function signal_settings_has_complex_analysis_source(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    analysis_name = signal_analyser_display_analysis_name(display)
    analysis_name === nothing && return false
    signal_by_name(state, analysis_name).is_complex
end

function signal_settings_time_panes(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Vector{SignalDisplayPaneState}
    layout = signal_analyser_layout_by_display_id(state, display.id)
    SignalDisplayPaneState[pane for pane in layout.panes if pane.plot_type == TIME_PLOT]
end

function signal_analyser_compatible_time_panes(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Vector{SignalDisplayPaneState}
    SignalDisplayPaneState[
        pane for pane in signal_settings_time_panes(state, display)
        if signal_display_pane_analysis_name(pane) !== nothing
    ]
end

function signal_analyser_compatible_time_axis_panes(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Vector{SignalDisplayPaneState}
    layout = signal_analyser_layout_by_display_id(state, display.id)
    SignalDisplayPaneState[
        pane for pane in layout.panes
        if pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
            signal_display_pane_analysis_name(pane) !== nothing
    ]
end

function signal_analyser_compatible_spectrum_panes(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Vector{SignalDisplayPaneState}
    layout = signal_analyser_layout_by_display_id(state, display.id)
    SignalDisplayPaneState[
        pane for pane in layout.panes
        if pane.plot_type in (SPECTRUM_PLOT, PERSISTENCE_PLOT) &&
            signal_display_pane_analysis_name(pane) !== nothing
    ]
end

signal_settings_pane_frequency_units(pane::SignalDisplayPaneState)::SignalFrequencyUnitPreference =
    pane.plot_type == PERSISTENCE_PLOT ?
        pane.stored_settings.persistence.frequency_units :
        pane.stored_settings.spectrum.frequency_units

function signal_settings_pane_frequency_limits(
    pane::SignalDisplayPaneState,
)::AbstractSignalSpectrumFrequencyLimits
    pane.plot_type != PERSISTENCE_PLOT && return pane.spectrum_settings.frequency_limits
    limits = pane.stored_settings.persistence.frequency_limits
    limits === nothing ? AutomaticSignalSpectrumFrequencyLimits() :
        ExplicitSignalSpectrumFrequencyLimits(limits.minimum, limits.maximum)
end

signal_settings_pane_frequency_scale(pane::SignalDisplayPaneState)::SignalSpectrumFrequencyScale =
    pane.plot_type == PERSISTENCE_PLOT ?
        pane.stored_settings.persistence.frequency_scale :
        pane.spectrum_settings.frequency_scale

signal_settings_pane_magnitude_limits(
    pane::SignalDisplayPaneState,
)::Union{Nothing,SignalSettingRange} = pane.plot_type == PERSISTENCE_PLOT ?
    pane.stored_settings.persistence.power_limits : pane.stored_settings.spectrum.y_limits

function signal_settings_frequency_limits_range(
    limits::AbstractSignalSpectrumFrequencyLimits,
)::Union{Nothing,SignalSettingRange}
    limits isa AutomaticSignalSpectrumFrequencyLimits && return nothing
    typed = limits::ExplicitSignalSpectrumFrequencyLimits
    SignalSettingRange(typed.min_hz, typed.max_hz)
end

signal_settings_spectral_magnitude_is_db(pane::SignalDisplayPaneState)::Bool =
    pane.plot_type == SPECTRUM_PLOT ?
        pane.spectrum_settings.scale == DB_SPECTRUM_SCALE :
        pane.plot_type == PERSISTENCE_PLOT &&
            pane.stored_settings.persistence.scale == DB_SPECTRUM_SCALE

function signal_settings_linked_magnitudes_are_db(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    panes = signal_analyser_compatible_spectrum_panes(state, display)
    layout = signal_analyser_layout_by_display_id(state, display.id)
    !isempty(panes) && all(panes) do pane
        pane.id == layout.active_pane_id ?
            (display.active_plot == SPECTRUM_PLOT ?
                display.spectrum_settings.scale == DB_SPECTRUM_SCALE :
                display.active_plot == PERSISTENCE_PLOT &&
                    display.stored_settings.persistence.scale == DB_SPECTRUM_SCALE) :
            signal_settings_spectral_magnitude_is_db(pane)
    end
end

function signal_settings_field_visible(
    definition::SignalSettingsFieldDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    policy = definition.visibility_policy
    policy == :always && return true
    policy == :time && return display.active_plot == TIME_PLOT
    policy == :time_or_spectrogram && return display.active_plot in (TIME_PLOT, SPECTROGRAM_PLOT)
    policy == :spectrum && return display.active_plot == SPECTRUM_PLOT
    policy == :spectrogram && return display.active_plot == SPECTROGRAM_PLOT
    policy == :persistence && return display.active_plot == PERSISTENCE_PLOT
    policy == :multiple_time_panes && return display.active_plot == TIME_PLOT &&
        length(signal_settings_time_panes(state, display)) >= 2
    policy == :multiple_spectrum_panes && return display.active_plot in (
        SPECTRUM_PLOT,
        PERSISTENCE_PLOT,
    ) &&
        length(signal_analyser_compatible_spectrum_panes(state, display)) >= 2
    resolution_type = display.stored_settings.spectrum.resolution_type
    policy == :spectrum_rbw && return display.active_plot == SPECTRUM_PLOT &&
        resolution_type == RBW_SPECTRUM_RESOLUTION
    policy == :spectrum_window_length && return display.active_plot == SPECTRUM_PLOT &&
        resolution_type == WINDOW_LENGTH_SPECTRUM_RESOLUTION
    policy == :spectrum_windowed && return display.active_plot == SPECTRUM_PLOT &&
        resolution_type in (RBW_SPECTRUM_RESOLUTION, WINDOW_LENGTH_SPECTRUM_RESOLUTION)
    false
end

function signal_settings_field_enabled(
    definition::SignalSettingsFieldDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    policy = definition.enabled_policy
    policy == :always && return true
    policy == :source && return signal_analyser_display_analysis_name(display) !== nothing
    policy == :compatible_time_panes && return display.active_plot == TIME_PLOT &&
        signal_analyser_display_analysis_name(display) !== nothing &&
        length(signal_analyser_compatible_time_panes(state, display)) >= 2
    policy == :compatible_spectrum_panes && return display.active_plot in (
        SPECTRUM_PLOT,
        PERSISTENCE_PLOT,
    ) &&
        signal_analyser_display_analysis_name(display) !== nothing &&
        length(signal_analyser_compatible_spectrum_panes(state, display)) >= 2
    policy == :spectrum_frequency_scale && return true
    policy == :spectrogram_frequency_scale && return true
    policy == :sidelobe_attenuation && return display.stored_settings.spectrum.window in (
        CHEBYSHEV_SPECTRUM_WINDOW,
        KAISER_SPECTRUM_WINDOW,
    )
    false
end

function signal_settings_group_visible(
    group::SignalSettingsGroupDefinition,
    display::SignalAnalyserDisplayState,
)::Bool
    group.id == "display" && return true
    group.id == "time" && return display.active_plot == TIME_PLOT
    group.id == "spectrum" && return display.active_plot == SPECTRUM_PLOT
    group.id == "spectrogram" && return display.active_plot == SPECTROGRAM_PLOT
    group.id == "persistence" && return display.active_plot == PERSISTENCE_PLOT
    false
end

function signal_settings_readout_visible(
    readout::SignalSettingsReadoutDefinition,
    display::SignalAnalyserDisplayState,
)::Bool
    group = SIGNAL_SETTINGS_GROUPS[
        findfirst(item -> item.id == readout.group, SIGNAL_SETTINGS_GROUPS)
    ]
    signal_settings_group_visible(group, display)
end

function signal_settings_section_visible(
    service::SignalSettingsService,
    section::SignalSettingsSectionDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    group = service.catalog.groups[
        findfirst(item -> item.id == section.group, service.catalog.groups)
    ]
    signal_settings_group_visible(group, display) || return false
    any(
        definition -> definition.section == section.id &&
            signal_settings_field_visible(definition, state, display),
        service.catalog.fields,
    ) || any(
        readout -> readout.section == section.id &&
            signal_settings_readout_visible(readout, display),
        service.catalog.readouts,
    )
end

function signal_settings_option_disabled(
    definition::SignalSettingsFieldDefinition,
    option::SignalSettingsOptionDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Bool
    option.value == "log" || return false
    definition.id == "spectrum.frequency_scale" &&
        return signal_settings_has_complex_membership(state, display)
    definition.id == "spectrogram.frequency_scale" &&
        return signal_settings_has_complex_analysis_source(state, display)
    false
end

function signal_settings_option_payload(
    definition::SignalSettingsFieldDefinition,
    option::SignalSettingsOptionDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Dict{String,Any}
    Dict{String,Any}(
        "value" => option.value,
        "label" => option.label,
        "disabled" => signal_settings_option_disabled(definition, option, state, display),
    )
end

function signal_settings_warning(definition::SignalSettingsFieldDefinition)::String
    ""
end

function signal_settings_field_value(
    ::SignalSettingsService,
    display::SignalAnalyserDisplayState,
    field_id::AbstractString,
)
    stored = display.stored_settings
    field_id == "display.name" && return display.name
    field_id == "display.show_legend" && return stored.display.show_legend
    field_id == "time.normalize_y" && return stored.time.normalize_y
    field_id == "time.show_markers" && return stored.time.show_markers
    field_id == "time.units" && return SIGNAL_TIME_UNIT_NAMES[stored.time.units]
    if field_id == "time.x_limits"
        limits = display.time_limits
        limits === nothing && return nothing
        factor = signal_seconds_per_time_unit(stored.time.units, limits.max_s)
        return Dict{String,Any}(
            "min" => limits.min_s / factor,
            "max" => limits.max_s / factor,
        )
    end
    field_id == "time.y_limits" && return signal_settings_range_payload(stored.time.y_limits)
    field_id == "time.link_time" && return stored.time.link_time
    field_id == "time.link_amplitude" && return stored.time.link_amplitude
    field_id == "spectrum.frequency_units" &&
        return SIGNAL_FREQUENCY_UNIT_NAMES[stored.spectrum.frequency_units]
    if field_id == "spectrum.frequency_limits"
        limits = display.spectrum_settings.frequency_limits
        limits isa AutomaticSignalSpectrumFrequencyLimits && return nothing
        typed = limits::ExplicitSignalSpectrumFrequencyLimits
        factor = signal_hertz_per_frequency_unit(stored.spectrum.frequency_units)
        return Dict{String,Any}("min" => typed.min_hz / factor, "max" => typed.max_hz / factor)
    end
    field_id == "spectrum.y_limits" && return signal_settings_range_payload(stored.spectrum.y_limits)
    field_id == "spectrum.frequency_scale" &&
        return SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[display.spectrum_settings.frequency_scale]
    field_id == "spectrum.scale" && return SIGNAL_SPECTRUM_SCALE_NAMES[display.spectrum_settings.scale]
    field_id == "spectrum.resolution_type" &&
        return SIGNAL_SPECTRUM_RESOLUTION_TYPE_NAMES[stored.spectrum.resolution_type]
    field_id == "spectrum.leakage" && return display.spectrum_settings.leakage
    field_id == "spectrum.rbw" && return signal_settings_resolution_payload(stored.spectrum.rbw)
    field_id == "spectrum.window_length" &&
        return signal_settings_resolution_payload(stored.spectrum.window_length)
    field_id == "spectrum.window" && return SIGNAL_SPECTRUM_WINDOW_NAMES[stored.spectrum.window]
    field_id == "spectrum.sidelobe_attenuation_db" &&
        return stored.spectrum.sidelobe_attenuation_db
    field_id == "spectrum.overlap_percent" && return stored.spectrum.overlap_percent
    field_id == "spectrum.nfft" && return signal_settings_resolution_payload(stored.spectrum.nfft)
    field_id == "spectrum.link_frequency" && return stored.spectrum.link_frequency
    field_id == "spectrum.link_magnitude" && return stored.spectrum.link_magnitude
    field_id == "spectrogram.time_units" &&
        return SIGNAL_TIME_UNIT_NAMES[stored.spectrogram.time_units]
    field_id == "spectrogram.frequency_units" &&
        return SIGNAL_FREQUENCY_UNIT_NAMES[stored.spectrogram.frequency_units]
    field_id == "spectrogram.frequency_limits" &&
        return signal_settings_range_payload(display.spectrogram_settings.frequency_limits)
    field_id == "spectrogram.power_limits" &&
        return signal_settings_range_payload(display.spectrogram_settings.power_limits)
    field_id == "spectrogram.frequency_scale" &&
        return SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[display.spectrogram_settings.frequency_scale]
    field_id == "spectrogram.scale" && return SIGNAL_SPECTRUM_SCALE_NAMES[stored.spectrogram.scale]
    field_id == "spectrogram.leakage" && return display.spectrogram_settings.leakage
    field_id == "spectrogram.time_resolution" &&
        return signal_settings_resolution_payload(stored.spectrogram.time_resolution)
    field_id == "spectrogram.overlap_percent" && return display.spectrogram_settings.overlap_percent
    field_id == "spectrogram.reassign" && return stored.spectrogram.reassign
    field_id == "persistence.time_units" &&
        return SIGNAL_TIME_UNIT_NAMES[stored.persistence.time_units]
    field_id == "persistence.frequency_units" &&
        return SIGNAL_FREQUENCY_UNIT_NAMES[stored.persistence.frequency_units]
    if field_id == "persistence.frequency_limits"
        limits = stored.persistence.frequency_limits
        limits === nothing && return nothing
        factor = signal_hertz_per_frequency_unit(stored.persistence.frequency_units)
        return Dict{String,Any}(
            "min" => limits.minimum / factor,
            "max" => limits.maximum / factor,
        )
    end
    field_id == "persistence.power_limits" &&
        return signal_settings_range_payload(stored.persistence.power_limits)
    field_id == "persistence.density_limits" &&
        return signal_settings_range_payload(stored.persistence.density_limits)
    field_id == "persistence.frequency_scale" &&
        return SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[stored.persistence.frequency_scale]
    field_id == "persistence.scale" && return SIGNAL_SPECTRUM_SCALE_NAMES[stored.persistence.scale]
    field_id == "persistence.leakage" && return display.persistence_settings.leakage
    field_id == "persistence.time_resolution" &&
        return signal_settings_resolution_payload(stored.persistence.time_resolution)
    field_id == "persistence.overlap_percent" && return stored.persistence.overlap_percent
    field_id == "persistence.power_bins" &&
        return signal_settings_resolution_payload(stored.persistence.power_bins)
    throw(ArgumentError("Неизвестный settings field: $field_id"))
end

function signal_settings_field_value(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    field_id::AbstractString,
)
    if field_id == "pane.name"
        layout = signal_analyser_layout_by_display_id(state, display.id)
        return signal_display_active_pane(layout).name
    elseif field_id == "time.x_limits"
        limits = display.time_limits
        full = signal_settings_full_time_range(state, display)
        if display.stored_settings.time.link_time
            layout = signal_analyser_layout_by_display_id(state, display.id)
            source = signal_settings_screen_source_pane(layout, (TIME_PLOT, SPECTROGRAM_PLOT))
            if source !== nothing
                limits = signal_settings_screen_time_limits(
                    state,
                    display,
                    source::SignalDisplayPaneState,
                )
            end
        end
        return signal_settings_time_limits_wire_value(
            limits,
            full,
            display.stored_settings.time.units,
        )
    end
    signal_settings_field_value(service, display, field_id)
end

function signal_settings_field_payload(
    service::SignalSettingsService,
    definition::SignalSettingsFieldDefinition,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Dict{String,Any}
    unsupported_secondary_roi = definition.id == "time.x_limits" &&
        display.active_plot == PERSISTENCE_PLOT
    Dict{String,Any}(
        "id" => definition.id,
        "group" => definition.group,
        "section" => definition.section,
        "label" => definition.label,
        "kind" => definition.kind,
        "control_kind" => definition.control_kind,
        "value" => signal_settings_field_value(service, state, display, definition.id),
        "default" => signal_settings_wire_value(definition.default_value),
        "units" => definition.id == "time.x_limits" ? signal_settings_time_unit_label(
            display.stored_settings.time.units,
            display.time_limits === nothing ? 1.0 : display.time_limits.max_s,
        ) : definition.id == "spectrum.frequency_limits" ?
            signal_settings_frequency_unit_label(display.stored_settings.spectrum.frequency_units) :
            definition.id == "persistence.frequency_limits" ?
                signal_settings_frequency_unit_label(
                    display.stored_settings.persistence.frequency_units,
                ) : definition.units,
        "min" => definition.minimum,
        "max" => definition.maximum,
        "step" => definition.step,
        "options" => Dict{String,Any}[
            signal_settings_option_payload(definition, option, state, display)
            for option in definition.options
        ],
        "checked_value" => definition.checked_value,
        "unchecked_value" => definition.unchecked_value,
        "visible" => signal_settings_field_visible(definition, state, display),
        "enabled" => !unsupported_secondary_roi &&
            signal_settings_field_enabled(definition, state, display),
        "effect_status" => unsupported_secondary_roi ?
            "blocked_contract" : definition.effect_status,
        "effect_reason" => unsupported_secondary_roi ?
            "milestone_3_contract" : definition.effect_reason,
        "error" => "",
        "warning" => signal_settings_warning(definition),
    )
end


function signal_settings_readout_payload(
    readout::SignalSettingsReadoutDefinition,
    display::SignalAnalyserDisplayState,
)::Dict{String,Any}
    Dict{String,Any}(
        "id" => readout.id,
        "group" => readout.group,
        "section" => readout.section,
        "label" => readout.label,
        "value" => nothing,
        "units" => readout.units,
        "status" => readout.status,
        "reason" => readout.reason,
        "visible" => signal_settings_readout_visible(readout, display),
    )
end

function signal_settings_document_unlocked(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Dict{String,Any}
    projected_display, field_errors = signal_settings_draft_projection_unlocked(
        service,
        state,
        display,
    )
    fields = Dict{String,Any}[
        signal_settings_field_payload(service, definition, state, projected_display)
        for definition in service.catalog.fields
    ]
    draft = signal_settings_display_draft_unlocked(service, state, display.id; create = false)
    if draft !== nothing
        for field in fields
            field_id = String(field["id"])
            entry = get((draft::SignalSettingsDisplayDraft).entries, field_id, nothing)
            entry === nothing || (field["value"] = signal_settings_draft_wire_value(
                (entry::SignalSettingDraftEntry).value,
            ))
            field["error"] = get(field_errors, field_id, "")
        end
    end
    layout = signal_analyser_layout_by_display_id(state, display.id)
    active_pane = signal_display_active_pane(layout)
    time_source = if active_pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
        signal_display_pane_analysis_name(active_pane) !== nothing
        active_pane
    else
        index = findfirst(
            pane -> pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
                signal_display_pane_analysis_name(pane) !== nothing,
            layout.panes,
        )
        index === nothing ? active_pane : layout.panes[index]
    end
    amplitude_index = findfirst(
        pane -> pane.plot_type == TIME_PLOT && signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    amplitude_source = amplitude_index === nothing ? time_source : layout.panes[amplitude_index]
    spectrum_index = findfirst(
        pane -> pane.plot_type in (SPECTRUM_PLOT, PERSISTENCE_PLOT) &&
            signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    spectrum_source = active_pane.plot_type in (SPECTRUM_PLOT, PERSISTENCE_PLOT) &&
        signal_display_pane_analysis_name(active_pane) !== nothing ? active_pane :
        spectrum_index === nothing ? active_pane : layout.panes[spectrum_index]
    screen_time_unit = time_source.plot_type == SPECTROGRAM_PLOT ?
        time_source.stored_settings.spectrogram.time_units :
        time_source.stored_settings.time.units
    if draft !== nothing
        unit_entry = get((draft::SignalSettingsDisplayDraft).entries, "time.units", nothing)
        unit_entry === nothing || (unit_entry.value isa SignalTimeUnitPreference &&
            (screen_time_unit = unit_entry.value))
    end
    screen_runtime_time_limits = signal_settings_screen_time_limits(
        state,
        projected_display,
        time_source,
    )
    screen_full_time_limits = projected_display.stored_settings.time.link_time ?
        signal_settings_full_time_range(state, projected_display) :
        signal_settings_full_time_range(state, SignalDisplayPaneState[time_source])
    screen_time_limits = signal_settings_time_limits_wire_value(
        screen_runtime_time_limits,
        screen_full_time_limits,
        screen_time_unit,
    )
    screen_frequency_unit = signal_settings_pane_frequency_units(spectrum_source)
    if draft !== nothing
        entry = get((draft::SignalSettingsDisplayDraft).entries, "spectrum.frequency_units", nothing)
        entry === nothing || (entry.value isa SignalFrequencyUnitPreference &&
            (screen_frequency_unit = entry.value))
    end
    screen_frequency_factor = signal_hertz_per_frequency_unit(screen_frequency_unit)
    screen_frequency_limits = signal_settings_pane_frequency_limits(spectrum_source)
    projected_frequency_limits = screen_frequency_limits isa ExplicitSignalSpectrumFrequencyLimits ?
        Dict{String,Any}(
            "min" => (screen_frequency_limits::ExplicitSignalSpectrumFrequencyLimits).min_hz /
                screen_frequency_factor,
            "max" => (screen_frequency_limits::ExplicitSignalSpectrumFrequencyLimits).max_hz /
                screen_frequency_factor,
        ) : nothing
    screen_values = Dict{String,Any}(
        "time.link_time" => projected_display.stored_settings.time.link_time,
        "time.link_amplitude" => projected_display.stored_settings.time.link_amplitude,
        "time.units" => SIGNAL_TIME_UNIT_NAMES[screen_time_unit],
        "time.x_limits" => screen_time_limits,
        "time.y_limits" => signal_settings_range_payload(amplitude_source.stored_settings.time.y_limits),
        "spectrum.link_frequency" => projected_display.stored_settings.spectrum.link_frequency,
        "spectrum.link_magnitude" => projected_display.stored_settings.spectrum.link_magnitude,
        "spectrum.frequency_units" => SIGNAL_FREQUENCY_UNIT_NAMES[screen_frequency_unit],
        "spectrum.frequency_limits" => projected_frequency_limits,
        "spectrum.frequency_scale" => SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[
            signal_settings_pane_frequency_scale(spectrum_source)
        ],
        "spectrum.y_limits" => signal_settings_range_payload(
            signal_settings_pane_magnitude_limits(spectrum_source),
        ),
    )
    if draft !== nothing
        for field_id in keys(screen_values)
            entry = get((draft::SignalSettingsDisplayDraft).entries, field_id, nothing)
            entry === nothing || (screen_values[field_id] = signal_settings_draft_wire_value(
                (entry::SignalSettingDraftEntry).value,
            ))
        end
    end
    Dict{String,Any}(
        "state_revision" => state.view.state_revision,
        "display_id" => display.id,
        "groups" => Dict{String,Any}[
            Dict{String,Any}(
                "id" => group.id,
                "label" => group.label,
                "visible" => signal_settings_group_visible(group, display),
            ) for group in service.catalog.groups
        ],
        "sections" => Dict{String,Any}[
            Dict{String,Any}(
                "id" => section.id,
                "group" => section.group,
                "label" => section.label,
                "order" => section.order,
                "visible" => signal_settings_section_visible(
                    service,
                    section,
                    state,
                    display,
                ),
            ) for section in service.catalog.sections
        ],
        "fields" => fields,
        "readouts" => Dict{String,Any}[
            signal_settings_readout_payload(readout, projected_display)
            for readout in service.catalog.readouts
        ],
        "screen" => screen_values,
    )
end

function signal_settings_document(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display_id::AbstractString,
)::Dict{String,Any}
    lock(state.lock) do
        signal_analyser_recover_membership_order_unlocked!(
            state;
            display_ids = String[String(display_id)],
        )
        signal_analyser_recover_time_limits_unlocked!(
            state;
            display_ids = String[String(display_id)],
        )
        display = try
            signal_analyser_display_by_id(state, display_id)
        catch err
            err isa ArgumentError || rethrow()
            throw(SignalAnalyserValidationError(
                "Некорректный запрос Settings",
                Dict("display_id" => "Неизвестный идентификатор Display"),
            ))
        end
        signal_settings_document_unlocked(service, state, display)
    end
end

signal_setting_validation_error(
    display_id::AbstractString,
    field_id::AbstractString,
    message::AbstractString,
) = SignalSettingValidationError(String(display_id), String(field_id), String(message))

"""Keep domain-construction failures inside the field validation contract."""
function signal_settings_semantic_validation_error(
    display_id::AbstractString,
    field_id::AbstractString,
    err::ArgumentError,
)::SignalSettingValidationError
    rendered = sprint(showerror, err)
    prefix = "ArgumentError: "
    message = startswith(rendered, prefix) ? rendered[(length(prefix) + 1):end] : rendered
    signal_setting_validation_error(display_id, field_id, message)
end

function signal_settings_parse_real(
    display_id::String,
    field_id::String,
    value,
)::Float64
    value isa Real && !(value isa Bool) || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется число, но не Bool",
    ))
    parsed = try
        Float64(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_setting_validation_error(display_id, field_id, "Число вне диапазона Float64"))
    end
    isfinite(parsed) || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется конечное число",
    ))
    parsed == 0.0 ? 0.0 : parsed
end

function signal_settings_parse_integer(
    display_id::String,
    field_id::String,
    value,
)::Int
    value isa Integer && !(value isa Bool) || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется integer, но не Bool",
    ))
    try
        Int(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_setting_validation_error(display_id, field_id, "Integer вне диапазона Int"))
    end
end

function signal_settings_parse_enum(
    display_id::String,
    field_id::String,
    value,
    values_by_name::AbstractDict,
)
    value isa AbstractString || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется строковое enum-значение",
    ))
    key = String(value)
    haskey(values_by_name, key) || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Допустимо: $(join(sort!(collect(keys(values_by_name))), ", "))",
    ))
    values_by_name[key]
end

function signal_settings_parse_optional_range(
    display_id::String,
    field_id::String,
    value,
)::Union{Nothing,SignalSettingRange}
    value === nothing && return nothing
    value isa AbstractDict || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется null или объект {min, max}",
    ))
    signal_analyser_payload_keys(value) == Set(["min", "max"]) || throw(
        signal_setting_validation_error(
            display_id,
            field_id,
            "Range должен содержать только min и max",
        ),
    )
    minimum = signal_settings_parse_real(
        display_id,
        field_id,
        signal_analyser_payload_value(value, "min"),
    )
    maximum = signal_settings_parse_real(
        display_id,
        field_id,
        signal_analyser_payload_value(value, "max"),
    )
    minimum < maximum || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Минимум должен быть меньше максимума",
    ))
    SignalSettingRange(minimum, maximum)
end

function signal_settings_parse_mode_object(
    display_id::String,
    field_id::String,
    value,
    value_key::String,
)::Tuple{SignalSettingMode,Any}
    value isa AbstractDict || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Требуется объект {mode, $value_key}",
    ))
    signal_analyser_payload_keys(value) == Set(["mode", value_key]) || throw(
        signal_setting_validation_error(
            display_id,
            field_id,
            "Значение должно содержать только mode и $value_key",
        ),
    )
    mode_value = signal_analyser_payload_value(value, "mode")
    mode_value isa AbstractString && String(mode_value) in ("auto", "specified") || throw(
        signal_setting_validation_error(
            display_id,
            field_id,
            "Mode должен быть auto или specified",
        ),
    )
    mode = String(mode_value) == "auto" ? AUTOMATIC_SIGNAL_SETTING : SPECIFIED_SIGNAL_SETTING
    requested = signal_analyser_payload_value(value, value_key)
    if mode == AUTOMATIC_SIGNAL_SETTING
        requested === nothing || throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Auto mode требует $value_key=null",
        ))
    elseif requested === nothing
        throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Specified mode требует $value_key",
        ))
    end
    mode, requested
end

function signal_settings_parse_seconds_resolution(
    display_id::String,
    field_id::String,
    value,
)::SignalSecondsResolution
    mode, requested = signal_settings_parse_mode_object(display_id, field_id, value, "seconds")
    mode == AUTOMATIC_SIGNAL_SETTING && return SignalSecondsResolution()
    seconds = signal_settings_parse_real(display_id, field_id, requested)
    seconds > 0 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Specified seconds должны быть больше 0",
    ))
    SignalSecondsResolution(mode, seconds)
end

function signal_settings_parse_hertz_resolution(
    display_id::String,
    field_id::String,
    value,
)::SignalHertzResolution
    mode, requested = signal_settings_parse_mode_object(display_id, field_id, value, "hz")
    mode == AUTOMATIC_SIGNAL_SETTING && return SignalHertzResolution()
    hz = signal_settings_parse_real(display_id, field_id, requested)
    hz > 0 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Specified hz должны быть больше 0",
    ))
    SignalHertzResolution(mode, hz)
end

function signal_settings_parse_samples_resolution(
    display_id::String,
    field_id::String,
    value,
)::SignalSamplesResolution
    mode, requested = signal_settings_parse_mode_object(display_id, field_id, value, "samples")
    mode == AUTOMATIC_SIGNAL_SETTING && return SignalSamplesResolution()
    samples = signal_settings_parse_integer(display_id, field_id, requested)
    samples >= 2 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Specified samples должны быть не меньше 2",
    ))
    SignalSamplesResolution(mode, samples)
end

function signal_settings_parse_nfft_resolution(
    display_id::String,
    field_id::String,
    value,
)::SignalNfftResolution
    mode, requested = signal_settings_parse_mode_object(display_id, field_id, value, "nfft")
    mode == AUTOMATIC_SIGNAL_SETTING && return SignalNfftResolution()
    nfft = signal_settings_parse_integer(display_id, field_id, requested)
    nfft >= 2 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Specified nfft должен быть не меньше 2",
    ))
    SignalNfftResolution(mode, nfft)
end

function signal_settings_parse_power_bins(
    display_id::String,
    field_id::String,
    value,
)::SignalPowerBinsPreference
    mode, requested = signal_settings_parse_mode_object(display_id, field_id, value, "count")
    mode == AUTOMATIC_SIGNAL_SETTING && return SignalPowerBinsPreference()
    count = signal_settings_parse_integer(display_id, field_id, requested)
    20 <= count <= 1024 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Specified count должен быть целым числом от 20 до 1024",
    ))
    SignalPowerBinsPreference(mode, count)
end

function signal_settings_parse_field_value(
    definition::SignalSettingsFieldDefinition,
    display_id::String,
    field_id::String,
    value,
)
    if definition.kind == "text"
        value isa AbstractString || throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Требуется строка",
        ))
        text = strip(String(value))
        isempty(text) && throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Имя не может быть пустым",
        ))
        ncodeunits(text) <= 128 || throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Имя не может быть длиннее 128 байт",
        ))
        return text
    elseif definition.kind == "boolean"
        value isa Bool || throw(signal_setting_validation_error(
            display_id,
            field_id,
            "Требуется boolean",
        ))
        return value
    elseif definition.kind == "optional_range"
        return signal_settings_parse_optional_range(display_id, field_id, value)
    elseif definition.kind == "number"
        number = signal_settings_parse_real(display_id, field_id, value)
        definition.minimum === nothing || number >= definition.minimum || throw(
            signal_setting_validation_error(display_id, field_id, "Значение меньше допустимого минимума"),
        )
        if definition.maximum !== nothing
            upper_exclusive = field_id in (
                "spectrum.overlap_percent",
                "persistence.overlap_percent",
            )
            valid = upper_exclusive ? number < definition.maximum : number <= definition.maximum
            valid || throw(signal_setting_validation_error(
                display_id,
                field_id,
                upper_exclusive ?
                    "Значение должно быть меньше допустимого максимума" :
                    "Значение больше допустимого максимума",
            ))
        end
        return number
    elseif definition.kind == "power_bins"
        return signal_settings_parse_power_bins(display_id, field_id, value)
    elseif definition.kind == "resolution"
        field_id == "spectrum.rbw" &&
            return signal_settings_parse_hertz_resolution(display_id, field_id, value)
        field_id == "spectrum.window_length" &&
            return signal_settings_parse_samples_resolution(display_id, field_id, value)
        field_id == "spectrum.nfft" &&
            return signal_settings_parse_nfft_resolution(display_id, field_id, value)
        return signal_settings_parse_seconds_resolution(display_id, field_id, value)
    end

    field_id in ("time.units", "spectrogram.time_units", "persistence.time_units") &&
        return signal_settings_parse_enum(display_id, field_id, value, SIGNAL_TIME_UNITS_BY_NAME)
    field_id in (
        "spectrum.frequency_units",
        "spectrogram.frequency_units",
        "persistence.frequency_units",
    ) && return signal_settings_parse_enum(
        display_id,
        field_id,
        value,
        SIGNAL_FREQUENCY_UNITS_BY_NAME,
    )
    field_id == "spectrum.resolution_type" && return signal_settings_parse_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTRUM_RESOLUTION_TYPES_BY_NAME,
    )
    field_id == "spectrum.window" && return signal_settings_parse_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTRUM_WINDOWS_BY_NAME,
    )
    field_id in ("spectrum.scale", "spectrogram.scale", "persistence.scale") &&
        return signal_settings_parse_enum(display_id, field_id, value, SIGNAL_SPECTRUM_SCALES_BY_NAME)
    field_id in ("spectrum.frequency_scale", "persistence.frequency_scale") &&
        return signal_settings_parse_enum(
            display_id,
            field_id,
            value,
            SIGNAL_SPECTRUM_FREQUENCY_SCALES_BY_NAME,
        )
    field_id == "spectrogram.frequency_scale" && return signal_settings_parse_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTROGRAM_FREQUENCY_SCALES_BY_NAME,
    )
    throw(signal_setting_validation_error(display_id, field_id, "Неподдерживаемый kind поля"))
end

signal_setting_api_type_error(
    display_id::AbstractString,
    field_id::AbstractString,
    message::AbstractString,
) = SignalSettingApiTypeError(String(display_id), String(field_id), String(message))

signal_settings_draft_wire_value(value::Nothing) = nothing
signal_settings_draft_wire_value(value::String) = value
signal_settings_draft_wire_value(value::Bool) = value
signal_settings_draft_wire_value(value::Float64) = value
signal_settings_draft_wire_value(value::Int) = value
signal_settings_draft_wire_value(value::SignalTimeUnitPreference) = SIGNAL_TIME_UNIT_NAMES[value]
signal_settings_draft_wire_value(value::SignalFrequencyUnitPreference) = SIGNAL_FREQUENCY_UNIT_NAMES[value]
signal_settings_draft_wire_value(value::SignalSpectrumResolutionType) =
    SIGNAL_SPECTRUM_RESOLUTION_TYPE_NAMES[value]
signal_settings_draft_wire_value(value::SignalSpectrumWindow) = SIGNAL_SPECTRUM_WINDOW_NAMES[value]
signal_settings_draft_wire_value(value::SignalSpectrumScale) = SIGNAL_SPECTRUM_SCALE_NAMES[value]
signal_settings_draft_wire_value(value::SignalSpectrumFrequencyScale) =
    SIGNAL_SPECTRUM_FREQUENCY_SCALE_NAMES[value]
signal_settings_draft_wire_value(value::SignalSpectrogramFrequencyScale) =
    SIGNAL_SPECTROGRAM_FREQUENCY_SCALE_NAMES[value]
signal_settings_draft_wire_value(value::SignalSettingUnknownEnum) = value.value
signal_settings_draft_wire_value(value::SignalSettingDraftRange) = Dict{String,Any}(
    "min" => value.minimum,
    "max" => value.maximum,
)
signal_settings_draft_wire_value(value::SignalSettingDraftResolution) = Dict{String,Any}(
    "mode" => value.mode,
    String(value.value_key) => value.value,
)

function signal_settings_parse_draft_real(
    display_id::String,
    field_id::String,
    value,
)::Float64
    value isa Real && !(value isa Bool) || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется JSON number, но не Bool",
    ))
    parsed = try
        Float64(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_setting_api_type_error(display_id, field_id, "Число вне диапазона Float64"))
    end
    isfinite(parsed) || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется конечное JSON number",
    ))
    parsed == 0.0 ? 0.0 : parsed
end

function signal_settings_parse_draft_integer(
    display_id::String,
    field_id::String,
    value,
)::Int
    value isa Integer && !(value isa Bool) || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется JSON integer, но не Bool",
    ))
    try
        Int(value)
    catch err
        (err isa InexactError || err isa OverflowError) || rethrow()
        throw(signal_setting_api_type_error(display_id, field_id, "Integer вне диапазона Int"))
    end
end

function signal_settings_parse_draft_range(
    display_id::String,
    field_id::String,
    value,
)::Union{Nothing,SignalSettingDraftRange}
    value === nothing && return nothing
    value isa AbstractDict || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется null или объект {min, max}",
    ))
    signal_analyser_payload_keys(value) == Set(["min", "max"]) || throw(
        signal_setting_api_type_error(
            display_id,
            field_id,
            "Range должен содержать только min и max",
        ),
    )
    minimum_value = signal_analyser_payload_value(value, "min")
    maximum_value = signal_analyser_payload_value(value, "max")
    minimum = minimum_value === nothing ? nothing : signal_settings_parse_draft_real(
        display_id, field_id, minimum_value,
    )
    maximum = maximum_value === nothing ? nothing : signal_settings_parse_draft_real(
        display_id, field_id, maximum_value,
    )
    minimum === nothing && maximum === nothing && return nothing
    SignalSettingDraftRange(minimum, maximum)
end

function signal_settings_parse_draft_resolution(
    display_id::String,
    field_id::String,
    value,
    value_key::Symbol,
    integer_value::Bool,
)::SignalSettingDraftResolution
    value isa AbstractDict || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется объект {mode, $(String(value_key))}",
    ))
    expected = Set(["mode", String(value_key)])
    signal_analyser_payload_keys(value) == expected || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Значение должно содержать только mode и $(String(value_key))",
    ))
    mode_value = signal_analyser_payload_value(value, "mode")
    mode_value isa AbstractString || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Mode должен быть строкой",
    ))
    requested = signal_analyser_payload_value(value, String(value_key))
    typed_value = requested === nothing ? nothing : integer_value ?
        signal_settings_parse_draft_integer(display_id, field_id, requested) :
        signal_settings_parse_draft_real(display_id, field_id, requested)
    SignalSettingDraftResolution(String(mode_value), value_key, typed_value)
end

function signal_settings_parse_draft_enum(
    display_id::String,
    field_id::String,
    value,
    values_by_name::AbstractDict,
)::SignalSettingDraftValue
    value isa AbstractString || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Требуется строковое enum-значение",
    ))
    key = String(value)
    get(values_by_name, key, SignalSettingUnknownEnum(key))
end

function signal_settings_parse_draft_field_value(
    definition::SignalSettingsFieldDefinition,
    display_id::String,
    field_id::String,
    value,
)::SignalSettingDraftValue
    if definition.kind == "text"
        value isa AbstractString || throw(signal_setting_api_type_error(
            display_id,
            field_id,
            "Требуется строка",
        ))
        return String(value)
    elseif definition.kind == "boolean"
        value isa Bool || throw(signal_setting_api_type_error(
            display_id,
            field_id,
            "Требуется boolean",
        ))
        return value
    elseif definition.kind == "optional_range"
        return signal_settings_parse_draft_range(display_id, field_id, value)
    elseif definition.kind == "number"
        return signal_settings_parse_draft_real(display_id, field_id, value)
    elseif definition.kind == "integer"
        return signal_settings_parse_draft_integer(display_id, field_id, value)
    elseif definition.kind == "power_bins"
        return signal_settings_parse_draft_resolution(
            display_id,
            field_id,
            value,
            :count,
            true,
        )
    elseif definition.kind == "resolution"
        value_key = field_id == "spectrum.rbw" ? :hz :
            field_id == "spectrum.window_length" ? :samples :
            field_id == "spectrum.nfft" ? :nfft : :seconds
        return signal_settings_parse_draft_resolution(
            display_id,
            field_id,
            value,
            value_key,
            value_key in (:samples, :nfft),
        )
    end

    field_id in ("time.units", "spectrogram.time_units", "persistence.time_units") &&
        return signal_settings_parse_draft_enum(
            display_id,
            field_id,
            value,
            SIGNAL_TIME_UNITS_BY_NAME,
        )
    field_id in (
        "spectrum.frequency_units",
        "spectrogram.frequency_units",
        "persistence.frequency_units",
    ) && return signal_settings_parse_draft_enum(
        display_id,
        field_id,
        value,
        SIGNAL_FREQUENCY_UNITS_BY_NAME,
    )
    field_id == "spectrum.resolution_type" && return signal_settings_parse_draft_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTRUM_RESOLUTION_TYPES_BY_NAME,
    )
    field_id == "spectrum.window" && return signal_settings_parse_draft_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTRUM_WINDOWS_BY_NAME,
    )
    field_id in ("spectrum.scale", "spectrogram.scale", "persistence.scale") &&
        return signal_settings_parse_draft_enum(
            display_id,
            field_id,
            value,
            SIGNAL_SPECTRUM_SCALES_BY_NAME,
        )
    field_id in ("spectrum.frequency_scale", "persistence.frequency_scale") &&
        return signal_settings_parse_draft_enum(
            display_id,
            field_id,
            value,
            SIGNAL_SPECTRUM_FREQUENCY_SCALES_BY_NAME,
        )
    field_id == "spectrogram.frequency_scale" && return signal_settings_parse_draft_enum(
        display_id,
        field_id,
        value,
        SIGNAL_SPECTROGRAM_FREQUENCY_SCALES_BY_NAME,
    )
    throw(signal_setting_api_type_error(display_id, field_id, "Неподдерживаемый kind поля"))
end

function signal_settings_validate_typed_value!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    field_id::String,
    value,
)
    analysis_name = signal_analyser_display_analysis_name(display)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)

    if field_id == "time.x_limits"
        if value !== nothing
            limits = SignalTimeLimits(value.minimum, value.maximum)
            if !display.stored_settings.time.link_time
                signal === nothing && throw(signal_setting_validation_error(
                    display.id, field_id, "Явный интервал требует analysis source",
                ))
                limits.max_s <= signal_duration_s(signal) &&
                    signal_time_limits_are_valid(state.measurements_service, signal, limits) || throw(
                    signal_setting_validation_error(
                        display.id,
                        field_id,
                        "Интервал должен содержать хотя бы один отсчёт и лежать в домене source",
                    ),
                )
            end
        end
    elseif field_id == "time.link_time" && value &&
        length(signal_analyser_compatible_time_axis_panes(state, display)) < 2
        throw(signal_setting_validation_error(display.id, field_id,
            "Связь времени требует как минимум две области с временной осью в одном экране"))
    elseif field_id == "time.link_amplitude" && value &&
        length(signal_analyser_compatible_time_panes(state, display)) < 2
        throw(signal_setting_validation_error(display.id, field_id,
            "Связь амплитуды требует как минимум два временных графика в одном экране"))
    elseif field_id == "spectrum.link_frequency" && value &&
        length(signal_analyser_compatible_spectrum_panes(state, display)) < 2
        throw(signal_setting_validation_error(display.id, field_id,
            "Связь частот требует как минимум две совместимые спектральные области в одном экране"))
    elseif field_id == "spectrum.link_frequency" && value
        limits = if display.active_plot == PERSISTENCE_PLOT
            stored_limits = display.stored_settings.persistence.frequency_limits
            stored_limits === nothing ? AutomaticSignalSpectrumFrequencyLimits() :
                ExplicitSignalSpectrumFrequencyLimits(
                    stored_limits.minimum,
                    stored_limits.maximum,
                )
        else
            display.spectrum_settings.frequency_limits
        end
        if limits isa ExplicitSignalSpectrumFrequencyLimits
            domain = signal_settings_full_frequency_range(state, display; linked = true)
            typed = limits::ExplicitSignalSpectrumFrequencyLimits
            typed.min_hz >= domain.minimum && typed.max_hz <= domain.maximum || throw(
                signal_setting_validation_error(
                    display.id,
                    field_id,
                    "Текущий интервал должен лежать в общем домене [$(domain.minimum), $(domain.maximum)] Hz",
                ),
            )
        end
    elseif field_id == "spectrum.link_magnitude" && value &&
        length(signal_analyser_compatible_spectrum_panes(state, display)) < 2
        throw(signal_setting_validation_error(display.id, field_id,
            "Связь магнитуд требует как минимум две совместимые спектральные области в одном экране"))
    elseif field_id == "spectrum.link_magnitude" && value &&
        !signal_settings_linked_magnitudes_are_db(state, display)
        throw(signal_setting_validation_error(display.id, field_id,
            "Связь магнитуд доступна только для областей с мощностью в dB"))
    elseif field_id in ("spectrum.scale", "persistence.scale") &&
        display.stored_settings.spectrum.link_magnitude && value != DB_SPECTRUM_SCALE
        throw(signal_setting_validation_error(display.id, field_id,
            "При связанной магнитуде мощность должна отображаться в dB"))
    elseif field_id in ("spectrum.frequency_limits", "spectrogram.frequency_limits")
        if value !== nothing
            signal === nothing && throw(signal_setting_validation_error(
                display.id, field_id, "Явный интервал требует analysis source",
            ))
            limits = ExplicitSignalSpectrumFrequencyLimits(value.minimum, value.maximum)
            if field_id == "spectrum.frequency_limits" &&
                display.stored_settings.spectrum.link_frequency
                domain = signal_settings_full_frequency_range(state, display)
                limits.min_hz >= domain.minimum && limits.max_hz <= domain.maximum || throw(
                    signal_setting_validation_error(
                        display.id,
                        field_id,
                        "Интервал должен лежать в общем домене [$(domain.minimum), $(domain.maximum)] Hz",
                    ),
                )
                return nothing
            end
            signal_spectrum_frequency_limits_valid_for_signal(limits, signal) || begin
                domain = signal_spectrum_topology_limits(signal)
                throw(signal_setting_validation_error(
                    display.id,
                    field_id,
                    "Интервал должен лежать в [$(domain.min_hz), $(domain.max_hz)] Hz",
                ))
            end
        end
    elseif field_id == "persistence.frequency_limits" && value !== nothing
        signal === nothing && throw(signal_setting_validation_error(
            display.id, field_id, "Явный интервал требует analysis source",
        ))
        limits = ExplicitSignalSpectrumFrequencyLimits(value.minimum, value.maximum)
        if display.stored_settings.spectrum.link_frequency
            domain = signal_settings_full_frequency_range(state, display)
            limits.min_hz >= domain.minimum && limits.max_hz <= domain.maximum || throw(
                signal_setting_validation_error(
                    display.id,
                    field_id,
                    "Интервал должен лежать в общем домене [$(domain.minimum), $(domain.maximum)] Hz",
                ),
            )
            return nothing
        end
        signal_spectrum_frequency_limits_valid_for_signal(limits, signal) || begin
            domain = signal_spectrum_topology_limits(signal)
            throw(signal_setting_validation_error(
                display.id,
                field_id,
                "Интервал должен лежать в [$(domain.min_hz), $(domain.max_hz)] Hz",
            ))
        end
    elseif field_id == "persistence.density_limits" && value !== nothing
        0.0 <= value.minimum < value.maximum <= 100.0 || throw(
            signal_setting_validation_error(
                display.id,
                field_id,
                "Density Limits должны лежать внутри 0–100 процентов",
            ),
        )
    elseif field_id == "spectrum.frequency_scale" &&
        value == LOG_SPECTRUM_FREQUENCY_SCALE &&
        signal_settings_has_complex_membership(state, display)
        throw(signal_setting_validation_error(
            display.id,
            field_id,
            "Log frequency scale недоступна для Display с комплексным сигналом",
        ))
    elseif field_id == "spectrogram.time_resolution" &&
        value.mode == SPECIFIED_SIGNAL_SETTING
        signal === nothing && throw(signal_setting_validation_error(
            display.id, field_id, "Specified time resolution требует analysis source",
        ))
        value.seconds <= signal_duration_s(signal) || throw(signal_setting_validation_error(
            display.id,
            field_id,
            "Time resolution не должна превышать duration analysis source",
        ))
    elseif field_id == "persistence.time_resolution" &&
        value.mode == SPECIFIED_SIGNAL_SETTING && signal === nothing
        throw(signal_setting_validation_error(
            display.id, field_id, "Specified time resolution требует analysis source",
        ))
    elseif field_id == "spectrum.sidelobe_attenuation_db"
        window = display.stored_settings.spectrum.window
        window in (CHEBYSHEV_SPECTRUM_WINDOW, KAISER_SPECTRUM_WINDOW) || throw(
            signal_setting_validation_error(
                display.id,
                field_id,
                "Sidelobe attenuation readonly для выбранного Window",
            ),
        )
        window == CHEBYSHEV_SPECTRUM_WINDOW && value < 45 && throw(
            signal_setting_validation_error(display.id, field_id, "Chebyshev требует не меньше 45 dB"),
        )
        window == KAISER_SPECTRUM_WINDOW && value < 21 && throw(
            signal_setting_validation_error(display.id, field_id, "Kaiser требует не меньше 21 dB"),
        )
    end
    nothing
end

function parse_signal_setting_command(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    data,
)::UpdateSignalSettingCommand
    data isa AbstractDict || throw(signal_setting_validation_error(
        "",
        "",
        "Тело запроса должно быть JSON-объектом",
    ))
    display_value = signal_analyser_payload_value(data, "display_id")
    display_id = display_value isa AbstractString ? String(display_value) : ""
    field_value = signal_analyser_payload_value(data, "field_id")
    field_id = field_value isa AbstractString ? String(field_value) : ""

    signal_analyser_payload_keys(data) == SIGNAL_SETTINGS_UPDATE_FIELDS || throw(
        signal_setting_validation_error(
            display_id,
            field_id,
            "Request должен содержать только state_revision, display_id, field_id и value",
        ),
    )
    isempty(display_id) && throw(signal_setting_validation_error(
        display_id,
        field_id,
        "display_id должен быть непустой строкой",
    ))
    display = try
        signal_analyser_display_by_id(state, display_id)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_setting_validation_error(display_id, field_id, "Неизвестный display_id"))
    end
    isempty(field_id) && throw(signal_setting_validation_error(
        display_id,
        field_id,
        "field_id должен быть непустой строкой",
    ))
    definition = signal_settings_field(service.catalog, field_id)
    definition === nothing && throw(signal_setting_validation_error(
        display_id,
        field_id,
        "Неизвестный field_id",
    ))

    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = signal_settings_parse_integer(display_id, field_id, revision_value)
    revision >= 0 || throw(signal_setting_validation_error(
        display_id,
        field_id,
        "state_revision не может быть отрицательной",
    ))
    value = try
        signal_settings_parse_field_value(
            definition,
            display_id,
            field_id,
            signal_analyser_payload_value(data, "value"),
        )
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_settings_semantic_validation_error(display_id, field_id, err))
    end
    try
        signal_settings_validate_typed_value!(state, display, field_id, value)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_settings_semantic_validation_error(display_id, field_id, err))
    end
    UpdateSignalSettingCommand(revision, display_id, field_id, value)
end

function signal_settings_replace(
    stored::SignalDisplayStoredSettings;
    display::SignalDisplayPreferences = stored.display,
    time::SignalTimePreferences = stored.time,
    spectrum::SignalSpectrumPreferences = stored.spectrum,
    spectrogram::SignalSpectrogramPreferences = stored.spectrogram,
    persistence::SignalPersistencePreferences = stored.persistence,
)::SignalDisplayStoredSettings
    SignalDisplayStoredSettings(display, time, spectrum, spectrogram, persistence)
end

function signal_settings_replace(
    preferences::SignalTimePreferences;
    normalize_y::Bool = preferences.normalize_y,
    show_markers::Bool = preferences.show_markers,
    units::SignalTimeUnitPreference = preferences.units,
    y_limits::Union{Nothing,SignalSettingRange} = preferences.y_limits,
    link_time::Bool = preferences.link_time,
    link_amplitude::Bool = preferences.link_amplitude,
)::SignalTimePreferences
    SignalTimePreferences(normalize_y, show_markers, units, y_limits, link_time, link_amplitude)
end


function signal_settings_replace(
    preferences::SignalSpectrumPreferences;
    frequency_units::SignalFrequencyUnitPreference = preferences.frequency_units,
    y_limits::Union{Nothing,SignalSettingRange} = preferences.y_limits,
    resolution_type::SignalSpectrumResolutionType = preferences.resolution_type,
    rbw::SignalHertzResolution = preferences.rbw,
    window_length::SignalSamplesResolution = preferences.window_length,
    window::SignalSpectrumWindow = preferences.window,
    sidelobe_attenuation_db::Real = preferences.sidelobe_attenuation_db,
    overlap_percent::Real = preferences.overlap_percent,
    nfft::SignalNfftResolution = preferences.nfft,
    link_frequency::Bool = preferences.link_frequency,
    link_magnitude::Bool = preferences.link_magnitude,
)::SignalSpectrumPreferences
    SignalSpectrumPreferences(
        frequency_units,
        y_limits,
        resolution_type,
        rbw,
        window_length,
        window,
        sidelobe_attenuation_db,
        overlap_percent,
        nfft,
        link_frequency,
        link_magnitude,
    )
end

function signal_settings_replace(
    preferences::SignalSpectrogramPreferences;
    time_units::SignalTimeUnitPreference = preferences.time_units,
    frequency_units::SignalFrequencyUnitPreference = preferences.frequency_units,
    scale::SignalSpectrumScale = preferences.scale,
    time_resolution::SignalSecondsResolution = preferences.time_resolution,
    reassign::Bool = preferences.reassign,
)::SignalSpectrogramPreferences
    SignalSpectrogramPreferences(time_units, frequency_units, scale, time_resolution, reassign)
end

function signal_settings_replace(
    preferences::SignalPersistencePreferences;
    time_units::SignalTimeUnitPreference = preferences.time_units,
    frequency_units::SignalFrequencyUnitPreference = preferences.frequency_units,
    frequency_limits::Union{Nothing,SignalSettingRange} = preferences.frequency_limits,
    power_limits::Union{Nothing,SignalSettingRange} = preferences.power_limits,
    density_limits::Union{Nothing,SignalSettingRange} = preferences.density_limits,
    frequency_scale::SignalSpectrumFrequencyScale = preferences.frequency_scale,
    scale::SignalSpectrumScale = preferences.scale,
    time_resolution::SignalSecondsResolution = preferences.time_resolution,
    overlap_percent::Real = preferences.overlap_percent,
    power_bins::SignalPowerBinsPreference = preferences.power_bins,
)::SignalPersistencePreferences
    SignalPersistencePreferences(
        time_units,
        frequency_units,
        frequency_limits,
        power_limits,
        density_limits,
        frequency_scale,
        scale,
        time_resolution,
        overlap_percent,
        power_bins,
    )
end

function signal_settings_replace(
    display::SignalAnalyserDisplayState;
    name::AbstractString = display.name,
    time_limits::Union{Nothing,SignalTimeLimits} = display.time_limits,
    spectrum_settings::SignalSpectrumSettings = display.spectrum_settings,
    spectrogram_settings::SignalSpectrogramSettings = display.spectrogram_settings,
    persistence_settings::SignalPersistenceSettings = display.persistence_settings,
    stored_settings::SignalDisplayStoredSettings = display.stored_settings,
)::SignalAnalyserDisplayState
    SignalAnalyserDisplayState(
        display.id,
        name,
        display.active_plot,
        display.membership,
        display.analysis_source,
        time_limits,
        display.measurement_selection,
        spectrum_settings,
        spectrogram_settings,
        persistence_settings,
        stored_settings,
        display.peaks_enabled,
    )
end

function signal_settings_apply_stored_value(
    stored::SignalDisplayStoredSettings,
    command::UpdateSignalSettingCommand,
)::SignalDisplayStoredSettings
    id = command.field_id
    value = command.value
    id == "display.show_legend" && return signal_settings_replace(
        stored,
        display = SignalDisplayPreferences(value),
    )
    id == "time.normalize_y" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, normalize_y = value),
    )
    id == "time.show_markers" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, show_markers = value),
    )
    id == "time.units" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, units = value),
    )
    id == "time.y_limits" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, y_limits = value),
    )
    id == "time.link_time" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, link_time = value),
    )
    id == "time.link_amplitude" && return signal_settings_replace(
        stored,
        time = signal_settings_replace(stored.time, link_amplitude = value),
    )
    id == "spectrum.frequency_units" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, frequency_units = value),
    )
    id == "spectrum.y_limits" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, y_limits = value),
    )
    id == "spectrum.resolution_type" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, resolution_type = value),
    )
    id == "spectrum.rbw" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, rbw = value),
    )
    id == "spectrum.window_length" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, window_length = value),
    )
    id == "spectrum.window" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, window = value),
    )
    id == "spectrum.sidelobe_attenuation_db" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, sidelobe_attenuation_db = value),
    )
    id == "spectrum.overlap_percent" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, overlap_percent = value),
    )
    id == "spectrum.nfft" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, nfft = value),
    )
    id == "spectrum.link_frequency" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, link_frequency = value),
    )
    id == "spectrum.link_magnitude" && return signal_settings_replace(
        stored,
        spectrum = signal_settings_replace(stored.spectrum, link_magnitude = value),
    )
    id == "spectrogram.time_units" && return signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(stored.spectrogram, time_units = value),
    )
    id == "spectrogram.frequency_units" && return signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(stored.spectrogram, frequency_units = value),
    )
    id == "spectrogram.scale" && return signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(stored.spectrogram, scale = value),
    )
    id == "spectrogram.time_resolution" && return signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(stored.spectrogram, time_resolution = value),
    )
    id == "spectrogram.reassign" && return signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(stored.spectrogram, reassign = value),
    )
    id == "persistence.time_units" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, time_units = value),
    )
    id == "persistence.frequency_units" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, frequency_units = value),
    )
    id == "persistence.frequency_limits" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, frequency_limits = value),
    )
    id == "persistence.power_limits" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, power_limits = value),
    )
    id == "persistence.density_limits" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, density_limits = value),
    )
    id == "persistence.frequency_scale" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, frequency_scale = value),
    )
    id == "persistence.scale" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, scale = value),
    )
    id == "persistence.time_resolution" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, time_resolution = value),
    )
    id == "persistence.overlap_percent" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, overlap_percent = value),
    )
    id == "persistence.power_bins" && return signal_settings_replace(
        stored,
        persistence = signal_settings_replace(stored.persistence, power_bins = value),
    )
    stored
end

const SIGNAL_SETTINGS_EFFECTIVE_FIELD_IDS = Set([
    "time.x_limits",
    "spectrum.frequency_limits",
    "spectrum.frequency_scale",
    "spectrum.scale",
    "spectrum.leakage",
    "spectrogram.frequency_limits",
    "spectrogram.power_limits",
    "spectrogram.frequency_scale",
    "spectrogram.scale",
    "spectrogram.leakage",
    "spectrogram.overlap_percent",
    "persistence.leakage",
])

const SIGNAL_SETTINGS_BACKEND_PRESENTATION_FIELD_IDS = Set([
    "persistence.density_limits",
])

"""Only these product-effective settings participate in explicit calculation Apply."""
const SIGNAL_SETTINGS_EXPLICIT_APPLY_FIELD_IDS = Set([
    "display.name",
    "pane.name",
    "time.units",
    "time.x_limits",
    "time.y_limits",
    "time.link_time",
    "time.link_amplitude",
    "spectrum.frequency_limits",
    "spectrum.frequency_units",
    "spectrum.y_limits",
    "spectrum.link_frequency",
    "spectrum.link_magnitude",
    "spectrum.scale",
    "spectrum.leakage",
    "spectrogram.frequency_limits",
    "spectrogram.scale",
    "spectrogram.leakage",
    "spectrogram.overlap_percent",
    "persistence.leakage",
])

"""These controls publish immediately and never make calculation Apply dirty."""
const SIGNAL_SETTINGS_IMMEDIATE_PRESENTATION_FIELD_IDS = Set([
    "display.show_legend",
    "time.normalize_y",
    "time.show_markers",
])

function signal_settings_apply_command(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    command::UpdateSignalSettingCommand,
)::SignalAnalyserDisplayState
    id = command.field_id
    value = command.value
    try
        if id == "display.name"
            return signal_settings_replace(display, name = value)
        elseif id == "pane.name"
            return display
        elseif id == "time.x_limits"
            analysis_name = signal_analyser_display_analysis_name(display)
            limits = if value === nothing
                analysis_name === nothing ? nothing : signal_full_time_limits(
                    state.measurements_service,
                    signal_by_name(state, analysis_name),
                )
            else
                SignalTimeLimits(value.minimum, value.maximum)
            end
            return signal_settings_replace(display, time_limits = limits)
        elseif id in ("spectrum.frequency_limits", "spectrum.frequency_scale", "spectrum.scale", "spectrum.leakage")
            current = display.spectrum_settings
            limits = id == "spectrum.frequency_limits" ? (
                value === nothing ? AutomaticSignalSpectrumFrequencyLimits() :
                ExplicitSignalSpectrumFrequencyLimits(value.minimum, value.maximum)
            ) : current.frequency_limits
            settings = SignalSpectrumSettings(
                id == "spectrum.scale" ? value : current.scale,
                id == "spectrum.frequency_scale" ? value : current.frequency_scale,
                id == "spectrum.leakage" ? value : current.leakage,
                limits,
            )
            return signal_settings_replace(display, spectrum_settings = settings)
        elseif id in (
            "spectrogram.frequency_limits",
            "spectrogram.power_limits",
            "spectrogram.frequency_scale",
            "spectrogram.leakage",
            "spectrogram.overlap_percent",
        )
            current = display.spectrogram_settings
            frequency_limits = id == "spectrogram.frequency_limits" ? (
                value === nothing ? AutomaticSignalSpectrumFrequencyLimits() :
                ExplicitSignalSpectrumFrequencyLimits(value.minimum, value.maximum)
            ) : current.frequency_limits
            power_limits = id == "spectrogram.power_limits" ? (
                value === nothing ? AutomaticSignalSpectrogramPowerLimits() :
                ExplicitSignalSpectrogramPowerLimits(value.minimum, value.maximum)
            ) : current.power_limits
            settings = SignalSpectrogramSettings(
                id == "spectrogram.overlap_percent" ? value : current.overlap_percent,
                id == "spectrogram.leakage" ? value : current.leakage,
                frequency_limits,
                id == "spectrogram.frequency_scale" ? value : current.frequency_scale,
                power_limits,
            )
            prospective = signal_settings_replace(display, spectrogram_settings = settings)
            SignalSpectrogramPresentationSettings(
                prospective.stored_settings.spectrogram.scale,
                prospective.spectrogram_settings.power_limits,
            )
            return prospective
        elseif id == "persistence.leakage"
            return signal_settings_replace(
                display,
                persistence_settings = SignalPersistenceSettings(value),
            )
        end
        stored = signal_settings_apply_stored_value(display.stored_settings, command)
        prospective = signal_settings_replace(display, stored_settings = stored)
        SignalSpectrogramPresentationSettings(
            prospective.stored_settings.spectrogram.scale,
            prospective.spectrogram_settings.power_limits,
        )
        prospective
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_settings_semantic_validation_error(display.id, id, err))
    end
end

function signal_settings_displays_equal(
    left::SignalAnalyserDisplayState,
    right::SignalAnalyserDisplayState,
)::Bool
    left.name == right.name &&
    left.time_limits == right.time_limits &&
    left.spectrum_settings == right.spectrum_settings &&
    left.spectrogram_settings == right.spectrogram_settings &&
    left.persistence_settings == right.persistence_settings &&
    left.stored_settings == right.stored_settings
end

signal_settings_state_draft_key(state::SignalAnalyserState)::UInt = objectid(state)

function signal_settings_draft_store_unlocked(
    service::SignalSettingsService,
    state::SignalAnalyserState;
    create::Bool,
)::Union{Nothing,SignalSettingsDraftStore}
    key = signal_settings_state_draft_key(state)
    if create
        return get!(service.draft_stores, key) do
            SignalSettingsDraftStore()
        end
    end
    get(service.draft_stores, key, nothing)
end

function signal_settings_display_draft_unlocked(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display_id::AbstractString;
    create::Bool,
)::Union{Nothing,SignalSettingsDisplayDraft}
    store = signal_settings_draft_store_unlocked(service, state; create = create)
    store === nothing && return nothing
    id = String(display_id)
    if create
        return get!((store::SignalSettingsDraftStore).displays, id) do
            SignalSettingsDisplayDraft()
        end
    end
    get((store::SignalSettingsDraftStore).displays, id, nothing)
end

function signal_settings_clear_display_draft_unlocked!(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display_id::AbstractString,
)::Nothing
    store = signal_settings_draft_store_unlocked(service, state; create = false)
    store === nothing && return nothing
    delete!((store::SignalSettingsDraftStore).displays, String(display_id))
    isempty(store.displays) && delete!(
        service.draft_stores,
        signal_settings_state_draft_key(state),
    )
    nothing
end

function signal_settings_draft_domain_command(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    entry::SignalSettingDraftEntry,
)::UpdateSignalSettingCommand
    definition = signal_settings_field(service.catalog, entry.field_id)
    definition === nothing && throw(signal_setting_validation_error(
        display.id,
        entry.field_id,
        "Неизвестный field_id",
    ))
    wire_value = signal_settings_draft_wire_value(entry.value)
    if entry.value isa SignalSettingDraftRange && entry.field_id in (
        "time.x_limits", "time.y_limits", "spectrum.frequency_limits",
        "persistence.frequency_limits",
    )
        draft_range = entry.value::SignalSettingDraftRange
        if entry.field_id == "time.x_limits"
            draft = signal_settings_display_draft_unlocked(
                service,
                state,
                display.id;
                create = false,
            )
            link_entry = draft === nothing ? nothing : get(
                (draft::SignalSettingsDisplayDraft).entries,
                "time.link_time",
                nothing,
            )
            linked = link_entry === nothing ? display.stored_settings.time.link_time :
                (link_entry::SignalSettingDraftEntry).value::Bool
            full = signal_settings_full_time_range(state, display; linked = linked)
            factor = signal_seconds_per_time_unit(display.stored_settings.time.units, full.max_s)
            wire_value = Dict{String,Any}(
                "min" => (draft_range.minimum === nothing ? full.min_s : draft_range.minimum * factor),
                "max" => (draft_range.maximum === nothing ? full.max_s : draft_range.maximum * factor),
            )
        elseif entry.field_id == "time.y_limits"
            full = signal_settings_full_amplitude_range(state, display)
            wire_value = Dict{String,Any}(
                "min" => (draft_range.minimum === nothing ? full.minimum : draft_range.minimum),
                "max" => (draft_range.maximum === nothing ? full.maximum : draft_range.maximum),
            )
        else
            factor = signal_hertz_per_frequency_unit(
                entry.field_id == "persistence.frequency_limits" ?
                    display.stored_settings.persistence.frequency_units :
                    display.stored_settings.spectrum.frequency_units,
            )
            full = signal_settings_full_frequency_range(state, display)
            wire_value = Dict{String,Any}(
                "min" => draft_range.minimum === nothing ?
                    full.minimum : draft_range.minimum * factor,
                "max" => draft_range.maximum === nothing ?
                    full.maximum : draft_range.maximum * factor,
            )
        end
    end
    typed_value = signal_settings_parse_field_value(
        definition,
        display.id,
        entry.field_id,
        wire_value,
    )
    UpdateSignalSettingCommand(
        state.view.state_revision,
        display.id,
        entry.field_id,
        typed_value,
    )
end

function signal_settings_axis_panes(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    plot_types::Tuple,
    linked::Bool,
)::Vector{SignalDisplayPaneState}
    layout = signal_analyser_layout_by_display_id(state, display.id)
    if linked
        return SignalDisplayPaneState[
            pane for pane in layout.panes
            if pane.plot_type in plot_types && !isempty(pane.membership.signal_names)
        ]
    end
    active = signal_display_active_pane(layout)
    active.plot_type in plot_types && !isempty(active.membership.signal_names) ?
        SignalDisplayPaneState[active] : SignalDisplayPaneState[]
end

function signal_settings_full_time_range(
    state::SignalAnalyserState,
    panes::AbstractVector{SignalDisplayPaneState},
)::SignalTimeLimits
    durations = Float64[
        signal_duration_s(signal_by_name(state, name))
        for pane in panes for name in pane.membership.signal_names
    ]
    isempty(durations) && return SignalTimeLimits(0.0, 1.0)
    SignalTimeLimits(0.0, maximum(durations))
end

function signal_settings_full_time_range(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    ;
    linked::Bool = display.stored_settings.time.link_time,
)::SignalTimeLimits
    panes = signal_settings_axis_panes(
        state, display, (TIME_PLOT, SPECTROGRAM_PLOT), linked,
    )
    signal_settings_full_time_range(state, panes)
end

function signal_settings_time_bound_is_automatic(value::Float64, boundary::Float64)::Bool
    scale = max(abs(boundary), floatmin(Float64))
    isapprox(
        value,
        boundary;
        rtol = 8 * eps(Float64),
        atol = 8 * eps(scale),
    )
end

function signal_settings_time_limits_wire_value(
    limits::Union{Nothing,SignalTimeLimits},
    full::SignalTimeLimits,
    unit::SignalTimeUnitPreference,
)
    limits === nothing && return nothing
    typed = limits::SignalTimeLimits
    automatic_minimum = signal_settings_time_bound_is_automatic(typed.min_s, full.min_s)
    automatic_maximum = signal_settings_time_bound_is_automatic(typed.max_s, full.max_s)
    automatic_minimum && automatic_maximum && return nothing
    factor = signal_seconds_per_time_unit(unit, typed.max_s)
    Dict{String,Any}(
        "min" => automatic_minimum ? nothing : typed.min_s / factor,
        "max" => automatic_maximum ? nothing : typed.max_s / factor,
    )
end

function signal_settings_screen_time_limits(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    source::SignalDisplayPaneState,
)::Union{Nothing,SignalTimeLimits}
    limits = source.time_limits
    limits === nothing && return nothing
    display.stored_settings.time.link_time || return limits
    source_full = signal_settings_full_time_range(state, SignalDisplayPaneState[source])
    linked_full = signal_settings_full_time_range(state, display; linked = true)
    typed = limits::SignalTimeLimits
    minimum = signal_settings_time_bound_is_automatic(typed.min_s, source_full.min_s) ?
        linked_full.min_s : typed.min_s
    maximum = signal_settings_time_bound_is_automatic(typed.max_s, source_full.max_s) ?
        linked_full.max_s : typed.max_s
    SignalTimeLimits(minimum, maximum)
end

function signal_settings_full_amplitude_range(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::SignalSettingRange
    panes = signal_settings_axis_panes(
        state, display, (TIME_PLOT,), display.stored_settings.time.link_amplitude,
    )
    values = Float64[]
    for pane in panes
        if pane.stored_settings.time.normalize_y
            append!(values, (0.0, 1.0))
            continue
        end
        for name in pane.membership.signal_names
            signal = signal_by_name(state, name)
            append!(values, real.(signal.values))
            signal.is_complex && append!(values, imag.(signal.values))
        end
    end
    isempty(values) && return SignalSettingRange(-1.0, 1.0)
    minimum, maximum = extrema(values)
    if minimum == maximum
        padding = max(abs(minimum) * 0.05, 1.0)
        minimum -= padding
        maximum += padding
    end
    SignalSettingRange(minimum, maximum)
end

function signal_settings_full_frequency_range(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    ;
    linked::Bool = display.stored_settings.spectrum.link_frequency,
)::SignalSettingRange
    panes = signal_settings_axis_panes(
        state,
        display,
        (SPECTRUM_PLOT, PERSISTENCE_PLOT),
        linked,
    )
    domains = [
        signal_spectrum_topology_limits(signal_by_name(state, name))
        for pane in panes for name in pane.membership.signal_names
    ]
    isempty(domains) && return SignalSettingRange(0.0, 1.0)
    lower = maximum(domain.min_hz for domain in domains)
    upper = minimum(domain.max_hz for domain in domains)
    lower < upper || return SignalSettingRange(0.0, 1.0)
    SignalSettingRange(lower, upper)
end


"""Build the complete prospective Display without publishing or calling providers."""
function signal_settings_draft_projection_unlocked(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
)::Tuple{SignalAnalyserDisplayState,Dict{String,String}}
    draft = signal_settings_display_draft_unlocked(service, state, display.id; create = false)
    prospective = signal_settings_replace(display)
    errors = Dict{String,String}()
    draft === nothing && return prospective, errors

    for definition in service.catalog.fields
        entry = get((draft::SignalSettingsDisplayDraft).entries, definition.id, nothing)
        entry === nothing && continue
        visible = signal_settings_field_visible(definition, state, prospective)
        try
            command = signal_settings_draft_domain_command(
                service,
                state,
                prospective,
                entry::SignalSettingDraftEntry,
            )
            prospective = signal_settings_apply_command(state, prospective, command)
        catch err
            if err isa SignalSettingValidationError
                visible || continue
                errors[definition.id] = sprint(showerror, err)
            elseif err isa ArgumentError
                visible || continue
                errors[definition.id] = sprint(showerror,
                    signal_settings_semantic_validation_error(display.id, definition.id, err),
                )
            else
                rethrow()
            end
        end
    end

    for definition in service.catalog.fields
        haskey(errors, definition.id) && continue
        entry = get((draft::SignalSettingsDisplayDraft).entries, definition.id, nothing)
        entry === nothing && continue
        visible = signal_settings_field_visible(definition, state, prospective)
        try
            command = signal_settings_draft_domain_command(
                service,
                state,
                prospective,
                entry::SignalSettingDraftEntry,
            )
            signal_settings_validate_typed_value!(
                state,
                prospective,
                definition.id,
                command.value,
            )
        catch err
            if err isa SignalSettingValidationError
                visible || continue
                errors[definition.id] = sprint(showerror, err)
            elseif err isa ArgumentError
                visible || continue
                errors[definition.id] = sprint(showerror,
                    signal_settings_semantic_validation_error(display.id, definition.id, err),
                )
            else
                rethrow()
            end
        end
    end
    prospective, errors
end

function parse_signal_setting_draft_command(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    data,
)::UpdateSignalSettingCommand
    data isa AbstractDict || throw(signal_setting_api_type_error(
        "",
        "",
        "Тело запроса должно быть JSON-объектом",
    ))
    display_value = signal_analyser_payload_value(data, "display_id")
    display_value isa AbstractString || throw(signal_setting_api_type_error(
        "",
        "",
        "display_id должен быть строкой",
    ))
    display_id = String(display_value)
    field_value = signal_analyser_payload_value(data, "field_id")
    field_value isa AbstractString || throw(signal_setting_api_type_error(
        display_id,
        "",
        "field_id должен быть строкой",
    ))
    field_id = String(field_value)
    signal_analyser_payload_keys(data) == SIGNAL_SETTINGS_UPDATE_FIELDS || throw(
        signal_setting_api_type_error(
            display_id,
            field_id,
            "Request должен содержать только state_revision, display_id, field_id и value",
        ),
    )
    isempty(display_id) && throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "display_id должен быть непустой строкой",
    ))
    try
        signal_analyser_display_by_id(state, display_id)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_setting_api_type_error(display_id, field_id, "Неизвестный display_id"))
    end
    isempty(field_id) && throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "field_id должен быть непустой строкой",
    ))
    definition = signal_settings_field(service.catalog, field_id)
    definition === nothing && throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "Неизвестный field_id",
    ))
    revision_value = signal_analyser_payload_value(data, "state_revision")
    revision = signal_settings_parse_draft_integer(display_id, field_id, revision_value)
    revision >= 0 || throw(signal_setting_api_type_error(
        display_id,
        field_id,
        "state_revision не может быть отрицательной",
    ))
    UpdateSignalSettingCommand(
        revision,
        display_id,
        field_id,
        signal_settings_parse_draft_field_value(
            definition,
            display_id,
            field_id,
            signal_analyser_payload_value(data, "value"),
        ),
    )
end

function parse_signal_settings_apply_command(
    state::SignalAnalyserState,
    data,
)::ApplySignalSettingsCommand
    data isa AbstractDict || throw(signal_setting_api_type_error(
        "",
        "",
        "Тело Apply должно быть JSON-объектом",
    ))
    signal_analyser_payload_keys(data) == SIGNAL_SETTINGS_APPLY_FIELDS || throw(
        signal_setting_api_type_error(
            "",
            "",
            "Apply должен содержать только state_revision и display_id",
        ),
    )
    display_value = signal_analyser_payload_value(data, "display_id")
    display_value isa AbstractString || throw(signal_setting_api_type_error(
        "",
        "",
        "display_id должен быть строкой",
    ))
    display_id = String(display_value)
    isempty(display_id) && throw(signal_setting_api_type_error(
        display_id,
        "",
        "display_id должен быть непустой строкой",
    ))
    try
        signal_analyser_display_by_id(state, display_id)
    catch err
        err isa ArgumentError || rethrow()
        throw(signal_setting_api_type_error(display_id, "", "Неизвестный display_id"))
    end
    revision = signal_settings_parse_draft_integer(
        display_id,
        "",
        signal_analyser_payload_value(data, "state_revision"),
    )
    revision >= 0 || throw(signal_setting_api_type_error(
        display_id,
        "",
        "state_revision не может быть отрицательной",
    ))
    ApplySignalSettingsCommand(revision, display_id)
end

function signal_settings_reconcile_stored_for_source(
    stored::SignalDisplayStoredSettings,
    signal::Union{Nothing,AnalysedSignal},
)::SignalDisplayStoredSettings
    spectrogram_resolution = stored.spectrogram.time_resolution
    persistence_resolution = stored.persistence.time_resolution
    persistence_frequency_limits = stored.persistence.frequency_limits
    if signal === nothing
        spectrogram_resolution = SignalSecondsResolution()
        persistence_resolution = SignalSecondsResolution()
        persistence_frequency_limits = nothing
    else
        if spectrogram_resolution.mode == SPECIFIED_SIGNAL_SETTING &&
            (spectrogram_resolution.seconds::Float64) > signal_duration_s(signal)
            spectrogram_resolution = SignalSecondsResolution()
        end
        if persistence_frequency_limits !== nothing
            limits = ExplicitSignalSpectrumFrequencyLimits(
                persistence_frequency_limits.minimum,
                persistence_frequency_limits.maximum,
            )
            signal_spectrum_frequency_limits_valid_for_signal(limits, signal) ||
                (persistence_frequency_limits = nothing)
        end
    end
    signal_settings_replace(
        stored,
        spectrogram = signal_settings_replace(
            stored.spectrogram,
            time_resolution = spectrogram_resolution,
        ),
        persistence = signal_settings_replace(
            stored.persistence,
            frequency_limits = persistence_frequency_limits,
            time_resolution = persistence_resolution,
        ),
    )
end


struct SignalSettingsPreparedPassiveSnapshot
    measurements::SignalMeasurementsSnapshot
    peaks::SignalPeaksSnapshot
    plots::SignalAnalyserPreparedDisplayPlots
end

function signal_settings_peaks_settings_unlocked(
    state::SignalAnalyserState,
    display_id::AbstractString,
)::SignalPeaksSettings
    layout = signal_analyser_layout_by_display_id(state, display_id)
    signal_display_active_pane(layout).peaks_settings
end

function signal_settings_prepare_passive_snapshot_unlocked(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    state_revision::Int,
)::SignalSettingsPreparedPassiveSnapshot
    analysis_name = signal_analyser_display_analysis_name(display)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    measurements = signal_measurements_snapshot(
        state.measurements_service,
        state_revision,
        signal,
        display.time_limits,
        display.measurement_selection,
    )
    peaks = signal_peaks_snapshot(
        state.peaks_service,
        state_revision,
        display,
        signal,
        settings = signal_settings_peaks_settings_unlocked(state, display.id),
    )
    prepared = signal_analyser_prepare_display_plots(
        state,
        display,
        signal,
        signal_analyser_display_members(display),
        materialize_missing_spectra = false,
        materialize_missing_spectrogram = false,
        materialize_missing_persistence = false,
    )
    SignalSettingsPreparedPassiveSnapshot(measurements, peaks, prepared)
end

function signal_settings_passive_snapshot_unlocked(
    state::SignalAnalyserState,
)::Dict{String,Any}
    prepared = signal_settings_prepare_passive_snapshot_unlocked(
        state,
        signal_analyser_active_display(state),
        state.view.state_revision,
    )
    signal_analyser_snapshot_from_prepared_unlocked(
        state,
        prepared.measurements,
        prepared.peaks,
        prepared.plots,
    )
end

"""Provider-materialization policy for one accepted effective settings command."""
struct SignalSettingsEffectPreparationPlan
    materialize_spectra::Bool
    materialize_spectrogram::Bool
    materialize_persistence::Bool
end

function SignalSettingsEffectPreparationPlan(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    prospective::SignalAnalyserDisplayState,
    field_id::AbstractString,
)
    field_id == "spectrogram.scale" && return SignalSettingsEffectPreparationPlan(
        false,
        false,
        false,
    )
    changes = SignalAnalyserViewChanges(
        state.row_selection,
        display,
        state.row_selection,
        prospective,
    )
    spectrogram_settings_only = signal_analyser_only_spectrogram_settings_changed(changes)
    persistence_settings_only = signal_analyser_only_persistence_settings_changed(changes)
    secondary_provider_settings_only =
        signal_analyser_only_secondary_provider_settings_changed(changes)
    spectrogram_presentation_only = spectrogram_settings_only &&
        signal_spectrogram_provider_settings_equal(
            display.spectrogram_settings,
            prospective.spectrogram_settings,
        )
    SignalSettingsEffectPreparationPlan(
        !secondary_provider_settings_only,
        !spectrogram_presentation_only && !persistence_settings_only,
        true,
    )
end

@enum SignalSettingsResponsePreparationMode begin
    PASSIVE_SETTINGS_RESPONSE
    ACTIVE_EFFECTIVE_SETTINGS_RESPONSE
    ACTIVE_BACKEND_PRESENTATION_SETTINGS_RESPONSE
end

"""Field-scoped settings response policy; presentation status alone is not sufficient."""
struct SignalSettingsResponsePreparationPlan
    mode::SignalSettingsResponsePreparationMode
end

function SignalSettingsResponsePreparationPlan(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    field_id::AbstractString,
)
    display.id == state.active_display_id || return SignalSettingsResponsePreparationPlan(
        PASSIVE_SETTINGS_RESPONSE,
    )
    field_id in SIGNAL_SETTINGS_EFFECTIVE_FIELD_IDS && return SignalSettingsResponsePreparationPlan(
        ACTIVE_EFFECTIVE_SETTINGS_RESPONSE,
    )
    field_id in SIGNAL_SETTINGS_BACKEND_PRESENTATION_FIELD_IDS &&
        return SignalSettingsResponsePreparationPlan(
            ACTIVE_BACKEND_PRESENTATION_SETTINGS_RESPONSE,
        )
    SignalSettingsResponsePreparationPlan(PASSIVE_SETTINGS_RESPONSE)
end

function signal_settings_apply_active_effective_unlocked!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    prospective::SignalAnalyserDisplayState,
    field_id::AbstractString,
)::Dict{String,Any}
    preparation = SignalSettingsEffectPreparationPlan(state, display, prospective, field_id)
    analysis_name = signal_analyser_display_analysis_name(prospective)
    signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    next_revision = state.view.state_revision + 1
    prepared_plots = signal_analyser_prepare_display_plots(
        state,
        prospective,
        signal,
        signal_analyser_display_members(prospective),
        materialize_missing_spectra = preparation.materialize_spectra,
        materialize_missing_spectrogram = preparation.materialize_spectrogram,
        materialize_missing_persistence = preparation.materialize_persistence,
    )
    measurements = signal_measurements_snapshot(
        state.measurements_service,
        next_revision,
        signal,
        prospective.time_limits,
        prospective.measurement_selection,
    )
    peaks = signal_peaks_snapshot(
        state.peaks_service,
        next_revision,
        prospective,
        signal,
        settings = signal_settings_peaks_settings_unlocked(state, prospective.id),
    )
    signal_analyser_publish_display_plots!(state, prepared_plots)
    signal_analyser_publish_display_state!(display, prospective)
    signal_analyser_sync_active_display!(state, display)
    state.view.state_revision = next_revision
    signal_analyser_snapshot_from_prepared_unlocked(state, measurements, peaks, prepared_plots)
end

function signal_settings_apply_active_presentation_unlocked!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    prospective::SignalAnalyserDisplayState,
)::Dict{String,Any}
    next_revision = state.view.state_revision + 1
    prepared = signal_settings_prepare_passive_snapshot_unlocked(
        state,
        prospective,
        next_revision,
    )
    signal_analyser_publish_display_state!(display, prospective)
    signal_analyser_sync_active_display!(state, display)
    state.view.state_revision = next_revision
    signal_analyser_snapshot_from_prepared_unlocked(
        state,
        prepared.measurements,
        prepared.peaks,
        prepared.plots,
    )
end

function signal_settings_replace_display_unlocked!(
    state::SignalAnalyserState,
    prospective::SignalAnalyserDisplayState,
)
    index = findfirst(display -> display.id == prospective.id, state.displays)
    index === nothing && throw(ArgumentError("Display не найден: $(prospective.id)"))
    state.displays[index] = prospective
    nothing
end

function signal_settings_publish_display_unlocked!(
    state::SignalAnalyserState,
    prospective::SignalAnalyserDisplayState,
)::Nothing
    layout = signal_analyser_layout_by_display_id(state, prospective.id)
    active_pane = signal_display_active_pane(layout)
    state.display_layouts[prospective.id] = signal_display_layout_replace_active_pane(
        layout,
        signal_display_pane_from_display(active_pane.id, prospective, active_pane.name),
    )
    signal_settings_replace_display_unlocked!(state, prospective)
    prospective.id == state.active_display_id &&
        signal_analyser_sync_active_display!(state, prospective)
    nothing
end

function signal_settings_apply_pane_name_unlocked!(
    state::SignalAnalyserState,
    display_id::AbstractString,
    draft::Union{Nothing,SignalSettingsDisplayDraft},
)::Nothing
    draft === nothing && return nothing
    entry = get((draft::SignalSettingsDisplayDraft).entries, "pane.name", nothing)
    entry === nothing && return nothing
    pane_name = strip(String((entry::SignalSettingDraftEntry).value))
    layout = signal_analyser_layout_by_display_id(state, display_id)
    pane = signal_display_active_pane(layout)
    renamed = signal_display_pane_with_name(pane, pane_name)
    state.display_layouts[String(display_id)] = signal_display_layout_replace_active_pane(
        layout,
        renamed,
    )
    nothing
end

function signal_settings_screen_source_pane(
    layout::SignalDisplayLayoutState,
    plot_types::Tuple,
)::Union{Nothing,SignalDisplayPaneState}
    active = signal_display_active_pane(layout)
    active.plot_type in plot_types && signal_display_pane_analysis_name(active) !== nothing &&
        return active
    index = findfirst(
        pane -> pane.plot_type in plot_types && signal_display_pane_analysis_name(pane) !== nothing,
        layout.panes,
    )
    index === nothing ? nothing : layout.panes[index]
end

function signal_settings_pane_with_screen_axes(
    pane::SignalDisplayPaneState,
    link_time::Bool,
    link_amplitude::Bool,
    time_units::SignalTimeUnitPreference,
    time_limits::Union{Nothing,SignalTimeLimits},
    y_limits::Union{Nothing,SignalSettingRange},
)::SignalDisplayPaneState
    time_preferences = signal_settings_replace(
        pane.stored_settings.time,
        units = link_time ? time_units : pane.stored_settings.time.units,
        y_limits = link_amplitude && pane.plot_type == TIME_PLOT ?
            y_limits : pane.stored_settings.time.y_limits,
        link_time = link_time,
        link_amplitude = link_amplitude,
    )
    spectrogram_preferences = pane.plot_type == SPECTROGRAM_PLOT && link_time ?
        signal_settings_replace(pane.stored_settings.spectrogram, time_units = time_units) :
        pane.stored_settings.spectrogram
    stored = signal_settings_replace(
        pane.stored_settings,
        time = time_preferences,
        spectrogram = spectrogram_preferences,
    )
    linked_limits = link_time && pane.plot_type in (TIME_PLOT, SPECTROGRAM_PLOT) &&
        signal_display_pane_analysis_name(pane) !== nothing ? time_limits : pane.time_limits
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        linked_limits,
        pane.measurement_selection,
        pane.spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        stored,
        pane.peaks_enabled,
        pane.peaks_settings,
    )
end

function signal_settings_pane_with_screen_spectrum_axes(
    pane::SignalDisplayPaneState,
    link_frequency::Bool,
    link_magnitude::Bool,
    frequency_units::SignalFrequencyUnitPreference,
    frequency_limits::AbstractSignalSpectrumFrequencyLimits,
    frequency_scale::SignalSpectrumFrequencyScale,
    magnitude_limits::Union{Nothing,SignalSettingRange},
)::SignalDisplayPaneState
    spectrum_preferences = signal_settings_replace(
        pane.stored_settings.spectrum,
        frequency_units = link_frequency && pane.plot_type == SPECTRUM_PLOT ?
            frequency_units : pane.stored_settings.spectrum.frequency_units,
        y_limits = link_magnitude && pane.plot_type == SPECTRUM_PLOT ?
            magnitude_limits : pane.stored_settings.spectrum.y_limits,
        link_frequency = link_frequency,
        link_magnitude = link_magnitude,
    )
    persistence_preferences = signal_settings_replace(
        pane.stored_settings.persistence,
        frequency_units = link_frequency && pane.plot_type == PERSISTENCE_PLOT ?
            frequency_units : pane.stored_settings.persistence.frequency_units,
        frequency_limits = link_frequency && pane.plot_type == PERSISTENCE_PLOT ?
            signal_settings_frequency_limits_range(frequency_limits) :
            pane.stored_settings.persistence.frequency_limits,
        power_limits = link_magnitude && pane.plot_type == PERSISTENCE_PLOT ?
            magnitude_limits : pane.stored_settings.persistence.power_limits,
        frequency_scale = link_frequency && pane.plot_type == PERSISTENCE_PLOT ?
            frequency_scale : pane.stored_settings.persistence.frequency_scale,
    )
    stored = signal_settings_replace(
        pane.stored_settings,
        spectrum = spectrum_preferences,
        persistence = persistence_preferences,
    )
    spectrum_settings = if link_frequency && pane.plot_type == SPECTRUM_PLOT
        current = pane.spectrum_settings
        SignalSpectrumSettings(
            current.scale,
            frequency_scale,
            current.leakage,
            frequency_limits,
        )
    else
        pane.spectrum_settings
    end
    SignalDisplayPaneState(
        pane.id,
        pane.name,
        pane.plot_type,
        pane.membership,
        pane.analysis_source,
        pane.time_limits,
        pane.measurement_selection,
        spectrum_settings,
        pane.spectrogram_settings,
        pane.persistence_settings,
        stored,
        pane.peaks_enabled,
        pane.peaks_settings,
    )
end

function signal_settings_apply_screen_axes_unlocked!(
    state::SignalAnalyserState,
    display_id::AbstractString,
    prospective::SignalAnalyserDisplayState,
    draft::Union{Nothing,SignalSettingsDisplayDraft},
)::Vector{String}
    layout = signal_analyser_layout_by_display_id(state, display_id)
    time_source = signal_settings_screen_source_pane(layout, (TIME_PLOT, SPECTROGRAM_PLOT))
    amplitude_source = signal_settings_screen_source_pane(layout, (TIME_PLOT,))
    spectrum_source = signal_settings_screen_source_pane(
        layout,
        (SPECTRUM_PLOT, PERSISTENCE_PLOT),
    )
    entries = draft === nothing ? Dict{String,SignalSettingDraftEntry}() : draft.entries
    link_time = prospective.stored_settings.time.link_time
    link_amplitude = prospective.stored_settings.time.link_amplitude
    link_frequency = prospective.stored_settings.spectrum.link_frequency
    link_magnitude = prospective.stored_settings.spectrum.link_magnitude
    time_units = haskey(entries, "time.units") ? prospective.stored_settings.time.units :
        time_source === nothing ? prospective.stored_settings.time.units :
        (time_source::SignalDisplayPaneState).plot_type == SPECTROGRAM_PLOT ?
            (time_source::SignalDisplayPaneState).stored_settings.spectrogram.time_units :
            (time_source::SignalDisplayPaneState).stored_settings.time.units
    time_limits = haskey(entries, "time.x_limits") ? (
        entries["time.x_limits"].value === nothing ?
            signal_settings_full_time_range(state, prospective) : prospective.time_limits
    ) :
        time_source === nothing ? prospective.time_limits :
        signal_settings_screen_time_limits(
            state,
            prospective,
            time_source::SignalDisplayPaneState,
        )
    y_limits = haskey(entries, "time.y_limits") ? (
        entries["time.y_limits"].value === nothing ?
            signal_settings_full_amplitude_range(state, prospective) :
            prospective.stored_settings.time.y_limits
    ) :
        amplitude_source === nothing ? prospective.stored_settings.time.y_limits :
        (amplitude_source::SignalDisplayPaneState).stored_settings.time.y_limits
    frequency_units = haskey(entries, "spectrum.frequency_units") ?
        prospective.stored_settings.spectrum.frequency_units :
        spectrum_source === nothing ? prospective.stored_settings.spectrum.frequency_units :
        signal_settings_pane_frequency_units(spectrum_source::SignalDisplayPaneState)
    frequency_limits = haskey(entries, "spectrum.frequency_limits") ?
        prospective.spectrum_settings.frequency_limits :
        spectrum_source === nothing ? prospective.spectrum_settings.frequency_limits :
        signal_settings_pane_frequency_limits(spectrum_source::SignalDisplayPaneState)
    frequency_scale = haskey(entries, "spectrum.frequency_scale") ?
        prospective.spectrum_settings.frequency_scale :
        spectrum_source === nothing ? prospective.spectrum_settings.frequency_scale :
        signal_settings_pane_frequency_scale(spectrum_source::SignalDisplayPaneState)
    magnitude_limits = haskey(entries, "spectrum.y_limits") ?
        prospective.stored_settings.spectrum.y_limits :
        spectrum_source === nothing ? prospective.stored_settings.spectrum.y_limits :
        signal_settings_pane_magnitude_limits(spectrum_source::SignalDisplayPaneState)

    changed = String[]
    panes = SignalDisplayPaneState[]
    for pane in layout.panes
        next_pane = signal_settings_pane_with_screen_axes(
            pane, link_time, link_amplitude, time_units, time_limits, y_limits,
        )
        next_pane = signal_settings_pane_with_screen_spectrum_axes(
            next_pane,
            link_frequency,
            link_magnitude,
            frequency_units,
            frequency_limits,
            frequency_scale,
            magnitude_limits,
        )
        push!(panes, next_pane)
        next_pane == pane || push!(changed, pane.id)
    end
    next_layout = SignalDisplayLayoutState(
        layout.version, layout.variant, layout.rows, layout.columns,
        panes, layout.active_pane_id, layout.next_pane_number,
    )
    state.display_layouts[String(display_id)] = next_layout
    active = signal_display_active_pane(next_layout)
    current_display = signal_analyser_display_by_id(state, display_id)
    projected = signal_analyser_display_for_pane(current_display, active)
    signal_settings_replace_display_unlocked!(state, projected)
    projected.id == state.active_display_id && signal_analyser_sync_active_display!(state, projected)
    unique(changed)
end

function signal_settings_update_response_unlocked(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    display_id::AbstractString,
)::Dict{String,Any}
    target = signal_analyser_display_by_id(state, display_id)
    Dict{String,Any}(
        "state" => signal_analyser_state_lite_unlocked(state),
        "settings" => signal_settings_document_unlocked(service, state, target),
    )
end

"""Refresh an already-ready presentation cache without invalidation or provider work."""
function signal_settings_refresh_cached_presentation_unlocked!(
    state::SignalAnalyserState,
    display::SignalAnalyserDisplayState,
    field_id::AbstractString,
)::Nothing
    display.id == state.active_display_id || return nothing
    signal_analyser_sync_output_pages_unlocked!(state)
    layout = signal_analyser_layout_by_display_id(state, display.id)
    pane = signal_display_active_pane(layout)
    page_id = signal_analyser_output_page_id(display.id, pane.id)
    manager = state.output_manager
    cache = get(manager.plot_cache, page_id, nothing)
    cache === nothing && return nothing
    context = signal_analyser_output_context_unlocked(state, display.id, pane.id)
    (cache::SignalAnalyserPlotCacheEntry).context == context || return nothing

    active_group = signal_analyser_plot_name(pane.plot_type)
    (field_id == "display.show_legend" || startswith(String(field_id), "$(active_group).")) ||
        return nothing
    analysis_name = signal_display_pane_analysis_name(pane)
    analysis_signal = analysis_name === nothing ? nothing : signal_by_name(state, analysis_name)
    signal_bindings = signal_display_pane_members(pane)
    pane_display = signal_analyser_display_for_pane(display, pane)
    prepared = signal_analyser_prepare_display_plots(
        state,
        pane_display,
        analysis_signal,
        signal_bindings,
        materialize_missing_spectra = false,
        materialize_missing_spectrogram = false,
        materialize_missing_persistence = false,
        materialize_spectrum_signal_names = String[],
    )
    output = SignalAnalyserPaneOutput(
        pane.id,
        pane.plot_type,
        signal_bindings,
        analysis_name,
        true,
        true,
        "",
        signal_analyser_pane_renderer_data(prepared, pane, signal_bindings),
    )
    plots = signal_analyser_plotly_payload(output, pane)
    signal_analyser_publish_display_plots!(state, prepared)
    manager.plot_cache[page_id] = SignalAnalyserPlotCacheEntry(context, plots)
    manager.output_statuses[page_id] = SignalAnalyserOutputStatus(
        context,
        true,
        true,
        "",
    )
    nothing
end

function apply_signal_setting!(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    data;
    lightweight::Bool = false,
)::Dict{String,Any}
    lock(state.lock) do
        draft_command = parse_signal_setting_draft_command(service, state, data)
        draft_command.state_revision == state.view.state_revision || throw(
            SignalAnalyserStaleStateError(
                draft_command.state_revision,
                state.view.state_revision,
            ),
        )
        signal_analyser_recover_time_limits_unlocked!(
            state;
            display_ids = String[draft_command.display_id],
        )
        definition = signal_settings_field(service.catalog, draft_command.field_id)::SignalSettingsFieldDefinition
        display = signal_analyser_display_by_id(state, draft_command.display_id)

        if !(draft_command.field_id in SIGNAL_SETTINGS_EXPLICIT_APPLY_FIELD_IDS)
            command = try
                parse_signal_setting_command(service, state, data)
            catch err
                if err isa SignalSettingValidationError &&
                    !signal_settings_field_visible(definition, state, display)
                    return signal_settings_update_response_unlocked(
                        service,
                        state,
                        draft_command.display_id,
                    )
                end
                rethrow()
            end
            prospective = signal_settings_apply_command(state, display, command)
            signal_settings_displays_equal(display, prospective) &&
                return signal_settings_update_response_unlocked(
                    service,
                    state,
                    command.display_id,
                )
            signal_settings_publish_display_unlocked!(state, prospective)
            state.view.state_revision += 1
            definition.effect_status == "effective_presentation" &&
                signal_settings_refresh_cached_presentation_unlocked!(
                    state,
                    prospective,
                    command.field_id,
                )
            return signal_settings_update_response_unlocked(
                service,
                state,
                command.display_id,
            )
        end

        display_draft = signal_settings_display_draft_unlocked(
            service,
            state,
            display.id;
            create = true,
        )::SignalSettingsDisplayDraft
        current_wire_value = if haskey(display_draft.entries, draft_command.field_id)
            signal_settings_draft_wire_value(
                display_draft.entries[draft_command.field_id].value,
            )
        else
            signal_settings_field_value(service, state, display, draft_command.field_id)
        end
        requested_wire_value = signal_settings_draft_wire_value(draft_command.value)
        isequal(current_wire_value, requested_wire_value) &&
            return signal_settings_update_response_unlocked(
                service,
                state,
                draft_command.display_id,
            )

        applied_wire_value = signal_settings_field_value(
            service,
            state,
            display,
            draft_command.field_id,
        )
        if isequal(applied_wire_value, requested_wire_value)
            delete!(display_draft.entries, draft_command.field_id)
            isempty(display_draft.entries) && signal_settings_clear_display_draft_unlocked!(
                service,
                state,
                display.id,
            )
        else
            display_draft.entries[draft_command.field_id] = SignalSettingDraftEntry(
                draft_command.field_id,
                draft_command.value,
            )
        end
        state.view.state_revision += 1
        signal_settings_update_response_unlocked(service, state, draft_command.display_id)
    end
end

function apply_signal_settings!(
    service::SignalSettingsService,
    state::SignalAnalyserState,
    data,
)::Dict{String,Any}
    lock(state.lock) do
        command = parse_signal_settings_apply_command(state, data)
        command.state_revision == state.view.state_revision || throw(SignalAnalyserStaleStateError(
            command.state_revision,
            state.view.state_revision,
        ))
        signal_analyser_recover_time_limits_unlocked!(
            state;
            display_ids = String[command.display_id],
        )
        display = signal_analyser_display_by_id(state, command.display_id)
        layout = signal_analyser_layout_by_display_id(state, display.id)
        active_pane = signal_display_active_pane(layout)
        draft = signal_settings_display_draft_unlocked(
            service,
            state,
            display.id;
            create = false,
        )
        draft_field_ids = draft === nothing ? Set{String}() :
            Set(keys((draft::SignalSettingsDisplayDraft).entries))
        affects_output = any(
            field_id -> !(field_id in ("display.name", "pane.name")),
            draft_field_ids,
        )
        screen_field_ids = Set((
            "time.units", "time.x_limits", "time.y_limits",
            "time.link_time", "time.link_amplitude",
            "spectrum.frequency_units", "spectrum.frequency_limits",
            "spectrum.frequency_scale", "spectrum.y_limits",
            "spectrum.link_frequency", "spectrum.link_magnitude",
        ))
        applies_screen_axes = draft !== nothing && any(
            field_id -> haskey((draft::SignalSettingsDisplayDraft).entries, field_id),
            screen_field_ids,
        )
        cancellation_pages = affects_output ? String[
            signal_analyser_output_page_id(display.id, active_pane.id),
        ] : String[]
        if affects_output && applies_screen_axes
            append!(
                cancellation_pages,
                signal_analyser_output_page_id(display.id, pane.id)
                for pane in layout.panes
                if pane.id != active_pane.id
            )
        end
        isempty(cancellation_pages) ||
            signal_analyser_cancel_output_pages_unlocked!(state, unique(cancellation_pages))
        prospective, errors = signal_settings_draft_projection_unlocked(
            service,
            state,
            display,
        )
        if !isempty(errors)
            state.view.state_revision += 1
            first_field = first(
                definition.id for definition in service.catalog.fields
                if haskey(errors, definition.id)
            )
            return Dict{String,Any}(
                "success" => false,
                "state_revision" => state.view.state_revision,
                "error" => "$(first_field): $(errors[first_field])",
            )
        end

        signal_settings_publish_display_unlocked!(state, prospective)
        signal_settings_apply_pane_name_unlocked!(state, prospective.id, draft)
        linked_pane_ids = applies_screen_axes ?
            signal_settings_apply_screen_axes_unlocked!(state, prospective.id, prospective, draft) :
            String[]
        state.view.state_revision += 1
        if affects_output
            affected_pages = String[
                signal_analyser_output_page_id(prospective.id, active_pane.id),
                (
                    signal_analyser_output_page_id(prospective.id, pane_id)
                    for pane_id in linked_pane_ids
                )...,
            ]
            signal_analyser_invalidate_output_pages_unlocked!(state, affected_pages)
        end
        signal_settings_clear_display_draft_unlocked!(service, state, prospective.id)
        authoritative_settings = signal_settings_document_unlocked(
            service,
            state,
            signal_analyser_display_by_id(state, prospective.id),
        )
        Dict{String,Any}(
            "success" => true,
            "state_revision" => state.view.state_revision,
            "settings" => authoritative_settings,
        )
    end
end
