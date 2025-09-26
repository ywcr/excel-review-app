import { useRef, useState, useEffect } from "react";

interface FileUploadProps {
  onFileUpload: (file: File) => void | Promise<void>;
  uploadedFile?: File | null;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "default" | "baidu";
  placeholder?: string;
  onBaiduSubmit?: () => void;
  baiduButtonDisabled?: boolean;
  baiduButtonText?: string;
}

export default function FileUpload({
  onFileUpload,
  uploadedFile,
  isLoading = false,
  disabled = false,
  variant = "default",
  placeholder = "点击或拖拽文件到此处上传",
  onBaiduSubmit,
  baiduButtonDisabled,
  baiduButtonText = "百度一下",
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

  if (variant === "baidu") {
    return (
      <div className="w-full select-none">
        <div
          className={`relative group ${
            disabled || isLoading ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          onDragEnter={disabled || isLoading ? undefined : handleDrag}
          onDragLeave={disabled || isLoading ? undefined : handleDrag}
          onDragOver={disabled || isLoading ? undefined : handleDrag}
          onDrop={disabled || isLoading ? undefined : handleDrop}
        >
          <div
            className={`absolute -inset-1 rounded-full blur-xl transition ${
              dragActive
                ? "bg-blue-400/40"
                : "bg-[radial-gradient(circle_at_top,_#e5edff,_#f7f9ff_60%)]"
            }`}
            aria-hidden
          />
          <div
            className={`relative z-10 flex items-center rounded-full bg-white shadow-[0_10px_30px_rgba(40,91,255,0.12)] border ${
              disabled || isLoading
                ? "border-gray-200"
                : dragActive
                ? "border-blue-400"
                : "border-transparent"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled || isLoading}
            />
            <div
              className="flex-1 flex items-center"
              onClick={disabled || isLoading ? undefined : openFileDialog}
            >
              <div className="pl-5 pr-2 text-[#4e6ef2]">
                <svg
                  viewBox="0 0 20 20"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M8.5 2a6.5 6.5 0 0 1 5.09 10.59l4.41 4.41-1.41 1.41-4.41-4.41A6.5 6.5 0 1 1 8.5 2Zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9Z" />
                </svg>
              </div>
              <input
                readOnly
                value={uploadedFile?.name ? uploadedFile.name : ""}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-[17px] text-gray-800 placeholder:text-gray-400 py-4"
              />
              <span className="ml-3 mr-3 px-3 py-1 rounded-full text-xs bg-[#eef3ff] text-blue-600 font-medium">
                问 AI
              </span>
            </div>
            <div className="flex items-center pr-3 space-x-3 text-gray-400">
              <button
                type="button"
                className={`p-1 rounded-full transition ${
                  disabled ? "cursor-not-allowed" : "hover:text-blue-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                  <path d="M10 2a3 3 0 0 1 3 3v4.5c0 .2.09.39.24.53l2.13 2.13-1.41 1.41-1.96-1.96a2.5 2.5 0 0 1-.74-1.77V5a1 1 0 1 0-2 0v4.84a2.5 2.5 0 0 1-.74 1.77l-1.96 1.96-1.41-1.41 2.13-2.13A.75.75 0 0 0 7 9.5V5a3 3 0 0 1 3-3Zm-1 15h2a1 1 0 1 1-2 0Z" />
                </svg>
              </button>
              <button
                type="button"
                className={`p-1 rounded-full transition ${
                  disabled ? "cursor-not-allowed" : "hover:text-blue-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                  <path d="M7 2a2 2 0 0 0-2 2v1H3.5A1.5 1.5 0 0 0 2 6.5V15a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V6.5A1.5 1.5 0 0 0 16.5 5H15V4a2 2 0 0 0-2-2H7Zm0 2h6v1H7V4Zm3 4a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBaiduSubmit?.();
              }}
              disabled={baiduButtonDisabled || disabled || isLoading}
              className={`h-[46px] px-8 text-white text-[17px] font-medium rounded-full mr-2 transition-all shadow-[0_12px_24px_rgba(48,119,255,0.28)] ${
                baiduButtonDisabled || disabled || isLoading
                  ? "bg-blue-200 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#4e6ef2] to-[#3065f5] hover:from-[#3a5be9] hover:to-[#2855e5]"
              }`}
            >
              {baiduButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              : placeholder}
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
