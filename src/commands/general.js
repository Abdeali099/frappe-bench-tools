const vscode = require("vscode");
const utils = require("../utils");
const terminal = require("../terminal");

/** Show Bench Version
 */
async function showBenchVersion() {
  const command = ["bench --version"];
  await terminal.writeToCommandTerminal(command);
}

module.exports = {
  showBenchVersion,
};
