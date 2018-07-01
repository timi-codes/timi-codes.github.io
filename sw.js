const staticCacheName = 'currenzy-static-v1';
var urlsToCache = [
    '/',
    'stylesheets/style.css',
    'javascripts/index.js',
    'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.7.2/angular.js',
    'https://free.currencyconverterapi.com/api/v5/currencies',
    'javascripts/idb/lib/idb.js',
];


self.addEventListener('install', function (event) {
    event.waitUntil(preLoadCache());
});


//open a cache that will store all of our static resources
var preLoadCache = function () {
    caches.open(staticCacheName).then(function (cache) {
        return cache.addAll(urlsToCache)
    });
}


self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName){
                    return cacheName.startsWith('currenzy-') && cacheName !== staticCacheName;
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});


self.addEventListener('fetch', function (event) {

    // let requestUrl = new URL(event.request.url);
    //
    // if (requestUrl.origin === location.origin){
    //     if (requestUrl.pathname ==='/'){
    //         event.respondWith(caches.match('/skeleton'));
    //         return;
    //     }
    // }

    event.respondWith(
        caches.match(event.request).then(function (response) {
            if (response) return response;
            return fetch(event.request);
        })
    );
});

//rrrdsdsdttt
self.addEventListener('message', function(event){
    if(event.data.action === 'skipWaiting'){
        self.skipWaiting();
    }
});