const vscode = require("vscode");
const {
  copyImportStatement,
  extractObjName,
  getSelectedTextOrLines,
  copyPythonPath,
  getBenchToolConfig,
  getExecuteCommand,
  convertToImportAll,
  isValidImportStatement,
  convertToImportAs,
} = require("./utils");
const {
  writeToConsole,
  getConsoleTerminal,
  writeToExecuteTerminal,
} = require("./terminal");

// ++++++++ Constants +++++++++ //

// extension ID
const ID = "frappe-bench-tools";

// ++++++++ Command Handlers +++++++++ //

/** Open bench console terminal.
 */
async function handleOpenConsole() {
  await getConsoleTerminal();
}

/** Paste selected text or current lines to bench console terminal.
 */
async function handlePasteToConsole() {
  const texts = getSelectedTextOrLines();

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await writeToConsole(...texts);
}

/** Paste clipboard text to bench console terminal.
 */
async function handlePasteClipboardToConsole() {
  let texts = [];

  const clipboardText = await vscode.env.clipboard.readText();
  if (clipboardText) texts = clipboardText.split(/\r?\n/);

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await writeToConsole(...texts);
}

/** Import object in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function handleImportObject() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  await writeToConsole(importStatement);
}

/** Import all (*) in bench console terminal.
 */
async function handleImportAll() {
  // user input not required here
  const importStatement = await copyImportStatement(false);

  if (!isValidImportStatement(importStatement)) return;

  await writeToConsole(convertToImportAll(importStatement));
}

async function handleImportAs() {
  let importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  const alias = await vscode.window.showInputBox({
    prompt: "Enter alias for import",
    placeHolder: "e.g. my_alias",
  });

  importStatement = convertToImportAs(importStatement, alias);

  await writeToConsole(importStatement);
}

/** Run function in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function handleRunFunction() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  const lines = [importStatement];

  const name = extractObjName(importStatement, true);
  if (name) lines.push(name);

  await writeToConsole(...lines);
}

/** Execute command in bench execute terminal.
 * Prompts for args and kwargs if enabled in settings.
 */
async function handleBenchExecute() {
  // Try to get python path from selection or clipboard
  let pythonPath = await copyPythonPath();

  if (!pythonPath) {
    vscode.window.showInformationMessage("No Python path found.");
    return;
  }

  const { acceptArgsForExecute, acceptKwargsForExecute } = getBenchToolConfig();

  let args = null;
  let kwargs = null;

  // Prompt for args (optional)
  if (acceptArgsForExecute) {
    args = await vscode.window.showInputBox({
      prompt: 'Enter args as Python list (e.g. ["a", "b", "c"]) or leave blank',
      placeHolder: '["a", "b", "c"]',
    });
  }

  args = args ? args.trim() : null;

  // Prompt for kwargs (optional)
  if (acceptKwargsForExecute) {
    kwargs = await vscode.window.showInputBox({
      prompt:
        'Enter kwargs as Python dict (e.g. {"key": "val"}) or leave blank',
      placeHolder: '{"key": "val"}',
    });
  }

  kwargs = kwargs ? kwargs.trim() : null;

  // Build command
  const cmd = getExecuteCommand(pythonPath, args, kwargs);

  // Use a dedicated terminal for bench execute
  await writeToExecuteTerminal(cmd);
}

// ++++++++ Register all commands +++++++++ //

/**
 * Register all command handlers.
 * @param {vscode.ExtensionContext} context
 */
function registerCommands(context) {
  const commandHandlers = {
    "open-bench-console": handleOpenConsole,
    "paste-to-bench-console": handlePasteToConsole,
    "paste-clipboard-to-bench-console": handlePasteClipboardToConsole,
    "import-in-bench-console": handleImportObject,
    "import-all-in-bench-console": handleImportAll,
    "import-as-in-bench-console": handleImportAs,
    "run-func-in-bench-console": handleRunFunction,
    "bench-execute-command": handleBenchExecute,
  };

  for (const cmd in commandHandlers) {
    const disposable = vscode.commands.registerCommand(
      `${ID}.${cmd}`,
      commandHandlers[cmd]
    );
    context.subscriptions.push(disposable);
  }
}

module.exports = { registerCommands };
