const vscode = require("vscode");
const { registerCommands } = require("./commands");

function activate(context) {
  registerCommands(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
