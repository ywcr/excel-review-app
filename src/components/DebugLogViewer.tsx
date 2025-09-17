import React, { useState, useRef, useEffect } from 'react';
import { DebugLogEntry } from '@/hooks/useFrontendValidation';

interface DebugLogViewerProps {
  logs: DebugLogEntry[];
  onClear: () => void;
  isVisible: boolean;
  onToggle: () => void;
}

const DebugLogViewer: React.FC<DebugLogViewerProps> = ({
  logs,
  onClear,
  isVisible,
  onToggle,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'ALL' || log.level === filterLevel;
    const stageMatch = filterStage === 'ALL' || log.stage === filterStage;
    const searchMatch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.stage.toLowerCase().includes(searchTerm.toLowerCase());
    
    return levelMatch && stageMatch && searchMatch;
  });

  // 获取所有唯一的阶段
  const uniqueStages = Array.from(new Set(logs.map(log => log.stage)));

  // 日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // 阶段颜色
  const getStageColor = (stage: string) => {
    const colors = [
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    const hash = stage.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  // 导出日志
  const exportLogs = () => {
    const logText = filteredLogs.map(log => {
      const data = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : '';
      return `[${formatTimestamp(log.timestamp)}] [${log.level}] [${log.stage}] ${log.message}${data}`;
    }).join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          调试日志 ({logs.length})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            图片处理调试日志 ({filteredLogs.length}/{logs.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLogs}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              导出日志
            </button>
            <button
              onClick={onClear}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              清除日志
            </button>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">级别:</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="ALL">全部</option>
              <option value="ERROR">错误</option>
              <option value="WARN">警告</option>
              <option value="INFO">信息</option>
              <option value="DEBUG">调试</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">阶段:</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="ALL">全部</option>
              {uniqueStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">搜索:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索日志内容..."
              className="text-sm border border-gray-300 rounded px-2 py-1 w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              自动滚动
            </label>
          </div>
        </div>

        {/* 日志内容 */}
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-auto p-4 bg-gray-900 text-green-400 font-mono text-sm"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {logs.length === 0 ? '暂无日志' : '没有匹配的日志'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="mb-2 border-l-2 border-gray-600 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 text-xs">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStageColor(log.stage)}`}>
                    {log.stage}
                  </span>
                </div>
                <div className="text-green-300 mb-1">
                  {log.message}
                </div>
                {log.data && (
                  <details className="text-gray-400 text-xs">
                    <summary className="cursor-pointer hover:text-gray-300">
                      详细数据 ▼
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugLogViewer;
