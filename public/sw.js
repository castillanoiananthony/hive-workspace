// HIVE-WORKSPACE service worker: makes the app installable and keeps your task list usable offline.
// Pages always come from the network when there is one. With no connection, any page opens /offline,
// which shows the tasks saved on this device and lets you tick them off (they sync when you're back online).
const VERSION = "hive-v1";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

async function cacheOfflinePage() {
  const cache = await caches.open(SHELL);
  const res = await fetch("/offline", { cache: "no-store" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put("/offline", res);
  // the offline page's own scripts and styles, so it can run with no connection at all
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
  const stat = await caches.open(STATIC);
  await Promise.all(assets.map((u) => stat.add(u).catch(() => {})));
  await Promise.all(["/icons/icon-192.png", "/icons/icon-512.png"].map((u) => stat.add(u).catch(() => {})));
}

self.addEventListener("install", (e) => { e.waitUntil(cacheOfflinePage().then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // server actions, sign-in and sync are never touched
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // live data and sign-in only ever come from the server
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    // fingerprinted build files never change: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); } return res; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline").then((hit) => hit || new Response("You're offline.", { headers: { "content-type": "text/plain" } }))));
  }
});

self.addEventListener("message", (e) => {
  if (e.data === "refresh-offline-page") cacheOfflinePage();
  if (e.data === "clear") caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
});
