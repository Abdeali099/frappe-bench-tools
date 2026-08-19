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

  await writeToConsole(texts, false);
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

  await writeToConsole(texts, false);
}

/** Import object in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function handleImportObject() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  await writeToConsole([importStatement]);
}

/** Import all (*) in bench console terminal.
 */
async function handleImportAll() {
  // user input not required here
  const importStatement = await copyImportStatement(false);

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

/** Run function in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function handleRunFunction() {
  const importStatement = await copyImportStatement();

  if (!isValidImportStatement(importStatement)) return;

  const lines = [importStatement];

  const name = extractObjName(importStatement, true);
  if (name) lines.push(name);

  await writeToConsole(lines);
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

/** Create a custom command.
 * Prompts for a name and the command itself, then optionally a site and app
 * to bake into its {site}/{app} placeholders, and saves it to the user settings.
 */
async function handleCreateCustomCommand() {
  const commands = getCustomCommands();

  const name = (
    await vscode.window.showInputBox({
      prompt: "Name for the command",
      placeHolder: "e.g. Update App",
      validateInput: (value) =>
        value.trim() ? null : "The name cannot be empty.",
    })
  )?.trim();

  if (!name) return;

  let command = (
    await vscode.window.showInputBox({
      prompt: `Command to run (${Object.keys(PLACEHOLDERS).join(
        ", "
      )} filled in for you)`,
      placeHolder: "e.g. bench --site {site} migrate",
      // an existing name edits that command, rather than silently replacing it
      value: commands[name],
      validateInput: (value) =>
        value.trim() ? null : "The command cannot be empty.",
    })
  )?.trim();

  if (!command) return;

  const site = (
    await vscode.window.showInputBox({
      prompt:
        "Bake a site into {site}, or leave blank to fill from settings when it runs",
      placeHolder: "e.g. mysite.localhost",
    })
  )?.trim();

  const app = (
    await vscode.window.showInputBox({
      prompt:
        "Bake an app into {app}, or leave blank to fill from settings when it runs",
      placeHolder: "e.g. erpnext",
    })
  )?.trim();

  const overrides = {
    ...(site && { "{site}": site }),
    ...(app && { "{app}": app }),
  };

  if (Object.keys(overrides).length) {
    command = resolveCommand(command, overrides);
  }

  await saveCustomCommand(name, command);

  vscode.window.showInformationMessage(`Saved command: ${name}`);
}

/** Run a custom command in the custom command terminal.
 * Commands are picked from the ones saved in the settings.
 */
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
      // the resolved command is both shown and run, so that what the pick
      // says is exactly what happens
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
