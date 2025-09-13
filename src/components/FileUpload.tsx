import { useRef, useState, useCallback, useEffect } from "react";
import { WarmButton } from "@/components/LightweightAnimations";

interface FileUploadProps {
  onFileUpload: (file: File) => void | Promise<void>;
  uploadedFile?: File | null;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function FileUpload({
  onFileUpload,
  uploadedFile,
  isLoading = false,
  disabled = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  // 氛围设置已移除

  // Reset file input when uploadedFile becomes null
  useEffect(() => {
    if (!uploadedFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadedFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      // 克隆文件，避免浏览器后续权限或句柄失效导致读取失败
      const original = files[0];
      const cloned = new File([original], original.name, {
        type: original.type,
        lastModified: Date.now(),
      });
      handleFile(cloned);
      // 允许选择同名同文件再次触发 change 事件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("请上传 Excel 文件 (.xlsx 或 .xls)");
      // 重置文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    onFileUpload(file);
  };

  const openFileDialog = () => {
    if (!disabled && !isLoading) {
      // 先清空 value，确保重复选择同一文件也能触发 onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fileInputRef.current?.click();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        上传 Excel 文件
      </label>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300
          ${
            disabled || isLoading
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : dragActive
              ? "border-blue-500 bg-blue-50 cursor-pointer"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer"
          }
        `}
        onDragEnter={disabled || isLoading ? undefined : handleDrag}
        onDragLeave={disabled || isLoading ? undefined : handleDrag}
        onDragOver={disabled || isLoading ? undefined : handleDrag}
        onDrop={disabled || isLoading ? undefined : handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isLoading}
        />

        <div className="flex flex-col items-center">
          <svg
            className="w-8 h-8 text-gray-500 mb-2"
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
          <p
            className={`text-sm ${
              disabled || isLoading ? "text-gray-400" : "text-gray-700"
            }`}
          >
            {isLoading
              ? "正在处理..."
              : disabled
              ? "上传已禁用"
              : "点击或拖拽文件到此处上传"}
          </p>
          <p
            className={`text-xs mt-1 ${
              disabled || isLoading ? "text-gray-400" : "text-gray-600"
            }`}
          >
            支持 .xlsx 和 .xls 格式
          </p>
        </div>
      </div>
    </div>
  );
}
