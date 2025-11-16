const vscode = require("vscode");
const consoleCommand = require("./commands/benchConsole");
const generalCommand = require("./commands/general");
const devCommand = require("./commands/dev");

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
    // bench console commands
    "open-bench-console": consoleCommand.openConsole,
    "paste-to-bench-console": consoleCommand.pasteSelectionToConsole,
    "paste-clipboard-to-bench-console": consoleCommand.pasteClipboardToConsole,
    "import-in-bench-console": consoleCommand.importObject,
    "import-all-in-bench-console": consoleCommand.importAll,
    "import-as-in-bench-console": consoleCommand.importAs,
    "run-func-in-bench-console": consoleCommand.runFunction,
    "bench-execute-command": consoleCommand.benchExecute,
    // general commands
    "show-bench-version": generalCommand.showBenchVersion,
    "show-all-apps-version": generalCommand.showAllAppsVersion,
    "show-bench-source": generalCommand.showBenchSource,
    // dev commands
    "bench-start": devCommand.start,
    "bench-restart": devCommand.restart,
    "bench-migrate": devCommand.migrate,
    "bench-update": devCommand.update,
    "browse-site": devCommand.browse,
    "browse-site-as-admin": devCommand.browseAsAdmin,
    "upgrade-bench-cli": devCommand.upgradeBenchCLI,
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
