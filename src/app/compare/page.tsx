"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import DualFileUpload from "@/components/DualFileUpload";
import ComparisonResults from "@/components/ComparisonResults";
import UserMenu from "@/components/UserMenu";
import { GentleGradientBackground } from "@/components/LightweightAnimations";
import {
  ExcelComparer,
  ComparisonResult,
  ComparisonProgress,
} from "@/lib/excel-comparer";

export default function ComparePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [progress, setProgress] = useState<ComparisonProgress | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Authentication loading
  if (authLoading) {
    return (
      <GentleGradientBackground className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </GentleGradientBackground>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Not admin - show permission denied
  if (user.role !== "admin") {
    return (
      <GentleGradientBackground className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">权限不足</h2>
          <p className="text-gray-600 mb-6">文件对比功能仅限管理员使用</p>
          <div className="space-y-3">
            <div className="text-sm text-gray-500 bg-gray-100 rounded-lg p-3">
              <p className="font-medium">当前账号信息：</p>
              <p className="mt-1">用户名: {user.username}</p>
              <p>角色: {user.role}</p>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </GentleGradientBackground>
    );
  }

  const handleFilesSelected = (before: File | null, after: File | null) => {
    setBeforeFile(before);
    setAfterFile(after);
    // Clear previous results when files change
    setResult(null);
    setError(null);
  };

  const handleCompare = async () => {
    if (!beforeFile || !afterFile) {
      setError("请先上传原始文件和修改后文件");
      return;
    }

    setIsComparing(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const comparer = new ExcelComparer((prog) => {
        setProgress(prog);
      });

      // Load files
      await comparer.loadFiles(beforeFile, afterFile);

      // Perform comparison
      const comparisonResult = await comparer.compare();

      setResult(comparisonResult);
    } catch (err) {
      console.error("Comparison failed:", err);
      setError(
        err instanceof Error ? err.message : "对比过程中发生错误，请重试"
      );
    } finally {
      setIsComparing(false);
      setProgress(null);
    }
  };

  const handleExport = () => {
    if (!result) return;

    try {
      setIsExporting(true);
      const comparer = new ExcelComparer();
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      comparer.exportToExcel(result, `对比报告_${timestamp}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      setError("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setBeforeFile(null);
    setAfterFile(null);
    setResult(null);
    setError(null);
    setProgress(null);
  };

  return (
    <GentleGradientBackground className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Excel 文件对比</h1>
            <p className="text-gray-600 text-sm mt-1">
              上传两个Excel文件，自动检测所有变更
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← 返回首页
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/multi-review"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
              >
                🚀 多文件审核
              </Link>
            )}
            <UserMenu isBaiduSkin={false} onSwitchSkin={() => {}} />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              上传文件
            </h2>
            <DualFileUpload
              onFilesSelected={handleFilesSelected}
              beforeFile={beforeFile}
              afterFile={afterFile}
              disabled={isComparing}
            />

            {/* Action Buttons */}
            {(beforeFile || afterFile) && (
              <div className="mt-6 flex items-center justify-center space-x-4">
                <button
                  onClick={handleCompare}
                  disabled={!beforeFile || !afterFile || isComparing}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                  {isComparing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      对比中...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                      开始对比
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isComparing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  重置
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {progress.message}
              </h3>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {progress.progress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-400 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">对比失败</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Results */}
          {result && (
            <ComparisonResults
              result={result}
              onExport={handleExport}
              isExporting={isExporting}
            />
          )}
        </div>
      </div>
    </GentleGradientBackground>
  );
}
