"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function signalFunctionGeneration(assert) {
  const root = path.resolve(__dirname, "../../../..");
  const app = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const nativeIo = fs.readFileSync(path.join(root, "public/js/native-session-io.js"), "utf8");

  assert(/data-signal-generate-function=/.test(app) && /signal\.has_operations/.test(app),
    "the per-signal function action must only be enabled for a reproducible operation history");
  assert(/openSignalFunction\(button\.dataset\.signalGenerateFunction, button\)/.test(app),
    "the row action must open the dedicated function-generation flow");
  assert(/function openSignalFunction\(signalName, trigger\)/.test(nativeIo) &&
    /state\.saveType = "function"/.test(nativeIo),
    "native I/O must expose a dedicated one-signal function dialog");
  assert(/functionMode \? "Генерация функции" : "Сохранение"/.test(nativeIo) &&
    /functionMode \? "Сгенерировать" : "Сохранить"/.test(nativeIo),
    "function generation must not be presented as the generic Save type");
};
