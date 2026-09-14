import { IGNORED_DIRECTORY_NAMES } from "./filters.js";

// Recursively traverse and collect File objects (without reading contents)
async function collectFiles(entry, currentPath = "") {
    const fileObjects = [];
    if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
        fileObjects.push({ file, path: fullPath });
    } else if (entry.isDirectory) {
        // Skip descending into known junk directories entirely
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
            return [];
        }

        const dirReader = entry.createReader();
        const entries = [];
        let batch;
        do {
            batch = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
            entries.push(...batch);
        } while (batch.length > 0);

        const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        for (const childEntry of entries) {
            const childFiles = await collectFiles(childEntry, newPath);
            fileObjects.push(...childFiles);
        }
    }
    return fileObjects;
}

// Handles Drag and Drop dataTransfer items
export async function readDroppedFolder(items) {
    // Check if a single .zip file was dropped
    if (items.length === 1 && items[0].kind === 'file') {
        const file = items[0].getAsFile();
        if (file && file.name.endsWith('.zip')) {
            const buffer = await file.arrayBuffer();
            return { type: 'unzip', buffer, isLocalZip: true };
        }
    }

    const fileObjects = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
            const entryFiles = await collectFiles(entry);
            fileObjects.push(...entryFiles);
        }
    }
    return { type: 'local', files: fileObjects };
}

// Handles standard <input type="file" webkitdirectory> selection
export async function readInputFolder(fileList) {
    if (fileList.length === 1 && fileList[0].name.endsWith('.zip')) {
        const buffer = await fileList[0].arrayBuffer();
        return { type: 'unzip', buffer, isLocalZip: true };
    }
    
    const fileObjects = [];
    for (const file of fileList) {
        const path = file.webkitRelativePath || file.name;
        const parts = path.split("/");
        if (parts.some(p => IGNORED_DIRECTORY_NAMES.has(p))) {
            continue; // skip node_modules, .git, dist, etc. before content ever gets read
        }
        fileObjects.push({ file, path });
    }
    return { type: 'local', files: fileObjects };
}
