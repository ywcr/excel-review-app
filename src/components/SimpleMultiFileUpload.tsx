"use client";

import { useState } from "react";

interface SimpleMultiFileUploadProps {
  onFilesUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function SimpleMultiFileUpload({
  onFilesUpload,
  disabled,
}: SimpleMultiFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    if (files.length > 0) {
      onFilesUpload(files);
    } else {
      alert("请选择 Excel 文件 (.xlsx 或 .xls)");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesUpload(files);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-blue-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={disabled ? undefined : handleDrop}
    >
      <svg
        className="mx-auto h-12 w-12 text-gray-400 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      <p className="text-gray-600 mb-2">拖拽多个 Excel 文件到此处</p>
      <p className="text-sm text-gray-500 mb-4">或</p>

      <input
        type="file"
        multiple
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`inline-block px-4 py-2 rounded cursor-pointer transition-colors ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        选择文件
      </label>

      <p className="text-xs text-gray-500 mt-3">支持 .xlsx 和 .xls 格式</p>
    </div>
  );
}
