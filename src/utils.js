const vscode = require("vscode");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const PYTHON_PATH_COMMAND = "copy-python-path.copy-python-path";

const WORKSPACE_NAME = "frappeBenchTools";
const CONSOLE_TERMINAL_NAME = "Bench Console";
const EXECUTE_TERMINAL_NAME = "Bench Execute";
const CUSTOM_COMMAND_TERMINAL_NAME = "Bench Command";

const CUSTOM_COMMANDS_SETTING = "customCommands";

const PLACEHOLDERS = {
  "{site}": {
    value: (config) => config.siteName,
    source: `${WORKSPACE_NAME}.siteName`,
  },
  "{app}": {
    value: (config) => config.defaultApp,
    source: `${WORKSPACE_NAME}.defaultApp`,
  },
};

const KEY_WORDS = {
  IMPORT: "import",
  FROM: "from",
  ALL: "*",
  AS: "as",
};

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

function getConsoleCommand() {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  if (config.siteName) {
    parts.push("--site", config.siteName);
  }

  parts.push("console");

  if (config.autoReload) {
    parts.push("--autoreload");
  }

  return parts.join(" ");
}

function getExecuteCommand(pythonPath, args = null, kwargs = null) {
  const config = getBenchToolConfig();
  const parts = ["bench"];

  if (config.siteName) {
    parts.push("--site", config.siteName);
  }

  parts.push("execute", pythonPath);

  if (args && config.acceptArgsForExecute) {
    parts.push("--args", `'${args}'`);
  }

  if (kwargs && config.acceptKwargsForExecute) {
    parts.push("--kwargs", `'${kwargs}'`);
  }

  return parts.join(" ");
}

function getCustomCommands() {
  return getBenchToolConfig().customCommands;
}

function getPlaceholderValues() {
  const config = getBenchToolConfig();

  return Object.fromEntries(
    Object.entries(PLACEHOLDERS).map(([placeholder, { value }]) => [
      placeholder,
      value(config) || "",
    ])
  );
}

function resolveCommand(command, values = getPlaceholderValues()) {
  return Object.entries(values).reduce(
    (resolved, [placeholder, value]) =>
      resolved.replaceAll(placeholder, () => value),
    command
  );
}

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

async function saveCustomCommand(name, command) {
  const config = vscode.workspace.getConfiguration(WORKSPACE_NAME);
  const savedCommands =
    config.inspect(CUSTOM_COMMANDS_SETTING)?.globalValue || {};

  await config.update(
    CUSTOM_COMMANDS_SETTING,
    { ...savedCommands, [name]: command },
    vscode.ConfigurationTarget.Global
  );
}

async function copyImportStatement({ promptUser = true } = {}) {
  try {
    await vscode.commands.executeCommand(IMPORT_COMMAND);
    let importStatement = await vscode.env.clipboard.readText();
    if (promptUser) {
      importStatement = await completeImportStatementFromUser(importStatement);
    }
    return importStatement.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

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

async function copyPythonPath() {
  try {
    await vscode.commands.executeCommand(PYTHON_PATH_COMMAND);
    const pythonPath = await vscode.env.clipboard.readText();
    return pythonPath.trim();
  } catch (e) {
    copyPythonPathExtensionMissing();
  }
}

function copyPythonPathExtensionMissing() {
  vscode.window.showErrorMessage(
    "Copy Python Path extension is not installed. Install it from https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path."
  );
}

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
      }
      const line = document.lineAt(sel.active.line);
      return line.text;
    })
    .filter((text) => text.length > 0);
}

function extractObjName(importStatement, callable = false) {
  const parts = importStatement.split(KEY_WORDS.IMPORT);
  if (parts.length < 2) return null;
  const name = parts[1].trim().split(",")[0];
  return callable ? `${name}()` : name;
}

function convertToImportAll(importStatement) {
  if (!importStatement?.startsWith(`${KEY_WORDS.FROM} `)) {
    return null;
  }

  const parts = importStatement.split(KEY_WORDS.IMPORT);
  parts[parts.length - 1] = ` ${KEY_WORDS.ALL}`;
  return parts.join(KEY_WORDS.IMPORT).trim();
}

function convertToImportAs(importStatement, alias) {
  if (!importStatement?.startsWith(`${KEY_WORDS.FROM} `)) {
    return null;
  }

  if (!alias || alias.trim().length === 0) {
    return importStatement;
  }

  const firstWordOfAlias = alias.split(/\s+/)[0];

  return `${importStatement} ${KEY_WORDS.AS} ${firstWordOfAlias}`;
}

function isValidImportStatement(importStatement, notify = true) {
  const parts = importStatement?.split(KEY_WORDS.IMPORT);

  const isValid = Boolean(
    importStatement &&
      importStatement.startsWith(`${KEY_WORDS.FROM} `) &&
      parts &&
      parts.length >= 2 &&
      parts[1].trim().length > 0
  );

  if (!isValid && notify) {
    vscode.window.showInformationMessage("No valid import statement found.");
  }

  return isValid;
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
  saveCustomCommand,
  PLACEHOLDERS,
};
