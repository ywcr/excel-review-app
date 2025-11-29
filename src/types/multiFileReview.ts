/**
 * 多文件审核类型定义
 */

export interface UploadedFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  availableSheets?: string[];
}

export interface ReviewTaskSimple {
  id: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  status: "pending" | "validating" | "completed" | "failed";
}

export interface ValidationResultSimple {
  taskId: string;
  fileId: string;
  fileName: string;
  taskType: string;
  sheetName: string;
  isValid: boolean;
  errorCount: number;
  totalRows: number;
  validRows: number;
  errors: any[];
  imageValidation?: any;
  summary: any;
}
