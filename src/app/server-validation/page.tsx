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

export default function ServerValidationPage() {
  const [availableTasks, setAvailableTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Sheet selector state
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<Array<{name: string, hasData: boolean}>>([]);
  const [pendingValidation, setPendingValidation] = useState<{file: File, taskName: string} | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  useEffect(() => {
    fetchAvailableTasks();
  }, []);

  const fetchAvailableTasks = async () => {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();
      if (data.success) {
        setAvailableTasks(data.tasks);
        if (data.tasks.length > 0) {
          setSelectedTask(data.tasks[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setValidationResult(null);
    setError(null);
    setSelectedSheet("");
  };

  const handleTaskChange = (task: string) => {
    setSelectedTask(task);
    setValidationResult(null);
    setError(null);
  };

  const handleValidate = async () => {
    if (!uploadedFile || !selectedTask) {
      setError("Please select a file and task");
      return;
    }

    setIsValidating(true);
    setError(null);
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
    } catch (error) {
      console.error("Validation error:", error);
      setError("An error occurred during validation");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!pendingValidation) return;
    
    setSelectedSheet(sheetName);
    setShowSheetSelector(false);
    
    // 重新验证，使用选定的工作表
    setIsValidating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", pendingValidation.file);
      formData.append("taskName", pendingValidation.taskName);
      formData.append("selectedSheet", sheetName);

      const response = await fetch("/api/validate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setValidationResult(result);
      } else {
        setError(result.message || result.error || "Validation failed");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setError("An error occurred during validation");
    } finally {
      setIsValidating(false);
      setPendingValidation(null);
    }
  };

  const handleSheetSelectorCancel = () => {
    setShowSheetSelector(false);
    setPendingValidation(null);
    setIsValidating(false);
  };

  const handleExportErrors = async () => {
    if (!validationResult?.validation?.errors) return;

    setIsExporting(true);
    try {
      const { exportErrorsToExcel } = await import("@/lib/exportErrors");
      await exportErrorsToExcel(
        validationResult.validation.errors,
        validationResult.fileName || "validation_errors"
      );
    } catch (error) {
      console.error("Export failed:", error);
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
            Excel 审核系统 - 服务端验证
          </h1>
          <p className="text-gray-700">
            上传您的 Excel 文件，选择对应任务进行自动审核
          </p>
        </div>

        {/* 任务选择 */}
        <div className="mb-8">
          <TaskSelector
            tasks={availableTasks}
            selectedTask={selectedTask}
            onTaskChange={handleTaskChange}
          />
        </div>

        {/* 验证要求显示 */}
        {selectedTask && (
          <div className="mb-8">
            <ValidationRequirements taskName={selectedTask} />
          </div>
        )}

        {/* 文件上传 */}
        <div className="mb-8">
          <FileUpload
            onFileUpload={handleFileUpload}
            uploadedFile={uploadedFile}
            isLoading={isValidating}
          />
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 验证结果 */}
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
            availableSheets={(availableSheets || []).map((s) => s.name)}
            taskName={pendingValidation?.taskName || selectedTask}
            onSheetSelect={handleSheetSelect}
            onCancel={handleSheetSelectorCancel}
          />
        )}
      </div>
    </div>
  );
}
