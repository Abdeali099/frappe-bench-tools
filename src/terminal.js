const vscode = require("vscode");
const { getBenchToolConfig, getConsoleCommand } = require("./utils");

const SHELL_INIT_DELAY_MS = 1500;
const BRACKET_START = "\x1b[200~";
const BRACKET_END = "\x1b[201~";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOrCreateTerminal(name, startupCommand = null) {
  try {
    let terminal = vscode.window.terminals.find((t) => t.name === name);

    if (!terminal) {
      terminal = vscode.window.createTerminal(name);
      terminal.show();

      await sleep(SHELL_INIT_DELAY_MS);

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

async function getConsoleTerminal() {
  const { consoleTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(consoleTerminalName, getConsoleCommand());
}

async function getExecuteTerminal() {
  const { executeTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(executeTerminalName);
}

async function getCustomCommandTerminal() {
  const { customCommandTerminalName } = getBenchToolConfig();
  return getOrCreateTerminal(customCommandTerminalName);
}

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

async function writeToTerminal(getTerminal, lines) {
  if (!lines || lines.length === 0) {
    vscode.window.showWarningMessage("No command to execute in terminal.");
    return;
  }

  const terminal = await getTerminal();
  if (!terminal) return;
  lines.forEach((line) => terminal.sendText(line));
}

async function writeToExecuteTerminal(...lines) {
  return writeToTerminal(getExecuteTerminal, lines);
}

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
