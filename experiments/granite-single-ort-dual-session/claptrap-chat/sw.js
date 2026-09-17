// The static development host cannot set application headers. A same-origin
// service worker supplies them to the document and worker, including offline.
const CACHE = `claptrap-shell-v2:${self.registration.scope}`;
const SHELL = ["./index.html", "./main.js", "./turn-boundary.js", "./runtime-worker.js",
  "./app-shell.js", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png",
  "./stability.html", "./stability.js", "./evidence/phone-precrash-20260917.json", "./evidence/phone-precrash-20260917.csv"];

function isolated(response) {
  if (response.status === 0) return response;
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener("install", (event) => {
  // Small shell only. Model installation is automatic on first Start and uses
  // the pinned Transformers.js cache, independently of service worker install.
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    for (const path of SHELL) {
      const url = new URL(path, self.registration.scope);
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (!response.ok) throw new Error(`Shell installation failed: ${path} (${response.status})`);
      await cache.put(url, isolated(response));
    }
  }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("claptrap-shell-") && name.endsWith(`:${self.registration.scope}`) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const local = url.href.startsWith(self.registration.scope);
  // ORT/model binaries are cached by Transformers.js itself; do not duplicate
  // the large weights in the app shell cache. Cache pinned executable modules.
  const runtimeModule = url.origin === "https://cdn.jsdelivr.net" &&
    (url.pathname.startsWith("/npm/@huggingface/transformers@4.3.0") ||
     (url.pathname.startsWith("/npm/onnxruntime-web@") && /\.(m?js)$/.test(url.pathname)));
  if (!local && !runtimeModule) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    const result = local ? isolated(response) : response;
    if (response.ok && response.type !== "opaque") await cache.put(request, result.clone());
    return result;
  })());
});
