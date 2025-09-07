const vscode = require("vscode");
const { registerCommands } = require("./commands");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  registerCommands(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
