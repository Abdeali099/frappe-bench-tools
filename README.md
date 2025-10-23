<div align="center">
  <img src="./assets/images/icon.png">
    <h2>Frappe Bench Tools</h2>
</div>

- Use Frappe Bench commands directly from VS Code to enhance your Frappe development workflow.  

- This extension provides quick access to the Frappe Bench console, imports, and execution utilities.

## 📑 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commands](#commands)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

### 🧭 Open Bench Console

Open or switch to a Frappe Bench console terminal directly from VS Code.

https://github.com/user-attachments/assets/0031cf18-6895-499f-81d2-7893ce83bec5

### 📋 Paste to Bench Console

- Paste selected code directly into the Bench console.  
- If no selection, paste the current line where the cursor is located.

https://github.com/user-attachments/assets/06092722-e9d5-40cc-9ab4-cd3407ac530e

### 📄 Paste Clipboard to Bench Console

Paste content directly from the clipboard to the Bench console.

https://github.com/user-attachments/assets/313fe096-7834-434b-87ba-b0eede75f1ad

### 📦 Import in Bench Console

Import functions, classes, or variables by placing the cursor on them.

https://github.com/user-attachments/assets/8b46788b-0ce8-4b54-b6b7-0858e52804a5

### 🌐 Import All in Bench Console

Import all exports from a module using:

```py
from module import *
```

https://github.com/user-attachments/assets/07a5b9a7-030a-4857-9123-c72d0be470ae

### 🏷️ Import As in Bench Console

Import with a custom alias — prompted for an alias name.

https://github.com/user-attachments/assets/2c9f2d59-7e8b-465f-bf2a-ac93bb69292c

### ⚡ Run Function in Bench Console

Automatically import and execute a function by placing the cursor on its definition.

https://github.com/user-attachments/assets/517d9c87-4ba7-444c-b204-3adaf6b52809

### 🧩 Bench Execute Python Function

Execute a Python function using:

```bash
bench --site <site> execute <path.to.function>
```

- Optionally provide `args` and `kwargs` interactively.
- Perfect for testing patches.

https://github.com/user-attachments/assets/ebd68e61-408c-4c70-8b40-2df107442d87

### 🖱️ Context Menu Integration

Access all features through a dedicated **“Frappe Bench”** submenu in the right-click context menu.

![Context Menu](./assets/images/context-menu.png)

## Prerequisites

Before using the extension, make sure you have the following:

### Required

1. **VS Code Extension** – [Copy Python Path](https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path)
   Used to generate Python import statements automatically.

2. **Frappe Bench Environment**

   - You must have a working Frappe Bench setup.
   - The `bench` command should be available in your system PATH.

3. **Single App Workspace**

   - Open your Frappe app as a **single workspace** in VS Code for correct module path resolution.

## Installation

### From VS Code Marketplace

1. Open VS Code.
2. Go to **Extensions** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd>).
3. Search for **"Frappe Bench Tools"**.
4. Click **Install**.

### From Command Line

```bash
code --install-extension abdeali.frappe-bench-tools
```

## Configuration

Configure the extension from VS Code settings (<kbd>Ctrl</kbd>+<kbd>,</kbd> or <kbd>Cmd</kbd>+<kbd>,</kbd>).

### 🧱 General Settings

#### `frappeBenchTools.siteName`

- **Type**: `string`
- **Default**: `"frappe.localhost"`
- **Description**: Site name for running Bench commands.

**Example:**

```json
{
  "frappeBenchTools.siteName": "my-site.localhost"
}
```

### 💻 Console Settings

#### `frappeBenchTools.consoleTerminalName`

- **Type**: `string`
- **Default**: `"Bench Console"`
- **Description**: Terminal name for console operations.

#### `frappeBenchTools.autoReload`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Use `--autoreload` to auto-reload the console on file changes.

**Example:**

```json
{
  "frappeBenchTools.consoleTerminalName": "My Frappe Console",
  "frappeBenchTools.autoReload": true
}
```

### ⚙️ Execute Settings

#### `frappeBenchTools.executeTerminalName`

- **Type**: `string`
- **Default**: `"Bench Execute"`
- **Description**: Terminal name for bench execute operations.

#### `frappeBenchTools.acceptArgsForExecute`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Prompt for list arguments, e.g., `["arg1", "arg2"]`.

#### `frappeBenchTools.acceptKwargsForExecute`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Prompt for dictionary kwargs, e.g., `{"key": "value"}`.

**Example:**

```json
{
  "frappeBenchTools.executeTerminalName": "Frappe Executor",
  "frappeBenchTools.acceptArgsForExecute": true,
  "frappeBenchTools.acceptKwargsForExecute": true
}
```

![Configs](./assets/images/configs.png)

## Commands

All commands are available from the **Command Palette** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> / <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>):

| Command                            | Description                                    |
|------------------------------------|------------------------------------------------|
| `Open Bench Console`               | Open or switch to the bench console terminal   |
| `Paste to Bench Console`           | Paste selected text or current line to console |
| `Paste Clipboard to Bench Console` | Paste clipboard content to console             |
| `Import in Bench Console`          | Generate and execute import statement          |
| `Import All in Bench Console`      | Import all exports from module                 |
| `Import As in Bench Console`       | Import with custom alias                       |
| `Run Function in Bench Console`    | Import and execute function                    |
| `Bench Execute Python Function`    | Execute function using bench execute command   |

## Troubleshooting

### ⚠️ “Copy Python Path extension is not installed”

Install the dependency: [Copy Python Path](https://marketplace.visualstudio.com/items?itemName=kawamataryo.copy-python-dotted-path)

### 💥 Terminal not responding

Close the terminal and re-run the command — a new terminal will be created automatically.

### 🧩 Import statements not working

Ensure your Python files are inside a valid Frappe app structure with correct module paths.

### 🎯 Import not detecting object

Place the cursor exactly on the **function, class, or variable** name before running the import or run commands.

## Contributing

Contributions are welcome!
Feel free to submit a **Pull Request** or open an **Issue** on GitHub.

## License

Licensed under the [MIT License](LICENSE).

## Support

For issues, suggestions, or feature requests —
visit the [GitHub repository](https://github.com/Abdeali099/frappe-bench-tools).
