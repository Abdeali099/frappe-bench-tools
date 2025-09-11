const vscode = require("vscode");
const { copyImportStatement, extractName } = require("./utils");
const { sendToBenchConsole } = require("./benchConsole");

const BASE = "frappe-function-tester";
const RUN_SINGLE_COMMAND = `${BASE}.run-in-bench-console`;
const IMPORT_ALL_COMMAND = `${BASE}.import-all-in-bench-console`;

/**
 * Register all extension commands.
 */
function registerCommands(context) {
  // 1. Run single function (import + paste function name)
  const runSingle = vscode.commands.registerCommand(
    RUN_SINGLE_COMMAND,
    async () => {
      const importStatement = await copyImportStatement();
      if (!importStatement || !importStatement.startsWith("from ")) return;

      const name = extractName(importStatement);
      if (!name) {
        vscode.window.showErrorMessage("Could not extract function/class name.");
        return;
      }

      await sendToBenchConsole([importStatement, name]);
    }
  );

  // 2. Import all (only import statement, no function name)
  const importAll = vscode.commands.registerCommand(
    IMPORT_ALL_COMMAND,
    async () => {
      let  importStatement = await copyImportStatement();
      if (!importStatement || !importStatement.startsWith("from ")) return;

      // change last word to `*`
      const parts = importStatement.split("import");
      parts[parts.length - 1] = " *";
      importStatement = parts.join("import");

      await sendToBenchConsole(importStatement);
    }
  );

  context.subscriptions.push(runSingle, importAll);
}

module.exports = { registerCommands };
