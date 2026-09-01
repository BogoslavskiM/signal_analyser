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
  assert(/functionDedicated:\s*false/.test(nativeIo) &&
    /dedicatedFunction \? "Генерация функции" : "Сохранение"/.test(nativeIo) &&
    /dedicatedFunction \? "Сгенерировать" : "Сохранить"/.test(nativeIo),
    "the row action must keep its dedicated flow while generic Save retains its type selector");
  assert(/Dict\("id" => "function", "label" => "Julia-функция"/.test(fs.readFileSync(path.join(root, "lib/services/native_session_io_service.jl"), "utf8")) &&
    /state\.saveType === "function"\) names = at >= 0 \? \[\] : \[name\]/.test(nativeIo),
    "generic Save must expose Julia function generation and constrain it to one signal");
  assert(/signal-operation-success-layer/.test(app) &&
    /openSignalOperationSuccess\(createdName\)/.test(app) &&
    !/Результат прошёл проверку и добавлен одной операцией/.test(app),
    "successful signal operations must close the form and open a separate success dialog");
  assert(/operation_history/.test(fs.readFileSync(path.join(root, "lib/services/signal_inventory_service.jl"), "utf8")) &&
    /data-testid='signal-operation-history'/.test(app),
    "Signal settings must show the backend-owned transformation history");
};
