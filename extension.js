const vscode = require("vscode");

// constants
const TERMINAL_NAME = "Bench Console";
const DELAY = 1500;
const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";
const BASE = "frappe-function-tester";
const RUN_IN_BENCH_CONSOLE_COMMAND = `${BASE}.run-in-bench-console`;
const BENCH_CONSOLE_COMMAND = "bench console --autoreload";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand(
    RUN_IN_BENCH_CONSOLE_COMMAND,
    async function () {
      // Step 1: Call the other extension’s command (copy import statement)
      try {
        await vscode.commands.executeCommand(IMPORT_COMMAND);
      } catch (e) {
        vscode.window.showErrorMessage(
          "Failed to copy import statement. Please ensure 'Copy Python Path' extension is installed and try again."
        );
        return;
      }

      // Step 2: Read the import statement from clipboard
      const importStatement = await vscode.env.clipboard.readText();
      if (!importStatement || !importStatement.startsWith("from ")) {
        vscode.window.showErrorMessage(
          "Failed to get a valid import statement."
        );
        return;
      }

      // Step 3: Extract function/class name
      //   TODO: only fetch last name no need of choice beacuse in copy only one import can come at a time
      const parts = importStatement.split("import");
      if (parts.length < 2) {
        vscode.window.showErrorMessage("Invalid import statement format.");
        return;
      }
      let functions = parts[1].split(",").map((f) => f.trim());

      let functionName;
      if (functions.length > 1) {
        functionName = await vscode.window.showQuickPick(functions, {
          placeHolder: "Select function to run",
        });
        if (!functionName) return; // user cancelled
      } else {
        functionName = functions[0];
      }

      // Step 4: Open/reuse terminal
      let terminal = vscode.window.terminals.find(
        (t) => t.name === TERMINAL_NAME
      );

      if (!terminal) {
        terminal = vscode.window.createTerminal(TERMINAL_NAME);
        terminal.show();

        // Wait longer so auto "source ..." finishes
        setTimeout(() => {
          terminal.sendText(BENCH_CONSOLE_COMMAND);

          // Wait again for REPL to boot before sending Python code
          setTimeout(() => {
            terminal.sendText(importStatement);
            terminal.sendText(`${functionName}()`);
          }, DELAY);
        }, DELAY);
      } else {
        terminal.show();
        terminal.sendText(importStatement);
        terminal.sendText(`${functionName}()`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
