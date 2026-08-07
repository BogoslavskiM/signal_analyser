#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"
require "set"
require "yaml"

root = File.expand_path(__dir__)
required = %w[
  schema_version name version title description language audience priority
  when-to-use when-not requires-tools requires-products reference-files
].freeze
semver = /\A\d+\.\d+\.\d+\z/
skill_id = /\A[a-z0-9]+(?:[-_][a-z0-9]+)*\z/
errors = []
names = {}
paths = {}
skill_sources = {}

def string_array?(value)
  value.is_a?(Array) && value.all? { |item| item.is_a?(String) && !item.strip.empty? }
end

skill_dirs = Dir.glob(File.join(root, "*", "*")).select { |path| File.directory?(path) }.sort

skill_dirs.each do |directory|
  relative = directory.delete_prefix("#{root}/")
  entries = Dir.children(directory).sort
  allowed_entries = %w[SKILL.md manifest.yaml reference]
  extras = entries - allowed_entries
  errors << "#{relative}: unsupported root entries #{extras.join(', ')}" unless extras.empty?
  errors << "#{relative}: legacy assets directory is forbidden; use reference/" if entries.include?("assets")

  manifest_path = File.join(directory, "manifest.yaml")
  skill_path = File.join(directory, "SKILL.md")
  unless File.file?(manifest_path)
    errors << "#{relative}: manifest.yaml is missing"
    next
  end
  unless File.file?(skill_path)
    errors << "#{relative}: SKILL.md is missing"
    next
  end

  begin
    manifest = YAML.safe_load(File.read(manifest_path, encoding: "UTF-8"), permitted_classes: [], aliases: false)
  rescue StandardError => e
    errors << "#{relative}: invalid YAML: #{e.message}"
    next
  end
  unless manifest.is_a?(Hash)
    errors << "#{relative}: manifest must be a mapping"
    next
  end

  missing = required.reject { |key| manifest.key?(key) }
  extra = manifest.keys.map(&:to_s) - required
  errors << "#{relative}: missing #{missing.join(', ')}" unless missing.empty?
  errors << "#{relative}: unsupported manifest fields #{extra.join(', ')}" unless extra.empty?
  errors << "#{relative}: schema_version must be 1" unless manifest["schema_version"] == 1

  name = manifest["name"].to_s
  errors << "#{relative}: invalid name" unless skill_id.match?(name)
  errors << "#{relative}: folder/name mismatch" unless File.basename(directory) == name
  errors << "#{relative}: invalid version" unless semver.match?(manifest["version"].to_s)
  %w[title description language].each do |field|
    errors << "#{relative}: #{field} must be non-empty" unless manifest[field].is_a?(String) && !manifest[field].strip.empty?
  end
  errors << "#{relative}: audience must equal [assistant]" unless manifest["audience"] == ["assistant"]
  priority = manifest["priority"]
  errors << "#{relative}: priority must be between 0 and 1" unless priority.is_a?(Numeric) && priority.between?(0, 1)
  %w[when-to-use when-not requires-tools requires-products reference-files].each do |field|
    errors << "#{relative}: #{field} must be an array of non-empty strings" unless string_array?(manifest[field])
  end
  if string_array?(manifest["when-to-use"]) && string_array?(manifest["when-not"])
    overlap = manifest["when-to-use"] & manifest["when-not"]
    errors << "#{relative}: when-to-use/when-not overlap #{overlap.join(', ')}" unless overlap.empty?
  end

  errors << "#{relative}: duplicate name" if names.key?(name)
  names[name] = relative
  paths[relative] = manifest_path

  declared_refs = string_array?(manifest["reference-files"]) ? manifest["reference-files"] : []
  declared_refs.each do |reference|
    clean = Pathname.new(reference).cleanpath.to_s
    if Pathname.new(reference).absolute? || clean != reference || reference.split("/").include?("..")
      errors << "#{relative}: unsafe reference path #{reference}"
      next
    end
    errors << "#{relative}: reference must be under reference/: #{reference}" unless reference.start_with?("reference/")
    full = File.expand_path(reference, directory)
    errors << "#{relative}: reference escapes skill root: #{reference}" unless full.start_with?("#{directory}/")
    errors << "#{relative}: missing reference #{reference}" unless File.file?(full)
  end
  actual_refs = Dir.glob(File.join(directory, "reference", "**", "*")).select { |path| File.file?(path) }
                   .map { |path| path.delete_prefix("#{directory}/") }.sort
  unless declared_refs.sort == actual_refs
    errors << "#{relative}: reference-files mismatch declared=#{declared_refs.sort.inspect} actual=#{actual_refs.inspect}"
  end

  skill = File.read(skill_path, encoding: "UTF-8")
  errors << "#{relative}: SKILL.md must start with a Markdown heading" unless skill.start_with?("# ")
  errors << "#{relative}: YAML frontmatter is forbidden in SKILL.md" if skill.start_with?("---\n")
  errors << "#{relative}: SKILL.md exceeds 500 lines" if skill.lines.length > 500
  errors << "#{relative}: machine-specific absolute path in SKILL.md" if skill.match?(%r{/(?:Users|home|private/tmp)/})
  if skill.match?(/[a-f0-9]{24,}\$2[aby]\$\d{2}\$/i) || skill.include?("-----BEGIN PRIVATE KEY-----")
    errors << "#{relative}: probable secret in SKILL.md"
  end
  skill.scan(/`(reference\/[^`\s]+)`/).flatten.each do |reference|
    errors << "#{relative}: SKILL.md links undeclared reference #{reference}" unless declared_refs.include?(reference)
  end
  skill_sources[relative] = skill
end

skill_sources.each do |relative, skill|
  skill.scan(/`([a-z0-9-]+\/[a-z0-9_-]+)`/).flatten.uniq.each do |reference|
    role = reference.split("/", 2).first
    next unless Dir.exist?(File.join(root, role))

    errors << "#{relative}: unknown canonical skill #{reference}" unless paths.key?(reference)
  end
end

role_dir = File.expand_path("../agents/roles", root)
Dir.glob(File.join(role_dir, "*.toml")).sort.each do |role_path|
  role = File.basename(role_path, ".toml")
  source = File.read(role_path, encoding: "UTF-8")
  mandatory = source[/^mandatory_workflow_skill\s*=\s*"([^"]+)"/, 1]
  errors << "role #{role}: mandatory_workflow_skill is missing" unless mandatory

  references = []
  references << mandatory if mandatory
  source.scan(/^(?:stage_skills|available_subskills|optional_stage_skills)\s*=\s*\[([^\]]*)\]/) do |match|
    references.concat(match.first.scan(/"([^"]+)"/).flatten)
  end
  source.scan(/^mode_skills\s*=\s*\{([^}]*)\}/) do |match|
    references.concat(match.first.scan(/"([^"]+)"/).flatten)
  end
  references.uniq.each do |skill_path|
    errors << "role #{role}: unknown skill #{skill_path}" unless paths.key?(skill_path)
  end
end

if errors.empty?
  role_count = Dir.glob(File.join(role_dir, "*.toml")).length
  reference_count = Dir.glob(File.join(root, "*", "*", "reference", "**", "*")).count { |path| File.file?(path) }
  puts "PASS skills: #{names.length} manifests, #{reference_count} references, #{role_count} role catalogs, schema=1"
  exit 0
end

warn errors.join("\n")
exit 1
