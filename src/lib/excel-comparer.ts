import * as XLSX from "xlsx";
import { ImageProcessor, ImageInfo } from "./imageProcessor";

// ============================================
// Type Definitions
// ============================================

export interface SheetChange {
  type: "added" | "deleted" | "renamed";
  oldName?: string;
  newName?: string;
  sheetName: string;
}

export interface CellChange {
  sheet: string;
  cell: string;
  row: number;
  column: string;
  oldValue: any;
  newValue: any;
  oldFormula?: string;
  newFormula?: string;
  changeType: "value" | "formula" | "both";
}

export interface FormattingChange {
  sheet: string;
  cell: string;
  row: number;
  column: string;
  property: "fill" | "font" | "border" | "alignment" | "numberFormat";
  oldValue: any;
  newValue: any;
}

export interface StructureChange {
  sheet: string;
  type: "row-added" | "row-deleted" | "column-added" | "column-deleted";
  position: number | string; // Row number or column letter
  count: number;
}

export interface ImageChange {
  sheet: string;
  type: "added" | "deleted" | "modified";
  position?: string;
  row?: number;
  column?: string;
  oldImage?: ImageInfo;
  newImage?: ImageInfo;
  imageId?: string;
}

export interface ComparisonResult {
  sheetChanges: SheetChange[];
  cellChanges: CellChange[];
  formattingChanges: FormattingChange[];
  structureChanges: StructureChange[];
  imageChanges: ImageChange[];
  summary: {
    totalChanges: number;
    sheetsAdded: number;
    sheetsDeleted: number;
    sheetsRenamed: number;
    cellsChanged: number;
    formattingChanged: number;
    structureChanged: number;
    imagesChanged: number;
  };
}

export interface ComparisonProgress {
  progress: number; // 0-100
  message: string;
  stage:
    | "parsing"
    | "comparing-sheets"
    | "comparing-cells"
    | "comparing-formatting"
    | "comparing-images"
    | "complete";
}

// ============================================
// Excel Comparer Class
// ============================================

export class ExcelComparer {
  private beforeWorkbook: XLSX.WorkBook | null = null;
  private afterWorkbook: XLSX.WorkBook | null = null;
  private imageProcessor: ImageProcessor;
  private onProgress?: (progress: ComparisonProgress) => void;

  constructor(onProgress?: (progress: ComparisonProgress) => void) {
    this.imageProcessor = new ImageProcessor();
    this.onProgress = onProgress;
  }

  /**
   * Load and parse Excel files
   */
  async loadFiles(beforeFile: File, afterFile: File): Promise<void> {
    this.reportProgress(5, "正在读取文件...", "parsing");

    const [beforeBuffer, afterBuffer] = await Promise.all([
      beforeFile.arrayBuffer(),
      afterFile.arrayBuffer(),
    ]);

    this.reportProgress(15, "正在解析Excel文件...", "parsing");

    this.beforeWorkbook = XLSX.read(beforeBuffer, {
      type: "array",
      cellStyles: true,
      cellFormula: true,
      cellHTML: false,
    });

    this.afterWorkbook = XLSX.read(afterBuffer, {
      type: "array",
      cellStyles: true,
      cellFormula: true,
      cellHTML: false,
    });

    this.reportProgress(25, "文件解析完成", "parsing");
  }

  /**
   * Perform full comparison
   */
  async compare(): Promise<ComparisonResult> {
    if (!this.beforeWorkbook || !this.afterWorkbook) {
      throw new Error("Files not loaded. Call loadFiles() first.");
    }

    const result: ComparisonResult = {
      sheetChanges: [],
      cellChanges: [],
      formattingChanges: [],
      structureChanges: [],
      imageChanges: [],
      summary: {
        totalChanges: 0,
        sheetsAdded: 0,
        sheetsDeleted: 0,
        sheetsRenamed: 0,
        cellsChanged: 0,
        formattingChanged: 0,
        structureChanged: 0,
        imagesChanged: 0,
      },
    };

    // Step 1: Compare sheet structure
    this.reportProgress(30, "正在比较工作表结构...", "comparing-sheets");
    result.sheetChanges = this.compareSheets();

    // Step 2: Compare cells for common sheets
    this.reportProgress(45, "正在比较单元格内容...", "comparing-cells");
    const commonSheets = this.getCommonSheets();

    for (let i = 0; i < commonSheets.length; i++) {
      const sheetName = commonSheets[i];
      const progress = 45 + (30 * (i + 1)) / commonSheets.length;
      this.reportProgress(
        Math.round(progress),
        `正在比较工作表 "${sheetName}"...`,
        "comparing-cells"
      );

      const cellChanges = this.compareCells(sheetName);
      result.cellChanges.push(...cellChanges);
    }

    // Step 3: Compare formatting (optional - can be expensive)
    this.reportProgress(75, "正在比较格式...", "comparing-formatting");
    // For now, skip detailed formatting comparison to improve performance
    // This can be added later if needed

    // Step 4: Compare images
    this.reportProgress(85, "正在比较图片...", "comparing-images");
    // Images will be compared if we can extract them
    // This is a placeholder for now

    // Calculate summary
    result.summary = {
      totalChanges:
        result.sheetChanges.length +
        result.cellChanges.length +
        result.formattingChanges.length +
        result.structureChanges.length +
        result.imageChanges.length,
      sheetsAdded: result.sheetChanges.filter((c) => c.type === "added").length,
      sheetsDeleted: result.sheetChanges.filter((c) => c.type === "deleted")
        .length,
      sheetsRenamed: result.sheetChanges.filter((c) => c.type === "renamed")
        .length,
      cellsChanged: result.cellChanges.length,
      formattingChanged: result.formattingChanges.length,
      structureChanged: result.structureChanges.length,
      imagesChanged: result.imageChanges.length,
    };

    this.reportProgress(100, "比较完成", "complete");

    return result;
  }

  /**
   * Compare sheet structure (additions, deletions, renames)
   */
  private compareSheets(): SheetChange[] {
    const changes: SheetChange[] = [];
    const beforeSheets = this.beforeWorkbook!.SheetNames;
    const afterSheets = this.afterWorkbook!.SheetNames;

    // Detect added sheets
    for (const sheetName of afterSheets) {
      if (!beforeSheets.includes(sheetName)) {
        changes.push({
          type: "added",
          sheetName,
          newName: sheetName,
        });
      }
    }

    // Detect deleted sheets
    for (const sheetName of beforeSheets) {
      if (!afterSheets.includes(sheetName)) {
        changes.push({
          type: "deleted",
          sheetName,
          oldName: sheetName,
        });
      }
    }

    // Detect renamed sheets (same position, different name)
    // This is a heuristic - we check if sheets at same index have similar content
    const minLength = Math.min(beforeSheets.length, afterSheets.length);
    for (let i = 0; i < minLength; i++) {
      const beforeName = beforeSheets[i];
      const afterName = afterSheets[i];

      if (beforeName !== afterName) {
        // Check if this might be a rename (by comparing sheet content similarity)
        // For simplicity, we'll consider it a rename if:
        // 1. The old sheet doesn't exist in new workbook
        // 2. The new sheet doesn't exist in old workbook
        // 3. They're at the same position
        if (
          !afterSheets.includes(beforeName) &&
          !beforeSheets.includes(afterName)
        ) {
          changes.push({
            type: "renamed",
            sheetName: afterName,
            oldName: beforeName,
            newName: afterName,
          });
        }
      }
    }

    return changes;
  }

  /**
   * Get common sheets between before and after
   */
  private getCommonSheets(): string[] {
    const beforeSheets = this.beforeWorkbook!.SheetNames;
    const afterSheets = this.afterWorkbook!.SheetNames;
    return beforeSheets.filter((name) => afterSheets.includes(name));
  }

  /**
   * Compare cells in a specific sheet
   */
  private compareCells(sheetName: string): CellChange[] {
    const changes: CellChange[] = [];
    const beforeSheet = this.beforeWorkbook!.Sheets[sheetName];
    const afterSheet = this.afterWorkbook!.Sheets[sheetName];

    if (!beforeSheet || !afterSheet) {
      return changes;
    }

    // Get the range of cells to compare
    const beforeRange = XLSX.utils.decode_range(beforeSheet["!ref"] || "A1");
    const afterRange = XLSX.utils.decode_range(afterSheet["!ref"] || "A1");

    // Expand range to cover both sheets
    const maxRow = Math.max(beforeRange.e.r, afterRange.e.r);
    const maxCol = Math.max(beforeRange.e.c, afterRange.e.c);

    // Compare each cell
    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const beforeCell = beforeSheet[cellAddress];
        const afterCell = afterSheet[cellAddress];

        // Check if cell changed
        const cellChange = this.compareSingleCell(
          sheetName,
          cellAddress,
          row,
          col,
          beforeCell,
          afterCell
        );

        if (cellChange) {
          changes.push(cellChange);
        }
      }
    }

    return changes;
  }

  /**
   * Compare a single cell
   */
  private compareSingleCell(
    sheet: string,
    cellAddress: string,
    row: number,
    col: number,
    beforeCell: XLSX.CellObject | undefined,
    afterCell: XLSX.CellObject | undefined
  ): CellChange | null {
    // If both cells are undefined/empty, no change
    if (!beforeCell && !afterCell) {
      return null;
    }

    const beforeValue = beforeCell?.v;
    const afterValue = afterCell?.v;
    const beforeFormula = beforeCell?.f;
    const afterFormula = afterCell?.f;

    // Check for value change
    const valueChanged = beforeValue !== afterValue;
    const formulaChanged = beforeFormula !== afterFormula;

    if (!valueChanged && !formulaChanged) {
      return null;
    }

    const columnLetter = XLSX.utils.encode_col(col);

    return {
      sheet,
      cell: cellAddress,
      row: row + 1, // 1-indexed for display
      column: columnLetter,
      oldValue: beforeValue,
      newValue: afterValue,
      oldFormula: beforeFormula,
      newFormula: afterFormula,
      changeType:
        formulaChanged && valueChanged
          ? "both"
          : formulaChanged
          ? "formula"
          : "value",
    };
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    progress: number,
    message: string,
    stage: ComparisonProgress["stage"]
  ): void {
    if (this.onProgress) {
      this.onProgress({ progress, message, stage });
    }
  }

  /**
   * Export comparison results to Excel
   */
  exportToExcel(
    result: ComparisonResult,
    filename: string = "comparison-report.xlsx"
  ): void {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["对比报告总结"],
      [""],
      ["变更类型", "数量"],
      [
        "工作表变更",
        result.summary.sheetsAdded +
          result.summary.sheetsDeleted +
          result.summary.sheetsRenamed,
      ],
      ["  - 新增", result.summary.sheetsAdded],
      ["  - 删除", result.summary.sheetsDeleted],
      ["  - 重命名", result.summary.sheetsRenamed],
      ["单元格变更", result.summary.cellsChanged],
      ["格式变更", result.summary.formattingChanged],
      ["结构变更", result.summary.structureChanged],
      ["图片变更", result.summary.imagesChanged],
      [""],
      ["总计变更", result.summary.totalChanges],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "总结");

    // Sheet changes
    if (result.sheetChanges.length > 0) {
      const sheetChangesData = [
        ["工作表变更"],
        [""],
        ["变更类型", "原名称", "新名称"],
        ...result.sheetChanges.map((c) => [
          c.type === "added"
            ? "新增"
            : c.type === "deleted"
            ? "删除"
            : "重命名",
          c.oldName || "",
          c.newName || "",
        ]),
      ];
      const sheetChangesSheet = XLSX.utils.aoa_to_sheet(sheetChangesData);
      XLSX.utils.book_append_sheet(wb, sheetChangesSheet, "工作表变更");
    }

    // Cell changes
    if (result.cellChanges.length > 0) {
      const cellChangesData = [
        ["单元格变更"],
        [""],
        ["工作表", "单元格", "变更类型", "原值", "新值", "原公式", "新公式"],
        ...result.cellChanges.map((c) => [
          c.sheet,
          c.cell,
          c.changeType === "both"
            ? "值和公式"
            : c.changeType === "formula"
            ? "公式"
            : "值",
          String(c.oldValue ?? ""),
          String(c.newValue ?? ""),
          c.oldFormula || "",
          c.newFormula || "",
        ]),
      ];
      const cellChangesSheet = XLSX.utils.aoa_to_sheet(cellChangesData);
      XLSX.utils.book_append_sheet(wb, cellChangesSheet, "单元格变更");
    }

    // Write file
    XLSX.writeFile(wb, filename);
  }
}
