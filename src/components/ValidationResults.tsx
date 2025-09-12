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
    <div className="bg-white rounded-lg shadow-md p-6">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  <p className="text-lg font-bold text-green-600">
                    {(validation.imageValidation?.totalImages ?? 0) -
                      (validation.imageValidation?.blurryImages ?? 0) -
                      (validation.imageValidation?.results ?? []).filter(
                        (r) => (r.duplicates?.length ?? 0) > 0
                      ).length}
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
              {onExportErrors && (
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
              )}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getErrorTypeColor(
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
            <div className="text-sm text-gray-500">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                重复图片已分组
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                每组显示一条
              </span>
              按位置排序
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    问题类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    清晰度分数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    重复图片
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deduplicateImageResults(
                  (validation.imageValidation?.results ?? []).filter(
                    (result) =>
                      result.isBlurry || (result.duplicates?.length ?? 0) > 0
                  )
                )
                  .sort((a, b) => {
                    // 优先级排序：重复图片 > 模糊图片
                    const aHasDuplicates = (a.duplicates?.length ?? 0) > 0;
                    const bHasDuplicates = (b.duplicates?.length ?? 0) > 0;

                    // 1. 重复图片优先显示
                    if (aHasDuplicates && !bHasDuplicates) return -1;
                    if (!aHasDuplicates && bHasDuplicates) return 1;

                    // 2. 同类型内按位置排序（行号优先，然后列号）
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {result.isBlurry && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              模糊
                            </span>
                          )}
                          {(result.duplicates?.length ?? 0) > 0 && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              重复
                            </span>
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
                        {(result.duplicates?.length ?? 0) > 0 ? (
                          <div className="max-w-xs">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                重复组 ({result.duplicates.length + 1}张)
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              {/* 当前图片位置 */}
                              <div className="text-gray-700 mb-1 font-medium">
                                当前位置:{" "}
                                {result.position ||
                                  `${result.column}${result.row}`}
                              </div>
                              {/* 重复位置列表 */}
                              <div className="text-gray-500 mb-1">
                                其他重复位置：
                              </div>
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {result.duplicates.map(
                                  (duplicate: any, idx: number) => {
                                    const renderPosText = () => {
                                      if (typeof duplicate === "string")
                                        return duplicate;
                                      if (duplicate?.position)
                                        return duplicate.position;
                                      if (duplicate?.column && duplicate?.row)
                                        return `${duplicate.column}${duplicate.row}`;
                                      return duplicate?.id || "未知位置";
                                    };

                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center space-x-1"
                                      >
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-600">
                                          {renderPosText()}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
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
