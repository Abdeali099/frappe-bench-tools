const vscode = require("vscode");
const benchConsole = require("./commands/benchConsole");

// ++++++++ Constants +++++++++ //

// extension ID
const ID = "frappe-bench-tools";

// ++++++++ Register all commands +++++++++ //

/**
 * Register all command handlers.
 * @param {vscode.ExtensionContext} context
 */
function registerCommands(context) {
  const commandHandlers = {
    "open-bench-console": benchConsole.handleOpenConsole,
    "paste-to-bench-console": benchConsole.handlePasteToConsole,
    "paste-clipboard-to-bench-console": benchConsole.handlePasteClipboardToConsole,
    "import-in-bench-console": benchConsole.handleImportObject,
    "import-all-in-bench-console": benchConsole.handleImportAll,
    "import-as-in-bench-console": benchConsole.handleImportAs,
    "run-func-in-bench-console": benchConsole.handleRunFunction,
    "bench-execute-command": benchConsole.handleBenchExecute,
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
