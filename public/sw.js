// Service Worker for Excel Review App
const CACHE_NAME = 'excel-review-app-v1';
const STATIC_CACHE_NAME = 'excel-review-static-v1';
const DYNAMIC_CACHE_NAME = 'excel-review-dynamic-v1';

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/frontend-validation',
  '/manifest.json',
  '/validation-worker.js',
  // 添加其他静态资源
];

// 动态缓存的资源模式
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg)$/,
];

// 不缓存的资源模式
const NO_CACHE_PATTERNS = [
  /\/api\/validate/,
  /\/api\/templates/,
];

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('excel-review-')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过不需要缓存的资源
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

// 处理请求的策略
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 对于静态资源，优先使用缓存
    if (STATIC_ASSETS.includes(url.pathname) || 
        url.pathname.startsWith('/_next/static/')) {
      return await cacheFirst(request);
    }
    
    // 对于API请求，优先使用网络
    if (url.pathname.startsWith('/api/')) {
      return await networkFirst(request);
    }
    
    // 对于其他资源，使用网络优先策略
    if (CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
      return await networkFirst(request);
    }
    
    // 对于页面请求，使用网络优先策略
    if (request.destination === 'document') {
      return await networkFirst(request);
    }
    
    // 默认策略：直接请求网络
    return await fetch(request);
    
  } catch (error) {
    console.error('Request handling error:', error);
    
    // 如果是页面请求且网络失败，返回离线页面
    if (request.destination === 'document') {
      return await getOfflinePage();
    }
    
    throw error;
  }
}

// 缓存优先策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // 后台更新缓存
    updateCache(request);
    return cachedResponse;
  }
  
  // 缓存中没有，从网络获取并缓存
  const networkResponse = await fetch(request);
  await cacheResponse(request, networkResponse.clone());
  return networkResponse;
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Serving from cache due to network error:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// 缓存响应
async function cacheResponse(request, response) {
  if (!response.ok) return;
  
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  await cache.put(request, response);
}

// 后台更新缓存
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// 获取离线页面
async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match('/');
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 返回简单的离线页面
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>离线模式 - Excel审核系统</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          background: #f3f4f6;
        }
        .container { 
          text-align: center; 
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #374151; margin-bottom: 1rem; }
        p { color: #6b7280; margin-bottom: 2rem; }
        button { 
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 0.75rem 1.5rem; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>当前处于离线模式</h1>
        <p>网络连接不可用，但您仍可以使用已缓存的功能。</p>
        <button onclick="window.location.reload()">重试连接</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// 消息处理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload?.cacheName).then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'PRELOAD_RESOURCES':
      preloadResources(payload?.urls || []).then(() => {
        event.ports[0].postMessage({ type: 'RESOURCES_PRELOADED' });
      });
      break;
  }
});

// 获取缓存状态
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      size: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}

// 清除缓存
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

// 预加载资源
async function preloadResources(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  const promises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('Failed to preload resource:', url, error);
    }
  });
  
  await Promise.all(promises);
}
