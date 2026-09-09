/* ==========================================================================
   LEARNER — Service Worker (Cache-First com fallback de rede)
   --------------------------------------------------------------------------
   Estratégia:
     • install  → pré-cacheia todos os assets estáticos essenciais
     • activate → limpa caches antigos de versões anteriores
     • fetch    → responde pelo cache imediatamente; fallback para rede
                  se o recurso não estiver em cache
   ========================================================================== */

const CACHE_NAME = 'learner-v1';

/* Lista de todos os arquivos estáticos essenciais do projeto */
const ASSETS_TO_CACHE = [
    /* Raiz */
    './',
    './index.html',
    './style.css',
    './manifest.json',

    /* CSS base */
    './css/tokens.css',
    './css/shell.css',
    './css/componentes.css',

    /* CSS de páginas */
    './css/pages/analisador.css',
    './css/pages/categorias.css',
    './css/pages/configuracoes.css',
    './css/pages/favoritos.css',
    './css/pages/ficha.css',
    './css/pages/quiz.css',
    './css/pages/traducao.css',

    /* JavaScript */
    './js/app.js',
    './js/bottom-sheet.js',
    './js/drawer.js',
    './js/sidebar-hover.js',

    /* Fragmentos HTML das páginas */
    './pages/analisador.html',
    './pages/categorias.html',
    './pages/configuracoes.html',
    './pages/favoritos.html',
    './pages/ficha.html',
    './pages/quiz.html',
    './pages/traducao.html',

    /* Ícones SVG */
    './icones/adjustments-alt.svg',
    './icones/adjustments-horizontal.svg',
    './icones/alert-circle.svg',
    './icones/alphabet-latin.svg',
    './icones/arrow-down.svg',
    './icones/arrow-left.svg',
    './icones/arrow-right.svg',
    './icones/arrow-up.svg',
    './icones/arrows-sort.svg',
    './icones/book.svg',
    './icones/books.svg',
    './icones/caret-left.svg',
    './icones/caret-right.svg',
    './icones/category.svg',
    './icones/check.svg',
    './icones/chevron-down.svg',
    './icones/circle.svg',
    './icones/clipboard.svg',
    './icones/clock.svg',
    './icones/cog.svg',
    './icones/copy.svg',
    './icones/dots-vertical.svg',
    './icones/down-arrow.svg',
    './icones/eye-off.svg',
    './icones/eye.svg',
    './icones/file-export.svg',
    './icones/filter-2.svg',
    './icones/filter.svg',
    './icones/folder filled.svg',
    './icones/folder.svg',
    './icones/grid-dots.svg',
    './icones/grip-vertical.svg',
    './icones/info-circle.svg',
    './icones/language-hiragana.svg',
    './icones/letter-case-toggle.svg',
    './icones/list.svg',
    './icones/menu-2.svg',
    './icones/minus.svg',
    './icones/notebook.svg',
    './icones/number.svg',
    './icones/pencil.svg',
    './icones/plus.svg',
    './icones/question-mark.svg',
    './icones/school.svg',
    './icones/search.svg',
    './icones/sort-a-z.svg',
    './icones/star filled.svg',
    './icones/star.svg',
    './icones/warning.svg',
    './icones/x.svg',

    /* Ícones PWA */
    './icon-192.png',
    './icon-512.png'
];

/* --------------------------------------------------------------------------
   INSTALL — pré-cacheia todos os assets estáticos
   -------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando e pré-cacheando assets...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            /* Adiciona cada asset individualmente para que uma falha
               em um arquivo não bloqueie toda a instalação */
            const promises = ASSETS_TO_CACHE.map((url) =>
                cache.add(url).catch((err) => {
                    console.warn(`[SW] Não foi possível cachear: ${url}`, err);
                })
            );
            return Promise.all(promises);
        }).then(() => {
            console.log('[SW] Pré-cache concluído!');
            /* Ativa imediatamente, sem esperar páginas antigas fecharem */
            return self.skipWaiting();
        })
    );
});

/* --------------------------------------------------------------------------
   ACTIVATE — remove caches de versões antigas
   -------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando e limpando caches antigos...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log(`[SW] Removendo cache antigo: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Ativação concluída. Assumindo controle das páginas abertas.');
            /* Assume controle de todas as páginas abertas imediatamente */
            return self.clients.claim();
        })
    );
});

/* --------------------------------------------------------------------------
   FETCH — Cache-First com fallback de rede
   --------------------------------------------------------------------------
   1. Verifica se a requisição está no cache → retorna instantaneamente
   2. Se não estiver, busca na rede e armazena no cache para uso futuro
   3. Se a rede falhar e não houver cache → retorna resposta de erro offline
   -------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
    /* Ignora requisições não-GET (POST, PUT, DELETE...) e extensões de browser */
    if (event.request.method !== 'GET') return;

    /* Ignora requisições de outros domínios (ex: Google Fonts, APIs externas) */
    const url = new URL(event.request.url);
    const isExternal = url.origin !== self.location.origin;
    const isChromeExtension = url.protocol === 'chrome-extension:';

    if (isChromeExtension) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            /* ✅ Cache-First: retorna do cache imediatamente se disponível */
            if (cachedResponse) {
                return cachedResponse;
            }

            /* 🌐 Fallback de rede para assets não cacheados */
            return fetch(event.request)
                .then((networkResponse) => {
                    /* Armazena no cache apenas respostas válidas e do mesmo domínio */
                    if (
                        !isExternal &&
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === 'basic'
                    ) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    /* ❌ Offline e sem cache: retorna página de fallback para HTML */
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }

                    /* Para outros recursos, retorna resposta vazia com status offline */
                    return new Response('', {
                        status: 503,
                        statusText: 'Serviço indisponível offline'
                    });
                });
        })
    );
});
