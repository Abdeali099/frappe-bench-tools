const path = require("path");
const vscode = require("vscode");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const PYTHON_PATH_COMMAND = "copy-python-path.copy-python-path";

const WORKSPACE_NAME = "frappeBenchTools";
const CONSOLE_TERMINAL_NAME = "Bench Console";
const EXECUTE_TERMINAL_NAME = "Bench Execute";
const CUSTOM_COMMAND_TERMINAL_NAME = "Bench Command";

const CUSTOM_COMMANDS_SETTING = "customCommands";

// the folder every app of a bench lives in
const APPS_DIR = "apps";

const SITE = "{site}";
const APP = "{app}";

// placeholders that are filled in before a command is run
const PLACEHOLDERS = {
  [SITE]: {
    label: "site",
    value: (config) => config.siteName,
    source: `${WORKSPACE_NAME}.siteName`,
    prompt: "Site to run in",
    placeHolder: "e.g. mysite.localhost",
    blankHint: "the default site of the bench",
  },
  [APP]: {
    label: "app",
    // falls back to the app folder open in the workspace, so that it works
    // without any setting for the app you are in
    value: (config) => config.defaultApp || getWorkspaceApp(),
    source: `${WORKSPACE_NAME}.defaultApp`,
    prompt: "App to run for",
    placeHolder: "e.g. erpnext",
  },
};

const KEY_WORDS = {
  IMPORT: "import",
  FROM: "from",
  ALL: "*",
  AS: "as",
};

/**
 * Reads configuration from workspace settings.
 * @returns {object} Bench tool configurations
 */
function getBenchToolConfig() {
  const config = vscode.workspace.getConfiguration(WORKSPACE_NAME);

  return {
    siteName: config.get("siteName"),
    defaultApp: config.get("defaultApp"),
    consoleTerminalName:
      config.get("consoleTerminalName") || CONSOLE_TERMINAL_NAME,
    autoReload: config.get("autoReload"),
    executeTerminalName:
      config.get("executeTerminalName") || EXECUTE_TERMINAL_NAME,
    acceptArgsForExecute: config.get("acceptArgsForExecute"),
    acceptKwargsForExecute: config.get("acceptKwargsForExecute"),
    customCommandTerminalName:
      config.get("customCommandTerminalName") || CUSTOM_COMMAND_TERMINAL_NAME,
    customCommands: config.get(CUSTOM_COMMANDS_SETTING) || {},
    askForVariableValues: config.get("askForVariableValues"),
  };
}

/**
 * Gets the app name from the folder open in the workspace, a single app folder
 * being what the extension expects (e.g. ~/frappe-bench/apps/erpnext => erpnext).
 * @returns {string} app name, empty when there is no folder open
 */
function getWorkspaceApp() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return "";

  const parts = folder.uri.fsPath.split(path.sep).filter(Boolean);

  // a folder deeper in the bench (apps/erpnext/erpnext) still names its app
  const appsIndex = parts.lastIndexOf(APPS_DIR);
  if (appsIndex !== -1 && parts[appsIndex + 1]) return parts[appsIndex + 1];

  return parts.at(-1) || "";
}

/**
 * Gets the bench console command based on the workspace configuration.
 * @param {object} values - as returned by getPlaceholderValues()
 * @returns {string} Console command (e.g. "bench --site mysite console --autoreload")
 */
function getConsoleCommand(values = getPlaceholderValues()) {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  // add site if specified
  if (values[SITE]) {
    parts.push("--site", values[SITE]);
  }

  parts.push("console");

  // add autoreload if enabled
  if (config.autoReload) {
    parts.push("--autoreload");
  }

  return parts.join(" ");
}

/**
 * Gets the bench execute command for a given python path and optional args/kwargs.
 * @param {string} pythonPath
 * @param {string|null} args - Python list as string (e.g. '["a", "b"]')
 * @param {string|null} kwargs - Python dict as string (e.g. '{"key": "val"}')
 * @param {object} values - as returned by getPlaceholderValues()
 * @returns {string} Bench execute command (e.g. "bench --site mysite execute my.module.func --args '["a", "b"]' --kwargs '{"key": "val"}'")
 */
function getExecuteCommand(
  pythonPath,
  args = null,
  kwargs = null,
  values = getPlaceholderValues()
) {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  // add site if specified
  if (values[SITE]) {
    parts.push("--site", values[SITE]);
  }

  parts.push("execute");
  parts.push(pythonPath);

  if (args && config.acceptArgsForExecute) {
    parts.push("--args", `'${args}'`);
  }

  if (kwargs && config.acceptKwargsForExecute) {
    parts.push("--kwargs", `'${kwargs}'`);
  }

  return parts.join(" ");
}

/**
 * Gets the custom commands from the workspace configuration.
 * @returns {object} custom commands, as name to command
 */
function getCustomCommands() {
  return getBenchToolConfig().customCommands;
}

/**
 * Resolves every placeholder once, so the same values are used for every
 * command in a list.
 * @returns {object} placeholder to its value, empty when it cannot be resolved
 */
function getPlaceholderValues() {
  const config = getBenchToolConfig();

  return Object.fromEntries(
    Object.entries(PLACEHOLDERS).map(([placeholder, { value }]) => [
      placeholder,
      value(config) || "",
    ])
  );
}

/**
 * Fills the placeholders of a custom command.
 * @param {string} command - e.g. "bench --site {site} migrate"
 * @param {object} values - as returned by getPlaceholderValues()
 * @returns {string} command to run (e.g. "bench --site mysite migrate")
 */
function resolveCommand(command, values = getPlaceholderValues()) {
  return Object.entries(values).reduce(
    // replaced through a function, so that a $ in a value is not a pattern
    (resolved, [placeholder, value]) =>
      resolved.replaceAll(placeholder, () => value),
    command
  );
}

/**
 * Gets the placeholders a command uses.
 * @param {string} command
 * @returns {string[]} placeholders
 */
function getUsedPlaceholders(command) {
  return Object.keys(PLACEHOLDERS).filter((placeholder) =>
    command.includes(placeholder)
  );
}

/**
 * Gets the placeholders a command uses, but that cannot be filled in.
 * Without them the command would run with a placeholder left empty.
 * @param {string} command
 * @param {object} values - as returned by getPlaceholderValues()
 * @returns {string[]} placeholders and where they come from
 */
function getUnresolvedPlaceholders(command, values = getPlaceholderValues()) {
  return getUsedPlaceholders(command)
    .filter((placeholder) => !values[placeholder])
    .map(
      (placeholder) =>
        `${placeholder} needs ${PLACEHOLDERS[placeholder].source}`
    );
}

/**
 * Resolves the values a command runs with: the ones from the settings, or, when
 * askForVariableValues is turned on, the ones entered for them.
 * @param {string[]} placeholders - the placeholders the command uses
 * @param {boolean} allowBlank - whether a blank value means something to the
 *   command, rather than leaving it half written
 * @returns {Promise<object|null>} values to run with, null when cancelled
 */
async function resolvePlaceholderValues(placeholders, allowBlank = false) {
  const values = getPlaceholderValues();

  if (!getBenchToolConfig().askForVariableValues) return values;

  for (const placeholder of placeholders) {
    const { label, prompt, placeHolder, blankHint } = PLACEHOLDERS[placeholder];

    // blank is only an answer where the command says what it falls back to
    const blankAllowed = allowBlank && blankHint;

    const entered = await vscode.window.showInputBox({
      prompt: blankAllowed ? `${prompt}, or blank for ${blankHint}` : prompt,
      placeHolder,
      // prefilled, so that the value it would otherwise run with is
      // one keypress away
      value: values[placeholder],
      validateInput: (value) =>
        blankAllowed || value.trim() ? null : `The ${label} cannot be empty.`,
    });

    // cancelled, so that the command is not run with a value not meant for it
    if (entered === undefined) return null;

    values[placeholder] = entered.trim();
  }

  return values;
}

/**
 * Saves a custom command to the user settings.
 * @param {string} name - name shown when picking a command to run
 * @param {string} command - command to run, placeholders included
 */
async function saveCustomCommand(name, command) {
  const config = vscode.workspace.getConfiguration(WORKSPACE_NAME);

  // only what was saved before, so that the defaults are not copied along and
  // frozen to what they are today
  const saved = config.inspect(CUSTOM_COMMANDS_SETTING)?.globalValue || {};

  await config.update(
    CUSTOM_COMMANDS_SETTING,
    { ...saved, [name]: command },
    vscode.ConfigurationTarget.Global
  );
}

/**
 * Copies Python import statement using external extension.
 * @param {boolean} user_prompt - whether to prompt user to complete the statement if incomplete
 * @returns {Promise<string|null>} import statement or null if failed
 */
async function copyImportStatement(user_prompt = true) {
  try {
    await vscode.commands.executeCommand(IMPORT_COMMAND);
    let importStatement = await vscode.env.clipboard.readText();
    if (user_prompt) {
      importStatement = await completeImportStatementFromUser(importStatement);
    }
    return importStatement.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

/** Prompt user to complete import statement if incomplete.
 * @param {string|null} importStatement - existing import statement (if any)
 * @returns {Promise<string|null>} completed import statement or null if cancelled
 */
async function completeImportStatementFromUser(importStatement = null) {
  if (isValidImportStatement(importStatement, false)) {
    return importStatement.trim();
  }

  return await vscode.window.showInputBox({
    prompt: "Complete the import statement",
    placeHolder: "from module.path import obj",
    value: importStatement || "",
  });
}

/**
 * Copies Python dotted path using external extension.
 * @returns {Promise<string|null>} python path or null if failed
 */
async function copyPythonPath() {
  try {
    await vscode.commands.executeCommand(PYTHON_PATH_COMMAND);
    const pythonPath = await vscode.env.clipboard.readText();
    return pythonPath.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

/** Notify user that Copy Python Path extension is missing.
 */
function copyPythonPathExtensionMissing() {
  vscode.window.showErrorMessage(
    "Copy Python Path extension is not installed. Install it from https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path."
  );
}

/**
 * Get selected text(s) from the active editor.
 * - If there are selections, return all selected texts.
 * - If no selection, return the full line(s) where the cursor(s) are.
 *
 * @returns {string[]} array of strings (one per selection/line)
 */
function getSelectedTextOrLines() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return [];
  }

  const { document, selections } = editor;

  return selections
    .map((sel) => {
      if (!sel.isEmpty) {
        return document.getText(sel);
      } else {
        const line = document.lineAt(sel.active.line);
        return line.text;
      }
    })
    .filter((text) => text.length > 0);
}

/**
 * Extract function/class name from import statement.
 * Example: `from module.path import my_function` => "my_function"
 * @param {string} importStatement
 */
function extractObjName(importStatement, callable = false) {
  const parts = importStatement.split(KEY_WORDS.IMPORT);
  if (parts.length < 2) return null;
  const name = parts[1].trim().split(",")[0]; // first name only
  return callable ? `${name}()` : name;
}

/** Convert import statement to import all (using *).
 * Example: `from module.path import my_function` => `from module.path import *`
 * @param {string} importStatement
 * @returns {string|null} modified import statement or null if not applicable
 */
function convertToImportAll(importStatement) {
  if (!importStatement?.startsWith(`${KEY_WORDS.FROM} `)) {
    return null;
  }

  // change last word to `*`
  const parts = importStatement.split(KEY_WORDS.IMPORT);
  parts[parts.length - 1] = ` ${KEY_WORDS.ALL}`;
  importStatement = parts.join(KEY_WORDS.IMPORT).trim();

  return importStatement;
}

/** Convert import statement to import as (using alias).
 * Example: `from module.path import my_function` + `mf` => `from module.path import my_function as mf`
 * @param {string} importStatement
 * @param {string} alias
 * @returns {string|null} modified import statement or null if not applicable
 */
function convertToImportAs(importStatement, alias) {
  if (!importStatement?.startsWith(`${KEY_WORDS.FROM} `)) {
    return null;
  }

  if (!alias || alias.trim().length === 0) {
    return importStatement;
  }

  alias = alias.split(/\s+/)[0]; // first word only

  //  add `as alias` to import statement
  return `${importStatement} ${KEY_WORDS.AS} ${alias}`;
}

/** Check if import statement is valid (starts with "from ").
 * @param {string} importStatement
 * @param {boolean} notify - whether to notify user if invalid
 * @returns {boolean} true if valid, false otherwise
 */
function isValidImportStatement(importStatement, notify = true) {
  const parts = importStatement?.split(KEY_WORDS.IMPORT);

  if (
    importStatement &&
    importStatement.startsWith(`${KEY_WORDS.FROM} `) &&
    parts &&
    parts.length >= 2 &&
    parts[1].trim().length > 0
  ) {
    return true;
  }

  if (notify) {
    vscode.window.showInformationMessage("No valid import statement found.");
  }

  return false;
}

module.exports = {
  copyImportStatement,
  isValidImportStatement,
  extractObjName,
  convertToImportAll,
  convertToImportAs,
  getSelectedTextOrLines,
  copyPythonPath,
  getBenchToolConfig,
  getConsoleCommand,
  getExecuteCommand,
  getCustomCommands,
  getPlaceholderValues,
  resolveCommand,
  getUnresolvedPlaceholders,
  getUsedPlaceholders,
  resolvePlaceholderValues,
  getWorkspaceApp,
  saveCustomCommand,
  PLACEHOLDERS,
  SITE,
};
