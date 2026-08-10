// Service worker de Tam-Tam Silence
// Objectif : l'application (interface, ~150 simulations, quiz, export PDF/Word) fonctionne
// hors ligne, tandis que la vérification de licence et l'assistant IA exigent toujours
// une vraie connexion internet (elles ne passent jamais par le cache).

const CACHE_NAME = 'tamtam-silence-v3';
const ASSETS = [
  './',
  './index.html',
  './simulations.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Réseau en priorité (pour toujours avoir la dernière version quand il y a internet),
// on ne se rabat sur le cache que si le réseau échoue (mode hors-ligne).
// Les requêtes vers un autre site (licence, assistant IA) ne sont JAMAIS interceptées :
// elles exigent toujours une vraie connexion, sans jamais passer par le cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // laisse passer les appels vers Netlify/Gemini tels quels

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
