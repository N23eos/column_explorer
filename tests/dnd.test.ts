import { beforeEach, describe, expect, test, vi } from "vitest";
import { TFolder } from "obsidian";
import { clearActiveDrag, setupColumnDnd } from "../src/dnd";
import { renderColumnList } from "../src/column";
import { makeVault } from "./setup/vault";
import { makeView } from "./setup/view";
import { resetObservers } from "./setup/obsidian-dom";

/**
 * happy-dom не даёт конструктор DragEvent с рабочим dataTransfer, поэтому
 * событие собирается вручную: обычный Event плюс свой объект переноса.
 */
function dragEvent(type: string, target: HTMLElement, transfer: Partial<DataTransfer> = {}) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	const store = new Map<string, string>();
	Object.defineProperty(event, "dataTransfer", {
		value: {
			types: [] as string[],
			files: [] as unknown as FileList,
			effectAllowed: "none",
			dropEffect: "none",
			setData: (format: string, data: string) => store.set(format, data),
			getData: (format: string) => store.get(format) ?? "",
			...transfer,
		},
	});
	target.dispatchEvent(event);
	return event;
}

function setup(paths: string[], folderPath: string, settings = {}) {
	const vault = makeVault(paths);
	const view = makeView(vault, { settings });
	const folder = vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) throw new Error(`not a folder: ${folderPath}`);
	const list = document.createElement("div");
	document.body.appendChild(list);
	renderColumnList(view, list, folder, 0);
	setupColumnDnd(view, list, folder, 0);
	return { vault, view, folder, list };
}

const itemEl = (list: HTMLElement, path: string) =>
	list.querySelector<HTMLElement>(`[data-path="${path}"]`) as HTMLElement;

beforeEach(() => {
	document.body.innerHTML = "";
	resetObservers();
	clearActiveDrag();
});

describe("dragstart", () => {
	test("puts the dragged paths into dataTransfer as JSON", () => {
		const { list } = setup(["a.md", "sub/"], "/");

		const e = dragEvent("dragstart", itemEl(list, "a.md"));

		const payload = (e as unknown as { dataTransfer: DataTransfer }).dataTransfer.getData("text/plain");
		expect(JSON.parse(payload)).toEqual(["a.md"]);
	});
});

describe("dragover", () => {
	test("highlights the folder row under the cursor", () => {
		const { list } = setup(["a.md", "sub/"], "/");

		dragEvent("dragover", itemEl(list, "sub"));

		expect(itemEl(list, "sub").classList.contains("is-drop-target")).toBe(true);
	});

	test("highlights the whole list when hovering a file, not a folder", () => {
		const { list } = setup(["a.md", "sub/"], "/");

		dragEvent("dragover", itemEl(list, "a.md"));

		expect(list.classList.contains("is-drop-target")).toBe(true);
		expect(itemEl(list, "a.md").classList.contains("is-drop-target")).toBe(false);
	});

	test("marks OS files as a copy and internal drags as a move", () => {
		const { list } = setup(["a.md"], "/");

		const external = dragEvent("dragover", itemEl(list, "a.md"), { types: ["Files"] });
		const internal = dragEvent("dragover", itemEl(list, "a.md"), { types: ["text/plain"] });

		expect((external as unknown as { dataTransfer: DataTransfer }).dataTransfer.dropEffect).toBe("copy");
		expect((internal as unknown as { dataTransfer: DataTransfer }).dataTransfer.dropEffect).toBe("move");
	});
});

describe("drop", () => {
	test("moves the dragged file into the folder it was dropped on", async () => {
		const { list, view } = setup(["a.md", "sub/"], "/");
		const renamed: { from: string; to: string }[] = [];
		(view.app.fileManager as unknown as { renameFile: (f: { path: string }, p: string) => Promise<void> })
			.renameFile = (f, path) => { renamed.push({ from: f.path, to: path }); return Promise.resolve(); };

		dragEvent("dragstart", itemEl(list, "a.md"));
		dragEvent("drop", itemEl(list, "sub"));
		await vi.waitFor(() => expect(renamed).toHaveLength(1));

		expect(renamed).toEqual([{ from: "a.md", to: "sub/a.md" }]);
	});

	test("a stale drag state does not hijack a drop of OS files", async () => {
		const { list, view, vault } = setup(["sub/"], "/");
		const imported: string[] = [];
		(view.app.vault as unknown as { getAllLoadedFiles: () => unknown[]; createBinary: (p: string) => Promise<void> })
			.getAllLoadedFiles = () => [...vault.index.values()];
		(view.app.vault as unknown as { createBinary: (p: string) => Promise<void> })
			.createBinary = (p) => { imported.push(p); return Promise.resolve(); };

		// Именно этот путь ломался, когда render() убивал список во время драга
		clearActiveDrag();
		const osFile = { name: "x.png", arrayBuffer: () => Promise.resolve(new ArrayBuffer(2)) } as unknown as File;
		dragEvent("drop", itemEl(list, "sub"), { files: [osFile] as unknown as FileList });
		await vi.waitFor(() => expect(imported).toHaveLength(1));

		expect(imported).toEqual(["sub/x.png"]);
	});

	test("clears the highlight after the drop", () => {
		const { list } = setup(["a.md", "sub/"], "/");

		dragEvent("dragover", itemEl(list, "sub"));
		dragEvent("drop", itemEl(list, "sub"));

		expect(list.querySelector(".is-drop-target")).toBeNull();
	});
});

describe("pinned reorder", () => {
	test("dropping one pinned item onto another reorders pins instead of moving files", () => {
		const { list, view } = setup(["a.md", "b.md"], "/", { pinnedPaths: { "a.md": 0, "b.md": 1 } });
		const renamed: string[] = [];
		(view.app.fileManager as unknown as { renameFile: (f: { path: string }) => Promise<void> })
			.renameFile = (f) => { renamed.push(f.path); return Promise.resolve(); };

		dragEvent("dragstart", itemEl(list, "b.md"));
		dragEvent("drop", itemEl(list, "a.md"));

		expect(renamed).toEqual([]);
		expect(Object.keys(view.plugin.settings.pinnedPaths)).toEqual(["b.md", "a.md"]);
	});
});
