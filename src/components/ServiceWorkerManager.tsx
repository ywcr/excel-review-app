"use client";

import { useState, useEffect } from 'react';

interface CacheStatus {
  [cacheName: string]: {
    size: number;
    urls: string[];
  };
}

interface ServiceWorkerManagerProps {
  onStatusChange?: (status: 'installing' | 'waiting' | 'active' | 'error' | 'unsupported') => void;
}

export default function ServiceWorkerManager({ onStatusChange }: ServiceWorkerManagerProps) {
  const [swStatus, setSwStatus] = useState<'installing' | 'waiting' | 'active' | 'error' | 'unsupported'>('unsupported');
  const [isOnline, setIsOnline] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({});
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // 检查Service Worker支持
    if (!('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      onStatusChange?.('unsupported');
      return;
    }

    // 注册Service Worker
    registerServiceWorker();

    // 监听在线状态
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  const registerServiceWorker = async () => {
    try {
      setSwStatus('installing');
      onStatusChange?.('installing');

      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // 监听Service Worker状态变化
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 有新版本可用
                setUpdateAvailable(true);
                setWaitingWorker(newWorker);
                setSwStatus('waiting');
                onStatusChange?.('waiting');
              } else {
                // 首次安装完成
                setSwStatus('active');
                onStatusChange?.('active');
              }
            }
          });
        }
      });

      // 检查是否已经有激活的Service Worker
      if (registration.active) {
        setSwStatus('active');
        onStatusChange?.('active');
      }

      // 获取缓存状态
      await updateCacheStatus();

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setSwStatus('error');
      onStatusChange?.('error');
    }
  };

  const updateCacheStatus = async () => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const messageChannel = new MessageChannel();
      
      const statusPromise = new Promise<CacheStatus>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_STATUS') {
            resolve(event.data.payload);
          }
        };
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );

      const status = await statusPromise;
      setCacheStatus(status);
    } catch (error) {
      console.error('Failed to get cache status:', error);
    }
  };

  const clearCache = async (cacheName?: string) => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const messageChannel = new MessageChannel();
      
      const clearPromise = new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_CLEARED') {
            resolve();
          }
        };
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE', payload: { cacheName } },
        [messageChannel.port2]
      );

      await clearPromise;
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const activateUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      setWaitingWorker(null);
      
      // 刷新页面以使用新版本
      window.location.reload();
    }
  };

  const preloadResources = async (urls: string[]) => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const messageChannel = new MessageChannel();
      
      const preloadPromise = new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'RESOURCES_PRELOADED') {
            resolve();
          }
        };
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'PRELOAD_RESOURCES', payload: { urls } },
        [messageChannel.port2]
      );

      await preloadPromise;
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to preload resources:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'installing': return 'bg-blue-100 text-blue-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'unsupported': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '已激活';
      case 'installing': return '安装中';
      case 'waiting': return '等待更新';
      case 'error': return '错误';
      case 'unsupported': return '不支持';
      default: return status;
    }
  };

  const formatCacheSize = (size: number) => {
    if (size === 0) return '0 项';
    if (size === 1) return '1 项';
    return `${size} 项`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">离线支持</h3>
        
        <div className="flex items-center space-x-3">
          {/* 在线状态 */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isOnline ? '在线' : '离线'}
            </span>
          </div>
          
          {/* Service Worker状态 */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(swStatus)}`}>
            {getStatusText(swStatus)}
          </span>
        </div>
      </div>

      {/* 更新提示 */}
      {updateAvailable && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">新版本可用</h4>
              <p className="text-sm text-blue-700">发现应用更新，点击更新以获得最新功能。</p>
            </div>
            <button
              onClick={activateUpdate}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              立即更新
            </button>
          </div>
        </div>
      )}

      {/* 缓存状态 */}
      {Object.keys(cacheStatus).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">缓存状态</h4>
          <div className="space-y-2">
            {Object.entries(cacheStatus).map(([cacheName, info]) => (
              <div key={cacheName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">{cacheName}</div>
                  <div className="text-xs text-gray-500">{formatCacheSize(info.size)}</div>
                </div>
                <button
                  onClick={() => clearCache(cacheName)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  清除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => updateCacheStatus()}
          className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          刷新状态
        </button>
        
        <button
          onClick={() => clearCache()}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          清除所有缓存
        </button>
        
        <button
          onClick={() => preloadResources([
            '/frontend-validation',
            '/validation-worker.js',
            '/_next/static/css/',
            '/_next/static/js/'
          ])}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          预加载资源
        </button>
      </div>

      {/* 说明文字 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• 离线支持允许您在没有网络连接时继续使用应用</p>
        <p>• 缓存会自动管理，但您可以手动清除以释放空间</p>
        <p>• 预加载资源可以提高离线使用体验</p>
      </div>
    </div>
  );
}
