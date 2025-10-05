const vscode = require("vscode");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const PYTHON_PATH_COMMAND = "copy-python-path.copy-python-path";

const WORKSPACE_NAME = "frappeBenchTools";
const CONSOLE_TERMINAL_NAME = "Bench Console";
const EXECUTE_TERMINAL_NAME = "Bench Execute";

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
 * @param {string} pythonPath
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
 */
async function copyImportStatement() {
  try {
    await vscode.commands.executeCommand(IMPORT_COMMAND);
    const importStatement = await vscode.env.clipboard.readText();
    return importStatement.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

async function copyPythonPath() {
  try {
    await vscode.commands.executeCommand(PYTHON_PATH_COMMAND);
    const pythonPath = await vscode.env.clipboard.readText();
    return pythonPath.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

/**
 * Extract function/class name from import statement.
 * Example: `from module.path import my_function` => "my_function"
 * @param {string} importStatement
 */
function extractName(importStatement, callable = false) {
  const parts = importStatement.split("import");
  if (parts.length < 2) return null;
  const name = parts[1].trim().split(",")[0]; // first name only
  return callable ? `${name}()` : name;
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

function copyPythonPathExtensionMissing() {
  vscode.window.showErrorMessage(
    "Copy Python Path extension is not installed. Install it from https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path."
  );
}

module.exports = {
  copyImportStatement,
  extractName,
  getSelectedTextOrLines,
  copyPythonPath,
  getBenchToolConfig,
  getConsoleCommand,
  getExecuteCommand,
};
