"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ColumnExplorerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian12 = require("obsidian");

// src/i18n.ts
var import_obsidian = require("obsidian");

// src/pure.ts
var collator = new Intl.Collator(void 0, { numeric: true, sensitivity: "base" });
function naturalCompare(a, b) {
  return collator.compare(a, b);
}
function splitMatch(name, query) {
  if (!query) return null;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  return [name.slice(0, idx), name.slice(idx, idx + query.length), name.slice(idx + query.length)];
}
function humanSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return value.toFixed(1) + " " + units[unitIndex];
}
function shellEscapePath(path) {
  return path.replace(/[^\p{L}\p{N}_./-]/gu, "\\$&");
}
function formatTemplate(template, vars) {
  let result = template;
  for (const key of Object.keys(vars)) {
    result = result.replace("{" + key + "}", String(vars[key]));
  }
  return result;
}
function parseExcludePatterns(raw) {
  return raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
}
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp("^" + escaped + "$");
}
function remapPathKeys(record, oldPath, newPath) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === oldPath) result[newPath] = value;
    else if (key.startsWith(oldPath + "/")) result[newPath + key.slice(oldPath.length)] = value;
    else result[key] = value;
  }
  return result;
}
function prunePathKeys(record, deletedPath) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === deletedPath || key.startsWith(deletedPath + "/")) continue;
    result[key] = value;
  }
  return result;
}
function pinnedFirst(items, orderOf) {
  const pinned = [];
  const rest = [];
  for (const item of items) {
    const order = orderOf(item);
    if (order === void 0) rest.push(item);
    else pinned.push({ item, order });
  }
  pinned.sort((a, b) => a.order - b.order);
  return [...pinned.map((p) => p.item), ...rest];
}
function movePinnedBefore(pinned, dragPath, targetPath) {
  if (pinned[dragPath] === void 0 || pinned[targetPath] === void 0 || dragPath === targetPath) {
    return { ...pinned };
  }
  const ordered = Object.keys(pinned).sort((a, b) => pinned[a] - pinned[b]).filter((p) => p !== dragPath);
  ordered.splice(ordered.indexOf(targetPath), 0, dragPath);
  const result = {};
  ordered.forEach((path, i) => {
    result[path] = i;
  });
  return result;
}
function lockedColumnVisible(depth, folderColumns, lockedCount) {
  if (lockedCount === null) return true;
  return depth < Math.max(1, lockedCount) - 1 || depth === folderColumns - 1;
}
function parseDragPaths(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [raw];
  } catch (e) {
    return [raw];
  }
}
var MAX_PANEL_WINDOW_RATIO = 0.6;
function desiredPanelWidth(contentWidth, windowWidth, minWidth) {
  const capped = Math.min(contentWidth, windowWidth * MAX_PANEL_WINDOW_RATIO);
  return Math.max(minWidth, capped);
}
function availablePath(folderPath, fileName, taken) {
  const prefix = folderPath ? folderPath + "/" : "";
  if (!taken.has(prefix + fileName)) return prefix + fileName;
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
  let counter = 1;
  while (taken.has(`${prefix}${base} ${counter}${ext}`)) counter++;
  return `${prefix}${base} ${counter}${ext}`;
}
var RECENTS_PATH = "::recents::";
var BOOKMARKS_PATH = "::bookmarks::";
var CALENDAR_PATH = "::calendar::";
var DAY_PATH_PREFIX = "::day::";
function dayKey(ts) {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
function monthGrid(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(dayKey(new Date(year, month, day).getTime()));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
function pushRecent(list, path, limit) {
  return [path, ...list.filter((p) => p !== path)].slice(0, limit);
}
function remapPathList(list, oldPath, newPath) {
  return list.map((p) => {
    if (p === oldPath) return newPath;
    if (p.startsWith(oldPath + "/")) return newPath + p.slice(oldPath.length);
    return p;
  });
}
function takeFirstExisting(paths, exists, limit) {
  const result = [];
  for (const path of paths) {
    if (result.length >= limit) break;
    if (exists(path)) result.push(path);
  }
  return result;
}
var EDGE_ZONE_PX = 24;
var SWIPE_MIN_DISTANCE_PX = 60;
var SWIPE_RATIO = 1.5;
function detectEdgeSwipe(swipe) {
  const dx = swipe.endX - swipe.startX;
  const dy = swipe.endY - swipe.startY;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return null;
  if (Math.abs(dx) < SWIPE_RATIO * Math.abs(dy)) return null;
  if (dx > 0 && swipe.startX <= EDGE_ZONE_PX) return "back";
  if (dx < 0 && swipe.startX >= swipe.containerWidth - EDGE_ZONE_PX) return "forward";
  return null;
}
var MIN_TOUCH_TARGET_PX = 44;
var MIN_MOBILE_SCALE = 90;
var MAX_MOBILE_SCALE = 150;
var DEFAULT_MOBILE_SCALE = 115;
var MIN_MOBILE_ICON = 22;
var MAX_MOBILE_ICON = 36;
var DEFAULT_MOBILE_ICON = 28;
function clampOrDefault(value, min, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
function normalizeMobileSettings(raw) {
  return {
    mobileUiScale: clampOrDefault(raw.mobileUiScale, MIN_MOBILE_SCALE, MAX_MOBILE_SCALE, DEFAULT_MOBILE_SCALE),
    mobileIconSize: clampOrDefault(raw.mobileIconSize, MIN_MOBILE_ICON, MAX_MOBILE_ICON, DEFAULT_MOBILE_ICON)
  };
}
function mobileControlSize(scale, containerWidth, buttonCount) {
  const configured = Math.round(MIN_TOUCH_TARGET_PX * scale);
  const available = containerWidth > 0 ? Math.floor(containerWidth / buttonCount) : configured;
  return Math.max(MIN_TOUCH_TARGET_PX, Math.min(configured, available));
}
var LONG_PRESS_MS = 500;
var LONG_PRESS_TOLERANCE_PX = 10;
function exceedsMoveTolerance(dx, dy) {
  return Math.hypot(dx, dy) > LONG_PRESS_TOLERANCE_PX;
}
function nextPressPhase(phase, event) {
  switch (event.type) {
    case "down":
      return "pending";
    case "move":
      return phase === "pending" && exceedsMoveTolerance(event.dx, event.dy) ? "cancelled" : phase;
    case "timeout":
      return phase === "pending" ? "fired" : phase;
    case "up":
      return phase === "pending" ? "cancelled" : phase;
    case "cancel":
      return "cancelled";
    case "click":
      return phase === "fired" ? "idle" : phase;
  }
}
function mobileTapAction(state) {
  if (state.pressPhase === "fired") return "suppress";
  return state.selectionMode ? "toggle" : "activate";
}
function mobileSelectionMode(active, selectedCount) {
  return active && selectedCount > 0;
}
function parentSelection(selection, isFolder) {
  const isColumnRoot = (path) => path.startsWith("::") || isFolder(path);
  for (let i = selection.length - 1; i >= 0; i--) {
    if (isColumnRoot(selection[i])) return selection.slice(0, i);
  }
  return null;
}
function matchesExcludePatterns(path, patterns) {
  var _a;
  if (patterns.length === 0) return false;
  const name = (_a = path.split("/").pop()) != null ? _a : path;
  return patterns.some((pattern) => {
    if (pattern.endsWith("/")) {
      const base = pattern.slice(0, -1);
      return path === base || path.startsWith(base + "/");
    }
    if (pattern.includes("*")) {
      return globToRegExp(pattern).test(name);
    }
    return path.includes(pattern);
  });
}
function errorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}
var MIN_COLUMN_WIDTH = 140;
var MAX_COLUMN_WIDTH = 500;
var DEFAULT_COLUMN_WIDTH = 200;
var ROOT_COLUMN_EXTRA_WIDTH = 60;
var MIN_RECENT_FILES = 5;
var MAX_RECENT_FILES = 50;
var DEFAULT_RECENT_FILES = 10;
var SORT_MODE_VALUES = [
  "name-asc",
  "name-desc",
  "mtime-desc",
  "mtime-asc",
  "ctime-desc",
  "ctime-asc",
  "size-desc",
  "size-asc"
];
var SPECIAL_POSITIONS = ["top", "bottom"];
function clampInt(value, min, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
function oneOf(value, allowed, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function cleanWidths(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    if (raw < MIN_COLUMN_WIDTH || raw > MAX_COLUMN_WIDTH) continue;
    result[key] = Math.round(raw);
  }
  return result;
}
function normalizeSettings(raw) {
  const locked = raw.lockedColumnCount;
  return {
    columnWidth: clampInt(raw.columnWidth, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH),
    columnWidths: cleanWidths(raw.columnWidths),
    recentFilesCount: clampInt(raw.recentFilesCount, MIN_RECENT_FILES, MAX_RECENT_FILES, DEFAULT_RECENT_FILES),
    // null — режим «показывать все колонки», это валидное значение
    lockedColumnCount: typeof locked === "number" && Number.isFinite(locked) ? Math.max(1, Math.round(locked)) : null,
    sortMode: oneOf(raw.sortMode, SORT_MODE_VALUES, "name-asc"),
    specialItemsPosition: oneOf(raw.specialItemsPosition, SPECIAL_POSITIONS, "top")
  };
}

// src/locales/en.ts
var en = {
  newNote: "New note",
  newFolder: "New folder",
  reveal: "Reveal active file",
  collapse: "Collapse to root",
  search: "Filter files\u2026",
  sort: "Sort order",
  empty: "Empty",
  noResults: "No matches",
  open: "Open",
  openNewTab: "Open in new tab",
  openRight: "Open to the right",
  duplicate: "Duplicate",
  rename: "Rename",
  delete: "Delete",
  deleteN: "Delete {n} items",
  duplicateN: "Duplicate {n} items",
  moveTo: "Move to folder\u2026",
  moveToPlaceholder: "Choose target folder\u2026",
  copyPath: "Copy path",
  copyFullPath: "Copy full path",
  pathCopied: "Path copied",
  untitled: "Untitled",
  newFolderName: "New folder",
  cantMoveIntoSelf: "Cannot move a folder into itself",
  alreadyExists: "\u201C{name}\u201D already exists in the target folder",
  renameFailed: "Rename failed: ",
  createFailed: "Could not create \u201C{name}\u201D: {error}",
  moveFailed: "Could not move \u201C{name}\u201D: {error}",
  duplicateFailed: "Could not duplicate \u201C{name}\u201D: {error}",
  deleteFailed: "Could not delete \u201C{name}\u201D: {error}",
  modified: "Modified",
  created: "Created",
  sortNameAsc: "Name (A \u2192 Z)",
  sortNameDesc: "Name (Z \u2192 A)",
  sortMtimeDesc: "Modified (newest first)",
  sortMtimeAsc: "Modified (oldest first)",
  sortCtimeDesc: "Created (newest first)",
  sortCtimeAsc: "Created (oldest first)",
  sortSizeDesc: "Size (largest first)",
  sortSizeAsc: "Size (smallest first)",
  confirmDeleteTitle: "Delete",
  confirmDeleteOne: "Delete \u201C{name}\u201D?",
  confirmDeleteMany: "Delete {n} items?",
  confirm: "Delete",
  cancel: "Cancel",
  itemsMoved: "{n} items moved",
  undo: "Undo",
  filesImported: "{n} files imported",
  importFailed: "Failed to import \u201C{name}\u201D",
  cmdOpen: "Open column explorer",
  cmdReveal: "Reveal active file in columns",
  cmdNewNote: "New note in current folder",
  cmdNewFolder: "New folder in current folder",
  setFoldersFirst: "Folders first",
  setFoldersFirstDesc: "Always list folders above files.",
  setShowExt: "Show extension badges",
  setShowExtDesc: "Show a small badge with the file extension for non-Markdown files.",
  setPreview: "Show file preview column",
  setPreviewDesc: "Show a details column when a file is selected.",
  setMdPreview: "Preview note content",
  setMdPreviewDesc: "Render the beginning of Markdown notes in the preview column.",
  setConfirmDelete: "Confirm before deleting",
  setConfirmDeleteDesc: "Ask for confirmation before moving files to trash.",
  setColWidth: "Default column width",
  setColWidthDesc: "In pixels. Drag a column's right edge to resize that column; double-click the edge to reset it.",
  setAutoPanel: "Auto-resize panel",
  setAutoPanelDesc: "Grow and shrink the sidebar panel to fit all open columns, keeping the column width fixed.",
  setSort: "Default sort order",
  setAutoReveal: "Auto-reveal active file",
  setAutoRevealDesc: "Follow the active editor tab and select its file in the columns.",
  setExclude: "Excluded files",
  setExcludeDesc: "Comma-separated patterns to hide, e.g. \u201C*.tmp, archive/, .trash\u201D.",
  folderColor: "Folder color",
  colorDefault: "Default",
  colorRed: "Red",
  colorOrange: "Orange",
  colorYellow: "Yellow",
  colorGreen: "Green",
  colorCyan: "Cyan",
  colorBlue: "Blue",
  colorPurple: "Purple",
  colorPink: "Pink",
  viewAsList: "View as list",
  viewAsGrid: "View as icons",
  pin: "Pin to top",
  unpin: "Unpin",
  newCanvas: "New canvas",
  copyWikiLink: "Copy wikilink",
  copyMdLink: "Copy Markdown link",
  copyObsidianUrl: "Copy Obsidian URL",
  linkCopied: "Link copied",
  sortDefault: "Default sort",
  folderIcon: "Folder icon\u2026",
  folderIconReset: "Reset folder icon",
  iconPlaceholder: "Choose an icon\u2026",
  setFolderNote: "Open folder notes",
  setFolderNoteDesc: "Selecting a folder also opens the note with the same name inside it, when one exists.",
  lockPanel: "Lock column count",
  unlockPanel: "Unlock columns",
  recents: "Recents",
  setRecentCount: "Recent files count",
  setRecentCountDesc: "How many files the \u201CRecents\u201D column shows.",
  headAppearance: "Appearance",
  headBehavior: "Behavior",
  headColumns: "Columns",
  setShowRecents: "Show recents",
  setShowRecentsDesc: "Show the recents row at the top of the first column.",
  resetWidths: "Reset all column widths",
  resetWidthsDesc: "Forget individually dragged widths and use the default width everywhere.",
  widthsReset: "Column widths reset",
  reset: "Reset",
  clearRecents: "Clear recent files",
  clearRecentsDesc: "Remove all entries from the recents list.",
  recentsCleared: "Recent files cleared",
  clear: "Clear",
  bookmarks: "Bookmarks",
  calendar: "Calendar",
  favorites: "Favorites",
  addFavorite: "Add to favorites",
  removeFavorite: "Remove from favorites",
  favoriteAdded: "Path added to favorites",
  favoriteRemoved: "Removed from favorites",
  setShowFavorites: "Show favorites",
  setShowFavoritesDesc: "Show your saved favorite files and folders at the top of the Bookmarks column.",
  headSpecial: "Special items",
  setShowBookmarks: "Show bookmarks",
  setShowBookmarksDesc: "Show the bookmarks row (needs the core Bookmarks plugin).",
  setShowCalendar: "Show calendar",
  setShowCalendarDesc: "Show the calendar row: notes by creation day.",
  setSpecialPos: "Special items position",
  setSpecialPosDesc: "Where the recents, bookmarks and calendar rows sit in the first column.",
  posTop: "Top",
  posBottom: "Bottom",
  today: "Today",
  navBack: "Back",
  navForward: "Forward",
  navUp: "Go to parent folder",
  create: "Create",
  more: "More actions",
  preview: "Preview",
  close: "Close",
  selectedN: "{n} selected",
  cancelSelection: "Cancel selection",
  headMobile: "Mobile interface",
  setMobileScale: "Mobile interface scale",
  setMobileScaleDesc: "Changes the size of rows, controls, text and spacing on phones and tablets.",
  setMobileIcon: "Mobile button icon size",
  setMobileIconDesc: "Changes toolbar, navigation and action-bar icons. File and folder icons are not affected.",
  resetMobileSizes: "Reset mobile sizes",
  mobileSizesReset: "Mobile sizes reset"
};

// src/locales/ru.ts
var ru = {
  newNote: "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430",
  newFolder: "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430",
  reveal: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0444\u0430\u0439\u043B",
  collapse: "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043A \u043A\u043E\u0440\u043D\u044E",
  search: "\u0424\u0438\u043B\u044C\u0442\u0440 \u0444\u0430\u0439\u043B\u043E\u0432\u2026",
  sort: "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430",
  empty: "\u041F\u0443\u0441\u0442\u043E",
  noResults: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
  open: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C",
  openNewTab: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435",
  openRight: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u0430",
  duplicate: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  rename: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C",
  delete: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
  deleteN: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C {n} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432",
  duplicateN: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: {n}",
  moveTo: "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432 \u043F\u0430\u043F\u043A\u0443\u2026",
  moveToPlaceholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443\u2026",
  copyPath: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0443\u0442\u044C",
  copyFullPath: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u043D\u044B\u0439 \u043F\u0443\u0442\u044C",
  pathCopied: "\u041F\u0443\u0442\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D",
  untitled: "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
  newFolderName: "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430",
  cantMoveIntoSelf: "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0432\u043D\u0443\u0442\u0440\u044C \u0441\u0430\u043C\u043E\u0439 \u0441\u0435\u0431\u044F",
  alreadyExists: "\u0412 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u043F\u0430\u043F\u043A\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \xAB{name}\xBB",
  renameFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C: ",
  createFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \xAB{name}\xBB: {error}",
  moveFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \xAB{name}\xBB: {error}",
  duplicateFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u044E \xAB{name}\xBB: {error}",
  deleteFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \xAB{name}\xBB: {error}",
  modified: "\u0418\u0437\u043C\u0435\u043D\u0451\u043D",
  created: "\u0421\u043E\u0437\u0434\u0430\u043D",
  sortNameAsc: "\u0418\u043C\u044F (\u0410 \u2192 \u042F)",
  sortNameDesc: "\u0418\u043C\u044F (\u042F \u2192 \u0410)",
  sortMtimeDesc: "\u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u044B\u0435)",
  sortMtimeAsc: "\u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u0442\u0430\u0440\u044B\u0435)",
  sortCtimeDesc: "\u0414\u0430\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u044B\u0435)",
  sortCtimeAsc: "\u0414\u0430\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u0442\u0430\u0440\u044B\u0435)",
  sortSizeDesc: "\u0420\u0430\u0437\u043C\u0435\u0440 (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0431\u043E\u043B\u044C\u0448\u0438\u0435)",
  sortSizeAsc: "\u0420\u0430\u0437\u043C\u0435\u0440 (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0435)",
  confirmDeleteTitle: "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435",
  confirmDeleteOne: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \xAB{name}\xBB?",
  confirmDeleteMany: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: {n}?",
  confirm: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
  cancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
  itemsMoved: "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: {n}",
  undo: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
  filesImported: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0444\u0430\u0439\u043B\u043E\u0432: {n}",
  importFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \xAB{name}\xBB",
  cmdOpen: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A-\u043A\u043E\u043B\u043E\u043D\u043A\u0438",
  cmdReveal: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u0432 \u043A\u043E\u043B\u043E\u043D\u043A\u0430\u0445",
  cmdNewNote: "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u043F\u0430\u043F\u043A\u0435",
  cmdNewFolder: "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u043F\u0430\u043F\u043A\u0435",
  setFoldersFirst: "\u041F\u0430\u043F\u043A\u0438 \u0441\u0432\u0435\u0440\u0445\u0443",
  setFoldersFirstDesc: "\u0412\u0441\u0435\u0433\u0434\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0438 \u0432\u044B\u0448\u0435 \u0444\u0430\u0439\u043B\u043E\u0432.",
  setShowExt: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F",
  setShowExtDesc: "\u041D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0431\u0435\u0439\u0434\u0436 \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C \u0443 \u043D\u0435-Markdown \u0444\u0430\u0439\u043B\u043E\u0432.",
  setPreview: "\u041A\u043E\u043B\u043E\u043D\u043A\u0430 \u043F\u0440\u0435\u0432\u044C\u044E \u0444\u0430\u0439\u043B\u0430",
  setPreviewDesc: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u043E\u043B\u043E\u043D\u043A\u0443 \u0441 \u0434\u0435\u0442\u0430\u043B\u044F\u043C\u0438 \u043F\u0440\u0438 \u0432\u044B\u0431\u043E\u0440\u0435 \u0444\u0430\u0439\u043B\u0430.",
  setMdPreview: "\u041F\u0440\u0435\u0432\u044C\u044E \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E \u0437\u0430\u043C\u0435\u0442\u043A\u0438",
  setMdPreviewDesc: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043D\u0430\u0447\u0430\u043B\u043E Markdown-\u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0432 \u043A\u043E\u043B\u043E\u043D\u043A\u0435 \u043F\u0440\u0435\u0432\u044C\u044E.",
  setConfirmDelete: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435",
  setConfirmDeleteDesc: "\u0421\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0434 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435\u043C \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443.",
  setColWidth: "\u0428\u0438\u0440\u0438\u043D\u0430 \u043A\u043E\u043B\u043E\u043D\u043A\u0438 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
  setColWidthDesc: "\u0412 \u043F\u0438\u043A\u0441\u0435\u043B\u044F\u0445. \u041F\u0440\u0430\u0432\u044B\u0439 \u043A\u0440\u0430\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0438: \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u044C \u2014 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0448\u0438\u0440\u0438\u043D\u0443 \u044D\u0442\u043E\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0438, \u0434\u0432\u043E\u0439\u043D\u043E\u0439 \u043A\u043B\u0438\u043A \u2014 \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C.",
  setAutoPanel: "\u0410\u0432\u0442\u043E-\u0448\u0438\u0440\u0438\u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u0438",
  setAutoPanelDesc: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u044F\u0442\u044C \u0438 \u0441\u0443\u0436\u0430\u0442\u044C \u0431\u043E\u043A\u043E\u0432\u0443\u044E \u043F\u0430\u043D\u0435\u043B\u044C \u043F\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043A\u043E\u043B\u043E\u043D\u043A\u0438, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0448\u0438\u0440\u0438\u043D\u0443 \u043A\u043E\u043B\u043E\u043D\u043E\u043A.",
  setSort: "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
  setAutoReveal: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u043C \u0444\u0430\u0439\u043B\u043E\u043C",
  setAutoRevealDesc: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0432\u044B\u0434\u0435\u043B\u044F\u0442\u044C \u0432 \u043A\u043E\u043B\u043E\u043D\u043A\u0430\u0445 \u0444\u0430\u0439\u043B \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0438.",
  setExclude: "\u0421\u043A\u0440\u044B\u0442\u044B\u0435 \u0444\u0430\u0439\u043B\u044B",
  setExcludeDesc: "\u041F\u0430\u0442\u0442\u0435\u0440\u043D\u044B \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB*.tmp, archive/, .trash\xBB.",
  folderColor: "\u0426\u0432\u0435\u0442 \u043F\u0430\u043F\u043A\u0438",
  colorDefault: "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439",
  colorRed: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439",
  colorOrange: "\u041E\u0440\u0430\u043D\u0436\u0435\u0432\u044B\u0439",
  colorYellow: "\u0416\u0451\u043B\u0442\u044B\u0439",
  colorGreen: "\u0417\u0435\u043B\u0451\u043D\u044B\u0439",
  colorCyan: "\u0413\u043E\u043B\u0443\u0431\u043E\u0439",
  colorBlue: "\u0421\u0438\u043D\u0438\u0439",
  colorPurple: "\u0424\u0438\u043E\u043B\u0435\u0442\u043E\u0432\u044B\u0439",
  colorPink: "\u0420\u043E\u0437\u043E\u0432\u044B\u0439",
  viewAsList: "\u0412\u0438\u0434: \u0441\u043F\u0438\u0441\u043E\u043A",
  viewAsGrid: "\u0412\u0438\u0434: \u0437\u043D\u0430\u0447\u043A\u0438",
  pin: "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0441\u0432\u0435\u0440\u0445\u0443",
  unpin: "\u041E\u0442\u043A\u0440\u0435\u043F\u0438\u0442\u044C",
  newCanvas: "\u041D\u043E\u0432\u044B\u0439 \u0445\u043E\u043B\u0441\u0442",
  copyWikiLink: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0438\u043A\u0438-\u0441\u0441\u044B\u043B\u043A\u0443",
  copyMdLink: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C markdown-\u0441\u0441\u044B\u043B\u043A\u0443",
  copyObsidianUrl: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C Obsidian URL",
  linkCopied: "\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
  sortDefault: "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
  folderIcon: "\u0418\u043A\u043E\u043D\u043A\u0430 \u043F\u0430\u043F\u043A\u0438\u2026",
  folderIconReset: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0438\u043A\u043E\u043D\u043A\u0443 \u043F\u0430\u043F\u043A\u0438",
  iconPlaceholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043A\u043E\u043D\u043A\u0443\u2026",
  setFolderNote: "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u0430\u043F\u043E\u043A",
  setFolderNoteDesc: "\u0412\u044B\u0431\u043E\u0440 \u043F\u0430\u043F\u043A\u0438 \u0442\u0430\u043A\u0436\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0441 \u0435\u0451 \u0438\u043C\u0435\u043D\u0435\u043C \u0432\u043D\u0443\u0442\u0440\u0438, \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u0435\u0441\u0442\u044C.",
  lockPanel: "\u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0447\u0438\u0441\u043B\u043E \u043A\u043E\u043B\u043E\u043D\u043E\u043A",
  unlockPanel: "\u0421\u043D\u044F\u0442\u044C \u0444\u0438\u043A\u0441\u0430\u0446\u0438\u044E \u043A\u043E\u043B\u043E\u043D\u043E\u043A",
  recents: "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435",
  setRecentCount: "\u0427\u0438\u0441\u043B\u043E \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445 \u0444\u0430\u0439\u043B\u043E\u0432",
  setRecentCountDesc: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u043E\u0432 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0432 \u043A\u043E\u043B\u043E\u043D\u043A\u0435 \xAB\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435\xBB.",
  headAppearance: "\u0412\u0438\u0434",
  headBehavior: "\u041F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u0435",
  headColumns: "\u041A\u043E\u043B\u043E\u043D\u043A\u0438",
  setShowRecents: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435\xBB",
  setShowRecentsDesc: "\u041F\u0443\u043D\u043A\u0442 \xAB\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435\xBB \u0432\u0432\u0435\u0440\u0445\u0443 \u043F\u0435\u0440\u0432\u043E\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0438.",
  resetWidths: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0448\u0438\u0440\u0438\u043D\u044B \u0432\u0441\u0435\u0445 \u043A\u043E\u043B\u043E\u043D\u043E\u043A",
  resetWidthsDesc: "\u0417\u0430\u0431\u044B\u0442\u044C \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0435 \u0448\u0438\u0440\u0438\u043D\u044B \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0441\u0435\u043C \u043A\u043E\u043B\u043E\u043D\u043A\u0430\u043C \u0448\u0438\u0440\u0438\u043D\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E.",
  widthsReset: "\u0428\u0438\u0440\u0438\u043D\u044B \u043A\u043E\u043B\u043E\u043D\u043E\u043A \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B",
  reset: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C",
  clearRecents: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0435",
  clearRecentsDesc: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445.",
  recentsCleared: "\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445 \u043E\u0447\u0438\u0449\u0435\u043D",
  clear: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C",
  bookmarks: "\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438",
  calendar: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C",
  favorites: "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435",
  addFavorite: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435",
  removeFavorite: "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E",
  favoriteAdded: "\u041F\u0443\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435",
  favoriteRemoved: "\u0423\u0431\u0440\u0430\u043D\u043E \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E",
  setShowFavorites: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435\xBB",
  setShowFavoritesDesc: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u0438 \u043F\u0430\u043F\u043A\u0438 \u0432\u0432\u0435\u0440\u0445\u0443 \u043A\u043E\u043B\u043E\u043D\u043A\u0438 \xAB\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438\xBB.",
  headSpecial: "\u0421\u043F\u0435\u0446\u043F\u0443\u043D\u043A\u0442\u044B",
  setShowBookmarks: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438\xBB",
  setShowBookmarksDesc: "\u041F\u0443\u043D\u043A\u0442 \xAB\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438\xBB (\u043D\u0443\u0436\u0435\u043D \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043F\u043B\u0430\u0433\u0438\u043D Bookmarks).",
  setShowCalendar: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \xAB\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C\xBB",
  setShowCalendarDesc: "\u041F\u0443\u043D\u043A\u0442 \xAB\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C\xBB: \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u043E \u0434\u043D\u044E \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F.",
  setSpecialPos: "\u041F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u043F\u0435\u0446\u043F\u0443\u043D\u043A\u0442\u043E\u0432",
  setSpecialPosDesc: "\u0413\u0434\u0435 \u0432 \u043F\u0435\u0440\u0432\u043E\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0435 \u0441\u0442\u043E\u044F\u0442 \xAB\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435\xBB, \xAB\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438\xBB \u0438 \xAB\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C\xBB.",
  posTop: "\u0421\u0432\u0435\u0440\u0445\u0443",
  posBottom: "\u0421\u043D\u0438\u0437\u0443",
  today: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
  navBack: "\u041D\u0430\u0437\u0430\u0434",
  navForward: "\u0412\u043F\u0435\u0440\u0451\u0434",
  navUp: "\u0412 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0443\u044E \u043F\u0430\u043F\u043A\u0443",
  create: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C",
  more: "\u0415\u0449\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
  preview: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440",
  close: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
  selectedN: "\u0412\u044B\u0431\u0440\u0430\u043D\u043E: {n}",
  cancelSelection: "\u0421\u043D\u044F\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435",
  headMobile: "\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441",
  setMobileScale: "\u041C\u0430\u0441\u0448\u0442\u0430\u0431 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430",
  setMobileScaleDesc: "\u0418\u0437\u043C\u0435\u043D\u044F\u0435\u0442 \u0440\u0430\u0437\u043C\u0435\u0440 \u0441\u0442\u0440\u043E\u043A, \u043A\u043D\u043E\u043F\u043E\u043A, \u0442\u0435\u043A\u0441\u0442\u0430 \u0438 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u0432 \u043D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430\u0445 \u0438 \u043F\u043B\u0430\u043D\u0448\u0435\u0442\u0430\u0445.",
  setMobileIcon: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0438\u043A\u043E\u043D\u043E\u043A \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0445 \u043A\u043D\u043E\u043F\u043E\u043A",
  setMobileIconDesc: "\u0418\u0437\u043C\u0435\u043D\u044F\u0435\u0442 \u0438\u043A\u043E\u043D\u043A\u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432, \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 \u0438 \u043F\u0430\u043D\u0435\u043B\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439. \u0418\u043A\u043E\u043D\u043A\u0438 \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u043F\u0430\u043F\u043E\u043A \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F.",
  resetMobileSizes: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u044B",
  mobileSizesReset: "\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u044B \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B"
};

// src/locales/es.ts
var es = {
  newNote: "Nueva nota",
  newFolder: "Nueva carpeta",
  reveal: "Mostrar el archivo activo",
  collapse: "Contraer a la ra\xEDz",
  search: "Filtrar archivos\u2026",
  sort: "Orden",
  empty: "Vac\xEDo",
  noResults: "Sin coincidencias",
  open: "Abrir",
  openNewTab: "Abrir en una pesta\xF1a nueva",
  openRight: "Abrir a la derecha",
  duplicate: "Duplicar",
  rename: "Cambiar nombre",
  delete: "Eliminar",
  deleteN: "Eliminar {n} elementos",
  duplicateN: "Duplicar {n} elementos",
  moveTo: "Mover a la carpeta\u2026",
  moveToPlaceholder: "Elige la carpeta de destino\u2026",
  copyPath: "Copiar ruta",
  copyFullPath: "Copiar ruta completa",
  pathCopied: "Ruta copiada",
  untitled: "Sin t\xEDtulo",
  newFolderName: "Nueva carpeta",
  cantMoveIntoSelf: "No se puede mover una carpeta dentro de s\xED misma",
  alreadyExists: "\xAB{name}\xBB ya existe en la carpeta de destino",
  renameFailed: "No se pudo cambiar el nombre: ",
  createFailed: "No se pudo crear \xAB{name}\xBB: {error}",
  moveFailed: "No se pudo mover \xAB{name}\xBB: {error}",
  duplicateFailed: "No se pudo duplicar \xAB{name}\xBB: {error}",
  deleteFailed: "No se pudo eliminar \xAB{name}\xBB: {error}",
  modified: "Modificado",
  created: "Creado",
  sortNameAsc: "Nombre (A \u2192 Z)",
  sortNameDesc: "Nombre (Z \u2192 A)",
  sortMtimeDesc: "Modificaci\xF3n (m\xE1s recientes primero)",
  sortMtimeAsc: "Modificaci\xF3n (m\xE1s antiguos primero)",
  sortCtimeDesc: "Creaci\xF3n (m\xE1s recientes primero)",
  sortCtimeAsc: "Creaci\xF3n (m\xE1s antiguos primero)",
  sortSizeDesc: "Tama\xF1o (mayor primero)",
  sortSizeAsc: "Tama\xF1o (menor primero)",
  confirmDeleteTitle: "Eliminar",
  confirmDeleteOne: "\xBFEliminar \xAB{name}\xBB?",
  confirmDeleteMany: "\xBFEliminar {n} elementos?",
  confirm: "Eliminar",
  cancel: "Cancelar",
  itemsMoved: "{n} elementos movidos",
  undo: "Deshacer",
  filesImported: "{n} archivos importados",
  importFailed: "No se pudo importar \xAB{name}\xBB",
  cmdOpen: "Abrir el explorador de columnas",
  cmdReveal: "Mostrar el archivo activo en las columnas",
  cmdNewNote: "Nueva nota en la carpeta actual",
  cmdNewFolder: "Nueva carpeta en la carpeta actual",
  setFoldersFirst: "Carpetas primero",
  setFoldersFirstDesc: "Mostrar siempre las carpetas por encima de los archivos.",
  setShowExt: "Mostrar la extensi\xF3n",
  setShowExtDesc: "Muestra una peque\xF1a etiqueta con la extensi\xF3n en los archivos que no son Markdown.",
  setPreview: "Mostrar la columna de vista previa",
  setPreviewDesc: "Muestra una columna de detalles cuando se selecciona un archivo.",
  setMdPreview: "Vista previa del contenido",
  setMdPreviewDesc: "Muestra el principio de las notas Markdown en la columna de vista previa.",
  setConfirmDelete: "Confirmar antes de eliminar",
  setConfirmDeleteDesc: "Pide confirmaci\xF3n antes de mover archivos a la papelera.",
  setColWidth: "Ancho de columna predeterminado",
  setColWidthDesc: "En p\xEDxeles. Arrastra el borde derecho de una columna para ajustarla; haz doble clic en el borde para restablecerla.",
  setAutoPanel: "Ajustar el panel autom\xE1ticamente",
  setAutoPanelDesc: "Ensancha y estrecha el panel lateral para que quepan todas las columnas abiertas, sin cambiar su ancho.",
  setSort: "Orden predeterminado",
  setAutoReveal: "Seguir al archivo activo",
  setAutoRevealDesc: "Sigue la pesta\xF1a activa del editor y selecciona su archivo en las columnas.",
  setExclude: "Archivos excluidos",
  setExcludeDesc: "Patrones separados por comas, por ejemplo \xAB*.tmp, archive/, .trash\xBB.",
  folderColor: "Color de la carpeta",
  colorDefault: "Predeterminado",
  colorRed: "Rojo",
  colorOrange: "Naranja",
  colorYellow: "Amarillo",
  colorGreen: "Verde",
  colorCyan: "Cian",
  colorBlue: "Azul",
  colorPurple: "Morado",
  colorPink: "Rosa",
  viewAsList: "Ver como lista",
  viewAsGrid: "Ver como iconos",
  pin: "Fijar arriba",
  unpin: "Dejar de fijar",
  newCanvas: "Nuevo lienzo",
  copyWikiLink: "Copiar el enlace wiki",
  copyMdLink: "Copiar el enlace Markdown",
  copyObsidianUrl: "Copiar la URL de Obsidian",
  linkCopied: "Enlace copiado",
  sortDefault: "Orden predeterminado",
  folderIcon: "Icono de la carpeta\u2026",
  folderIconReset: "Restablecer el icono",
  iconPlaceholder: "Elige un icono\u2026",
  setFolderNote: "Abrir las notas de carpeta",
  setFolderNoteDesc: "Al seleccionar una carpeta se abre tambi\xE9n la nota con su mismo nombre, si existe.",
  lockPanel: "Fijar el n\xFAmero de columnas",
  unlockPanel: "Liberar las columnas",
  recents: "Recientes",
  setRecentCount: "N\xFAmero de archivos recientes",
  setRecentCountDesc: "Cu\xE1ntos archivos muestra la columna \xABRecientes\xBB.",
  headAppearance: "Apariencia",
  headBehavior: "Comportamiento",
  headColumns: "Columnas",
  setShowRecents: "Mostrar los recientes",
  setShowRecentsDesc: "Muestra la fila \xABRecientes\xBB en la primera columna.",
  resetWidths: "Restablecer el ancho de las columnas",
  resetWidthsDesc: "Olvida los anchos ajustados a mano y usa el ancho predeterminado en todas partes.",
  widthsReset: "Anchos de columna restablecidos",
  reset: "Restablecer",
  clearRecents: "Vaciar los archivos recientes",
  clearRecentsDesc: "Elimina todas las entradas de la lista de recientes.",
  recentsCleared: "Lista de recientes vaciada",
  clear: "Vaciar",
  bookmarks: "Marcadores",
  calendar: "Calendario",
  favorites: "Favoritos",
  addFavorite: "A\xF1adir a favoritos",
  removeFavorite: "Quitar de favoritos",
  favoriteAdded: "Ruta a\xF1adida a favoritos",
  favoriteRemoved: "Quitado de favoritos",
  setShowFavorites: "Mostrar los favoritos",
  setShowFavoritesDesc: "Muestra tus archivos y carpetas favoritos en la parte superior de la columna \xABMarcadores\xBB.",
  headSpecial: "Elementos especiales",
  setShowBookmarks: "Mostrar los marcadores",
  setShowBookmarksDesc: "Muestra la fila \xABMarcadores\xBB (necesita el plugin Bookmarks).",
  setShowCalendar: "Mostrar el calendario",
  setShowCalendarDesc: "Muestra la fila \xABCalendario\xBB: notas por d\xEDa de creaci\xF3n.",
  setSpecialPos: "Posici\xF3n de los elementos especiales",
  setSpecialPosDesc: "D\xF3nde se colocan las filas de recientes, marcadores y calendario en la primera columna.",
  posTop: "Arriba",
  posBottom: "Abajo",
  today: "Hoy",
  navBack: "Atr\xE1s",
  navForward: "Adelante",
  navUp: "Ir a la carpeta superior",
  create: "Crear",
  more: "M\xE1s acciones",
  preview: "Vista previa",
  close: "Cerrar",
  selectedN: "{n} seleccionados",
  cancelSelection: "Cancelar la selecci\xF3n",
  headMobile: "Interfaz m\xF3vil",
  setMobileScale: "Escala de la interfaz m\xF3vil",
  setMobileScaleDesc: "Cambia el tama\xF1o de las filas, los controles, el texto y los espacios en tel\xE9fonos y tabletas.",
  setMobileIcon: "Tama\xF1o de los iconos m\xF3viles",
  setMobileIconDesc: "Cambia los iconos de la barra de herramientas, la navegaci\xF3n y la barra de acciones. Los iconos de archivos y carpetas no cambian.",
  resetMobileSizes: "Restablecer los tama\xF1os m\xF3viles",
  mobileSizesReset: "Tama\xF1os m\xF3viles restablecidos"
};

// src/locales/fr.ts
var fr = {
  newNote: "Nouvelle note",
  newFolder: "Nouveau dossier",
  reveal: "Afficher le fichier actif",
  collapse: "Replier jusqu'\xE0 la racine",
  search: "Filtrer les fichiers\u2026",
  sort: "Tri",
  empty: "Vide",
  noResults: "Aucun r\xE9sultat",
  open: "Ouvrir",
  openNewTab: "Ouvrir dans un nouvel onglet",
  openRight: "Ouvrir \xE0 droite",
  duplicate: "Dupliquer",
  rename: "Renommer",
  delete: "Supprimer",
  deleteN: "Supprimer {n} \xE9l\xE9ments",
  duplicateN: "Dupliquer {n} \xE9l\xE9ments",
  moveTo: "D\xE9placer vers le dossier\u2026",
  moveToPlaceholder: "Choisissez le dossier de destination\u2026",
  copyPath: "Copier le chemin",
  copyFullPath: "Copier le chemin complet",
  pathCopied: "Chemin copi\xE9",
  untitled: "Sans titre",
  newFolderName: "Nouveau dossier",
  cantMoveIntoSelf: "Impossible de d\xE9placer un dossier dans lui-m\xEAme",
  alreadyExists: "\xAB {name} \xBB existe d\xE9j\xE0 dans le dossier de destination",
  renameFailed: "\xC9chec du renommage : ",
  createFailed: "Impossible de cr\xE9er \xAB {name} \xBB : {error}",
  moveFailed: "Impossible de d\xE9placer \xAB {name} \xBB : {error}",
  duplicateFailed: "Impossible de dupliquer \xAB {name} \xBB : {error}",
  deleteFailed: "Impossible de supprimer \xAB {name} \xBB : {error}",
  modified: "Modifi\xE9",
  created: "Cr\xE9\xE9",
  sortNameAsc: "Nom (A \u2192 Z)",
  sortNameDesc: "Nom (Z \u2192 A)",
  sortMtimeDesc: "Modification (plus r\xE9cents d'abord)",
  sortMtimeAsc: "Modification (plus anciens d'abord)",
  sortCtimeDesc: "Cr\xE9ation (plus r\xE9cents d'abord)",
  sortCtimeAsc: "Cr\xE9ation (plus anciens d'abord)",
  sortSizeDesc: "Taille (plus grands d'abord)",
  sortSizeAsc: "Taille (plus petits d'abord)",
  confirmDeleteTitle: "Supprimer",
  confirmDeleteOne: "Supprimer \xAB {name} \xBB ?",
  confirmDeleteMany: "Supprimer {n} \xE9l\xE9ments ?",
  confirm: "Supprimer",
  cancel: "Annuler",
  itemsMoved: "{n} \xE9l\xE9ments d\xE9plac\xE9s",
  undo: "Annuler",
  filesImported: "{n} fichiers import\xE9s",
  importFailed: "\xC9chec de l'importation de \xAB {name} \xBB",
  cmdOpen: "Ouvrir l'explorateur en colonnes",
  cmdReveal: "Afficher le fichier actif dans les colonnes",
  cmdNewNote: "Nouvelle note dans le dossier courant",
  cmdNewFolder: "Nouveau dossier dans le dossier courant",
  setFoldersFirst: "Dossiers en premier",
  setFoldersFirstDesc: "Toujours afficher les dossiers au-dessus des fichiers.",
  setShowExt: "Afficher l'extension",
  setShowExtDesc: "Affiche une petite \xE9tiquette avec l'extension pour les fichiers non Markdown.",
  setPreview: "Afficher la colonne d'aper\xE7u",
  setPreviewDesc: "Affiche une colonne de d\xE9tails lorsqu'un fichier est s\xE9lectionn\xE9.",
  setMdPreview: "Aper\xE7u du contenu des notes",
  setMdPreviewDesc: "Affiche le d\xE9but des notes Markdown dans la colonne d'aper\xE7u.",
  setConfirmDelete: "Confirmer avant de supprimer",
  setConfirmDeleteDesc: "Demande confirmation avant de mettre des fichiers \xE0 la corbeille.",
  setColWidth: "Largeur de colonne par d\xE9faut",
  setColWidthDesc: "En pixels. Faites glisser le bord droit d'une colonne pour la redimensionner ; double-cliquez sur le bord pour la r\xE9initialiser.",
  setAutoPanel: "Ajuster le panneau automatiquement",
  setAutoPanelDesc: "\xC9largit et r\xE9tr\xE9cit le panneau lat\xE9ral pour contenir toutes les colonnes ouvertes, sans changer leur largeur.",
  setSort: "Tri par d\xE9faut",
  setAutoReveal: "Suivre le fichier actif",
  setAutoRevealDesc: "Suit l'onglet actif de l'\xE9diteur et s\xE9lectionne son fichier dans les colonnes.",
  setExclude: "Fichiers exclus",
  setExcludeDesc: "Motifs s\xE9par\xE9s par des virgules, par exemple \xAB *.tmp, archive/, .trash \xBB.",
  folderColor: "Couleur du dossier",
  colorDefault: "Par d\xE9faut",
  colorRed: "Rouge",
  colorOrange: "Orange",
  colorYellow: "Jaune",
  colorGreen: "Vert",
  colorCyan: "Cyan",
  colorBlue: "Bleu",
  colorPurple: "Violet",
  colorPink: "Rose",
  viewAsList: "Afficher en liste",
  viewAsGrid: "Afficher en ic\xF4nes",
  pin: "\xC9pingler en haut",
  unpin: "D\xE9tacher",
  newCanvas: "Nouveau canevas",
  copyWikiLink: "Copier le lien wiki",
  copyMdLink: "Copier le lien Markdown",
  copyObsidianUrl: "Copier l'URL Obsidian",
  linkCopied: "Lien copi\xE9",
  sortDefault: "Tri par d\xE9faut",
  folderIcon: "Ic\xF4ne du dossier\u2026",
  folderIconReset: "R\xE9initialiser l'ic\xF4ne",
  iconPlaceholder: "Choisissez une ic\xF4ne\u2026",
  setFolderNote: "Ouvrir les notes de dossier",
  setFolderNoteDesc: "S\xE9lectionner un dossier ouvre aussi la note portant le m\xEAme nom \xE0 l'int\xE9rieur, si elle existe.",
  lockPanel: "Verrouiller le nombre de colonnes",
  unlockPanel: "D\xE9verrouiller les colonnes",
  recents: "R\xE9cents",
  setRecentCount: "Nombre de fichiers r\xE9cents",
  setRecentCountDesc: "Combien de fichiers la colonne \xAB R\xE9cents \xBB affiche.",
  headAppearance: "Apparence",
  headBehavior: "Comportement",
  headColumns: "Colonnes",
  setShowRecents: "Afficher les r\xE9cents",
  setShowRecentsDesc: "Affiche la ligne \xAB R\xE9cents \xBB dans la premi\xE8re colonne.",
  resetWidths: "R\xE9initialiser la largeur des colonnes",
  resetWidthsDesc: "Oublie les largeurs ajust\xE9es \xE0 la main et applique partout la largeur par d\xE9faut.",
  widthsReset: "Largeurs de colonnes r\xE9initialis\xE9es",
  reset: "R\xE9initialiser",
  clearRecents: "Vider les fichiers r\xE9cents",
  clearRecentsDesc: "Supprime toutes les entr\xE9es de la liste des r\xE9cents.",
  recentsCleared: "Liste des r\xE9cents vid\xE9e",
  clear: "Vider",
  bookmarks: "Signets",
  calendar: "Calendrier",
  favorites: "Favoris",
  addFavorite: "Ajouter aux favoris",
  removeFavorite: "Retirer des favoris",
  favoriteAdded: "Chemin ajout\xE9 aux favoris",
  favoriteRemoved: "Retir\xE9 des favoris",
  setShowFavorites: "Afficher les favoris",
  setShowFavoritesDesc: "Affiche vos fichiers et dossiers favoris en haut de la colonne \xAB Signets \xBB.",
  headSpecial: "\xC9l\xE9ments sp\xE9ciaux",
  setShowBookmarks: "Afficher les signets",
  setShowBookmarksDesc: "Affiche la ligne \xAB Signets \xBB (n\xE9cessite le plugin Bookmarks).",
  setShowCalendar: "Afficher le calendrier",
  setShowCalendarDesc: "Affiche la ligne \xAB Calendrier \xBB : les notes par jour de cr\xE9ation.",
  setSpecialPos: "Position des \xE9l\xE9ments sp\xE9ciaux",
  setSpecialPosDesc: "O\xF9 se placent les lignes r\xE9cents, signets et calendrier dans la premi\xE8re colonne.",
  posTop: "En haut",
  posBottom: "En bas",
  today: "Aujourd'hui",
  navBack: "Pr\xE9c\xE9dent",
  navForward: "Suivant",
  navUp: "Aller au dossier parent",
  create: "Cr\xE9er",
  more: "Plus d'actions",
  preview: "Aper\xE7u",
  close: "Fermer",
  selectedN: "{n} s\xE9lectionn\xE9s",
  cancelSelection: "Annuler la s\xE9lection",
  headMobile: "Interface mobile",
  setMobileScale: "\xC9chelle de l'interface mobile",
  setMobileScaleDesc: "Change la taille des lignes, des contr\xF4les, du texte et des espacements sur t\xE9l\xE9phones et tablettes.",
  setMobileIcon: "Taille des ic\xF4nes mobiles",
  setMobileIconDesc: "Change les ic\xF4nes de la barre d'outils, de la navigation et de la barre d'actions. Les ic\xF4nes de fichiers et de dossiers ne changent pas.",
  resetMobileSizes: "R\xE9initialiser les tailles mobiles",
  mobileSizesReset: "Tailles mobiles r\xE9initialis\xE9es"
};

// src/locales/it.ts
var it = {
  newNote: "Nuova nota",
  newFolder: "Nuova cartella",
  reveal: "Mostra il file attivo",
  collapse: "Comprimi alla radice",
  search: "Filtra i file\u2026",
  sort: "Ordinamento",
  empty: "Vuoto",
  noResults: "Nessun risultato",
  open: "Apri",
  openNewTab: "Apri in una nuova scheda",
  openRight: "Apri a destra",
  duplicate: "Duplica",
  rename: "Rinomina",
  delete: "Elimina",
  deleteN: "Elimina {n} elementi",
  duplicateN: "Duplica {n} elementi",
  moveTo: "Sposta nella cartella\u2026",
  moveToPlaceholder: "Scegli la cartella di destinazione\u2026",
  copyPath: "Copia il percorso",
  copyFullPath: "Copia il percorso completo",
  pathCopied: "Percorso copiato",
  untitled: "Senza titolo",
  newFolderName: "Nuova cartella",
  cantMoveIntoSelf: "Impossibile spostare una cartella dentro se stessa",
  alreadyExists: "\xAB{name}\xBB esiste gi\xE0 nella cartella di destinazione",
  renameFailed: "Rinomina non riuscita: ",
  createFailed: "Impossibile creare \xAB{name}\xBB: {error}",
  moveFailed: "Impossibile spostare \xAB{name}\xBB: {error}",
  duplicateFailed: "Impossibile duplicare \xAB{name}\xBB: {error}",
  deleteFailed: "Impossibile eliminare \xAB{name}\xBB: {error}",
  modified: "Modificato",
  created: "Creato",
  sortNameAsc: "Nome (A \u2192 Z)",
  sortNameDesc: "Nome (Z \u2192 A)",
  sortMtimeDesc: "Modifica (prima i pi\xF9 recenti)",
  sortMtimeAsc: "Modifica (prima i pi\xF9 vecchi)",
  sortCtimeDesc: "Creazione (prima i pi\xF9 recenti)",
  sortCtimeAsc: "Creazione (prima i pi\xF9 vecchi)",
  sortSizeDesc: "Dimensione (prima i pi\xF9 grandi)",
  sortSizeAsc: "Dimensione (prima i pi\xF9 piccoli)",
  confirmDeleteTitle: "Elimina",
  confirmDeleteOne: "Eliminare \xAB{name}\xBB?",
  confirmDeleteMany: "Eliminare {n} elementi?",
  confirm: "Elimina",
  cancel: "Annulla",
  itemsMoved: "{n} elementi spostati",
  undo: "Annulla",
  filesImported: "{n} file importati",
  importFailed: "Impossibile importare \xAB{name}\xBB",
  cmdOpen: "Apri l'esploratore a colonne",
  cmdReveal: "Mostra il file attivo nelle colonne",
  cmdNewNote: "Nuova nota nella cartella corrente",
  cmdNewFolder: "Nuova cartella nella cartella corrente",
  setFoldersFirst: "Prima le cartelle",
  setFoldersFirstDesc: "Mostra sempre le cartelle sopra i file.",
  setShowExt: "Mostra l'estensione",
  setShowExtDesc: "Mostra una piccola etichetta con l'estensione per i file non Markdown.",
  setPreview: "Mostra la colonna di anteprima",
  setPreviewDesc: "Mostra una colonna con i dettagli quando si seleziona un file.",
  setMdPreview: "Anteprima del contenuto",
  setMdPreviewDesc: "Mostra l'inizio delle note Markdown nella colonna di anteprima.",
  setConfirmDelete: "Conferma prima di eliminare",
  setConfirmDeleteDesc: "Chiede conferma prima di spostare i file nel cestino.",
  setColWidth: "Larghezza predefinita delle colonne",
  setColWidthDesc: "In pixel. Trascina il bordo destro di una colonna per ridimensionarla; fai doppio clic sul bordo per ripristinarla.",
  setAutoPanel: "Adatta il pannello automaticamente",
  setAutoPanelDesc: "Allarga e restringe il pannello laterale per contenere tutte le colonne aperte, senza cambiarne la larghezza.",
  setSort: "Ordinamento predefinito",
  setAutoReveal: "Segui il file attivo",
  setAutoRevealDesc: "Segue la scheda attiva dell'editor e seleziona il suo file nelle colonne.",
  setExclude: "File esclusi",
  setExcludeDesc: "Modelli separati da virgole, ad esempio \xAB*.tmp, archive/, .trash\xBB.",
  folderColor: "Colore della cartella",
  colorDefault: "Predefinito",
  colorRed: "Rosso",
  colorOrange: "Arancione",
  colorYellow: "Giallo",
  colorGreen: "Verde",
  colorCyan: "Ciano",
  colorBlue: "Blu",
  colorPurple: "Viola",
  colorPink: "Rosa",
  viewAsList: "Vista a elenco",
  viewAsGrid: "Vista a icone",
  pin: "Fissa in alto",
  unpin: "Rimuovi dai fissati",
  newCanvas: "Nuova tela",
  copyWikiLink: "Copia il collegamento wiki",
  copyMdLink: "Copia il collegamento Markdown",
  copyObsidianUrl: "Copia l'URL di Obsidian",
  linkCopied: "Collegamento copiato",
  sortDefault: "Ordinamento predefinito",
  folderIcon: "Icona della cartella\u2026",
  folderIconReset: "Ripristina l'icona",
  iconPlaceholder: "Scegli un'icona\u2026",
  setFolderNote: "Apri le note di cartella",
  setFolderNoteDesc: "Selezionando una cartella si apre anche la nota con lo stesso nome al suo interno, se esiste.",
  lockPanel: "Blocca il numero di colonne",
  unlockPanel: "Sblocca le colonne",
  recents: "Recenti",
  setRecentCount: "Numero di file recenti",
  setRecentCountDesc: "Quanti file mostra la colonna \xABRecenti\xBB.",
  headAppearance: "Aspetto",
  headBehavior: "Comportamento",
  headColumns: "Colonne",
  setShowRecents: "Mostra i recenti",
  setShowRecentsDesc: "Mostra la riga \xABRecenti\xBB nella prima colonna.",
  resetWidths: "Ripristina la larghezza delle colonne",
  resetWidthsDesc: "Dimentica le larghezze impostate a mano e usa ovunque quella predefinita.",
  widthsReset: "Larghezze delle colonne ripristinate",
  reset: "Ripristina",
  clearRecents: "Svuota i file recenti",
  clearRecentsDesc: "Rimuove tutte le voci dall'elenco dei recenti.",
  recentsCleared: "Elenco dei recenti svuotato",
  clear: "Svuota",
  bookmarks: "Segnalibri",
  calendar: "Calendario",
  favorites: "Preferiti",
  addFavorite: "Aggiungi ai preferiti",
  removeFavorite: "Rimuovi dai preferiti",
  favoriteAdded: "Percorso aggiunto ai preferiti",
  favoriteRemoved: "Rimosso dai preferiti",
  setShowFavorites: "Mostra i preferiti",
  setShowFavoritesDesc: "Mostra i file e le cartelle preferiti in cima alla colonna \xABSegnalibri\xBB.",
  headSpecial: "Elementi speciali",
  setShowBookmarks: "Mostra i segnalibri",
  setShowBookmarksDesc: "Mostra la riga \xABSegnalibri\xBB (richiede il plugin Bookmarks).",
  setShowCalendar: "Mostra il calendario",
  setShowCalendarDesc: "Mostra la riga \xABCalendario\xBB: le note per giorno di creazione.",
  setSpecialPos: "Posizione degli elementi speciali",
  setSpecialPosDesc: "Dove si collocano le righe recenti, segnalibri e calendario nella prima colonna.",
  posTop: "In alto",
  posBottom: "In basso",
  today: "Oggi",
  navBack: "Indietro",
  navForward: "Avanti",
  navUp: "Vai alla cartella superiore",
  create: "Crea",
  more: "Altre azioni",
  preview: "Anteprima",
  close: "Chiudi",
  selectedN: "{n} selezionati",
  cancelSelection: "Annulla la selezione",
  headMobile: "Interfaccia mobile",
  setMobileScale: "Scala dell'interfaccia mobile",
  setMobileScaleDesc: "Cambia la dimensione di righe, controlli, testo e spaziature su telefoni e tablet.",
  setMobileIcon: "Dimensione delle icone mobili",
  setMobileIconDesc: "Cambia le icone della barra degli strumenti, della navigazione e della barra delle azioni. Le icone di file e cartelle non cambiano.",
  resetMobileSizes: "Ripristina le dimensioni mobili",
  mobileSizesReset: "Dimensioni mobili ripristinate"
};

// src/i18n.ts
var LOCALES = { en, ru, es, fr, it };
function t(key, vars) {
  var _a, _b, _c;
  const strings = (_a = LOCALES[(0, import_obsidian.getLanguage)()]) != null ? _a : en;
  const s = (_c = (_b = strings[key]) != null ? _b : en[key]) != null ? _c : key;
  return vars ? formatTemplate(s, vars) : s;
}

// src/settings.ts
var import_obsidian2 = require("obsidian");
var FOLDER_COLOR_KEYS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];
var DEFAULT_SETTINGS = {
  foldersFirst: true,
  showExtensions: true,
  showPreview: false,
  showMarkdownPreview: true,
  confirmDelete: true,
  autoReveal: false,
  columnWidth: DEFAULT_COLUMN_WIDTH,
  columnWidths: {},
  autoPanelResize: true,
  sortMode: "name-asc",
  excludePatterns: "",
  folderColors: {},
  columnViewModes: {},
  pinnedPaths: {},
  columnSortModes: {},
  folderIcons: {},
  openFolderNote: false,
  lockedColumnCount: null,
  recentFilesCount: DEFAULT_RECENT_FILES,
  recentFiles: [],
  showRecents: true,
  showBookmarks: true,
  showCalendar: true,
  specialItemsPosition: "top",
  favorites: [],
  showFavorites: true,
  mobileUiScale: DEFAULT_MOBILE_SCALE,
  mobileIconSize: DEFAULT_MOBILE_ICON
};
var ColumnExplorerSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  /**
   * Declarative settings (Obsidian 1.13+): powers the settings search.
   * Older versions fall back to display() below.
   */
  getSettingDefinitions() {
    return [
      {
        type: "group",
        heading: t("headAppearance"),
        items: [
          { name: t("setFoldersFirst"), desc: t("setFoldersFirstDesc"), control: { type: "toggle", key: "foldersFirst" } },
          { name: t("setShowExt"), desc: t("setShowExtDesc"), control: { type: "toggle", key: "showExtensions" } },
          { name: t("setPreview"), desc: t("setPreviewDesc"), control: { type: "toggle", key: "showPreview" } },
          { name: t("setMdPreview"), desc: t("setMdPreviewDesc"), control: { type: "toggle", key: "showMarkdownPreview" } }
        ]
      },
      {
        type: "group",
        heading: t("headBehavior"),
        items: [
          {
            name: t("setSort"),
            control: {
              type: "dropdown",
              key: "sortMode",
              options: {
                "name-asc": t("sortNameAsc"),
                "name-desc": t("sortNameDesc"),
                "mtime-desc": t("sortMtimeDesc"),
                "mtime-asc": t("sortMtimeAsc"),
                "ctime-desc": t("sortCtimeDesc"),
                "ctime-asc": t("sortCtimeAsc"),
                "size-desc": t("sortSizeDesc"),
                "size-asc": t("sortSizeAsc")
              }
            }
          },
          { name: t("setAutoReveal"), desc: t("setAutoRevealDesc"), control: { type: "toggle", key: "autoReveal" } },
          { name: t("setFolderNote"), desc: t("setFolderNoteDesc"), control: { type: "toggle", key: "openFolderNote" } },
          { name: t("setConfirmDelete"), desc: t("setConfirmDeleteDesc"), control: { type: "toggle", key: "confirmDelete" } },
          { name: t("setExclude"), desc: t("setExcludeDesc"), control: { type: "text", key: "excludePatterns" } }
        ]
      },
      {
        type: "group",
        heading: t("headColumns"),
        items: [
          { name: t("setAutoPanel"), desc: t("setAutoPanelDesc"), control: { type: "toggle", key: "autoPanelResize" } },
          {
            name: t("setColWidth"),
            desc: t("setColWidthDesc"),
            control: { type: "slider", key: "columnWidth", min: MIN_COLUMN_WIDTH, max: MAX_COLUMN_WIDTH, step: 10 }
          },
          { name: t("resetWidths"), desc: t("resetWidthsDesc"), action: () => void this.resetColumnWidths() }
        ]
      },
      {
        type: "group",
        heading: t("headSpecial"),
        items: [
          {
            name: t("setSpecialPos"),
            desc: t("setSpecialPosDesc"),
            control: { type: "dropdown", key: "specialItemsPosition", options: { top: t("posTop"), bottom: t("posBottom") } }
          },
          { name: t("setShowRecents"), desc: t("setShowRecentsDesc"), control: { type: "toggle", key: "showRecents" } },
          {
            name: t("setRecentCount"),
            desc: t("setRecentCountDesc"),
            control: { type: "number", key: "recentFilesCount", min: MIN_RECENT_FILES, max: MAX_RECENT_FILES, step: 1 }
          },
          { name: t("clearRecents"), desc: t("clearRecentsDesc"), action: () => void this.clearRecents() },
          { name: t("setShowFavorites"), desc: t("setShowFavoritesDesc"), control: { type: "toggle", key: "showFavorites" } },
          { name: t("setShowBookmarks"), desc: t("setShowBookmarksDesc"), control: { type: "toggle", key: "showBookmarks" } },
          { name: t("setShowCalendar"), desc: t("setShowCalendarDesc"), control: { type: "toggle", key: "showCalendar" } }
        ]
      },
      {
        type: "group",
        heading: t("headMobile"),
        items: [
          {
            name: t("setMobileScale"),
            desc: t("setMobileScaleDesc"),
            control: { type: "slider", key: "mobileUiScale", min: MIN_MOBILE_SCALE, max: MAX_MOBILE_SCALE, step: 5 }
          },
          {
            name: t("setMobileIcon"),
            desc: t("setMobileIconDesc"),
            control: { type: "slider", key: "mobileIconSize", min: MIN_MOBILE_ICON, max: MAX_MOBILE_ICON, step: 2 }
          },
          { name: t("resetMobileSizes"), action: () => void this.resetMobileSizes() }
        ]
      }
    ];
  }
  async resetColumnWidths() {
    var _a;
    this.plugin.settings.columnWidths = {};
    await this.plugin.saveSettings();
    (_a = this.plugin.getView()) == null ? void 0 : _a.render();
    new import_obsidian2.Notice(t("widthsReset"));
  }
  async clearRecents() {
    var _a;
    this.plugin.settings.recentFiles = [];
    await this.plugin.saveSettings();
    (_a = this.plugin.getView()) == null ? void 0 : _a.render();
    new import_obsidian2.Notice(t("recentsCleared"));
  }
  /** Сброс мобильных размеров к дефолтным, с обновлением открытых слайдеров. */
  async resetMobileSizes() {
    var _a, _b;
    const s = this.plugin.settings;
    s.mobileUiScale = DEFAULT_MOBILE_SCALE;
    s.mobileIconSize = DEFAULT_MOBILE_ICON;
    await this.plugin.saveSettings();
    (_a = this.plugin.getView()) == null ? void 0 : _a.applyMobileScale();
    (_b = this.refreshMobileSliders) == null ? void 0 : _b.call(this);
    new import_obsidian2.Notice(t("mobileSizesReset"));
  }
  /** Self-contained override — avoids calling the 1.13-only base implementation. */
  async setControlValue(key, value) {
    var _a, _b;
    if (key === "mobileUiScale" || key === "mobileIconSize") {
      const s = this.plugin.settings;
      const normalized = normalizeMobileSettings({ ...s, [key]: value });
      s.mobileUiScale = normalized.mobileUiScale;
      s.mobileIconSize = normalized.mobileIconSize;
      await this.plugin.saveSettings();
      (_a = this.plugin.getView()) == null ? void 0 : _a.applyMobileScale();
      return;
    }
    if (key === "recentFilesCount" && typeof value === "number") {
      value = Math.max(MIN_RECENT_FILES, Math.min(MAX_RECENT_FILES, Math.round(value)));
    }
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
    (_b = this.plugin.getView()) == null ? void 0 : _b.render();
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = async () => {
      var _a;
      await this.plugin.saveSettings();
      (_a = this.plugin.getView()) == null ? void 0 : _a.render();
    };
    new import_obsidian2.Setting(containerEl).setName(t("headAppearance")).setHeading();
    new import_obsidian2.Setting(containerEl).setName(t("setFoldersFirst")).setDesc(t("setFoldersFirstDesc")).addToggle((tg) => tg.setValue(s.foldersFirst).onChange(async (v) => {
      s.foldersFirst = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setShowExt")).setDesc(t("setShowExtDesc")).addToggle((tg) => tg.setValue(s.showExtensions).onChange(async (v) => {
      s.showExtensions = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setPreview")).setDesc(t("setPreviewDesc")).addToggle((tg) => tg.setValue(s.showPreview).onChange(async (v) => {
      s.showPreview = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setMdPreview")).setDesc(t("setMdPreviewDesc")).addToggle((tg) => tg.setValue(s.showMarkdownPreview).onChange(async (v) => {
      s.showMarkdownPreview = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("headBehavior")).setHeading();
    new import_obsidian2.Setting(containerEl).setName(t("setSort")).addDropdown((d) => d.addOption("name-asc", t("sortNameAsc")).addOption("name-desc", t("sortNameDesc")).addOption("mtime-desc", t("sortMtimeDesc")).addOption("mtime-asc", t("sortMtimeAsc")).addOption("ctime-desc", t("sortCtimeDesc")).addOption("ctime-asc", t("sortCtimeAsc")).addOption("size-desc", t("sortSizeDesc")).addOption("size-asc", t("sortSizeAsc")).setValue(s.sortMode).onChange(async (v) => {
      s.sortMode = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setAutoReveal")).setDesc(t("setAutoRevealDesc")).addToggle((tg) => tg.setValue(s.autoReveal).onChange(async (v) => {
      s.autoReveal = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setFolderNote")).setDesc(t("setFolderNoteDesc")).addToggle((tg) => tg.setValue(s.openFolderNote).onChange(async (v) => {
      s.openFolderNote = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setConfirmDelete")).setDesc(t("setConfirmDeleteDesc")).addToggle((tg) => tg.setValue(s.confirmDelete).onChange(async (v) => {
      s.confirmDelete = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setExclude")).setDesc(t("setExcludeDesc")).addText((txt) => txt.setValue(s.excludePatterns).onChange(async (v) => {
      s.excludePatterns = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("headColumns")).setHeading();
    new import_obsidian2.Setting(containerEl).setName(t("setAutoPanel")).setDesc(t("setAutoPanelDesc")).addToggle((tg) => tg.setValue(s.autoPanelResize).onChange(async (v) => {
      s.autoPanelResize = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setColWidth")).setDesc(t("setColWidthDesc")).addSlider((sl) => sl.setLimits(MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, 10).setValue(s.columnWidth).onChange(async (v) => {
      s.columnWidth = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("resetWidths")).setDesc(t("resetWidthsDesc")).addButton((b) => b.setButtonText(t("reset")).onClick(() => void this.resetColumnWidths()));
    new import_obsidian2.Setting(containerEl).setName(t("headSpecial")).setHeading();
    new import_obsidian2.Setting(containerEl).setName(t("setSpecialPos")).setDesc(t("setSpecialPosDesc")).addDropdown((d) => d.addOption("top", t("posTop")).addOption("bottom", t("posBottom")).setValue(s.specialItemsPosition).onChange(async (v) => {
      s.specialItemsPosition = v === "bottom" ? "bottom" : "top";
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setShowRecents")).setDesc(t("setShowRecentsDesc")).addToggle((tg) => tg.setValue(s.showRecents).onChange(async (v) => {
      s.showRecents = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setRecentCount")).setDesc(t("setRecentCountDesc")).addText((txt) => {
      txt.inputEl.type = "number";
      txt.setValue(String(s.recentFilesCount)).onChange(async (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        s.recentFilesCount = Math.max(MIN_RECENT_FILES, Math.min(MAX_RECENT_FILES, Math.round(n)));
        await save();
      });
    });
    new import_obsidian2.Setting(containerEl).setName(t("clearRecents")).setDesc(t("clearRecentsDesc")).addButton((b) => b.setButtonText(t("clear")).onClick(() => void this.clearRecents()));
    new import_obsidian2.Setting(containerEl).setName(t("setShowFavorites")).setDesc(t("setShowFavoritesDesc")).addToggle((tg) => tg.setValue(s.showFavorites).onChange(async (v) => {
      s.showFavorites = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setShowBookmarks")).setDesc(t("setShowBookmarksDesc")).addToggle((tg) => tg.setValue(s.showBookmarks).onChange(async (v) => {
      s.showBookmarks = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setShowCalendar")).setDesc(t("setShowCalendarDesc")).addToggle((tg) => tg.setValue(s.showCalendar).onChange(async (v) => {
      s.showCalendar = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("headMobile")).setHeading();
    const saveMobile = async () => {
      var _a;
      await this.plugin.saveSettings();
      (_a = this.plugin.getView()) == null ? void 0 : _a.applyMobileScale();
    };
    let scaleSlider = null;
    new import_obsidian2.Setting(containerEl).setName(t("setMobileScale")).setDesc(t("setMobileScaleDesc")).addSlider((sl) => {
      scaleSlider = sl;
      sl.setLimits(MIN_MOBILE_SCALE, MAX_MOBILE_SCALE, 5).setValue(s.mobileUiScale).onChange(async (v) => {
        s.mobileUiScale = v;
        await saveMobile();
      });
    });
    let iconSlider = null;
    new import_obsidian2.Setting(containerEl).setName(t("setMobileIcon")).setDesc(t("setMobileIconDesc")).addSlider((sl) => {
      iconSlider = sl;
      sl.setLimits(MIN_MOBILE_ICON, MAX_MOBILE_ICON, 2).setValue(s.mobileIconSize).onChange(async (v) => {
        s.mobileIconSize = v;
        await saveMobile();
      });
    });
    this.refreshMobileSliders = () => {
      scaleSlider == null ? void 0 : scaleSlider.setValue(s.mobileUiScale);
      iconSlider == null ? void 0 : iconSlider.setValue(s.mobileIconSize);
    };
    new import_obsidian2.Setting(containerEl).setName(t("resetMobileSizes")).addButton((b) => b.setButtonText(t("reset")).onClick(() => void this.resetMobileSizes()));
  }
};

// src/view.ts
var import_obsidian11 = require("obsidian");

// src/mobile.ts
var import_obsidian8 = require("obsidian");

// src/fileops.ts
var import_obsidian3 = require("obsidian");
var UNDO_NOTICE_MS = 8e3;
async function moveFiles(app, paths, target) {
  var _a;
  const moves = [];
  for (const path of paths) {
    const src = app.vault.getAbstractFileByPath(path);
    if (!src || src.path === target.path) continue;
    if (target.path.startsWith(src.path + "/")) {
      new import_obsidian3.Notice(t("cantMoveIntoSelf"));
      continue;
    }
    if (((_a = src.parent) == null ? void 0 : _a.path) === target.path) continue;
    const dest = (0, import_obsidian3.normalizePath)((target.isRoot() ? "" : target.path + "/") + src.name);
    if (app.vault.getAbstractFileByPath(dest)) {
      new import_obsidian3.Notice(t("alreadyExists", { name: src.name }));
      continue;
    }
    try {
      await app.fileManager.renameFile(src, dest);
      moves.push({ from: path, to: dest });
    } catch (err) {
      new import_obsidian3.Notice(t("moveFailed", { name: src.name, error: errorMessage(err) }));
    }
  }
  if (moves.length > 0) showUndoMoveNotice(app, moves);
  return moves.length;
}
function showUndoMoveNotice(app, moves) {
  const frag = createFragment();
  frag.createSpan({ text: t("itemsMoved", { n: moves.length }) + " " });
  const undoBtn = frag.createEl("a", { text: t("undo"), cls: "column-explorer-undo-link" });
  const notice = new import_obsidian3.Notice(frag, UNDO_NOTICE_MS);
  undoBtn.addEventListener("click", () => {
    notice.hide();
    void undoMoves(app, moves);
  });
}
async function undoMoves(app, moves) {
  for (const move of moves) {
    const f = app.vault.getAbstractFileByPath(move.to);
    if (!f || app.vault.getAbstractFileByPath(move.from)) continue;
    try {
      await app.fileManager.renameFile(f, move.from);
    } catch (err) {
      new import_obsidian3.Notice(t("moveFailed", { name: f.name, error: errorMessage(err) }));
    }
  }
}
async function importExternalFiles(app, files, target) {
  let imported = 0;
  for (const file of files) {
    try {
      const data = await file.arrayBuffer();
      const taken = new Set(app.vault.getAllLoadedFiles().map((f) => f.path));
      const dest = (0, import_obsidian3.normalizePath)(availablePath(target.isRoot() ? "" : target.path, file.name, taken));
      await app.vault.createBinary(dest, data);
      imported++;
    } catch (e) {
      new import_obsidian3.Notice(t("importFailed", { name: file.name }));
    }
  }
  if (imported > 0) new import_obsidian3.Notice(t("filesImported", { n: imported }));
  return imported;
}
async function duplicateFile(app, f) {
  const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
  let n = 1;
  let path = (0, import_obsidian3.normalizePath)(dir + f.basename + " copy." + f.extension);
  while (app.vault.getAbstractFileByPath(path)) {
    path = (0, import_obsidian3.normalizePath)(dir + f.basename + " copy " + n++ + "." + f.extension);
  }
  try {
    await app.vault.copy(f, path);
  } catch (err) {
    new import_obsidian3.Notice(t("duplicateFailed", { name: f.name, error: errorMessage(err) }));
  }
}
async function trashFiles(app, paths) {
  for (const p of paths) {
    const f = app.vault.getAbstractFileByPath(p);
    if (!f) continue;
    try {
      await app.fileManager.trashFile(f);
    } catch (err) {
      new import_obsidian3.Notice(t("deleteFailed", { name: f.name, error: errorMessage(err) }));
    }
  }
}

// src/modals.ts
var import_obsidian6 = require("obsidian");

// src/preview.ts
var import_obsidian5 = require("obsidian");

// src/utils.ts
var import_obsidian4 = require("obsidian");
function sortChildren(children, s, mode = s.sortMode) {
  const mtime = (f) => f instanceof import_obsidian4.TFile ? f.stat.mtime : 0;
  const ctime = (f) => f instanceof import_obsidian4.TFile ? f.stat.ctime : 0;
  const size = (f) => f instanceof import_obsidian4.TFile ? f.stat.size : 0;
  return [...children].sort((a, b) => {
    if (s.foldersFirst) {
      const aF = a instanceof import_obsidian4.TFolder, bF = b instanceof import_obsidian4.TFolder;
      if (aF !== bF) return aF ? -1 : 1;
    }
    switch (mode) {
      case "name-desc":
        return naturalCompare(b.name, a.name);
      case "mtime-desc":
        return mtime(b) - mtime(a) || naturalCompare(a.name, b.name);
      case "mtime-asc":
        return mtime(a) - mtime(b) || naturalCompare(a.name, b.name);
      case "ctime-desc":
        return ctime(b) - ctime(a) || naturalCompare(a.name, b.name);
      case "ctime-asc":
        return ctime(a) - ctime(b) || naturalCompare(a.name, b.name);
      case "size-desc":
        return size(b) - size(a) || naturalCompare(a.name, b.name);
      case "size-asc":
        return size(a) - size(b) || naturalCompare(a.name, b.name);
      default:
        return naturalCompare(a.name, b.name);
    }
  });
}
function visibleChildren(folder, s) {
  var _a;
  const patterns = parseExcludePatterns(s.excludePatterns);
  let children = folder.children;
  if (patterns.length > 0) {
    children = children.filter((c) => !matchesExcludePatterns(c.path, patterns));
  }
  const mode = (_a = s.columnSortModes[folder.path]) != null ? _a : s.sortMode;
  return pinnedFirst(sortChildren(children, s, mode), (c) => s.pinnedPaths[c.path]);
}
function folderNoteOf(folder) {
  const note = folder.children.find(
    (c) => c instanceof import_obsidian4.TFile && c.extension === "md" && c.basename === folder.name
  );
  return note instanceof import_obsidian4.TFile ? note : null;
}
function displayName(f) {
  if (f instanceof import_obsidian4.TFile && f.extension === "md") return f.basename;
  return f.name;
}
var IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
function isImageFile(f) {
  return IMAGE_EXTENSIONS.includes(f.extension);
}
function iconFor(f) {
  if (!(f instanceof import_obsidian4.TFile)) return "folder";
  switch (f.extension) {
    case "md":
      return "file-text";
    case "canvas":
      return "layout-dashboard";
    case "pdf":
      return "file-type";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
      return "image";
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "m4a":
      return "file-audio";
    case "mp4":
    case "mov":
    case "webm":
    case "mkv":
      return "file-video";
    default:
      return "file";
  }
}

// src/preview.ts
var MARKDOWN_PREVIEW_CHARS = 1e3;
var AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "m4a"];
var VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "ogv"];
function renderPreviewColumn(view, container, file) {
  const col = container.createDiv({ cls: "column-explorer-column column-explorer-preview" });
  const inner = col.createDiv({ cls: "column-explorer-preview-inner" });
  renderPreviewContent(view, inner, file, view.newPreviewOwner());
}
function renderPreviewContent(view, inner, file, owner) {
  if (!renderMediaPreview(view, inner, file)) {
    const big = inner.createDiv({ cls: "column-explorer-preview-icon" });
    (0, import_obsidian5.setIcon)(big, iconFor(file));
  }
  inner.createDiv({ cls: "column-explorer-preview-name", text: displayName(file) });
  const meta = inner.createDiv({ cls: "column-explorer-preview-meta" });
  meta.createDiv({ text: file.extension.toUpperCase() + " \xB7 " + humanSize(file.stat.size) });
  meta.createDiv({ text: t("modified") + ": " + new Date(file.stat.mtime).toLocaleString() });
  meta.createDiv({ text: t("created") + ": " + new Date(file.stat.ctime).toLocaleString() });
  const btn = inner.createEl("button", { text: t("open"), cls: "mod-cta" });
  btn.addEventListener("click", (e) => {
    void view.app.workspace.getLeaf(import_obsidian5.Keymap.isModEvent(e)).openFile(file);
  });
  if (file.extension === "md" && view.plugin.settings.showMarkdownPreview) {
    void renderMarkdownSnippet(view, inner, file, owner);
  }
}
function renderMediaPreview(view, inner, file) {
  const src = view.app.vault.getResourcePath(file);
  if (isImageFile(file)) {
    inner.createEl("img", { cls: "column-explorer-preview-image", attr: { src } });
    return true;
  }
  if (AUDIO_EXTENSIONS.includes(file.extension)) {
    inner.createEl("audio", { cls: "column-explorer-preview-audio", attr: { src, controls: "" } });
    return true;
  }
  if (VIDEO_EXTENSIONS.includes(file.extension)) {
    inner.createEl("video", { cls: "column-explorer-preview-video", attr: { src, controls: "" } });
    return true;
  }
  if (file.extension === "pdf" && import_obsidian5.Platform.isDesktopApp) {
    inner.createEl("iframe", { cls: "column-explorer-preview-pdf", attr: { src } });
    return true;
  }
  return false;
}
async function renderMarkdownSnippet(view, inner, file, owner) {
  try {
    const content = await view.app.vault.cachedRead(file);
    if (!inner.isConnected) return;
    let snippet = content.slice(0, MARKDOWN_PREVIEW_CHARS);
    if (content.length > MARKDOWN_PREVIEW_CHARS) snippet += "\u2026";
    if (!snippet.trim()) return;
    const box = inner.createDiv({ cls: "column-explorer-preview-md markdown-rendered" });
    await import_obsidian5.MarkdownRenderer.render(view.app, snippet, box, file.path, owner);
  } catch (e) {
  }
}

// src/modals.ts
var ConfirmModal = class extends import_obsidian6.Modal {
  constructor(app, message, onConfirm) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.titleEl.setText(t("confirmDeleteTitle"));
    this.contentEl.createEl("p", { text: this.message });
    const row = this.contentEl.createDiv({ cls: "modal-button-container" });
    const ok = row.createEl("button", { text: t("confirm"), cls: "mod-warning" });
    ok.addEventListener("click", () => {
      this.close();
      this.onConfirm();
    });
    const cancel = row.createEl("button", { text: t("cancel") });
    cancel.addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};
var QuickLookModal = class extends import_obsidian6.Modal {
  constructor(app, view, file) {
    super(app);
    this.view = view;
    this.file = file;
    /** Владелец отрисованного markdown — выгружается вместе с модалкой. */
    this.owner = new import_obsidian6.Component();
  }
  onOpen() {
    this.owner.load();
    this.modalEl.addClass("column-explorer-quicklook");
    if (import_obsidian6.Platform.isMobile) {
      const bar = this.contentEl.createDiv({ cls: "column-explorer-quicklook-bar" });
      const close = bar.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t("close") } });
      (0, import_obsidian6.setIcon)(close, "x");
      close.addEventListener("click", () => this.close());
    }
    const inner = this.contentEl.createDiv({ cls: "column-explorer-preview-inner" });
    renderPreviewContent(this.view, inner, this.file, this.owner);
    this.scope.register([], " ", () => {
      this.close();
      return false;
    });
  }
  onClose() {
    this.owner.unload();
    this.contentEl.empty();
  }
};
var FolderSuggestModal = class extends import_obsidian6.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("moveToPlaceholder"));
  }
  getItems() {
    const folders = [this.app.vault.getRoot()];
    const walk = (folder) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian6.TFolder) {
          folders.push(child);
          walk(child);
        }
      }
    };
    walk(this.app.vault.getRoot());
    return folders;
  }
  getItemText(folder) {
    return folder.isRoot() ? "/" : folder.path;
  }
  onChooseItem(folder) {
    this.onChoose(folder);
  }
};
var IconSuggestModal = class extends import_obsidian6.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("iconPlaceholder"));
  }
  getItems() {
    return (0, import_obsidian6.getIconIds)();
  }
  getItemText(icon) {
    return icon;
  }
  renderSuggestion(match, el) {
    el.addClass("column-explorer-icon-suggestion");
    const preview = el.createSpan({ cls: "column-explorer-icon-suggestion-preview" });
    (0, import_obsidian6.setIcon)(preview, match.item);
    el.createSpan({ text: match.item });
  }
  onChooseItem(icon) {
    this.onChoose(icon);
  }
};

// src/menus.ts
var import_obsidian7 = require("obsidian");
function sortLabel(mode) {
  const keys = {
    "name-asc": "sortNameAsc",
    "name-desc": "sortNameDesc",
    "mtime-desc": "sortMtimeDesc",
    "mtime-asc": "sortMtimeAsc",
    "ctime-desc": "sortCtimeDesc",
    "ctime-asc": "sortCtimeAsc",
    "size-desc": "sortSizeDesc",
    "size-asc": "sortSizeAsc"
  };
  return t(keys[mode]);
}
function copyToClipboard(text, notice) {
  void navigator.clipboard.writeText(text).then(() => new import_obsidian7.Notice(notice));
}
function colorMenuTitle(colorKey, label) {
  return createFragment((frag) => {
    const dot = frag.createSpan({ cls: "column-explorer-color-dot" });
    if (colorKey) dot.style.setProperty("--ce-dot-color", `var(--color-${colorKey})`);
    else dot.addClass("is-default");
    const text = frag.createSpan({ text: label });
    if (colorKey) text.style.color = `var(--color-${colorKey})`;
  });
}
function addFolderColorMenu(view, menu, folder) {
  const current = view.plugin.settings.folderColors[folder.path];
  const capitalized = (k) => "color" + k.charAt(0).toUpperCase() + k.slice(1);
  const fillColorItems = (target) => {
    for (const key of FOLDER_COLOR_KEYS) {
      target.addItem((i) => i.setTitle(colorMenuTitle(key, t(capitalized(key)))).setChecked(current === key).onClick(async () => {
        view.plugin.settings.folderColors = {
          ...view.plugin.settings.folderColors,
          [folder.path]: key
        };
        await view.plugin.saveSettings();
        view.render();
      }));
    }
    target.addSeparator();
    target.addItem((i) => i.setTitle(colorMenuTitle(null, t("colorDefault"))).setChecked(!current).onClick(async () => {
      const rest = { ...view.plugin.settings.folderColors };
      delete rest[folder.path];
      view.plugin.settings.folderColors = rest;
      await view.plugin.saveSettings();
      view.render();
    }));
  };
  menu.addItem((item) => {
    item.setTitle(t("folderColor")).setIcon("palette");
    const withSubmenu = item;
    if (typeof withSubmenu.setSubmenu === "function") {
      fillColorItems(withSubmenu.setSubmenu());
    } else {
      fillColorItems(menu);
    }
  });
}
function showFileMenu(view, e, f, depth) {
  const app = view.app;
  const menu = new import_obsidian7.Menu();
  const multi = view.multiSelDepth === depth && view.multiSel.has(f.path) && view.multiSel.size > 1;
  if (multi) {
    const paths = [...view.multiSel];
    menu.addItem((i) => i.setTitle(t("moveTo")).setIcon("folder-input").onClick(() => new FolderSuggestModal(app, (target) => {
      void moveFiles(app, paths, target).then(() => view.clearMulti());
    }).open()));
    menu.addItem((i) => i.setTitle(t("duplicateN", { n: paths.length })).setIcon("copy").onClick(async () => {
      for (const p of paths) {
        const file = app.vault.getAbstractFileByPath(p);
        if (file instanceof import_obsidian7.TFile) await duplicateFile(app, file);
      }
    }));
    menu.addItem((i) => i.setTitle(t("deleteN", { n: paths.length })).setIcon("trash").onClick(() => view.deleteMany(paths)));
    menu.showAtMouseEvent(e);
    return;
  }
  if (f instanceof import_obsidian7.TFolder) {
    menu.addItem((i) => i.setTitle(t("newNote")).setIcon("file-plus").onClick(() => view.createNote(f)));
    menu.addItem((i) => i.setTitle(t("newFolder")).setIcon("folder-plus").onClick(() => view.createFolder(f)));
    addFolderColorMenu(view, menu, f);
    addFolderIconItems(view, menu, f);
    menu.addSeparator();
  }
  if (f instanceof import_obsidian7.TFile) {
    if (import_obsidian7.Platform.isMobile) {
      menu.addItem((i) => i.setTitle(t("preview")).setIcon("eye").onClick(() => new QuickLookModal(app, view, f).open()));
    }
    menu.addItem((i) => i.setTitle(t("openNewTab")).setIcon("file-plus-2").onClick(() => app.workspace.getLeaf("tab").openFile(f)));
    menu.addItem((i) => i.setTitle(t("openRight")).setIcon("separator-vertical").onClick(() => app.workspace.getLeaf("split").openFile(f)));
    menu.addSeparator();
    menu.addItem((i) => i.setTitle(t("duplicate")).setIcon("copy").onClick(() => duplicateFile(app, f)));
  }
  const isPinned = view.plugin.settings.pinnedPaths[f.path] !== void 0;
  menu.addItem((i) => i.setTitle(isPinned ? t("unpin") : t("pin")).setIcon(isPinned ? "pin-off" : "pin").onClick(async () => {
    const pinned = { ...view.plugin.settings.pinnedPaths };
    if (isPinned) {
      delete pinned[f.path];
    } else {
      const orders = Object.values(pinned);
      pinned[f.path] = orders.length > 0 ? Math.max(...orders) + 1 : 0;
    }
    view.plugin.settings.pinnedPaths = pinned;
    await view.plugin.saveSettings();
    view.render();
  }));
  const isFav = view.isFavorite(f.path);
  menu.addItem((i) => i.setTitle(isFav ? t("removeFavorite") : t("addFavorite")).setIcon(isFav ? "star-off" : "star").onClick(() => view.toggleFavorite(f.path)));
  menu.addItem((i) => i.setTitle(t("moveTo")).setIcon("folder-input").onClick(() => new FolderSuggestModal(app, (target) => void moveFiles(app, [f.path], target)).open()));
  menu.addItem((i) => i.setTitle(t("rename")).setIcon("pencil").onClick(() => view.startRename(f)));
  menu.addItem((i) => i.setTitle(t("delete")).setIcon("trash").onClick(() => view.deleteMany([f.path])));
  menu.addSeparator();
  menu.addItem((i) => i.setTitle(t("copyPath")).setIcon("clipboard-copy").onClick(() => copyToClipboard(f.path, t("pathCopied"))));
  const adapter = app.vault.adapter;
  if (adapter instanceof import_obsidian7.FileSystemAdapter) {
    menu.addItem((i) => i.setTitle(t("copyFullPath")).setIcon("terminal").onClick(() => copyToClipboard(shellEscapePath(adapter.getBasePath() + "/" + f.path), t("pathCopied"))));
  }
  if (f instanceof import_obsidian7.TFile) {
    menu.addItem((i) => i.setTitle(t("copyWikiLink")).setIcon("brackets").onClick(() => copyToClipboard("[[" + app.metadataCache.fileToLinktext(f, "", false) + "]]", t("linkCopied"))));
    menu.addItem((i) => i.setTitle(t("copyMdLink")).setIcon("link").onClick(() => copyToClipboard(app.fileManager.generateMarkdownLink(f, ""), t("linkCopied"))));
    menu.addItem((i) => i.setTitle(t("copyObsidianUrl")).setIcon("external-link").onClick(() => {
      const url = "obsidian://open?vault=" + encodeURIComponent(app.vault.getName()) + "&file=" + encodeURIComponent(f.path);
      copyToClipboard(url, t("linkCopied"));
    }));
  }
  app.workspace.trigger("file-menu", menu, f, "file-explorer-context-menu", view.leaf);
  menu.showAtMouseEvent(e);
}
function addFolderIconItems(view, menu, folder) {
  menu.addItem((i) => i.setTitle(t("folderIcon")).setIcon("shapes").onClick(() => new IconSuggestModal(view.app, (icon) => {
    view.plugin.settings.folderIcons = {
      ...view.plugin.settings.folderIcons,
      [folder.path]: icon
    };
    void view.plugin.saveSettings();
    view.render();
  }).open()));
  if (view.plugin.settings.folderIcons[folder.path]) {
    menu.addItem((i) => i.setTitle(t("folderIconReset")).setIcon("shapes").onClick(() => {
      const rest = { ...view.plugin.settings.folderIcons };
      delete rest[folder.path];
      view.plugin.settings.folderIcons = rest;
      void view.plugin.saveSettings();
      view.render();
    }));
  }
}
function showColumnHeaderMenu(view, e, folder) {
  const menu = new import_obsidian7.Menu();
  menu.addItem((i) => i.setTitle(t("newNote")).setIcon("file-plus").onClick(() => void view.createNote(folder)));
  menu.addItem((i) => i.setTitle(t("newFolder")).setIcon("folder-plus").onClick(() => void view.createFolder(folder)));
  menu.addItem((i) => i.setTitle(t("newCanvas")).setIcon("layout-dashboard").onClick(() => void view.createNote(folder, "canvas", "{}")));
  menu.addSeparator();
  const current = view.plugin.settings.columnSortModes[folder.path];
  const setMode = (mode) => {
    const rest = { ...view.plugin.settings.columnSortModes };
    if (mode === null) delete rest[folder.path];
    else rest[folder.path] = mode;
    view.plugin.settings.columnSortModes = rest;
    void view.plugin.saveSettings();
    view.render();
  };
  menu.addItem((i) => i.setTitle(t("sortDefault")).setChecked(current === void 0).onClick(() => setMode(null)));
  for (const mode of SORT_MODE_VALUES) {
    menu.addItem((i) => i.setTitle(sortLabel(mode)).setChecked(current === mode).onClick(() => setMode(mode)));
  }
  menu.showAtMouseEvent(e);
}
function showFolderBackgroundMenu(view, e, folder) {
  const menu = new import_obsidian7.Menu();
  menu.addItem((i) => i.setTitle(t("newNote")).setIcon("file-plus").onClick(() => void view.createNote(folder)));
  menu.addItem((i) => i.setTitle(t("newFolder")).setIcon("folder-plus").onClick(() => void view.createFolder(folder)));
  menu.addItem((i) => i.setTitle(t("newCanvas")).setIcon("layout-dashboard").onClick(() => void view.createNote(folder, "canvas", "{}")));
  menu.showAtMouseEvent(e);
}
function fillSortItems(view, target) {
  for (const m of SORT_MODE_VALUES) {
    target.addItem((i) => i.setTitle(sortLabel(m)).setChecked(view.plugin.settings.sortMode === m).onClick(async () => {
      view.plugin.settings.sortMode = m;
      await view.plugin.saveSettings();
      view.render();
    }));
  }
}
function showSortMenu(view, e) {
  const menu = new import_obsidian7.Menu();
  fillSortItems(view, menu);
  menu.showAtMouseEvent(e);
}
function showMobileCreateMenu(view, e) {
  const folder = view.currentFolder();
  const menu = new import_obsidian7.Menu();
  menu.addItem((i) => i.setTitle(t("newNote")).setIcon("file-plus").onClick(() => void view.createNote(folder)));
  menu.addItem((i) => i.setTitle(t("newFolder")).setIcon("folder-plus").onClick(() => void view.createFolder(folder)));
  menu.addItem((i) => i.setTitle(t("newCanvas")).setIcon("layout-dashboard").onClick(() => void view.createNote(folder, "canvas", "{}")));
  menu.showAtMouseEvent(e);
}
function showMobileMoreMenu(view, e) {
  const menu = new import_obsidian7.Menu();
  menu.addItem((i) => i.setTitle(t("reveal")).setIcon("locate").onClick(() => view.revealFile(view.app.workspace.getActiveFile())));
  menu.addItem((i) => i.setTitle(t("collapse")).setIcon("chevrons-left").onClick(() => view.collapseToRoot()));
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle(t("sort")).setIcon("arrow-up-narrow-wide");
    const withSubmenu = item;
    if (typeof withSubmenu.setSubmenu === "function") fillSortItems(view, withSubmenu.setSubmenu());
    else fillSortItems(view, menu);
  });
  menu.showAtMouseEvent(e);
}

// src/mobile.ts
function vibrate() {
  if (typeof navigator.vibrate === "function") navigator.vibrate(20);
}
function toolbarButton(view, parent, icon, label, onClick) {
  const btn = parent.createEl("button", {
    cls: "clickable-icon column-explorer-toolbar-btn",
    attr: { "aria-label": label }
  });
  (0, import_obsidian8.setIcon)(btn, icon);
  view.registerDomEvent(btn, "click", onClick);
  return btn;
}
var MOBILE_TOOLBAR_BUTTONS = 5;
function setEnabled(btn, enabled) {
  btn.toggleClass("is-disabled", !enabled);
  btn.setAttribute("aria-disabled", String(!enabled));
}
function buildMobileToolbar(view, toolbar) {
  toolbar.addClass("is-mobile-toolbar");
  const back = toolbarButton(view, toolbar, "arrow-left", t("navBack"), () => view.goBack());
  const forward = toolbarButton(view, toolbar, "arrow-right", t("navForward"), () => view.goForward());
  const search = toolbarButton(view, toolbar, "search", t("search"), () => view.toggleMobileSearch());
  toolbarButton(view, toolbar, "plus", t("create"), (e) => showMobileCreateMenu(view, e));
  toolbarButton(view, toolbar, "more-horizontal", t("more"), (e) => showMobileMoreMenu(view, e));
  return () => {
    setEnabled(back, view.canGoBack());
    setEnabled(forward, view.canGoForward());
    search.setAttribute("aria-pressed", String(view.isSearchOpen()));
    search.toggleClass("is-active", view.isSearchOpen());
  };
}
function applyMobileScale(view, container) {
  const { mobileUiScale, mobileIconSize } = normalizeMobileSettings(view.plugin.settings);
  const scale = mobileUiScale / 100;
  const control = mobileControlSize(scale, container.clientWidth, MOBILE_TOOLBAR_BUTTONS);
  const rowHeight = Math.max(MIN_TOUCH_TARGET_PX, Math.round(MIN_TOUCH_TARGET_PX * scale));
  container.style.setProperty("--ce-mobile-scale", String(scale));
  container.style.setProperty("--ce-mobile-icon-size", mobileIconSize + "px");
  container.style.setProperty("--ce-mobile-control-size", control + "px");
  container.style.setProperty("--ce-mobile-row-height", rowHeight + "px");
}
function addUpButton(view, header) {
  const enabled = view.canGoUp();
  const btn = header.createEl("button", {
    cls: "clickable-icon column-explorer-up-btn",
    attr: { "aria-label": t("navUp"), "aria-disabled": String(!enabled) }
  });
  (0, import_obsidian8.setIcon)(btn, "arrow-up");
  if (enabled) btn.addEventListener("click", () => view.goUp());
  else btn.addClass("is-disabled");
  header.prepend(btn);
}
function buildActionBar(view, container) {
  const bar = container.createDiv({ cls: "column-explorer-action-bar", attr: { role: "toolbar" } });
  bar.hide();
  const count = bar.createDiv({ cls: "column-explorer-action-count", attr: { "aria-live": "polite" } });
  const action = (icon, label, onClick) => {
    const btn = bar.createEl("button", { cls: "clickable-icon column-explorer-action-btn", attr: { "aria-label": label } });
    (0, import_obsidian8.setIcon)(btn, icon);
    view.registerDomEvent(btn, "click", onClick);
  };
  action("folder-input", t("moveTo"), () => {
    const paths = [...view.multiSel];
    new FolderSuggestModal(view.app, (target) => {
      void moveFiles(view.app, paths, target).then(() => view.exitMobileSelection());
    }).open();
  });
  action("copy", t("duplicate"), () => {
    view.duplicateSelected(view.multiSelDepth);
    view.exitMobileSelection();
  });
  action("trash", t("delete"), () => view.deleteMany([...view.multiSel]));
  action("more-horizontal", t("more"), (e) => {
    var _a;
    const first = view.app.vault.getAbstractFileByPath((_a = [...view.multiSel][0]) != null ? _a : "");
    if (first) showFileMenu(view, e, first, view.multiSelDepth);
  });
  action("x", t("cancelSelection"), () => view.exitMobileSelection());
  return () => {
    const active = view.isMobileSelecting();
    const label = t("selectedN", { n: view.multiSel.size });
    bar.toggle(active);
    count.setText(label);
    bar.setAttribute("aria-label", label);
  };
}
function setupLongPress(view, listEl, depth) {
  let phase = "idle";
  let timer = 0;
  let startX = 0;
  let startY = 0;
  let pressedPath = null;
  const stopTimer = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const itemPath = (e) => {
    var _a, _b;
    const el = (_a = e.target) == null ? void 0 : _a.closest(".column-explorer-item");
    return (_b = el == null ? void 0 : el.dataset.path) != null ? _b : null;
  };
  listEl.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.pointerType === "mouse") return;
    pressedPath = itemPath(e);
    if (!pressedPath) return;
    startX = e.clientX;
    startY = e.clientY;
    phase = nextPressPhase(phase, { type: "down" });
    timer = window.setTimeout(() => {
      phase = nextPressPhase(phase, { type: "timeout" });
      if (phase !== "fired") return;
      const f = pressedPath ? view.app.vault.getAbstractFileByPath(pressedPath) : null;
      if (!f) {
        phase = "cancelled";
        return;
      }
      vibrate();
      view.enterMobileSelection(f, depth);
    }, LONG_PRESS_MS);
  });
  listEl.addEventListener("pointermove", (e) => {
    if (phase !== "pending") return;
    phase = nextPressPhase(phase, { type: "move", dx: e.clientX - startX, dy: e.clientY - startY });
    if (phase === "cancelled") stopTimer();
  });
  listEl.addEventListener("pointerup", () => {
    stopTimer();
    phase = nextPressPhase(phase, { type: "up" });
  });
  listEl.addEventListener("pointercancel", () => {
    stopTimer();
    phase = nextPressPhase(phase, { type: "cancel" });
  });
  listEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  listEl.addEventListener("click", (e) => {
    const action = mobileTapAction({ selectionMode: view.isMobileSelecting(), pressPhase: phase });
    phase = nextPressPhase(phase, { type: "click" });
    if (action === "activate") return;
    e.preventDefault();
    e.stopPropagation();
    if (action !== "toggle") return;
    const path = itemPath(e);
    const f = path ? view.app.vault.getAbstractFileByPath(path) : null;
    if (f) view.toggleMobileSelection(f, depth);
  }, true);
}
var SWIPE_IGNORE_SELECTOR = "input, textarea, button, a, [role='button'], .clickable-icon";
function setupEdgeSwipe(view, el) {
  let start = null;
  view.registerDomEvent(el, "touchstart", (e) => {
    var _a;
    start = null;
    if (e.touches.length !== 1) return;
    if (view.isMobileSelecting()) return;
    if (el.ownerDocument.querySelector(".modal-container")) return;
    if ((_a = e.target) == null ? void 0 : _a.closest(SWIPE_IGNORE_SELECTOR)) return;
    const rect = el.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    if (x > EDGE_ZONE_PX && x < rect.width - EDGE_ZONE_PX) return;
    start = { x, y: e.touches[0].clientY, width: rect.width };
  }, { passive: true });
  view.registerDomEvent(el, "touchend", (e) => {
    const from = start;
    start = null;
    if (!from || e.changedTouches.length !== 1) return;
    const rect = el.getBoundingClientRect();
    const direction = detectEdgeSwipe({
      startX: from.x,
      startY: from.y,
      endX: e.changedTouches[0].clientX - rect.left,
      endY: e.changedTouches[0].clientY,
      containerWidth: from.width
    });
    if (direction === "back") view.goBack();
    else if (direction === "forward") view.goForward();
  });
  view.registerDomEvent(el, "touchcancel", () => {
    start = null;
  });
}
function setupViewportTracking(view, container) {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const apply = () => {
    const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    container.style.setProperty("--ce-keyboard-inset", inset + "px");
  };
  viewport.addEventListener("resize", apply);
  viewport.addEventListener("scroll", apply);
  view.register(() => {
    viewport.removeEventListener("resize", apply);
    viewport.removeEventListener("scroll", apply);
  });
  apply();
}

// src/column.ts
var import_obsidian10 = require("obsidian");

// src/dnd.ts
var import_obsidian9 = require("obsidian");
var activeDragPaths = null;
function notifyDragManager(app, e, f) {
  try {
    const dragManager = app.dragManager;
    if (!dragManager || !(f instanceof import_obsidian9.TFile || f instanceof import_obsidian9.TFolder)) return;
    const dragData = f instanceof import_obsidian9.TFile ? dragManager.dragFile(e, f) : dragManager.dragFolder(e, f);
    dragManager.onDragStart(e, dragData);
  } catch (e2) {
  }
}
function itemUnderEvent(listEl, e) {
  var _a;
  const target = e.target;
  return (_a = target == null ? void 0 : target.closest(".column-explorer-item")) != null ? _a : null;
}
function folderForItem(app, item) {
  if (!(item == null ? void 0 : item.dataset.path)) return null;
  const f = app.vault.getAbstractFileByPath(item.dataset.path);
  return f instanceof import_obsidian9.TFolder ? f : null;
}
function setupColumnDnd(view, listEl, columnFolder, depth) {
  if (import_obsidian9.Platform.isMobile) return;
  const app = view.app;
  let highlighted = null;
  const setHighlight = (el) => {
    if (highlighted === el) return;
    highlighted == null ? void 0 : highlighted.removeClass("is-drop-target");
    highlighted = el;
    highlighted == null ? void 0 : highlighted.addClass("is-drop-target");
  };
  listEl.addEventListener("dragstart", (e) => {
    var _a;
    const item = itemUnderEvent(listEl, e);
    if (!(item == null ? void 0 : item.dataset.path)) return;
    const f = app.vault.getAbstractFileByPath(item.dataset.path);
    if (!f) return;
    const paths = view.dragPayload(f, depth);
    activeDragPaths = paths;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    if (paths.length === 1) notifyDragManager(app, e, f);
    (_a = e.dataTransfer) == null ? void 0 : _a.setData("text/plain", JSON.stringify(paths));
  });
  listEl.addEventListener("dragend", () => {
    activeDragPaths = null;
    setHighlight(null);
  });
  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files") ? "copy" : "move";
    const targetFolder = folderForItem(app, itemUnderEvent(listEl, e));
    setHighlight(targetFolder ? itemUnderEvent(listEl, e) : listEl);
  });
  listEl.addEventListener("dragleave", (e) => {
    if (!listEl.contains(e.relatedTarget)) setHighlight(null);
  });
  listEl.addEventListener("drop", (e) => {
    var _a, _b, _c, _d;
    e.preventDefault();
    e.stopPropagation();
    const dropFolder = (_a = folderForItem(app, itemUnderEvent(listEl, e))) != null ? _a : columnFolder;
    setHighlight(null);
    const osFiles = (_b = e.dataTransfer) == null ? void 0 : _b.files;
    if (!activeDragPaths && osFiles && osFiles.length > 0) {
      void importExternalFiles(app, Array.from(osFiles), dropFolder);
      return;
    }
    const paths = activeDragPaths != null ? activeDragPaths : parseDragPaths((_d = (_c = e.dataTransfer) == null ? void 0 : _c.getData("text/plain")) != null ? _d : "");
    activeDragPaths = null;
    if (paths.length === 0) return;
    if (paths.length === 1 && reorderPinned(view, paths[0], itemUnderEvent(listEl, e))) return;
    void moveFiles(app, paths, dropFolder).then(() => view.clearMulti());
  });
}
function reorderPinned(view, dragPath, targetItem) {
  var _a, _b;
  const targetPath = targetItem == null ? void 0 : targetItem.dataset.path;
  if (!targetPath || targetPath === dragPath) return false;
  const s = view.plugin.settings;
  if (s.pinnedPaths[dragPath] === void 0 || s.pinnedPaths[targetPath] === void 0) return false;
  const drag = view.app.vault.getAbstractFileByPath(dragPath);
  const target = view.app.vault.getAbstractFileByPath(targetPath);
  if (!drag || !target || ((_a = drag.parent) == null ? void 0 : _a.path) !== ((_b = target.parent) == null ? void 0 : _b.path)) return false;
  s.pinnedPaths = movePinnedBefore(s.pinnedPaths, dragPath, targetPath);
  void view.plugin.saveSettings();
  view.render();
  return true;
}

// src/column.ts
function itemFromEvent(e) {
  var _a;
  const el = (_a = e.target) == null ? void 0 : _a.closest(".column-explorer-item");
  return (el == null ? void 0 : el.dataset.path) ? { el, path: el.dataset.path } : null;
}
function renderColumn(view, container, folder, depth) {
  var _a, _b;
  const col = container.createDiv({ cls: "column-explorer-column" });
  col.dataset.depth = String(depth);
  col.dataset.folderPath = folder.path;
  const customWidth = (_a = view.plugin.settings.columnWidths[folder.path]) != null ? _a : folder.isRoot() ? view.plugin.settings.columnWidth + ROOT_COLUMN_EXTRA_WIDTH : void 0;
  if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");
  const header = col.createDiv({ cls: "column-explorer-column-header" });
  if (import_obsidian10.Platform.isMobile) addUpButton(view, header);
  header.createSpan({ cls: "column-explorer-column-title", text: folder.isRoot() ? view.app.vault.getName() : folder.name });
  header.createSpan({ cls: "column-explorer-column-count" });
  header.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showColumnHeaderMenu(view, e, folder);
  });
  const viewMode = (_b = view.plugin.settings.columnViewModes[folder.path]) != null ? _b : "list";
  const toggle = header.createDiv({
    cls: "clickable-icon column-explorer-view-toggle",
    attr: {
      "aria-label": viewMode === "list" ? t("viewAsGrid") : t("viewAsList"),
      role: "button",
      "aria-pressed": String(viewMode === "grid")
    }
  });
  (0, import_obsidian10.setIcon)(toggle, viewMode === "list" ? "layout-grid" : "list");
  toggle.addEventListener("click", () => {
    view.plugin.settings.columnViewModes = {
      ...view.plugin.settings.columnViewModes,
      [folder.path]: viewMode === "list" ? "grid" : "list"
    };
    void view.plugin.saveSettings();
    view.render();
  });
  const list = col.createDiv({ cls: "column-explorer-list", attr: { role: "listbox" } });
  if (viewMode === "grid") list.addClass("is-grid");
  list.addEventListener("click", (e) => {
    const hit = itemFromEvent(e);
    if (!hit) {
      if (e.target === list) {
        view.clearMulti();
        view.render();
      }
      return;
    }
    if (view.specialKind(hit.path)) {
      view.clearMulti();
      view.selectSpecial(hit.path);
      return;
    }
    const f = view.app.vault.getAbstractFileByPath(hit.path);
    if (!f || view.isRenaming(hit.path)) return;
    if (e.ctrlKey || e.metaKey) {
      view.toggleMulti(f, depth);
      return;
    }
    if (e.shiftKey) {
      view.rangeMulti(f, depth, view.childrenOf(folder));
      return;
    }
    view.clearMulti();
    view.selectItem(f, depth, e);
  });
  list.addEventListener("dblclick", (e) => {
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f instanceof import_obsidian10.TFile) void view.app.workspace.getLeaf("tab").openFile(f);
  });
  list.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f instanceof import_obsidian10.TFile) void view.app.workspace.getLeaf("tab").openFile(f);
  });
  list.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const hit = itemFromEvent(e);
    if (!hit) {
      if (e.target === list) showFolderBackgroundMenu(view, e, folder);
      return;
    }
    const f = view.app.vault.getAbstractFileByPath(hit.path);
    if (f) showFileMenu(view, e, f, depth);
  });
  setupColumnDnd(view, list, folder, depth);
  if (import_obsidian10.Platform.isMobile) setupLongPress(view, list, depth);
  renderColumnList(view, list, folder, depth);
  addResizeHandle(view, col, folder.path);
  return col;
}
var RENDER_CHUNK = 300;
var listObservers = /* @__PURE__ */ new WeakMap();
function disconnectListObservers(container) {
  container.querySelectorAll(".column-explorer-list").forEach((list) => {
    var _a;
    (_a = listObservers.get(list)) == null ? void 0 : _a.disconnect();
    listObservers.delete(list);
  });
}
function renderColumnList(view, list, folder, depth) {
  var _a, _b, _c;
  (_a = listObservers.get(list)) == null ? void 0 : _a.disconnect();
  listObservers.delete(list);
  list.empty();
  const specials = folder.isRoot() && depth === 0 ? buildSpecialItems(view) : [];
  const specialsOnTop = view.plugin.settings.specialItemsPosition === "top";
  if (specialsOnTop) specials.forEach((el) => list.appendChild(el));
  const appendSpecialsBottom = () => {
    if (!specialsOnTop) specials.forEach((el) => list.appendChild(el));
  };
  const children = view.childrenOf(folder);
  const countEl = (_b = list.closest(".column-explorer-column")) == null ? void 0 : _b.querySelector(".column-explorer-column-count");
  countEl == null ? void 0 : countEl.setText(String(children.length));
  if (children.length === 0) {
    list.createDiv({ cls: "column-explorer-empty", text: view.hasFilter() ? t("noResults") : t("empty") });
    appendSpecialsBottom();
    return;
  }
  const isGrid = ((_c = view.plugin.settings.columnViewModes[folder.path]) != null ? _c : "list") === "grid";
  const selectedIdx = children.findIndex((c) => c.path === view.selection[depth]);
  let rendered = Math.min(children.length, Math.max(RENDER_CHUNK, selectedIdx + 1));
  const frag = createFragment();
  for (let i = 0; i < rendered; i++) frag.appendChild(buildItem(view, children[i], depth, isGrid));
  list.appendChild(frag);
  if (rendered >= children.length) {
    appendSpecialsBottom();
    return;
  }
  const sentinel = list.createDiv({ cls: "column-explorer-load-more" });
  appendSpecialsBottom();
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    const next = Math.min(children.length, rendered + RENDER_CHUNK);
    const batch = createFragment();
    for (let i = rendered; i < next; i++) batch.appendChild(buildItem(view, children[i], depth, isGrid));
    rendered = next;
    list.insertBefore(batch, sentinel);
    if (rendered >= children.length) {
      observer.disconnect();
      listObservers.delete(list);
      sentinel.remove();
    }
  }, { root: list });
  observer.observe(sentinel);
  listObservers.set(list, observer);
}
function buildItem(view, f, depth, isGrid = false) {
  const item = createDiv({ cls: "column-explorer-item", attr: { role: "option" } });
  item.dataset.path = f.path;
  item.draggable = !import_obsidian10.Platform.isMobile;
  const selected = view.selection[depth] === f.path;
  item.setAttribute("aria-selected", String(selected));
  if (selected) item.addClass("is-selected");
  if (selected && depth < view.selection.length - 1) item.addClass("is-ancestor");
  if (view.multiSelDepth === depth && view.multiSel.has(f.path)) item.addClass("is-multi-selected");
  const activeFile = view.app.workspace.getActiveFile();
  if (activeFile && activeFile.path === f.path) item.addClass("is-active-file");
  if (f instanceof import_obsidian10.TFolder) {
    const colorKey = view.plugin.settings.folderColors[f.path];
    if (colorKey) {
      item.addClass("has-folder-color");
      item.style.setProperty("--ce-folder-color", `var(--color-${colorKey})`);
    }
    if (folderNoteOf(f)) item.addClass("has-folder-note");
  }
  const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
  if (isGrid && f instanceof import_obsidian10.TFile && isImageFile(f)) {
    item.addClass("has-thumbnail");
    iconEl.createEl("img", {
      cls: "column-explorer-thumb",
      attr: { src: view.app.vault.getResourcePath(f), loading: "lazy", alt: displayName(f) }
    });
  } else {
    const customIcon = f instanceof import_obsidian10.TFolder ? view.plugin.settings.folderIcons[f.path] : void 0;
    (0, import_obsidian10.setIcon)(iconEl, customIcon != null ? customIcon : iconFor(f));
  }
  const title = item.createDiv({ cls: "column-explorer-item-title" });
  const name = displayName(f);
  const match = view.hasFilter() && f instanceof import_obsidian10.TFile ? splitMatch(name, view.filterQuery()) : null;
  if (match) {
    title.appendText(match[0]);
    title.createSpan({ cls: "column-explorer-match", text: match[1] });
    title.appendText(match[2]);
  } else {
    title.setText(name);
  }
  if (view.plugin.settings.pinnedPaths[f.path] !== void 0) {
    const pin = item.createDiv({ cls: "column-explorer-item-pin" });
    (0, import_obsidian10.setIcon)(pin, "pin");
  }
  if (f instanceof import_obsidian10.TFolder) {
    const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
    (0, import_obsidian10.setIcon)(chev, "chevron-right");
  } else if (f instanceof import_obsidian10.TFile && f.extension !== "md" && view.plugin.settings.showExtensions) {
    item.createDiv({ cls: "column-explorer-item-ext", text: f.extension });
  }
  return item;
}
function buildSpecialItems(view) {
  const items = [];
  if (view.specialKind(RECENTS_PATH)) items.push(buildSpecialItem(view, RECENTS_PATH, "history", t("recents")));
  if (view.specialKind(BOOKMARKS_PATH)) items.push(buildSpecialItem(view, BOOKMARKS_PATH, "bookmark", t("bookmarks")));
  if (view.specialKind(CALENDAR_PATH)) items.push(buildSpecialItem(view, CALENDAR_PATH, "calendar-days", t("calendar")));
  return items;
}
function buildSpecialItem(view, path, icon, label) {
  const item = createDiv({ cls: "column-explorer-item column-explorer-special", attr: { role: "option" } });
  item.dataset.path = path;
  const selected = view.selection[0] === path;
  item.setAttribute("aria-selected", String(selected));
  if (selected) item.addClass("is-selected");
  if (selected && view.selection.length > 1) item.addClass("is-ancestor");
  const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
  (0, import_obsidian10.setIcon)(iconEl, icon);
  item.createDiv({ cls: "column-explorer-item-title", text: label });
  const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
  (0, import_obsidian10.setIcon)(chev, "chevron-right");
  return item;
}
function renderFileListColumn(view, container, title, files, sentinelPath, depth, favorites = []) {
  const col = container.createDiv({ cls: "column-explorer-column" });
  col.dataset.depth = String(depth);
  col.dataset.folderPath = sentinelPath;
  const widthKey = sentinelPath.startsWith(DAY_PATH_PREFIX) ? DAY_PATH_PREFIX : sentinelPath;
  const customWidth = view.plugin.settings.columnWidths[widthKey];
  if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");
  const header = col.createDiv({ cls: "column-explorer-column-header" });
  if (import_obsidian10.Platform.isMobile) addUpButton(view, header);
  header.createSpan({ cls: "column-explorer-column-title", text: title });
  const countEl = header.createSpan({ cls: "column-explorer-column-count" });
  const list = col.createDiv({ cls: "column-explorer-list", attr: { role: "listbox" } });
  countEl.setText(String(favorites.length + files.length));
  if (favorites.length > 0) {
    list.createDiv({ cls: "column-explorer-section-label", text: t("favorites") });
    for (const f of favorites) list.appendChild(buildItem(view, f, depth));
    if (files.length > 0) list.createDiv({ cls: "column-explorer-section-divider" });
  }
  if (favorites.length === 0 && files.length === 0) {
    list.createDiv({ cls: "column-explorer-empty", text: t("empty") });
  } else {
    for (const f of files) list.appendChild(buildItem(view, f, depth));
  }
  list.addEventListener("click", (e) => {
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f instanceof import_obsidian10.TFolder) {
      view.clearMulti();
      view.revealFile(f);
      return;
    }
    if (f instanceof import_obsidian10.TFile) {
      view.clearMulti();
      view.selectItem(f, depth, e);
    }
  });
  list.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f instanceof import_obsidian10.TFile) void view.app.workspace.getLeaf("tab").openFile(f);
  });
  list.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f) showFileMenu(view, e, f, depth);
  });
  if (!import_obsidian10.Platform.isMobile) {
    list.addEventListener("dragstart", (e) => {
      var _a;
      const hit = itemFromEvent(e);
      const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
      if (!f) return;
      notifyDragManager(view.app, e, f);
      (_a = e.dataTransfer) == null ? void 0 : _a.setData("text/plain", JSON.stringify([f.path]));
    });
  }
  if (import_obsidian10.Platform.isMobile) setupLongPress(view, list, depth);
  addResizeHandle(view, col, widthKey);
  return col;
}
function renderCalendarColumn(view, container) {
  var _a;
  const col = container.createDiv({ cls: "column-explorer-column column-explorer-calendar" });
  col.dataset.depth = "1";
  col.dataset.folderPath = CALENDAR_PATH;
  const customWidth = view.plugin.settings.columnWidths[CALENDAR_PATH];
  if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");
  const header = col.createDiv({ cls: "column-explorer-column-header" });
  if (import_obsidian10.Platform.isMobile) addUpButton(view, header);
  header.createSpan({ cls: "column-explorer-column-title", text: t("calendar") });
  const { year, month } = view.currentCalendarMonth();
  const nav = col.createDiv({ cls: "column-explorer-cal-nav" });
  const prev = nav.createDiv({ cls: "clickable-icon", attr: { role: "button" } });
  (0, import_obsidian10.setIcon)(prev, "chevron-left");
  prev.addEventListener("click", () => view.navigateCalendarMonth(-1));
  const monthLabel = nav.createDiv({
    cls: "column-explorer-cal-month",
    text: new Date(year, month, 1).toLocaleDateString((0, import_obsidian10.getLanguage)(), { month: "long", year: "numeric" }),
    attr: { "aria-label": t("today"), role: "button" }
  });
  monthLabel.addEventListener("click", () => view.navigateCalendarMonth(0));
  const next = nav.createDiv({ cls: "clickable-icon", attr: { role: "button" } });
  (0, import_obsidian10.setIcon)(next, "chevron-right");
  next.addEventListener("click", () => view.navigateCalendarMonth(1));
  const counts = view.calendarCounts();
  const todayKey = dayKey(Date.now());
  const selectedDay = view.selectedDayKey();
  const grid = col.createDiv({ cls: "column-explorer-cal-grid" });
  for (let i = 0; i < 7; i++) {
    const weekday = new Date(2024, 0, 1 + i).toLocaleDateString((0, import_obsidian10.getLanguage)(), { weekday: "short" });
    grid.createDiv({ cls: "column-explorer-cal-weekday", text: weekday });
  }
  for (const week of monthGrid(year, month)) {
    for (const day of week) {
      const cell = grid.createDiv({ cls: "column-explorer-cal-cell" });
      if (!day) continue;
      cell.addClass("is-day");
      cell.dataset.day = day;
      if (day === todayKey) cell.addClass("is-today");
      if (day === selectedDay) cell.addClass("is-selected");
      cell.createDiv({ cls: "column-explorer-cal-daynum", text: String(Number(day.slice(8))) });
      const n = (_a = counts.get(day)) != null ? _a : 0;
      if (n > 0) cell.createDiv({ cls: "column-explorer-cal-count", text: String(n) });
    }
  }
  grid.addEventListener("click", (e) => {
    var _a2;
    const cell = (_a2 = e.target) == null ? void 0 : _a2.closest(".column-explorer-cal-cell.is-day");
    if (cell == null ? void 0 : cell.dataset.day) view.selectDay(cell.dataset.day);
  });
  addResizeHandle(view, col, CALENDAR_PATH);
  return col;
}
function addResizeHandle(view, col, folderPath) {
  const handle = col.createDiv({ cls: "column-explorer-resize-handle" });
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = col.offsetWidth;
    let width = startWidth;
    const onMove = (ev) => {
      width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX));
      col.style.setProperty("--ce-col-width", width + "px");
      view.autoResizePanel();
    };
    const onUp = () => {
      activeDocument.removeEventListener("mousemove", onMove);
      activeDocument.removeEventListener("mouseup", onUp);
      if (width === startWidth) return;
      const s = view.plugin.settings;
      s.columnWidths = { ...s.columnWidths, [folderPath]: width };
      void view.plugin.saveSettings();
    };
    activeDocument.addEventListener("mousemove", onMove);
    activeDocument.addEventListener("mouseup", onUp);
  });
  handle.addEventListener("dblclick", () => {
    const s = view.plugin.settings;
    const rest = { ...s.columnWidths };
    delete rest[folderPath];
    s.columnWidths = rest;
    void view.plugin.saveSettings();
    if (folderPath === "/") {
      col.style.setProperty("--ce-col-width", s.columnWidth + ROOT_COLUMN_EXTRA_WIDTH + "px");
    } else {
      col.style.removeProperty("--ce-col-width");
    }
    view.autoResizePanel();
  });
}

// src/view.ts
var VIEW_TYPE_COLUMNS = "column-explorer-view";
var TYPEAHEAD_RESET_MS = 700;
var PAGE_JUMP = 10;
var ColumnExplorerView = class extends import_obsidian11.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    /** Selected path at each depth. */
    this.selection = [];
    /** Multi-selection (Ctrl/Cmd or Shift click) within one column. */
    this.multiSel = /* @__PURE__ */ new Set();
    this.multiSelDepth = -1;
    this.shiftAnchor = null;
    this.filter = "";
    this.renamingPath = null;
    /** Мобильная строка поиска под toolbar (на desktop поиск живёт в toolbar). */
    this.searchRowEl = null;
    this.searchOpen = false;
    /** Мобильный режим множественного выделения (включается long-press). */
    this.mobileSelActive = false;
    this.typeaheadBuffer = "";
    this.typeaheadTimer = 0;
    /** Показанный месяц календаря; null — от выбранного дня или сегодня. */
    this.calendarMonth = null;
    /** Владелец markdown-превью колонки: живёт до следующего рендера. */
    this.previewOwner = null;
    /** Стек истории навигации (снимки selection) для кнопок назад/вперёд. */
    this.history = [];
    this.historyIndex = -1;
    /** Флаг: идёт переход по истории — не писать новую запись в стек. */
    this.navigatingHistory = false;
    /** Targeted refresh: folders whose columns need re-rendering. */
    this.dirtyFolders = /* @__PURE__ */ new Set();
    this.fullRenderPending = false;
    this.flushRefresh = (0, import_obsidian11.debounce)(() => this.doRefresh(), 60, true);
    /** Дебаунс поиска: полный render на каждую букву лагает на больших vault */
    this.applyFilter = (0, import_obsidian11.debounce)(() => {
      this.filter = this.searchInput.value.toLowerCase().trim();
      this.render();
    }, 150, true);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_COLUMNS;
  }
  getDisplayText() {
    return "Column Explorer";
  }
  getIcon() {
    return "columns-3";
  }
  /* --------- state persistence (restores selection on restart) ----- */
  getState() {
    return { selection: this.selection };
  }
  async setState(state, result) {
    if ((state == null ? void 0 : state.selection) && Array.isArray(state.selection)) {
      this.selection = state.selection;
      if (this.columnsEl) this.render();
    }
    return super.setState(state, result);
  }
  persistState() {
    this.app.workspace.requestSaveLayout();
  }
  /* ------------------------------ setup ---------------------------- */
  async onOpen() {
    var _a, _b, _c, _d, _e;
    const container = this.contentEl;
    container.empty();
    container.addClass("column-explorer-container");
    const toolbar = container.createDiv({ cls: "column-explorer-toolbar" });
    if (import_obsidian11.Platform.isMobile) {
      this.updateMobileToolbar = buildMobileToolbar(this, toolbar);
    } else {
      this.addToolbarButton(toolbar, "file-plus", t("newNote"), () => void this.createNote(this.currentFolder()));
      this.addToolbarButton(toolbar, "folder-plus", t("newFolder"), () => void this.createFolder(this.currentFolder()));
      this.addToolbarButton(toolbar, "locate", t("reveal"), () => this.revealFile(this.app.workspace.getActiveFile()));
      this.addToolbarButton(toolbar, "arrow-up-narrow-wide", t("sort"), (e) => showSortMenu(this, e));
      this.addToolbarButton(toolbar, "chevrons-left", t("collapse"), () => this.collapseToRoot());
      this.lockBtn = this.addToolbarButton(toolbar, "lock-open", t("lockPanel"), () => {
        const s = this.plugin.settings;
        s.lockedColumnCount = s.lockedColumnCount === null ? this.folderColumnCount() : null;
        void this.plugin.saveSettings();
        this.render();
      });
      this.updateLockButton();
    }
    if (import_obsidian11.Platform.isMobile) {
      this.searchRowEl = container.createDiv({ cls: "column-explorer-search-row" });
      this.searchRowEl.hide();
    }
    this.searchInput = ((_a = this.searchRowEl) != null ? _a : toolbar).createEl("input", {
      type: "search",
      cls: "column-explorer-search",
      attr: { placeholder: t("search"), "aria-label": t("search") }
    });
    this.registerDomEvent(this.searchInput, "input", () => this.applyFilter());
    this.registerDomEvent(this.searchInput, "keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (this.searchOpen) {
        this.toggleMobileSearch();
        return;
      }
      this.clearFilter();
      this.columnsEl.focus();
    });
    this.breadcrumbsEl = container.createDiv({
      cls: "column-explorer-breadcrumbs",
      attr: { role: "navigation", "aria-label": "Breadcrumbs" }
    });
    this.columnsEl = container.createDiv({ cls: "column-explorer-columns" });
    this.columnsEl.tabIndex = 0;
    this.registerDomEvent(this.columnsEl, "keydown", (e) => this.onKeyDown(e));
    if (import_obsidian11.Platform.isMobile) {
      this.updateActionBar = buildActionBar(this, container);
      setupEdgeSwipe(this, this.columnsEl);
      setupViewportTracking(this, container);
      this.applyMobileScale();
      this.registerDomEvent(window, "resize", (0, import_obsidian11.debounce)(() => this.applyMobileScale(), 150, true));
    }
    this.registerEvent(this.app.vault.on("create", (f) => {
      var _a2, _b2;
      return this.markDirty(this.specialKind(this.selection[0]) ? null : (_b2 = (_a2 = f.parent) == null ? void 0 : _a2.path) != null ? _b2 : null);
    }));
    this.registerEvent(this.app.vault.on("delete", (f) => {
      var _a2, _b2;
      const changed = this.pruneSelection(f.path);
      this.prunePathRecords(f.path);
      const fullRender = changed || this.specialKind(this.selection[0]) !== null;
      this.markDirty(fullRender ? null : (_b2 = (_a2 = f.parent) == null ? void 0 : _a2.path) != null ? _b2 : null);
    }));
    this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
      this.remapSelection(oldPath, f.path);
      this.remapPathRecords(oldPath, f.path);
      this.markDirty(null);
    }));
    try {
      const app = this.app;
      const ref = (_e = (_d = (_c = (_b = app.internalPlugins) == null ? void 0 : _b.getEnabledPluginById) == null ? void 0 : _c.call(_b, "bookmarks")) == null ? void 0 : _d.on) == null ? void 0 : _e.call(_d, "changed", () => {
        if (this.selection[0] === BOOKMARKS_PATH) this.render();
      });
      if (ref) this.registerEvent(ref);
    } catch (e) {
    }
    this.render();
  }
  addToolbarButton(parent, icon, tooltip, onClick) {
    const btn = parent.createDiv({ cls: "clickable-icon column-explorer-toolbar-btn", attr: { "aria-label": tooltip } });
    (0, import_obsidian11.setIcon)(btn, icon);
    this.registerDomEvent(btn, "click", onClick);
    return btn;
  }
  updateLockButton() {
    if (!this.lockBtn) return;
    const locked = this.plugin.settings.lockedColumnCount !== null;
    (0, import_obsidian11.setIcon)(this.lockBtn, locked ? "lock" : "lock-open");
    this.lockBtn.setAttribute("aria-label", locked ? t("unlockPanel") : t("lockPanel"));
    this.lockBtn.toggleClass("is-active", locked);
  }
  /* ------------------------------ mobile --------------------------- */
  canGoBack() {
    return this.historyIndex > 0;
  }
  canGoForward() {
    return this.historyIndex < this.history.length - 1;
  }
  goBack() {
    this.navigateHistory(-1);
  }
  goForward() {
    this.navigateHistory(1);
  }
  isSearchOpen() {
    return this.searchOpen;
  }
  isMobileSelecting() {
    return this.mobileSelActive;
  }
  /** Мобильные размеры в CSS-переменных: слайдеры настроек зовут это вместо render(). */
  applyMobileScale() {
    if (!import_obsidian11.Platform.isMobile) return;
    applyMobileScale(this, this.contentEl);
  }
  collapseToRoot() {
    this.selection = [];
    this.clearMulti();
    this.render();
  }
  /** Мобильная строка поиска: раскрыть или закрыть со сбросом фильтра. */
  toggleMobileSearch() {
    var _a, _b, _c;
    this.searchOpen = !this.searchOpen;
    if (this.searchOpen) {
      (_a = this.searchRowEl) == null ? void 0 : _a.show();
      this.searchInput.focus();
    } else {
      (_b = this.searchRowEl) == null ? void 0 : _b.hide();
      if (this.hasFilter()) this.clearFilter();
      else this.searchInput.value = "";
    }
    (_c = this.updateMobileToolbar) == null ? void 0 : _c.call(this);
  }
  /** Selection родительской колонки, либо null — уже в корне. */
  parentOfSelection() {
    return parentSelection(this.selection, (p) => this.app.vault.getAbstractFileByPath(p) instanceof import_obsidian11.TFolder);
  }
  canGoUp() {
    return this.parentOfSelection() !== null;
  }
  /** Стрелка в заголовке колонки: на уровень вверх (не путать с историей). */
  goUp() {
    const parent = this.parentOfSelection();
    if (!parent) return;
    this.selection = parent;
    this.clearMulti();
    this.persistState();
    this.render();
  }
  enterMobileSelection(f, depth) {
    if (this.multiSelDepth !== depth) this.clearMulti();
    this.multiSelDepth = depth;
    this.multiSel.add(f.path);
    this.mobileSelActive = true;
    this.syncMultiSelDom();
  }
  toggleMobileSelection(f, depth) {
    this.applyToggleMulti(f, depth);
    this.mobileSelActive = mobileSelectionMode(true, this.multiSel.size);
    this.syncMultiSelDom();
  }
  exitMobileSelection() {
    this.mobileSelActive = false;
    this.clearMulti();
    this.syncMultiSelDom();
  }
  /** Выделение меняет только классы элементов — полный render не нужен. */
  syncMultiSelDom() {
    var _a, _b;
    this.columnsEl.querySelectorAll(".column-explorer-item.is-multi-selected").forEach((el) => el.removeClass("is-multi-selected"));
    for (const path of this.multiSel) {
      (_a = this.columnsEl.querySelector(
        `.column-explorer-item[data-path="${CSS.escape(path)}"]`
      )) == null ? void 0 : _a.addClass("is-multi-selected");
    }
    (_b = this.updateActionBar) == null ? void 0 : _b.call(this);
  }
  /* -------------------------- shared accessors --------------------- */
  /** Visible (exclude-filtered, sorted, search-filtered) children of a folder. */
  childrenOf(folder) {
    let children = visibleChildren(folder, this.plugin.settings);
    if (this.filter) {
      children = children.filter(
        (c) => c instanceof import_obsidian11.TFolder || displayName(c).toLowerCase().includes(this.filter)
      );
    }
    return children;
  }
  hasFilter() {
    return this.filter.length > 0;
  }
  filterQuery() {
    return this.filter;
  }
  clearFilter() {
    this.filter = "";
    this.searchInput.value = "";
    this.render();
  }
  isRenaming(path) {
    return this.renamingPath === path;
  }
  selectedFilePath() {
    const last = this.selection[this.selection.length - 1];
    if (!last) return null;
    const f = this.app.vault.getAbstractFileByPath(last);
    return f instanceof import_obsidian11.TFile ? f.path : null;
  }
  dragPayload(f, depth) {
    if (this.multiSelDepth === depth && this.multiSel.has(f.path)) return [...this.multiSel];
    return [f.path];
  }
  clearMulti() {
    this.multiSel.clear();
    this.multiSelDepth = -1;
    this.shiftAnchor = null;
    this.mobileSelActive = false;
  }
  /** Number of folder columns for the current selection chain (root column included). */
  folderColumnCount() {
    for (let i = this.selection.length - 1; i >= 0; i--) {
      const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
      if (f instanceof import_obsidian11.TFolder) return i + 2;
    }
    return 1;
  }
  currentFolder() {
    for (let i = this.selection.length - 1; i >= 0; i--) {
      const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
      if (f instanceof import_obsidian11.TFolder) return f;
      if (f instanceof import_obsidian11.TFile && f.parent) return f.parent;
    }
    return this.app.vault.getRoot();
  }
  pruneSelection(deletedPath) {
    const i = this.selection.findIndex((p) => p === deletedPath || p.startsWith(deletedPath + "/"));
    if (i >= 0) this.selection = this.selection.slice(0, i);
    this.multiSel.delete(deletedPath);
    return i >= 0;
  }
  remapSelection(oldPath, newPath) {
    this.selection = this.selection.map(
      (p) => p === oldPath ? newPath : p.startsWith(oldPath + "/") ? newPath + p.slice(oldPath.length) : p
    );
  }
  /** Keep folder colors and per-folder view modes in sync with renames. */
  remapPathRecords(oldPath, newPath) {
    const s = this.plugin.settings;
    s.folderColors = remapPathKeys(s.folderColors, oldPath, newPath);
    s.columnViewModes = remapPathKeys(s.columnViewModes, oldPath, newPath);
    s.pinnedPaths = remapPathKeys(s.pinnedPaths, oldPath, newPath);
    s.columnSortModes = remapPathKeys(s.columnSortModes, oldPath, newPath);
    s.folderIcons = remapPathKeys(s.folderIcons, oldPath, newPath);
    s.columnWidths = remapPathKeys(s.columnWidths, oldPath, newPath);
    this.plugin.queueSaveSettings();
  }
  prunePathRecords(deletedPath) {
    const s = this.plugin.settings;
    s.folderColors = prunePathKeys(s.folderColors, deletedPath);
    s.columnViewModes = prunePathKeys(s.columnViewModes, deletedPath);
    s.pinnedPaths = prunePathKeys(s.pinnedPaths, deletedPath);
    s.columnSortModes = prunePathKeys(s.columnSortModes, deletedPath);
    s.folderIcons = prunePathKeys(s.folderIcons, deletedPath);
    s.columnWidths = prunePathKeys(s.columnWidths, deletedPath);
    this.plugin.queueSaveSettings();
  }
  /* ------------------------------ render --------------------------- */
  applyColumnWidth() {
    this.columnsEl.style.setProperty("--ce-col-width", this.plugin.settings.columnWidth + "px");
  }
  /**
   * Свежий владелец markdown-превью колонки. Предыдущий выгружается: без
   * этого дочерние компоненты MarkdownRenderer копились бы на view до
   * закрытия вью — вместе с эмбедами, которые они держат.
   */
  newPreviewOwner() {
    if (this.previewOwner) this.removeChild(this.previewOwner);
    this.previewOwner = this.addChild(new import_obsidian11.Component());
    return this.previewOwner;
  }
  markDirty(folderPath) {
    if (folderPath === null) this.fullRenderPending = true;
    else this.dirtyFolders.add(folderPath);
    this.flushRefresh();
  }
  doRefresh() {
    var _a;
    if (this.fullRenderPending) {
      this.fullRenderPending = false;
      this.dirtyFolders.clear();
      this.render();
      return;
    }
    for (const path of this.dirtyFolders) {
      const list = this.columnsEl.querySelector(
        `.column-explorer-column[data-folder-path="${CSS.escape(path)}"] .column-explorer-list`
      );
      if (!list) continue;
      const folder = path === "/" ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(path);
      const col = list.closest(".column-explorer-column");
      const depth = Number((_a = col == null ? void 0 : col.dataset.depth) != null ? _a : 0);
      if (folder instanceof import_obsidian11.TFolder) {
        const prevTop = list.scrollTop;
        renderColumnList(this, list, folder, depth);
        list.scrollTop = prevTop;
      }
    }
    this.dirtyFolders.clear();
  }
  /** Vertical scroll of each column keyed by folder path — survives re-render. */
  captureScrollTops() {
    const tops = /* @__PURE__ */ new Map();
    this.columnsEl.querySelectorAll(".column-explorer-column[data-folder-path]").forEach((col) => {
      const list = col.querySelector(".column-explorer-list");
      if (list && col.dataset.folderPath !== void 0) tops.set(col.dataset.folderPath, list.scrollTop);
    });
    return tops;
  }
  restoreScrollTops(tops) {
    this.columnsEl.querySelectorAll(".column-explorer-column[data-folder-path]").forEach((col) => {
      var _a;
      const saved = tops.get((_a = col.dataset.folderPath) != null ? _a : "");
      const list = col.querySelector(".column-explorer-list");
      if (saved !== void 0 && list) list.scrollTop = saved;
    });
  }
  /** Identity of the rendered column set — to decide whether to keep horizontal scroll. */
  columnsKey() {
    return Array.from(this.columnsEl.querySelectorAll(".column-explorer-column")).map((col) => {
      var _a;
      return (_a = col.dataset.folderPath) != null ? _a : "";
    }).join("\n");
  }
  render() {
    var _a, _b;
    const scrollTops = this.captureScrollTops();
    const prevKey = this.columnsKey();
    const prevScrollLeft = this.columnsEl.scrollLeft;
    disconnectListObservers(this.columnsEl);
    this.columnsEl.empty();
    this.applyColumnWidth();
    const validSel = [];
    const special = this.specialKind(this.selection[0]);
    if (special === "calendar") {
      validSel.push(CALENDAR_PATH);
      const day = this.selection[1];
      if (day == null ? void 0 : day.startsWith(DAY_PATH_PREFIX)) {
        validSel.push(day);
        const filePath = this.selection[2];
        if (filePath && this.app.vault.getAbstractFileByPath(filePath) instanceof import_obsidian11.TFile) validSel.push(filePath);
      }
    } else if (special) {
      validSel.push(this.selection[0]);
      const filePath = this.selection[1];
      if (filePath && this.app.vault.getAbstractFileByPath(filePath) instanceof import_obsidian11.TFile) validSel.push(filePath);
    } else {
      let parent = this.app.vault.getRoot();
      for (const path of this.selection) {
        const f = this.app.vault.getAbstractFileByPath(path);
        if (!f || f.parent !== parent) break;
        validSel.push(path);
        if (f instanceof import_obsidian11.TFolder) parent = f;
        else break;
      }
    }
    this.selection = validSel;
    this.recordHistory();
    const lockedCount = import_obsidian11.Platform.isMobile ? 1 : this.plugin.settings.lockedColumnCount;
    const folderCols = this.folderColumnCount();
    const hasGap = lockedCount !== null && folderCols > lockedCount;
    this.updateLockButton();
    this.columnsEl.toggleClass("is-locked", hasGap);
    if (!(import_obsidian11.Platform.isMobile && special) && lockedColumnVisible(0, folderCols, lockedCount)) {
      renderColumn(this, this.columnsEl, this.app.vault.getRoot(), 0);
    }
    const previewOf = (path) => {
      if (import_obsidian11.Platform.isMobile) return;
      const f = path ? this.app.vault.getAbstractFileByPath(path) : null;
      if (f instanceof import_obsidian11.TFile && this.plugin.settings.showPreview) renderPreviewColumn(this, this.columnsEl, f);
    };
    if (special === "recents") {
      renderFileListColumn(this, this.columnsEl, t("recents"), this.recentFiles(), RECENTS_PATH, 1);
      previewOf(this.selection[1]);
    } else if (special === "bookmarks") {
      const favs = this.plugin.settings.showFavorites ? this.favoriteItems() : [];
      const favPaths = new Set(favs.map((f) => f.path));
      const core = this.plugin.settings.showBookmarks && this.bookmarksAvailable() ? this.bookmarkedItems().filter((f) => !favPaths.has(f.path)) : [];
      renderFileListColumn(this, this.columnsEl, t("bookmarks"), core, BOOKMARKS_PATH, 1, favs);
      previewOf(this.selection[1]);
    } else if (special === "calendar") {
      const daySentinel = this.selection[1];
      if (!import_obsidian11.Platform.isMobile || !daySentinel) renderCalendarColumn(this, this.columnsEl);
      if (daySentinel) {
        const day = daySentinel.slice(DAY_PATH_PREFIX.length);
        const title = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8))).toLocaleDateString((0, import_obsidian11.getLanguage)(), { day: "numeric", month: "long", year: "numeric" });
        renderFileListColumn(this, this.columnsEl, title, this.filesCreatedOn(day), daySentinel, 2);
        previewOf(this.selection[2]);
      }
    } else {
      for (let depth = 0; depth < this.selection.length; depth++) {
        const f = this.app.vault.getAbstractFileByPath(this.selection[depth]);
        if (f instanceof import_obsidian11.TFolder) {
          if (!lockedColumnVisible(depth + 1, folderCols, lockedCount)) continue;
          renderColumn(this, this.columnsEl, f, depth + 1);
        } else if (f instanceof import_obsidian11.TFile && this.plugin.settings.showPreview && !import_obsidian11.Platform.isMobile) {
          renderPreviewColumn(this, this.columnsEl, f);
        }
      }
    }
    if (hasGap && !import_obsidian11.Platform.isMobile) this.markLockedColumn();
    this.renderBreadcrumbs();
    this.applyMobileScale();
    (_a = this.updateMobileToolbar) == null ? void 0 : _a.call(this);
    (_b = this.updateActionBar) == null ? void 0 : _b.call(this);
    this.restoreScrollTops(scrollTops);
    const sameColumns = this.columnsKey() === prevKey;
    window.requestAnimationFrame(() => {
      this.autoResizePanel();
      this.columnsEl.scrollLeft = sameColumns ? prevScrollLeft : this.columnsEl.scrollWidth;
    });
  }
  /** Авто-ширина панели: подгоняет ширину сайдбара под суммарную ширину колонок. */
  autoResizePanel() {
    if (!this.plugin.settings.autoPanelResize || import_obsidian11.Platform.isMobile) return;
    const ws = this.app.workspace;
    const root = this.leaf.getRoot();
    if (root !== ws.leftSplit && root !== ws.rightSplit) return;
    const split = root;
    if (split.collapsed || typeof split.setSize !== "function") return;
    const cols = Array.from(this.columnsEl.querySelectorAll(".column-explorer-column"));
    const contentWidth = cols.reduce((sum, col) => sum + col.offsetWidth, 0);
    if (contentWidth === 0) return;
    split.setSize(desiredPanelWidth(contentWidth, window.innerWidth, MIN_COLUMN_WIDTH));
  }
  /** Lock badge in the header of the deepest (in-place navigating) column. */
  markLockedColumn() {
    const cols = this.columnsEl.querySelectorAll(".column-explorer-column[data-folder-path]");
    const col = cols[cols.length - 1];
    const header = col == null ? void 0 : col.querySelector(".column-explorer-column-header");
    if (!col || !header) return;
    col.addClass("is-locked-root");
    const badge = createDiv({ cls: "column-explorer-lock-badge" });
    (0, import_obsidian11.setIcon)(badge, "lock");
    header.prepend(badge);
  }
  /** Записать текущий выбор в стек истории (если не идём по истории и он изменился). */
  recordHistory() {
    if (this.navigatingHistory) return;
    const HISTORY_CAP = 100;
    const last = this.history[this.historyIndex];
    if (last && last.length === this.selection.length && last.every((p, i) => p === this.selection[i])) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push([...this.selection]);
    if (this.history.length > HISTORY_CAP) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }
  navigateHistory(delta) {
    const next = this.historyIndex + delta;
    if (next < 0 || next >= this.history.length) return;
    this.historyIndex = next;
    this.navigatingHistory = true;
    this.selection = [...this.history[next]];
    this.clearMulti();
    this.persistState();
    this.render();
    this.navigatingHistory = false;
  }
  renderBreadcrumbs() {
    this.breadcrumbsEl.empty();
    const nav = this.breadcrumbsEl.createDiv({ cls: "column-explorer-nav-buttons" });
    const navBtn = (icon, label, enabled, onClick) => {
      const btn = nav.createDiv({
        cls: "clickable-icon column-explorer-nav-btn" + (enabled ? "" : " is-disabled"),
        attr: { "aria-label": label, role: "button" }
      });
      (0, import_obsidian11.setIcon)(btn, icon);
      if (enabled) btn.addEventListener("click", onClick);
    };
    if (!import_obsidian11.Platform.isMobile) {
      navBtn("arrow-left", t("navBack"), this.canGoBack(), () => this.goBack());
      navBtn("arrow-right", t("navForward"), this.canGoForward(), () => this.goForward());
    }
    const current = this.currentFolder();
    const isFav = this.isFavorite(current.path);
    const star = nav.createDiv({
      cls: "clickable-icon column-explorer-fav-btn" + (isFav ? " is-active" : ""),
      attr: { "aria-label": isFav ? t("removeFavorite") : t("addFavorite"), role: "button" }
    });
    (0, import_obsidian11.setIcon)(star, "star");
    star.addEventListener("click", () => this.toggleFavorite(current.path));
    const addSegment = (label, targetDepth, isLast) => {
      const seg = this.breadcrumbsEl.createSpan({
        cls: "column-explorer-crumb" + (isLast ? " is-current" : ""),
        text: label
      });
      if (!isLast) {
        seg.addEventListener("click", () => {
          this.selection = this.selection.slice(0, targetDepth);
          this.clearMulti();
          this.persistState();
          this.render();
        });
        this.breadcrumbsEl.createSpan({ cls: "column-explorer-crumb-sep", text: "\u203A" });
      }
    };
    addSegment(this.app.vault.getName(), 0, this.selection.length === 0);
    this.selection.forEach((path, i) => {
      var _a;
      const f = this.app.vault.getAbstractFileByPath(path);
      const label = f ? displayName(f) : path === RECENTS_PATH ? t("recents") : path === BOOKMARKS_PATH ? t("bookmarks") : path === CALENDAR_PATH ? t("calendar") : path.startsWith(DAY_PATH_PREFIX) ? path.slice(DAY_PATH_PREFIX.length) : (_a = path.split("/").pop()) != null ? _a : path;
      addSegment(label, i + 1, i === this.selection.length - 1);
    });
    if (import_obsidian11.Platform.isMobile) {
      window.requestAnimationFrame(() => {
        this.breadcrumbsEl.scrollLeft = this.breadcrumbsEl.scrollWidth;
      });
    }
  }
  /** Cheap highlight update on active-leaf-change — no full re-render. */
  updateActiveFileHighlight() {
    const active = this.app.workspace.getActiveFile();
    this.columnsEl.querySelectorAll(".column-explorer-item.is-active-file").forEach((el) => el.removeClass("is-active-file"));
    if (!active) return;
    const item = this.columnsEl.querySelector(
      `.column-explorer-item[data-path="${CSS.escape(active.path)}"]`
    );
    item == null ? void 0 : item.addClass("is-active-file");
  }
  /* ----------------------------- actions --------------------------- */
  /** Паттерны исключений — виртуальные колонки фильтруются как обычные. */
  excludePatternsList() {
    return parseExcludePatterns(this.plugin.settings.excludePatterns);
  }
  /** Последние открытые файлы из собственного трекера (main.ts). */
  recentFiles() {
    const s = this.plugin.settings;
    const patterns = this.excludePatternsList();
    const isVisibleFile = (p) => !matchesExcludePatterns(p, patterns) && this.app.vault.getAbstractFileByPath(p) instanceof import_obsidian11.TFile;
    return takeFirstExisting(s.recentFiles, isVisibleFile, s.recentFilesCount).flatMap((p) => {
      const f = this.app.vault.getAbstractFileByPath(p);
      return f instanceof import_obsidian11.TFile ? [f] : [];
    });
  }
  /**
   * Перерисовать открытую колонку «Недавние» (файл открыли где-то ещё).
   * Если открыт как раз выбранный в ней файл — не дёргаем список под
   * курсором, он и так показан.
   */
  refreshRecentsColumn(openedPath) {
    if (this.selection[0] !== RECENTS_PATH) return;
    if (openedPath && this.selection[1] === openedPath) return;
    this.render();
  }
  /** Тип спецпункта по сентинел-пути с учётом настроек и доступности. */
  specialKind(path) {
    const s = this.plugin.settings;
    if (path === RECENTS_PATH && s.showRecents) return "recents";
    if (path === BOOKMARKS_PATH && (s.showBookmarks && this.bookmarksAvailable() || s.showFavorites && s.favorites.length > 0)) return "bookmarks";
    if (path === CALENDAR_PATH && s.showCalendar) return "calendar";
    return null;
  }
  selectSpecial(path) {
    this.selection = [path];
    this.clearMulti();
    this.persistState();
    this.render();
  }
  selectDay(day) {
    this.selection = [CALENDAR_PATH, DAY_PATH_PREFIX + day];
    this.clearMulti();
    this.persistState();
    this.render();
  }
  /** Выбранный день календаря ("YYYY-MM-DD") или null. */
  selectedDayKey() {
    const sentinel = this.selection[0] === CALENDAR_PATH ? this.selection[1] : void 0;
    return (sentinel == null ? void 0 : sentinel.startsWith(DAY_PATH_PREFIX)) ? sentinel.slice(DAY_PATH_PREFIX.length) : null;
  }
  currentCalendarMonth() {
    if (this.calendarMonth) return this.calendarMonth;
    const day = this.selectedDayKey();
    if (day) return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 };
    const now = /* @__PURE__ */ new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  /** Листание месяца: ±1, а 0 — вернуться к сегодняшнему. */
  navigateCalendarMonth(delta) {
    if (delta === 0) {
      const now = /* @__PURE__ */ new Date();
      this.calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
    } else {
      const cur = this.currentCalendarMonth();
      const d = new Date(cur.year, cur.month + delta, 1);
      this.calendarMonth = { year: d.getFullYear(), month: d.getMonth() };
    }
    this.render();
  }
  /** Число созданных файлов по дням (ключ — dayKey) для бейджей календаря. */
  calendarCounts() {
    var _a;
    const patterns = this.excludePatternsList();
    const counts = /* @__PURE__ */ new Map();
    for (const f of this.app.vault.getFiles()) {
      if (matchesExcludePatterns(f.path, patterns)) continue;
      const key = dayKey(f.stat.ctime);
      counts.set(key, ((_a = counts.get(key)) != null ? _a : 0) + 1);
    }
    return counts;
  }
  /** Файлы, созданные в день `day` ("YYYY-MM-DD"), новые сверху. */
  filesCreatedOn(day) {
    const patterns = this.excludePatternsList();
    return this.app.vault.getFiles().filter((f) => !matchesExcludePatterns(f.path, patterns) && dayKey(f.stat.ctime) === day).sort((a, b) => b.stat.ctime - a.stat.ctime);
  }
  bookmarksAvailable() {
    return this.bookmarkItems() !== null;
  }
  /**
   * Пункты core-плагина Bookmarks. Приватный API (internalPlugins) —
   * в try, при поломке или выключенном плагине возвращаем null
   * и спецпункт «Закладки» просто не показывается.
   */
  bookmarkItems() {
    var _a, _b, _c, _d;
    try {
      const app = this.app;
      return (_d = (_c = (_b = (_a = app.internalPlugins) == null ? void 0 : _a.getEnabledPluginById) == null ? void 0 : _b.call(_a, "bookmarks")) == null ? void 0 : _c.items) != null ? _d : null;
    } catch (e) {
      return null;
    }
  }
  /**
   * Файлы и папки из закладок; группы разворачиваются плоско, дубли
   * (закладки на заголовки/блоки одной заметки) схлопываются.
   */
  bookmarkedItems() {
    var _a;
    const flatten = (items) => items.flatMap(
      (it2) => {
        var _a2;
        return it2.type === "group" ? flatten((_a2 = it2.items) != null ? _a2 : []) : (it2.type === "file" || it2.type === "folder") && it2.path ? [it2.path] : [];
      }
    );
    const patterns = this.excludePatternsList();
    return [...new Set(flatten((_a = this.bookmarkItems()) != null ? _a : []))].flatMap((p) => {
      if (matchesExcludePatterns(p, patterns)) return [];
      const f = this.app.vault.getAbstractFileByPath(p);
      return f ? [f] : [];
    });
  }
  /** Saved favorite files/folders, invalid and excluded paths dropped, add-order kept. */
  favoriteItems() {
    const patterns = this.excludePatternsList();
    return this.plugin.settings.favorites.flatMap((p) => {
      if (matchesExcludePatterns(p, patterns)) return [];
      const f = this.app.vault.getAbstractFileByPath(p);
      return f ? [f] : [];
    });
  }
  isFavorite(path) {
    return this.plugin.settings.favorites.includes(path);
  }
  /** Add or remove a path from favorites, with a notice. */
  toggleFavorite(path) {
    const s = this.plugin.settings;
    const has = s.favorites.includes(path);
    s.favorites = has ? s.favorites.filter((p) => p !== path) : [...s.favorites, path];
    void this.plugin.saveSettings();
    new import_obsidian11.Notice(t(has ? "favoriteRemoved" : "favoriteAdded"));
    this.render();
  }
  selectItem(f, depth, e) {
    this.selection = this.selection.slice(0, depth);
    this.selection.push(f.path);
    this.shiftAnchor = f.path;
    if (f instanceof import_obsidian11.TFile) {
      void this.app.workspace.getLeaf(import_obsidian11.Keymap.isModEvent(e)).openFile(f);
    } else if (f instanceof import_obsidian11.TFolder && this.plugin.settings.openFolderNote) {
      const note = folderNoteOf(f);
      if (note) void this.app.workspace.getLeaf(import_obsidian11.Keymap.isModEvent(e)).openFile(note);
    }
    this.persistState();
    this.render();
  }
  toggleMulti(f, depth) {
    this.applyToggleMulti(f, depth);
    this.render();
  }
  /** Мутация мультивыделения без перерисовки — общая с мобильным режимом. */
  applyToggleMulti(f, depth) {
    if (this.multiSelDepth !== depth) this.clearMulti();
    this.multiSelDepth = depth;
    if (this.multiSel.has(f.path)) this.multiSel.delete(f.path);
    else this.multiSel.add(f.path);
    this.shiftAnchor = f.path;
    if (this.multiSel.size === 0) this.multiSelDepth = -1;
  }
  rangeMulti(f, depth, siblings) {
    var _a, _b;
    if (this.multiSelDepth !== depth) {
      this.clearMulti();
      this.multiSelDepth = depth;
    }
    const anchor = (_b = (_a = this.shiftAnchor) != null ? _a : this.selection[depth]) != null ? _b : f.path;
    const ai = siblings.findIndex((s) => s.path === anchor);
    const bi = siblings.findIndex((s) => s.path === f.path);
    if (ai === -1 || bi === -1) {
      this.toggleMulti(f, depth);
      return;
    }
    const [from, to] = ai < bi ? [ai, bi] : [bi, ai];
    for (let i = from; i <= to; i++) this.multiSel.add(siblings[i].path);
    this.render();
  }
  /** Cmd/Ctrl+A — multi-select every item in the active folder column. */
  selectAllAt(depth) {
    const folder = this.folderAtDepth(depth);
    if (!folder) return;
    const children = this.childrenOf(folder);
    if (children.length === 0) return;
    this.clearMulti();
    this.multiSelDepth = depth;
    for (const c of children) this.multiSel.add(c.path);
    this.render();
  }
  /** Cmd/Ctrl+D — duplicate the multi-selection, or the single selected file. */
  duplicateSelected(depth) {
    const paths = this.multiSel.size > 0 && this.multiSelDepth === depth ? [...this.multiSel] : [this.selection[depth]].filter(Boolean);
    void (async () => {
      for (const p of paths) {
        const f = this.app.vault.getAbstractFileByPath(p);
        if (f instanceof import_obsidian11.TFile) await duplicateFile(this.app, f);
      }
    })();
  }
  revealFile(file) {
    if (!file) return;
    if (this.hasFilter()) {
      this.filter = "";
      this.searchInput.value = "";
    }
    const chain = [];
    let cur = file;
    while (cur && cur.parent) {
      chain.unshift(cur.path);
      cur = cur.parent;
    }
    this.selection = chain;
    this.clearMulti();
    this.persistState();
    this.render();
  }
  deleteMany(paths) {
    const doDelete = async () => {
      await trashFiles(this.app, paths);
      this.exitMobileSelection();
    };
    if (!this.plugin.settings.confirmDelete) {
      void doDelete();
      return;
    }
    const first = this.app.vault.getAbstractFileByPath(paths[0]);
    const msg = paths.length === 1 ? t("confirmDeleteOne", { name: first ? displayName(first) : paths[0] }) : t("confirmDeleteMany", { n: paths.length });
    new ConfirmModal(this.app, msg, () => void doDelete()).open();
  }
  async createNote(folder, extension = "md", initialContent = "") {
    const base = (folder.isRoot() ? "" : folder.path + "/") + t("untitled");
    let path = (0, import_obsidian11.normalizePath)(base + "." + extension);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian11.normalizePath)(base + " " + n++ + "." + extension);
    }
    try {
      const file = await this.app.vault.create(path, initialContent);
      this.revealFile(file);
      await this.app.workspace.getLeaf(false).openFile(file);
      window.setTimeout(() => this.startRenameByPath(file.path), 100);
    } catch (err) {
      new import_obsidian11.Notice(t("createFailed", { name: path, error: errorMessage(err) }));
    }
  }
  async createFolder(folder) {
    const base = (folder.isRoot() ? "" : folder.path + "/") + t("newFolderName");
    let path = (0, import_obsidian11.normalizePath)(base);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian11.normalizePath)(base + " " + n++);
    }
    try {
      await this.app.vault.createFolder(path);
      window.setTimeout(() => this.startRenameByPath(path), 100);
    } catch (err) {
      new import_obsidian11.Notice(t("createFailed", { name: path, error: errorMessage(err) }));
    }
  }
  startRenameByPath(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f) this.startRename(f);
  }
  startRename(f) {
    this.render();
    const item = this.columnsEl.querySelector(
      `.column-explorer-item[data-path="${CSS.escape(f.path)}"]`
    );
    if (!item) return;
    const titleEl = item.querySelector(".column-explorer-item-title");
    if (!titleEl) return;
    this.renamingPath = f.path;
    const isMdFile = f instanceof import_obsidian11.TFile && f.extension === "md";
    const original = f instanceof import_obsidian11.TFile && f.extension === "md" ? f.basename : f.name;
    const input = createEl("input", { type: "text", cls: "column-explorer-rename-input", value: original });
    titleEl.replaceWith(input);
    input.focus();
    const dot = input.value.lastIndexOf(".");
    input.setSelectionRange(0, isMdFile || dot <= 0 ? input.value.length : dot);
    const finish = async (commit) => {
      this.renamingPath = null;
      const newName = input.value.trim();
      if (commit && newName && newName !== original) {
        const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
        const finalName = isMdFile ? newName + ".md" : newName;
        try {
          await this.app.fileManager.renameFile(f, (0, import_obsidian11.normalizePath)(dir + finalName));
        } catch (err) {
          new import_obsidian11.Notice(t("renameFailed") + errorMessage(err));
        }
      }
      this.render();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void finish(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        void finish(false);
      }
    });
    input.addEventListener("blur", () => void finish(true));
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  /* ---------------------------- keyboard --------------------------- */
  onKeyDown(e) {
    if (this.renamingPath) return;
    if (this.mobileSelActive && e.key === "Escape") {
      e.preventDefault();
      this.exitMobileSelection();
      return;
    }
    const depth = Math.max(0, this.selection.length - 1);
    const selectedPath = this.selection[depth];
    const children = this.siblingsAt(depth);
    const currentIdx = children.findIndex((c) => c.path === selectedPath);
    const jumpTo = (idx) => {
      if (children.length === 0) return;
      const next = children[Math.min(children.length - 1, Math.max(0, idx))];
      this.selection = this.selection.slice(0, depth);
      this.selection.push(next.path);
      this.clearMulti();
      this.persistState();
      this.render();
    };
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      jumpTo(e.key === "ArrowDown" ? Math.min(children.length - 1, currentIdx + 1) : Math.max(0, currentIdx === -1 ? 0 : currentIdx - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      jumpTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      jumpTo(children.length - 1);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const base = currentIdx === -1 ? 0 : currentIdx;
      jumpTo(e.key === "PageDown" ? base + PAGE_JUMP : base - PAGE_JUMP);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (this.selection.length > 0) {
        this.selection.pop();
        this.persistState();
        this.render();
      }
    } else if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      if (this.enterVirtual(selectedPath, depth)) return;
      const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
      if (f instanceof import_obsidian11.TFolder) {
        const inner = this.childrenOf(f);
        if (inner.length > 0) {
          this.selection.push(inner[0].path);
          this.persistState();
          this.render();
        }
      } else if (f instanceof import_obsidian11.TFile && e.key === "Enter") {
        void this.app.workspace.getLeaf(false).openFile(f);
      }
    } else if (e.key === " ") {
      e.preventDefault();
      const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
      if (f instanceof import_obsidian11.TFile) new QuickLookModal(this.app, this, f).open();
    } else if (e.key === "Escape" && this.hasFilter()) {
      e.preventDefault();
      this.clearFilter();
    } else if (e.key === "F2") {
      e.preventDefault();
      const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
      if (f) this.startRename(f);
    } else if (e.key === "Delete" || e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (this.multiSel.size > 0) {
        this.deleteMany([...this.multiSel]);
        return;
      }
      if (selectedPath && !selectedPath.startsWith("::")) this.deleteMany([selectedPath]);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      this.selectAllAt(depth);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      this.duplicateSelected(depth);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.onTypeahead(e.key, children, depth);
    }
  }
  onTypeahead(char, children, depth) {
    window.clearTimeout(this.typeaheadTimer);
    this.typeaheadBuffer += char.toLowerCase();
    this.typeaheadTimer = window.setTimeout(() => {
      this.typeaheadBuffer = "";
    }, TYPEAHEAD_RESET_MS);
    const match = children.find((c) => c.name.toLowerCase().startsWith(this.typeaheadBuffer));
    if (!match) return;
    this.selection = this.selection.slice(0, depth);
    this.selection.push(match.path);
    this.clearMulti();
    this.persistState();
    this.render();
  }
  /**
   * «Соседи» для клавиатурной навигации на данной глубине: в виртуальных
   * колонках — их файлы, в первой колонке — дети корня плюс спецпункты
   * (на той же позиции, что и на экране).
   */
  siblingsAt(depth) {
    const toEntry = (f) => ({ path: f.path, name: displayName(f) });
    const special = this.specialKind(this.selection[0]);
    if (special && depth >= 1) {
      if (special === "recents") return this.recentFiles().map(toEntry);
      if (special === "bookmarks") return this.bookmarkedItems().map(toEntry);
      const day = this.selectedDayKey();
      return depth === 2 && day ? this.filesCreatedOn(day).map(toEntry) : [];
    }
    const parentFolder = this.folderAtDepth(depth);
    const entries = (parentFolder ? this.childrenOf(parentFolder) : []).map(toEntry);
    if (depth !== 0) return entries;
    const specials = [];
    if (this.specialKind(RECENTS_PATH)) specials.push({ path: RECENTS_PATH, name: t("recents") });
    if (this.specialKind(BOOKMARKS_PATH)) specials.push({ path: BOOKMARKS_PATH, name: t("bookmarks") });
    if (this.specialKind(CALENDAR_PATH)) specials.push({ path: CALENDAR_PATH, name: t("calendar") });
    return this.plugin.settings.specialItemsPosition === "top" ? [...specials, ...entries] : [...entries, ...specials];
  }
  /** ArrowRight/Enter на спецпункте или дне календаря — вход в его колонку. */
  enterVirtual(selectedPath, depth) {
    if (!selectedPath) return false;
    if (this.specialKind(selectedPath) === "calendar") {
      this.selectDay(dayKey(Date.now()));
      return true;
    }
    if (this.specialKind(selectedPath) || selectedPath.startsWith(DAY_PATH_PREFIX)) {
      const inner = this.siblingsAt(depth + 1);
      if (inner.length > 0) {
        this.selection.push(inner[0].path);
        this.persistState();
        this.render();
      }
      return true;
    }
    return false;
  }
  folderAtDepth(depth) {
    if (depth === 0) return this.app.vault.getRoot();
    const f = this.app.vault.getAbstractFileByPath(this.selection[depth - 1]);
    return f instanceof import_obsidian11.TFolder ? f : null;
  }
};

// src/main.ts
var SAVE_DEBOUNCE_MS = 1e3;
var ColumnExplorerPlugin = class extends import_obsidian12.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.shouldSeedRecents = false;
    /**
     * Отложенная запись настроек для событий, приходящих пачками: открытие
     * файлов и, главное, rename/delete — при удалении папки на N файлов
     * немедленная запись означала бы N перезаписей data.json подряд.
     */
    this.saveQueued = (0, import_obsidian12.debounce)(() => void this.saveSettings(), SAVE_DEBOUNCE_MS);
  }
  async onload() {
    await this.loadSettings();
    if (this.shouldSeedRecents) {
      this.settings.recentFiles = this.app.workspace.getLastOpenFiles();
    }
    this.register(() => this.saveQueued.run());
    this.registerEvent(this.app.workspace.on("file-open", (f) => {
      var _a;
      if (!f) return;
      this.settings.recentFiles = pushRecent(this.settings.recentFiles, f.path, MAX_RECENT_FILES);
      this.saveQueued();
      (_a = this.getView()) == null ? void 0 : _a.refreshRecentsColumn(f.path);
    }));
    this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
      this.settings.recentFiles = remapPathList(this.settings.recentFiles, oldPath, f.path);
      this.settings.favorites = remapPathList(this.settings.favorites, oldPath, f.path);
      this.saveQueued();
    }));
    this.registerEvent(this.app.vault.on("delete", (f) => {
      const dropDeleted = (p) => p !== f.path && !p.startsWith(f.path + "/");
      this.settings.recentFiles = this.settings.recentFiles.filter(dropDeleted);
      this.settings.favorites = this.settings.favorites.filter(dropDeleted);
      this.saveQueued();
    }));
    this.registerView(VIEW_TYPE_COLUMNS, (leaf) => new ColumnExplorerView(leaf, this));
    this.addSettingTab(new ColumnExplorerSettingTab(this.app, this));
    this.addRibbonIcon("columns-3", "Column Explorer", () => void this.activateView());
    this.addCommand({
      id: "open-view",
      name: t("cmdOpen"),
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "reveal-active-file",
      name: t("cmdReveal"),
      callback: async () => {
        const view = await this.activateView();
        view == null ? void 0 : view.revealFile(this.app.workspace.getActiveFile());
      }
    });
    this.addCommand({
      id: "new-note-here",
      name: t("cmdNewNote"),
      checkCallback: (checking) => {
        if (!this.getViewLeaf()) return false;
        if (!checking) void this.withView((view) => void view.createNote(view.currentFolder()));
        return true;
      }
    });
    this.addCommand({
      id: "new-folder-here",
      name: t("cmdNewFolder"),
      checkCallback: (checking) => {
        if (!this.getViewLeaf()) return false;
        if (!checking) void this.withView((view) => void view.createFolder(view.currentFolder()));
        return true;
      }
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      const view = this.getView();
      if (!view) return;
      view.updateActiveFileHighlight();
      if (this.settings.autoReveal) {
        const active = this.app.workspace.getActiveFile();
        if (active && view.selectedFilePath() !== active.path) view.revealFile(active);
      }
    }));
  }
  async loadSettings() {
    const data = await this.loadData();
    const merged = Object.assign({}, DEFAULT_SETTINGS, data != null ? data : {});
    this.settings = {
      ...merged,
      ...normalizeSettings(merged),
      ...normalizeMobileSettings(merged)
    };
    this.shouldSeedRecents = (data == null ? void 0 : data.recentFiles) === void 0;
    const widths = this.settings.columnWidths;
    const staleDayKeys = Object.keys(widths).filter((k) => k.startsWith(DAY_PATH_PREFIX) && k !== DAY_PATH_PREFIX);
    if (staleDayKeys.length > 0) {
      this.settings.columnWidths = Object.fromEntries(
        Object.entries(widths).filter(([k]) => !staleDayKeys.includes(k))
      );
    }
    this.migratePinnedPaths();
  }
  /** v1.3.x stored pins as `true`; convert to numeric order once. */
  migratePinnedPaths() {
    const raw = this.settings.pinnedPaths;
    let order = 0;
    const migrated = {};
    for (const path of Object.keys(raw)) {
      const value = raw[path];
      migrated[path] = typeof value === "number" ? value : order;
      order++;
    }
    this.settings.pinnedPaths = migrated;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /** Запись настроек со склейкой — для событий, приходящих пачками. */
  queueSaveSettings() {
    this.saveQueued();
  }
  /** Лист вью, даже если она ещё отложена (Obsidian 1.7.2+). */
  getViewLeaf() {
    var _a;
    return (_a = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS)[0]) != null ? _a : null;
  }
  /**
   * Загруженная вью или null. Отложенную НЕ будит намеренно: подсветке
   * активного файла и настройкам нечего обновлять в незагруженной вью.
   */
  getView() {
    const leaf = this.getViewLeaf();
    return (leaf == null ? void 0 : leaf.view) instanceof ColumnExplorerView ? leaf.view : null;
  }
  /** Действие пользователя над вью: отложенную сначала догружаем. */
  async withView(fn) {
    const leaf = this.getViewLeaf();
    if (!leaf) return;
    await leaf.loadIfDeferred();
    if (leaf.view instanceof ColumnExplorerView) fn(leaf.view);
  }
  async activateView() {
    const existing = this.getViewLeaf();
    const leaf = existing != null ? existing : this.app.workspace.getLeftLeaf(false);
    if (!leaf) return null;
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE_COLUMNS, active: true });
    await this.app.workspace.revealLeaf(leaf);
    await leaf.loadIfDeferred();
    return leaf.view instanceof ColumnExplorerView ? leaf.view : null;
  }
};
