"use client";

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface ExcelPreviewProps {
  file: File;
  maxRows?: number;
  onCellClick?: (row: number, col: number, value: any) => void;
  highlightErrors?: Array<{ row: number; column: string }>;
}

interface CellData {
  value: any;
  address: string;
  hasError?: boolean;
}

export default function ExcelPreview({ 
  file, 
  maxRows = 10, 
  onCellClick,
  highlightErrors = []
}: ExcelPreviewProps) {
  const [data, setData] = useState<CellData[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  useEffect(() => {
    loadExcelData();
  }, [file, selectedSheet]);

  const loadExcelData = async () => {
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      setSheetNames(workbook.SheetNames);
      
      const sheetName = selectedSheet || workbook.SheetNames[0];
      setSelectedSheet(sheetName);
      
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('工作表不存在');
      }

      // 获取工作表范围
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // 限制预览行数
      const endRow = Math.min(range.e.r, range.s.r + maxRows);
      
      const previewData: CellData[][] = [];
      const headerRow: string[] = [];

      // 处理表头
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : '';
        headerRow.push(String(value || `列${col + 1}`));
      }
      setHeaders(headerRow);

      // 处理数据行
      for (let row = range.s.r; row <= endRow; row++) {
        const rowData: CellData[] = [];
        
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          const columnLetter = XLSX.utils.encode_col(col);
          
          // 检查是否有错误高亮
          const hasError = highlightErrors.some(error => 
            error.row === row + 1 && error.column === columnLetter
          );
          
          rowData.push({
            value: cell ? cell.v : '',
            address: cellAddress,
            hasError
          });
        }
        
        previewData.push(rowData);
      }

      setData(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载Excel文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number, cellData: CellData) => {
    if (onCellClick) {
      onCellClick(rowIndex + 1, colIndex, cellData.value);
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      // 检查是否是Excel日期
      if (value > 25569 && value < 50000) {
        try {
          const date = new Date((value - 25569) * 86400 * 1000);
          return date.toLocaleDateString();
        } catch {
          return String(value);
        }
      }
      return String(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">加载Excel预览...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">预览失败</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Excel 预览</h3>
        
        {/* 工作表选择器 */}
        {sheetNames.length > 1 && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">工作表:</label>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 文件信息 */}
      <div className="mb-4 text-sm text-gray-600">
        <p>文件: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        <p>预览: 前 {Math.min(maxRows, data.length)} 行</p>
      </div>

      {/* 表格预览 */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                行号
              </th>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                <td className="px-3 py-2 text-sm text-gray-500 font-medium">
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                      cell.hasError 
                        ? 'bg-red-100 border-red-300 text-red-900' 
                        : 'text-gray-900 hover:bg-blue-50'
                    }`}
                    onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                    title={`${cell.address}: ${formatCellValue(cell.value)}`}
                  >
                    <div className="max-w-32 truncate">
                      {formatCellValue(cell.value)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 说明文字 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• 点击单元格查看详细信息</p>
        <p>• 红色背景表示验证错误</p>
        <p>• 蓝色背景为表头行</p>
        {data.length >= maxRows && (
          <p>• 仅显示前 {maxRows} 行，完整数据请进行验证</p>
        )}
      </div>
    </div>
  );
}
