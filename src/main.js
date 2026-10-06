import { readDroppedFolder, readInputFolder } from "./core/fileReader.js";
import { applySmartFilter } from "./core/filters.js";
import { formatTree, formatContent, formatPackage } from "./core/formatter.js";
import { renderFileList } from "./ui/ui.js";
import {
    parseGithubUrl,
    fetchGithubRepo
} from "./core/githubFetcher.js";
import {
    createInitialState,
    setFiles,
    clearFiles,
    setSource,
    setProcessing,
    setProgress,
    setStatus,
    setActiveView,
    setActiveSourceTab,
    setExcludePattern
} from "./app/state.js";
import { renderApp } from "./ui/templates.js";

// ============================================================
// Application State
// ============================================================

const state = createInitialState();

const app = document.getElementById("app");

if (!app) {
    throw new Error("Application root #app was not found.");
}

app.innerHTML = renderApp();


// ============================================================
// Worker
// ============================================================

const worker = new Worker(
    new URL("./workers/file-worker.js", import.meta.url),
    { type: "module" }
);


/**
 * Send work to the file-processing worker.
 */
function processWithWorker(messageData, transferList = [], onProgress) {
    return new Promise((resolve, reject) => {

        const listener = (event) => {
            const data = event.data;

            if (data.type === "progress") {
                setProgress(state, data.done, data.total);

                if (onProgress) {
                    onProgress(data.done, data.total);
                }

                return;
            }

            if (data.type === "done") {
                worker.removeEventListener("message", listener);
                resolve(data.files);
                return;
            }

            if (data.type === "error") {
                worker.removeEventListener("message", listener);
                reject(new Error(data.error));
            }
        };

        worker.addEventListener("message", listener);

        worker.postMessage(
            messageData,
            transferList
        );
    });
}


// ============================================================
// DOM References
// ============================================================

const dropZone = document.getElementById("drop-zone");
const dropOverlay = document.getElementById("drop-overlay");

const folderInput = document.getElementById("folder-input");

const fileListContainer = document.getElementById("file-list");

const outputPreview = document.getElementById("output-preview");
const asciiTreePreview = document.getElementById("ascii-tree-preview");

const excludeInput = document.getElementById("exclude-input");

if (excludeInput) {
    state.excludePattern = excludeInput.value.trim();
    setExcludePattern(state, state.excludePattern);
}

const copyBtn = document.getElementById("copy-btn");
const copyTreeBtn = document.getElementById("copy-tree-btn");
const downloadBtn = document.getElementById("download-btn");

const statFiles = document.getElementById("stat-files");
const statIncluded = document.getElementById("stat-included");

const githubFetchBtn = document.getElementById("github-fetch-btn");
const githubUrlInput = document.getElementById("github-url-input");
const githubTokenInput = document.getElementById("github-token-input");

const loadingStatus = document.getElementById("loading-status");
const loadingText = document.getElementById("loading-text");


// ============================================================
// Application Helpers
// ============================================================

/**
 * Update the loading UI.
 */
function showLoading(message) {
    setProcessing(state, true);

    loadingStatus.classList.remove("hidden");
    loadingText.textContent = message;
}


/**
 * Hide the loading UI.
 */
function hideLoading() {
    setProcessing(state, false);

    loadingStatus.classList.add("hidden");
}


/**
 * Update the loading message.
 */
function updateLoading(message) {
    loadingText.textContent = message;
}


/**
 * Process the final file list and update application state.
 */
function handleLoadedFiles(rawFiles, source) {
    if (!rawFiles || rawFiles.length === 0) {
        clearFiles(state);

        updateOutput();

        setStatus(
            state,
            "warning",
            "No files were found."
        );

        return;
    }

    const filteredFiles = applySmartFilter(
        rawFiles,
        state.excludePattern
    );

    setFiles(state, filteredFiles);
    setSource(state, source);

    setStatus(
        state,
        "success",
        `${filteredFiles.length} files loaded.`
    );

    renderFiles();
    updateOutput();
}


/**
 * Render the current files into the file list.
 */
function renderFiles() {
    renderFileList(
        state.files,
        fileListContainer,
        updateOutput
    );
}


/**
 * Recalculate tree, content and statistics.
 */
function updateOutput() {
    const files = state.files;

    const activeFiles = files.filter(
        file => file.included && !file.isBinary && !file.isTooLarge
    );

    // --------------------------------------------------------
    // Statistics
    // --------------------------------------------------------

    statFiles.textContent = files.length;
    statIncluded.textContent = activeFiles.length;


    // --------------------------------------------------------
    // ASCII Tree
    // --------------------------------------------------------

    const treeText = formatTree(files);

    asciiTreePreview.textContent =
        treeText || "No Active Files";


    // --------------------------------------------------------
    // File Content & LLM Digest
    // --------------------------------------------------------

    const contentText = formatPackage(files, true);

    outputPreview.value = contentText;


    // --------------------------------------------------------
    // Action Buttons
    // --------------------------------------------------------

    const hasContent = contentText.trim().length > 0;
    const hasTree = treeText.trim().length > 0;

    copyBtn.disabled = !hasContent;
    copyTreeBtn.disabled = !hasTree;
    downloadBtn.disabled = !hasContent;
}


/**
 * Run worker processing and handle common loading state.
 */
async function processMessage(
    messageData,
    transferList,
    source,
    initialMessage,
    progressMessage
) {
    showLoading(initialMessage);

    try {
        const files = await processWithWorker(
            messageData,
            transferList,
            (done, total) => {
                updateLoading(
                    `${progressMessage} (${done}/${total})...`
                );
            }
        );

        handleLoadedFiles(files, source);

    } catch (error) {
        console.error(error);

        setStatus(
            state,
            "error",
            error.message
        );

        alert(error.message);

    } finally {
        hideLoading();
    }
}


// ============================================================
// GitHub
// ============================================================

githubFetchBtn.addEventListener(
    "click",
    handleGithubFetch
);


githubUrlInput.addEventListener(
    "keypress",
    event => {
        if (event.key === "Enter") {
            handleGithubFetch();
        }
    }
);


async function handleGithubFetch() {
    const parsed = parseGithubUrl(
        githubUrlInput.value
    );

    if (!parsed) {
        alert(
            "Please enter a valid GitHub repository URL " +
            "(e.g. https://github.com/owner/repo)"
        );

        return;
    }

    githubFetchBtn.disabled = true;

    showLoading(
        `Connecting to GitHub for ${parsed.owner}/${parsed.repo}...`
    );

    try {
        const fetchData = await fetchGithubRepo(
            parsed.owner,
            parsed.repo,
            parsed.branch,
            parsed.subpath,
            githubTokenInput.value.trim()
        );

        updateLoading(
            "Fetching file contents..."
        );

        const files = await processWithWorker(
            fetchData,
            [],
            (done, total) => {
                updateLoading(
                    `Processing files (${done}/${total})...`
                );
            }
        );

        handleLoadedFiles(
            files,
            "github"
        );

    } catch (error) {
        console.error(error);

        setStatus(
            state,
            "error",
            error.message
        );

        alert(
            `Error fetching GitHub repo: ${error.message}`
        );

    } finally {
        githubFetchBtn.disabled = false;
        hideLoading();

        // Don't leave the PAT sitting in the input
        // after the request has completed.
        githubTokenInput.value = "";
    }
}


// ============================================================
// Local Folder Input
// ============================================================

folderInput.addEventListener(
    "change",
    handleFolderInput
);


async function handleFolderInput(event) {
    const files = event.target.files;

    if (!files || files.length === 0) {
        return;
    }

    githubFetchBtn.disabled = true;

    try {
        const messageData = await readInputFolder(files);

        const transferList = messageData.buffer
            ? [messageData.buffer]
            : [];

        await processMessage(
            messageData,
            transferList,
            "local",
            "Processing local files...",
            "Reading files"
        );

    } finally {
        githubFetchBtn.disabled = false;

        // Allow selecting the same folder again.
        event.target.value = "";
    }
}


// ============================================================
// Drag & Drop
// ============================================================

let dragCounter = 0;


window.addEventListener(
    "dragenter",
    event => {
        event.preventDefault();

        dragCounter++;

        dropOverlay.classList.remove("hidden");
    }
);


window.addEventListener(
    "dragover",
    event => {
        event.preventDefault();
    }
);


window.addEventListener(
    "dragleave",
    event => {
        event.preventDefault();

        dragCounter--;

        if (dragCounter <= 0) {
            dragCounter = 0;

            dropOverlay.classList.add("hidden");
        }
    }
);


/**
 * Handle the drop on the window rather than the overlay.
 *
 * This avoids the pointer-events problem caused by
 * .drop-overlay { pointer-events: none; }.
 */
window.addEventListener(
    "drop",
    handleDrop
);


async function handleDrop(event) {
    event.preventDefault();

    dragCounter = 0;

    dropOverlay.classList.add("hidden");

    const items = event.dataTransfer?.items;

    if (!items || items.length === 0) {
        return;
    }

    githubFetchBtn.disabled = true;

    try {
        const messageData = await readDroppedFolder(
            items
        );

        const transferList = messageData.buffer
            ? [messageData.buffer]
            : [];

        await processMessage(
            messageData,
            transferList,
            "drop",
            "Processing dropped files...",
            "Reading files"
        );

    } finally {
        githubFetchBtn.disabled = false;
    }
}


// ============================================================
// Filtering
// ============================================================

let filterTimeout;


excludeInput.addEventListener(
    "input",
    handleExcludeInput
);


function handleExcludeInput() {
    clearTimeout(filterTimeout);

    filterTimeout = setTimeout(() => {

        state.excludePattern = excludeInput.value;

        setExcludePattern(
            state,
            excludeInput.value
        );

        if (state.files.length === 0) {
            return;
        }

        const filteredFiles = applySmartFilter(
            state.files,
            state.excludePattern
        );

        setFiles(
            state,
            filteredFiles
        );

        renderFiles();
        updateOutput();

    }, 300);
}


// ============================================================
// View Tabs
// ============================================================

document
    .querySelectorAll(".tab-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".tab-btn")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                document
                    .querySelectorAll(".tab-content")
                    .forEach(content =>
                        content.classList.remove("active")
                    );

                button.classList.add("active");

                const targetId =
                    button.dataset.view;

                setActiveView(state, targetId);

                const targetView =
                    document.getElementById(targetId) ||
                    document.getElementById(
                        `${targetId}-view`
                    );

                if (targetView) {
                    targetView.classList.add("active");
                }

                if (targetId === "file-list-view" && fileListContainer._renderVisible) {
                    fileListContainer._renderVisible();
                }
            }
        );
    });


// ============================================================
// Source Tabs
// ============================================================

document
    .querySelectorAll(".source-tab")
    .forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".source-tab")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                document
                    .querySelectorAll(".input-pane")
                    .forEach(pane =>
                        pane.classList.remove("active")
                    );

                tab.classList.add("active");

                const targetId = tab.dataset.target;
                setActiveSourceTab(state, targetId);

                const target =
                    document.getElementById(
                        targetId
                    );

                if (target) {
                    target.classList.add("active");
                }
            }
        );
    });


// ============================================================
// Example Repository Buttons
// ============================================================

document
    .querySelectorAll(".pill-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const githubTab =
                    document.querySelector(
                        ".source-tab[data-target='github-source']"
                    );

                githubTab?.click();

                githubUrlInput.value =
                    button.dataset.repo;

                handleGithubFetch();
            }
        );
    });


// ============================================================
// Clipboard
// ============================================================

async function copyToClipboard(text, button) {
    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(text);

        } else {

            const textArea =
                document.createElement("textarea");

            textArea.value = text;

            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";

            document.body.appendChild(textArea);

            textArea.select();

            document.execCommand("copy");

            document.body.removeChild(textArea);
        }

        const originalText =
            button.textContent;

        button.textContent = "📋 Copied!";

        setTimeout(
            () => {
                button.textContent = originalText;
            },
            2000
        );

    } catch (error) {

        console.error(
            "Failed to copy",
            error
        );
    }
}


copyBtn.addEventListener(
    "click",
    () => copyToClipboard(
        outputPreview.value,
        copyBtn
    )
);


copyTreeBtn.addEventListener(
    "click",
    () => copyToClipboard(
        asciiTreePreview.textContent,
        copyTreeBtn
    )
);


// ============================================================
// Download
// ============================================================

downloadBtn.addEventListener(
    "click",
    downloadOutput
);


function downloadOutput() {
    const blob = new Blob(
        [outputPreview.value],
        {
            type: "text/plain;charset=utf-8"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href = url;
    anchor.download = "gitpack-contents.txt";

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    setTimeout(
        () => URL.revokeObjectURL(url),
        100
    );
}


// ============================================================
// Initial UI State & URL Routing
// ============================================================

updateOutput();

function checkUrlParameters() {
    try {
        const params = new URLSearchParams(window.location.search);
        const repoParam = params.get("repo") || params.get("url");

        if (repoParam) {
            const githubTab = document.querySelector(
                ".source-tab[data-target='github-source']"
            );
            githubTab?.click();

            githubUrlInput.value = repoParam;
            handleGithubFetch();
        }
    } catch (e) {
        console.warn("Could not parse URL query parameters:", e);
    }
}

checkUrlParameters();