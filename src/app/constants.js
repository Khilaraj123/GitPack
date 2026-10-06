export const IGNORED_DIRECTORIES = new Set([
  // Version Control & IDEs
  ".git", ".svn", ".hg", ".idea", ".vscode", ".vs",

  // Node, JavaScript & Web
  "node_modules", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".astro", "coverage",

  // Flutter / Dart
  ".dart_tool", "ephemeral",

  // Native Mobile Shells (Flutter/React Native)
  "Pods", "Carthage", "DerivedData",

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


export const IGNORED_FILES = new Set([
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



export const IGNORED_EXTENSIONS = new Set([
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

export const ROW_HEIGHT = 36;
export const OVERSCAN = 10;