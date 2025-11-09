const vscode = require("vscode");
const utils = require("../utils");
const terminal = require("../terminal");

/** Open bench console terminal.
 */
async function openConsole() {
  await terminal.getConsoleTerminal();
}

/** Paste selected text or current lines to bench console terminal.
 */
async function pasteSelectionToConsole() {
  const texts = utils.getSelectedTextOrLines();

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await terminal.writeToConsole(texts, false);
}

/** Paste clipboard text to bench console terminal.
 */
async function pasteClipboardToConsole() {
  let texts = [];

  const clipboardText = await vscode.env.clipboard.readText();
  if (clipboardText) texts = clipboardText.split(/\r?\n/);

  if (!texts.length) {
    vscode.window.showInformationMessage("Nothing to paste.");
    return;
  }

  await terminal.writeToConsole(texts, false);
}

/** Import object in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function importObject() {
  const importStatement = await utils.copyImportStatement();

  if (!utils.isValidImportStatement(importStatement)) return;

  await terminal.writeToConsole([importStatement]);
}

/** Import all (*) in bench console terminal.
 */
async function importAll() {
  // user input not required here
  const importStatement = await utils.copyImportStatement(false);

  if (!utils.isValidImportStatement(importStatement)) return;

  await terminal.writeToConsole([utils.convertToImportAll(importStatement)]);
}

async function importAs() {
  let importStatement = await utils.copyImportStatement();

  if (!utils.isValidImportStatement(importStatement)) return;

  const alias = await vscode.window.showInputBox({
    prompt: "Enter alias for import",
    placeHolder: "e.g. my_alias",
  });

  importStatement = utils.convertToImportAs(importStatement, alias);

  await terminal.writeToConsole([importStatement]);
}

/** Run function in bench console terminal.
 * If no valid import statement is found, user is prompted to enter one.
 */
async function runFunction() {
  const importStatement = await utils.copyImportStatement();

  if (!utils.isValidImportStatement(importStatement)) return;

  const lines = [importStatement];

  const name = utils.extractObjName(importStatement, true);
  if (name) lines.push(name);

  await terminal.writeToConsole(lines);
}

/** Execute command in bench execute terminal.
 * Prompts for args and kwargs if enabled in settings.
 */
async function benchExecute() {
  // Try to get python path from selection or clipboard
  let pythonPath = await utils.copyPythonPath();

  if (!pythonPath) {
    vscode.window.showInformationMessage("No Python path found.");
    return;
  }

  const { acceptArgsForExecute, acceptKwargsForExecute } =
    utils.getBenchToolConfig();

  let args = null;
  let kwargs = null;

  // Prompt for args (optional)
  if (acceptArgsForExecute) {
    args = await vscode.window.showInputBox({
      prompt: 'Enter args as Python list (e.g. ["a", "b", "c"]) or leave blank',
      placeHolder: '["a", "b", "c"]',
    });
  }

  args = args ? args.trim() : null;

  // Prompt for kwargs (optional)
  if (acceptKwargsForExecute) {
    kwargs = await vscode.window.showInputBox({
      prompt:
        'Enter kwargs as Python dict (e.g. {"key": "val"}) or leave blank',
      placeHolder: '{"key": "val"}',
    });
  }

  kwargs = kwargs ? kwargs.trim() : null;

  // Build command
  const cmd = utils.getExecuteCommand(pythonPath, args, kwargs);

  // Use a dedicated terminal for bench execute
  await terminal.writeToExecuteTerminal([cmd]);
}

module.exports = {
  openConsole,
  pasteSelectionToConsole,
  pasteClipboardToConsole,
  importObject,
  importAll,
  importAs,
  runFunction,
  benchExecute,
};
