const vscode = require("vscode");
const utils = require("../utils");
const terminal = require("../terminal");

/** Show Bench Version
 */
async function showBenchVersion() {
  const command = ["bench --version"];
  await terminal.writeToCommandTerminal(command);
}

/** Show All Apps Version
 *
 * Note: Only show apps that are in current bench directory.
 */
async function showAllAppsVersion() {
  const command = ["bench version"];
  await terminal.writeToCommandTerminal(command);
}

/** Show Bench Source
 */
async function showBenchSource() {
  const command = ["bench src"];
  await terminal.writeToCommandTerminal(command);
}

module.exports = {
  showBenchVersion,
  showAllAppsVersion,
  showBenchSource,
};
