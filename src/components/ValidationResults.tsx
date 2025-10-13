import { useState, useRef } from "react";
import { ImagePreview, ImageModal, LazyImagePreview } from "./ImagePreview";

interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
  imageValidation?: {
    totalImages: number;
    blurryImages: number;
    duplicateGroups: number;
    results: Array<{
      id: string;
      sharpness: number;
      isBlurry: boolean;
      duplicates: Array<{
        id: string;
        position?: string;
        row?: number;
        column?: string;
      }>;
      position?: string; // Excel位置，如 "A4", "B5"
      row?: number; // Excel行号
      column?: string; // Excel列号
      imageData?: number[]; // Worker传递的数组格式
      mimeType?: string;
      size?: number;
      // 新增：尺寸/比例信息（手机拍摄启发式）
      width?: number;
      height?: number;
      megapixels?: number;
      dimensionOK?: boolean;
      dimensionIssue?: string;
      // 网图嫌疑度
      webLikelihood?: number;
      webReasons?: string[];
      isLowPixel?: boolean;
      // 边框检测结果
      hasBorder?: boolean;
      borderSides?: string[];
      borderWidth?: { top?: number; bottom?: number; left?: number; right?: number };
    }>;
    warning?: string; // 图片解析警告（例如 .xls 不支持）
  };
}

interface ValidationResponse {
  success: boolean;
  fileName: string;
  taskName: string;
  validation: ValidationResult;
}

interface ValidationResultsProps {
  result: ValidationResponse;
  onExportErrors?: () => void;
  isExporting?: boolean;
}

export default function ValidationResults({
  result,
  onExportErrors,
  isExporting = false,
}: ValidationResultsProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const errorsPerPage = 10;
  const [selectedImage, setSelectedImage] = useState<{
    data: Uint8Array;
    mimeType: string;
    id: string;
    position?: string;
  } | null>(null);
  // 图片问题过滤（默认全部显示）
  const [imageFilter, setImageFilter] = useState<{
    blurry: boolean;
    duplicate: boolean;
    dimension: boolean;
    web: boolean;
    lowPixel: boolean;
    border: boolean;
  }>({ blurry: true, duplicate: true, dimension: true, web: true, lowPixel: true, border: true });

  // 行高亮定位：为图片问题行建立ref映射
  const imageRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const scrollToImageRow = (rowId: string) => {
    const el = imageRowRefs.current[rowId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedRowId(rowId);
      // 2秒后取消高亮
      window.setTimeout(
        () => setHighlightedRowId((id) => (id === rowId ? null : id)),
        2000
      );
    }
  };

  const { validation, fileName, taskName } = result;
  const { errors, summary } = validation;
  const imageResults = validation.imageValidation?.results ?? [];
  const hasExportableImageIssues = imageResults.some((r: any) => (r.duplicates?.length ?? 0) > 0);

  // Filter errors by type
  const filteredErrors =
    filterType === "all"
      ? errors
      : errors.filter((error) => error.errorType === filterType);

  // Pagination
  const totalPages = Math.ceil(filteredErrors.length / errorsPerPage);
  const startIndex = (currentPage - 1) * errorsPerPage;
  const paginatedErrors = filteredErrors.slice(
    startIndex,
    startIndex + errorsPerPage
  );

  // Get unique error types for filter
  const errorTypes = Array.from(
    new Set(errors.map((error) => error.errorType))
  );

  const getErrorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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
    return labels[type] || type;
  };

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      required: "bg-red-100 text-red-800",
      enum: "bg-red-100 text-red-800",
      timeRange: "bg-orange-100 text-orange-800",
      duration: "bg-yellow-100 text-yellow-800",
      dateInterval: "bg-purple-100 text-purple-800",
      frequency: "bg-blue-100 text-blue-800",
      unique: "bg-pink-100 text-pink-800",
      structure: "bg-gray-100 text-gray-800",
      dateFormat: "bg-orange-100 text-orange-800",
      prohibitedContent: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  // 图片结果去重函数：将重复图片分组，每组只显示一个代表
  const deduplicateImageResults = (results: any[]) => {
    const processedResults: any[] = [];
    const processedIds = new Set<string>();

    for (const result of results) {
      // 如果已经处理过这个图片，跳过
      if (processedIds.has(result.id)) {
        continue;
      }

      // 如果这个图片有重复项
      if ((result.duplicates?.length ?? 0) > 0) {
        // 收集所有重复图片的ID（包括当前图片）
        const duplicateIds = [
          result.id,
          ...(result.duplicates
            ?.map((d: any) => (typeof d === "string" ? d : d?.id))
            .filter(Boolean) || []),
        ];

        // 从原始结果中找到所有重复图片的完整信息
        const duplicateResults = results.filter((r) =>
          duplicateIds.includes(r.id)
        );

        // 选择位置最靠前的作为代表（按行号和列号排序）
        const representative = duplicateResults.sort((a, b) => {
          const aRow = a.row ?? 999999;
          const bRow = b.row ?? 999999;
          if (aRow !== bRow) return aRow - bRow;

          const aCol = a.column ?? "ZZ";
          const bCol = b.column ?? "ZZ";
          return aCol.localeCompare(bCol);
        })[0];

        // 构建合并后的重复信息，包含所有重复图片的位置信息
        const allDuplicates = duplicateResults
          .filter((r) => r.id !== representative.id)
          .map((r) => ({
            id: r.id,
            position: r.position,
            row: r.row,
            column: r.column,
          }));

        // 创建代表图片的副本，更新其重复信息
        const representativeResult = {
          ...representative,
          duplicates: allDuplicates,
        };

        processedResults.push(representativeResult);

        // 标记所有相关图片为已处理
        duplicateIds.forEach((id) => processedIds.add(id));
      } else {
        // 非重复图片直接添加
        processedResults.push(result);
        processedIds.add(result.id);
      }
    }

    return processedResults;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {onExportErrors && (errors.length > 0 || hasExportableImageIssues) && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onExportErrors}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                导出中...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                导出Excel
              </>
            )}
          </button>
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">验证结果</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">文件名</p>
            <p className="text-lg font-semibold text-blue-900">{fileName}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">任务类型</p>
            <p className="text-lg font-semibold text-green-900">{taskName}</p>
          </div>
          <div
            className={`p-4 rounded-lg ${
              validation.isValid ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                validation.isValid ? "text-green-600" : "text-red-600"
              }`}
            >
              验证状态
            </p>
            <p
              className={`text-lg font-semibold ${
                validation.isValid ? "text-green-900" : "text-red-900"
              }`}
            >
              {validation.isValid ? "通过" : "未通过"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalRows}
            </p>
            <p className="text-sm text-gray-700">总行数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {summary.validRows}
            </p>
            <p className="text-sm text-gray-700">有效行数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {summary.errorCount}
            </p>
            <p className="text-sm text-gray-700">错误数量</p>
          </div>
        </div>

        {/* 图片验证摘要 */}
        {validation.imageValidation && (
          <div className="mb-6">
            {validation.imageValidation.warning && (
              <div className="mb-3 p-4 rounded-lg border border-yellow-300 bg-yellow-50 flex">
                <svg
                  className="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M4.93 19.07A10 10 0 1119.07 4.93 10 10 0 014.93 19.07z"
                  />
                </svg>
                <div className="text-sm text-yellow-800">
                  {validation.imageValidation.warning}
                </div>
              </div>
            )}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">
                图片验证摘要
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {validation.imageValidation.totalImages}
                  </p>
                  <p className="text-xs text-gray-700">总图片数</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">
                    {validation.imageValidation.blurryImages}
                  </p>
                  <p className="text-xs text-gray-700">模糊图片</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {validation.imageValidation.duplicateGroups}
                  </p>
                  <p className="text-xs text-gray-700">重复组</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-600">
                    {(() => {
                      const results = validation.imageValidation?.results ?? [];
                      return results.filter((r: any) => {
                        // 新系统：可疑度 > 20分
                        if (typeof r.suspicionScore === 'number' && r.suspicionScore >= 20) {
                          return true;
                        }
                        // 旧系统兼容：网图或尺寸问题
                        if (!r.suspicionScore) {
                          if (r.dimensionOK === false) return true;
                          if (typeof r.webLikelihood === 'number' && r.webLikelihood >= 0.55) return true;
                        }
                        return false;
                      }).length;
                    })()}
                  </p>
                  <p className="text-xs text-gray-700">可疑图片</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {(() => {
                      const total = validation.imageValidation?.totalImages ?? 0;
                      const blurry = validation.imageValidation?.blurryImages ?? 0;
                      const results = validation.imageValidation?.results ?? [];
                      const duplicates = results.filter((r: any) => (r.duplicates?.length ?? 0) > 0).length;
                      const suspicious = results.filter((r: any) => {
                        if (typeof r.suspicionScore === 'number' && r.suspicionScore >= 20) return true;
                        if (!r.suspicionScore) {
                          if (r.dimensionOK === false) return true;
                          if (typeof r.webLikelihood === 'number' && r.webLikelihood >= 0.55) return true;
                        }
                        return false;
                      }).length;
                      return Math.max(0, total - blurry - duplicates - suspicious);
                    })()}
                  </p>
                  <p className="text-xs text-gray-700">正常图片</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 医院拜访特殊统计 */}
        {taskName.includes("医院拜访") && errors.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              错误类型统计
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {errorTypes.map((type) => {
                const count = errors.filter((e) => e.errorType === type).length;
                return (
                  <div key={type} className="text-center">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-700">
                      {getErrorTypeLabel(type)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>


      {errors.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
              错误详情
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="error-filter" className="text-sm text-gray-700">
                  筛选:
                </label>
                <select
                  id="error-filter"
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部错误 ({errors.length})</option>
                  {errorTypes.map((type) => (
                    <option key={type} value={type}>
                      {getErrorTypeLabel(type)} (
                      {errors.filter((e) => e.errorType === type).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    错误类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    错误信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前值
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedErrors.map((error, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {error.sheet && `${error.sheet} - `}第{error.row}行
                      {error.column && ` ${error.column}列`}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`block break-words whitespace-normal px-2 py-1 text-xs font-semibold rounded-full ${getErrorTypeColor(
                          error.errorType
                        )}`}
                      >
                        {getErrorTypeLabel(error.errorType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {error.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {error.value !== undefined ? String(error.value) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700">
                显示 {startIndex + 1} 到{" "}
                {Math.min(startIndex + errorsPerPage, filteredErrors.length)}{" "}
                条， 共 {filteredErrors.length} 条错误
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图片问题详情 */}
      {(validation.imageValidation?.results?.length ?? 0) > 0 && (
        <div className="mt-8">
<div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              图片问题详情
            </h3>
            <div className="flex flex-col items-end text-sm text-gray-500">
              <div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                  重复图片已分组
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  每组显示一条
                </span>
                按位置排序；包含“疑似非手机拍摄”
              </div>
              <div className="mt-2 flex items-center space-x-3">
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.duplicate}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, duplicate: e.target.checked }))}
                  />
                  显示重复
                </label>
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.blurry}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, blurry: e.target.checked }))}
                  />
                  显示模糊
                </label>
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.dimension}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, dimension: e.target.checked }))}
                  />
                  显示疑似非手机拍摄
                </label>
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.lowPixel}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, lowPixel: e.target.checked }))}
                  />
                  显示低像素
                </label>
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.web}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, web: e.target.checked }))}
                  />
                  显示疑似网图
                </label>
                <label className="inline-flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={imageFilter.border}
                    onChange={(e) => setImageFilter((prev) => ({ ...prev, border: e.target.checked }))}
                  />
                  显示存在边框
                </label>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图片预览
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图片ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置/行数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    问题类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    清晰度分数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    问题详细
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
{deduplicateImageResults(
                  (validation.imageValidation?.results ?? []).filter((result) => {
                    const isDup = (result.duplicates?.length ?? 0) > 0;
                    const isDimBad = result.dimensionOK === false;
                    const isBlur = !!result.isBlurry;
                    const isWeb = typeof result.webLikelihood === 'number' && result.webLikelihood >= 0.55;  // 从0.6降到0.55
                    const isLowPixel = !!result.isLowPixel;
                    const hasBorderIssue = !!result.hasBorder;
                    return (
                      (imageFilter.duplicate && isDup) ||
                      (imageFilter.dimension && isDimBad) ||
                      (imageFilter.blurry && isBlur) ||
                      (imageFilter.web && isWeb) ||
                      (imageFilter.lowPixel && isLowPixel) ||
                      (imageFilter.border && hasBorderIssue)
                    );
                  })
                )
                  .sort((a, b) => {
// 优先级排序：重复图片 > 边框 > 模糊图片 > 疑似网图 > 疑似非手机拍摄
const aHasDuplicates = (a.duplicates?.length ?? 0) > 0;
                    const bHasDuplicates = (b.duplicates?.length ?? 0) > 0;
                    const aBorder = !!a.hasBorder;
                    const bBorder = !!b.hasBorder;
                    const aBlur = !!a.isBlurry;
                    const bBlur = !!b.isBlurry;
                    const aWeb = typeof a.webLikelihood === 'number' && a.webLikelihood >= 0.55;
                    const bWeb = typeof b.webLikelihood === 'number' && b.webLikelihood >= 0.55;
                    const aDimBad = a.dimensionOK === false;
                    const bDimBad = b.dimensionOK === false;
                    const aLowPixel = !!a.isLowPixel;
                    const bLowPixel = !!b.isLowPixel;

                    // 1. 重复图片优先显示
                    if (aHasDuplicates && !bHasDuplicates) return -1;
                    if (!aHasDuplicates && bHasDuplicates) return 1;

                    // 2. 然后显示存在边框
                    if (aBorder && !bBorder) return -1;
                    if (!aBorder && bBorder) return 1;

// 3. 再显示模糊图片
                    if (aBlur && !bBlur) return -1;
                    if (!aBlur && bBlur) return 1;

                    // 4. 再显示疑似网图
                    if (aWeb && !bWeb) return -1;
                    if (!aWeb && bWeb) return 1;

                    // 5. 然后显示疑似非手机拍摄
                    if (aDimBad && !bDimBad) return -1;
                    if (!aDimBad && bDimBad) return 1;

                    // 6. 然后显示低像素
                    if (aLowPixel && !bLowPixel) return -1;
                    if (!aLowPixel && bLowPixel) return 1;

                    // 7. 同类型内按位置排序（行号优先，然后列号）
                    const aRow = a.row ?? 999999;
                    const bRow = b.row ?? 999999;
                    if (aRow !== bRow) return aRow - bRow;

                    const aCol = a.column ?? "ZZ";
                    const bCol = b.column ?? "ZZ";
                    return aCol.localeCompare(bCol);
                  })
                  .map((result) => (
                    <tr
                      key={result.id}
                      ref={(el) => {
                        imageRowRefs.current[result.id] = el;
                      }}
                      className={`hover:bg-gray-50 ${
                        highlightedRowId === result.id
                          ? "ring-2 ring-yellow-400"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.imageData ? (
                          <div className="flex items-center space-x-2">
                            <LazyImagePreview
                              imageData={new Uint8Array(result.imageData!)}
                              mimeType={result.mimeType || "image/png"}
                              imageId={result.id}
                              className="w-16 h-16"
                              lazy={true}
                            />
                            <button
                              onClick={() =>
                                setSelectedImage({
                                  data: new Uint8Array(result.imageData!),
                                  mimeType: result.mimeType || "image/png",
                                  id: result.id,
                                  position: result.position,
                                })
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              查看大图
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">无预览</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {result.column && result.row ? (
                          <div>
                            <span>
                              列{result.column} 行{result.row}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              位置: {result.position}
                            </div>
                          </div>
                        ) : (
                          "位置未知"
                        )}
                      </td>
                      <td className="px-6 py-4 align-top w-48 whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          {/* 核心错误：重复和边框排在最前面，使用更鲜艳的颜色 */}
                          {(result.duplicates?.length ?? 0) > 0 && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-500 text-white">
                              重复
                            </span>
                          )}
                          {result.hasBorder && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-rose-500 text-white">
                              存在边框
                            </span>
                          )}
                          
                          {/* 模糊 */}
                          {result.isBlurry && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              模糊
                            </span>
                          )}
                          
                          {/* 旧系统兼容：网图和非手机拍摄 */}
                          {typeof result.webLikelihood === 'number' && result.webLikelihood >= 0.55 && !result.suspicionScore && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              疑似网图
                            </span>
                          )}
                          {result.dimensionOK === false && !result.suspicionScore && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              疑似非手机拍摄
                            </span>
                          )}
                          {result.isLowPixel && !result.suspicionScore && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              低像素
                            </span>
                          )}
                          
                          {/* 🎯 新系统：可疑度评分标签（主标签 + 细节标签） */}
                          {typeof result.suspicionScore === 'number' && result.suspicionLevel && result.suspicionLevel !== 'LOW' && (
                            <>
                              {(() => {
                                const factors = result.suspicionFactors || [];
                                const score = result.suspicionScore;
                                const colorClass = result.suspicionColor === 'red' ? 'bg-red-100 text-red-800' :
                                                  result.suspicionColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                  'bg-yellow-100 text-yellow-800';
                                
                                // 分类因素
                                const screenshotFactors = factors.filter(f => f.includes('截图'));
                                const exifFactors = factors.filter(f => f.includes('EXIF') || f.includes('伪造'));
                                const softwareFactors = factors.filter(f => f.includes('软件'));
                                const dimensionFactors = factors.filter(f => 
                                  f.includes('比例') || f.includes('像素') || f.includes('分辨率')
                                );
                                const formatFactors = factors.filter(f => 
                                  f.includes('GIF') || f.includes('WebP') || f.includes('PNG') || f.includes('压缩')
                                );
                                const borderFactors = factors.filter(f => f.includes('边框'));
                                
                                const tags = [];
                                
                                // 1. 主标签：根据最主要问题生成
                                if (screenshotFactors.length > 0) {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      疑似截图 ({score}分)
                                    </span>
                                  );
                                } else if (exifFactors.length > 0 && (exifFactors.some(f => f.includes('异常')) || exifFactors.some(f => f.includes('不符')))) {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      疑似伪造 ({score}分)
                                    </span>
                                  );
                                } else if (softwareFactors.some(f => f.includes('专业编辑') || f.includes('Photoshop'))) {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      疑似编辑过 ({score}分)
                                    </span>
                                  );
                                } else if (formatFactors.some(f => f.includes('GIF'))) {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      GIF动图 ({score}分)
                                    </span>
                                  );
                                } else if (dimensionFactors.length > 0) {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      尺寸异常 ({score}分)
                                    </span>
                                  );
                                } else {
                                  tags.push(
                                    <span key="main" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                      图片异常 ({score}分)
                                    </span>
                                  );
                                }
                                
                                // 2. 细节标签：显示具体问题点
                                const detailColorClass = 'bg-gray-100 text-gray-700';
                                
                                // 比例问题
                                if (dimensionFactors.some(f => f.includes('罕见比例'))) {
                                  const ratio = dimensionFactors.find(f => f.includes('罕见比例'));
                                  const match = ratio?.match(/(\d+\.\d+):1/);
                                  tags.push(
                                    <span key="ratio" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      罕见比例{match ? match[1] + ':1' : ''}
                                    </span>
                                  );
                                } else if (dimensionFactors.some(f => f.includes('非标准比例'))) {
                                  const ratio = dimensionFactors.find(f => f.includes('非标准比例'));
                                  const match = ratio?.match(/(\d+\.\d+):1/);
                                  tags.push(
                                    <span key="ratio" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      非标准比例{match ? match[1] + ':1' : ''}
                                    </span>
                                  );
                                }
                                
                                // 像素问题
                                if (dimensionFactors.some(f => f.includes('像素'))) {
                                  const pixelFactor = dimensionFactors.find(f => f.includes('像素'));
                                  const match = pixelFactor?.match(/(\d+\.\d+MP)/);
                                  if (pixelFactor?.includes('过低')) {
                                    tags.push(
                                      <span key="pixel" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                        像素过低{match ? match[1] : ''}
                                      </span>
                                    );
                                  } else if (pixelFactor?.includes('较低') || pixelFactor?.includes('偏低')) {
                                    tags.push(
                                      <span key="pixel" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                        像素偏低{match ? match[1] : ''}
                                      </span>
                                    );
                                  }
                                }
                                
                                // EXIF问题
                                if (exifFactors.some(f => f.includes('无EXIF'))) {
                                  tags.push(
                                    <span key="no-exif" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      无EXIF信息
                                    </span>
                                  );
                                } else if (exifFactors.some(f => f.includes('EXIF不完整'))) {
                                  tags.push(
                                    <span key="incomplete-exif" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      EXIF不完整
                                    </span>
                                  );
                                }
                                if (exifFactors.some(f => f.includes('EXIF时间异常'))) {
                                  tags.push(
                                    <span key="exif-time" className={`inline-flex px-2 py-1 text-xs rounded-full bg-red-50 text-red-700`}>
                                      EXIF时间异常
                                    </span>
                                  );
                                }
                                if (exifFactors.some(f => f.includes('不符'))) {
                                  tags.push(
                                    <span key="exif-mismatch" className={`inline-flex px-2 py-1 text-xs rounded-full bg-red-50 text-red-700`}>
                                      设备信息不符
                                    </span>
                                  );
                                }
                                
                                // 软件问题
                                if (softwareFactors.length > 0) {
                                  softwareFactors.forEach((f, idx) => {
                                    if (f.includes('专业编辑软件')) {
                                      const soft = f.match(/:(\w+)/);
                                      tags.push(
                                        <span key={`software-${idx}`} className={`inline-flex px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700`}>
                                          {soft ? soft[1] : '专业软件'}
                                        </span>
                                      );
                                    } else if (f.includes('美化软件')) {
                                      tags.push(
                                        <span key={`software-${idx}`} className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                          美化软件
                                        </span>
                                      );
                                    }
                                  });
                                }
                                
                                // 格式问题
                                if (formatFactors.some(f => f.includes('WebP'))) {
                                  tags.push(
                                    <span key="webp" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      WebP格式
                                    </span>
                                  );
                                }
                                if (formatFactors.some(f => f.includes('小像素PNG'))) {
                                  tags.push(
                                    <span key="small-png" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      小像素PNG
                                    </span>
                                  );
                                }
                                if (formatFactors.some(f => f.includes('强压缩'))) {
                                  const compressionFactor = formatFactors.find(f => f.includes('强压缩'));
                                  const match = compressionFactor?.match(/(\d+KB\/MP)/);
                                  tags.push(
                                    <span key="compression" className={`inline-flex px-2 py-1 text-xs rounded-full ${detailColorClass}`}>
                                      强压缩{match ? match[1] : ''}
                                    </span>
                                  );
                                }
                                
                                return tags;
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {result.sharpness.toFixed(1)}
                        {result.isBlurry && (
                          <span className="ml-2 text-red-500">
                            (低于60阈值)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(() => {
                          const details: string[] = [];
                          
                          // 🎯 方案B：优先显示新评分系统的因素
                          if (result.suspicionFactors && result.suspicionFactors.length > 0) {
                            details.push(...result.suspicionFactors);
                          } else {
                            // 回退到旧系统逻辑
                            if (result.isBlurry) details.push("清晰度低");
                            if (result.isLowPixel) details.push("像素不足");
                            if (result.dimensionOK === false) details.push("疑似非手机拍摄");
                            if (typeof result.webLikelihood === 'number' && result.webLikelihood >= 0.55) {
                              const reasons = (result.webReasons || []).join('；');
                              details.push(`疑似网图${reasons ? '：' + reasons : ''}`);
                            }
                            if (result.mimeType && !/jpe?g/i.test(result.mimeType)) {
                              details.push('无EXIF');
                            }
                          }
                          
                          // 重复和边框始终显示
                          const dupPositions = (result.duplicates || [])
                            .map((d: any) => (typeof d === 'string' ? d : (d?.position || `${d?.column ?? ''}${d?.row ?? ''}`)))
                            .filter(Boolean);
                          if (dupPositions.length) {
                            details.push(`重复位置：${dupPositions.join('，')}`);
                          }
                          if (result.hasBorder && result.borderSides && result.borderSides.length > 0) {
                            const borderDesc = result.borderSides.map((side: string) => {
                              const sideNames: Record<string, string> = {
                                top: '上',
                                bottom: '下',
                                left: '左',
                                right: '右'
                              };
                              const width = result.borderWidth?.[side as keyof typeof result.borderWidth];
                              return `${sideNames[side]}${width ? `(${width}px)` : ''}`;
                            }).join('、');
                            details.push(`边框: ${borderDesc}`);
                          }
                          
                          const text = details.join('；');
                          return text || '-';
                        })()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length === 0 && validation.isValid && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            验证通过！
          </h3>
          <p className="text-gray-700">您的 Excel 文件符合所有验证规则。</p>
          {taskName.includes("医院拜访") && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>医院拜访提醒：</strong>
                请确保拜访记录真实有效，照片清晰可见，并及时跟进反馈信息。
              </p>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && taskName.includes("医院拜访") && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">
            医院拜访常见问题提醒：
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>
              • <strong>医疗类型格式错误：</strong>
              请填写正确的医疗机构类别：等级、基层、民营
            </li>
            <li>
              • <strong>拜访时长不足：</strong>所有医院拜访类型要求≥100分钟
            </li>
            <li>
              • <strong>拜访时间范围：</strong>必须在07:00-19:00范围内
            </li>
            <li>
              • <strong>频次超限：</strong>同一实施人每日拜访不能超过4家医院
            </li>
            <li>
              • <strong>医院重复拜访：</strong>
              等级医院1日内不重复，基层医疗和民营医院2日内不重复
            </li>
            <li>
              • <strong>医生重复拜访：</strong>同一医生7日内不能重复拜访
            </li>
          </ul>
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageData={selectedImage.data}
          mimeType={selectedImage.mimeType}
          imageId={selectedImage.id}
          position={selectedImage.position}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}
