const vscode = require("vscode");
const { getBenchToolConfig, getConsoleCommand } = require("./utils");

const DELAY = 1500;

/**
 * Get or create a terminal for bench console.
 */
async function getConsoleTerminal() {
  const terminalName = getBenchToolConfig().consoleTerminalName;
  let terminal = vscode.window.terminals.find((t) => t.name === terminalName);

  if (!terminal) {
    terminal = vscode.window.createTerminal(terminalName);
    terminal.show();

    // wait for auto `source` to run, then start bench console
    await sleep(DELAY);
    terminal.sendText(getConsoleCommand());
  } else {
    terminal.show();
  }

  return terminal;
}

/**
 * Send text to bench console terminal.
 * @param {string[]} lines
 */
async function writeToConsole(...lines) {
  const terminal = await getConsoleTerminal();

  if (!lines || lines.length === 0) return;

  lines.forEach((line) => terminal.sendText(line));
}

/**
 * Get or create a terminal for bench execute.
 * @returns {Promise<vscode.Terminal>}
 */
async function getExecuteTerminal() {
  const terminalName = getBenchToolConfig().executeTerminalName;

  let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
  if (!terminal) {
    terminal = vscode.window.createTerminal(terminalName);
    // wait for auto `source` to run, then start bench console
    await sleep(DELAY);
  }

  terminal.show();

  return terminal;
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  writeToConsole,
  getConsoleTerminal,
  getExecuteTerminal,
};
