import {
  IGNORED_EXTENSIONS,
  IGNORED_DIRECTORIES,
  IGNORED_FILES
} from "../app/constants.js";

export { IGNORED_DIRECTORIES, IGNORED_FILES, IGNORED_EXTENSIONS };

export function parseExcludePattern(excludeString = "") {
  return excludeString
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

export function normalizePath(filePath) {
  return String(filePath)
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function matchesCustomExclude(filePath, exclude) {
  const normalizedPath = normalizePath(filePath);
  const normalizedExclude = normalizePath(exclude);

  if (!normalizedExclude) {
    return false;
  }

  const pathParts = normalizedPath.split("/");

  // Exact file or directory match
  if (normalizedPath === normalizedExclude) {
    return true;
  }

  // Matches if directory prefix (e.g. exclude is 'src/legacy', path is 'src/legacy/file.js')
  if (normalizedPath.startsWith(normalizedExclude + "/")) {
    return true;
  }

  // Matches individual directory or filename segment (e.g. exclude is 'node_modules')
  if (pathParts.includes(normalizedExclude)) {
    return true;
  }

  // Wildcard match (e.g. '*.log', '*.spec.js')
  if (normalizedExclude.includes("*")) {
    const escaped = normalizedExclude
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    const regex = new RegExp(`^${escaped}$`, "i");

    return regex.test(normalizedPath)
      || regex.test(pathParts.at(-1) ?? "");
  }

  return false;
}

export function isIgnoredPath(filePath, customExcludes = []) {
  const normalizedPath = normalizePath(filePath);

  const parts = normalizedPath
    .split("/")
    .filter(Boolean);

  const fileName = parts.at(-1) ?? "";

  // Extension check
  const extension = fileName.includes(".")
    ? fileName.split(".").pop().toLowerCase()
    : "";

  if (extension && IGNORED_EXTENSIONS.has(extension)) {
    return true;
  }

  // Example: package-lock.json, .gitignore
  if (IGNORED_FILES.has(fileName)) {
    return true;
  }

  // Example: node_modules/foo.js
  if (parts.some(part => IGNORED_DIRECTORIES.has(part))) {
    return true;
  }

  // User-defined exclusions
  if (customExcludes.some(exclude =>
    matchesCustomExclude(normalizedPath, exclude)
  )) {
    return true;
  }

  return false;
}

export function getDefaultIncluded(file, customExcludes = []) {
  if (file.isBinary) {
    return false;
  }

  if (file.isTooLarge) {
    return false;
  }

  return !isIgnoredPath(file.path, customExcludes);
}

export function applySmartFilter(files, excludeString = "") {
  const customExcludes = parseExcludePattern(excludeString);

  return files.map(file => {
    const defaultIncluded = getDefaultIncluded(
      file,
      customExcludes
    );

    const userOverride = file.userOverride ?? false;

    return {
      ...file,
      defaultIncluded,
      userOverride,
      included: userOverride
        ? file.included
        : defaultIncluded
    };
  });
}
