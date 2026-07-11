# Column Explorer

A Finder-style Miller-columns file explorer for Obsidian with full file-manager functionality.

![demo](https://raw.githubusercontent.com/YOUR_NAME/obsidian-column-explorer/main/demo.gif)

## Features

- **Miller columns** — click a folder to open its contents in a new column to the right
- **File preview column** — image thumbnails, size, dates, open button
- **All standard file operations** — create notes/folders (with inline rename), rename, trash, duplicate, copy path
- **Full Obsidian context menu** — core & community plugin items (bookmarks, "Reveal in Finder", Copy link, …) are injected via the `file-menu` event
- **Multi-select** — Ctrl/Cmd-click to toggle, Shift-click for range; drag or delete many at once
- **Drag & drop** — move files/folders between columns; drag a file into an editor to insert a link
- **Filter** — live search box that filters files in every column
- **Sort options** — name or modified date, ascending/descending, folders-first toggle
- **Keyboard navigation** — ↑/↓ select, →/← drill in/out, Enter open, F2 rename, Delete trash
- **Persistent state** — selected path survives app restarts
- **Settings tab** — column width, preview toggle, delete confirmation, extension badges
- **Localized** — English and Russian UI

## Install (manual)

Copy `main.js`, `manifest.json`, `styles.css` into `<vault>/.obsidian/plugins/column-explorer/` and enable the plugin.

## Development

```bash
npm install
npm run dev     # watch mode
npm run build   # production build
```

## Releasing

Tag a commit (`git tag 1.1.0 && git push --tags`) — the GitHub Action builds and attaches `main.js`, `manifest.json`, `styles.css` to the release.
