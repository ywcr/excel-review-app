interface SheetSelectorProps {
  availableSheets: string[];
  taskName: string;
  onSheetSelect: (sheetName: string) => void;
  onCancel: () => void;
}

export default function SheetSelector({ 
  availableSheets, 
  taskName, 
  onSheetSelect, 
  onCancel 
}: SheetSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full mr-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">选择工作表</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            未找到与任务类型 <span className="font-medium text-blue-600">"{taskName}"</span> 匹配的工作表。
          </p>
          <p className="text-sm text-gray-600">
            请从以下可用工作表中选择一个进行审核：
          </p>
        </div>

        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {availableSheets.map((sheetName, index) => (
            <button
              key={index}
              onClick={() => onSheetSelect(sheetName)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900">{sheetName}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">提示：</p>
              <ul className="text-xs space-y-1">
                <li>• 选择包含待审核数据的工作表</li>
                <li>• 确保工作表包含正确的表头结构</li>
                <li>• 如果不确定，可以尝试不同的工作表</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
