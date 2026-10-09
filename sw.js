// Lets the web version open with no signal. The app files are saved on the phone and opened from there first,
// so a dead-zone launch never waits on the network. The dispensary list is saved separately by the app itself.
const VERSION="v11";
const SHELL = ["./", "index.html", "logo.png", "splash-art.jpg", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;                         // the Google Sheet and maps links are left to the browser
  // Saved copy first, then refresh it in the background for the next launch.
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(req, { ignoreSearch: sameOrigin }).then(hit => {
        const refresh = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; });
        if (hit) { e.waitUntil(refresh.catch(() => {})); return hit; }
        return refresh.catch(() => sameOrigin ? cache.match("index.html") : Response.error());
      })
    )
  );
});
