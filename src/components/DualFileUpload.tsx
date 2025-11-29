"use client";

import { useState } from "react";

interface DualFileUploadProps {
  onFilesSelected: (beforeFile: File | null, afterFile: File | null) => void;
  beforeFile: File | null;
  afterFile: File | null;
  disabled?: boolean;
}

export default function DualFileUpload({
  onFilesSelected,
  beforeFile,
  afterFile,
  disabled = false,
}: DualFileUploadProps) {
  const [dragActiveLeft, setDragActiveLeft] = useState(false);
  const [dragActiveRight, setDragActiveRight] = useState(false);

  const handleDrag = (
    e: React.DragEvent,
    side: "left" | "right",
    active: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (side === "left") {
      setDragActiveLeft(active);
    } else {
      setDragActiveRight(active);
    }
  };

  const handleDrop = (e: React.DragEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveLeft(false);
    setDragActiveRight(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    if (files.length > 0) {
      if (side === "left") {
        onFilesSelected(files[0], afterFile);
      } else {
        onFilesSelected(beforeFile, files[0]);
      }
    }
  };

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "left" | "right"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (side === "left") {
        onFilesSelected(file, afterFile);
      } else {
        onFilesSelected(beforeFile, file);
      }
    }
  };

  const handleClear = (side: "left" | "right") => {
    if (side === "left") {
      onFilesSelected(null, afterFile);
    } else {
      onFilesSelected(beforeFile, null);
    }
  };

  const renderUploadZone = (
    side: "left" | "right",
    label: string,
    file: File | null,
    isDragActive: boolean
  ) => (
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        onDragEnter={(e) => handleDrag(e, side, true)}
        onDragLeave={(e) => handleDrag(e, side, false)}
        onDragOver={(e) => handleDrag(e, side, true)}
        onDrop={(e) => handleDrop(e, side)}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : file
              ? "border-green-500 bg-green-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }
        `}
      >
        {file ? (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
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
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => handleClear(side)}
              disabled={disabled}
              className="mt-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              清除
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileInput(e, side)}
                disabled={disabled}
                className="hidden"
                id={`file-${side}`}
              />
              <label
                htmlFor={`file-${side}`}
                className={`text-sm font-medium ${
                  disabled
                    ? "text-gray-400"
                    : "text-blue-600 hover:text-blue-700 cursor-pointer"
                }`}
              >
                点击选择文件
              </label>
              <p className="text-xs text-gray-500 mt-1">或拖放文件到此处</p>
            </div>
            <p className="text-xs text-gray-500">支持 .xlsx 和 .xls 格式</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {renderUploadZone(
        "left",
        "原始文件 (Before)",
        beforeFile,
        dragActiveLeft
      )}
      {renderUploadZone(
        "right",
        "修改后文件 (After)",
        afterFile,
        dragActiveRight
      )}
    </div>
  );
}
