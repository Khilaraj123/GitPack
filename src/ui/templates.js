export function renderApp() {
    return `
        <div id="drop-overlay" class="drop-overlay hidden">
            <div class="drop-content">
                <h2>Drop your files and folders here</h2>
            </div>
        </div>

        <div class="app-container">

            <!-- Header -->
            <header class="app-header">

                <div class="logo">
                    <svg
                        class="logo-icon"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line
                            x1="12"
                            y1="22.08"
                            x2="12"
                            y2="12"
                        ></line>
                    </svg>

                    <h1>GitPack</h1>
                </div>

                <div class="header-actions">
                    <span class="badge">v1.2.0</span>

                    <a
                        href="https://github.com/Khilaraj123/GitPack"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="github-link"
                        aria-label="GitHub repository"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                        </svg>
                    </a>
                </div>

            </header>


            <!-- Hero -->
            <section class="hero-section">

                <h1 class="hero-title">
                    Turn Code into Context
                </h1>

                <p class="hero-subtitle">
                    Instantly convert any GitHub repository or local
                    folder into a structured text digest, ready for
                    your LLM. Simplify your codebase packaging process.
                </p>


                <!-- Pack Card -->
                <div class="pack-card">

                    <!-- Source Tabs -->
                    <div class="source-tabs">

                        <button
                            class="source-tab active"
                            data-target="github-source"
                            type="button"
                        >
                            GitHub Repo
                        </button>

                        <button
                            class="source-tab"
                            data-target="local-source"
                            type="button"
                        >
                            Local Directory
                        </button>

                    </div>


                    <!-- Input Areas -->
                    <div class="input-areas">

                        <!-- GitHub -->
                        <div
                            id="github-source"
                            class="input-pane active"
                        >

                            <div class="github-input-group">

                                <input
                                    type="text"
                                    id="github-url-input"
                                    placeholder="https://github.com/owner/repo"
                                    autocomplete="off"
                                    spellcheck="false"
                                >

                                <input
                                    type="password"
                                    id="github-token-input"
                                    placeholder="PAT (Optional)"
                                    autocomplete="off"
                                    spellcheck="false"
                                >

                                <button
                                    id="github-fetch-btn"
                                    class="btn-primary btn-pack"
                                    type="button"
                                >
                                    Process/Pack
                                </button>

                            </div>


                            <div
                                id="loading-status"
                                class="hidden"
                            >
                                <span id="loading-text"></span>
                            </div>

                        </div>


                        <!-- Local -->
                        <div
                            id="local-source"
                            class="input-pane"
                        >

                            <div
                                id="drop-zone"
                                class="drop-zone"
                            >

                                <span class="upload-icon">↑</span>

                                <span>
                                    Drag-and-drop upload OR
                                </span>

                                <label class="btn-browse-link">
                                    Browse

                                    <input
                                        type="file"
                                        id="folder-input"
                                        webkitdirectory
                                        directory
                                        multiple
                                        hidden
                                    >
                                </label>

                            </div>

                        </div>

                    </div>


                    <!-- Options -->
                    <div class="options-card">

                        <div class="options-col">

                            <h4>File Options</h4>

                            <div class="options-group">

                                <label for="exclude-input">
                                    Exclude
                                </label>

                                <input
                                    type="text"
                                    id="exclude-input"
                                    class="text-input"
                                    value="node_modules, dist, .git, .env, .vs, packages, bin, obj, package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, .gitignore, .gitattributes, .dockerignore"
                                >

                            </div>

                        </div>


                        <div class="options-col examples-col">

                            <h4>Example Repositories</h4>

                            <div class="pills-container">

                                <button
                                    class="pill-btn"
                                    data-repo="https://github.com/Khilaraj123/GitPack"
                                    type="button"
                                >
                                    Git Pack
                                </button>

                                <button
                                    class="pill-btn"
                                    data-repo="https://github.com/fastapi/fastapi"
                                    type="button"
                                >
                                    FastAPI
                                </button>

                                <button
                                    class="pill-btn"
                                    data-repo="https://github.com/pallets/flask"
                                    type="button"
                                >
                                    Flask
                                </button>

                                <button
                                    class="pill-btn"
                                    data-repo="https://github.com/excalidraw/excalidraw"
                                    type="button"
                                >
                                    Excalidraw
                                </button>

                            </div>

                        </div>

                    </div>


                    <p class="footer-note">
                        You can also replace 'hub' with 'pack' in any
                        GitHub URL for quick access.
                    </p>

                </div>


                <!-- Statistics -->
                <div
                    class="summary-stats"
                    id="summary-stats"
                >

                    <div class="stat-item">
                        Files:
                        <strong id="stat-files">0</strong>
                    </div>

                    <div class="stat-item">
                        Included:
                        <strong id="stat-included">0</strong>
                    </div>

                </div>

            </section>


            <!-- Workspace -->
            <main class="workspace">

                <!-- Directory Tree -->
                <section class="panel tree-panel">

                    <div class="panel-header">

                        <h2>Directory Structure</h2>

                        <button
                            id="copy-tree-btn"
                            class="btn-sm"
                            disabled
                            type="button"
                        >
                            📋 Copy Tree
                        </button>

                    </div>


                    <!-- View Tabs -->
                    <div class="view-tabs">

                        <button
                            class="tab-btn active"
                            data-view="tree-view"
                            type="button"
                        >
                            ASCII Tree
                        </button>

                        <button
                            class="tab-btn"
                            data-view="file-list-view"
                            type="button"
                        >
                            File List View
                        </button>

                    </div>


                    <!-- Tree -->
                    <div
                        id="tree-view"
                        class="tab-content active"
                    >

                        <pre
                            id="ascii-tree-preview"
                            class="code-preview"
                        >No directory loaded yet.</pre>

                    </div>


                    <!-- File List -->
                    <div
                        id="file-list-view"
                        class="tab-content"
                    >

                        <div
                            id="file-list"
                            class="file-list"
                        >
                            <p class="placeholder-text">
                                No folder loaded yet.
                            </p>
                        </div>

                    </div>

                </section>


                <!-- File Contents -->
                <section class="panel control-panel">

                    <div class="panel-header">

                        <h2>File Contents</h2>

                        <div class="action-buttons">

                            <button
                                id="copy-btn"
                                class="btn-primary"
                                disabled
                                type="button"
                            >
                                📋 Copy Content
                            </button>

                            <button
                                id="download-btn"
                                class="btn-secondary"
                                disabled
                                type="button"
                            >
                                💾 Download .txt
                            </button>

                        </div>

                    </div>

                    <textarea
                        id="output-preview"
                        readonly
                        placeholder="Parsed File Content will appear here..."
                    ></textarea>

                </section>

            </main>

        </div>
    `;
}