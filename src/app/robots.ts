import type { MetadataRoute } from "next";

const SITE = "https://hive-workspace.com";

/** Public pages are open to search engines; signed-in app pages and links from emails are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/home", "/cell", "/hive", "/calendar", "/settings", "/tasks", "/profile", "/tutorial", "/join", "/people", "/u/", "/colony", "/onboarding", "/buzz", "/unsubscribe", "/done", "/offline"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
