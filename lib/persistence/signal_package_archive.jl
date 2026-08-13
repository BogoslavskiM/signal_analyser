using SHA

const SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES = 768 * 1024 * 1024
const SIGNAL_PACKAGE_MAX_TOTAL_BYTES = 768 * 1024 * 1024
const SIGNAL_PACKAGE_MAX_ENTRY_BYTES = 512 * 1024 * 1024
const SIGNAL_PACKAGE_MAX_FILES = 16_384
const SIGNAL_PACKAGE_MAX_NAME_BYTES = 240

struct SignalPackageArchiveEntry
    name::String
    bytes::Vector{UInt8}
end

struct SignalPackageArchiveError <: Exception
    code::String
    message::String
    fields::Dict{String,String}
end

Base.showerror(io::IO, err::SignalPackageArchiveError) = print(io, err.message)

signal_package_archive_error(
    code::AbstractString,
    message::AbstractString;
    field::AbstractString = "archive",
) = SignalPackageArchiveError(
    String(code),
    String(message),
    Dict(String(field) => String(message)),
)

function signal_package_write_le!(io::IO, value::Integer, bytes::Int)::Nothing
    unsigned = UInt64(value)
    for shift in 0:8:(8 * (bytes - 1))
        write(io, UInt8((unsigned >> shift) & 0xff))
    end
    nothing
end

function signal_package_read_le(bytes::Vector{UInt8}, offset::Int, width::Int)::UInt64
    1 <= offset && offset + width - 1 <= length(bytes) || throw(
        signal_package_archive_error("invalid_zip", "ZIP header выходит за границы архива"),
    )
    value = UInt64(0)
    for index in 0:(width - 1)
        value |= UInt64(bytes[offset + index]) << (8 * index)
    end
    value
end

const SIGNAL_PACKAGE_CRC32_TABLE = let
    table = Vector{UInt32}(undef, 256)
    for index in 0:255
        value = UInt32(index)
        for _ in 1:8
            value = (value & UInt32(1)) == UInt32(1) ?
                xor(value >> 1, UInt32(0xedb88320)) : value >> 1
        end
        table[index + 1] = value
    end
    table
end

function signal_package_crc32(bytes::Vector{UInt8})::UInt32
    crc = UInt32(0xffffffff)
    for byte in bytes
        index = Int(xor(crc, UInt32(byte)) & UInt32(0xff)) + 1
        crc = xor(crc >> 8, SIGNAL_PACKAGE_CRC32_TABLE[index])
    end
    xor(crc, UInt32(0xffffffff))
end

function signal_package_validate_entry_name(name::AbstractString)::String
    value = String(name)
    isempty(value) && throw(signal_package_archive_error(
        "unsafe_entry_name",
        "Имя ZIP entry не может быть пустым",
    ))
    ncodeunits(value) <= SIGNAL_PACKAGE_MAX_NAME_BYTES || throw(
        signal_package_archive_error("unsafe_entry_name", "Имя ZIP entry слишком длинное"),
    )
    occursin('\0', value) && throw(signal_package_archive_error(
        "unsafe_entry_name",
        "Имя ZIP entry содержит NUL",
    ))
    occursin('\\', value) && throw(signal_package_archive_error(
        "unsafe_entry_name",
        "ZIP entry должен использовать '/' как разделитель",
    ))
    (startswith(value, "/") || occursin(r"^[A-Za-z]:", value)) && throw(
        signal_package_archive_error("unsafe_entry_name", "Абсолютный путь ZIP entry запрещён"),
    )
    parts = split(value, '/'; keepempty = true)
    any(part -> isempty(part) || part == "." || part == "..", parts) && throw(
        signal_package_archive_error("unsafe_entry_name", "ZIP entry содержит небезопасный сегмент пути"),
    )
    value
end

function signal_package_validate_entries(entries::Vector{SignalPackageArchiveEntry})::Nothing
    1 <= length(entries) <= SIGNAL_PACKAGE_MAX_FILES || throw(
        signal_package_archive_error("archive_file_limit", "Превышен лимит файлов пакета"),
    )
    names = Set{String}()
    folded = Set{String}()
    total = 0
    for entry in entries
        name = signal_package_validate_entry_name(entry.name)
        name in names && throw(signal_package_archive_error(
            "duplicate_entry",
            "ZIP содержит повторяющийся entry: $name",
        ))
        lowercase(name) in folded && throw(signal_package_archive_error(
            "case_collision",
            "ZIP содержит конфликт имён без учёта регистра: $name",
        ))
        push!(names, name)
        push!(folded, lowercase(name))
        length(entry.bytes) <= SIGNAL_PACKAGE_MAX_ENTRY_BYTES || throw(
            signal_package_archive_error("archive_entry_limit", "ZIP entry слишком велик: $name"),
        )
        total += length(entry.bytes)
        total <= SIGNAL_PACKAGE_MAX_TOTAL_BYTES || throw(
            signal_package_archive_error("archive_total_limit", "Превышен суммарный лимит данных пакета"),
        )
    end
    nothing
end

"""Build a deterministic, unencrypted ZIP archive using method 0 (store)."""
function write_signal_package_archive(entries::Vector{SignalPackageArchiveEntry})::Vector{UInt8}
    signal_package_validate_entries(entries)
    output = IOBuffer()
    central = IOBuffer()
    for entry in entries
        name_bytes = Vector{UInt8}(codeunits(entry.name))
        crc = signal_package_crc32(entry.bytes)
        size = length(entry.bytes)
        local_offset = position(output)

        signal_package_write_le!(output, 0x04034b50, 4)
        signal_package_write_le!(output, 20, 2)
        signal_package_write_le!(output, 0x0800, 2) # UTF-8, never encrypted.
        signal_package_write_le!(output, 0, 2)      # store
        signal_package_write_le!(output, 0, 2)
        signal_package_write_le!(output, 0, 2)
        signal_package_write_le!(output, crc, 4)
        signal_package_write_le!(output, size, 4)
        signal_package_write_le!(output, size, 4)
        signal_package_write_le!(output, length(name_bytes), 2)
        signal_package_write_le!(output, 0, 2)
        write(output, name_bytes)
        write(output, entry.bytes)

        signal_package_write_le!(central, 0x02014b50, 4)
        signal_package_write_le!(central, 20, 2)
        signal_package_write_le!(central, 20, 2)
        signal_package_write_le!(central, 0x0800, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, crc, 4)
        signal_package_write_le!(central, size, 4)
        signal_package_write_le!(central, size, 4)
        signal_package_write_le!(central, length(name_bytes), 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 2)
        signal_package_write_le!(central, 0, 4)
        signal_package_write_le!(central, local_offset, 4)
        write(central, name_bytes)
    end
    central_bytes = take!(central)
    central_offset = position(output)
    write(output, central_bytes)
    signal_package_write_le!(output, 0x06054b50, 4)
    signal_package_write_le!(output, 0, 2)
    signal_package_write_le!(output, 0, 2)
    signal_package_write_le!(output, length(entries), 2)
    signal_package_write_le!(output, length(entries), 2)
    signal_package_write_le!(output, length(central_bytes), 4)
    signal_package_write_le!(output, central_offset, 4)
    signal_package_write_le!(output, 0, 2)
    result = take!(output)
    length(result) <= SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES || throw(
        signal_package_archive_error("archive_size_limit", "Превышен лимит размера пакета"),
    )
    result
end

function signal_package_eocd_offset(bytes::Vector{UInt8})::Int
    length(bytes) >= 22 || throw(signal_package_archive_error("invalid_zip", "ZIP слишком короткий"))
    first_offset = max(1, length(bytes) - 65_557)
    for offset in (length(bytes) - 21):-1:first_offset
        signal_package_read_le(bytes, offset, 4) == UInt64(0x06054b50) && return offset
    end
    throw(signal_package_archive_error("invalid_zip", "ZIP end-of-central-directory не найден"))
end

"""Read and fully validate an in-memory method-0 ZIP without filesystem extraction."""
function read_signal_package_archive(bytes::Vector{UInt8})::Vector{SignalPackageArchiveEntry}
    length(bytes) <= SIGNAL_PACKAGE_MAX_ARCHIVE_BYTES || throw(
        signal_package_archive_error("archive_size_limit", "Превышен лимит размера пакета"),
    )
    eocd = signal_package_eocd_offset(bytes)
    signal_package_read_le(bytes, eocd + 4, 2) == 0 || throw(
        signal_package_archive_error("multi_disk_zip", "Многодисковый ZIP не поддерживается"),
    )
    signal_package_read_le(bytes, eocd + 6, 2) == 0 || throw(
        signal_package_archive_error("multi_disk_zip", "Многодисковый ZIP не поддерживается"),
    )
    disk_entries = Int(signal_package_read_le(bytes, eocd + 8, 2))
    entry_count = Int(signal_package_read_le(bytes, eocd + 10, 2))
    disk_entries == entry_count || throw(
        signal_package_archive_error("multi_disk_zip", "Многодисковый ZIP не поддерживается"),
    )
    1 <= entry_count <= SIGNAL_PACKAGE_MAX_FILES || throw(
        signal_package_archive_error("archive_file_limit", "Некорректное число файлов пакета"),
    )
    central_size = Int(signal_package_read_le(bytes, eocd + 12, 4))
    central_offset = Int(signal_package_read_le(bytes, eocd + 16, 4)) + 1
    comment_size = Int(signal_package_read_le(bytes, eocd + 20, 2))
    eocd + 22 + comment_size - 1 == length(bytes) || throw(
        signal_package_archive_error("invalid_zip", "ZIP содержит данные после EOCD"),
    )
    central_offset + central_size == eocd || throw(
        signal_package_archive_error("invalid_zip", "Некорректные границы central directory"),
    )

    result = SignalPackageArchiveEntry[]
    names = Set{String}()
    folded = Set{String}()
    total = 0
    cursor = central_offset
    for _ in 1:entry_count
        signal_package_read_le(bytes, cursor, 4) == UInt64(0x02014b50) || throw(
            signal_package_archive_error("invalid_zip", "Некорректная запись central directory"),
        )
        flags = Int(signal_package_read_le(bytes, cursor + 8, 2))
        (flags & 0x0001) == 0 || throw(
            signal_package_archive_error("encrypted_zip", "Зашифрованные ZIP entries запрещены"),
        )
        (flags & 0x0008) == 0 || throw(
            signal_package_archive_error("unsupported_zip", "ZIP data descriptors запрещены"),
        )
        method = Int(signal_package_read_le(bytes, cursor + 10, 2))
        method == 0 || throw(signal_package_archive_error(
            "unsupported_compression",
            "Поддерживается только безопасный ZIP store (method 0)",
        ))
        crc = UInt32(signal_package_read_le(bytes, cursor + 16, 4))
        compressed = Int(signal_package_read_le(bytes, cursor + 20, 4))
        uncompressed = Int(signal_package_read_le(bytes, cursor + 24, 4))
        compressed == uncompressed || throw(
            signal_package_archive_error("invalid_zip", "ZIP store entry имеет разные размеры"),
        )
        uncompressed <= SIGNAL_PACKAGE_MAX_ENTRY_BYTES || throw(
            signal_package_archive_error("archive_entry_limit", "ZIP entry превышает лимит"),
        )
        name_size = Int(signal_package_read_le(bytes, cursor + 28, 2))
        extra_size = Int(signal_package_read_le(bytes, cursor + 30, 2))
        comment_length = Int(signal_package_read_le(bytes, cursor + 32, 2))
        external_attributes = signal_package_read_le(bytes, cursor + 38, 4)
        unix_mode = Int((external_attributes >> 16) & 0xffff)
        file_type = unix_mode & 0xf000
        file_type in (0x2000, 0x6000, 0xa000) && throw(signal_package_archive_error(
            "unsafe_entry_type",
            "Symlink и device ZIP entries запрещены",
        ))
        name_start = cursor + 46
        name_end = name_start + name_size - 1
        name_end <= length(bytes) || throw(signal_package_archive_error("invalid_zip", "Обрезано имя ZIP entry"))
        name = try
            String(copy(bytes[name_start:name_end]))
        catch
            throw(signal_package_archive_error("unsafe_entry_name", "Имя ZIP entry не является UTF-8"))
        end
        signal_package_validate_entry_name(name)
        name in names && throw(signal_package_archive_error("duplicate_entry", "Повторяющийся ZIP entry: $name"))
        lowercase(name) in folded && throw(signal_package_archive_error("case_collision", "Конфликт регистра ZIP entry: $name"))
        push!(names, name)
        push!(folded, lowercase(name))

        local_offset = Int(signal_package_read_le(bytes, cursor + 42, 4)) + 1
        signal_package_read_le(bytes, local_offset, 4) == UInt64(0x04034b50) || throw(
            signal_package_archive_error("invalid_zip", "Local ZIP header не найден"),
        )
        local_flags = Int(signal_package_read_le(bytes, local_offset + 6, 2))
        local_method = Int(signal_package_read_le(bytes, local_offset + 8, 2))
        local_name_size = Int(signal_package_read_le(bytes, local_offset + 26, 2))
        local_extra_size = Int(signal_package_read_le(bytes, local_offset + 28, 2))
        local_flags == flags && local_method == method || throw(
            signal_package_archive_error("invalid_zip", "Central/local ZIP metadata не совпадают"),
        )
        local_name_start = local_offset + 30
        local_name_end = local_name_start + local_name_size - 1
        local_name_end <= length(bytes) || throw(signal_package_archive_error("invalid_zip", "Обрезано local имя"))
        String(copy(bytes[local_name_start:local_name_end])) == name || throw(
            signal_package_archive_error("invalid_zip", "Central/local ZIP names не совпадают"),
        )
        data_start = local_name_end + local_extra_size + 1
        data_end = data_start + uncompressed - 1
        data_end < central_offset || throw(signal_package_archive_error("invalid_zip", "ZIP entry пересекает central directory"))
        payload = uncompressed == 0 ? UInt8[] : copy(bytes[data_start:data_end])
        signal_package_crc32(payload) == crc || throw(
            signal_package_archive_error("zip_crc_mismatch", "CRC ZIP entry не совпадает: $name"),
        )
        total += uncompressed
        total <= SIGNAL_PACKAGE_MAX_TOTAL_BYTES || throw(
            signal_package_archive_error("archive_total_limit", "Превышен суммарный лимит данных пакета"),
        )
        push!(result, SignalPackageArchiveEntry(name, payload))
        cursor = name_end + extra_size + comment_length + 1
    end
    cursor == eocd || throw(signal_package_archive_error("invalid_zip", "Central directory имеет лишние данные"))
    result
end
