//parses github repo url or slug
export function parseGithubUrl(inputUrl) {
    let url = inputUrl.trim();
    if (!url) return null;

    //strip protocol and domain if present
    url = url.replace(/^(https?:\/\/)?(www\.)?github\.com\//, "");
    url = url.replace(/^git@github\.com:/, "");

    const parts = url.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    let branch = "";
    let subpath = "";

    // Handles URLs like /tree/branch-name/sub/folder
    if (parts[2] === "tree" && parts[3]) {
        branch = parts[3];
        subpath = parts.slice(4).join("/");
    }

    return { owner, repo, branch, subpath };
}

export function fetchGithubRepo(owner, repo, branch = "", subpath = "", token = "", onProgress = null) {
    const headers = {};
    if (token) {
        headers["Authorization"] = `token ${token}`;
    }

    // 1. Resolve branch if not provided by fetching repository metadata
    const resolveBranch = branch
        ? Promise.resolve(branch)
        : fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
            .then(res => {
                if(res.status === 403) throw new Error("GitHub API rate limit exceeded. Add a Personal Access Token or wait a bit.");
                if (res.status === 404) throw new Error("Repository not found. Check if it's private.");
                if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
                return res.json();
            })
            .then(data => data.default_branch);

    // 2. Fetch file tree metadata from GitHub API
    return resolveBranch.then(resolvedBranch => {
        const treeApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${resolvedBranch}?recursive=1`;

        return fetch(treeApiUrl, { headers })
            .then(res => {
                if(res.status === 403) {
                    throw new Error("GitHub API rate limit exceeded. Add a Personal Access Token or wait a bit.");
                }
                if (res.status === 404) {
                    throw new Error("Repository or branch not found. Check if it's private.");
                }
                if (!res.ok) {
                    throw new Error(`GitHub API error (${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                if (data.truncated) {
                    console.warn("Repo tree is large and was truncated by GitHub API.");
                }

                // Filter for files (blobs), ignore directories (trees)
                let files = data.tree.filter(item => item.type === "blob");

                // Filter by subpath if user provided a specific folder path
                if (subpath) {
                    files = files.filter(item => item.path.startsWith(subpath + "/") || item.path === subpath);
                }

                // Return payload for the Web Worker to process contents
                return {
                    type: 'github-fetch',
                    owner,
                    repo,
                    branch: resolvedBranch,
                    files,
                    token
                };
            });
    });
}