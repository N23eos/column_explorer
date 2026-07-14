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
var import_obsidian11 = require("obsidian");

// src/i18n.ts
var import_obsidian = require("obsidian");

// src/pure.ts
function naturalCompare(a, b) {
  return a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" });
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
function lockStartDepth(folderColumns, lockedCount) {
  if (lockedCount === null) return 0;
  return Math.max(0, folderColumns - Math.max(1, lockedCount));
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

// src/i18n.ts
var STRINGS = {
  en: {
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
    pathCopied: "Path copied",
    untitled: "Untitled",
    newFolderName: "New folder",
    cantMoveIntoSelf: "Cannot move a folder into itself",
    alreadyExists: "\u201C{name}\u201D already exists in the target folder",
    renameFailed: "Rename failed: ",
    modified: "Modified",
    created: "Created",
    sortNameAsc: "Name (A \u2192 Z)",
    sortNameDesc: "Name (Z \u2192 A)",
    sortMtimeDesc: "Modified (newest first)",
    sortMtimeAsc: "Modified (oldest first)",
    confirmDeleteTitle: "Delete",
    confirmDeleteOne: "Delete \u201C{name}\u201D?",
    confirmDeleteMany: "Delete {n} items?",
    confirm: "Delete",
    cancel: "Cancel",
    itemsMoved: "{n} items moved",
    cmdOpen: "Open column explorer",
    cmdReveal: "Reveal active file in columns",
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
    setColWidth: "Minimum column width",
    setColWidthDesc: "In pixels. Columns can also be resized by dragging their right edge.",
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
    unlockPanel: "Unlock columns"
  },
  ru: {
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
    pathCopied: "\u041F\u0443\u0442\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D",
    untitled: "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
    newFolderName: "\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430",
    cantMoveIntoSelf: "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0432\u043D\u0443\u0442\u0440\u044C \u0441\u0430\u043C\u043E\u0439 \u0441\u0435\u0431\u044F",
    alreadyExists: "\u0412 \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u043F\u0430\u043F\u043A\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \xAB{name}\xBB",
    renameFailed: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C: ",
    modified: "\u0418\u0437\u043C\u0435\u043D\u0451\u043D",
    created: "\u0421\u043E\u0437\u0434\u0430\u043D",
    sortNameAsc: "\u0418\u043C\u044F (\u0410 \u2192 \u042F)",
    sortNameDesc: "\u0418\u043C\u044F (\u042F \u2192 \u0410)",
    sortMtimeDesc: "\u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u044B\u0435)",
    sortMtimeAsc: "\u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F (\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u0442\u0430\u0440\u044B\u0435)",
    confirmDeleteTitle: "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435",
    confirmDeleteOne: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \xAB{name}\xBB?",
    confirmDeleteMany: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: {n}?",
    confirm: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
    cancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
    itemsMoved: "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: {n}",
    cmdOpen: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A-\u043A\u043E\u043B\u043E\u043D\u043A\u0438",
    cmdReveal: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u0432 \u043A\u043E\u043B\u043E\u043D\u043A\u0430\u0445",
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
    setColWidth: "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0448\u0438\u0440\u0438\u043D\u0430 \u043A\u043E\u043B\u043E\u043D\u043A\u0438",
    setColWidthDesc: "\u0412 \u043F\u0438\u043A\u0441\u0435\u043B\u044F\u0445. \u041A\u043E\u043B\u043E\u043D\u043A\u0438 \u0442\u0430\u043A\u0436\u0435 \u043C\u043E\u0436\u043D\u043E \u0442\u044F\u043D\u0443\u0442\u044C \u0437\u0430 \u043F\u0440\u0430\u0432\u044B\u0439 \u043A\u0440\u0430\u0439.",
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
    unlockPanel: "\u0421\u043D\u044F\u0442\u044C \u0444\u0438\u043A\u0441\u0430\u0446\u0438\u044E \u043A\u043E\u043B\u043E\u043D\u043E\u043A"
  }
};
function t(key, vars) {
  var _a, _b, _c;
  const lang = (0, import_obsidian.getLanguage)();
  const s = (_c = (_b = ((_a = STRINGS[lang]) != null ? _a : STRINGS.en)[key]) != null ? _b : STRINGS.en[key]) != null ? _c : key;
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
  columnWidth: 200,
  sortMode: "name-asc",
  excludePatterns: "",
  folderColors: {},
  columnViewModes: {},
  pinnedPaths: {},
  columnSortModes: {},
  folderIcons: {},
  openFolderNote: false,
  lockedColumnCount: null
};
var MIN_COLUMN_WIDTH = 140;
var MAX_COLUMN_WIDTH = 500;
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
        name: t("setSort"),
        control: {
          type: "dropdown",
          key: "sortMode",
          options: {
            "name-asc": t("sortNameAsc"),
            "name-desc": t("sortNameDesc"),
            "mtime-desc": t("sortMtimeDesc"),
            "mtime-asc": t("sortMtimeAsc")
          }
        }
      },
      { name: t("setFoldersFirst"), desc: t("setFoldersFirstDesc"), control: { type: "toggle", key: "foldersFirst" } },
      { name: t("setShowExt"), desc: t("setShowExtDesc"), control: { type: "toggle", key: "showExtensions" } },
      { name: t("setPreview"), desc: t("setPreviewDesc"), control: { type: "toggle", key: "showPreview" } },
      { name: t("setMdPreview"), desc: t("setMdPreviewDesc"), control: { type: "toggle", key: "showMarkdownPreview" } },
      { name: t("setAutoReveal"), desc: t("setAutoRevealDesc"), control: { type: "toggle", key: "autoReveal" } },
      { name: t("setFolderNote"), desc: t("setFolderNoteDesc"), control: { type: "toggle", key: "openFolderNote" } },
      { name: t("setConfirmDelete"), desc: t("setConfirmDeleteDesc"), control: { type: "toggle", key: "confirmDelete" } },
      {
        name: t("setColWidth"),
        desc: t("setColWidthDesc"),
        control: { type: "slider", key: "columnWidth", min: MIN_COLUMN_WIDTH, max: MAX_COLUMN_WIDTH, step: 10 }
      },
      { name: t("setExclude"), desc: t("setExcludeDesc"), control: { type: "text", key: "excludePatterns" } }
    ];
  }
  /** Self-contained override — avoids calling the 1.13-only base implementation. */
  async setControlValue(key, value) {
    var _a;
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
    (_a = this.plugin.getView()) == null ? void 0 : _a.render();
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
    new import_obsidian2.Setting(containerEl).setName(t("setSort")).addDropdown((d) => d.addOption("name-asc", t("sortNameAsc")).addOption("name-desc", t("sortNameDesc")).addOption("mtime-desc", t("sortMtimeDesc")).addOption("mtime-asc", t("sortMtimeAsc")).setValue(s.sortMode).onChange(async (v) => {
      s.sortMode = v;
      await save();
    }));
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
    new import_obsidian2.Setting(containerEl).setName(t("setColWidth")).setDesc(t("setColWidthDesc")).addSlider((sl) => sl.setLimits(MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, 10).setValue(s.columnWidth).onChange(async (v) => {
      s.columnWidth = v;
      await save();
    }));
    new import_obsidian2.Setting(containerEl).setName(t("setExclude")).setDesc(t("setExcludeDesc")).addText((txt) => txt.setValue(s.excludePatterns).onChange(async (v) => {
      s.excludePatterns = v;
      await save();
    }));
  }
};

// src/view.ts
var import_obsidian10 = require("obsidian");

// src/utils.ts
var import_obsidian3 = require("obsidian");
function sortChildren(children, s, mode = s.sortMode) {
  const mtime = (f) => f instanceof import_obsidian3.TFile ? f.stat.mtime : 0;
  return [...children].sort((a, b) => {
    if (s.foldersFirst) {
      const aF = a instanceof import_obsidian3.TFolder, bF = b instanceof import_obsidian3.TFolder;
      if (aF !== bF) return aF ? -1 : 1;
    }
    switch (mode) {
      case "name-desc":
        return naturalCompare(b.name, a.name);
      case "mtime-desc":
        return mtime(b) - mtime(a) || naturalCompare(a.name, b.name);
      case "mtime-asc":
        return mtime(a) - mtime(b) || naturalCompare(a.name, b.name);
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
    (c) => c instanceof import_obsidian3.TFile && c.extension === "md" && c.basename === folder.name
  );
  return note instanceof import_obsidian3.TFile ? note : null;
}
function displayName(f) {
  if (f instanceof import_obsidian3.TFile && f.extension === "md") return f.basename;
  return f.name;
}
var IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
function isImageFile(f) {
  return IMAGE_EXTENSIONS.includes(f.extension);
}
function iconFor(f) {
  if (!(f instanceof import_obsidian3.TFile)) return "folder";
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

// src/column.ts
var import_obsidian8 = require("obsidian");

// src/dnd.ts
var import_obsidian5 = require("obsidian");

// src/fileops.ts
var import_obsidian4 = require("obsidian");
async function moveFiles(app, paths, target) {
  var _a;
  let moved = 0;
  for (const path of paths) {
    const src = app.vault.getAbstractFileByPath(path);
    if (!src || src.path === target.path) continue;
    if (target.path.startsWith(src.path + "/")) {
      new import_obsidian4.Notice(t("cantMoveIntoSelf"));
      continue;
    }
    if (((_a = src.parent) == null ? void 0 : _a.path) === target.path) continue;
    const dest = (0, import_obsidian4.normalizePath)((target.isRoot() ? "" : target.path + "/") + src.name);
    if (app.vault.getAbstractFileByPath(dest)) {
      new import_obsidian4.Notice(t("alreadyExists", { name: src.name }));
      continue;
    }
    await app.fileManager.renameFile(src, dest);
    moved++;
  }
  if (moved > 1) new import_obsidian4.Notice(t("itemsMoved", { n: moved }));
  return moved;
}
async function duplicateFile(app, f) {
  const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
  let n = 1;
  let path = (0, import_obsidian4.normalizePath)(dir + f.basename + " copy." + f.extension);
  while (app.vault.getAbstractFileByPath(path)) {
    path = (0, import_obsidian4.normalizePath)(dir + f.basename + " copy " + n++ + "." + f.extension);
  }
  await app.vault.copy(f, path);
}
async function trashFiles(app, paths) {
  for (const p of paths) {
    const f = app.vault.getAbstractFileByPath(p);
    if (f) await app.fileManager.trashFile(f);
  }
}

// src/dnd.ts
function itemUnderEvent(listEl, e) {
  var _a;
  const target = e.target;
  return (_a = target == null ? void 0 : target.closest(".column-explorer-item")) != null ? _a : null;
}
function folderForItem(app, item) {
  if (!(item == null ? void 0 : item.dataset.path)) return null;
  const f = app.vault.getAbstractFileByPath(item.dataset.path);
  return f instanceof import_obsidian5.TFolder ? f : null;
}
function setupColumnDnd(view, listEl, columnFolder, depth) {
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
    (_a = e.dataTransfer) == null ? void 0 : _a.setData("text/plain", JSON.stringify(paths));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    try {
      const dragManager = app.dragManager;
      if (dragManager && paths.length === 1 && (f instanceof import_obsidian5.TFile || f instanceof import_obsidian5.TFolder)) {
        const dragData = f instanceof import_obsidian5.TFile ? dragManager.dragFile(e, f) : dragManager.dragFolder(e, f);
        dragManager.onDragStart(e, dragData);
      }
    } catch (e2) {
    }
  });
  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const targetFolder = folderForItem(app, itemUnderEvent(listEl, e));
    setHighlight(targetFolder ? itemUnderEvent(listEl, e) : listEl);
  });
  listEl.addEventListener("dragleave", (e) => {
    if (!listEl.contains(e.relatedTarget)) setHighlight(null);
  });
  listEl.addEventListener("drop", (e) => {
    var _a, _b;
    e.preventDefault();
    e.stopPropagation();
    const dropFolder = (_a = folderForItem(app, itemUnderEvent(listEl, e))) != null ? _a : columnFolder;
    setHighlight(null);
    const raw = (_b = e.dataTransfer) == null ? void 0 : _b.getData("text/plain");
    if (!raw) return;
    let paths;
    try {
      const parsed = JSON.parse(raw);
      paths = Array.isArray(parsed) ? parsed.map(String) : [raw];
    } catch (e2) {
      paths = [raw];
    }
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

// src/menus.ts
var import_obsidian7 = require("obsidian");

// src/modals.ts
var import_obsidian6 = require("obsidian");
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
var SORT_MODES = ["name-asc", "name-desc", "mtime-desc", "mtime-asc"];
function sortLabel(mode) {
  const keys = {
    "name-asc": "sortNameAsc",
    "name-desc": "sortNameDesc",
    "mtime-desc": "sortMtimeDesc",
    "mtime-asc": "sortMtimeAsc"
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
  menu.addItem((i) => i.setTitle(t("moveTo")).setIcon("folder-input").onClick(() => new FolderSuggestModal(app, (target) => void moveFiles(app, [f.path], target)).open()));
  menu.addItem((i) => i.setTitle(t("rename")).setIcon("pencil").onClick(() => view.startRename(f)));
  menu.addItem((i) => i.setTitle(t("delete")).setIcon("trash").onClick(() => view.deleteMany([f.path])));
  menu.addSeparator();
  menu.addItem((i) => i.setTitle(t("copyPath")).setIcon("clipboard-copy").onClick(() => copyToClipboard(f.path, t("pathCopied"))));
  if (f instanceof import_obsidian7.TFile) {
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
  for (const mode of SORT_MODES) {
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
function showSortMenu(view, e) {
  const menu = new import_obsidian7.Menu();
  for (const m of SORT_MODES) {
    menu.addItem((i) => i.setTitle(sortLabel(m)).setChecked(view.plugin.settings.sortMode === m).onClick(async () => {
      view.plugin.settings.sortMode = m;
      await view.plugin.saveSettings();
      view.render();
    }));
  }
  menu.showAtMouseEvent(e);
}

// src/column.ts
function itemFromEvent(e) {
  var _a;
  const el = (_a = e.target) == null ? void 0 : _a.closest(".column-explorer-item");
  return (el == null ? void 0 : el.dataset.path) ? { el, path: el.dataset.path } : null;
}
function renderColumn(view, container, folder, depth) {
  var _a;
  const col = container.createDiv({ cls: "column-explorer-column" });
  col.dataset.depth = String(depth);
  col.dataset.folderPath = folder.path;
  const header = col.createDiv({ cls: "column-explorer-column-header" });
  header.createSpan({ cls: "column-explorer-column-title", text: folder.isRoot() ? view.app.vault.getName() : folder.name });
  header.createSpan({ cls: "column-explorer-column-count" });
  header.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showColumnHeaderMenu(view, e, folder);
  });
  const viewMode = (_a = view.plugin.settings.columnViewModes[folder.path]) != null ? _a : "list";
  const toggle = header.createDiv({
    cls: "clickable-icon column-explorer-view-toggle",
    attr: { "aria-label": viewMode === "list" ? t("viewAsGrid") : t("viewAsList") }
  });
  (0, import_obsidian8.setIcon)(toggle, viewMode === "list" ? "layout-grid" : "list");
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
    if (f instanceof import_obsidian8.TFile) void view.app.workspace.getLeaf("tab").openFile(f);
  });
  list.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const hit = itemFromEvent(e);
    const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
    if (f instanceof import_obsidian8.TFile) void view.app.workspace.getLeaf("tab").openFile(f);
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
  renderColumnList(view, list, folder, depth);
  addResizeHandle(view, col);
  return col;
}
function renderColumnList(view, list, folder, depth) {
  var _a, _b;
  list.empty();
  const children = view.childrenOf(folder);
  const countEl = (_a = list.closest(".column-explorer-column")) == null ? void 0 : _a.querySelector(".column-explorer-column-count");
  countEl == null ? void 0 : countEl.setText(String(children.length));
  if (children.length === 0) {
    list.createDiv({ cls: "column-explorer-empty", text: view.hasFilter() ? t("noResults") : t("empty") });
    return;
  }
  const isGrid = ((_b = view.plugin.settings.columnViewModes[folder.path]) != null ? _b : "list") === "grid";
  const frag = createFragment();
  for (const child of children) frag.appendChild(buildItem(view, child, depth, isGrid));
  list.appendChild(frag);
}
function buildItem(view, f, depth, isGrid = false) {
  const item = createDiv({ cls: "column-explorer-item", attr: { role: "option" } });
  item.dataset.path = f.path;
  item.draggable = true;
  const selected = view.selection[depth] === f.path;
  item.setAttribute("aria-selected", String(selected));
  if (selected) item.addClass("is-selected");
  if (selected && depth < view.selection.length - 1) item.addClass("is-ancestor");
  if (view.multiSelDepth === depth && view.multiSel.has(f.path)) item.addClass("is-multi-selected");
  const activeFile = view.app.workspace.getActiveFile();
  if (activeFile && activeFile.path === f.path) item.addClass("is-active-file");
  if (f instanceof import_obsidian8.TFolder) {
    const colorKey = view.plugin.settings.folderColors[f.path];
    if (colorKey) {
      item.addClass("has-folder-color");
      item.style.setProperty("--ce-folder-color", `var(--color-${colorKey})`);
    }
    if (folderNoteOf(f)) item.addClass("has-folder-note");
  }
  const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
  if (isGrid && f instanceof import_obsidian8.TFile && isImageFile(f)) {
    item.addClass("has-thumbnail");
    iconEl.createEl("img", {
      cls: "column-explorer-thumb",
      attr: { src: view.app.vault.getResourcePath(f), loading: "lazy", alt: displayName(f) }
    });
  } else {
    const customIcon = f instanceof import_obsidian8.TFolder ? view.plugin.settings.folderIcons[f.path] : void 0;
    (0, import_obsidian8.setIcon)(iconEl, customIcon != null ? customIcon : iconFor(f));
  }
  item.createDiv({ cls: "column-explorer-item-title", text: displayName(f) });
  if (view.plugin.settings.pinnedPaths[f.path] !== void 0) {
    const pin = item.createDiv({ cls: "column-explorer-item-pin" });
    (0, import_obsidian8.setIcon)(pin, "pin");
  }
  if (f instanceof import_obsidian8.TFolder) {
    const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
    (0, import_obsidian8.setIcon)(chev, "chevron-right");
  } else if (f instanceof import_obsidian8.TFile && f.extension !== "md" && view.plugin.settings.showExtensions) {
    item.createDiv({ cls: "column-explorer-item-ext", text: f.extension });
  }
  return item;
}
function addResizeHandle(view, col) {
  const handle = col.createDiv({ cls: "column-explorer-resize-handle" });
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = view.plugin.settings.columnWidth;
    const onMove = (ev) => {
      const width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX));
      view.plugin.settings.columnWidth = width;
      view.applyColumnWidth();
    };
    const onUp = () => {
      activeDocument.removeEventListener("mousemove", onMove);
      activeDocument.removeEventListener("mouseup", onUp);
      void view.plugin.saveSettings();
    };
    activeDocument.addEventListener("mousemove", onMove);
    activeDocument.addEventListener("mouseup", onUp);
  });
}

// src/preview.ts
var import_obsidian9 = require("obsidian");
var MARKDOWN_PREVIEW_CHARS = 1e3;
var AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "m4a"];
var VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "ogv"];
function renderPreviewColumn(view, container, file) {
  const col = container.createDiv({ cls: "column-explorer-column column-explorer-preview" });
  const inner = col.createDiv({ cls: "column-explorer-preview-inner" });
  if (!renderMediaPreview(view, inner, file)) {
    const big = inner.createDiv({ cls: "column-explorer-preview-icon" });
    (0, import_obsidian9.setIcon)(big, iconFor(file));
  }
  inner.createDiv({ cls: "column-explorer-preview-name", text: displayName(file) });
  const meta = inner.createDiv({ cls: "column-explorer-preview-meta" });
  meta.createDiv({ text: file.extension.toUpperCase() + " \xB7 " + humanSize(file.stat.size) });
  meta.createDiv({ text: t("modified") + ": " + new Date(file.stat.mtime).toLocaleString() });
  meta.createDiv({ text: t("created") + ": " + new Date(file.stat.ctime).toLocaleString() });
  const btn = inner.createEl("button", { text: t("open"), cls: "mod-cta" });
  btn.addEventListener("click", (e) => {
    void view.app.workspace.getLeaf(import_obsidian9.Keymap.isModEvent(e)).openFile(file);
  });
  if (file.extension === "md" && view.plugin.settings.showMarkdownPreview) {
    void renderMarkdownSnippet(view, inner, file);
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
  if (file.extension === "pdf" && import_obsidian9.Platform.isDesktopApp) {
    inner.createEl("iframe", { cls: "column-explorer-preview-pdf", attr: { src } });
    return true;
  }
  return false;
}
async function renderMarkdownSnippet(view, inner, file) {
  try {
    const content = await view.app.vault.cachedRead(file);
    if (view.selectedFilePath() !== file.path) return;
    let snippet = content.slice(0, MARKDOWN_PREVIEW_CHARS);
    if (content.length > MARKDOWN_PREVIEW_CHARS) snippet += "\u2026";
    if (!snippet.trim()) return;
    const box = inner.createDiv({ cls: "column-explorer-preview-md markdown-rendered" });
    await import_obsidian9.MarkdownRenderer.render(view.app, snippet, box, file.path, view);
  } catch (e) {
  }
}

// src/view.ts
var VIEW_TYPE_COLUMNS = "column-explorer-view";
var TYPEAHEAD_RESET_MS = 700;
var PAGE_JUMP = 10;
var ColumnExplorerView = class extends import_obsidian10.ItemView {
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
    this.typeaheadBuffer = "";
    this.typeaheadTimer = 0;
    /** Targeted refresh: folders whose columns need re-rendering. */
    this.dirtyFolders = /* @__PURE__ */ new Set();
    this.fullRenderPending = false;
    this.flushRefresh = (0, import_obsidian10.debounce)(() => this.doRefresh(), 60, true);
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
    const container = this.contentEl;
    container.empty();
    container.addClass("column-explorer-container");
    const toolbar = container.createDiv({ cls: "column-explorer-toolbar" });
    this.addToolbarButton(toolbar, "file-plus", t("newNote"), () => void this.createNote(this.currentFolder()));
    this.addToolbarButton(toolbar, "folder-plus", t("newFolder"), () => void this.createFolder(this.currentFolder()));
    this.addToolbarButton(toolbar, "locate", t("reveal"), () => this.revealFile(this.app.workspace.getActiveFile()));
    this.addToolbarButton(toolbar, "arrow-up-narrow-wide", t("sort"), (e) => showSortMenu(this, e));
    this.addToolbarButton(toolbar, "chevrons-left", t("collapse"), () => {
      this.selection = [];
      this.clearMulti();
      this.render();
    });
    this.lockBtn = this.addToolbarButton(toolbar, "lock-open", t("lockPanel"), () => {
      const s = this.plugin.settings;
      s.lockedColumnCount = s.lockedColumnCount === null ? this.folderColumnCount() : null;
      void this.plugin.saveSettings();
      this.render();
    });
    this.updateLockButton();
    this.searchInput = toolbar.createEl("input", {
      type: "search",
      cls: "column-explorer-search",
      attr: { placeholder: t("search") }
    });
    this.registerDomEvent(this.searchInput, "input", () => {
      this.filter = this.searchInput.value.toLowerCase().trim();
      this.render();
    });
    this.breadcrumbsEl = container.createDiv({ cls: "column-explorer-breadcrumbs" });
    this.columnsEl = container.createDiv({ cls: "column-explorer-columns" });
    this.columnsEl.tabIndex = 0;
    this.registerDomEvent(this.columnsEl, "keydown", (e) => this.onKeyDown(e));
    this.registerEvent(this.app.vault.on("create", (f) => {
      var _a, _b;
      return this.markDirty((_b = (_a = f.parent) == null ? void 0 : _a.path) != null ? _b : null);
    }));
    this.registerEvent(this.app.vault.on("delete", (f) => {
      var _a, _b;
      const changed = this.pruneSelection(f.path);
      this.prunePathRecords(f.path);
      this.markDirty(changed ? null : (_b = (_a = f.parent) == null ? void 0 : _a.path) != null ? _b : null);
    }));
    this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
      this.remapSelection(oldPath, f.path);
      this.remapPathRecords(oldPath, f.path);
      this.markDirty(null);
    }));
    this.render();
  }
  addToolbarButton(parent, icon, tooltip, onClick) {
    const btn = parent.createDiv({ cls: "clickable-icon column-explorer-toolbar-btn", attr: { "aria-label": tooltip } });
    (0, import_obsidian10.setIcon)(btn, icon);
    this.registerDomEvent(btn, "click", onClick);
    return btn;
  }
  updateLockButton() {
    const locked = this.plugin.settings.lockedColumnCount !== null;
    (0, import_obsidian10.setIcon)(this.lockBtn, locked ? "lock" : "lock-open");
    this.lockBtn.setAttribute("aria-label", locked ? t("unlockPanel") : t("lockPanel"));
    this.lockBtn.toggleClass("is-active", locked);
  }
  /* -------------------------- shared accessors --------------------- */
  /** Visible (exclude-filtered, sorted, search-filtered) children of a folder. */
  childrenOf(folder) {
    let children = visibleChildren(folder, this.plugin.settings);
    if (this.filter) {
      children = children.filter(
        (c) => c instanceof import_obsidian10.TFolder || displayName(c).toLowerCase().includes(this.filter)
      );
    }
    return children;
  }
  hasFilter() {
    return this.filter.length > 0;
  }
  isRenaming(path) {
    return this.renamingPath === path;
  }
  selectedFilePath() {
    const last = this.selection[this.selection.length - 1];
    if (!last) return null;
    const f = this.app.vault.getAbstractFileByPath(last);
    return f instanceof import_obsidian10.TFile ? f.path : null;
  }
  dragPayload(f, depth) {
    if (this.multiSelDepth === depth && this.multiSel.has(f.path)) return [...this.multiSel];
    return [f.path];
  }
  clearMulti() {
    this.multiSel.clear();
    this.multiSelDepth = -1;
    this.shiftAnchor = null;
  }
  /** Number of folder columns for the current selection chain (root column included). */
  folderColumnCount() {
    for (let i = this.selection.length - 1; i >= 0; i--) {
      const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
      if (f instanceof import_obsidian10.TFolder) return i + 2;
    }
    return 1;
  }
  currentFolder() {
    for (let i = this.selection.length - 1; i >= 0; i--) {
      const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
      if (f instanceof import_obsidian10.TFolder) return f;
      if (f instanceof import_obsidian10.TFile && f.parent) return f.parent;
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
    void this.plugin.saveSettings();
  }
  prunePathRecords(deletedPath) {
    const s = this.plugin.settings;
    s.folderColors = prunePathKeys(s.folderColors, deletedPath);
    s.columnViewModes = prunePathKeys(s.columnViewModes, deletedPath);
    s.pinnedPaths = prunePathKeys(s.pinnedPaths, deletedPath);
    s.columnSortModes = prunePathKeys(s.columnSortModes, deletedPath);
    s.folderIcons = prunePathKeys(s.folderIcons, deletedPath);
    void this.plugin.saveSettings();
  }
  /* ------------------------------ render --------------------------- */
  applyColumnWidth() {
    this.columnsEl.style.setProperty("--ce-col-width", this.plugin.settings.columnWidth + "px");
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
      if (folder instanceof import_obsidian10.TFolder) {
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
    const scrollTops = this.captureScrollTops();
    const prevKey = this.columnsKey();
    const prevScrollLeft = this.columnsEl.scrollLeft;
    this.columnsEl.empty();
    this.applyColumnWidth();
    const validSel = [];
    let parent = this.app.vault.getRoot();
    for (const path of this.selection) {
      const f = this.app.vault.getAbstractFileByPath(path);
      if (!f || f.parent !== parent) break;
      validSel.push(path);
      if (f instanceof import_obsidian10.TFolder) parent = f;
      else break;
    }
    this.selection = validSel;
    const startDepth = lockStartDepth(this.folderColumnCount(), this.plugin.settings.lockedColumnCount);
    this.updateLockButton();
    this.columnsEl.toggleClass("is-locked", startDepth > 0);
    if (startDepth === 0) renderColumn(this, this.columnsEl, this.app.vault.getRoot(), 0);
    for (let depth = 0; depth < this.selection.length; depth++) {
      if (depth + 1 < startDepth) continue;
      const f = this.app.vault.getAbstractFileByPath(this.selection[depth]);
      if (f instanceof import_obsidian10.TFolder) {
        renderColumn(this, this.columnsEl, f, depth + 1);
      } else if (f instanceof import_obsidian10.TFile && this.plugin.settings.showPreview) {
        renderPreviewColumn(this, this.columnsEl, f);
      }
    }
    if (startDepth > 0) this.markLockedColumn();
    this.renderBreadcrumbs();
    this.restoreScrollTops(scrollTops);
    const sameColumns = this.columnsKey() === prevKey;
    window.requestAnimationFrame(() => {
      this.columnsEl.scrollLeft = sameColumns ? prevScrollLeft : this.columnsEl.scrollWidth;
    });
  }
  /** Lock badge in the header of the first visible (temporary root) column. */
  markLockedColumn() {
    const col = this.columnsEl.querySelector(".column-explorer-column");
    const header = col == null ? void 0 : col.querySelector(".column-explorer-column-header");
    if (!col || !header) return;
    col.addClass("is-locked-root");
    const badge = createDiv({ cls: "column-explorer-lock-badge" });
    (0, import_obsidian10.setIcon)(badge, "lock");
    header.prepend(badge);
  }
  renderBreadcrumbs() {
    this.breadcrumbsEl.empty();
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
      addSegment(f ? displayName(f) : (_a = path.split("/").pop()) != null ? _a : path, i + 1, i === this.selection.length - 1);
    });
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
  selectItem(f, depth, e) {
    const s = this.plugin.settings;
    if (s.lockedColumnCount !== null && depth === 0) {
      s.lockedColumnCount = null;
      void this.plugin.saveSettings();
    }
    this.selection = this.selection.slice(0, depth);
    this.selection.push(f.path);
    this.shiftAnchor = f.path;
    if (f instanceof import_obsidian10.TFile) {
      void this.app.workspace.getLeaf(import_obsidian10.Keymap.isModEvent(e)).openFile(f);
    } else if (f instanceof import_obsidian10.TFolder && this.plugin.settings.openFolderNote) {
      const note = folderNoteOf(f);
      if (note) void this.app.workspace.getLeaf(import_obsidian10.Keymap.isModEvent(e)).openFile(note);
    }
    this.persistState();
    this.render();
  }
  toggleMulti(f, depth) {
    if (this.multiSelDepth !== depth) this.clearMulti();
    this.multiSelDepth = depth;
    if (this.multiSel.has(f.path)) this.multiSel.delete(f.path);
    else this.multiSel.add(f.path);
    this.shiftAnchor = f.path;
    if (this.multiSel.size === 0) this.multiSelDepth = -1;
    this.render();
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
  revealFile(file) {
    if (!file) return;
    if (this.filter) {
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
      this.clearMulti();
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
    let path = (0, import_obsidian10.normalizePath)(base + "." + extension);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian10.normalizePath)(base + " " + n++ + "." + extension);
    }
    const file = await this.app.vault.create(path, initialContent);
    this.revealFile(file);
    await this.app.workspace.getLeaf(false).openFile(file);
    window.setTimeout(() => this.startRenameByPath(file.path), 100);
  }
  async createFolder(folder) {
    const base = (folder.isRoot() ? "" : folder.path + "/") + t("newFolderName");
    let path = (0, import_obsidian10.normalizePath)(base);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian10.normalizePath)(base + " " + n++);
    }
    await this.app.vault.createFolder(path);
    window.setTimeout(() => this.startRenameByPath(path), 100);
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
    const isMdFile = f instanceof import_obsidian10.TFile && f.extension === "md";
    const original = f instanceof import_obsidian10.TFile && f.extension === "md" ? f.basename : f.name;
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
          await this.app.fileManager.renameFile(f, (0, import_obsidian10.normalizePath)(dir + finalName));
        } catch (err) {
          new import_obsidian10.Notice(t("renameFailed") + String(err));
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
    const depth = Math.max(0, this.selection.length - 1);
    const selectedPath = this.selection[depth];
    const parentFolder = this.folderAtDepth(depth);
    const children = parentFolder ? this.childrenOf(parentFolder) : [];
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
      const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
      if (f instanceof import_obsidian10.TFolder) {
        const inner = this.childrenOf(f);
        if (inner.length > 0) {
          this.selection.push(inner[0].path);
          this.persistState();
          this.render();
        }
      } else if (f instanceof import_obsidian10.TFile && e.key === "Enter") {
        void this.app.workspace.getLeaf(false).openFile(f);
      }
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
      if (selectedPath) this.deleteMany([selectedPath]);
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
    const match = children.find((c) => displayName(c).toLowerCase().startsWith(this.typeaheadBuffer));
    if (!match) return;
    this.selection = this.selection.slice(0, depth);
    this.selection.push(match.path);
    this.clearMulti();
    this.persistState();
    this.render();
  }
  folderAtDepth(depth) {
    if (depth === 0) return this.app.vault.getRoot();
    const f = this.app.vault.getAbstractFileByPath(this.selection[depth - 1]);
    return f instanceof import_obsidian10.TFolder ? f : null;
  }
};

// src/main.ts
var ColumnExplorerPlugin = class extends import_obsidian11.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
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
        var _a;
        await this.activateView();
        (_a = this.getView()) == null ? void 0 : _a.revealFile(this.app.workspace.getActiveFile());
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data != null ? data : {});
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
  getView() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS)[0];
    return leaf && leaf.view instanceof ColumnExplorerView ? leaf.view : null;
  }
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_COLUMNS, active: true });
      await this.app.workspace.revealLeaf(leaf);
    }
  }
};
