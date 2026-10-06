# GitPack

> **Pack your entire codebase into a single, LLM-ready text file — 100% locally in your browser.**

GitPack is a privacy-first, client-side web utility designed to inspect, filter, and package local software projects into structured text summaries optimized for LLMs (ChatGPT, Claude, Gemini, etc.), code reviews, or backups.

---

## ✨ Features

- ** 100% Client-Side & Private:** Your code never touches a server. All file parsing, filtering, and text generation happen entirely within your browser.
- ** Drag & Drop Folder Traversal:** Recursively reads local project directories using modern browser File System APIs.
- ** Smart Filtering:** Automatically excludes noise (e.g., `node_modules`, `.git`, lockfiles, binary assets, image formats).
- ** Category Toggles:** Quickly filter files by category (e.g., UI vs. Logic files).
- ** Visual Directory Tree:** Generates a clean ASCII directory structure representing your project layout.
- ** One-Click Export:** Copy directly to your clipboard or download as `.txt` / `.md`.
- ** Multi-Language Support:** Internationalization ready for global developer support.

---

##  Built With

- **HTML5 & CSS3** — Native layout, CSS grid/flexbox, drag-and-drop zone.
- **Vanilla JavaScript (ES6+)** — Zero external frameworks required.
- **File System Access API & `webkitGetAsEntry`** — Browser-native recursive folder parsing.
- **Blob & Clipboard API** — Efficient local file generation and clipboard copying.

---

## Project Structure

```text
gitpack/
├── index.html              # Application UI entry point
├── css/
│   └── style.css           # Styling and visual design
└── src/
    ├── main.js             # Main orchestrator & event listeners
    ├── app/
    │   ├── constants.js    # Default ignore sets & dimensions
    │   └── state.js        # Central application state management
    ├── core/
    │   ├── fileReader.js   # Folder traversal & drag-and-drop parsing
    │   ├── fileTree.js     # ASCII directory tree generation
    │   ├── filters.js      # Smart filtering & path exclusion rules
    │   ├── formatter.js    # ASCII tree & text digest generator
    │   └── githubFetcher.js# GitHub repository & tree fetcher
    ├── ui/
    │   ├── templates.js    # Component HTML templates
    │   └── ui.js           # Virtualized file list renderer
    └── workers/
        └── file-worker.js  # Dedicated Web Worker for background file decoding
```