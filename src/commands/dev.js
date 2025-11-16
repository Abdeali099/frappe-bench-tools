const vscode = require("vscode");
const utils = require("../utils");
const terminal = require("../terminal");

/** Bench Start
 * - Not require site specification
 */
async function start() {
  const command = ["bench start"];

  await terminal.writeToCommandTerminal(command);
}

/** Bench Restart
 * - Not require site specification
 */
async function restart() {
  const command = ["bench restart"];

  await terminal.writeToCommandTerminal(command);
}
/** Bench Migrate
 */
async function migrate() {
  const config = utils.getBenchToolConfig();
  const command = ["bench"];

  // add site if specified
  if (config.siteName) {
    command.push("--site", config.siteName);
  }

  command.push("migrate");

  await terminal.writeToCommandTerminal(command);
}

/** Browse user
 * @param {string|null} user - user id to login as (optional)
 */
async function browse(user = null) {
  const config = utils.getBenchToolConfig();
  const command = ["bench"];

  // add site if specified
  if (config.siteName) {
    command.push("--site", config.siteName);
  }

  command.push("browse");

  if (!user) {
    // prompt for user
    user = await vscode.window.showInputBox({
      prompt: "Enter user id to login or leave empty for default",
      placeHolder: "Eg. user42@gmail.com",
    });
  }

  if (user) {
    command.push("--user", user);
  }

  await terminal.writeToCommandTerminal(command);
}

/** Browse as Administrator
 */
async function browseAsAdmin() {
  await browse("Administrator");
}

/** Show Bench Update
 * Allows user to select multiple flags for bench update command.
 */
async function update() {
  // Available flags for bench update
  const flags = [
    { label: "--pull", description: "Pull changes in all the apps in bench" },
    {
      label: "--patch",
      description: "Run migrations for all sites in the bench",
    },
    {
      label: "--build",
      description: "Build JS and CSS artifacts for the bench",
    },
    { label: "--bench", description: "Update bench" },
    { label: "--requirements", description: "Update requirements" },
    {
      label: "--restart-supervisor",
      description: "Restart supervisor processes after update",
    },
    { label: "--no-backup", description: "Don't take a backup before update" },
    { label: "--reset", description: "Ignore local changes and update" },
    {
      label: "--dev",
      description: "Enable developer mode and install developer dependencies",
    },
  ];

  // Let user select multiple flags
  const selectedFlags = await vscode.window.showQuickPick(flags, {
    canPickMany: true,
    placeHolder:
      "Select flags for bench update (leave empty for default behavior: backup, pull, setup, build, patch, restart)",
    title: "Bench Update Flags",
  });

  // Build command
  let command = "bench update";

  if (selectedFlags && selectedFlags.length > 0) {
    const flagStrings = selectedFlags.map((flag) => flag.label);
    command += " " + flagStrings.join(" ");
  }

  await terminal.writeToCommandTerminal([command]);
}

/** Upgrade Frappe Bench CLI tool
 */
async function upgradeBenchCLI() {
  // ask user for confirmation
  const confirm = await vscode.window.showWarningMessage(
    "Are you sure you want to upgrade the Frappe Bench CLI tool?",
    { modal: true },
    "Yes",
    "No"
  );

  if (confirm !== "Yes") {
    return;
  }

  const command = ["pip3 install --upgrade frappe-bench"];
  await terminal.writeToCommandTerminal(command);
}

module.exports = {
  start,
  restart,
  migrate,
  update,
  browse,
  browseAsAdmin,
  upgradeBenchCLI,
};
