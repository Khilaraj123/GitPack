import { readDroppedFolder, readInputFolder } from "./fileReader.js";
import { applySmartFilter } from "./filters.js";
import { formatTree, formatContent } from "./formatter.js";
import { renderFileList } from "./ui.js";
import { parseGithubUrl, fetchGithubRepo } from "./githubFetcher.js";


//state
let loadedFiles = [];

// Worker Initialization
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

function processWithWorker(messageData, transferList, onProgress) {
    return new Promise((resolve, reject) => {
        const listener = (e) => {
            if (e.data.type === 'progress') {
                if (onProgress) onProgress(e.data.done, e.data.total);
            } else if (e.data.type === 'done') {
                worker.removeEventListener('message', listener);
                resolve(e.data.files);
            } else if (e.data.type === 'error') {
                worker.removeEventListener('message', listener);
                reject(new Error(e.data.error));
            }
        };
        worker.addEventListener('message', listener);
        worker.postMessage(messageData, transferList);
    });
}

// DOM References
const dropZone = document.getElementById("drop-zone");
const folderInput = document.getElementById("folder-input");
const fileListContainer = document.getElementById("file-list");
const outputPreview = document.getElementById("output-preview");
const asciiTreePreview = document.getElementById("ascii-tree-preview");
const excludeInput = document.getElementById("exclude-input");
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
const dropOverlay = document.getElementById("drop-overlay");


// Handle GitHub Repositories
githubFetchBtn.addEventListener("click", handleGithubFetch);
githubUrlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleGithubFetch();
});

function handleGithubFetch() {
    const parsed = parseGithubUrl(githubUrlInput.value);

    if (!parsed) {
        alert("Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)");
        return;
    }

    // Show loading state
    githubFetchBtn.disabled = true;
    loadingStatus.classList.remove("hidden");
    loadingText.textContent = `Connecting to GitHub for ${parsed.owner}/${parsed.repo}...`;

    fetchGithubRepo(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        parsed.subpath,
        githubTokenInput.value.trim()
    )
    .then(fetchData => {
        loadingText.textContent = `Fetching file contents...`;
        return processWithWorker(
            fetchData,
            [],
            (done, total) => {
                loadingText.textContent = `Processing files (${done}/${total})...`;
            }
        );
    })
    .then(files => {
        handleLoadedFiles(files);
    })
    .catch(err => {
        alert(`Error fetching GitHub repo: ${err.message}`);
    })
    .finally(() => {
        githubFetchBtn.disabled = false;
        loadingStatus.classList.add("hidden");
    });
}

//processes incoming raw file data and refreshes UI
function handleLoadedFiles(rawFiles) {
    if (!rawFiles || rawFiles.length === 0) return;
    const excludeString = excludeInput.value;
    loadedFiles = applySmartFilter(rawFiles, excludeString);
    renderFileList(loadedFiles, fileListContainer, updateOutput);
    updateOutput();
}


//Re format output preview and enables/disables action buttons
function updateOutput() {
    const activeFiles = loadedFiles.filter(f => f.included && !f.isBinary);

    //stats update
    statFiles.textContent = loadedFiles.length;
    statIncluded.textContent = activeFiles.length;

    //Tree View
    const treeText = formatTree(loadedFiles);
    asciiTreePreview.textContent = treeText || "No Active Files";

    //File Content
    const contentsText = formatContent(loadedFiles);
    outputPreview.value = contentsText;

    //enable/disable buttons based on if we have anything to copy or download
    const hasContent = contentsText.trim().length > 0;
    const hasTree = treeText.trim().length > 0;
    copyBtn.disabled = !hasContent;
    copyTreeBtn.disabled = !hasTree;
    downloadBtn.disabled = !hasContent;
}

//Tab Switching Handler
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        btn.classList.add("active");
        const targetView = document.getElementById(btn.dataset.view) || document.getElementById(`${btn.dataset.view}-view`);
        if (targetView) targetView.classList.add("active");
    });
});

// Source Tabs Switching
document.querySelectorAll(".source-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".source-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".input-pane").forEach(p => p.classList.remove("active"));
        
        tab.classList.add("active");
        document.getElementById(tab.dataset.target).classList.add("active");
    });
});

// Example Repositories Pills
document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const githubTab = document.querySelector(".source-tab[data-target='github-source']");
        githubTab.click();
        
        githubUrlInput.value = btn.dataset.repo;
        handleGithubFetch();
    });
});

//FOlder Input Selection
folderInput.addEventListener("change", async (e) => {
    if (e.target.files.length > 0) {
        githubFetchBtn.disabled = true;
        loadingStatus.classList.remove("hidden");
        loadingText.textContent = "Processing local files...";
        
        try {
            const messageData = await readInputFolder(e.target.files);
            const transferList = messageData.buffer ? [messageData.buffer] : [];
            const files = await processWithWorker(
                messageData,
                transferList,
                (done, total) => { loadingText.textContent = `Reading files (${done}/${total})...`; }
            );
            handleLoadedFiles(files);
        } catch (err) {
            console.error(err);
        } finally {
            githubFetchBtn.disabled = false;
            loadingStatus.classList.add("hidden");
        }
    }
});

//drag and drop
let dragCounter = 0;

window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.remove("hidden");
});

window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.classList.add("hidden");
    }
});

window.addEventListener("dragover", (e) => e.preventDefault());
dropOverlay.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.add("hidden");
    if (e.dataTransfer.items) {
        githubFetchBtn.disabled = true;
        loadingStatus.classList.remove("hidden");
        loadingText.textContent = "Processing dropped files...";
        
        try {
            const messageData = await readDroppedFolder(e.dataTransfer.items);
            const transferList = messageData.buffer ? [messageData.buffer] : [];
            const files = await processWithWorker(
                messageData,
                transferList,
                (done, total) => { loadingText.textContent = `Reading files (${done}/${total})...`; }
            );
            handleLoadedFiles(files);
        } catch (err) {
            console.error(err);
        } finally {
            githubFetchBtn.disabled = false;
            loadingStatus.classList.add("hidden");
        }
    }
});

//Filter and option Toggles (Debounced)
let filterTimeout;
excludeInput.addEventListener("input", () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        if (loadedFiles.length > 0) {
            loadedFiles = applySmartFilter(loadedFiles, excludeInput.value);
            renderFileList(loadedFiles, fileListContainer, updateOutput);
            updateOutput();
        }
    }, 300);
});

// Clipboard Actions
async function copyToClipboard(text, btn) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }
        const originalText = btn.textContent;
        btn.textContent = "📋 Copied!";
        setTimeout(() => btn.textContent = originalText, 2000);
    } catch (err) {
        console.error("Failed to copy", err);
    }
}

copyBtn.addEventListener("click", () => copyToClipboard(outputPreview.value, copyBtn));
copyTreeBtn.addEventListener("click", () => copyToClipboard(asciiTreePreview.textContent, copyTreeBtn));

//Download as text file
downloadBtn.addEventListener("click", () => {
    const blob = new Blob([outputPreview.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "gitpack-contents.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
});



