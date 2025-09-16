"use client";

import { useState } from "react";

interface FileOptimizationTipsProps {
  fileName?: string;
  fileSize?: number; // in bytes
  error?: string;
}

export default function FileOptimizationTips({
  fileName,
  fileSize,
  error,
}: FileOptimizationTipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fileSizeMB = fileSize ? fileSize / 1024 / 1024 : 0;
  const isLargeFile = fileSizeMB > 300;
  const isVeryLargeFile = fileSizeMB > 1000; // 调整为1GB
  const isHighDensityFile = fileSizeMB > 400 && fileSizeMB < 470; // 特定范围的高密度文件

  // 检查是否是文件大小相关的错误
  const isFileSizeError =
    error &&
    (error.includes("文件过大") ||
      error.includes("内存不足") ||
      error.includes("格式复杂") ||
      error.includes("减少数据行数"));

  if (!isLargeFile && !isFileSizeError) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border p-4 mb-4 ${
        isVeryLargeFile || isFileSizeError
          ? "bg-red-50 border-red-200"
          : "bg-yellow-50 border-yellow-200"
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isVeryLargeFile || isFileSizeError ? (
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3
            className={`text-sm font-medium ${
              isVeryLargeFile || isFileSizeError
                ? "text-red-800"
                : "text-yellow-800"
            }`}
          >
            {isVeryLargeFile || isFileSizeError ? "文件处理失败" : "大文件警告"}
          </h3>
          <div
            className={`mt-2 text-sm ${
              isVeryLargeFile || isFileSizeError
                ? "text-red-700"
                : "text-yellow-700"
            }`}
          >
            {fileName && (
              <p className="mb-2">
                <strong>文件:</strong> {fileName}
                {fileSizeMB > 0 && ` (${fileSizeMB.toFixed(1)}MB)`}
              </p>
            )}

            {isFileSizeError && error && (
              <p className="mb-2 font-medium">{error}</p>
            )}

            <p className="mb-2">
              {isVeryLargeFile || isFileSizeError
                ? "检测到超大文件，处理可能需要较长时间，建议优化："
                : isHighDensityFile
                ? "检测到高密度文件，可能包含大量图片，建议优化："
                : "检测到大文件，建议优化以提高处理速度："}
            </p>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-sm font-medium underline hover:no-underline ${
                isVeryLargeFile || isFileSizeError
                  ? "text-red-800"
                  : "text-yellow-800"
              }`}
            >
              {isExpanded ? "收起" : "查看"} 优化建议
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-8">
          <div
            className={`text-sm ${
              isVeryLargeFile || isFileSizeError
                ? "text-red-700"
                : "text-yellow-700"
            }`}
          >
            <h4 className="font-medium mb-3">📋 文件优化建议：</h4>

            <div className="space-y-3">
              {isHighDensityFile && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                  <h5 className="font-medium mb-1 text-orange-800">
                    ⚡ 高密度文件特别提醒
                  </h5>
                  <p className="text-xs text-orange-700">
                    您的文件每行数据量很大，可能包含超高分辨率图片。这是导致处理困难的主要原因。
                  </p>
                </div>
              )}

              <div>
                <h5 className="font-medium mb-1">
                  🖼️ 图片优化（{isHighDensityFile ? "重点推荐" : "推荐"}）
                </h5>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>删除不必要的图片或截图</li>
                  <li>压缩图片质量（右键图片 → 压缩图片）</li>
                  <li>将高分辨率图片替换为较小尺寸</li>
                  <li>避免粘贴大量截图，改用文字描述</li>
                  {isHighDensityFile && (
                    <li className="text-orange-700 font-medium">
                      ⭐ 特别建议：将图片分辨率降低到800x600以下
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-1">📊 数据优化</h5>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>删除空行和不必要的数据行</li>
                  <li>移除复杂的公式和格式</li>
                  <li>简化单元格格式和样式</li>
                  <li>删除隐藏的工作表</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-1">💾 文件格式优化</h5>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>另存为新的 .xlsx 文件</li>
                  <li>使用"文件 → 另存为 → Excel工作簿"</li>
                  <li>选择"最小文件大小"选项</li>
                  <li>避免使用 .xls 格式（较大且功能受限）</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-1">🔧 Excel操作步骤</h5>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>打开Excel文件</li>
                  <li>删除不需要的图片和数据</li>
                  <li>点击"文件" → "另存为"</li>
                  <li>选择"Excel工作簿 (*.xlsx)"格式</li>
                  <li>保存并重新上传新文件</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-800">
                <strong>💡 提示：</strong>
                系统建议文件大小控制在300MB以内，超过500MB的文件无法处理。
                优化后的文件通常可以减少50-80%的大小。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
