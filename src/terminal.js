const vscode = require("vscode");
const { getBenchToolConfig, getConsoleCommand } = require("./utils");

const DELAY = 1500;

/**
 * Sleep utility
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get or create a terminal by name, with optional startup command.
 * @param {string} name - terminal name
 * @param {string|null} startupCommand - command to run after creation
 * @returns {Promise<vscode.Terminal>}
 */
async function getOrCreateTerminal(name, startupCommand = null) {
  let terminal = vscode.window.terminals.find((t) => t.name === name);

  if (!terminal) {
    terminal = vscode.window.createTerminal(name);
    terminal.show();

    // wait for shell init (like auto `source ...`)
    await sleep(DELAY);

    if (startupCommand) {
      terminal.sendText(startupCommand);
    }
  } else {
    terminal.show();
  }

  return terminal;
}

/**
 * Get bench console terminal (auto-starts bench console).
 */
async function getConsoleTerminal() {
  const { consoleTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(consoleTerminalName, getConsoleCommand());
}

/**
 * Get bench execute terminal (plain shell, no startup command).
 */
async function getExecuteTerminal() {
  const { executeTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(executeTerminalName);
}

/**
 * Send text to bench console terminal.
 * @param {...string} lines
 */
async function writeToConsole(...lines) {
  if (!lines || lines.length === 0) return;

  const terminal = await getConsoleTerminal();
  lines.forEach((line) => terminal.sendText(line));
}

/**
 * Send text to bench execute terminal.
 * @param {...string} lines
 */
async function writeToExecuteTerminal(...lines) {
  if (!lines || lines.length === 0) return;

  const terminal = await getExecuteTerminal();
  lines.forEach((line) => terminal.sendText(line));
}

module.exports = {
  writeToConsole,
  writeToExecuteTerminal,
  getConsoleTerminal,
  getExecuteTerminal,
};
