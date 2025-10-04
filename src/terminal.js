const vscode = require("vscode");

const CONSOLE_TERMINAL = "Bench Console";
const BENCH_CONSOLE_COMMAND = "bench console --autoreload";
const TERMINAL_NAME = "Bench Execute";

const DELAY = 1500;

/**
 * Get or create a terminal for bench console.
 */
async function getConsoleTerminal() {
  let terminal = vscode.window.terminals.find(
    (t) => t.name === CONSOLE_TERMINAL
  );

  if (!terminal) {
    terminal = vscode.window.createTerminal(CONSOLE_TERMINAL);
    terminal.show();

    // wait for auto `source` to run, then start bench console
    await sleep(DELAY);
    terminal.sendText(BENCH_CONSOLE_COMMAND);
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
  let terminal = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME);
  if (!terminal) {
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
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
