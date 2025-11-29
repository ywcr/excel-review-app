"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useFrontendValidation } from "@/hooks/useFrontendValidation";
import { extractSheetNames, generateTempId } from "@/lib/excelUtils";
import SimpleMultiFileUpload from "@/components/SimpleMultiFileUpload";
import FileListSimple from "@/components/FileListSimple";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import SummaryStats from "@/components/SummaryStats";
import ValidationResultModal from "@/components/ValidationResultModal";
import UserMenu from "@/components/UserMenu";
import {
  UploadedFile,
  ReviewTaskSimple,
  ValidationResultSimple,
} from "@/types/multiFileReview";
import * as XLSX from "xlsx";

export default function MultiReviewPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // 文件列表
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 任务列表
  const [tasks, setTasks] = useState<ReviewTaskSimple[]>([]);

  // 结果列表
  const [results, setResults] = useState<ValidationResultSimple[]>([]);

  // 当前验证中的任务ID
  const [validatingTaskId, setValidatingTaskId] = useState<string | null>(null);

  // 查看结果的任务ID
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 是否正在导出
  const [isExporting, setIsExporting] = useState(false);

  // 上传进度状态
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    current: number;
    currentFileName: string;
  } | null>(null);

  // 复用现有验证 hook
  const { validateExcel, isValidating, progress, result, error } =
    useFrontendValidation();

  // ========== 开始验证任务（内部函数） ==========
  const handleValidateTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const uploadedFile = uploadedFiles.find((f) => f.id === task.fileId);
    if (!uploadedFile) return;

    // 更新任务状态为验证中
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: "validating" as const } : t
      )
    );
    setValidatingTaskId(taskId);

    try {
      // 使用现有验证逻辑，结果会由 useEffect 自动保存
      await validateExcel(
        uploadedFile.file,
        task.taskType,
        task.sheetName,
        true, // includeImageValidation
        false // enableWatermarkDetection
      );
    } catch (err) {
      console.error("❌ 验证失败:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "failed" as const } : t
        )
      );
      setValidatingTaskId(null);
    }
  };

  // 监听验证结果并保存 - 修复依赖项和重复保存问题
  useEffect(() => {
    if (!result || isValidating || !validatingTaskId) return;

    // 跳过需要选择工作表的中间状态
    if ((result as any).needSheetSelection) return;

    // 保存当前任务ID，避免闭包问题
    const currentTaskId = validatingTaskId;

    // 检查是否已经保存过这个任务的结果
    setResults((prevResults) => {
      const alreadyExists = prevResults.some((r) => r.taskId === currentTaskId);
      if (alreadyExists) {
        console.log(`⚠️ 结果已存在，跳过重复保存: ${currentTaskId}`);
        return prevResults;
      }

      // 获取任务信息
      const task = tasks.find((t) => t.id === currentTaskId);
      if (!task) {
        console.log(`⚠️ 未找到任务: ${currentTaskId}`);
        return prevResults;
      }

      const newResult: ValidationResultSimple = {
        taskId: currentTaskId,
        fileId: task.fileId,
        fileName: task.fileName,
        taskType: task.taskType,
        sheetName: task.sheetName,
        isValid: result.isValid,
        errorCount: result.errors?.length || 0,
        totalRows: result.summary?.totalRows || 0,
        validRows: result.summary?.validRows || 0,
        errors: result.errors || [],
        imageValidation: result.imageValidation,
        summary: result.summary,
      };

      console.log(`✅ 保存验证结果: ${task.fileName} - ${task.taskType}`);

      // 更新任务状态为已完成
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === currentTaskId ? { ...t, status: "completed" as const } : t
        )
      );

      // 清除当前验证任务ID
      setValidatingTaskId(null);

      return [...prevResults, newResult];
    });
  }, [result, isValidating, validatingTaskId, tasks]);

  // 自动处理任务队列 - 串行执行
  useEffect(() => {
    // 如果当前没有正在验证的任务，检查是否有待验证的任务
    if (!validatingTaskId && !isValidating) {
      const pendingTask = tasks.find((t) => t.status === "pending");
      if (pendingTask) {
        // 自动开始验证下一个待处理任务
        console.log(
          `🚀 自动开始验证任务: ${pendingTask.fileName} - ${pendingTask.taskType}`
        );
        handleValidateTask(pendingTask.id);
      }
    }
  }, [validatingTaskId, isValidating, tasks]);

  // 如果正在加载认证状态，显示加载界面
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示提示
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录</p>
          <a href="/login" className="text-blue-600 hover:underline">
            前往登录
          </a>
        </div>
      </div>
    );
  }

  // 如果不是管理员，显示权限不足提示
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
          <p className="text-gray-600 mb-6">多文件审核功能仅限管理员使用</p>
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
              返回单文件审核
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ========== 上传文件 ==========
  const handleFilesUpload = async (files: File[]) => {
    const totalFiles = files.length;
    setUploadProgress({ total: totalFiles, current: 0, currentFileName: "" });

    try {
      // 并行处理所有文件以提升性能
      const newFilesPromises = files.map(async (file, index) => {
        // 更新进度
        setUploadProgress({
          total: totalFiles,
          current: index,
          currentFileName: file.name,
        });

        // 提取工作表名称
        const sheets = await extractSheetNames(file);

        return {
          id: generateTempId(),
          file,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: Date.now(),
          availableSheets: sheets,
        };
      });

      const newFiles = await Promise.all(newFilesPromises);

      // 完成上传
      setUploadProgress({
        total: totalFiles,
        current: totalFiles,
        currentFileName: "完成",
      });

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // 清除进度指示器
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (error) {
      console.error("文件上传失败:", error);
      setUploadProgress(null);
    }
  };

  // ========== 创建任务 ==========
  const handleCreateTask = (
    fileId: string,
    taskType: string,
    sheetName: string
  ) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file) return;

    const newTask: ReviewTaskSimple = {
      id: generateTempId(),
      fileId,
      fileName: file.fileName,
      taskType,
      sheetName,
      status: "pending",
    };

    setTasks((prev) => [...prev, newTask]);
  };

  // ========== 清除所有数据（开始新审核） ==========
  const handleClearAll = () => {
    if (confirm("确定清除所有文件和结果？")) {
      setUploadedFiles([]);
      setTasks([]);
      setResults([]);
      setValidatingTaskId(null);
      setSelectedTaskId(null);
    }
  };

  // ========== 删除单个文件 ==========
  const handleDeleteFile = (fileId: string) => {
    // 删除文件
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));

    // 删除关联任务
    const relatedTaskIds = tasks
      .filter((t) => t.fileId === fileId)
      .map((t) => t.id);
    setTasks((prev) => prev.filter((t) => t.fileId !== fileId));

    // 删除关联结果
    setResults((prev) =>
      prev.filter((r) => !relatedTaskIds.includes(r.taskId))
    );
  };

  // ========== 删除单个任务 ==========
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setResults((prev) => prev.filter((r) => r.taskId !== taskId));
  };

  // ========== 导出任务结果 ==========
  const handleExportTaskResult = (taskId: string) => {
    const taskResult = results.find((r) => r.taskId === taskId);
    if (!taskResult) return;

    try {
      setIsExporting(true);

      // 构建 Excel
      const structHeader = ["单元格", "问题类型", "问题说明", "当前值"];
      const structAOA: any[][] = [structHeader];

      const typeLabel: Record<string, string> = {
        required: "必填项缺失",
        enum: "类型不符",
        timeRange: "时间范围错误",
        duration: "时长不符",
        dateInterval: "日期间隔冲突",
        frequency: "频次超限",
        unique: "重复值",
        structure: "结构错误",
        dateFormat: "日期格式错误",
        prohibitedContent: "禁用内容",
      };

      if (taskResult.errors.length === 0) {
        structAOA.push(["", "", "无结构问题", ""]);
      } else {
        for (const e of taskResult.errors) {
          const col = e.column ?? "";
          const row = e.row ?? "";
          const cell = col && row ? `${col}${row}` : "";
          structAOA.push([
            cell,
            typeLabel[e.errorType] || e.errorType || "",
            e.message ?? "",
            e.value !== undefined ? String(e.value) : "",
          ]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(structAOA);
      ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 20 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "验证问题");

      const filename = `${taskResult.fileName}_${taskResult.taskType}_问题报告.xlsx`;
      XLSX.writeFile(wb, filename);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Excel 多文件审核</h1>
            <p className="text-sm text-gray-600 mt-1">
              临时存储 · 下次审核自动清除
            </p>
          </div>

          <div className="flex space-x-3">
            {user?.role === "admin" && (
              <Link
                href="/compare"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
              >
                📊 文件对比
              </Link>
            )}
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              ← 返回单文件审核
            </Link>
            {(uploadedFiles.length > 0 || tasks.length > 0) && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
              >
                清空所有
              </button>
            )}
            <UserMenu isBaiduSkin={false} onSwitchSkin={() => {}} />
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：上传 & 文件列表 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">上传文件</h2>
              <SimpleMultiFileUpload
                onFilesUpload={handleFilesUpload}
                disabled={isValidating || uploadProgress !== null}
              />
            </div>

            {/* 上传进度指示器 */}
            {uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">
                    正在处理文件...
                  </h3>
                  <span className="text-sm text-blue-600">
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${
                        (uploadProgress.current / uploadProgress.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-sm text-blue-700 truncate">
                  {uploadProgress.currentFileName}
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-4">
              <FileListSimple
                files={uploadedFiles}
                tasks={tasks}
                onDeleteFile={handleDeleteFile}
                onCreateTask={handleCreateTask}
              />
            </div>
          </div>

          {/* 右侧：任务 & 结果 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <TaskExecutionPanel
                tasks={tasks}
                results={results}
                validatingTaskId={validatingTaskId}
                onViewResult={(taskId) => setSelectedTaskId(taskId)}
                onDeleteTask={handleDeleteTask}
              />
            </div>

            {/* 进度显示 */}
            {progress && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">验证进度</h3>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(progress.progress || 0, 100)}%`,
                    }}
                  ></div>
                </div>
                {progress.message && (
                  <p className="text-sm text-gray-600 mt-2">
                    {progress.message}
                  </p>
                )}
              </div>
            )}

            {/* 错误显示 */}
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
                    <h3 className="text-sm font-medium text-red-800">
                      验证失败
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 汇总统计 */}
            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">审核汇总</h3>
                <SummaryStats tasks={tasks} results={results} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 结果查看器 */}
      {selectedTaskId && (
        <ValidationResultModal
          result={results.find((r) => r.taskId === selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onExport={() => handleExportTaskResult(selectedTaskId)}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
