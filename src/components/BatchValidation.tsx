"use client";

import { useState, useRef } from 'react';
import { useFrontendValidation } from '@/hooks/useFrontendValidation';

interface BatchFile {
  id: string;
  file: File;
  taskName: string;
  status: 'pending' | 'validating' | 'completed' | 'error';
  result?: any;
  error?: string;
  progress?: number;
}

interface BatchValidationProps {
  availableTasks: Array<{ value: string; label: string }>;
  onBatchComplete?: (results: BatchFile[]) => void;
}

export default function BatchValidation({ availableTasks, onBatchComplete }: BatchValidationProps) {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { validateExcel } = useFrontendValidation();

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: BatchFile[] = Array.from(selectedFiles).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      taskName: availableTasks[0]?.value || '',
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const updateFileTask = (fileId: string, taskName: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, taskName } : file
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const startBatchValidation = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      setCurrentFileIndex(i);
      
      // 更新状态为验证中
      updatedFiles[i] = { ...file, status: 'validating', progress: 0 };
      setFiles([...updatedFiles]);

      try {
        // 这里需要创建一个独立的验证实例，因为useFrontendValidation是单例
        const result = await validateSingleFile(file.file, file.taskName);
        
        updatedFiles[i] = { 
          ...file, 
          status: 'completed', 
          result,
          progress: 100 
        };
      } catch (error) {
        updatedFiles[i] = { 
          ...file, 
          status: 'error', 
          error: error instanceof Error ? error.message : '验证失败',
          progress: 0
        };
      }

      setFiles([...updatedFiles]);
    }

    setCurrentFileIndex(-1);
    setIsProcessing(false);
    onBatchComplete?.(updatedFiles);
  };

  // 独立的文件验证函数
  const validateSingleFile = async (file: File, taskName: string) => {
    // 这里应该使用独立的验证逻辑，避免与主验证器冲突
    // 暂时返回模拟结果
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isValid: Math.random() > 0.3,
          errors: [],
          summary: {
            totalRows: Math.floor(Math.random() * 1000) + 100,
            validRows: Math.floor(Math.random() * 900) + 50,
            errorCount: Math.floor(Math.random() * 50)
          }
        });
      }, 2000 + Math.random() * 3000);
    });
  };

  const exportBatchResults = () => {
    const completedFiles = files.filter(file => file.status === 'completed');
    
    if (completedFiles.length === 0) {
      alert('没有可导出的验证结果');
      return;
    }

    // 创建汇总报告
    const summary = {
      totalFiles: files.length,
      completedFiles: completedFiles.length,
      errorFiles: files.filter(file => file.status === 'error').length,
      validFiles: completedFiles.filter(file => file.result?.isValid).length,
      invalidFiles: completedFiles.filter(file => !file.result?.isValid).length,
      totalRows: completedFiles.reduce((sum, file) => sum + (file.result?.summary?.totalRows || 0), 0),
      totalErrors: completedFiles.reduce((sum, file) => sum + (file.result?.summary?.errorCount || 0), 0)
    };

    // 生成CSV报告
    const csvContent = [
      ['文件名', '任务类型', '状态', '总行数', '有效行数', '错误数', '验证结果'].join(','),
      ...files.map(file => [
        file.file.name,
        file.taskName,
        file.status === 'completed' ? '已完成' : file.status === 'error' ? '失败' : '处理中',
        file.result?.summary?.totalRows || 0,
        file.result?.summary?.validRows || 0,
        file.result?.summary?.errorCount || 0,
        file.result?.isValid ? '通过' : '未通过'
      ].join(','))
    ].join('\n');

    // 下载CSV文件
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `批量验证报告_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'validating': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'validating': return '验证中';
      case 'completed': return '已完成';
      case 'error': return '失败';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">批量验证</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            选择文件
          </button>
          <button
            onClick={startBatchValidation}
            disabled={files.length === 0 || isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? '验证中...' : '开始批量验证'}
          </button>
          <button
            onClick={exportBatchResults}
            disabled={files.filter(f => f.status === 'completed').length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            导出结果
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* 批量进度 */}
      {isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              正在验证: {currentFileIndex + 1} / {files.length}
            </span>
            <span className="text-sm text-blue-700">
              {Math.round(((currentFileIndex + 1) / files.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentFileIndex + 1) / files.length) * 100}%` }}
            />
          </div>
          {currentFileIndex >= 0 && currentFileIndex < files.length && (
            <p className="text-sm text-blue-700 mt-2">
              当前文件: {files[currentFileIndex]?.file.name}
            </p>
          )}
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  任务类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  结果
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={file.file.name}>
                      {file.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {file.status === 'pending' ? (
                      <select
                        value={file.taskName}
                        onChange={(e) => updateFileTask(file.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={isProcessing}
                      >
                        {availableTasks.map(task => (
                          <option key={task.value} value={task.value}>
                            {task.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-900">{file.taskName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                      {getStatusLabel(file.status)}
                    </span>
                    {file.status === 'validating' && file.progress !== undefined && (
                      <div className="mt-1 w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {file.status === 'completed' && file.result && (
                      <div>
                        <div className={`text-xs ${file.result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {file.result.isValid ? '✓ 验证通过' : '✗ 验证失败'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {file.result.summary?.totalRows || 0} 行, {file.result.summary?.errorCount || 0} 错误
                        </div>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="text-xs text-red-600" title={file.error}>
                        错误: {file.error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => removeFile(file.id)}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>请选择要批量验证的Excel文件</p>
          <p className="text-sm mt-1">支持同时选择多个文件</p>
        </div>
      )}
    </div>
  );
}
