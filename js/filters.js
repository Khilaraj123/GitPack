const IGNORED_DIRECTORIES = new Set([
  // Web & Node / Package Managers
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  ".idea",
  ".vscode",
  ".vs",
  "packages",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  "vendor",

  // Flutter & Dart Build Output / Cache
  ".dart_tool",
  "ephemeral",

  // Native Mobile & Desktop App Boilerplate
  "android",
  "ios",
  "linux",
  "macos",
  "windows",
  "web", // Remove "web" from here if you specifically build Flutter Web apps

  // Native Build Caches & Derived Data
  ".gradle",
  "buildOutputCleanup",
  "Pods",
  "DerivedData"
]);

// Exact filenames to ignore
const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
  "Thumbs.db",
  ".gitignore",
  ".gitattributes",
  ".dockerignore",
  "local.properties"
]);

// Binary / Non-text file extensions to skip
const IGNORED_EXTENSIONS = new Set([
  // Media
  "png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "bmp", "tiff",
  "mp3", "mp4", "wav", "avi", "mov", "webm",
  
  // Archives
  "zip", "tar", "gz", "7z", "rar",
  
  // Binaries & Documents
  "pdf", "exe", "dll", "so", "dylib", "dmg",
  
  // Fonts
  "woff", "woff2", "ttf", "eot",

  // Mobile / Xcode / Android Native Project Binaries & Configs
  "iml",
  "xcodeproj",
  "xcworkspace",
  "pbxproj",
  "plist",
  "jar",
  "aar"
]);

//Check if a file path matches any smart filter criteria
export function isIgnoredPath(filePath, customExcludes = []){
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1];

    //check file extension for known binary formats
    const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
    if(IGNORED_EXTENSIONS.has(extension)){
        return true;
    }

    //check against known ignored filenames
    if(IGNORED_FILES.has(fileName)){
        return true;
    }

    //check against known ignored directories
    if(parts.some(p => IGNORED_DIRECTORIES.has(p))){
        return true;
    }

    //check custom excludes against exact path segments
    for (const exclude of customExcludes) {
        if (parts.includes(exclude)) {
            return true;
        }
    }

    return false;
}

//Filters array of files based on smart filter configuration
export function applySmartFilter(files, excludeString = ""){
    const customExcludes = excludeString.split(",").map(s => s.trim()).filter(Boolean);
    return files.map(file => ({
        ...file,
        included: !file.isBinary && !isIgnoredPath(file.path, customExcludes)
    }));
}