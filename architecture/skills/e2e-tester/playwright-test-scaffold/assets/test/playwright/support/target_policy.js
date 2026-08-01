"use strict";

function originValues(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",");
  return [];
}

function normalizeAllowedOrigin(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";

  let parsed;
  try {
    parsed = new URL(text);
  } catch (error) {
    throw new Error(`Invalid allowed origin ${JSON.stringify(text)}`);
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error(`Allowed origin must use HTTP or HTTPS: ${JSON.stringify(text)}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`Allowed origin must not contain credentials: ${JSON.stringify(text)}`);
  }
  return parsed.origin;
}

function resolveAllowedOrigins(config, environmentValue) {
  const fromEnvironment = typeof environmentValue === "string" && environmentValue.trim()
    ? originValues(environmentValue)
    : [];
  const configured = config && config.target
    ? originValues(config.target.allowedOrigins)
    : [];
  const source = fromEnvironment.length ? fromEnvironment : configured;
  const origins = Array.from(new Set(source.map(normalizeAllowedOrigin).filter(Boolean)));

  if (!origins.length) {
    throw new Error(
      "No allowed Engee origins configured. Set project target.allowedOrigins " +
      "or PLAYWRIGHT_ALLOWED_ORIGINS from [engee_target].base_url"
    );
  }
  return origins;
}

function assertAllowedUrl(rawUrl, allowedOrigins, label) {
  const value = String(rawUrl == null ? "" : rawUrl).trim();
  const subject = label || "application URL";
  if (!value) throw new Error(`${subject} is empty`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(`${subject} is invalid: ${JSON.stringify(value)}`);
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error(`${subject} must use HTTP or HTTPS: ${JSON.stringify(value)}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${subject} must not contain credentials: ${JSON.stringify(value)}`);
  }
  if (!allowedOrigins.includes(parsed.origin)) {
    throw new Error(
      `${subject} origin ${JSON.stringify(parsed.origin)} is not allowed; ` +
      `expected one of ${allowedOrigins.join(", ")}`
    );
  }
  return parsed;
}

module.exports = {
  assertAllowedUrl,
  normalizeAllowedOrigin,
  resolveAllowedOrigins,
};
