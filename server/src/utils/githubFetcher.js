import axios from "axios";

/**
 * Fetch README from a GitHub repository
 * @param {string} githubUrl - Full GitHub URL (e.g., https://github.com/user/repo)
 * @returns {Promise<string>} - Raw text content of README
 */
async function fetchGitHubReadme(githubUrl) {
  try {
    // Parse GitHub URL: https://github.com/owner/repo or https://github.com/owner/repo/
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(\/)?$/);
    if (!match) {
      throw new Error("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
    }

    const owner = match[1];
    const repo = match[2];

    // Try to fetch README from GitHub API (raw content endpoint)
    // Order: README.md, readme.md, README, readme
    const readmeNames = ["README.md", "readme.md", "README", "readme"];

    for (const readmeName of readmeNames) {
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${readmeName}`;
        const response = await axios.get(url, { timeout: 5000 });
        if (response.status === 200) {
          return response.data;
        }
      } catch (err) {
        // Try next branch/name
        continue;
      }
    }

    // Try master branch if main doesn't exist
    for (const readmeName of readmeNames) {
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/master/${readmeName}`;
        const response = await axios.get(url, { timeout: 5000 });
        if (response.status === 200) {
          return response.data;
        }
      } catch (err) {
        continue;
      }
    }

    throw new Error(
      `README not found in ${owner}/${repo}. Tried: ${readmeNames.join(", ")}`
    );
  } catch (error) {
    console.error("GitHub fetch error:", error.message);
    throw new Error(`Failed to fetch GitHub README: ${error.message}`);
  }
}

export { fetchGitHubReadme };
