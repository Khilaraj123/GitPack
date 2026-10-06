/**
 * Creates the initial application state.
 */
export function createInitialState() {
    return {
        // -----------------------------
        // Source
        // -----------------------------

        /**
         * Current source.
         * Possible values:
         * - "github"
         * - "local"
         * - null
         */
        source: null,

        // -----------------------------
        // Files
        // -----------------------------

        /**
         * All files currently loaded into the application.
         */
        files: [],

        // -----------------------------
        // Filtering
        // -----------------------------

        /**
         * User-defined exclude rules.
         *
         * Example:
         * "node_modules, dist, .git, .env"
         */
        excludePattern: "",

        // -----------------------------
        // Processing
        // -----------------------------

        isProcessing: false,

        progress: {
            current: 0,
            total: 0,
            message: ""
        },

        // -----------------------------
        // UI
        // -----------------------------

        /**
         * Current workspace view.
         *
         * Possible values:
         * - "tree"
         * - "file-list"
         */
        activeView: "tree",

        /**
         * Current source tab.
         *
         * Possible values:
         * - "github"
         * - "local"
         */
        activeSourceTab: "github",

        // -----------------------------
        // Status
        // -----------------------------

        status: {
            type: "idle",
            message: ""
        }
    };
}


/**
 * Replace the current file collection.
 */
export function setFiles(state, files) {
    state.files = files;
}


/**
 * Remove all loaded files.
 */
export function clearFiles(state) {
    state.files = [];
}


/**
 * Set the current source.
 */
export function setSource(state, source) {
    state.source = source;
}


/**
 * Set processing state.
 */
export function setProcessing(state, isProcessing) {
    state.isProcessing = isProcessing;
}


/**
 * Update processing progress.
 */
export function setProgress(
    state,
    current,
    total,
    message = ""
) {
    state.progress = {
        current,
        total,
        message
    };
}


/**
 * Update application status.
 *
 * type:
 * - "idle"
 * - "loading"
 * - "success"
 * - "error"
 */
export function setStatus(
    state,
    type,
    message = ""
) {
    state.status = {
        type,
        message
    };
}


/**
 * Change the active workspace view.
 */
export function setActiveView(state, view) {
    state.activeView = view;
}


/**
 * Change the active source tab.
 */
export function setActiveSourceTab(state, tab) {
    state.activeSourceTab = tab;
}


/**
 * Update user-defined exclude rules.
 */
export function setExcludePattern(state, pattern) {
    state.excludePattern = pattern;
}