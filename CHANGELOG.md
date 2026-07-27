# Changelog

All notable changes to Column Explorer are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.11.0] — 2026-07-27

### Added
- **Chinese (Simplified), German, Japanese, Korean and Brazilian Portuguese** translations,
  bringing the plugin to ten languages. As before, the UI follows Obsidian's own language setting.
- The locale test now derives its list from the locale registry, so a newly added language is
  checked for missing keys, empty strings and lost placeholders without touching the test.

### Notes
- Right-to-left languages are deliberately absent: the layout is left-to-right throughout, so
  they need CSS work rather than translations.

## [1.10.0] — 2026-07-27

### Added
- **Spanish, French and Italian** translations, picked up from Obsidian's own language setting.
  Locales now live one per file in `src/locales/`, typed against English so a missing key breaks
  the build. Corrections from native speakers are welcome.

### Fixed
- The commands *New note in current folder* and *New folder in current folder* were missing from
  the command palette until the Column Explorer tab had been clicked at least once. Views in
  unfocused sidebar tabs are deferred on startup, and the availability check required a fully
  loaded view.
- Failed file operations said nothing at all. Creating, moving, duplicating and deleting now
  report the reason, and one failed item no longer aborts the rest of a batch.
- Deleting or moving many files rewrote `data.json` once per file — twice, in fact, since two
  handlers saved independently. Those writes are now coalesced.
- Values loaded from `data.json` are validated: out-of-range column widths, unknown sort modes and
  non-numeric settings fall back to their defaults instead of reaching the UI.

## [1.9.0] — 2026-07-25

### Added
- **Mobile file manager.** Android and iOS get a layout of their own; desktop behaviour is unchanged.
  - One column at a time, with an *up* arrow in the column header
  - Compact toolbar: back, forward, search, create, and a *more* menu (reveal, collapse, sort)
  - Long-press to enter selection mode, with a bottom action bar (move, duplicate, delete, more, cancel)
  - Edge swipe from the left or right screen edge for back and forward
  - Quick Look as a bottom sheet, opened from a file's menu, in place of the preview column
  - HTML5 drag & drop disabled on touch screens — it conflicted with scrolling
- **Adjustable mobile scale** — *Settings → Mobile interface*: interface scale (90–150%) and icon
  size (22–36px), applied live through CSS variables. Touch targets never drop below 44px.

### Fixed
- Column `IntersectionObserver`s were not disconnected before the columns were removed from the
  DOM; an active observer keeps its detached target alive.
- Markdown previews added a child component to the view on every render and never released it,
  keeping every rendered embed alive until the view was closed.
- Quick Look on mobile showed no note content: the staleness guard compared the file against the
  current selection, but the mobile Quick Look is opened from the file menu, where it often is not.
- The debounced recent-files write is now flushed on unload, so files opened in the last two
  seconds still make the list.
- Grid tiles clipped file names on narrow screens.

## [1.8.0] — 2026-07-23

### Added
- Sort by created date and by size, both directions, in the sort menu and in settings
- *Copy wikilink* and *Copy full path* (absolute, shell-escaped; desktop only)
- `Ctrl`/`Cmd`+`A` selects every item in the active column, `Ctrl`/`Cmd`+`D` duplicates
- Commands *New note in current folder* and *New folder in current folder*
- **Favorites** — star files and folders from the context menu or the breadcrumbs bar; they sit
  atop the Bookmarks column and have their own toggle in settings
- Back and forward navigation buttons in the breadcrumbs bar

## [1.7.0] — 2026-07-19

### Added
- Virtual rows in the first column: **Recents**, **Bookmarks** and **Calendar**, positioned at the
  top or the bottom by a setting
- Own recent-files tracker holding up to 50 entries (Obsidian's own stops at 25)
- Bookmarks read from the core Bookmarks plugin, refreshed live
- Calendar column: month grid with per-day created-note badges; click a day to list its notes
- Settings reorganised into groups, with declarative settings on Obsidian 1.13+

### Changed
- The column lock is now released only by its toolbar button, never by navigation

## [1.6.0] — 2026-07-19

### Added
- Import from the OS: drop files from Finder or Explorer into a column to copy them into the vault,
  with numeric suffixes on name clashes

### Changed
- The root column is 60px wider than the rest by default

### Fixed
- The view overflowed its panel by 24px — Obsidian's own `.view-content` padding rule outweighed
  the plugin's selector

## [1.5.0] — 2026-07-15

### Added
- Auto-resizing side panel that follows the total width of the open columns
- Per-column widths by dragging a column's right edge; double-click resets one
- Quick Look on `Space`, as in Finder
- Undo for moves, offered inline in the notice
- Incremental rendering for large folders

### Fixed
- Drag & drop between columns lost its payload when Obsidian's drag manager overwrote `text/plain`

## [1.4.0] — 2026-07-12

### Added
- Per-folder sort overrides
- Custom folder icons (any lucide icon)
- Image thumbnails in the icon grid
- Folder notes — optionally open the note named like its folder
- Media previews (image, audio, video, PDF) in the preview column
- Reorderable pins

## [1.3.3] — 2026-07-12

Accepted into the Obsidian community plugin directory.

[1.11.0]: https://github.com/n23eos/column_explorer/releases/tag/1.11.0
[1.10.0]: https://github.com/n23eos/column_explorer/releases/tag/1.10.0
[1.9.0]: https://github.com/n23eos/column_explorer/releases/tag/1.9.0
[1.8.0]: https://github.com/n23eos/column_explorer/releases/tag/1.8.0
[1.7.0]: https://github.com/n23eos/column_explorer/releases/tag/1.7.0
[1.6.0]: https://github.com/n23eos/column_explorer/releases/tag/1.6.0
[1.5.0]: https://github.com/n23eos/column_explorer/releases/tag/1.5.0
[1.4.0]: https://github.com/n23eos/column_explorer/releases/tag/1.4.0
[1.3.3]: https://github.com/n23eos/column_explorer/releases/tag/1.3.3
