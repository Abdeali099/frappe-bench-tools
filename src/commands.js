const vscode = require("vscode");
const {
  copyImportStatement,
  extractName,
  getSelectedTextOrLines,
  copyPythonPath,
} = require("./utils");
const {
  writeToConsole,
  getConsoleTerminal,
  getExecuteTerminal,
} = require("./terminal");

const BASE = "frappe-bench-console-playground";

const COMMANDS = {
  openConsole: "open-bench-console",
  pasteToConsole: "paste-to-bench-console",
  importObject: "import-in-bench-console",
  runFunction: "run-func-in-bench-console",
  importAll: "import-all-in-bench-console",
  benchExecute: "bench-execute-command",
};

async function handleBenchExecute() {
  // Try to get python path from selection or clipboard
  let pythonPath = copyPythonPath();
  if (!pythonPath) {
    vscode.window.showInformationMessage("No Python path found.");
    return;
  }

  // Prompt for args (optional)
  let args = await vscode.window.showInputBox({
    prompt: "Enter args as Python list (e.g. ['a', 'b', 'c']) or leave blank",
    placeHolder: "['a', 'b', 'c']",
  });
  args = args ? args.trim() : null;

  // Prompt for kwargs (optional)
  let kwargs = await vscode.window.showInputBox({
    prompt: "Enter kwargs as Python dict (e.g. {'key': 'val'}) or leave blank",
    placeHolder: "{'key': 'val'}",
  });
  kwargs = kwargs ? kwargs.trim() : null;

  // Build command
  let cmd = `bench execute ${pythonPath}`;
  if (args) cmd += ` --args '${args}'`;
  if (kwargs) cmd += ` --kwargs '${kwargs}'`;

  // Use a dedicated terminal for bench execute
  const terminal = await getExecuteTerminal();
  terminal.sendText(cmd);
}

async function handleOpenConsole() {
  await getConsoleTerminal();
}

async function handlePasteToConsole() {
  const texts = getSelectedTextOrLines();
  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  // send all selected text chunks to console
  for (const text of texts) {
    await writeToConsole(text);
  }
}

// TODO: not working for variables import
async function handleImportObject() {
  const importStatement = await copyImportStatement();
  if (!importStatement?.startsWith("from ")) {
    vscode.window.showInformationMessage("No valid import statement found.");
    return;
  }

  await writeToConsole(importStatement);
}

async function handleRunFunction() {
  const importStatement = await copyImportStatement();

  if (!importStatement?.startsWith("from ")) {
    vscode.window.showInformationMessage("No valid import statement found.");
    return;
  }

  const lines = [importStatement];

  const name = extractName(importStatement, true);
  if (name) lines.push(name);

  await writeToConsole(...lines);
}

async function handleImportAll() {
  let importStatement = await copyImportStatement();
  if (!importStatement?.startsWith("from ")) {
    vscode.window.showInformationMessage("No valid import statement found.");
    return;
  }

  // change last word to `*`
  const parts = importStatement.split("import");
  parts[parts.length - 1] = " *";
  importStatement = parts.join("import");

  await writeToConsole(importStatement);
}

function registerCommands(context) {
  const commandHandlers = {
    runFunction: handleRunFunction,
    importAll: handleImportAll,
    importObject: handleImportObject,
    openConsole: handleOpenConsole,
    pasteToConsole: handlePasteToConsole,
    benchExecute: handleBenchExecute,
  };

  for (const [key, handler] of Object.entries(commandHandlers)) {
    const disposable = vscode.commands.registerCommand(
      getCommandId(key),
      handler
    );
    context.subscriptions.push(disposable);
  }
}

/**
 * Build full VSCode command ID.
 * @param {string} key
 */
const getCommandId = (key) => `${BASE}.${COMMANDS[key]}`;


module.exports = { registerCommands };
