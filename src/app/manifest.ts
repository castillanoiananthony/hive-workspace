import type { MetadataRoute } from "next";

// Lets phones "Add to Home screen" / "Install app"; opens straight into My Cell without browser bars.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HIVE-WORKSPACE",
    short_name: "HIVE",
    description: "Keep your goals visible. Let the team reminders send themselves.",
    id: "/",
    start_url: "/home",
    lang: "en",
    categories: ["education", "productivity"],
    scope: "/",
    display: "standalone",
    background_color: "#17171A",
    theme_color: "#17171A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My Cell", url: "/cell", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "The Hive", url: "/hive", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tasks offline", url: "/offline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
