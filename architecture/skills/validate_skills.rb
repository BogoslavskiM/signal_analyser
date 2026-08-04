#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"

root = File.expand_path(__dir__)
required = %w[schema_version name version title description language audience priority when-to-use when-not requires-tools requires-products reference-files requires-skills].freeze
semver = /\A\d+\.\d+\.\d+\z/
skill_id = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
errors = []
names = {}
paths = {}

Dir.glob(File.join(root, "*", "*", "manifest.yaml")).sort.each do |manifest_path|
  directory = File.dirname(manifest_path)
  relative = directory.delete_prefix("#{root}/")
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
  errors << "#{relative}: missing #{missing.join(', ')}" unless missing.empty?
  errors << "#{relative}: schema_version must be 2" unless manifest["schema_version"] == 2
  name = manifest["name"].to_s
  errors << "#{relative}: invalid name" unless skill_id.match?(name)
  errors << "#{relative}: folder/name mismatch" unless File.basename(directory) == name
  errors << "#{relative}: invalid version" unless semver.match?(manifest["version"].to_s)
  errors << "#{relative}: requires-skills must be an array" unless manifest["requires-skills"].is_a?(Array)
  errors << "#{relative}: duplicate name" if names.key?(name)
  names[name] = relative
  paths[relative] = manifest_path
  skill_path = File.join(directory, "SKILL.md")
  unless File.file?(skill_path)
    errors << "#{relative}: SKILL.md is missing"
    next
  end
  skill = File.read(skill_path, encoding: "UTF-8")
  expected = "---\nname: #{name}\n---\n"
  errors << "#{relative}: invalid SKILL.md frontmatter" unless skill.start_with?(expected)
  errors << "#{relative}: version must be manifest-only" if skill.match?(/^version:/)
end

names.each_value do |relative|
  manifest = YAML.safe_load(File.read(File.join(root, relative, "manifest.yaml")), permitted_classes: [], aliases: false)
  manifest["requires-skills"].each do |dependency|
    errors << "#{relative}: unknown dependency #{dependency}" unless names.key?(dependency)
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
  puts "PASS skills: #{names.length} manifests, #{role_count} role catalogs, schema=2, references valid"
  exit 0
end
warn errors.join("\n")
exit 1
