import * as fflate from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js';
import { IGNORED_DIRECTORY_NAMES } from './filters.js';

async function readFileContent(file) {
    try {
        const buffer = await file.slice(0, 1000).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        let nonPrintable = 0;
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
                nonPrintable++;
            }
        }
        
        if (bytes.length > 0 && (nonPrintable / bytes.length > 0.1)) {
            return null;
        }
        return await file.text();
    } catch (error) {
        return null;
    }
}

self.addEventListener('message', async (e) => {
    const { type } = e.data;

    if (type === 'local') {
        const { files } = e.data;
        const results = [];
        const CONCURRENCY = 25;
        const MAX_SIZE = 1000000; // 1MB size guard

        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const chunk = files.slice(i, i + CONCURRENCY);
            const chunkResults = await Promise.all(chunk.map(async ({ file, path }) => {
                if (file.size > MAX_SIZE) {
                    return {
                        path,
                        name: file.name,
                        size: file.size,
                        content: null,
                        isBinary: true
                    };
                }

                const content = await readFileContent(file);
                const isBinary = content === null;
                return {
                    path,
                    name: file.name,
                    size: file.size,
                    content: isBinary ? null : content,
                    isBinary
                };
            }));

            results.push(...chunkResults);
            self.postMessage({ type: 'progress', done: Math.min(i + CONCURRENCY, files.length), total: files.length });
        }

        self.postMessage({ type: 'progress', done: files.length, total: files.length });
        self.postMessage({ type: 'done', files: results });
    
    } else if (type === 'unzip') {
        const { buffer, subpath } = e.data;
        const u8 = new Uint8Array(buffer);
        
        fflate.unzip(u8, (err, unzipped) => {
            if (err) {
                self.postMessage({ type: 'error', error: err.message });
                return;
            }
            
            const results = [];
            const entries = Object.keys(unzipped);
            let done = 0;
            const total = entries.length;

            for (const rawPath of entries) {
                done++;
                const fileData = unzipped[rawPath];
                
                // Skip directories (fflate represents them as zero-length files ending in '/')
                if (fileData.length === 0 && rawPath.endsWith('/')) {
                     if (done % 100 === 0) self.postMessage({ type: 'progress', done, total });
                     continue;
                }

                // The archive includes a root folder e.g. "repo-branch/". We should strip it.
                const parts = rawPath.split('/');
                parts.shift(); // remove root folder
                const path = parts.join('/');
                
                if (!path) {
                    if (done % 100 === 0) self.postMessage({ type: 'progress', done, total });
                    continue;
                }

                // Apply subpath filter if present
                if (subpath) {
                    if (!(path.startsWith(subpath + "/") || path === subpath)) {
                         if (done % 100 === 0) self.postMessage({ type: 'progress', done, total });
                         continue;
                    }
                }

                // Skip ignored directories early before binary checking or decoding
                if (parts.some(p => IGNORED_DIRECTORY_NAMES.has(p))) {
                    if (done % 100 === 0) self.postMessage({ type: 'progress', done, total });
                    continue;
                }

                const size = fileData.length;
                const name = parts[parts.length - 1];

                // Binary check
                let isBinary = false;
                const MAX_SIZE = 1000000;
                
                if (size > MAX_SIZE) {
                    isBinary = true;
                } else {
                    let nonPrintable = 0;
                    const checkLen = Math.min(size, 1000);
                    for (let i = 0; i < checkLen; i++) {
                        const b = fileData[i];
                        if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
                            nonPrintable++;
                        }
                    }
                    if (checkLen > 0 && (nonPrintable / checkLen > 0.1)) {
                        isBinary = true;
                    }
                }

                let content = "";
                if (!isBinary) {
                    try {
                        content = new TextDecoder("utf-8").decode(fileData);
                    } catch (e) {
                        isBinary = true;
                        content = null;
                    }
                } else {
                    content = null;
                }

                results.push({
                    path,
                    name,
                    size,
                    content: isBinary ? null : content,
                    isBinary
                });

                if (done % 100 === 0) {
                    self.postMessage({ type: 'progress', done, total });
                }
            }
            
            self.postMessage({ type: 'progress', done: total, total });
            self.postMessage({ type: 'done', files: results });
        });
    } else if (type === 'github-fetch') {
        const { owner, repo, branch, files, token } = e.data;

        let results;
        if (token) {
            try {
                results = await fetchWithGraphQL(owner, repo, branch, files, token);
            } catch (err) {
                console.warn('GraphQL batching failed, falling back to raw CDN:', err);
                results = await fetchWithRawCDN(owner, repo, branch, files, token);
            }
        } else {
            results = await fetchWithRawCDN(owner, repo, branch, files, token);
        }

        self.postMessage({ type: 'progress', done: files.length, total: files.length });
        self.postMessage({ type: 'done', files: results });
    }
});

// Helper for raw CDN fetching with concurrency = 40
async function fetchWithRawCDN(owner, repo, branch, files, token, onProgressIncrement) {
    const results = new Array(files.length);
    let index = 0;
    let completed = 0;
    const batchSize = 40; // Quick win: bumped from 10 to 40 concurrency
    const MAX_SIZE = 1000000;
    const headers = token ? { 'Authorization': `token ${token}` } : {};

    async function worker() {
        while (index < files.length) {
            const currentIndex = index++;
            const item = files[currentIndex];

            if (item.size > MAX_SIZE) {
                results[currentIndex] = {
                    path: item.path,
                    name: item.path.split("/").pop(),
                    content: null,
                    isBinary: true,
                    size: item.size || 0
                };
                completed++;
                if (onProgressIncrement) {
                    onProgressIncrement(1);
                } else if (completed % 10 === 0 || completed === files.length) {
                    self.postMessage({ type: 'progress', done: completed, total: files.length });
                }
                continue;
            }

            const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;

            try {
                const res = await fetch(fileUrl, { headers });
                const content = res.ok ? await res.text() : null;
                const isBinary = content === null;
                results[currentIndex] = {
                    path: item.path,
                    name: item.path.split("/").pop(),
                    content: isBinary ? null : content,
                    isBinary,
                    size: item.size || 0
                };
            } catch (err) {
                results[currentIndex] = {
                    path: item.path,
                    name: item.path.split("/").pop(),
                    content: null,
                    isBinary: true,
                    size: item.size || 0
                };
            }

            completed++;
            if (onProgressIncrement) {
                onProgressIncrement(1);
            } else if (completed % 10 === 0 || completed === files.length) {
                self.postMessage({ type: 'progress', done: completed, total: files.length });
            }
        }
    }

    const workers = Array.from({ length: Math.min(batchSize, files.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

// Helper for batched GraphQL fetching (up to 50 files per single HTTP request)
async function fetchWithGraphQL(owner, repo, branch, files, token) {
    const GQL_BATCH_SIZE = 50;
    const results = new Array(files.length);
    let loadedCount = 0;
    const fallbackList = []; // Array of { file, originalIndex }

    for (let i = 0; i < files.length; i += GQL_BATCH_SIZE) {
        const chunk = files.slice(i, i + GQL_BATCH_SIZE);

        const queryFields = chunk.map((item, idx) => {
            const expression = `${branch}:${item.path}`;
            return `f${idx}: object(expression: ${JSON.stringify(expression)}) { ... on Blob { text isBinary byteSize } }`;
        }).join('\n');

        const query = `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${queryFields} } }`;

        let success = false;
        try {
            const res = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            if (res.ok) {
                const json = await res.json();
                const repoData = json.data?.repository;
                if (repoData) {
                    success = true;
                    for (let idx = 0; idx < chunk.length; idx++) {
                        const item = chunk[idx];
                        const globalIdx = i + idx;
                        const blob = repoData[`f${idx}`];

                        if (!blob) {
                            fallbackList.push({ file: item, originalIndex: globalIdx });
                        } else if (blob.isBinary) {
                            results[globalIdx] = {
                                path: item.path,
                                name: item.path.split("/").pop(),
                                content: null,
                                isBinary: true,
                                size: blob.byteSize || item.size || 0
                            };
                            loadedCount++;
                        } else if (blob.text !== null && blob.text !== undefined) {
                            results[globalIdx] = {
                                path: item.path,
                                name: item.path.split("/").pop(),
                                content: blob.text,
                                isBinary: false,
                                size: blob.byteSize || item.size || 0
                            };
                            loadedCount++;
                        } else {
                            fallbackList.push({ file: item, originalIndex: globalIdx });
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`GraphQL chunk ${i} failed`, err);
        }

        if (!success) {
            for (let idx = 0; idx < chunk.length; idx++) {
                fallbackList.push({ file: chunk[idx], originalIndex: i + idx });
            }
        }

        self.postMessage({ type: 'progress', done: loadedCount, total: files.length });
    }

    if (fallbackList.length > 0) {
        const rawFiles = fallbackList.map(entry => entry.file);
        const rawResults = await fetchWithRawCDN(owner, repo, branch, rawFiles, token, () => {
            loadedCount++;
            self.postMessage({ type: 'progress', done: loadedCount, total: files.length });
        });

        for (let j = 0; j < fallbackList.length; j++) {
            results[fallbackList[j].originalIndex] = rawResults[j];
        }
    }

    return results;
}
