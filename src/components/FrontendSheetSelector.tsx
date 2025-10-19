import { useState } from "react";
import { getMatchHint } from "@/lib/sheetMatcher";

interface SheetInfo {
  name: string;
  hasData: boolean;
}

interface FrontendSheetSelectorProps {
  availableSheets: SheetInfo[];
  onSheetSelect: (sheetName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  taskName?: string; // 任务类型名称，用于显示匹配提示
}

export default function FrontendSheetSelector({
  availableSheets,
  onSheetSelect,
  onCancel,
  isLoading = false,
  taskName,
}: FrontendSheetSelectorProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const matchHint = taskName ? getMatchHint(taskName) : "";

  const handleConfirm = () => {
    if (selectedSheet) {
      onSheetSelect(selectedSheet);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2147483648] p-4">
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="关闭"
          onClick={handleCancel}
          className="absolute top-2 right-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ✕
        </button>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            选择工作表
          </h3>

          <p className="text-sm text-gray-600 mb-2">
            系统无法自动识别对应的工作表，请手动选择正确的工作表进行验证：
          </p>
          {matchHint && (
            <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">
              {matchHint}
            </div>
          )}

          <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1 pl-1">
            {availableSheets.map((sheet) => (
              <label
                key={sheet.name}
                className={`
                  flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                  ${
                    selectedSheet === sheet.name
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                      : "border-gray-200 hover:border-blue-300"
                  }
                  ${!sheet.hasData ? "opacity-50" : ""}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                `}
              >
                <input
                  type="radio"
                  name="sheet"
                  value={sheet.name}
                  checked={selectedSheet === sheet.name}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  disabled={!sheet.hasData}
                  className="mr-3 h-4 w-4 text-blue-600 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{sheet.name}</div>
                  <div className="text-xs text-gray-500">
                    {sheet.hasData ? "包含数据" : "无数据"}
                  </div>
                </div>
                {!sheet.hasData && (
                  <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    空表
                  </div>
                )}
              </label>
            ))}
          </div>

          {availableSheets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p>未找到可用的工作表</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="mr-10"
            >
              取消
            </button>
            &nbsp;&nbsp;
            <button
              onClick={handleConfirm}
              disabled={!selectedSheet || isLoading}
              className=""
              style={{ color: "blue" }}
            >
              {isLoading ? "验证中..." : "确认验证"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
