const vscode = require("vscode");

const IMPORT_COMMAND = "copy-python-path.copy-python-import-statement";

/**
 * Copies Python import statement using external extension.
 */
async function copyImportStatement() {
  try {
    await vscode.commands.executeCommand(IMPORT_COMMAND);
    const importStatement = await vscode.env.clipboard.readText();
    return importStatement.trim();
  } catch (e) {
    vscode.window.showErrorMessage(
      "Failed to copy import statement. Ensure 'Copy Python Path' extension is installed. Install https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path."
    );
    return null;
  }
}

/**
 * Extract function/class name from import statement.
 * Example: `from module.path import my_function` => "my_function"
 */
function extractName(importStatement, callable = false) {
  const parts = importStatement.split("import");
  if (parts.length < 2) return null;
  const name = parts[1].trim().split(",")[0]; // first name only
  return callable ? `${name}()` : name;
}

module.exports = {
  copyImportStatement,
  extractName,
};
