# Sticky Notes - GNOME Shell Extension

A simple, elegant sticky notes manager that lives in your GNOME Shell panel.

![GNOME 46](https://img.shields.io/badge/GNOME-46-blue)
![License](https://img.shields.io/badge/License-GPL--2.0--or--later-green)

## Features

- 📝 **Quick Access** - One-click access from the top panel
- 💾 **Auto-Save** - Notes are automatically saved when the menu closes
- 📋 **Multiple Notes** - Create and manage as many notes as you need
- 🎨 **Clean UI** - Modern, dark-themed interface that matches GNOME

## Installation

### Manual Installation

1. Clone or download this repository to the GNOME extensions folder:

   ```bash
   cd ~/.local/share/gnome-shell/extensions/
   git clone https://github.com/aegisx-dev/stickynotes.git stickynotes@aegisx-dev.github.com
   ```

2. Restart GNOME Shell:
   - **X11**: Press `Alt+F2`, type `r`, press `Enter`
   - **Wayland**: Log out and log back in

3. Enable the extension:
   ```bash
   gnome-extensions enable stickynotes@aegisx-dev.github.com
   ```
   Or use the **Extensions** app.

## Usage

1. Click the 📝 icon in the top panel
2. Click on a note title to edit it
3. Use **+ Add Note** to create new notes
4. Click the 🗑️ icon to delete a note
5. Click **Back** or close the menu to save

## File Structure

```
stickynotes@aegisx-dev.github.com/
├── extension.js    # Main extension logic
├── metadata.json   # Extension metadata
├── stylesheet.css  # UI styling
└── notes.json      # Your saved notes (auto-generated)
```

## Data Storage

Notes are stored in `notes.json` within the extension folder:

```json
[{ "id": "uuid", "title": "Note Title", "content": "Note content..." }]
```

## Requirements

- GNOME Shell 46

## License

GPL-2.0-or-later

## Author

**aegisx-dev** - [GitHub](https://github.com/aegisx-dev)
