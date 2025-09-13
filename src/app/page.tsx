"use client";

import { useState, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import TaskSelector from "@/components/TaskSelector";
import ValidationRequirements from "@/components/ValidationRequirements";
import ValidationResults from "@/components/ValidationResults";
import FrontendSheetSelector from "@/components/FrontendSheetSelector";
import { useFrontendValidation } from "@/hooks/useFrontendValidation";
import { getAvailableTasks } from "@/lib/validationRules";
import {
  AnimationProvider,
  GentleGradientBackground,
  WarmButton,
  WarmProgressBar,
  SuccessAnimation,
} from "@/components/LightweightAnimations";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

function HomeContent() {
  const availableTasks = getAvailableTasks();
  const [selectedTask, setSelectedTask] = useState<string>(
    availableTasks[0] || ""
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [includeImageValidation, setIncludeImageValidation] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // 性能监控和动画控制
  const { updateMetrics, isAnimationEnabled } = usePerformanceMode();

  const {
    isValidating,
    progress,
    result,
    error,
    validateExcel,
    cancelValidation,
    clearResult,
  } = useFrontendValidation();

  // 监听验证结果，只有在真正成功时才显示成功动画
  useEffect(() => {
    if (result && result.isValid && !isValidating) {
      // 验证成功完成，显示成功动画
      setShowSuccessAnimation(true);
    }
  }, [result, isValidating]);

  const handleFileUpload = (file: File) => {
    // 如果已有上传的文件，先触发重新上传逻辑
    if (uploadedFile) {
      setUploadedFile(null);
      clearResult();
      // 使用setTimeout确保状态更新完成后再设置新文件
      setTimeout(() => {
        setUploadedFile(file);
        clearResult();
      }, 0);
    } else {
      setUploadedFile(file);
      clearResult();
    }
  };

  const handleValidate = async () => {
    if (!uploadedFile || !selectedTask) return;

    try {
      // 更新性能指标 - 开始处理
      updateMetrics({
        isProcessing: true,
        imageCount: includeImageValidation ? 100 : 0, // 估算值，实际会在Worker中更新
      });

      // 传递图片验证选项到validateExcel
      await validateExcel(
        uploadedFile,
        selectedTask,
        undefined,
        includeImageValidation
      );

      // 验证完成 - 更新性能指标
      updateMetrics({ isProcessing: false });

      // 验证完成后添加到历史记录
      // 注意：这里需要等待result更新，所以我们在useEffect中处理
    } catch (err) {
      console.error("Validation failed:", err);
      updateMetrics({ isProcessing: false });
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setShowSheetSelector(false);

    if (!uploadedFile || !selectedTask) return;

    try {
      await validateExcel(
        uploadedFile,
        selectedTask,
        sheetName,
        includeImageValidation
      );
    } catch (err) {
      console.error("Validation with selected sheet failed:", err);
    }
  };

  const handleSheetSelectorCancel = () => {
    setShowSheetSelector(false);
    // 清理验证状态
    clearResult();
    // 取消任何正在进行的验证
    if (isValidating) {
      cancelValidation();
    }
  };

  // 处理需要选择工作表的情况
  if (result?.needSheetSelection && !showSheetSelector) {
    setShowSheetSelector(true);
  }

  // 转换验证结果格式以兼容ValidationResults组件
  const convertedValidationResult = result
    ? {
        success: true,
        fileName: uploadedFile?.name || "",
        taskName: selectedTask,
        validation: {
          isValid: result.isValid,
          errors: (result.errors || []).map((error) => ({
            sheet: "Sheet1", // 前端验证暂时使用固定sheet名
            row: error.row,
            column: error.column,
            field: error.field,
            errorType: error.errorType,
            message: error.message,
            value: error.value,
          })),
          summary: result.summary || {
            totalRows: 0,
            validRows: 0,
            errorCount: 0,
          },
          imageValidation: result.imageValidation,
        },
      }
    : null;

  const handleExportErrors = async () => {
    if (
      !result ||
      (!result.errors?.length && !result.imageValidation?.results?.length)
    )
      return;

    setIsExporting(true);
    try {
      const csvRows = [];

      // CSV标题行
      csvRows.push(
        [
          "类型",
          "位置/ID",
          "列名",
          "字段",
          "错误类型",
          "错误信息",
          "值",
          "清晰度分数",
          "重复图片",
        ].join(",")
      );

      // 添加Excel验证错误
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error) => {
          csvRows.push(
            [
              "Excel验证",
              error.row,
              error.column,
              error.field,
              error.errorType,
              `"${error.message.replace(/"/g, '""')}"`,
              `"${String(error.value || "").replace(/"/g, '""')}"`,
              "",
              "",
            ].join(",")
          );
        });
      }

      // 添加图片验证错误
      if (result.imageValidation && result.imageValidation.results) {
        result.imageValidation.results
          .filter(
            (imgResult) => imgResult.isBlurry || imgResult.duplicates.length > 0
          )
          .forEach((imgResult) => {
            const problemTypes = [];
            if (imgResult.isBlurry) problemTypes.push("模糊");
            if (imgResult.duplicates.length > 0) problemTypes.push("重复");

            csvRows.push(
              [
                "图片验证",
                `${imgResult.id}${
                  imgResult.row ? ` (第${imgResult.row}行)` : ""
                }`,
                imgResult.position || "未知位置",
                "",
                problemTypes.join("+"),
                imgResult.isBlurry ? "图片清晰度低于阈值" : "图片重复",
                "",
                imgResult.sharpness.toFixed(1),
                imgResult.duplicates.length > 0
                  ? `"${imgResult.duplicates
                      .map((d) => {
                        // 兼容性处理：支持旧格式(string)和新格式(object)
                        if (typeof d === "string") {
                          return d;
                        }
                        return `${d.id}${d.row ? ` (第${d.row}行)` : ""}`;
                      })
                      .join(", ")}"`
                  : "",
              ].join(",")
            );
          });
      }

      const csvContent = csvRows.join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `验证错误_${uploadedFile?.name || "unknown"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <GentleGradientBackground className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center mb-8 relative">
          {/* 功能按钮组 */}
          <div className="absolute top-0 right-0 flex gap-1">
            {/* 氛围设置按钮已移除 */}
          </div>

          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Excel 审核系统 - 前端解析版 🚀
          </h1>
          <p className="text-gray-700">
            上传您的 Excel 文件，选择对应任务进行自动审核
          </p>
          <div className="mt-2 space-y-1">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              🚀 当前使用：前端解析流程
            </div>
            <div className="text-xs text-gray-500">
              更快、更安全、无需上传文件到服务器
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <TaskSelector
                tasks={availableTasks}
                selectedTask={selectedTask}
                onTaskChange={(task) => {
                  setSelectedTask(task);
                  // 切换任务类型时清除之前的验证结果
                  clearResult();
                }}
              />
            </div>
            <div>
              <FileUpload
                onFileUpload={handleFileUpload}
                uploadedFile={uploadedFile}
                isLoading={isValidating}
              />
            </div>
          </div>

          {/* 文件上传状态显示 */}
          {uploadedFile && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    已上传文件：{uploadedFile.name}
                  </p>
                  <p className="text-blue-600 text-sm">
                    文件大小：{(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    clearResult();
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {/* 验证选项 */}
          {uploadedFile && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                验证选项
              </h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeImageValidation}
                  onChange={(e) => setIncludeImageValidation(e.target.checked)}
                  className="mr-3 text-blue-600"
                />
                <span className="text-gray-700 text-sm">
                  包含图片验证（清晰度检测和重复检测）
                </span>
              </label>
            </div>
          )}

          {/* 审核按钮 */}
          {uploadedFile && (
            <div className="mt-6 text-center">
              <WarmButton
                onClick={() => handleValidate()}
                disabled={!selectedTask || isValidating}
                variant="primary"
                className="inline-flex items-center px-6 py-3 text-base font-medium"
              >
                {isValidating ? (
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
                    验证中...
                  </>
                ) : (
                  "开始审核 ✨"
                )}
              </WarmButton>

              {isValidating && (
                <button
                  onClick={cancelValidation}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
              )}
            </div>
          )}
        </div>

        {/* 进度显示 */}
        {progress && (
          <div className="mb-6">
            <div className="bg-white border border-pink-200 rounded-lg p-6 shadow-sm">
              <WarmProgressBar
                progress={progress.progress}
                message={progress.message}
              />
            </div>
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="mb-6">
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
                  <h3 className="text-sm font-medium text-red-800">验证失败</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 验证要求显示 */}
        {selectedTask && (
          <ValidationRequirements
            taskName={selectedTask}
            validationResult={convertedValidationResult}
          />
        )}

        {/* 验证结果显示 */}
        {convertedValidationResult && (
          <ValidationResults
            result={convertedValidationResult}
            onExportErrors={handleExportErrors}
            isExporting={isExporting}
          />
        )}

        {/* 工作表选择器 */}
        {showSheetSelector && result?.availableSheets && (
          <FrontendSheetSelector
            availableSheets={result.availableSheets}
            onSheetSelect={handleSheetSelect}
            onCancel={handleSheetSelectorCancel}
          />
        )}

        {/* 成功动画 */}
        <SuccessAnimation
          show={showSuccessAnimation}
          message="审核完成！✨"
          onComplete={() => setShowSuccessAnimation(false)}
        />
      </div>
    </GentleGradientBackground>
  );
}

// 导出包装了动画提供者的主组件
export default function Home() {
  return (
    <AnimationProvider>
      <HomeContent />
    </AnimationProvider>
  );
}
