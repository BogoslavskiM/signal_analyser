// Safe cleanup contract for the authorized signal-import E2E: never target a baseline name.
// Capture baselineNames, accept exactly one post-add new name, and only then use
// `[data-signal-delete="${CSS.escape(addedName)}"]` after proving the matching row exists.
