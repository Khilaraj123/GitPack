import * as fflate from "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js";

const MAX_FILE_SIZE = 1_000_000; // 1 MB
const BINARY_SAMPLE_SIZE = 4_096;

const LOCAL_CONCURRENCY = 10;
const RAW_GITHUB_CONCURRENCY = 10;
const GRAPHQL_BATCH_SIZE = 50;


// ============================================================
// Generic Helpers
// ============================================================

function postProgress(done, total) {
    self.postMessage({
        type: "progress",
        done,
        total
    });
}


function postDone(files) {
    self.postMessage({
        type: "done",
        files
    });
}


function postError(error) {
    self.postMessage({
        type: "error",
        error: error instanceof Error
            ? error.message
            : String(error)
    });
}


/**
 * Normalize a relative file path.
 *
 * Prevents:
 *   ../foo
 *   /foo
 *   foo/../bar
 */
function normalizePath(filePath) {
    const parts = String(filePath)
        .replaceAll("\\", "/")
        .split("/");

    const result = [];

    for (const part of parts) {
        if (!part || part === ".") {
            continue;
        }

        if (part === "..") {
            result.pop();
            continue;
        }

        result.push(part);
    }

    return result.join("/");
}


/**
 * Get the file name from a path.
 */
function getFileName(filePath) {
    const normalized = normalizePath(filePath);

    return normalized.split("/").pop() || "";
}


/**
 * Determine whether bytes look like binary data.
 *
 * We use strict UTF-8 decoding rather than simply counting
 * control characters.
 */
function isBinaryBytes(bytes) {
    if (!bytes || bytes.length === 0) {
        return false;
    }

    const sample = bytes.slice(
        0,
        BINARY_SAMPLE_SIZE
    );

    try {
        new TextDecoder("utf-8", {
            fatal: true
        }).decode(sample);

        return false;

    } catch {
        return true;
    }
}


/**
 * Decode UTF-8 text.
 */
function decodeText(bytes) {
    return new TextDecoder("utf-8", {
        fatal: true
    }).decode(bytes);
}


// ============================================================
// Local Files
// ============================================================

async function readLocalFile(file, path) {

    if (file.size > MAX_FILE_SIZE) {
        return {
            path,
            name: file.name,
            size: file.size,
            content: null,
            isBinary: false,
            isTooLarge: true
        };
    }

    try {
        const buffer =
            await file.arrayBuffer();

        const bytes =
            new Uint8Array(buffer);

        const binary =
            isBinaryBytes(bytes);

        if (binary) {
            return {
                path,
                name: file.name,
                size: file.size,
                content: null,
                isBinary: true,
                isTooLarge: false
            };
        }

        return {
            path,
            name: file.name,
            size: file.size,
            content: decodeText(bytes),
            isBinary: false,
            isTooLarge: false
        };

    } catch {
        return {
            path,
            name: file.name,
            size: file.size,
            content: null,
            isBinary: true,
            isTooLarge: false
        };
    }
}


async function processLocalFiles(files) {

    const results = new Array(files.length);

    let nextIndex = 0;
    let completed = 0;


    async function worker() {

        while (true) {

            const index = nextIndex++;

            if (index >= files.length) {
                return;
            }

            const item = files[index];

            results[index] =
                await readLocalFile(
                    item.file,
                    item.path
                );

            completed++;

            postProgress(
                completed,
                files.length
            );
        }
    }


    const workerCount = Math.min(
        LOCAL_CONCURRENCY,
        files.length
    );

    await Promise.all(
        Array.from(
            { length: workerCount },
            worker
        )
    );

    return results;
}


// ============================================================
// ZIP
// ============================================================

function getCommonZipRoot(paths) {

    const filePaths = paths
        .map(normalizePath)
        .filter(Boolean);

    if (filePaths.length === 0) {
        return null;
    }

    const firstParts =
        filePaths[0].split("/");

    if (firstParts.length < 2) {
        return null;
    }

    const candidateRoot =
        firstParts[0];

    const allShareRoot =
        filePaths.every(path => {
            const parts = path.split("/");

            return (
                parts.length >= 2 &&
                parts[0] === candidateRoot
            );
        });

    return allShareRoot
        ? candidateRoot
        : null;
}


function removeZipRoot(path, root) {

    const normalized =
        normalizePath(path);

    if (!root) {
        return normalized;
    }

    if (normalized === root) {
        return "";
    }

    const prefix = `${root}/`;

    if (normalized.startsWith(prefix)) {
        return normalized.slice(
            prefix.length
        );
    }

    return normalized;
}


function isIgnoredDirectory(path) {

    const ignoredDirectories = new Set([
        ".git",
        ".svn",
        ".hg",

        ".idea",
        ".vscode",
        ".vs",

        "node_modules",

        "dist",
        "build",
        "out",
        "bin",
        "obj",

        "coverage",

        ".next",
        ".nuxt",
        ".svelte-kit",
        ".astro",

        "__pycache__",
        ".pytest_cache",

        ".dart_tool",

        "Pods",
        "Carthage",
        "DerivedData",

        ".gradle",
        "target",

        "vendor",

        ".terraform",
        ".serverless",
        ".aws-sam"
    ]);

    const parts =
        normalizePath(path)
            .split("/")
            .filter(Boolean);

    return parts.some(
        part => ignoredDirectories.has(part)
    );
}


function processZip(buffer, subpath = "") {

    return new Promise((resolve, reject) => {

        const bytes =
            new Uint8Array(buffer);

        fflate.unzip(
            bytes,
            (error, unzipped) => {

                if (error) {
                    reject(error);
                    return;
                }

                try {

                    const entries =
                        Object.keys(unzipped);

                    const commonRoot =
                        getCommonZipRoot(entries);

                    const normalizedSubpath =
                        normalizePath(subpath);

                    const results = [];

                    let completed = 0;
                    const total = entries.length;


                    for (const rawPath of entries) {

                        completed++;

                        // ZIP directory
                        if (
                            rawPath.endsWith("/")
                        ) {
                            postProgress(
                                completed,
                                total
                            );

                            continue;
                        }


                        let path =
                            removeZipRoot(
                                rawPath,
                                commonRoot
                            );

                        path =
                            normalizePath(path);


                        if (!path) {
                            postProgress(
                                completed,
                                total
                            );

                            continue;
                        }


                        // User requested a subpath
                        if (normalizedSubpath) {

                            const matches =
                                path === normalizedSubpath ||
                                path.startsWith(
                                    `${normalizedSubpath}/`
                                );

                            if (!matches) {
                                postProgress(
                                    completed,
                                    total
                                );

                                continue;
                            }
                        }


                        // Skip generated directories
                        if (
                            isIgnoredDirectory(path)
                        ) {
                            postProgress(
                                completed,
                                total
                            );

                            continue;
                        }


                        const fileData =
                            unzipped[rawPath];

                        const size =
                            fileData.length;

                        const name =
                            getFileName(path);


                        if (size > MAX_FILE_SIZE) {

                            results.push({
                                path,
                                name,
                                size,
                                content: null,
                                isBinary: false,
                                isTooLarge: true
                            });

                            postProgress(
                                completed,
                                total
                            );

                            continue;
                        }


                        const binary =
                            isBinaryBytes(fileData);


                        if (binary) {

                            results.push({
                                path,
                                name,
                                size,
                                content: null,
                                isBinary: true,
                                isTooLarge: false
                            });

                        } else {

                            let content = null;

                            try {
                                content =
                                    decodeText(fileData);

                            } catch {
                                results.push({
                                    path,
                                    name,
                                    size,
                                    content: null,
                                    isBinary: true,
                                    isTooLarge: false
                                });

                                postProgress(
                                    completed,
                                    total
                                );

                                continue;
                            }

                            results.push({
                                path,
                                name,
                                size,
                                content,
                                isBinary: false,
                                isTooLarge: false
                            });
                        }


                        postProgress(
                            completed,
                            total
                        );
                    }


                    resolve(results);

                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}


// ============================================================
// GitHub Raw CDN
// ============================================================

async function fetchRawFile(
    owner,
    repo,
    branch,
    item,
    token
) {

    const path =
        normalizePath(item.path);

    const name =
        getFileName(path);

    const size =
        item.size || 0;


    if (size > MAX_FILE_SIZE) {

        return {
            path,
            name,
            size,
            content: null,
            isBinary: false,
            isTooLarge: true
        };
    }


    const fileUrl =
        `https://raw.githubusercontent.com/` +
        `${owner}/${repo}/${branch}/${path}`;


    const headers = token
        ? {
            Authorization: `Bearer ${token}`
        }
        : {};


    try {

        const response =
            await fetch(
                fileUrl,
                { headers }
            );


        if (!response.ok) {

            return {
                path,
                name,
                size,
                content: null,
                isBinary: true,
                isTooLarge: false,
                fetchError: `HTTP ${response.status}`
            };
        }


        const buffer =
            await response.arrayBuffer();

        const bytes =
            new Uint8Array(buffer);


        if (bytes.length > MAX_FILE_SIZE) {

            return {
                path,
                name,
                size: bytes.length,
                content: null,
                isBinary: false,
                isTooLarge: true
            };
        }


        const binary =
            isBinaryBytes(bytes);


        if (binary) {

            return {
                path,
                name,
                size: bytes.length,
                content: null,
                isBinary: true,
                isTooLarge: false
            };
        }


        return {
            path,
            name,
            size: bytes.length,
            content: decodeText(bytes),
            isBinary: false,
            isTooLarge: false
        };

    } catch (error) {

        return {
            path,
            name,
            size,
            content: null,
            isBinary: true,
            isTooLarge: false,
            fetchError: error.message
        };
    }
}


async function fetchWithRawCDN(
    owner,
    repo,
    branch,
    files,
    token
) {

    const results =
        new Array(files.length);

    let nextIndex = 0;
    let completed = 0;


    async function worker() {

        while (true) {

            const index = nextIndex++;

            if (index >= files.length) {
                return;
            }


            results[index] =
                await fetchRawFile(
                    owner,
                    repo,
                    branch,
                    files[index],
                    token
                );


            completed++;

            postProgress(
                completed,
                files.length
            );
        }
    }


    const workerCount =
        Math.min(
            RAW_GITHUB_CONCURRENCY,
            files.length
        );


    await Promise.all(
        Array.from(
            { length: workerCount },
            worker
        )
    );


    return results;
}


// ============================================================
// GitHub GraphQL
// ============================================================

async function fetchWithGraphQL(
    owner,
    repo,
    branch,
    files,
    token
) {

    const results =
        new Array(files.length);

    const fallbackList = [];

    let completed = 0;


    for (
        let start = 0;
        start < files.length;
        start += GRAPHQL_BATCH_SIZE
    ) {

        const chunk =
            files.slice(
                start,
                start + GRAPHQL_BATCH_SIZE
            );


        const queryFields =
            chunk.map(
                (item, index) => {

                    const expression =
                        `${branch}:${item.path}`;

                    return `
                        f${index}: object(
                            expression: ${JSON.stringify(expression)}
                        ) {
                            ... on Blob {
                                text
                                isBinary
                                byteSize
                            }
                        }
                    `;
                }
            ).join("\n");


        const query = `
            query {
                repository(
                    owner: ${JSON.stringify(owner)}
                    name: ${JSON.stringify(repo)}
                ) {
                    ${queryFields}
                }
            }
        `;


        try {

            const response =
                await fetch(
                    "https://api.github.com/graphql",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            query
                        })
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `GitHub GraphQL HTTP ${response.status}`
                );
            }


            const json =
                await response.json();


            if (
                json.errors &&
                json.errors.length > 0
            ) {
                throw new Error(
                    json.errors
                        .map(error => error.message)
                        .join("; ")
                );
            }


            const repository =
                json.data?.repository;


            if (!repository) {
                throw new Error(
                    "GitHub repository data was not returned."
                );
            }


            for (
                let index = 0;
                index < chunk.length;
                index++
            ) {

                const item =
                    chunk[index];

                const globalIndex =
                    start + index;

                const blob =
                    repository[`f${index}`];


                if (!blob) {

                    fallbackList.push({
                        file: item,
                        originalIndex: globalIndex
                    });

                    continue;
                }


                if (blob.isBinary) {

                    results[globalIndex] = {
                        path: item.path,
                        name: getFileName(item.path),
                        size:
                            blob.byteSize ||
                            item.size ||
                            0,
                        content: null,
                        isBinary: true,
                        isTooLarge: false
                    };

                } else {

                    results[globalIndex] = {
                        path: item.path,
                        name: getFileName(item.path),
                        size:
                            blob.byteSize ||
                            item.size ||
                            0,
                        content:
                            blob.text ?? "",
                        isBinary: false,
                        isTooLarge: false
                    };
                }


                completed++;

                postProgress(
                    completed,
                    files.length
                );
            }


        } catch (error) {

            console.warn(
                "GraphQL batch failed:",
                error
            );


            for (
                let index = 0;
                index < chunk.length;
                index++
            ) {

                fallbackList.push({
                    file: chunk[index],
                    originalIndex: start + index
                });
            }
        }
    }


    // Fetch GraphQL failures using raw CDN.
    if (fallbackList.length > 0) {

        const rawFiles =
            fallbackList.map(
                entry => entry.file
            );


        const rawResults =
            await fetchWithRawCDN(
                owner,
                repo,
                branch,
                rawFiles,
                token
            );


        for (
            let index = 0;
            index < fallbackList.length;
            index++
        ) {

            const originalIndex =
                fallbackList[index].originalIndex;

            results[originalIndex] =
                rawResults[index];
        }
    }


    return results;
}


// ============================================================
// Message Handler
// ============================================================

self.addEventListener(
    "message",
    async event => {

        const {
            type
        } = event.data;


        try {

            if (type === "local") {

                const files =
                    await processLocalFiles(
                        event.data.files
                    );

                postDone(files);

                return;
            }


            if (type === "unzip") {

                const files =
                    await processZip(
                        event.data.buffer,
                        event.data.subpath
                    );

                postDone(files);

                return;
            }


            if (type === "github-fetch") {

                const {
                    owner,
                    repo,
                    branch,
                    files,
                    token
                } = event.data;


                let results;


                if (token) {

                    try {

                        results =
                            await fetchWithGraphQL(
                                owner,
                                repo,
                                branch,
                                files,
                                token
                            );

                    } catch (error) {

                        console.warn(
                            "GraphQL failed. " +
                            "Falling back to raw CDN.",
                            error
                        );

                        results =
                            await fetchWithRawCDN(
                                owner,
                                repo,
                                branch,
                                files,
                                token
                            );
                    }

                } else {

                    results =
                        await fetchWithRawCDN(
                            owner,
                            repo,
                            branch,
                            files,
                            token
                        );
                }


                postDone(results);

                return;
            }


            throw new Error(
                `Unknown worker operation: ${type}`
            );

        } catch (error) {

            console.error(
                "Worker error:",
                error
            );

            postError(error);
        }
    }
);