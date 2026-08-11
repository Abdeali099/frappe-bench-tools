const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const PYTHON_PATH_COMMAND = "copy-python-path.copy-python-path";

const WORKSPACE_NAME = "frappeBenchTools";
const CONSOLE_TERMINAL_NAME = "Bench Console";
const EXECUTE_TERMINAL_NAME = "Bench Execute";
const CUSTOM_COMMAND_TERMINAL_NAME = "Bench Command";

const CUSTOM_COMMANDS_SETTING = "customCommands";

// a bench is the directory that holds the sites, apps live in ./apps
const BENCH_MARKER = path.join("sites", "apps.txt");

// how deep to search the workspace folders for an app
const APP_SEARCH_DEPTH = 4;

// searching these is never worth it, and they can be enormous
const SKIPPED_DIRS = new Set([
  "node_modules",
  "env",
  "__pycache__",
  "dist",
  "public",
  "sites",
  "logs",
]);

// placeholders that are filled in before a command is run
const PLACEHOLDERS = {
  "{site}": {
    value: (config) => config.siteName,
    source: `${WORKSPACE_NAME}.siteName`,
  },
  "{app}": {
    value: (config) => config.defaultApp,
    source: `${WORKSPACE_NAME}.defaultApp`,
  },
  "{bench}": {
    value: () => getBenchPath(),
    source: "a bench in the workspace folders",
  },
  "{appPath}": {
    value: (config) => getAppPath(config.defaultApp),
    source: "an app directory in the workspace folders",
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
  };
}

/**
 * Gets the bench console command based on the workspace configuration.
 * @returns {string} Console command (e.g. "bench --site mysite console --autoreload")
 */
function getConsoleCommand() {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  // add site if specified
  if (config.siteName) {
    parts.push("--site", config.siteName);
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
 * @returns {string} Bench execute command (e.g. "bench --site mysite execute my.module.func --args '["a", "b"]' --kwargs '{"key": "val"}'")
 */
function getExecuteCommand(pythonPath, args = null, kwargs = null) {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  // add site if specified
  if (config.siteName) {
    parts.push("--site", config.siteName);
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
 * Finds the bench directory, so that commands do not depend on where the
 * terminal happens to be opened. Each workspace folder is walked up until a
 * bench is found, which covers opening an app rather than the bench itself.
 * @returns {string|null} path of the bench, or null if there is none
 */
function getBenchPath() {
  for (const folder of vscode.workspace.workspaceFolders || []) {
    let dir = folder.uri.fsPath;

    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, BENCH_MARKER))) return dir;
      dir = path.dirname(dir);
    }
  }

  return null;
}

/**
 * Lists the sub directories worth searching, if the directory can be read.
 * @param {string} dir
 * @returns {string[]} absolute paths
 */
function getSearchableDirs(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          !SKIPPED_DIRS.has(entry.name)
      )
      .map((entry) => path.join(dir, entry.name));
  } catch {
    // unreadable directories are simply not searched
    return [];
  }
}

/**
 * Finds the directory of an app by searching the workspace folders for it.
 * The search is breadth first, so the outermost match wins, which is the app
 * itself rather than the python package of the same name inside it.
 * @param {string} app - app name, e.g. "erpnext"
 * @returns {string|null} path of the app, or null if it is not found
 */
function getAppPath(app) {
  if (!app) return null;

  let dirs = (vscode.workspace.workspaceFolders || []).map(
    (folder) => folder.uri.fsPath
  );

  for (let depth = 0; dirs.length && depth <= APP_SEARCH_DEPTH; depth++) {
    const appDir = dirs.find((dir) => path.basename(dir) === app);
    if (appDir) return appDir;

    dirs = dirs.flatMap(getSearchableDirs);
  }

  return null;
}

/**
 * Gets the custom commands from the workspace configuration.
 * @returns {object} custom commands, as name to command
 */
function getCustomCommands() {
  return getBenchToolConfig().customCommands;
}

/**
 * Resolves every placeholder once, since searching the workspace for the bench
 * and the app is not worth repeating for each command.
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
 * Gets the placeholders a command uses, but that cannot be filled in.
 * Without them the command would run with a placeholder left empty.
 * @param {string} command
 * @param {object} values - as returned by getPlaceholderValues()
 * @returns {string[]} placeholders and where they come from
 */
function getUnresolvedPlaceholders(command, values = getPlaceholderValues()) {
  return Object.keys(PLACEHOLDERS)
    .filter(
      (placeholder) => command.includes(placeholder) && !values[placeholder]
    )
    .map(
      (placeholder) =>
        `${placeholder} needs ${PLACEHOLDERS[placeholder].source}`
    );
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
  getBenchPath,
  getAppPath,
  getCustomCommands,
  getPlaceholderValues,
  resolveCommand,
  getUnresolvedPlaceholders,
  saveCustomCommand,
  PLACEHOLDERS,
};
