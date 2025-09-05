import { useState } from 'react';

interface SheetInfo {
  name: string;
  hasData: boolean;
}

interface FrontendSheetSelectorProps {
  availableSheets: SheetInfo[];
  onSheetSelect: (sheetName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function FrontendSheetSelector({ 
  availableSheets, 
  onSheetSelect, 
  onCancel,
  isLoading = false 
}: FrontendSheetSelectorProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const handleConfirm = () => {
    if (selectedSheet) {
      onSheetSelect(selectedSheet);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            选择工作表
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            系统无法自动识别对应的工作表，请手动选择正确的工作表进行验证：
          </p>

          <div className="space-y-2 mb-6">
            {availableSheets.map((sheet) => (
              <label
                key={sheet.name}
                className={`
                  flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                  ${selectedSheet === sheet.name 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${!sheet.hasData ? 'opacity-50' : ''}
                `}
              >
                <input
                  type="radio"
                  name="sheet"
                  value={sheet.name}
                  checked={selectedSheet === sheet.name}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  disabled={!sheet.hasData}
                  className="mr-3 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {sheet.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {sheet.hasData ? '包含数据' : '无数据'}
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
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedSheet || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '验证中...' : '确认验证'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
