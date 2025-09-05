"use client";

import { useState, useEffect } from 'react';

interface TemplateValidation {
  isValid: boolean;
  errors: string[];
}

interface CacheItem {
  taskName: string;
  source: string;
  age: number;
}

interface TemplateStatusData {
  taskName: string;
  validation: TemplateValidation;
  cache: CacheItem | null;
  timestamp: string;
}

interface TemplateStatusProps {
  taskNames: string[];
  onConfigUpdate?: (config: any) => void;
}

export default function TemplateStatus({ taskNames, onConfigUpdate }: TemplateStatusProps) {
  const [statuses, setStatuses] = useState<TemplateStatusData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    source: 'local',
    localPath: '/data/模板总汇.xlsx',
    cacheTimeout: 300000 // 5分钟
  });

  // 检查单个模板状态
  const checkTemplateStatus = async (taskName: string): Promise<TemplateStatusData | null> => {
    try {
      const response = await fetch(`/api/templates/validate?taskName=${encodeURIComponent(taskName)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to check template ${taskName}:`, error);
      return null;
    }
  };

  // 检查所有模板状态
  const checkAllStatuses = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        taskNames.map(taskName => checkTemplateStatus(taskName))
      );

      const validResults = results.filter(result => result !== null) as TemplateStatusData[];
      setStatuses(validResults);
    } catch (error) {
      setError('Failed to check template statuses');
      console.error('Template status check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 预加载模板
  const preloadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/templates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preload',
          taskNames
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 重新检查状态
      await checkAllStatuses();
    } catch (error) {
      setError('Failed to preload templates');
      console.error('Template preload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 清除缓存
  const clearCache = async (taskName?: string) => {
    try {
      const response = await fetch('/api/templates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearCache',
          taskName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 重新检查状态
      await checkAllStatuses();
    } catch (error) {
      setError('Failed to clear cache');
      console.error('Cache clear error:', error);
    }
  };

  // 更新配置
  const updateConfig = async () => {
    try {
      const response = await fetch('/api/templates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateConfig',
          config
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      onConfigUpdate?.(result.config);
      
      // 重新检查状态
      await checkAllStatuses();
    } catch (error) {
      setError('Failed to update config');
      console.error('Config update error:', error);
    }
  };

  // 格式化时间
  const formatAge = (age: number) => {
    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // 初始加载
  useEffect(() => {
    checkAllStatuses();
  }, [taskNames]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">模板状态监控</h3>
        <div className="flex space-x-2">
          <button
            onClick={checkAllStatuses}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            刷新
          </button>
          <button
            onClick={preloadTemplates}
            disabled={loading}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            预加载
          </button>
          <button
            onClick={() => clearCache()}
            disabled={loading}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            清除缓存
          </button>
        </div>
      </div>

      {/* 配置区域 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">模板配置</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              数据源
            </label>
            <select
              value={config.source}
              onChange={(e) => setConfig({ ...config, source: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="local">本地文件</option>
              <option value="remote">远程URL</option>
              <option value="embedded">内嵌模板</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              本地路径
            </label>
            <input
              type="text"
              value={config.localPath}
              onChange={(e) => setConfig({ ...config, localPath: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              placeholder="/data/模板总汇.xlsx"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              缓存超时(秒)
            </label>
            <input
              type="number"
              value={config.cacheTimeout / 1000}
              onChange={(e) => setConfig({ ...config, cacheTimeout: Number(e.target.value) * 1000 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              min="0"
            />
          </div>
        </div>
        <button
          onClick={updateConfig}
          disabled={loading}
          className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          更新配置
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">正在检查模板状态...</p>
        </div>
      )}

      {/* 状态列表 */}
      <div className="space-y-3">
        {statuses.map((status) => (
          <div
            key={status.taskName}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{status.taskName}</h4>
              <div className="flex items-center space-x-2">
                {status.validation.isValid ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ 有效
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ 无效
                  </span>
                )}
                {status.cache && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    缓存: {formatAge(status.cache.age)}
                  </span>
                )}
              </div>
            </div>

            {status.cache && (
              <div className="text-sm text-gray-600 mb-2">
                数据源: {status.cache.source}
              </div>
            )}

            {!status.validation.isValid && status.validation.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-800 mb-1">错误:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {status.validation.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {statuses.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>暂无模板状态数据</p>
        </div>
      )}
    </div>
  );
}
