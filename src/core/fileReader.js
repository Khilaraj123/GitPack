import { IGNORED_DIRECTORIES } from "../app/constants.js";


// ============================================================
// Path Helpers
// ============================================================

function normalizePath(filePath) {
    return String(filePath)
        .replaceAll("\\", "/")
        .replace(/^\/+/, "")
        .replace(/\/+/g, "/");
}

function isZipFile(file) {
    return file?.name?.toLowerCase().endsWith(".zip");
}

function isIgnoredDirectoryPath(filePath) {
    const parts = normalizePath(filePath)
        .split("/")
        .filter(Boolean);

    return parts.some(part =>
        IGNORED_DIRECTORIES.has(part)
    );
}


// ============================================================
// File System Entry Traversal
// ============================================================

async function getDirectoryEntries(directoryEntry) {
    const reader = directoryEntry.createReader();
    const entries = [];

    while (true) {
        const batch = await new Promise(
            (resolve, reject) => {
                reader.readEntries(resolve, reject);
            }
        );

        if (batch.length === 0) {
            break;
        }

        entries.push(...batch);
    }

    return entries;
}

async function getFileFromEntry(fileEntry) {
    return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
    });
}

async function collectFiles(entry, currentPath = "") {
    if (entry.isFile) {
        const file = await getFileFromEntry(entry);

        const path = normalizePath(
            currentPath
                ? `${currentPath}/${file.name}`
                : file.name
        );

        return [
            {
                file,
                path
            }
        ];
    }

    if (!entry.isDirectory) {
        return [];
    }

    // Do not even descend into ignored directories.
    if (IGNORED_DIRECTORIES.has(entry.name)) {
        return [];
    }

    const entries =
        await getDirectoryEntries(entry);

    const directoryPath = normalizePath(
        currentPath
            ? `${currentPath}/${entry.name}`
            : entry.name
    );

    const fileObjects = [];

    for (const childEntry of entries) {
        const childFiles =
            await collectFiles(
                childEntry,
                directoryPath
            );

        fileObjects.push(...childFiles);
    }

    return fileObjects;
}


// ============================================================
// Drag & Drop
// ============================================================

export async function readDroppedFolder(items) {
    if (!items || items.length === 0) {
        return {
            type: "local",
            files: []
        };
    }

    // Single ZIP file dropped.
    if (
        items.length === 1 &&
        items[0].kind === "file"
    ) {
        const file =
            items[0].getAsFile();

        if (file && isZipFile(file)) {
            return {
                type: "unzip",
                buffer: await file.arrayBuffer(),
                isLocalZip: true
            };
        }
    }

    const fileObjects = [];

    for (const item of items) {
        if (item.kind !== "file") {
            continue;
        }

        const entry =
            item.webkitGetAsEntry?.();

        if (!entry) {
            // Browser does not expose the FileSystemEntry API.
            // There is nothing useful we can recursively traverse.
            continue;
        }

        const files =
            await collectFiles(entry);

        fileObjects.push(...files);
    }

    return {
        type: "local",
        files: fileObjects
    };
}


// ============================================================
// <input type="file" webkitdirectory>
// ============================================================

export async function readInputFolder(fileList) {
    if (!fileList || fileList.length === 0) {
        return {
            type: "local",
            files: []
        };
    }

    const files =
        Array.from(fileList);

    // Single ZIP file selected.
    if (
        files.length === 1 &&
        isZipFile(files[0])
    ) {
        return {
            type: "unzip",
            buffer: await files[0].arrayBuffer(),
            isLocalZip: true
        };
    }

    const fileObjects = [];

    for (const file of files) {
        const path = normalizePath(
            file.webkitRelativePath ||
            file.name
        );

        // Skip files inside ignored directories
        // before sending them to the worker.
        if (isIgnoredDirectoryPath(path)) {
            continue;
        }

        fileObjects.push({
            file,
            path
        });
    }

    return {
        type: "local",
        files: fileObjects
    };
}