const ROW_HEIGHT = 36;
const OVERSCAN = 10;

// Virtualized renderer for file list to maintain 60fps even with thousands of files
export function renderFileList(loadedFiles, fileListContainer, updateOutput) {
    if (!loadedFiles || loadedFiles.length === 0) {
        fileListContainer.innerHTML = '<p class="placeholder-text">No folder loaded yet.</p>';
        fileListContainer._spacer = null;
        fileListContainer._viewport = null;
        return;
    }

    const scrollContainer = fileListContainer.closest('.tab-content') || fileListContainer.parentElement || fileListContainer;

    // Set up virtual DOM structure if not present
    let spacer = fileListContainer._spacer;
    let viewport = fileListContainer._viewport;

    if (!spacer || !viewport || !fileListContainer.contains(spacer)) {
        fileListContainer.innerHTML = "";
        spacer = document.createElement("div");
        spacer.className = "virtual-scroll-spacer";
        spacer.style.position = "relative";
        spacer.style.width = "100%";

        viewport = document.createElement("div");
        viewport.className = "virtual-scroll-viewport";
        viewport.style.position = "absolute";
        viewport.style.top = "0";
        viewport.style.left = "0";
        viewport.style.right = "0";

        spacer.appendChild(viewport);
        fileListContainer.appendChild(spacer);

        fileListContainer._spacer = spacer;
        fileListContainer._viewport = viewport;
    }

    fileListContainer._currentFiles = loadedFiles;
    fileListContainer._updateOutput = updateOutput;

    function renderVisible() {
        const files = fileListContainer._currentFiles;
        if (!files || files.length === 0) return;

        const scrollTop = scrollContainer.scrollTop || 0;
        const viewportHeight = scrollContainer.clientHeight || 500;

        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(files.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

        spacer.style.height = `${files.length * ROW_HEIGHT}px`;
        viewport.style.transform = `translateY(${startIndex * ROW_HEIGHT}px)`;

        viewport.innerHTML = "";
        const fragment = document.createDocumentFragment();

        for (let i = startIndex; i < endIndex; i++) {
            const file = files[i];
            const index = i;

            const item = document.createElement("div");
            item.className = `file-item ${file.included ? "" : "excluded"}`;

            const label = document.createElement("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "8px";
            label.style.cursor = "pointer";
            label.style.width = "100%";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = file.included;
            checkbox.disabled = file.isBinary;

            checkbox.addEventListener("change", () => {
                files[index].included = checkbox.checked;
                item.classList.toggle("excluded", !checkbox.checked);
                if (typeof fileListContainer._updateOutput === 'function') {
                    fileListContainer._updateOutput();
                }
            });

            const pathSpan = document.createElement("span");
            pathSpan.textContent = file.path;
            pathSpan.style.whiteSpace = "nowrap";
            pathSpan.style.overflow = "hidden";
            pathSpan.style.textOverflow = "ellipsis";

            if (file.isBinary) {
                pathSpan.textContent += " (binary - skipped)";
                pathSpan.style.color = "#888";
            }

            label.appendChild(checkbox);
            label.appendChild(pathSpan);
            item.appendChild(label);
            fragment.appendChild(item);
        }

        viewport.appendChild(fragment);
    }

    fileListContainer._renderVisible = renderVisible;

    // Attach listeners once
    if (!fileListContainer._hasListeners) {
        fileListContainer._hasListeners = true;
        scrollContainer.addEventListener('scroll', () => {
            if (fileListContainer._renderVisible) {
                fileListContainer._renderVisible();
            }
        }, { passive: true });

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                if (scrollContainer.clientHeight > 0 && fileListContainer._renderVisible) {
                    fileListContainer._renderVisible();
                }
            });
            ro.observe(scrollContainer);
        }
    }

    renderVisible();
}
