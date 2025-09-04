"use client";

import { useState, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import TaskSelector from "@/components/TaskSelector";
import ValidationResults from "@/components/ValidationResults";
import ValidationRequirements from "@/components/ValidationRequirements";
import SheetSelector from "@/components/SheetSelector";

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    sheet: string;
    row: number;
    column: string;
    field: string;
    errorType: string;
    message: string;
    value: any;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
}

interface ValidationResponse {
  success: boolean;
  fileName: string;
  taskName: string;
  validation: ValidationResult;
}

export default function Home() {
  const [availableTasks, setAvailableTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [validationResult, setValidationResult] =
    useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [pendingValidation, setPendingValidation] = useState<{
    file: File;
    taskName: string;
  } | null>(null);
  // Original file buffer disabled to avoid memory issues with large files
  // const [originalFileBuffer, setOriginalFileBuffer] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    // Load available tasks on component mount
    fetch("/api/validate")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAvailableTasks(data.services);
          // Set default to 药店拜访 if available
          if (data.services.includes("药店拜访")) {
            setSelectedTask("药店拜访");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load tasks:", err);
        setError("Failed to load available tasks");
      });
  }, []);

  const handleFileUpload = async (file: File) => {
    setError("");
    setValidationResult(null);
    setUploadedFile(file);
  };

  const handleValidate = async (selectedSheet?: string) => {
    if (!uploadedFile) {
      setError("请先上传文件");
      return;
    }

    if (!selectedTask) {
      setError("请先选择任务类型");
      return;
    }

    setIsLoading(true);
    setError("");
    setValidationResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("taskName", selectedTask);
      if (selectedSheet) {
        formData.append("selectedSheet", selectedSheet);
      }

      const response = await fetch("/api/validate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setValidationResult(result);
        // Original file highlighting disabled to avoid memory issues with large files
      } else if (result.error === "SHEET_NOT_FOUND") {
        // 显示工作表选择器
        setAvailableSheets(result.availableSheets);
        setPendingValidation({ file: uploadedFile, taskName: selectedTask });
        setShowSheetSelector(true);
      } else {
        setError(result.message || result.error || "Validation failed");
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError("验证失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setShowSheetSelector(false);
    if (pendingValidation) {
      await handleValidate(sheetName);
    }
    setPendingValidation(null);
  };

  const handleSheetSelectorCancel = () => {
    setShowSheetSelector(false);
    setPendingValidation(null);
    setAvailableSheets([]);
  };

  const handleExportErrors = async () => {
    if (!validationResult || !selectedTask) {
      setError("No validation result to export");
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      // Build report in browser to avoid API routing issues and large payloads
      const { buildReportBlob } = await import("@/lib/exportErrors");
      const blob = buildReportBlob(
        validationResult.validation,
        validationResult.fileName,
        selectedTask,
        null // Original file highlighting disabled
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      a.download = `${selectedTask}_验证错误报告_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export errors");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excel 审核系统
          </h1>
          <p className="text-gray-700">
            上传您的 Excel 文件，选择对应任务进行自动审核
          </p>
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
                  setValidationResult(null);
                  setError("");
                }}
              />
            </div>
            <div>
              <FileUpload
                onFileUpload={handleFileUpload}
                isLoading={false}
                disabled={false}
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
                    setValidationResult(null);
                    setError("");
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {/* 审核按钮 */}
          {uploadedFile && (
            <div className="mt-6 text-center">
              <button
                onClick={() => handleValidate()}
                disabled={!selectedTask || isLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
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
                    审核中...
                  </>
                ) : validationResult ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    重新审核
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    开始审核
                  </>
                )}
              </button>
              {!selectedTask && uploadedFile && (
                <p className="mt-2 text-sm text-gray-700">请先选择任务类型</p>
              )}
              {selectedTask && uploadedFile && !validationResult && (
                <p className="mt-2 text-sm text-gray-700">
                  点击按钮开始审核文件
                </p>
              )}
              {selectedTask && uploadedFile && validationResult && (
                <p className="mt-2 text-sm text-gray-700">
                  切换任务类型后可重新审核同一文件
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* 验证要求说明 */}
        {selectedTask && (
          <div className="mb-8">
            <ValidationRequirements
              taskName={selectedTask}
              validationResult={validationResult}
            />
          </div>
        )}

        {validationResult && (
          <ValidationResults
            result={validationResult}
            onExportErrors={handleExportErrors}
            isExporting={isExporting}
          />
        )}

        {/* 工作表选择器 */}
        {showSheetSelector && (
          <SheetSelector
            availableSheets={availableSheets}
            taskName={pendingValidation?.taskName || selectedTask}
            onSheetSelect={handleSheetSelect}
            onCancel={handleSheetSelectorCancel}
          />
        )}
      </div>
    </div>
  );
}
