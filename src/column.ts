import { Platform, TAbstractFile, TFile, TFolder, getLanguage, setIcon } from "obsidian";
import { t } from "./i18n";
import { BOOKMARKS_PATH, CALENDAR_PATH, DAY_PATH_PREFIX, RECENTS_PATH, dayKey, monthGrid, splitMatch } from "./pure";
import { displayName, folderNoteOf, iconFor, isImageFile } from "./utils";
import { addUpButton, setupLongPress } from "./mobile";
import { notifyDragManager, setupColumnDnd } from "./dnd";
import { showColumnHeaderMenu, showFileMenu, showFolderBackgroundMenu } from "./menus";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, ROOT_COLUMN_EXTRA_WIDTH } from "./settings";
import type { ColumnExplorerView } from "./view";

function itemFromEvent(e: Event): { el: HTMLElement; path: string } | null {
	const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".column-explorer-item");
	return el?.dataset.path ? { el, path: el.dataset.path } : null;
}

export function renderColumn(view: ColumnExplorerView, container: HTMLElement, folder: TFolder, depth: number) {
	const col = container.createDiv({ cls: "column-explorer-column" });
	col.dataset.depth = String(depth);
	col.dataset.folderPath = folder.path;
	// Индивидуальная ширина колонки перекрывает дефолтную из настроек;
	// без своей ширины корневая колонка шире остальных
	const customWidth = view.plugin.settings.columnWidths[folder.path]
		?? (folder.isRoot() ? view.plugin.settings.columnWidth + ROOT_COLUMN_EXTRA_WIDTH : undefined);
	if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");

	const header = col.createDiv({ cls: "column-explorer-column-header" });
	if (Platform.isMobile) addUpButton(view, header);
	header.createSpan({ cls: "column-explorer-column-title", text: folder.isRoot() ? view.app.vault.getName() : folder.name });
	header.createSpan({ cls: "column-explorer-column-count" });
	header.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		showColumnHeaderMenu(view, e, folder);
	});

	const viewMode = view.plugin.settings.columnViewModes[folder.path] ?? "list";
	const toggle = header.createDiv({
		cls: "clickable-icon column-explorer-view-toggle",
		attr: {
			"aria-label": viewMode === "list" ? t("viewAsGrid") : t("viewAsList"),
			role: "button",
			"aria-pressed": String(viewMode === "grid"),
		},
	});
	setIcon(toggle, viewMode === "list" ? "layout-grid" : "list");
	toggle.addEventListener("click", () => {
		view.plugin.settings.columnViewModes = {
			...view.plugin.settings.columnViewModes,
			[folder.path]: viewMode === "list" ? "grid" : "list",
		};
		void view.plugin.saveSettings();
		view.render();
	});

	const list = col.createDiv({ cls: "column-explorer-list", attr: { role: "listbox" } });
	if (viewMode === "grid") list.addClass("is-grid");

	/* Event delegation: one listener set per column, not per item. */
	list.addEventListener("click", (e) => {
		const hit = itemFromEvent(e);
		if (!hit) {
			// Клик по пустому месту снимает мультивыделение
			if (e.target === list) { view.clearMulti(); view.render(); }
			return;
		}
		if (view.specialKind(hit.path)) { view.clearMulti(); view.selectSpecial(hit.path); return; }
		const f = view.app.vault.getAbstractFileByPath(hit.path);
		if (!f || view.isRenaming(hit.path)) return;
		if (e.ctrlKey || e.metaKey) { view.toggleMulti(f, depth); return; }
		if (e.shiftKey) { view.rangeMulti(f, depth, view.childrenOf(folder)); return; }
		view.clearMulti();
		view.selectItem(f, depth, e);
	});

	list.addEventListener("dblclick", (e) => {
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f instanceof TFile) void view.app.workspace.getLeaf("tab").openFile(f);
	});

	list.addEventListener("auxclick", (e) => {
		if (e.button !== 1) return;
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f instanceof TFile) void view.app.workspace.getLeaf("tab").openFile(f);
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
	if (Platform.isMobile) setupLongPress(view, list, depth);
	renderColumnList(view, list, folder, depth);
	addResizeHandle(view, col, folder.path);
	return col;
}

/** Items rendered per batch — big folders fill in as the user scrolls. */
const RENDER_CHUNK = 300;

/** Живые сентинел-обсерверы по спискам — отключаем старый при перерендере. */
const listObservers = new WeakMap<HTMLElement, IntersectionObserver>();

/** (Re)fill a column's list — used both on full render and targeted refresh. */
export function renderColumnList(view: ColumnExplorerView, list: HTMLElement, folder: TFolder, depth: number) {
	listObservers.get(list)?.disconnect();
	listObservers.delete(list);
	list.empty();
	// Спецпункты (Недавние/Закладки/Календарь) — только в корневой колонке,
	// сверху или снизу списка по настройке
	const specials = folder.isRoot() && depth === 0 ? buildSpecialItems(view) : [];
	const specialsOnTop = view.plugin.settings.specialItemsPosition === "top";
	if (specialsOnTop) specials.forEach((el) => list.appendChild(el));
	const appendSpecialsBottom = () => {
		if (!specialsOnTop) specials.forEach((el) => list.appendChild(el));
	};
	const children = view.childrenOf(folder);

	const countEl = list.closest(".column-explorer-column")?.querySelector(".column-explorer-column-count");
	countEl?.setText(String(children.length));

	if (children.length === 0) {
		list.createDiv({ cls: "column-explorer-empty", text: view.hasFilter() ? t("noResults") : t("empty") });
		appendSpecialsBottom();
		return;
	}

	const isGrid = (view.plugin.settings.columnViewModes[folder.path] ?? "list") === "grid";
	// Инкрементальный рендер: сразу — первая порция (и как минимум до
	// выделенного элемента), остальное догружается сентинелом при скролле
	const selectedIdx = children.findIndex(c => c.path === view.selection[depth]);
	let rendered = Math.min(children.length, Math.max(RENDER_CHUNK, selectedIdx + 1));
	const frag = createFragment();
	for (let i = 0; i < rendered; i++) frag.appendChild(buildItem(view, children[i], depth, isGrid));
	list.appendChild(frag);
	if (rendered >= children.length) { appendSpecialsBottom(); return; }

	// Спецпункты «снизу» встают после сентинела: догружаемые порции
	// вставляются перед ним, так что спецпункты остаются в самом конце
	const sentinel = list.createDiv({ cls: "column-explorer-load-more" });
	appendSpecialsBottom();
	const observer = new IntersectionObserver((entries) => {
		if (!entries.some(entry => entry.isIntersecting)) return;
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

function buildItem(view: ColumnExplorerView, f: TAbstractFile, depth: number, isGrid = false): HTMLElement {
	const item = createDiv({ cls: "column-explorer-item", attr: { role: "option" } });
	item.dataset.path = f.path;
	// На тач-экране HTML5 drag конфликтует с прокруткой и long-press
	item.draggable = !Platform.isMobile;

	const selected = view.selection[depth] === f.path;
	item.setAttribute("aria-selected", String(selected));
	if (selected) item.addClass("is-selected");
	if (selected && depth < view.selection.length - 1) item.addClass("is-ancestor");
	if (view.multiSelDepth === depth && view.multiSel.has(f.path)) item.addClass("is-multi-selected");

	const activeFile = view.app.workspace.getActiveFile();
	if (activeFile && activeFile.path === f.path) item.addClass("is-active-file");

	if (f instanceof TFolder) {
		const colorKey = view.plugin.settings.folderColors[f.path];
		if (colorKey) {
			item.addClass("has-folder-color");
			item.style.setProperty("--ce-folder-color", `var(--color-${colorKey})`);
		}
		if (folderNoteOf(f)) item.addClass("has-folder-note");
	}

	const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
	if (isGrid && f instanceof TFile && isImageFile(f)) {
		item.addClass("has-thumbnail");
		iconEl.createEl("img", {
			cls: "column-explorer-thumb",
			attr: { src: view.app.vault.getResourcePath(f), loading: "lazy", alt: displayName(f) },
		});
	} else {
		const customIcon = f instanceof TFolder ? view.plugin.settings.folderIcons[f.path] : undefined;
		setIcon(iconEl, customIcon ?? iconFor(f));
	}

	const title = item.createDiv({ cls: "column-explorer-item-title" });
	const name = displayName(f);
	// Фильтр применяется только к файлам — папки показываются всегда
	const match = view.hasFilter() && f instanceof TFile ? splitMatch(name, view.filterQuery()) : null;
	if (match) {
		title.appendText(match[0]);
		title.createSpan({ cls: "column-explorer-match", text: match[1] });
		title.appendText(match[2]);
	} else {
		title.setText(name);
	}

	if (view.plugin.settings.pinnedPaths[f.path] !== undefined) {
		const pin = item.createDiv({ cls: "column-explorer-item-pin" });
		setIcon(pin, "pin");
	}

	if (f instanceof TFolder) {
		const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
		setIcon(chev, "chevron-right");
	} else if (f instanceof TFile && f.extension !== "md" && view.plugin.settings.showExtensions) {
		item.createDiv({ cls: "column-explorer-item-ext", text: f.extension });
	}
	return item;
}

/** Виртуальные пункты корневой колонки — с учётом настроек и доступности. */
function buildSpecialItems(view: ColumnExplorerView): HTMLElement[] {
	const items: HTMLElement[] = [];
	if (view.specialKind(RECENTS_PATH)) items.push(buildSpecialItem(view, RECENTS_PATH, "history", t("recents")));
	if (view.specialKind(BOOKMARKS_PATH)) items.push(buildSpecialItem(view, BOOKMARKS_PATH, "bookmark", t("bookmarks")));
	if (view.specialKind(CALENDAR_PATH)) items.push(buildSpecialItem(view, CALENDAR_PATH, "calendar-days", t("calendar")));
	return items;
}

function buildSpecialItem(view: ColumnExplorerView, path: string, icon: string, label: string): HTMLElement {
	const item = createDiv({ cls: "column-explorer-item column-explorer-special", attr: { role: "option" } });
	item.dataset.path = path;
	const selected = view.selection[0] === path;
	item.setAttribute("aria-selected", String(selected));
	if (selected) item.addClass("is-selected");
	if (selected && view.selection.length > 1) item.addClass("is-ancestor");
	const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
	setIcon(iconEl, icon);
	item.createDiv({ cls: "column-explorer-item-title", text: label });
	const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
	setIcon(chev, "chevron-right");
	return item;
}

/**
 * Виртуальная файловая колонка («Недавние», «Закладки», день календаря):
 * плоский список файлов. Вглубь не ведёт, drop и inline-rename не
 * принимает; клик открывает файл, тащить файлы ИЗ неё можно.
 */
export function renderFileListColumn(
	view: ColumnExplorerView, container: HTMLElement,
	title: string, files: TAbstractFile[], sentinelPath: string, depth: number,
	favorites: TAbstractFile[] = []
) {
	const col = container.createDiv({ cls: "column-explorer-column" });
	col.dataset.depth = String(depth);
	col.dataset.folderPath = sentinelPath;
	// Все колонки дней делят один ключ ширины — иначе в настройках копились
	// бы вечные записи вида "::day::2026-07-19"
	const widthKey = sentinelPath.startsWith(DAY_PATH_PREFIX) ? DAY_PATH_PREFIX : sentinelPath;
	const customWidth = view.plugin.settings.columnWidths[widthKey];
	if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");

	const header = col.createDiv({ cls: "column-explorer-column-header" });
	if (Platform.isMobile) addUpButton(view, header);
	header.createSpan({ cls: "column-explorer-column-title", text: title });
	const countEl = header.createSpan({ cls: "column-explorer-column-count" });

	const list = col.createDiv({ cls: "column-explorer-list", attr: { role: "listbox" } });
	countEl.setText(String(favorites.length + files.length));

	// Секция «Избранное» — сверху, над закладками, с подписью и разделителем
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
		// Папка-закладка — прыжок к ней в обычных колонках
		if (f instanceof TFolder) { view.clearMulti(); view.revealFile(f); return; }
		if (f instanceof TFile) { view.clearMulti(); view.selectItem(f, depth, e); }
	});
	list.addEventListener("auxclick", (e) => {
		if (e.button !== 1) return;
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f instanceof TFile) void view.app.workspace.getLeaf("tab").openFile(f);
	});
	list.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f) showFileMenu(view, e, f, depth);
	});
	// Только dragstart: перетащить файл в обычную колонку — payload через
	// dataTransfer, drop-приёма у виртуальных колонок нет
	if (!Platform.isMobile) {
		list.addEventListener("dragstart", (e: DragEvent) => {
			const hit = itemFromEvent(e);
			const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
			if (!f) return;
			// dragManager — чтобы drop в редактор вставлял ссылку, а не сырой JSON
			notifyDragManager(view.app, e, f);
			e.dataTransfer?.setData("text/plain", JSON.stringify([f.path]));
		});
	}
	if (Platform.isMobile) setupLongPress(view, list, depth);
	addResizeHandle(view, col, widthKey);
	return col;
}

/**
 * Колонка «Календарь»: сетка месяца с бейджами числа созданных заметок,
 * ‹ › листают месяцы, клик по названию месяца возвращает к сегодня,
 * клик по дню открывает колонку файлов этого дня.
 */
export function renderCalendarColumn(view: ColumnExplorerView, container: HTMLElement) {
	const col = container.createDiv({ cls: "column-explorer-column column-explorer-calendar" });
	col.dataset.depth = "1";
	col.dataset.folderPath = CALENDAR_PATH;
	const customWidth = view.plugin.settings.columnWidths[CALENDAR_PATH];
	if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");

	const header = col.createDiv({ cls: "column-explorer-column-header" });
	if (Platform.isMobile) addUpButton(view, header);
	header.createSpan({ cls: "column-explorer-column-title", text: t("calendar") });

	const { year, month } = view.currentCalendarMonth();
	const nav = col.createDiv({ cls: "column-explorer-cal-nav" });
	const prev = nav.createDiv({ cls: "clickable-icon", attr: { role: "button" } });
	setIcon(prev, "chevron-left");
	prev.addEventListener("click", () => view.navigateCalendarMonth(-1));
	const monthLabel = nav.createDiv({
		cls: "column-explorer-cal-month",
		text: new Date(year, month, 1).toLocaleDateString(getLanguage(), { month: "long", year: "numeric" }),
		attr: { "aria-label": t("today"), role: "button" },
	});
	monthLabel.addEventListener("click", () => view.navigateCalendarMonth(0));
	const next = nav.createDiv({ cls: "clickable-icon", attr: { role: "button" } });
	setIcon(next, "chevron-right");
	next.addEventListener("click", () => view.navigateCalendarMonth(1));

	const counts = view.calendarCounts();
	const todayKey = dayKey(Date.now());
	const selectedDay = view.selectedDayKey();
	const grid = col.createDiv({ cls: "column-explorer-cal-grid" });
	// Шапка дней недели, неделя с понедельника (2024-01-01 — понедельник)
	for (let i = 0; i < 7; i++) {
		const weekday = new Date(2024, 0, 1 + i).toLocaleDateString(getLanguage(), { weekday: "short" });
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
			const n = counts.get(day) ?? 0;
			if (n > 0) cell.createDiv({ cls: "column-explorer-cal-count", text: String(n) });
		}
	}
	grid.addEventListener("click", (e) => {
		const cell = (e.target as HTMLElement | null)?.closest<HTMLElement>(".column-explorer-cal-cell.is-day");
		if (cell?.dataset.day) view.selectDay(cell.dataset.day);
	});
	addResizeHandle(view, col, CALENDAR_PATH);
	return col;
}

/** Ручка на правом крае: тянет ширину ИМЕННО этой колонки, dblclick — сброс. */
function addResizeHandle(view: ColumnExplorerView, col: HTMLElement, folderPath: string) {
	const handle = col.createDiv({ cls: "column-explorer-resize-handle" });
	handle.addEventListener("mousedown", (e: MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = col.offsetWidth;
		let width = startWidth;
		const onMove = (ev: MouseEvent) => {
			width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX));
			col.style.setProperty("--ce-col-width", width + "px");
			// Панель в авто-режиме следует за колонкой прямо во время драга
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
		// Сброс корневой — к её дефолту (шире обычного), остальных — к общему
		if (folderPath === "/") {
			col.style.setProperty("--ce-col-width", s.columnWidth + ROOT_COLUMN_EXTRA_WIDTH + "px");
		} else {
			col.style.removeProperty("--ce-col-width");
		}
		view.autoResizePanel();
	});
}
