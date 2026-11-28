// Recognises GitHub and GitLab links so tasks and test runs can label them: "PR #42", "commit a1b2c3d", "branch login-fix".

export type GitLink = { host: "GitHub" | "GitLab"; kind: "pr" | "issue" | "commit" | "branch" | "repo"; label: string; repo: string };

export function gitLink(url: string): GitLink | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");
  const isHub = host === "github.com", isLab = host === "gitlab.com" || host.startsWith("gitlab.");
  if (!isHub && !isLab) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const dash = parts.indexOf("-"); // GitLab puts "/-/" before the resource
  const rest = isLab && dash >= 0 ? parts.slice(dash + 1) : parts.slice(2);
  const repo = (isLab && dash >= 0 ? parts.slice(0, dash) : parts.slice(0, 2)).join("/");
  if (!repo.includes("/")) return null;
  const H = isHub ? "GitHub" : "GitLab";
  const [what, id, ...more] = rest;
  if ((what === "pull" || what === "merge_requests") && id) return { host: H, kind: "pr", label: `${isHub ? "PR" : "MR"} #${id}`, repo };
  if (what === "issues" && id) return { host: H, kind: "issue", label: `Issue #${id}`, repo };
  if (what === "commit" && id) return { host: H, kind: "commit", label: `Commit ${id.slice(0, 7)}`, repo };
  if (what === "tree" && id) return { host: H, kind: "branch", label: `Branch ${[id, ...more].join("/")}`, repo };
  if (!what) return { host: H, kind: "repo", label: `Repo ${repo}`, repo };
  return null;
}
