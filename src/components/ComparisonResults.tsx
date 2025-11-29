"use client";

import { useState } from "react";
import { ComparisonResult } from "@/lib/excel-comparer";

interface ComparisonResultsProps {
  result: ComparisonResult;
  onExport: () => void;
  isExporting?: boolean;
}

export default function ComparisonResults({
  result,
  onExport,
  isExporting = false,
}: ComparisonResultsProps) {
  const [activeTab, setActiveTab] = useState<
    "summary" | "sheets" | "cells" | "formatting" | "structure" | "images"
  >("summary");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // No changes detected
  if (result.summary.totalChanges === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-green-500 mb-4"
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          未检测到变更
        </h3>
        <p className="text-gray-600">
          两个Excel文件的内容完全相同，没有发现任何差异。
        </p>
      </div>
    );
  }

  // Tabs configuration
  const tabs = [
    { id: "summary", label: "总结", count: result.summary.totalChanges },
    { id: "sheets", label: "工作表", count: result.sheetChanges.length },
    { id: "cells", label: "单元格", count: result.cellChanges.length },
    {
      id: "formatting",
      label: "格式",
      count: result.formattingChanges.length,
    },
    { id: "structure", label: "结构", count: result.structureChanges.length },
    { id: "images", label: "图片", count: result.imageChanges.length },
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return renderSummary();
      case "sheets":
        return renderSheetChanges();
      case "cells":
        return renderCellChanges();
      case "formatting":
        return renderFormattingChanges();
      case "structure":
        return renderStructureChanges();
      case "images":
        return renderImageChanges();
      default:
        return null;
    }
  };

  const renderSummary = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">对比结果总结</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="总变更数"
          value={result.summary.totalChanges}
          color="blue"
        />
        <StatCard
          label="工作表新增"
          value={result.summary.sheetsAdded}
          color="green"
        />
        <StatCard
          label="工作表删除"
          value={result.summary.sheetsDeleted}
          color="red"
        />
        <StatCard
          label="工作表重命名"
          value={result.summary.sheetsRenamed}
          color="yellow"
        />
        <StatCard
          label="单元格变更"
          value={result.summary.cellsChanged}
          color="purple"
        />
        <StatCard
          label="格式变更"
          value={result.summary.formattingChanged}
          color="pink"
        />
        <StatCard
          label="结构变更"
          value={result.summary.structureChanged}
          color="indigo"
        />
        <StatCard
          label="图片变更"
          value={result.summary.imagesChanged}
          color="orange"
        />
      </div>
    </div>
  );

  const renderSheetChanges = () => {
    if (result.sheetChanges.length === 0) {
      return <EmptyState message="没有工作表变更" />;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                变更类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                原名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                新名称
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.sheetChanges.map((change, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      change.type === "added"
                        ? "bg-green-100 text-green-800"
                        : change.type === "deleted"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {change.type === "added"
                      ? "新增"
                      : change.type === "deleted"
                      ? "删除"
                      : "重命名"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {change.oldName || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {change.newName || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCellChanges = () => {
    if (result.cellChanges.length === 0) {
      return <EmptyState message="没有单元格变更" />;
    }

    const totalPages = Math.ceil(result.cellChanges.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedChanges = result.cellChanges.slice(startIndex, endIndex);

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工作表
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  单元格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  原值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  新值
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedChanges.map((change, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {change.sheet}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {change.cell}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        change.changeType === "both"
                          ? "bg-purple-100 text-purple-800"
                          : change.changeType === "formula"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {change.changeType === "both"
                        ? "值+公式"
                        : change.changeType === "formula"
                        ? "公式"
                        : "值"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {change.oldFormula ? (
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {change.oldFormula}
                      </code>
                    ) : (
                      String(change.oldValue ?? "")
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {change.newFormula ? (
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {change.newFormula}
                      </code>
                    ) : (
                      String(change.newValue ?? "")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              显示第 {startIndex + 1} -{" "}
              {Math.min(endIndex, result.cellChanges.length)} 条， 共{" "}
              {result.cellChanges.length} 条
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
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
    );
  };

  const renderFormattingChanges = () => {
    if (result.formattingChanges.length === 0) {
      return <EmptyState message="没有格式变更" />;
    }

    return (
      <div className="text-center py-8 text-gray-500">格式对比功能即将推出</div>
    );
  };

  const renderStructureChanges = () => {
    if (result.structureChanges.length === 0) {
      return <EmptyState message="没有结构变更" />;
    }

    return (
      <div className="text-center py-8 text-gray-500">结构对比功能即将推出</div>
    );
  };

  const renderImageChanges = () => {
    if (result.imageChanges.length === 0) {
      return <EmptyState message="没有图片变更" />;
    }

    return (
      <div className="text-center py-8 text-gray-500">图片对比功能即将推出</div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">对比结果</h2>
        <button
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              导出中...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
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
              导出报告
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1); // Reset pagination
              }}
              className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">{renderTabContent()}</div>
    </div>
  );
}

// Helper Components

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    pink: "bg-pink-50 border-pink-200 text-pink-900",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    orange: "bg-orange-50 border-orange-200 text-orange-900",
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        colorClasses[color] || colorClasses.blue
      }`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
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
      <p className="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  );
}
