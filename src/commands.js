const vscode = require("vscode");
const {
  copyImportStatement,
  extractName,
  getSelectedTextOrLines,
} = require("./utils");
const { sendToBenchConsole, getBenchTerminal } = require("./benchConsole");

const BASE = "frappe-bench-console-playground";

const COMMANDS = {
  openConsole: "open-bench-console",
  pasteToConsole: "paste-to-bench-console",
  importObject: "import-in-bench-console",
  runFunction: "run-func-in-bench-console",
  importAll: "import-all-in-bench-console",
};

/**
 * Build full VSCode command ID.
 * @param {string} key
 */
const getCommandId = (key) => `${BASE}.${COMMANDS[key]}`;

async function handleOpenConsole() {
  await getBenchTerminal();
}

async function handlePasteToConsole() {
  const texts = getSelectedTextOrLines();
  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  // send all selected text chunks to console
  for (const text of texts) {
    await sendToBenchConsole(text);
  }
}

// TODO: not working for variables import
async function handleImportObject() {
  const importStatement = await copyImportStatement();
  if (!importStatement?.startsWith("from ")) {
    vscode.window.showInformationMessage("No valid import statement found.");
    return;
  }

  await sendToBenchConsole(importStatement);
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

  await sendToBenchConsole(...lines);
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

  await sendToBenchConsole(importStatement);
}

function registerCommands(context) {
  const commandHandlers = {
    runFunction: handleRunFunction,
    importAll: handleImportAll,
    importObject: handleImportObject,
    openConsole: handleOpenConsole,
    pasteToConsole: handlePasteToConsole,
  };

  for (const [key, handler] of Object.entries(commandHandlers)) {
    const disposable = vscode.commands.registerCommand(
      getCommandId(key),
      handler
    );
    context.subscriptions.push(disposable);
  }
}

module.exports = { registerCommands };
