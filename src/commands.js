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
    "open-bench-console": benchConsole.openConsole,
    "paste-to-bench-console": benchConsole.pasteSelectionToConsole,
    "paste-clipboard-to-bench-console": benchConsole.pasteClipboardToConsole,
    "import-in-bench-console": benchConsole.importObject,
    "import-all-in-bench-console": benchConsole.importAll,
    "import-as-in-bench-console": benchConsole.importAs,
    "run-func-in-bench-console": benchConsole.runFunction,
    "bench-execute-command": benchConsole.benchExecute,
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
