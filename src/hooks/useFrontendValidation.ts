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

const MESSAGE_TYPES = {
  VALIDATE_EXCEL: "VALIDATE_EXCEL",
  VALIDATE_IMAGES: "VALIDATE_IMAGES",
  PROGRESS: "PROGRESS",
  RESULT: "RESULT",
  ERROR: "ERROR",
};

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
              setError(data.message);
              setIsValidating(false);
              setProgress(null);
              cleanupWorker();
              break;
          }
        };

        worker.onerror = (error) => {
          setError(`Worker error: ${error.message}`);
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
        workerRef.current!.postMessage({
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
            setError(data.message);
            setIsValidating(false);
            setProgress(null);
            cleanupWorker();
            break;
        }
      };
      worker.onerror = (error) => {
        setError(error instanceof Error ? error.message : "图片验证失败");
        setIsValidating(false);
        setProgress(null);
        cleanupWorker();
      };

      // Convert file to ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      // Send image validation request to worker
      workerRef.current!.postMessage({
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
