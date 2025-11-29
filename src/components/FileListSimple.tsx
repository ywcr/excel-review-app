"use client";

import { useState } from "react";
import { getAvailableTasks } from "@/lib/validationRules";

interface UploadedFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  availableSheets?: string[];
}

interface ReviewTaskSimple {
  id: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  status: "pending" | "validating" | "completed" | "failed";
}

interface FileListSimpleProps {
  files: UploadedFile[];
  tasks: ReviewTaskSimple[];
  onDeleteFile: (fileId: string) => void;
  onCreateTask: (fileId: string, taskType: string, sheetName: string) => void;
}

interface QuickTaskDialogProps {
  file: UploadedFile;
  taskType: string;
  sheetName: string;
  availableTasks: string[];
  onTaskTypeChange: (taskType: string) => void;
  onSheetNameChange: (sheetName: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function QuickTaskDialog({
  file,
  taskType,
  sheetName,
  availableTasks,
  onTaskTypeChange,
  onSheetNameChange,
  onSubmit,
  onCancel,
}: QuickTaskDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">创建审核任务</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">文件: {file.fileName}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            任务类型
          </label>
          <select
            value={taskType}
            onChange={(e) => onTaskTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableTasks.map((task) => (
              <option key={task} value={task}>
                {task}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工作表
          </label>
          {file.availableSheets && file.availableSheets.length > 0 ? (
            <select
              value={sheetName}
              onChange={(e) => onSheetNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {file.availableSheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">正在加载工作表...</p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!taskType || !sheetName}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FileListSimple({
  files,
  tasks,
  onDeleteFile,
  onCreateTask,
}: FileListSimpleProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [taskType, setTaskType] = useState("");
  const [sheetName, setSheetName] = useState("");

  const availableTasks = getAvailableTasks();

  const handleQuickCreate = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setSelectedFile(fileId);
    // 自动选择第一个任务类型和工作表
    setTaskType(availableTasks[0]);
    setSheetName(file.availableSheets?.[0] || "");
  };

  const handleSubmit = () => {
    if (selectedFile && taskType && sheetName) {
      onCreateTask(selectedFile, taskType, sheetName);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">已上传文件 ({files.length})</h3>
      </div>

      {files.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          暂无文件，请上传 Excel 文件
        </p>
      ) : (
        files.map((file) => {
          const fileTasks = tasks.filter((t) => t.fileId === file.id);

          return (
            <div
              key={file.id}
              className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {fileTasks.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {fileTasks.length} 个任务
                    </p>
                  )}
                </div>

                <div className="flex space-x-2 ml-2">
                  <button
                    onClick={() => handleQuickCreate(file.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                    title="创建审核任务"
                  >
                    + 任务
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确定删除文件 "${file.fileName}" 吗？`)) {
                        onDeleteFile(file.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    title="删除文件"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* 快速创建任务弹窗 */}
      {selectedFile && (
        <QuickTaskDialog
          file={files.find((f) => f.id === selectedFile)!}
          taskType={taskType}
          sheetName={sheetName}
          availableTasks={availableTasks}
          onTaskTypeChange={setTaskType}
          onSheetNameChange={setSheetName}
          onSubmit={handleSubmit}
          onCancel={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
