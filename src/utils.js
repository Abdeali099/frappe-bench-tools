const vscode = require("vscode");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const PYTHON_PATH_COMMAND = "copy-python-path.copy-python-path";

const WORKSPACE_NAME = "frappeBenchTools";
const CONSOLE_TERMINAL_NAME = "Bench Console";
const EXECUTE_TERMINAL_NAME = "Bench Execute";

const KEY_WORDS = {
  IMPORT: "import",
  FROM: "from",
  ALL: "*",
};

/**
 * Reads configuration from workspace settings.
 * @returns {object} Bench tool configurations
 */
function getBenchToolConfig() {
  const config = vscode.workspace.getConfiguration(WORKSPACE_NAME);

  return {
    siteName: config.get("siteName"),
    consoleTerminalName:
      config.get("consoleTerminalName") || CONSOLE_TERMINAL_NAME,
    autoReload: config.get("autoReload"),
    executeTerminalName:
      config.get("executeTerminalName") || EXECUTE_TERMINAL_NAME,
    acceptArgsForExecute: config.get("acceptArgsForExecute"),
    acceptKwargsForExecute: config.get("acceptKwargsForExecute"),
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

function completeImportStatementFromUser(importStatement = null) {
  if (isValidImportStatement(importStatement, false)) {
    return importStatement.trim();
  }

  return vscode.window.showInputBox({
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
  getSelectedTextOrLines,
  copyPythonPath,
  getBenchToolConfig,
  getConsoleCommand,
  getExecuteCommand,
};
