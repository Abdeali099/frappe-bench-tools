const vscode = require("vscode");
const { getBenchToolConfig, getConsoleCommand } = require("./utils");

const DELAY = 1500;
const BRACKET_START = "\x1b[200~";
const BRACKET_END = "\x1b[201~";

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
  try {
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
  } catch (err) {
    vscode.window.showErrorMessage(
      `Error getting or creating terminal: ${err.message}`
    );
  }
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
 * Get custom command terminal (plain shell, no startup command).
 */
async function getCustomCommandTerminal() {
  const { customCommandTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(customCommandTerminalName);
}

/**
 * Send text to bench console terminal.
 * @param {string[]} lines
 * @param {boolean} shouldExecute - whether to execute the commands immediately
 */
async function writeToConsole(lines, shouldExecute = true) {
  if (!lines || lines.length === 0) {
    vscode.window.showWarningMessage("No lines to write to console.");
    return;
  }

  const terminal = await getConsoleTerminal();
  if (!terminal) return;

  lines.forEach((line) =>
    terminal.sendText(`${BRACKET_START}${line}${BRACKET_END}`, shouldExecute)
  );
}

/**
 * Send text to a terminal.
 * @param {function(): Promise<vscode.Terminal>} getTerminal
 * @param {string[]} lines
 */
async function writeToTerminal(getTerminal, lines) {
  if (!lines || lines.length === 0) {
    vscode.window.showWarningMessage("No command to execute in terminal.");
    return;
  }

  const terminal = await getTerminal();
  if (!terminal) return;
  lines.forEach((line) => terminal.sendText(line));
}

/**
 * Send text to bench execute terminal.
 * @param {...string} lines
 */
async function writeToExecuteTerminal(...lines) {
  return writeToTerminal(getExecuteTerminal, lines);
}

/**
 * Send text to custom command terminal.
 * @param {...string} lines
 */
async function writeToCustomCommandTerminal(...lines) {
  return writeToTerminal(getCustomCommandTerminal, lines);
}

module.exports = {
  writeToConsole,
  writeToExecuteTerminal,
  writeToCustomCommandTerminal,
  getConsoleTerminal,
  getExecuteTerminal,
  getCustomCommandTerminal,
};
