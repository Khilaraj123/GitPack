const IGNORED_DIRECTORIES = new Set([
  // Version Control & IDEs
  ".git", ".svn", ".hg", ".idea", ".vscode", ".vs",

  // Node, JavaScript & Web
  "node_modules", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".astro", "coverage",

  // Flutter / Dart
  ".dart_tool", "ephemeral",

  // Native Mobile Shells (Flutter/React Native)
  "android", "ios", "linux", "macos", "windows", "web", "Pods", "Carthage", "DerivedData",

  // Python
  "__pycache__", ".pytest_cache", ".venv", "venv", "env", ".mypy_cache", ".ruff_cache", ".tox",

  // Java / Kotlin / Scala
  ".gradle", "target", ".m2", "buildOutputCleanup",

  // C# / .NET
  "bin", "obj",

  // Rust / Go / C++
  "cmake-build-debug", "cmake-build-release",

  // PHP / Ruby
  "vendor", ".bundle", "tmp",

  // Serverless / Cloud
  ".terraform", ".aws-sam", ".serverless"
]);

const IGNORED_FILES = new Set([
  // Package Lock Files (Token Wasters)
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "pubspec.lock",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "poetry.lock",
  "Pipfile.lock",
  "Podfile.lock",
  "Package.resolved",

  // System & Environment Configuration
  ".DS_Store",
  "Thumbs.db",
  ".gitignore",
  ".gitattributes",
  ".dockerignore",
  "local.properties"
]);

const IGNORED_EXTENSIONS = new Set([
  // Images & Media
  "png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "bmp", "tiff",
  "mp3", "mp4", "wav", "avi", "mov", "webm",
  
  // Compressed Archives
  "zip", "tar", "gz", "7z", "rar",
  
  // Compiled Binaries & Documents
  "pdf", "exe", "dll", "so", "dylib", "dmg", "apk", "aab", "ipa",
  "o", "obj", "a", "lib", "pdb", "rlib", "class", "jar", "war", "ear",
  "pyc", "pyo", "pyd",

  // Fonts
  "woff", "woff2", "ttf", "eot",

  // IDE / Native Build Metadata
  "iml", "xcodeproj", "xcworkspace", "pbxproj", "plist", "tfstate"
]);

export function isIgnoredPath(filePath, customExcludes = []) {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];

  // Extension check
  const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
  if (extension && IGNORED_EXTENSIONS.has(extension)) {
    return true;
  }

  // Exact filename check
  if (IGNORED_FILES.has(fileName)) {
    return true;
  }

  // Directory check
  if (parts.some(p => IGNORED_DIRECTORIES.has(p))) {
    return true;
  }

  // Custom user excludes check
  for (const exclude of customExcludes) {
    if (parts.includes(exclude)) {
      return true;
    }
  }

  return false;
}

export function applySmartFilter(files, excludeString = "") {
  const customExcludes = excludeString.split(",").map(s => s.trim()).filter(Boolean);
  return files.map(file => ({
    ...file,
    included: !file.isBinary && !isIgnoredPath(file.path, customExcludes)
  }));
}

export const IGNORED_DIRECTORY_NAMES = IGNORED_DIRECTORIES;