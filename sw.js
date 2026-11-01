// Offline cache. Serves the app's own files only; it never fetches anything
// on behalf of the page beyond them.
const VERSION = 'aba-docs-v0.7.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/util.js', 'js/store.js', 'js/crypto.js', 'js/engine.js', 'js/pdf.js', 'js/links.js',
  'js/forms/index.js', 'js/forms/bip.js', 'js/forms/fba.js', 'js/forms/preference.js', 'js/forms/skill.js', 'js/forms/visual.js', 'js/forms/treatment-plan.js', 'js/forms/progress-report.js', 'js/forms/behavior-suggest.js', 'js/forms/common.js',
  'vendor/pdfmake.min.js', 'vendor/vfs_fonts.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
