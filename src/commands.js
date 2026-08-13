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
  getCustomCommands,
  getPlaceholderValues,
  resolveCommand,
  getUnresolvedPlaceholders,
  saveCustomCommand,
  PLACEHOLDERS,
} = require("./utils");
const {
  writeToConsole,
  getConsoleTerminal,
  writeToExecuteTerminal,
  writeToCustomCommandTerminal,
} = require("./terminal");

const ID = "frappe-bench-tools";

async function handleOpenConsole() {
  await getConsoleTerminal();
}

async function handlePasteToConsole() {
  const texts = getSelectedTextOrLines();

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await writeToConsole(texts, false);
}

async function handlePasteClipboardToConsole() {
  let texts = [];

  const clipboardText = await vscode.env.clipboard.readText();
  if (clipboardText) texts = clipboardText.split(/\r?\n/);

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await writeToConsole(texts, false);
}

async function handleImportObject() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  await writeToConsole([importStatement]);
}

async function handleImportAll() {
  const importStatement = await copyImportStatement({ promptUser: false });

  if (!isValidImportStatement(importStatement)) return;

  await writeToConsole([convertToImportAll(importStatement)]);
}

async function handleImportAs() {
  let importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  const alias = await vscode.window.showInputBox({
    prompt: "Enter alias for import",
    placeHolder: "e.g. my_alias",
  });

  importStatement = convertToImportAs(importStatement, alias);

  await writeToConsole([importStatement]);
}

async function handleRunFunction() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  const lines = [importStatement];

  const name = extractObjName(importStatement, true);
  if (name) lines.push(name);

  await writeToConsole(lines);
}

async function handleBenchExecute() {
  const pythonPath = await copyPythonPath();

  if (!pythonPath) {
    vscode.window.showInformationMessage("No Python path found.");
    return;
  }

  const { acceptArgsForExecute, acceptKwargsForExecute } = getBenchToolConfig();

  let args = null;
  if (acceptArgsForExecute) {
    args = await vscode.window.showInputBox({
      prompt: 'Enter args as Python list (e.g. ["a", "b", "c"]) or leave blank',
      placeHolder: '["a", "b", "c"]',
    });
  }
  args = args ? args.trim() : null;

  let kwargs = null;
  if (acceptKwargsForExecute) {
    kwargs = await vscode.window.showInputBox({
      prompt:
        'Enter kwargs as Python dict (e.g. {"key": "val"}) or leave blank',
      placeHolder: '{"key": "val"}',
    });
  }
  kwargs = kwargs ? kwargs.trim() : null;

  const command = getExecuteCommand(pythonPath, args, kwargs);

  await writeToExecuteTerminal(command);
}

async function handleCreateCustomCommand() {
  const existingCommands = getCustomCommands();

  const name = (
    await vscode.window.showInputBox({
      prompt: "Enter a name for the command",
      placeHolder: "e.g. Update App",
      validateInput: (value) =>
        value.trim() ? null : "The name cannot be empty.",
    })
  )?.trim();

  if (!name) return;

  const command = (
    await vscode.window.showInputBox({
      prompt: `Enter the command to run (${Object.keys(PLACEHOLDERS).join(
        ", "
      )} are filled in for you)`,
      placeHolder: "e.g. bench --site {site} migrate",
      value: existingCommands[name],
      validateInput: (value) =>
        value.trim() ? null : "The command cannot be empty.",
    })
  )?.trim();

  if (!command) return;

  await saveCustomCommand(name, command);

  vscode.window.showInformationMessage(`Saved command: ${name}`);
}

async function handleRunCustomCommand() {
  const commands = Object.entries(getCustomCommands());

  if (!commands.length) {
    const create = await vscode.window.showInformationMessage(
      "No commands saved yet.",
      "Create Command"
    );

    if (create) await handleCreateCustomCommand();
    return;
  }

  const values = getPlaceholderValues();

  const picked = await vscode.window.showQuickPick(
    commands.map(([name, command]) => ({
      label: name,
      detail: resolveCommand(command, values),
      unresolved: getUnresolvedPlaceholders(command, values),
    })),
    { placeHolder: "Select a command to run", matchOnDetail: true }
  );

  if (!picked) return;

  if (picked.unresolved.length) {
    vscode.window.showErrorMessage(
      `Cannot run "${picked.label}": ${picked.unresolved.join(", ")}.`
    );
    return;
  }

  await writeToCustomCommandTerminal(picked.detail);
}

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
    "create-custom-command": handleCreateCustomCommand,
    "run-custom-command": handleRunCustomCommand,
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
