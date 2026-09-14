import { buildAsciiTree } from "./fileTree.js";

// Generates only the Directory Tree output
export function formatTree(files) {
    const activeFiles = files.filter(f => f.included && !f.isBinary);
    const paths = activeFiles.map(f => f.path);
    return buildAsciiTree(paths)
}


// Generates only the concatenated File Contents output
export function formatContent(files) {
    const activeFiles = files.filter(f => f.included && !f.isBinary);
    const parts = [];

    for (const file of activeFiles) {
        parts.push("================================================\n");
        parts.push(`File: ${file.path}\n`);
        parts.push("================================================\n");
        const contentMessage = file.content === "" ? "(empty file)" : (file.content || "(binary/failed to read)");
        parts.push(contentMessage);
        parts.push("\n\n");
    }

    return parts.join("");
}

export function formatPackage(files, includeTree = true) {
    const parts = [];

    if (includeTree) {
        parts.push("Directory structure:\n");
        parts.push(formatTree(files));
        parts.push("\n\n" + "=".repeat(48) + "\n\n");
    }

    parts.push(formatContent(files));
    return parts.join("");
}