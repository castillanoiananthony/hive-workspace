import type { MetadataRoute } from "next";

const SITE = "https://hive-workspace.com";

/** The public pages, so search engines find them without crawling the app. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/demo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE}/signin`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/developer`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
