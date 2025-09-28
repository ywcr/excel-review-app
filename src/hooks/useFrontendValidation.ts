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
      // 新增：尺寸/比例信息（手机拍摄启发式）
      width?: number;
      height?: number;
      megapixels?: number;
      dimensionOK?: boolean;
        dimensionIssue?: string;
        // 新增：疑似网图评分
        webLikelihood?: number; // 0~1
        webReasons?: string[];
        isLowPixel?: boolean;
    }>;
  };
  summary?: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
}

// 调试日志接口
export interface DebugLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  stage: string;
  message: string;
  data?: any;
  prefix: string;
}

export interface UseFrontendValidationReturn {
  isValidating: boolean;
  progress: ValidationProgress | null;
  result: ValidationResult | null;
  error: string | null;
  debugLogs: DebugLogEntry[]; // 新增：调试日志数组
  validateExcel: (
    file: File,
    taskName: string,
    selectedSheet?: string,
    includeImages?: boolean
  ) => Promise<void>;
  validateImages: (file: File) => Promise<void>;
  cancelValidation: () => void;
  clearResult: () => void;
  clearDebugLogs: () => void; // 新增：清除调试日志
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
  DEBUG_LOG: "DEBUG_LOG", // 新增：调试日志消息类型
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
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]); // 新增：调试日志状态

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
            case MESSAGE_TYPES.DEBUG_LOG:
              // 处理调试日志
              setDebugLogs((prev) => {
                const newLogs = [...prev, data];
                // 限制日志数量，避免内存溢出
                if (newLogs.length > 1000) {
                  return newLogs.slice(-500); // 保留最新的500条
                }
                return newLogs;
              });
              break;
          }
        };

        worker.onerror = (e: ErrorEvent) => {
          let msg = "";
          try {
            // 优先使用 ErrorEvent 的 message
            msg = (e && (e as any).message) || "";
            // 若存在原始 error 对象，取其 message
            const rawErr = (e as any).error;
            if (!msg && rawErr) {
              msg = (rawErr && (rawErr.message || String(rawErr))) || "";
            }
            // 兜底：拼接位置信息
            if (!msg && (e as any).filename) {
              const fn = (e as any).filename;
              const ln = (e as any).lineno || 0;
              const cn = (e as any).colno || 0;
              msg = `Worker error at ${fn}:${ln}:${cn}`;
            }
          } catch {}
          console.error("Worker onerror:", e);
          setError(toFriendlyError(msg || "验证进程发生错误（Worker）"));
          setIsValidating(false);
          setProgress(null);
          cleanupWorker();
        };

        // For large files (>100MB), pass File object directly to avoid memory issues
        const fileSizeMB = file.size / (1024 * 1024);
        const isLargeFile = fileSizeMB > 100;

        // Get complete template from validationRules
        const template = getTaskTemplate(taskName);

        if (isLargeFile) {
          // For large files, pass File object directly (worker will stream-read)
          worker.postMessage({
            type: MESSAGE_TYPES.VALIDATE_EXCEL,
            data: {
              file: file, // Pass File object directly
              taskName,
              selectedSheet,
              template,
              includeImages: includeImages || false,
              isLargeFile: true,
            },
          });
        } else {
          // For small files, read ArrayBuffer on main thread and transfer to worker
          const fileBuffer = await file.arrayBuffer();

          // 重要：直接依赖 Worker 的智能工作表选择与提示，不在主线程进行 XLSX 预解析，避免UI卡顿
          // 通过 Transferable 传输，避免大内存拷贝
          worker.postMessage(
            {
              type: MESSAGE_TYPES.VALIDATE_EXCEL,
              data: {
                fileBuffer,
                taskName,
                selectedSheet,
                template,
                includeImages: includeImages || false,
                isLargeFile: false,
              },
            },
            [fileBuffer as ArrayBuffer]
          );
        }
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
          case MESSAGE_TYPES.DEBUG_LOG:
            // 处理调试日志
            setDebugLogs((prev) => {
              const newLogs = [...prev, data];
              // 限制日志数量，避免内存溢出
              if (newLogs.length > 1000) {
                return newLogs.slice(-500); // 保留最新的500条
              }
              return newLogs;
            });
            break;
        }
      };
      worker.onerror = (e: ErrorEvent) => {
        let msg = "";
        try {
          msg = (e && (e as any).message) || "";
          const rawErr = (e as any).error;
          if (!msg && rawErr) msg = (rawErr.message || String(rawErr)) || "";
          if (!msg && (e as any).filename) {
            const fn = (e as any).filename;
            const ln = (e as any).lineno || 0;
            const cn = (e as any).colno || 0;
            msg = `Worker error at ${fn}:${ln}:${cn}`;
          }
        } catch {}
        console.error("Worker(onerror) for image validation:", e);
        setError(toFriendlyError(msg || "图片验证进程发生错误（Worker）"));
        setIsValidating(false);
        setProgress(null);
        cleanupWorker();
      };

      // Check file size for image validation
      const fileSizeMB = file.size / (1024 * 1024);
      const isLargeFile = fileSizeMB > 100;

      if (isLargeFile) {
        // For large files, pass File object directly
        worker.postMessage({
          type: MESSAGE_TYPES.VALIDATE_IMAGES,
          data: {
            file: file,
            isLargeFile: true,
          },
        });
      } else {
        // For small files, convert to ArrayBuffer and transfer to worker
        const fileBuffer = await file.arrayBuffer();
        worker.postMessage(
          {
            type: MESSAGE_TYPES.VALIDATE_IMAGES,
            data: {
              fileBuffer,
              isLargeFile: false,
            },
          },
          [fileBuffer as ArrayBuffer]
        );
      }
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

  // Clear debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
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
    debugLogs,
    validateExcel,
    validateImages,
    cancelValidation,
    clearResult,
    clearDebugLogs,
    // setError 已移除，使用组件内部的 localError 状态管理
  };
}
