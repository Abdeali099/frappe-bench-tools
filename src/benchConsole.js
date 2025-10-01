const vscode = require("vscode");

const TERMINAL_NAME = "Bench Console";
const BENCH_CONSOLE_COMMAND = "bench console --autoreload";
const DELAY = 1500;

/**
 * Get or create a terminal for bench console.
 */
async function getBenchTerminal() {
  let terminal = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME);

  if (!terminal) {
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
    terminal.show();

    // wait for auto `source` to run, then start bench console
    await sleep(DELAY);
    terminal.sendText(BENCH_CONSOLE_COMMAND);
    await sleep(DELAY);
  } else {
    terminal.show();
  }

  return terminal;
}

/**
 * Send text to bench console terminal.
 */
async function sendToBenchConsole(...lines) {
  const terminal = await getBenchTerminal();
  lines.forEach((line) => terminal.sendText(line));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  sendToBenchConsole,
};
