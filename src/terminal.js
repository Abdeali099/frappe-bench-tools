const vscode = require("vscode");
const {
  getBenchToolConfig,
  getConsoleCommand,
  resolvePlaceholderValues,
  SITE,
} = require("./utils");

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
 * @param {(function(): Promise<string|null>)|null} getStartupCommand - command
 *   to run after creation, built only when the terminal is created, so that
 *   nothing is asked for a terminal that is already open
 * @returns {Promise<vscode.Terminal>}
 */
async function getOrCreateTerminal(name, getStartupCommand = null) {
  try {
    let terminal = vscode.window.terminals.find((t) => t.name === name);

    if (!terminal) {
      // "" when there is nothing to run, null when the command was cancelled
      const startupCommand = getStartupCommand ? await getStartupCommand() : "";

      // cancelled, so that no terminal is left behind for a command that was
      // never going to run
      if (startupCommand === null) return;

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

  return getOrCreateTerminal(consoleTerminalName, async () => {
    // the site is only used to start the console, so it is asked for here
    const values = await resolvePlaceholderValues([SITE], true);
    return values && getConsoleCommand(values);
  });
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
