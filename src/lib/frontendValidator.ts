import * as XLSX from "xlsx";
import { TaskTemplate, ValidationRule } from "./validationRules";

export interface ValidationError {
  row: number;
  column: string;
  field: string;
  value: any;
  message: string;
  errorType: string;
}

export interface HeaderValidationResult {
  isValid: boolean;
  missingFields: string[];
  unmatchedFields: string[];
  suggestions: Array<{
    expected: string;
    actual: string;
    similarity: number;
  }>;
}

export interface SheetInfo {
  name: string;
  hasData: boolean;
  rowCount: number;
  columnCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  headerValidation: HeaderValidationResult;
  errors: ValidationError[];
  imageValidation?: {
    totalImages: number;
    blurryImages: number;
    duplicateGroups: number;
    results: Array<{
      id: string;
      sharpness: number;
      isBlurry: boolean;
      duplicates: string[];
    }>;
  };
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
}

export class FrontendExcelValidator {
  private template: TaskTemplate;
  private workbook: XLSX.WorkBook | null = null;

  constructor(template: TaskTemplate) {
    this.template = template;
  }

  // 解析Excel文件
  async parseExcel(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    this.workbook = XLSX.read(buffer, { type: "array" });
  }

  // 直接加载workbook对象（用于测试）
  loadWorkbook(workbook: XLSX.WorkBook): void {
    this.workbook = workbook;
  }

  // 获取所有工作表信息
  getSheetInfo(): SheetInfo[] {
    if (!this.workbook) return [];

    return Object.keys(this.workbook.Sheets).map((name) => {
      const sheet = this.workbook!.Sheets[name];
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");

      return {
        name,
        hasData: !!sheet["!ref"],
        rowCount: range.e.r + 1,
        columnCount: range.e.c + 1,
      };
    });
  }

  // 智能选择工作表 - 返回所有匹配的sheets
  selectBestSheet(): string | null {
    const matchedSheets = this.getMatchedSheets();
    // 如果只有一个匹配，直接返回
    if (matchedSheets.length === 1) {
      return matchedSheets[0];
    }
    // 如果有多个匹配，返回null表示需要用户选择
    // 如果没有匹配，也返回null
    return null;
  }

  // 获取所有匹配的工作表名称
  getMatchedSheets(): string[] {
    if (!this.workbook) return [];

    const sheets = this.getSheetInfo();
    const matched: string[] = [];

    // 1. 收集所有匹配模板定义的工作表名称
    for (const preferredName of this.template.sheetNames) {
      const found = sheets.filter(
        (s) =>
          s.hasData &&
          (s.name === preferredName ||
            s.name.includes(preferredName) ||
            preferredName.includes(s.name))
      );
      found.forEach((sheet) => {
        if (!matched.includes(sheet.name)) {
          matched.push(sheet.name);
        }
      });
    }

    // 2. 如果没有匹配到任何模板名称，返回所有有数据的工作表
    if (matched.length === 0) {
      return sheets.filter((s) => s.hasData).map((s) => s.name);
    }

    return matched;
  }

  // 验证表头
  validateHeaders(sheetName: string): HeaderValidationResult {
    if (!this.workbook || !this.workbook.Sheets[sheetName]) {
      return {
        isValid: false,
        missingFields: this.template.requiredFields,
        unmatchedFields: [],
        suggestions: [],
      };
    }

    const sheet = this.workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (data.length === 0) {
      return {
        isValid: false,
        missingFields: this.template.requiredFields,
        unmatchedFields: [],
        suggestions: [],
      };
    }

    // 获取表头行（通常是第一行或第二行）
    const headerRow = this.findHeaderRow(data);
    if (!headerRow) {
      return {
        isValid: false,
        missingFields: this.template.requiredFields,
        unmatchedFields: [],
        suggestions: [],
      };
    }

    const actualHeaders = headerRow
      .map((h) => String(h || "").trim())
      .filter((h) => h);
    const requiredFields = this.template.requiredFields;

    // 检查缺失字段
    const missingFields: string[] = [];
    const unmatchedFields: string[] = [];
    const suggestions: Array<{
      expected: string;
      actual: string;
      similarity: number;
    }> = [];

    for (const required of requiredFields) {
      const found = actualHeaders.find(
        (actual) =>
          actual === required ||
          this.calculateSimilarity(actual, required) > 0.8
      );

      if (!found) {
        missingFields.push(required);

        // 寻找相似的字段名作为建议
        const bestMatch = actualHeaders.reduce(
          (best, actual) => {
            const similarity = this.calculateSimilarity(actual, required);
            return similarity > best.similarity ? { actual, similarity } : best;
          },
          { actual: "", similarity: 0 }
        );

        if (bestMatch.similarity > 0.5) {
          suggestions.push({
            expected: required,
            actual: bestMatch.actual,
            similarity: bestMatch.similarity,
          });
        }
      }
    }

    // 检查多余字段（可选，用于提示）
    for (const actual of actualHeaders) {
      const isRequired = requiredFields.some(
        (req) => actual === req || this.calculateSimilarity(actual, req) > 0.8
      );
      if (!isRequired && actual.length > 0) {
        unmatchedFields.push(actual);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      unmatchedFields,
      suggestions,
    };
  }

  // 查找表头行
  private findHeaderRow(data: any[][]): any[] | null {
    // 尝试前3行，找到包含最多必需字段的行
    for (let i = 0; i < Math.min(3, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const headers = row.map((h) => String(h || "").trim());
      const matchCount = this.template.requiredFields.filter((required) =>
        headers.some(
          (header) =>
            header === required ||
            this.calculateSimilarity(header, required) > 0.8
        )
      ).length;

      // 如果匹配超过一半的必需字段，认为是表头行
      if (matchCount >= this.template.requiredFields.length * 0.5) {
        return row;
      }
    }

    // 默认返回第一行
    return data[0] || null;
  }

  // 计算字符串相似度（简单的编辑距离）
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  // 执行完整验证
  async validate(sheetName: string): Promise<ValidationResult> {
    // 1. 先验证表头
    const headerValidation = this.validateHeaders(sheetName);

    if (!headerValidation.isValid) {
      return {
        isValid: false,
        headerValidation,
        errors: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorCount: 0,
        },
      };
    }

    // 2. 验证数据行
    const errors = await this.validateRows(sheetName);

    // 3. 计算统计信息
    const sheet = this.workbook!.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const totalRows = Math.max(0, data.length - 1); // 减去表头行
    const errorCount = errors.length;
    const validRows = totalRows - new Set(errors.map((e) => e.row)).size;

    return {
      isValid: errorCount === 0,
      headerValidation,
      errors,
      summary: {
        totalRows,
        validRows,
        errorCount,
      },
    };
  }

  // 验证数据行（基础实现，后续在Worker中完善）
  private async validateRows(sheetName: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!this.workbook) return errors;

    const sheet = this.workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (data.length <= 1) return errors; // 没有数据行

    const headerRow = data[0];
    const fieldMapping = this.createFieldMapping(headerRow);

    // 收集所有数据行用于跨行验证
    const allRows: Array<{ rowNumber: number; data: any[] }> = [];

    // 验证每一行数据
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every((cell) => !cell)) continue; // 跳过空行

      allRows.push({ rowNumber: i + 1, data: row });

      const rowErrors = this.validateSingleRow(row, fieldMapping, i + 1);
      errors.push(...rowErrors);
    }

    // 执行跨行验证
    const crossRowErrors = this.validateCrossRowRules(allRows, fieldMapping);
    errors.push(...crossRowErrors);

    return errors;
  }

  // 创建字段映射
  private createFieldMapping(headerRow: any[]): Map<string, number> {
    const mapping = new Map<string, number>();

    headerRow.forEach((header, index) => {
      const headerStr = String(header || "").trim();
      if (headerStr) {
        // 直接映射
        mapping.set(headerStr, index);

        // 通过模板映射
        const mappedField = this.template.fieldMappings[headerStr];
        if (mappedField) {
          mapping.set(mappedField, index);
        }
      }
    });

    return mapping;
  }

  // 验证单行数据
  private validateSingleRow(
    row: any[],
    fieldMapping: Map<string, number>,
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.template.validationRules) {
      const columnIndex = fieldMapping.get(rule.field);
      if (columnIndex === undefined) continue;

      const value = row[columnIndex];
      const error = this.validateField(value, rule, rowNumber, columnIndex);

      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  // 验证单个字段
  private validateField(
    value: any,
    rule: ValidationRule,
    row: number,
    column: number
  ): ValidationError | null {
    const columnLetter = XLSX.utils.encode_col(column);

    switch (rule.type) {
      case "required":
        if (!value || String(value).trim() === "") {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      case "dateFormat":
        if (value && !this.isValidDate(value)) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      case "medicalLevel":
        if (value && !this.isValidMedicalLevel(value, rule.params)) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      case "prohibitedContent":
        if (value && typeof value === "string") {
          const content = value.trim();
          if (content && rule.params?.prohibitedTerms) {
            const prohibitedTerms = rule.params.prohibitedTerms as string[];
            for (const term of prohibitedTerms) {
              if (content.includes(term)) {
                return {
                  row,
                  column: columnLetter,
                  field: rule.field,
                  value,
                  message: `${rule.message}：发现禁用词汇"${term}"`,
                  errorType: rule.type,
                };
              }
            }
          }
        }
        break;

      case "timeRange":
        if (value && !this.isValidTimeRange(value, rule.params)) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      case "duration":
        if (value && !this.isValidDuration(value, rule.params)) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      case "minValue":
        if (value && !this.isValidMinValue(value, rule.params)) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          };
        }
        break;

      // 跨行验证规则在validateCrossRowRules中处理
      case "unique":
      case "frequency":
      case "dateInterval":
        // 这些规则需要跨行数据，在validateCrossRowRules中处理
        break;
    }

    return null;
  }

  // 日期格式验证 - 简化版本，与服务端保持一致
  private isValidDate(value: any): boolean {
    if (!value) return false;

    // Excel日期可能是数字或字符串
    if (typeof value === "number") {
      return value > 0; // Excel日期是正数
    }

    // 使用简化的日期解析来验证
    const parsedDate = this.parseSimpleDate(value);
    return parsedDate !== null;
  }

  // 简化的日期解析函数 - 与服务端逻辑一致
  private parseSimpleDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    const str = value.toString().trim();

    // Handle Excel date numbers (days since 1900-01-01)
    if (/^\d+(\.\d+)?$/.test(str)) {
      const excelDate = parseFloat(str);
      // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle Chinese date format: 2025年11月5日 or 2025年11月5
    const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
    if (chineseDateMatch) {
      const year = parseInt(chineseDateMatch[1], 10);
      const month = parseInt(chineseDateMatch[2], 10);
      const day = parseInt(chineseDateMatch[3], 10);
      return new Date(year, month - 1, day); // month is 0-indexed
    }

    // Handle various date formats
    let date: Date;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      // Parse date components to avoid timezone issues
      const [year, month, day] = str.split("-").map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    }
    // Try datetime format (YYYY-MM-DD HH:MM)
    else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
      date = new Date(str);
    }
    // Try other common formats
    else {
      date = new Date(str);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  // 医疗等级验证
  private isValidMedicalLevel(value: any, params: any): boolean {
    if (!value || !params) return false;

    const str = String(value).trim();
    const { allowedLevels = [], allowedSuffixes = [] } = params;

    // 检查是否包含等级信息
    const hasLevel = allowedLevels.some((level: string) => str.includes(level));
    if (!hasLevel) return false;

    // 如果有后缀要求，检查后缀
    if (allowedSuffixes.length > 0) {
      const hasSuffix = allowedSuffixes.some((suffix: string) =>
        str.includes(suffix)
      );
      return hasSuffix;
    }

    return true;
  }

  // 时间范围验证
  private isValidTimeRange(value: any, params: any): boolean {
    if (!params || !params.startHour || !params.endHour) return true;

    const date = this.extractDate(value);
    if (!date) return false;

    const hour = date.getHours();
    return hour >= params.startHour && hour <= params.endHour;
  }

  // 持续时间验证
  private isValidDuration(value: any, params: any): boolean {
    if (!params || !params.minMinutes) return true;

    const duration = this.parseDuration(value);
    if (duration === null) return false;

    return duration >= params.minMinutes;
  }

  // 解析持续时间，支持多种格式
  // 支持: "60", "60分钟", "60 分钟", "1.5小时", "90min", "1h30m" 等
  private parseDuration(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;

    const str = String(value).trim();
    if (!str) return null;

    // 尝试直接转换为数字（纯数字格式）
    const directNumber = Number(str);
    if (!isNaN(directNumber) && directNumber >= 0) {
      return directNumber;
    }

    // 匹配带中文单位的格式
    // 匹配: "60分钟", "60 分钟", "1.5小时", "90分" 等
    const chineseMinuteMatch = str.match(
      /^([0-9]+\.?[0-9]*)\s*(?:分钟?|min|mins|minutes?)$/i
    );
    if (chineseMinuteMatch) {
      const minutes = parseFloat(chineseMinuteMatch[1]);
      return !isNaN(minutes) && minutes >= 0 ? minutes : null;
    }

    const chineseHourMatch = str.match(
      /^([0-9]+\.?[0-9]*)\s*(?:小时|时|hour|hours?|h)$/i
    );
    if (chineseHourMatch) {
      const hours = parseFloat(chineseHourMatch[1]);
      return !isNaN(hours) && hours >= 0 ? hours * 60 : null;
    }

    // 匹配复合格式: "1小时30分钟", "1h30m", "1时30分" 等
    const compositeMatch = str.match(
      /^([0-9]+)\s*(?:小时|时|h)\s*([0-9]+)\s*(?:分钟?|m)$/i
    );
    if (compositeMatch) {
      const hours = parseInt(compositeMatch[1], 10);
      const minutes = parseInt(compositeMatch[2], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }

    // 如果都不匹配，返回null
    return null;
  }

  // 最小值验证
  private isValidMinValue(value: any, params: any): boolean {
    if (!params || params.min === undefined) return true;

    const numValue = Number(value);
    if (isNaN(numValue)) return false;

    return numValue >= params.min;
  }

  // 跨行验证规则
  private validateCrossRowRules(
    allRows: Array<{ rowNumber: number; data: any[] }>,
    fieldMapping: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 获取需要跨行验证的规则
    const crossRowRules = this.template.validationRules.filter((rule) =>
      ["unique", "frequency", "dateInterval", "sameImplementer"].includes(
        rule.type
      )
    );

    console.log(`\n🔄 [CrossRowValidation] 开始跨行验证`, {
      templateName: this.template.name,
      totalRules: this.template.validationRules.length,
      crossRowRulesCount: crossRowRules.length,
      crossRowRules: crossRowRules.map((r) => ({
        field: r.field,
        type: r.type,
      })),
      totalRows: allRows.length,
    });

    for (const rule of crossRowRules) {
      const columnIndex = fieldMapping.get(rule.field);

      console.log(`\n📌 [CrossRowValidation] 处理规则:`, {
        field: rule.field,
        type: rule.type,
        columnIndex,
        hasColumnIndex: columnIndex !== undefined,
      });

      if (columnIndex === undefined) {
        console.warn(
          `⚠️ [CrossRowValidation] 跳过规则（找不到列索引）:`,
          rule.field
        );
        continue;
      }

      switch (rule.type) {
        case "unique":
          errors.push(...this.validateUniqueRule(allRows, rule, columnIndex));
          break;
        case "frequency":
          errors.push(
            ...this.validateFrequencyRule(
              allRows,
              rule,
              columnIndex,
              fieldMapping
            )
          );
          break;
        case "dateInterval":
          errors.push(
            ...this.validateDateIntervalRule(
              allRows,
              rule,
              columnIndex,
              fieldMapping
            )
          );
          break;
        case "sameImplementer":
          errors.push(
            ...this.validateSameImplementerRule(
              allRows,
              rule,
              columnIndex,
              fieldMapping
            )
          );
          break;
      }
    }

    console.log(
      `\n✅ [CrossRowValidation] 跨行验证完成，共发现${errors.length}个错误\n`
    );
    return errors;
  }

  // 验证唯一性规则
  private validateUniqueRule(
    allRows: Array<{ rowNumber: number; data: any[] }>,
    rule: ValidationRule,
    columnIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const valueMap = new Map<string, number[]>();

    // 收集所有值和对应的行号
    allRows.forEach(({ rowNumber, data }) => {
      const value = data[columnIndex];
      if (value && String(value).trim()) {
        const key = String(value).trim().toLowerCase();
        if (!valueMap.has(key)) {
          valueMap.set(key, []);
        }
        valueMap.get(key)!.push(rowNumber);
      }
    });

    // 检查重复值
    valueMap.forEach((rowNumbers, value) => {
      if (rowNumbers.length > 1) {
        // 除了第一个，其他都标记为错误
        for (let i = 1; i < rowNumbers.length; i++) {
          const rowNumber = rowNumbers[i];
          errors.push({
            row: rowNumber,
            column: XLSX.utils.encode_col(columnIndex),
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          });
        }
      }
    });

    return errors;
  }

  // 验证同一目标需由同一人拜访规则
  private validateSameImplementerRule(
    allRows: Array<{ rowNumber: number; data: any[] }>,
    rule: ValidationRule,
    columnIndex: number,
    fieldMapping: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { params = {} } = rule;
    const { targetField, implementerField, addressField } = params;

    console.log(`🔍 [SameImplementer] 开始验证规则:`, {
      field: rule.field,
      targetField,
      implementerField,
      addressField,
      message: rule.message,
      totalRows: allRows.length,
    });

    // 获取实施人列索引
    const implementerIndex =
      fieldMapping.get(implementerField) ??
      fieldMapping.get("实施人") ??
      fieldMapping.get("implementer");

    // 获取地址列索引 (如果有配置)
    const addressIndex = addressField
      ? fieldMapping.get(addressField)
      : undefined;

    if (implementerIndex === undefined) {
      console.warn(`⚠️ [SameImplementer] 找不到实施人列索引，跳过验证`);
      return errors;
    }

    // 按目标（如药店名称 + 地址）分组
    // Map: targetKey -> { firstImplementer, firstRowNumber, rows: [{rowNumber, implementer}] }
    const targetGroups = new Map<
      string,
      {
        firstImplementer: string;
        firstRowNumber: number;
        originalTarget: string; // 用于显示
        originalAddress?: string; // 用于显示
        rows: Array<{ rowNumber: number; implementer: string }>;
      }
    >();

    allRows.forEach(({ rowNumber, data }) => {
      const targetValue = data[columnIndex];
      const implementerValue = data[implementerIndex];
      const addressValue =
        addressIndex !== undefined ? data[addressIndex] : undefined;

      // 如果没有目标值或实施人值，跳过
      // 注意：如果没有配置地址字段，或者配置了但该行地址为空，我们仍然应当基于名称进行校验吗？
      // 现在的逻辑是：如果该字段有值才校验。
      if (!targetValue || !implementerValue) return;

      const targetStr = String(targetValue).trim();
      const implementer = String(implementerValue).trim();
      const addressStr = addressValue ? String(addressValue).trim() : "";

      // 构造唯一键：目标名称 + 地址 (如果启用)
      // 使用特定分隔符，避免与内容冲突
      const targetKey = addressField
        ? `${targetStr.toLowerCase()}|${addressStr.toLowerCase()}`
        : targetStr.toLowerCase();

      if (!targetGroups.has(targetKey)) {
        targetGroups.set(targetKey, {
          firstImplementer: implementer,
          firstRowNumber: rowNumber,
          originalTarget: targetStr,
          originalAddress: addressStr,
          rows: [],
        });
      }

      targetGroups.get(targetKey)!.rows.push({ rowNumber, implementer });
    });

    // 检查每个目标分组，确保只有一个实施人
    targetGroups.forEach((group, _) => {
      const {
        firstImplementer,
        firstRowNumber,
        rows,
        originalTarget,
        originalAddress,
      } = group;

      rows.forEach(({ rowNumber, implementer }) => {
        // 忽略大小写比较实施人
        if (implementer.toLowerCase() !== firstImplementer.toLowerCase()) {
          const addressMsg = originalAddress
            ? `，地址：${originalAddress}`
            : "";

          errors.push({
            row: rowNumber,
            column: XLSX.utils.encode_col(columnIndex),
            field: rule.field,
            value: originalTarget,
            message: `${rule.message}（目标：${originalTarget}${addressMsg}；第${firstRowNumber}行由"${firstImplementer}"拜访，第${rowNumber}行由"${implementer}"拜访）`,
            errorType: rule.type,
          });
        }
      });
    });

    console.log(`✅ [SameImplementer] 验证完成，发现${errors.length}个错误`);
    return errors;
  }

  // 验证频次规则
  private validateFrequencyRule(
    allRows: Array<{ rowNumber: number; data: any[] }>,
    rule: ValidationRule,
    columnIndex: number,
    fieldMapping: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { maxPerDay, groupBy } = rule.params || {};

    if (!maxPerDay || !groupBy) return errors;

    const groupColumnIndex = fieldMapping.get(groupBy);
    if (groupColumnIndex === undefined) return errors;

    // 按日期和分组字段统计频次
    const dailyCount = new Map<string, Map<string, number>>();
    const rowTracker = new Map<string, number[]>();

    allRows.forEach(({ rowNumber, data }) => {
      const groupValue = data[groupColumnIndex];
      const dateValue = data[columnIndex];

      if (groupValue && dateValue) {
        const date = this.extractDate(dateValue);
        const group = String(groupValue).trim();

        if (date) {
          const dateKey = date.toISOString().split("T")[0];
          const key = `${dateKey}_${group}`;

          if (!dailyCount.has(dateKey)) {
            dailyCount.set(dateKey, new Map());
          }

          const dayMap = dailyCount.get(dateKey)!;
          dayMap.set(group, (dayMap.get(group) || 0) + 1);

          if (!rowTracker.has(key)) {
            rowTracker.set(key, []);
          }
          rowTracker.get(key)!.push(rowNumber);
        }
      }
    });

    // 检查超限情况
    dailyCount.forEach((dayMap, date) => {
      dayMap.forEach((count, group) => {
        if (count > maxPerDay) {
          const key = `${date}_${group}`;
          const rowNumbers = rowTracker.get(key) || [];

          // 标记超出限制的行
          for (let i = maxPerDay; i < rowNumbers.length; i++) {
            const rowNumber = rowNumbers[i];
            errors.push({
              row: rowNumber,
              column: XLSX.utils.encode_col(columnIndex),
              field: rule.field,
              value: group,
              message: rule.message,
              errorType: rule.type,
            });
          }
        }
      });
    });

    return errors;
  }

  // 验证日期间隔规则
  private validateDateIntervalRule(
    allRows: Array<{ rowNumber: number; data: any[] }>,
    rule: ValidationRule,
    columnIndex: number,
    fieldMapping: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { days, groupBy } = rule.params || {};

    console.log(`🔍 [DateInterval] 开始验证规则:`, {
      field: rule.field,
      days,
      groupBy,
      message: rule.message,
      columnIndex,
      totalRows: allRows.length,
    });

    if (!days || !groupBy) {
      console.warn(`⚠️ [DateInterval] 缺少必需参数:`, { days, groupBy });
      return errors;
    }

    const groupColumnIndex = fieldMapping.get(groupBy);
    const implementerColumnIndex = fieldMapping.get("implementer");

    console.log(`📍 [DateInterval] 列索引映射:`, {
      dateColumnIndex: columnIndex,
      groupColumnIndex,
      implementerColumnIndex,
      fieldMapping: Array.from(fieldMapping.entries()),
    });

    if (
      groupColumnIndex === undefined ||
      implementerColumnIndex === undefined
    ) {
      console.warn(`⚠️ [DateInterval] 无法找到必需的列:`, {
        groupColumnIndex,
        implementerColumnIndex,
      });
      return errors;
    }

    // 按实施人+分组字段收集日期
    const groupDates = new Map<
      string,
      Array<{
        date: Date;
        rowNumber: number;
        implementer: string;
        target: string;
      }>
    >();

    allRows.forEach(({ rowNumber, data }) => {
      const groupValue = data[groupColumnIndex];
      const implementer = data[implementerColumnIndex];
      const dateValue = data[columnIndex];

      console.log(`📝 [DateInterval] 处理第${rowNumber}行:`, {
        rowNumber,
        dateValue,
        dateValueType: typeof dateValue,
        groupValue,
        implementer,
      });

      if (groupValue && dateValue && implementer) {
        const date = this.extractDate(dateValue);
        const target = String(groupValue).trim();
        const implementerStr = String(implementer).trim();

        console.log(`  ✓ 解析结果:`, {
          date: date ? date.toISOString().split("T")[0] : null,
          target,
          implementer: implementerStr,
        });

        if (date) {
          // 创建唯一键：实施人+目标，确保不同实施人可以拜访同一目标
          const uniqueKey = `${implementerStr}|${target}`;
          if (!groupDates.has(uniqueKey)) {
            groupDates.set(uniqueKey, []);
          }
          groupDates
            .get(uniqueKey)!
            .push({ date, rowNumber, implementer: implementerStr, target });

          console.log(`  ✓ 添加到分组: ${uniqueKey}`);
        } else {
          console.warn(`  ⚠️ 日期解析失败`);
        }
      } else {
        console.log(`  ⊘ 跳过（缺少必需值）`);
      }
    });

    console.log(`\n📊 [DateInterval] 分组统计:`, {
      totalGroups: groupDates.size,
      groups: Array.from(groupDates.entries()).map(([key, visits]) => ({
        key,
        visitCount: visits.length,
        dates: visits.map((v) => v.date.toISOString().split("T")[0]),
      })),
    });

    // 检查日期间隔（同一实施人+同一目标）
    console.log(`\n🔎 [DateInterval] 开始检查日期间隔（要求≥${days}天）...`);

    groupDates.forEach((dateList, uniqueKey) => {
      // 按日期排序
      dateList.sort((a, b) => a.date.getTime() - b.date.getTime());

      console.log(`\n检查分组: ${uniqueKey} (${dateList.length}次访问)`);

      for (let i = 1; i < dateList.length; i++) {
        const current = dateList[i];
        const previous = dateList[i - 1];

        const daysDiff = Math.floor(
          (current.date.getTime() - previous.date.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        console.log(
          `  比较: 第${previous.rowNumber}行 → 第${current.rowNumber}行`,
          {
            previousDate: previous.date.toISOString().split("T")[0],
            currentDate: current.date.toISOString().split("T")[0],
            daysDiff,
            requiredDays: days,
            isViolation: daysDiff < days,
          }
        );

        if (daysDiff < days) {
          const parts = uniqueKey.split("|");
          const implementer = parts[0];
          const target = parts[1];

          const error = {
            row: current.rowNumber,
            column: XLSX.utils.encode_col(columnIndex),
            field: rule.field,
            value: target,
            message: `${rule.message}（与第${previous.rowNumber}行冲突，实施人：${implementer}，目标：${target}）`,
            errorType: rule.type,
          };

          console.log(`  ❌ 发现违规！`, error);
          errors.push(error);
        } else {
          console.log(`  ✓ 符合规则`);
        }
      }
    });

    console.log(`\n✅ [DateInterval] 验证完成，发现${errors.length}个错误\n`);
    return errors;
  }

  // 提取日期
  private extractDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "number") {
      // Excel日期序列号
      return new Date((value - 25569) * 86400 * 1000);
    }

    if (typeof value === "string") {
      const str = value.trim();

      // 匹配中文日期格式：2025年11月5日 或 2025年11月5
      const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
      if (chineseDateMatch) {
        const year = parseInt(chineseDateMatch[1], 10);
        const month = parseInt(chineseDateMatch[2], 10);
        const day = parseInt(chineseDateMatch[3], 10);
        return new Date(year, month - 1, day); // month is 0-indexed
      }

      // 尝试标准格式
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }
}
