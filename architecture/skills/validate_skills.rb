#!/usr/bin/env ruby
# encoding: UTF-8
# frozen_string_literal: true

require "yaml"

ROOT = File.expand_path(__dir__)
MANIFEST_KEYS = %w[
  schema_version name version title description language audience priority
  when-to-use when-not requires-tools requires-products reference-files
  requires-skills
].freeze
SEMVER = /\A\d+\.\d+\.\d+\z/
SKILL_ID = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
CAPABILITY_ID = /\A[a-z0-9]+(?:[.-][a-z0-9]+)*\z/

errors = []
records = {}

Dir.glob(File.join(ROOT, "*", "*", "manifest.yaml")).sort.each do |manifest_path|
  directory = File.dirname(manifest_path)
  skill_path = File.join(directory, "SKILL.md")
  relative = directory.delete_prefix("#{ROOT}/")

  begin
    manifest = YAML.safe_load(File.read(manifest_path, encoding: "UTF-8"), permitted_classes: [], aliases: false)
  rescue StandardError => e
    errors << "#{relative}: invalid manifest YAML: #{e.message}"
    next
  end

  unless manifest.is_a?(Hash)
    errors << "#{relative}: manifest must be a mapping"
    next
  end

  missing = MANIFEST_KEYS.reject { |key| manifest.key?(key) }
  errors << "#{relative}: missing manifest keys: #{missing.join(', ')}" unless missing.empty?
  errors << "#{relative}: schema_version must be 2" unless manifest["schema_version"] == 2
  errors << "#{relative}: legacy extends field is forbidden" if manifest.key?("extends")

  name = manifest["name"].to_s
  errors << "#{relative}: invalid skill name #{name.inspect}" unless SKILL_ID.match?(name)
  errors << "#{relative}: folder/name mismatch" unless File.basename(directory) == name
  errors << "#{relative}: invalid semantic version" unless SEMVER.match?(manifest["version"].to_s)
  errors << "#{relative}: requires-skills must be an array" unless manifest["requires-skills"].is_a?(Array)
  records[name] = { relative: relative, manifest: manifest }

  unless File.file?(skill_path)
    errors << "#{relative}: SKILL.md is missing"
    next
  end

  skill = File.read(skill_path, encoding: "UTF-8")
  expected_frontmatter = "---\nname: #{name}\n---\n"
  errors << "#{relative}: SKILL.md frontmatter must contain only name" unless skill.start_with?(expected_frontmatter)
  errors << "#{relative}: version must live only in manifest.yaml" if skill.match?(/^version:/)

  if skill.include?("## Optional Capabilities")
    errors << "#{relative}: Optional Capabilities requires Core Contract" unless skill.include?("## Core Contract")
    optional_section = skill.split("## Optional Capabilities", 2).last.split(/^## /, 2).first
    ids = optional_section.scan(/^- `([^`]+)`/).flatten
    errors << "#{relative}: Optional Capabilities must declare stable ids" if ids.empty?
    ids.each do |id|
      errors << "#{relative}: invalid optional capability id #{id.inspect}" unless CAPABILITY_ID.match?(id)
    end
    errors << "#{relative}: duplicate optional capability ids" unless ids.uniq.length == ids.length
  end
end

records.each_value do |record|
  Array(record[:manifest]["requires-skills"]).each do |dependency|
    errors << "#{record[:relative]}: unknown requires-skills id #{dependency.inspect}" unless records.key?(dependency)
  end
end

if records.empty?
  errors << "no skill manifests found"
end

if errors.empty?
  puts "PASS skills: #{records.length} manifests, schema=2, versions=manifest-only"
  exit 0
end

warn errors.join("\n")
exit 1
