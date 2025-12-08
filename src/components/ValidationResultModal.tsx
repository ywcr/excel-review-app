"use client";

import ValidationResults from "./ValidationResults";

interface ValidationResultSimple {
  taskId: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  isValid: boolean;
  errorCount: number;
  totalRows: number;
  validRows: number;
  errors: any[];
  imageValidation?: any;
  headerValidation?: {
    isValid: boolean;
    missingFields: string[];
    unmatchedFields?: string[];
    suggestions?: Array<{
      expected: string;
      actual: string;
      similarity: number;
    }>;
  };
  summary: any;
}

interface ValidationResultModalProps {
  result: ValidationResultSimple | undefined;
  onClose: () => void;
  onExport: () => void;
  isExporting?: boolean;
}

export default function ValidationResultModal({
  result,
  onClose,
  onExport,
  isExporting = false,
}: ValidationResultModalProps) {
  if (!result) return null;

  // 转换格式以兼容 ValidationResults 组件
  const convertedResult = {
    success: true,
    fileName: result.fileName,
    taskName: result.taskType,
    validation: {
      isValid: result.isValid,
      errors: result.errors.map((error) => ({
        sheet: result.sheetName,
        row: error.row,
        column: error.column,
        field: error.field,
        errorType: error.errorType,
        message: error.message,
        value: error.value,
      })),
      summary: result.summary,
      imageValidation: result.imageValidation,
      headerValidation: result.headerValidation,
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">审核结果详情</h2>
            <p className="text-sm text-gray-600 mt-1">
              {result.fileName} - {result.taskType} - {result.sheetName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <ValidationResults
            result={convertedResult}
            onExportErrors={onExport}
            isExporting={isExporting}
          />
        </div>
      </div>
    </div>
  );
}
