import { useState } from 'react';

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

export default function ValidationResults({ result, onExportErrors, isExporting = false }: ValidationResultsProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const errorsPerPage = 10;

  const { validation, fileName, taskName } = result;
  const { errors, summary } = validation;

  // Filter errors by type
  const filteredErrors = filterType === 'all' 
    ? errors 
    : errors.filter(error => error.errorType === filterType);

  // Pagination
  const totalPages = Math.ceil(filteredErrors.length / errorsPerPage);
  const startIndex = (currentPage - 1) * errorsPerPage;
  const paginatedErrors = filteredErrors.slice(startIndex, startIndex + errorsPerPage);

  // Get unique error types for filter
  const errorTypes = Array.from(new Set(errors.map(error => error.errorType)));

  const getErrorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'required': '必填项缺失',
      'enum': '类型不符',
      'timeRange': '时间范围错误',
      'duration': '时长不符',
      'dateInterval': '日期间隔冲突',
      'frequency': '频次超限',
      'unique': '重复值',
      'structure': '结构错误',
      'dateFormat': '日期格式错误'
    };
    return labels[type] || type;
  };

  const getErrorTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'required': 'bg-red-100 text-red-800',
      'enum': 'bg-red-100 text-red-800',
      'timeRange': 'bg-orange-100 text-orange-800',
      'duration': 'bg-yellow-100 text-yellow-800',
      'dateInterval': 'bg-purple-100 text-purple-800',
      'frequency': 'bg-blue-100 text-blue-800',
      'unique': 'bg-pink-100 text-pink-800',
      'structure': 'bg-gray-100 text-gray-800',
      'dateFormat': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
          <div className={`p-4 rounded-lg ${validation.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm font-medium ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
              验证状态
            </p>
            <p className={`text-lg font-semibold ${validation.isValid ? 'text-green-900' : 'text-red-900'}`}>
              {validation.isValid ? '通过' : '未通过'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.totalRows}</p>
            <p className="text-sm text-gray-700">总行数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{summary.validRows}</p>
            <p className="text-sm text-gray-700">有效行数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{summary.errorCount}</p>
            <p className="text-sm text-gray-700">错误数量</p>
          </div>
        </div>

        {/* 医院拜访特殊统计 */}
        {taskName.includes('医院拜访') && errors.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">错误类型统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {errorTypes.map(type => {
                const count = errors.filter(e => e.errorType === type).length;
                return (
                  <div key={type} className="text-center">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-700">{getErrorTypeLabel(type)}</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">错误详情</h3>
            <div className="flex items-center space-x-4">
              {onExportErrors && (
                <button
                  onClick={onExportErrors}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      导出中...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      导出Excel
                    </>
                  )}
                </button>
              )}
              <div className="flex items-center space-x-2">
              <label htmlFor="error-filter" className="text-sm text-gray-700">筛选:</label>
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
                {errorTypes.map(type => (
                  <option key={type} value={type}>
                    {getErrorTypeLabel(type)} ({errors.filter(e => e.errorType === type).length})
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
                      {error.sheet && `${error.sheet} - `}第{error.row}行{error.column && ` ${error.column}列`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getErrorTypeColor(error.errorType)}`}>
                        {getErrorTypeLabel(error.errorType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {error.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {error.value !== undefined ? String(error.value) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700">
                显示 {startIndex + 1} 到 {Math.min(startIndex + errorsPerPage, filteredErrors.length)} 条，
                共 {filteredErrors.length} 条错误
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      {errors.length === 0 && validation.isValid && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">验证通过！</h3>
          <p className="text-gray-700">您的 Excel 文件符合所有验证规则。</p>
          {taskName.includes('医院拜访') && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>医院拜访提醒：</strong>请确保拜访记录真实有效，照片清晰可见，并及时跟进反馈信息。
              </p>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && taskName.includes('医院拜访') && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">医院拜访常见问题提醒：</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>医疗类型格式错误：</strong>必须填写具体级别，如：一级、二级、三级，或完整格式：一级甲等、二级甲等等</li>
            <li>• <strong>拜访时长不足：</strong>所有医院拜访类型要求≥100分钟</li>
            <li>• <strong>拜访时间范围：</strong>必须在07:00-19:00范围内</li>
            <li>• <strong>频次超限：</strong>同一实施人每日拜访不能超过4家医院</li>
            <li>• <strong>医院重复拜访：</strong>等级医院1日内不重复，基层医疗和民营医院2日内不重复</li>
            <li>• <strong>医生重复拜访：</strong>同一医生7日内不能重复拜访</li>
          </ul>
        </div>
      )}
    </div>
  );
}
