"use client";

import { useState, useMemo } from 'react';

interface ValidationError {
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value: any;
}

interface EnhancedErrorDisplayProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  maxDisplayErrors?: number;
}

export default function EnhancedErrorDisplay({ 
  errors, 
  onErrorClick,
  maxDisplayErrors = 100 
}: EnhancedErrorDisplayProps) {
  const [filter, setFilter] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'row' | 'type' | 'field'>('row');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 错误类型统计
  const errorStats = useMemo(() => {
    const stats = new Map<string, number>();
    errors.forEach(error => {
      stats.set(error.errorType, (stats.get(error.errorType) || 0) + 1);
    });
    return stats;
  }, [errors]);

  // 过滤和排序错误
  const filteredAndSortedErrors = useMemo(() => {
    let filtered = errors;

    // 应用过滤器
    if (filter) {
      const filterLower = filter.toLowerCase();
      filtered = filtered.filter(error => 
        error.message.toLowerCase().includes(filterLower) ||
        error.field.toLowerCase().includes(filterLower) ||
        String(error.value).toLowerCase().includes(filterLower)
      );
    }

    // 应用类型过滤
    if (selectedType !== 'all') {
      filtered = filtered.filter(error => error.errorType === selectedType);
    }

    // 应用排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'row':
          comparison = a.row - b.row;
          break;
        case 'type':
          comparison = a.errorType.localeCompare(b.errorType);
          break;
        case 'field':
          comparison = a.field.localeCompare(b.field);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [errors, filter, selectedType, sortBy, sortOrder]);

  // 分页
  const totalPages = Math.ceil(filteredAndSortedErrors.length / pageSize);
  const paginatedErrors = filteredAndSortedErrors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: 'row' | 'type' | 'field') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleErrorClick = (error: ValidationError) => {
    onErrorClick?.(error);
  };

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'required': 'bg-red-100 text-red-800',
      'format': 'bg-orange-100 text-orange-800',
      'range': 'bg-yellow-100 text-yellow-800',
      'unique': 'bg-purple-100 text-purple-800',
      'frequency': 'bg-blue-100 text-blue-800',
      'dateInterval': 'bg-green-100 text-green-800',
      'timeRange': 'bg-indigo-100 text-indigo-800',
      'duration': 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getErrorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'required': '必填项',
      'format': '格式错误',
      'range': '范围错误',
      'unique': '重复值',
      'frequency': '频次超限',
      'dateInterval': '日期间隔',
      'timeRange': '时间范围',
      'duration': '持续时间',
    };
    return labels[type] || type;
  };

  if (errors.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">验证通过，未发现错误！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          验证错误 ({filteredAndSortedErrors.length}/{errors.length})
        </h3>
        
        {/* 错误统计 */}
        <div className="flex flex-wrap gap-2">
          {Array.from(errorStats.entries()).map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(type)}`}
            >
              {getErrorTypeLabel(type)}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* 过滤和排序控件 */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <input
            type="text"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="搜索错误信息、字段或值..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">错误类型</label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全部类型</option>
            {Array.from(errorStats.keys()).map(type => (
              <option key={type} value={type}>
                {getErrorTypeLabel(type)} ({errorStats.get(type)})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'row' | 'type' | 'field')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="row">按行号</option>
              <option value="type">按类型</option>
              <option value="field">按字段</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* 错误列表 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('row')}
              >
                行号 {sortBy === 'row' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                列
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('field')}
              >
                字段 {sortBy === 'field' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                类型 {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                错误信息
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                值
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedErrors.map((error, index) => (
              <tr 
                key={index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleErrorClick(error)}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {error.row}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {error.column}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {error.field}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(error.errorType)}`}>
                    {getErrorTypeLabel(error.errorType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={error.message}>
                    {error.message}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={String(error.value)}>
                    {String(error.value || '')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedErrors.length)} 
            / {filteredAndSortedErrors.length} 条错误
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <span className="px-3 py-1 text-sm">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• 点击错误行可跳转到对应的Excel单元格</p>
        <p>• 点击列标题可进行排序</p>
        <p>• 使用搜索框可快速定位特定错误</p>
      </div>
    </div>
  );
}
