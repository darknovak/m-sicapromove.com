const CACHE_NAME = 'promo-music-cache-v1';
const MAX_DAILY_USAGE = 20 * 1024 * 1024; // 20 MB em bytes
const RESET_TIME = "00:00";
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/imagem-da-capa.jpg', // Adicione outros arquivos importantes aqui
];

// Função para resetar o limite diário à meia-noite
function resetDailyLimit() {
    const currentDate = new Date().toDateString();
    const usageData = JSON.parse(localStorage.getItem('dataUsage')) || {};
    if (usageData.date !== currentDate) {
        localStorage.setItem('dataUsage', JSON.stringify({ date: currentDate, used: 0 }));
    }
}

// Função para rastrear o uso de dados
function trackDataUsage(size) {
    resetDailyLimit();
    const usageData = JSON.parse(localStorage.getItem('dataUsage'));
    usageData.used += size;

    if (usageData.used > MAX_DAILY_USAGE) {
        return false; // Limite excedido
    }

    localStorage.setItem('dataUsage', JSON.stringify(usageData));
    return true; // Dentro do limite
}

// Instala o Service Worker e faz o cache inicial
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

// Intercepta requisições
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Retorna do cache
            }
            return fetch(event.request).then((response) => {
                const cloneResponse = response.clone();
                const size = parseInt(cloneResponse.headers.get('Content-Length'), 10) || 0;

                if (trackDataUsage(size)) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cloneResponse);
                    });
                    return response;
                } else {
                    return caches.match('/offline.html'); // Retorna uma página de aviso
                }
            });
        }).catch(() => {
            return caches.match('/offline.html'); // Offline total
        })
    );
});

// Limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
