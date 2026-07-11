# Column Explorer

A Finder-style Miller-columns file explorer for Obsidian with full file-manager functionality.

## Features

- **Miller columns** — click a folder to open its contents in a new column to the right
- **Breadcrumbs** — clickable path bar for quick jumps to any ancestor folder
- **File preview column** — image thumbnails, note content preview, size, dates, open button
- **All standard file operations** — create notes/folders (with inline rename), rename, trash, duplicate, move to folder, copy path
- **Full Obsidian context menu** — core & community plugin items (bookmarks, "Reveal in Finder", Copy link, …) are injected via the `file-menu` event
- **Multi-select** — Ctrl/Cmd-click to toggle, Shift-click for range; move, duplicate, delete or drag many at once
- **Drag & drop** — move files/folders between columns or straight onto a folder row; drag a file into an editor to insert a link
- **Filter** — live search box that filters files in every column
- **Excluded files** — hide files and folders by patterns (`*.tmp`, `archive/`, `.trash`)
- **Sort options** — name or modified date, ascending/descending, folders-first toggle
- **Keyboard navigation** — ↑/↓ select, →/← drill in/out, Home/End/PageUp/PageDown, type-ahead (start typing to jump), Enter open, F2 rename, Delete trash
- **Resizable columns** — drag the right edge of any column
- **Auto-reveal** — optionally follow the active editor tab
- **Persistent state** — selected path survives app restarts
- **Localized** — English and Russian UI

## Install (manual)

Copy `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/N23eos/column_explorer/releases/latest) into `<vault>/.obsidian/plugins/column-explorer/` and enable the plugin in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # watch mode
npm run build   # typecheck + production build
npm test        # unit tests (vitest)
npm run lint    # eslint
```

The code lives in `src/`:

| Module | Responsibility |
|--------|----------------|
| `main.ts` | plugin entry, commands, view registration |
| `view.ts` | columns view: state, rendering orchestration, keyboard |
| `column.ts` | single column rendering with delegated events |
| `preview.ts` | file preview column |
| `dnd.ts` | drag & drop |
| `menus.ts` | context menus |
| `fileops.ts` | move/duplicate/trash operations |
| `modals.ts` | confirm & folder-picker modals |
| `settings.ts` | settings tab |
| `i18n.ts` | translations |
| `pure.ts` | pure helpers (unit-tested) |

## Releasing

```bash
npm version minor   # bumps package.json, manifest.json, versions.json
git push && git push --tags
```

The GitHub Action builds and attaches `main.js`, `manifest.json`, `styles.css` to the release.

## License

MIT
