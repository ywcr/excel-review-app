import * as XLSX from "xlsx-js-style";
import { ImageValidationResult } from "./imageValidator";

export interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
  imageValidation?: ImageValidationResult;
}

function getErrorTypeText(errorType: string): string {
  const errorTypeMap: Record<string, string> = {
    required: "必填字段缺失",
    dateFormat: "日期格式错误",
    dateInterval: "日期间隔冲突",
    frequency: "频次超限",
    duration: "时长不符",
    timeRange: "时间范围错误",
    pattern: "格式不匹配",
    enum: "枚举值错误",
    unique: "唯一性冲突",
    minValue: "数值不足",
    medicalLevel: "医疗类型错误",
  };

  return errorTypeMap[errorType] || errorType;
}

function getErrorStatistics(errors: ValidationError[]): Record<string, number> {
  const stats: Record<string, number> = {};

  errors.forEach((error) => {
    const type = error.errorType;
    stats[type] = (stats[type] || 0) + 1;
  });

  return stats;
}

export function buildErrorReportWorkbook(
  validationResult: ValidationResult,
  fileName?: string,
  taskName?: string,
  originalFileBuffer?: ArrayBuffer
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Note: Original file highlighting has been disabled to avoid memory issues
  // with large files containing images. The export now focuses on detailed error reporting only.

  // Skip original file processing to avoid memory issues
  if (
    false &&
    originalFileBuffer &&
    originalFileBuffer instanceof ArrayBuffer
  ) {
    try {
      // Convert ArrayBuffer to Uint8Array for XLSX.read
      const uint8Array = new Uint8Array(originalFileBuffer as ArrayBuffer);
      const originalWorkbook = XLSX.read(uint8Array, { type: "array" });
      const originalSheetNames = originalWorkbook.SheetNames;

      // Find the sheet that contains validation errors
      const errorSheetName =
        validationResult.errors.length > 0
          ? validationResult.errors[0].sheet
          : originalSheetNames[0];
      let targetSheet = originalWorkbook.Sheets[errorSheetName];

      // If the error sheet name doesn't match exactly, try to find a similar one
      if (!targetSheet && validationResult.errors.length > 0) {
        const possibleSheet = originalSheetNames.find(
          (name) =>
            name.includes(errorSheetName) || errorSheetName.includes(name)
        );
        if (possibleSheet && originalWorkbook.Sheets[possibleSheet as string]) {
          targetSheet = originalWorkbook.Sheets[possibleSheet as string];
        }
      }

      // Fallback to first sheet if still not found
      if (!targetSheet && originalSheetNames.length > 0) {
        targetSheet = originalWorkbook.Sheets[originalSheetNames[0]];
      }

      if (targetSheet) {
        // Create a copy of the original sheet
        const markedSheet = XLSX.utils.sheet_to_json(targetSheet, {
          header: 1,
          raw: false,
        }) as unknown[][];
        const newSheet = XLSX.utils.aoa_to_sheet(markedSheet);

        // Copy original formatting
        Object.keys(targetSheet).forEach((cellRef) => {
          if (cellRef.startsWith("!")) return; // Skip metadata
          if (targetSheet[cellRef] && targetSheet[cellRef].s) {
            if (!newSheet[cellRef])
              newSheet[cellRef] = { v: targetSheet[cellRef].v };
            newSheet[cellRef].s = { ...targetSheet[cellRef].s };
          }
        });

        // Apply error highlighting
        validationResult.errors.forEach((error) => {
          if (error.sheet === errorSheetName) {
            const cellRef = `${error.column}${error.row}`;
            if (!newSheet[cellRef]) {
              newSheet[cellRef] = { v: error.value || "" };
            }

            // Apply red background highlighting
            if (!newSheet[cellRef].s) newSheet[cellRef].s = {};
            newSheet[cellRef].s.fill = { fgColor: { rgb: "FFCCCC" } };
            newSheet[cellRef].s.border = {
              top: { style: "medium", color: { rgb: "FF0000" } },
              bottom: { style: "medium", color: { rgb: "FF0000" } },
              left: { style: "medium", color: { rgb: "FF0000" } },
              right: { style: "medium", color: { rgb: "FF0000" } },
            };
          }
        });

        // Copy column widths if they exist
        if (targetSheet["!cols"]) {
          newSheet["!cols"] = targetSheet["!cols"];
        }

        // Copy row heights if they exist
        if (targetSheet["!rows"]) {
          newSheet["!rows"] = targetSheet["!rows"];
        }

        XLSX.utils.book_append_sheet(
          workbook,
          newSheet,
          "原始数据（标记错误）"
        );
      }
    } catch (error) {
      console.error("Error processing original file for highlighting:", error);
      // Continue without the highlighted sheet if there's an error
    }
  }

  // Summary sheet
  const summaryData = [
    ["验证结果汇总"],
    [""],
    ["说明：为避免大文件内存问题，原始数据高亮功能已禁用"],
    ["请根据详细错误列表手动定位和修正错误"],
    [""],
    ["文件名", fileName || "未知文件"],
    ["任务类型", taskName || "未知任务"],
    ["验证时间", new Date().toLocaleString("zh-CN")],
    [""],
    ["总行数", validationResult.summary.totalRows],
    ["有效行数", validationResult.summary.validRows],
    ["错误总数", validationResult.summary.errorCount],
    ["验证状态", validationResult.isValid ? "通过" : "未通过"],
  ];

  // Add hospital visit specific summary if applicable
  if (taskName && taskName.includes("医院拜访")) {
    const errorStats = getErrorStatistics(validationResult.errors);
    summaryData.push(
      [""],
      ["医院拜访专项统计"],
      ["医疗类型格式错误", errorStats["medicalLevel"] || 0],
      ["拜访时长不符", errorStats["duration"] || 0],
      ["频次超限", errorStats["frequency"] || 0],
      ["日期间隔冲突", errorStats["dateInterval"] || 0],
      ["时间范围错误", errorStats["timeRange"] || 0],
      [
        "其他错误",
        validationResult.summary.errorCount -
          (errorStats["medicalLevel"] || 0) -
          (errorStats["duration"] || 0) -
          (errorStats["frequency"] || 0) -
          (errorStats["dateInterval"] || 0) -
          (errorStats["timeRange"] || 0),
      ]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  (summarySheet as any)["A1"] = {
    v: "验证结果汇总",
    s: {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "4F81BD" } },
    },
  };
  XLSX.utils.book_append_sheet(workbook, summarySheet, "验证汇总");

  // Error details sheet
  if (validationResult.errors.length > 0) {
    const errorHeaders = [
      "序号",
      "工作表",
      "行号",
      "列",
      "字段",
      "错误类型",
      "错误描述",
      "错误值",
    ];

    const errorData: any[][] = [errorHeaders];

    validationResult.errors.forEach((error, index) => {
      errorData.push([
        index + 1,
        error.sheet,
        error.row,
        error.column,
        error.field,
        getErrorTypeText(error.errorType),
        error.message,
        error.value?.toString?.() || String(error.value ?? ""),
      ]);
    });

    const errorSheet = XLSX.utils.aoa_to_sheet(errorData);

    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "D9E1F2" } },
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    } as any;

    for (let col = 0; col < errorHeaders.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!(errorSheet as any)[cellRef]) (errorSheet as any)[cellRef] = {};
      (errorSheet as any)[cellRef].s = headerStyle;
    }

    (errorSheet as any)["!cols"] = [
      { width: 8 },
      { width: 12 },
      { width: 8 },
      { width: 8 },
      { width: 15 },
      { width: 12 },
      { width: 40 },
      { width: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, errorSheet, "错误详情");
  }

  // Error stats sheet
  const errorStats = getErrorStatistics(validationResult.errors);
  const statsData: any[][] = [["错误统计"], [""], ["错误类型", "数量", "占比"]];
  Object.entries(errorStats).forEach(([type, count]) => {
    const percentage = (
      (count / (validationResult.errors.length || 1)) *
      100
    ).toFixed(1);
    statsData.push([getErrorTypeText(type), count, `${percentage}%`]);
  });

  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  (statsSheet as any)["A1"] = {
    v: "错误统计",
    s: {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" },
      fill: { fgColor: { rgb: "4F81BD" } },
    },
  };
  XLSX.utils.book_append_sheet(workbook, statsSheet, "错误统计");

  // Add hospital visit specific guidance sheet
  if (taskName && taskName.includes("医院拜访")) {
    const guidanceData: any[][] = [
      ["医院拜访审核指南"],
      [""],
      ["验证规则说明"],
      [""],
      ["1. 医疗类型要求"],
      ["   • 必须选择以下医疗机构类别之一"],
      ["   • 等级医院：包括各级公立医院"],
      ["   • 基层医疗：包括社区卫生服务中心、乡镇卫生院等"],
      ["   • 民营医院：包括私立医院、专科医院等"],
      [""],
      ["2. 拜访时长要求"],
      ["   • 所有医院拜访类型：不低于100分钟"],
      [""],
      ["3. 拜访时间范围"],
      ["   • 必须在07:00-19:00范围内"],
      [""],
      ["4. 频次限制"],
      ["   • 所有医院拜访类型：同一实施人每日不超过4家"],
      [""],
      ["5. 重复拜访限制"],
      ["   • 等级医院拜访：同一医院1日内不重复"],
      ["   • 基层医疗机构拜访：同一医院2日内不重复"],
      ["   • 民营医院拜访：同一医院2日内不重复"],
      ["   • 所有类型：同一医生7日内不重复"],
      [""],
      ["6. 其他规则"],
      ["   • 日期格式：应为纯日期格式（如：2025-08-01）"],
      [""],
      ["常见错误解决方案"],
      [""],
      ["• 医疗类型格式错误：请填写正确的医疗机构类别：等级、基层、民营"],
      ["• 时长不符：确保拜访时长不低于100分钟"],
      ["• 时间范围错误：确保拜访时间在07:00-19:00范围内"],
      ["• 频次超限：合理安排实施人的拜访计划，每日不超过4家"],
      ["• 医院重复拜访：注意不同类型的重复拜访间隔要求"],
      ["• 医生重复拜访：避免7日内重复拜访同一医生"],
    ];

    const guidanceSheet = XLSX.utils.aoa_to_sheet(guidanceData);

    // Style the title
    (guidanceSheet as any)["A1"] = {
      v: "医院拜访审核指南",
      s: {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center" },
        fill: { fgColor: { rgb: "4F81BD" } },
      },
    };

    // Style section headers
    ["A3", "A5", "A10", "A15", "A20", "A25"].forEach((cell) => {
      if (guidanceSheet[cell]) {
        (guidanceSheet as any)[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "8DB4E2" } },
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, guidanceSheet, "审核指南");
  }

  // Add image validation results if available
  if (
    validationResult.imageValidation &&
    validationResult.imageValidation.totalImages > 0
  ) {
    const imageSheet = createImageValidationSheet(
      validationResult.imageValidation
    );
    XLSX.utils.book_append_sheet(workbook, imageSheet, "图片验证结果");
  }

  return workbook;
}

function createImageValidationSheet(
  imageValidation: ImageValidationResult
): XLSX.WorkSheet {
  const data: any[][] = [
    ["图片验证结果汇总"],
    [""],
    ["总图片数", imageValidation.totalImages],
    ["合格图片", imageValidation.validImages],
    ["问题图片", imageValidation.totalImages - imageValidation.validImages],
    [""],
    ["问题统计"],
    ["清晰度问题", imageValidation.summary.sharpnessIssues],
    ["OCR匹配问题", imageValidation.summary.ocrIssues],
    ["重复图片问题", imageValidation.summary.duplicateIssues],
    [""],
  ];

  // 添加清晰度检测结果
  if (imageValidation.sharpnessResults.length > 0) {
    data.push(["清晰度检测详情"], [""]);
    data.push(["图片ID", "工作表", "位置", "清晰度分数", "是否合格", "阈值"]);

    imageValidation.sharpnessResults.forEach((result) => {
      data.push([
        result.imageId,
        result.sheetName,
        result.position,
        result.sharpnessScore.toFixed(3),
        result.isSharp ? "合格" : "不合格",
        result.threshold.toString(),
      ]);
    });
    data.push([""]);
  }

  // 添加OCR验证结果
  if (imageValidation.ocrResults.length > 0) {
    data.push(["OCR文字验证详情"], [""]);
    data.push([
      "图片ID",
      "工作表",
      "位置",
      "提取文字",
      "匹配结果",
      "是否有问题",
    ]);

    imageValidation.ocrResults.forEach((result) => {
      const matchSummary =
        result.matchResults.length > 0
          ? result.matchResults
              .map((m) => `${m.fieldName}:${m.matchType}`)
              .join("; ")
          : "无匹配字段";

      data.push([
        result.imageId,
        result.sheetName,
        result.position,
        result.extractedText.substring(0, 50) +
          (result.extractedText.length > 50 ? "..." : ""),
        matchSummary,
        result.hasIssues ? "有问题" : "正常",
      ]);
    });
    data.push([""]);
  }

  // 添加重复图片检测结果
  if (imageValidation.duplicateResults.length > 0) {
    data.push(["重复图片检测详情"], [""]);
    data.push(["组ID", "相似度", "重复图片列表"]);

    imageValidation.duplicateResults.forEach((result) => {
      const imageList = result.images
        .map((img) => `${img.sheetName}-${img.position}`)
        .join("; ");
      data.push([
        result.groupId,
        (result.similarity * 100).toFixed(1) + "%",
        imageList,
      ]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 15 }, // 图片ID/组ID
    { wch: 15 }, // 工作表
    { wch: 10 }, // 位置
    { wch: 20 }, // 详细信息
    { wch: 20 }, // 结果
    { wch: 10 }, // 状态
  ];

  return worksheet;
}

export function buildReportBlob(
  validationResult: ValidationResult,
  fileName?: string,
  taskName?: string,
  originalFileBuffer?: ArrayBuffer
): Blob {
  const wb = buildErrorReportWorkbook(
    validationResult,
    fileName,
    taskName,
    originalFileBuffer
  );
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// Convenience function to export errors to an Excel file in the browser
export async function exportErrorsToExcel(
  errors: ValidationError[],
  fileName: string,
  options?: { taskName?: string; originalFileBuffer?: ArrayBuffer }
): Promise<void> {
  const validationResult: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    summary: {
      totalRows: 0,
      validRows: 0,
      errorCount: errors.length,
    },
  };

  const blob = buildReportBlob(
    validationResult,
    fileName,
    options?.taskName,
    options?.originalFileBuffer
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
