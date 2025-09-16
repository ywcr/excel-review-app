import { useState, useCallback, useRef, useEffect } from "react";
import { getTaskTemplate } from "@/lib/validationRules";

export interface ValidationProgress {
  message: string;
  progress: number;
}

export interface ValidationResult {
  isValid: boolean;
  needSheetSelection?: boolean;
  availableSheets?: Array<{ name: string; hasData: boolean }>;
  headerValidation?: {
    isValid: boolean;
    missingFields: string[];
    unmatchedFields: string[];
    suggestions: Array<{
      expected: string;
      actual: string;
      similarity: number;
    }>;
  };
  errors?: Array<{
    row: number;
    column: string;
    field: string;
    value: any;
    message: string;
    errorType: string;
  }>;
  imageValidation?: {
    totalImages: number;
    blurryImages: number;
    duplicateGroups: number;
    results: Array<{
      id: string;
      sharpness: number;
      isBlurry: boolean;
      duplicates: Array<{
        id: string;
        position?: string;
        row?: number;
      }>;
      position?: string; // Excel位置，如 "A4", "B5"
      row?: number; // Excel行号
      column?: string; // Excel列号
    }>;
  };
  summary?: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
}

export interface UseFrontendValidationReturn {
  isValidating: boolean;
  progress: ValidationProgress | null;
  result: ValidationResult | null;
  error: string | null;
  validateExcel: (
    file: File,
    taskName: string,
    selectedSheet?: string,
    includeImages?: boolean
  ) => Promise<void>;
  validateImages: (file: File) => Promise<void>;
  cancelValidation: () => void;
  clearResult: () => void;
}

/**
 * 🚀 前端验证Hook - 当前主流程
 *
 * 此Hook使用Web Worker进行前端Excel验证，包括：
 * - 纯前端解析，无需上传文件到服务器
 * - 支持工作表选择和过滤
 * - 图片验证（清晰度检测、重复检测）
 * - 实时进度反馈
 */

const MESSAGE_TYPES = {
  VALIDATE_EXCEL: "VALIDATE_EXCEL",
  VALIDATE_IMAGES: "VALIDATE_IMAGES",
  PROGRESS: "PROGRESS",
  RESULT: "RESULT",
  ERROR: "ERROR",
};

function toFriendlyError(message: string): string {
  const msg = message || "";
  if (/unexpected signature|Corrupted zip/i.test(msg)) {
    return "图片无法解析：该文件可能是 .xls，请另存为 .xlsx 后重试。";
  }
  if (/Invalid array length/i.test(msg)) {
    return "Excel 文件结构较复杂，请减少数据量或简化工作表后重试。";
  }
  if (/Worker error/i.test(msg)) {
    return msg.replace(/Worker error:?\s*/i, "验证进程发生错误：");
  }
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return "网络请求失败，请检查网络连接后重试。";
  }
  if (/Unknown message type/i.test(msg)) {
    return "系统内部错误，请刷新页面后重试。";
  }
  return msg || "验证失败，请检查文件格式与内容后重试。";
}

export function useFrontendValidation(): UseFrontendValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const cleanupWorker = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  // Validate Excel file
  const validateExcel = useCallback(
    async (
      file: File,
      taskName: string,
      selectedSheet?: string,
      includeImages?: boolean
    ) => {
      // Clear previous results
      setResult(null);
      setError(null);
      setProgress(null);

      // Validate task template exists
      const template = getTaskTemplate(taskName);
      if (!template) {
        setError(`未找到任务模板: ${taskName}`);
        return;
      }

      // Check file type
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        setError("仅支持 .xlsx 和 .xls 格式的Excel文件");
        return;
      }

      // Check file size (warn for very large files, but don't reject)
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > 1000) {
        console.warn(
          `超大文件警告: ${fileSizeMB.toFixed(1)}MB，处理可能需要较长时间`
        );
      } else if (fileSizeMB > 500) {
        console.warn(`大文件警告: ${fileSizeMB.toFixed(1)}MB，处理可能较慢`);
      } else if (fileSizeMB > 300) {
        console.warn(
          `中等大小文件: ${fileSizeMB.toFixed(1)}MB，建议关注数据密度`
        );
      }

      try {
        setIsValidating(true);
        cleanupWorker(); // Clean up any previous worker

        const cacheBuster = `v=${Date.now()}`;
        const workerUrl = new URL(
          `/validation-worker.js?${cacheBuster}`,
          window.location.origin
        );
        const worker = new Worker(workerUrl);
        workerRef.current = worker;

        // 确保Worker创建成功
        if (!workerRef.current) {
          throw new Error("Worker创建失败");
        }

        worker.onmessage = (e) => {
          const { type, data } = e.data;
          switch (type) {
            case MESSAGE_TYPES.PROGRESS:
              setProgress(data);
              break;
            case MESSAGE_TYPES.RESULT:
              setResult(data);
              setIsValidating(false);
              setProgress(null);
              cleanupWorker();
              break;
            case MESSAGE_TYPES.ERROR:
              setError(toFriendlyError(data.message));
              setIsValidating(false);
              setProgress(null);
              cleanupWorker();
              break;
          }
        };

        worker.onerror = (error) => {
          const msg = error instanceof Error ? error.message : String(error);
          setError(toFriendlyError(msg));
          setIsValidating(false);
          setProgress(null);
          cleanupWorker();
        };

        // Create a new File object and clone into memory to avoid stale handles
        const newFile = new File([file], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });
        const fileBuffer = await newFile.arrayBuffer();

        // Get complete template from validationRules
        const template = getTaskTemplate(taskName);

        // Send validation request to worker
        // 保存Worker引用，防止在异步操作期间被清理
        const currentWorker = workerRef.current;
        if (!currentWorker) {
          throw new Error("Worker未正确初始化");
        }

        // 添加小延迟确保Worker完全初始化
        await new Promise((resolve) => setTimeout(resolve, 10));

        // 再次检查Worker是否仍然存在
        if (!workerRef.current || workerRef.current !== currentWorker) {
          throw new Error("Worker在验证过程中被清理");
        }

        currentWorker.postMessage({
          type: MESSAGE_TYPES.VALIDATE_EXCEL,
          data: {
            fileBuffer,
            taskName,
            selectedSheet,
            template, // 传递完整模板
            includeImages: includeImages || false, // 传递图片验证选项
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "文件读取失败");
        setIsValidating(false);
        cleanupWorker();
      }
    },
    []
  );

  // Validate images in Excel file
  const validateImages = useCallback(async (file: File) => {
    // Clear previous results
    setResult(null);
    setError(null);
    setProgress(null);

    try {
      setIsValidating(true);
      cleanupWorker(); // Clean up any previous worker

      const cacheBuster = `v=${Date.now()}`;
      const workerUrl = new URL(
        `/validation-worker.js?${cacheBuster}`,
        window.location.origin
      );
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      // 确保Worker创建成功
      if (!workerRef.current) {
        throw new Error("图片验证Worker创建失败");
      }

      worker.onmessage = (e) => {
        const { type, data } = e.data;
        switch (type) {
          case MESSAGE_TYPES.PROGRESS:
            setProgress(data);
            break;
          case MESSAGE_TYPES.RESULT:
            setResult(data);
            setIsValidating(false);
            setProgress(null);
            cleanupWorker();
            break;
          case MESSAGE_TYPES.ERROR:
            setError(toFriendlyError(data.message));
            setIsValidating(false);
            setProgress(null);
            cleanupWorker();
            break;
        }
      };
      worker.onerror = (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        setError(toFriendlyError(msg));
        setIsValidating(false);
        setProgress(null);
        cleanupWorker();
      };

      // Convert file to ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      // Send image validation request to worker
      // 保存Worker引用，防止在异步操作期间被清理
      const currentWorker = workerRef.current;
      if (!currentWorker) {
        throw new Error("Worker未正确初始化");
      }

      currentWorker.postMessage({
        type: MESSAGE_TYPES.VALIDATE_IMAGES,
        data: {
          fileBuffer,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片验证失败");
      setIsValidating(false);
      cleanupWorker();
    }
  }, []);

  // Cancel current validation
  const cancelValidation = useCallback(() => {
    cleanupWorker();
    setIsValidating(false);
    setProgress(null);
  }, []);

  // Clear results
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  useEffect(() => {
    // Cleanup worker on component unmount
    return () => cleanupWorker();
  }, []);

  return {
    isValidating,
    progress,
    result,
    error,
    validateExcel,
    validateImages,
    cancelValidation,
    clearResult,
  };
}
