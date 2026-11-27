// What kind of link this is, from its address, so the Vault can group and label it.
export const KINDS = {
  drive: "Google Drive", docs: "Google Docs", sheets: "Google Sheets", slides: "Google Slides", github: "GitHub", figma: "Figma",
  canva: "Canva", youtube: "YouTube", notion: "Notion", onedrive: "OneDrive", other: "Other links",
} as const;
export type Kind = keyof typeof KINDS;

export function linkKind(url: string): Kind {
  let host = "", path = "";
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ""); path = u.pathname; } catch { return "other"; }
  if (host === "docs.google.com") return path.startsWith("/spreadsheets") ? "sheets" : path.startsWith("/presentation") ? "slides" : "docs";
  if (host === "drive.google.com") return "drive";
  if (host === "github.com" || host.endsWith(".github.io")) return "github";
  if (host.endsWith("figma.com")) return "figma";
  if (host.endsWith("canva.com")) return "canva";
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (host.endsWith("notion.so") || host.endsWith("notion.site")) return "notion";
  if (host.endsWith("onedrive.live.com") || host.endsWith("sharepoint.com") || host === "1drv.ms") return "onedrive";
  return "other";
}
