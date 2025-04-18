import {
	App,
	TAbstractFile,
	TFile,
	TFolder,
	loadPdfJs,
	resolveSubpath,
} from "obsidian";
import { Canvas, CanvasNode, CreateNodeOptions } from "./canvas-internal";
import { AugmentedCanvasSettings } from "src/settings/AugmentedCanvasSettings";

export async function readFileContent(
	app: App,
	file: TFile,
	subpath?: string | undefined
) {
	// TODO: remove frontmatter
	const body = await app.vault.read(file);

	if (subpath) {
		const cache = app.metadataCache.getFileCache(file);
		if (cache) {
			const resolved = resolveSubpath(cache, subpath);
			if (!resolved) {
				console.warn("Failed to get subpath", { file, subpath });
				return body;
			}
			if (resolved.start || resolved.end) {
				const subText = body.slice(
					resolved.start.offset,
					resolved.end?.offset
				);
				if (subText) {
					return subText;
				} else {
					console.warn("Failed to get subpath", { file, subpath });
					return body;
				}
			}
		}
	}

	return body;
}

const pdfToMarkdown = async (app: App, file: TFile) => {
	const pdfjsLib = await loadPdfJs();

	const pdfBuffer = await app.vault.readBinary(file);
	const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
	const pdf = await loadingTask.promise;

	const ebookTitle = file
		.path!.split("/")
		.pop()!
		.replace(/\.pdf$/i, "");

	let markdownContent = `# ${ebookTitle}

`;

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum);
		const textContent = await page.getTextContent();

		let pageText = textContent.items
			.map((item: { str: string }) => item.str)
			.join(" ");

		// Here you would need to enhance the logic to convert the text into Markdown.
		// For example, you could detect headers, lists, tables, etc., and apply the appropriate Markdown formatting.
		// This can get quite complex depending on the structure and layout of the original PDF.

		// Add a page break after each page's content.
		markdownContent += pageText + "\n\n---\n\n";
	}

	return markdownContent;
};

const epubToMarkdown = async (app: App, file: TFile) => {
	// TODO
	return "";
};

const readDifferentExtensionFileContent = async (app: App, file: TFile) => {
	// console.log({ file });
	switch (file.extension) {
		case "md":
			const body = await app.vault.cachedRead(file);
			return `## ${file.basename}\n${body}`;

		case "pdf":
			return pdfToMarkdown(app, file);

		case "epub":
			return epubToMarkdown(app, file);

		default:
			break;
	}
};

export async function readNodeContent(node: CanvasNode) {
	const app = node.app;
	const nodeData = node.getData();
	switch (nodeData.type) {
		case "text":
			return nodeData.text;
		case "file":
			const file = app.vault.getAbstractFileByPath(nodeData.file);
			if (file instanceof TFile) {
				if (node.subpath) {
					return await readFileContent(app, file, nodeData.subpath);
				} else {
					return readDifferentExtensionFileContent(app, file);
				}
			} else {
				console.debug("Cannot read from file type", file);
			}
	}
}

export const getFilesContent = async (app: App, files: TFile[]) => {
	let content = "";

	for (const file of files) {
		const fileContent = await readFileContent(app, file);

		content += `# ${file.basename}

${fileContent}

`;
	}

	return content;
};

export const updateNodeAndSave = async (
	canvas: Canvas,
	node: CanvasNode,
	// TODO: only accepts .text .size not working (is it Obsidian API?)
	nodeOptions: CreateNodeOptions
) => {
	// console.log({ nodeOptions });
	// node.setText(nodeOptions.text);
	// @ts-expect-error
	node.setData(nodeOptions);
	await canvas.requestSave();
};

export const generateFileName = (prefix: string = "file"): string => {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = now.getUTCDate().toString().padStart(2, "0");
	const hours = now.getUTCHours().toString().padStart(2, "0");
	const minutes = now.getUTCMinutes().toString().padStart(2, "0");
	const seconds = now.getUTCSeconds().toString().padStart(2, "0");

	return `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

/*
 * Will read canvas node content || md note content
 * TODO add backlinks reading
 */
export const cachedReadFile = async (app: App, file: TFile) => {
	if (file.path.endsWith(".canvas")) {
		const canvasJson = JSON.parse(await app.vault.cachedRead(file));
		console.log({ canvasJson });

		const nodesContent: string[] = [];

		if (canvasJson.nodes) {
			for await (const node of canvasJson.nodes) {
				if (node.type === "text") {
					nodesContent.push(node.text!);
				} else if (node.type === "file") {
					nodesContent.push(
						await cachedReadFile(
							app,
							app.vault.getAbstractFileByPath(node.file!) as TFile
						)
					);
				}
			}
		}

		// console.log({ canvas: { file, nodesContent } });

		return nodesContent.join("\n\n");
	} else {
		return await app.vault.cachedRead(file);
	}
};

// TODO : if there is a canvas which link to a file in the same folder then the folder can be read two times
export const readFolderMarkdownContent = async (app: App, folder: TFolder) => {
	// console.log({ folder });

	const filesContent: string[] = [];
	for await (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {
			// TODO special parsing for .canvas
			filesContent.push(
				`
# ${fileOrFolder.path}

${await cachedReadFile(app, fileOrFolder)}
`.trim()
			);
		} else {
			filesContent.push(
				`${await readFolderMarkdownContent(
					app,
					fileOrFolder as TFolder
				)}`
			);
		}
	}

	return filesContent.join("\n\n");
};

/**
 * Converts a base64 string to an ArrayBuffer
 */
export function getImageBuffer(base64String: string): ArrayBuffer {
	const byteCharacters = atob(base64String);
	const byteNumbers = new Array(byteCharacters.length);
	
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i);
	}
	
	return new Uint8Array(byteNumbers).buffer;
}

/**
 * Saves an image buffer to a file in the specified folder
 */
export async function saveImageToFile(app: App, buffer: ArrayBuffer, folderPath: string): Promise<TFile | null> {
	try {
		// Create folder if it doesn't exist
		const folderExists = app.vault.getAbstractFileByPath(folderPath) instanceof TFolder;
		if (!folderExists) {
			await app.vault.createFolder(folderPath);
		}
		
		// Generate a filename with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const fileName = `image-${timestamp}.png`;
		const filePath = `${folderPath}/${fileName}`;
		
		// Create the file
		const file = await app.vault.createBinary(filePath, buffer);
		return file;
	} catch (error) {
		console.error("Error saving image to file:", error);
		return null;
	}
}
