import * as XLSX from "xlsx";
import { ValidationRule, TaskTemplate } from "./templateParser";
import { ImageValidator, ImageValidationResult } from "./imageValidator";

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

export class ExcelValidator {
  private template: TaskTemplate;
  private imageValidator: ImageValidator;

  constructor(template: TaskTemplate) {
    this.template = template;
    this.imageValidator = new ImageValidator();
  }

  private getPossibleSheetNames(userSpecifiedSheet?: string): string[] {
    const taskName = this.template.name;
    const templateName = this.template.template;

    // 定义市场调研类任务
    const marketResearchTasks = [
      "消费者调研",
      "患者调研",
      "店员调研",
      "药店调研",
    ];

    // Define sheet name mappings based on task type and template data
    // 基于模板总汇.xlsx中J列样式链接和B列服务项目的映射
    const sheetNameMappings: Record<string, string[]> = {
      // J列样式链接映射（优先级最高）
      消费者调研: ["消费者问卷"],
      患者调研: ["患者问卷"],
      店员调研: ["店员问卷"],
      药店调研: ["药店调研问卷"],
      竞品信息收集: ["竞品数据购进收集"],
      药店拜访: ["药店拜访"],
      等级医院拜访: ["医院拜访"],
      基层医疗机构拜访: ["医院拜访"],
      民营医院拜访: ["医院拜访"],
      科室拜访: ["科室拜访", "医院拜访"],
      培训会: ["登记表 议程"],
      科室会: ["科室会"],
      圆桌会: ["圆桌会"],
      "学术研讨、病例讨论会": ["申请审批表"],
      大型推广活动: ["活动申请表"],
      小型推广活动: ["小型推广活动"],
      药店陈列服务: ["活动总结"],
    };

    // 为市场调研类任务生成数据清单格式的工作表名称
    const generateMarketResearchDataSheetNames = (task: string): string[] => {
      const dataSheetNames: string[] = [];

      switch (task) {
        case "消费者调研":
          dataSheetNames.push("消费者问卷数据清单", "消费者调研数据清单");
          break;
        case "患者调研":
          dataSheetNames.push("患者问卷数据清单", "患者调研数据清单");
          break;
        case "店员调研":
          dataSheetNames.push("店员问卷数据清单", "店员调研数据清单");
          break;
        case "药店调研":
          dataSheetNames.push("药店调研问卷数据清单", "药店调研数据清单");
          break;
      }

      return dataSheetNames;
    };

    const possibleNames: string[] = [];

    // 1. User specified sheet name (highest priority)
    if (userSpecifiedSheet) {
      possibleNames.push(userSpecifiedSheet);
    }

    // 2. J列样式链接名称（优先级最高的自动匹配）
    if (sheetNameMappings[taskName]) {
      possibleNames.push(...sheetNameMappings[taskName]);
    }

    // 3. 市场调研类任务的特殊匹配逻辑
    if (marketResearchTasks.includes(taskName)) {
      // 添加数据清单格式的工作表名称
      const dataSheetNames = generateMarketResearchDataSheetNames(taskName);
      possibleNames.push(...dataSheetNames);
    }

    // 4. B列服务项目名称（直接任务名）
    possibleNames.push(taskName);

    // 5. Template name from Excel
    if (templateName) {
      possibleNames.push(templateName);
    }

    // 6. Common variations and fallbacks
    possibleNames.push(
      // Remove task type suffix and try base name
      taskName.replace(/拜访$/, ""),
      taskName.replace(/调研$/, ""),
      taskName.replace(/会$/, ""),
      // Try with common prefixes/suffixes
      `${taskName}表`,
      `${taskName}数据`,
      `${taskName}模板`,
      // Generic fallbacks
      "Sheet1",
      "工作表1"
    );

    return possibleNames;
  }

  async validateExcel(
    buffer: Buffer,
    sheetName?: string
  ): Promise<ValidationResult> {
    const workbook = XLSX.read(buffer);

    // Try multiple possible sheet names in order of preference
    const possibleSheetNames =
      this.getPossibleSheetNames(sheetName).filter(Boolean);

    let targetSheetName: string | undefined;
    let worksheet: XLSX.WorkSheet | undefined;

    // Find the first sheet that exists
    const availableSheets = Object.keys(workbook.Sheets);

    // 只尝试精确匹配，不进行自动匹配或后备策略
    for (const sheetName of possibleSheetNames) {
      if (workbook.Sheets[sheetName!]) {
        targetSheetName = sheetName!;
        worksheet = workbook.Sheets[sheetName!];
        break;
      }
    }

    // 如果没有找到精确匹配的工作表，直接返回错误让用户选择
    // 不进行任何自动匹配或后备策略

    if (!worksheet || !targetSheetName) {
      // 返回特殊错误，包含可用工作表信息供用户选择
      const error = new Error(
        `找不到匹配的工作表。任务类型: ${
          this.template.name
        }。可用工作表: [${availableSheets.join(
          ", "
        )}]。尝试查找的工作表: [${possibleSheetNames.join(", ")}]`
      );
      (error as any).availableSheets = availableSheets;
      (error as any).taskName = this.template.name;
      (error as any).errorType = "SHEET_NOT_FOUND";
      throw error;
    }

    let headerRowIndex = 0; // Declare at function scope

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const errors: ValidationError[] = [];

    if (data.length < 2) {
      return {
        isValid: false,
        errors: [
          {
            sheet: targetSheetName,
            row: 0,
            column: "",
            field: "",
            errorType: "structure",
            message: "文件至少需要包含表头和数据行",
          },
        ],
        summary: { totalRows: 0, validRows: 0, errorCount: 1 },
      };
    }

    // Find the real header row (not just the first row)
    let headers: string[] = [];

    // Look for the row that contains the most non-empty string values
    // and has typical header patterns
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const row = data[i] as string[];
      if (row && row.length > 0) {
        const nonEmptyCount = row.filter(
          (cell) => cell && typeof cell === "string" && cell.trim()
        ).length;
        const hasTypicalHeaders = row.some(
          (cell) =>
            cell &&
            typeof cell === "string" &&
            (cell.includes("实施") ||
              cell.includes("对接") ||
              cell.includes("零售") ||
              cell.includes("拜访") ||
              cell.includes("时间") ||
              cell.includes("时长") ||
              cell.includes("医生") ||
              cell.includes("医疗机构") ||
              cell.includes("医疗类型") ||
              cell.includes("科室") ||
              cell.includes("任务标题") ||
              cell.includes("调查对象") ||
              cell.includes("调研") ||
              cell.includes("店员") ||
              cell.includes("员工") ||
              cell.includes("姓名") ||
              cell.includes("年龄") ||
              cell.includes("性别") ||
              cell.includes("联系方式") ||
              cell.includes("竞品") ||
              cell.includes("收集") ||
              cell.includes("会议") ||
              cell.includes("参会") ||
              cell.includes("参与") ||
              cell.includes("活动") ||
              cell.includes("陈列") ||
              cell.includes("服务") ||
              cell.includes("地点") ||
              cell.includes("主题"))
        );

        if (nonEmptyCount >= 3 && hasTypicalHeaders) {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
    }

    const headerMap = this.createHeaderMap(headers);

    // Validate data rows (skip header and any rows before it)
    const dataRows = data.slice(headerRowIndex + 1);
    let validRows = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = headerRowIndex + i + 2; // Excel row number (1-indexed + header offset)

      if (!row || row.every((cell) => !cell)) continue; // Skip empty rows

      const rowData = this.parseRowData(row, headerMap);
      const rowErrors = this.validateRow(
        rowData,
        rowNumber,
        targetSheetName,
        headerMap
      );

      if (rowErrors.length === 0) {
        validRows++;
      }

      errors.push(...rowErrors);
    }

    // Cross-row validations (for rules like uniqueness, frequency limits)
    const crossRowErrors = this.validateCrossRows(
      dataRows,
      headerMap,
      targetSheetName,
      headerRowIndex
    );
    errors.push(...crossRowErrors);

    // 执行图片验证
    let imageValidation: ImageValidationResult | undefined;
    try {
      console.log("开始图片验证...");
      imageValidation = await this.imageValidator.validateImages(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer,
        dataRows.map((row) => this.convertRowToObject(row, headerMap))
      );
      console.log("图片验证完成");
    } catch (error) {
      console.error("图片验证失败:", error);
      // 图片验证失败不影响主要验证流程
    }

    return {
      isValid: errors.length === 0,
      errors,
      summary: {
        totalRows: dataRows.length,
        validRows: validRows,
        errorCount: errors.length,
      },
      imageValidation,
    };
  }

  /**
   * 将Excel行数据转换为对象格式，供图片验证使用
   */
  private convertRowToObject(row: any[], headerMap: Map<string, number>): any {
    const obj: any = {};

    // 反向映射：从列索引到字段名
    const indexToField = new Map<number, string>();
    for (const [fieldName, columnIndex] of headerMap.entries()) {
      indexToField.set(columnIndex, fieldName);
    }

    // 转换行数据为对象
    for (let i = 0; i < row.length; i++) {
      const fieldName = indexToField.get(i);
      if (
        fieldName &&
        row[i] !== undefined &&
        row[i] !== null &&
        row[i] !== ""
      ) {
        obj[fieldName] = row[i];
      }
    }

    return obj;
  }

  private createHeaderMap(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();

    // Field mappings - support both test format and template format
    // 使用具体的 key 避免重复，格式：原始key + 上下文后缀
    const fieldMappings = {
      序号: "sequence_number",

      // 药店拜访 - Test file format
      药店名称: "pharmacy_name",
      对接人: "contact_person",
      实施人: "implementer",
      拜访时间: "visit_time",
      拜访日期: "visit_date",
      开始时间: "start_time",
      结束时间: "end_time",
      拜访时长: "visit_duration",
      拜访内容: "visit_content",

      // 药店拜访 - Template format from 模板总汇.xlsx
      零售渠道: "pharmacy_name",
      "实施\n人_pharmacy": "implementer",
      "拜访开始\n时间_pharmacy": "visit_time",
      任务标题_pharmacy: "task_title",
      渠道地址: "pharmacy_address",
      "拜访事项\n（1）_pharmacy": "visit_content_1_pharmacy",
      "信息反馈（1）_pharmacy": "feedback_1_pharmacy",

      // 市场调研类任务字段映射
      调查对象姓名: "survey_target_name",
      店员姓名: "employee_name",
      员工姓名: "employee_name",
      调研时间: "survey_time",
      调研日期: "survey_time",
      调查时间: "survey_time",
      调查日期: "survey_time",
      年龄: "age",
      性别: "gender",
      联系方式: "contact_info",
      电话: "contact_info",
      手机号: "contact_info",
      调研内容: "survey_content",
      调查内容: "survey_content",
      问卷内容: "survey_content",

      // 竞品信息收集字段映射
      收集时间: "collection_time",
      收集日期: "collection_time",
      竞品信息: "competitor_info",
      竞品名称: "competitor_name",

      // 科室拜访字段映射
      科室名称: "department_name",
      拜访持续时间: "visit_duration",
      时长: "visit_duration",

      // 会议类任务字段映射
      会议时间: "meeting_time",
      会议日期: "meeting_time",
      参会人数: "participant_count",
      参与人数: "participant_count",
      会议主题: "meeting_topic",
      会议地点: "meeting_location",

      // 推广活动类任务字段映射
      活动时间: "activity_time",
      活动日期: "activity_time",
      活动地点: "activity_location",
      活动主题: "activity_topic",

      // 药店陈列服务字段映射
      服务时间: "service_time",
      服务日期: "service_time",
      陈列内容: "display_content",
      陈列位置: "display_location",
      "拜访事\n项（2）_pharmacy": "visit_content_2_pharmacy",
      "信息反馈（2）_pharmacy": "feedback_2_pharmacy",

      // 医院拜访 - Template format from 模板总汇.xlsx (actual headers from row 3)
      医生姓名: "doctor_name",
      医疗机构名称: "hospital_name",
      医疗类型: "medical_type",
      拜访开始时间_hospital: "visit_time",
      "拜访事项（1）_hospital": "visit_content_1_hospital",
      "信息反馈（1）_hospital": "feedback_1_hospital",
      "拜访事项（2）_hospital": "visit_content_2_hospital",
      "信息反馈（2）_hospital": "feedback_2_hospital",
      医院门头照: "hospital_photo",
      内部照片: "internal_photo",

      // Handle variations with newlines (actual format from template)
      "医疗机构\n名称_hospital": "hospital_name",
      "拜访事项\n（1）_hospital": "visit_content_1_hospital_newline",
      "拜访事项\n（2）_hospital": "visit_content_2_hospital_newline",
      "医院门头\n照_hospital": "hospital_photo",
    };

    headers.forEach((header, index) => {
      if (header) {
        // Clean header (remove extra whitespace and newlines)
        const cleanHeader = header.trim().replace(/\s+/g, " ");

        // Direct mapping
        map.set(header, index);
        map.set(cleanHeader, index);

        // Check for field mappings with context-aware matching
        let mappedField =
          fieldMappings[header as keyof typeof fieldMappings] ||
          fieldMappings[cleanHeader as keyof typeof fieldMappings];

        // If no direct match, try with context suffixes
        if (!mappedField) {
          const taskType = this.template.name;
          let suffix = "";

          if (taskType.includes("医院拜访")) {
            suffix = "_hospital";
          } else if (taskType.includes("药店")) {
            suffix = "_pharmacy";
          }

          if (suffix) {
            mappedField =
              fieldMappings[(header + suffix) as keyof typeof fieldMappings] ||
              fieldMappings[
                (cleanHeader + suffix) as keyof typeof fieldMappings
              ];
          }
        }

        if (mappedField) {
          map.set(mappedField, index);
        }
      }
    });

    return map;
  }

  private parseRowData(
    row: any[],
    headerMap: Map<string, number>
  ): Record<string, any> {
    const data: Record<string, any> = {};

    headerMap.forEach((colIndex, fieldName) => {
      let value = row[colIndex];

      // Auto-format date/time fields for further validation
      if (
        fieldName === "visit_time" ||
        fieldName === "拜访开始时间" ||
        fieldName === "拜访开始\n时间"
      ) {
        const originalValue = value;
        value = this.formatDateForValidation(value);
        // Store both original and formatted values for different validation purposes
        data[fieldName + "_original"] = originalValue;
      }

      // Clean and normalize medical type values for hospital visits
      if (fieldName === "medical_type" || fieldName === "医疗类型") {
        if (value && typeof value === "string") {
          // Remove extra whitespace and normalize common variations
          let normalizedValue = value.trim();

          // Map old tier system to new categories
          if (
            normalizedValue.includes("三级") ||
            normalizedValue.includes("二级") ||
            normalizedValue.includes("一级")
          ) {
            normalizedValue = "等级医院";
          } else if (
            normalizedValue.includes("社区卫生") ||
            normalizedValue.includes("乡镇卫生") ||
            normalizedValue.includes("村卫生") ||
            normalizedValue.includes("基层")
          ) {
            normalizedValue = "基层医疗";
          } else if (
            normalizedValue.includes("民营") ||
            normalizedValue.includes("私立")
          ) {
            normalizedValue = "民营医院";
          }

          value = normalizedValue;
        }
      }

      // Clean hospital name for consistency
      if (
        fieldName === "hospital_name" ||
        fieldName === "医疗机构名称" ||
        fieldName === "医疗机构\n名称"
      ) {
        if (value && typeof value === "string") {
          value = value.trim();
        }
      }

      // Normalize implementer names
      if (fieldName === "implementer" || fieldName === "实施人") {
        if (value && typeof value === "string") {
          value = value.trim();
        }
      }

      data[fieldName] = value;
    });

    return data;
  }

  private formatDateForValidation(value: any): any {
    if (!value) return value;

    const str = value.toString().trim();

    // Extract date part from formats like "2025.8.1\n08：00"
    const dateMatch = str.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
      return formatted;
    }

    return value;
  }

  private validateRow(
    rowData: Record<string, any>,
    rowNumber: number,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.template.validationRules) {
      const error = this.validateRule(
        rule,
        rowData,
        rowNumber,
        sheetName,
        headerMap
      );
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  private validateRule(
    rule: ValidationRule,
    rowData: Record<string, any>,
    rowNumber: number,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError | null {
    const value = rowData[rule.field];
    const columnIndex = headerMap.get(rule.field);
    const columnName = this.getColumnName(columnIndex);

    switch (rule.type) {
      case "required":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return {
            sheet: sheetName,
            row: rowNumber,
            column: columnName,
            field: rule.field,
            errorType: "required",
            message: rule.message,
            value,
          };
        }

        // Check if value matches expected values (for enum validation)
        if (
          rule.params?.expectedValues &&
          Array.isArray(rule.params.expectedValues)
        ) {
          const stringValue =
            typeof value === "string" ? value.trim() : String(value);
          if (!rule.params.expectedValues.includes(stringValue)) {
            return {
              sheet: sheetName,
              row: rowNumber,
              column: columnName,
              field: rule.field,
              errorType: "enum",
              message: rule.message,
              value,
            };
          }
        }
        break;

      case "timeRange":
        if (value) {
          const timeStr = this.extractTimeFromValue(value);
          if (
            timeStr &&
            !this.isTimeInRange(
              timeStr,
              rule.params.startTime,
              rule.params.endTime
            )
          ) {
            return {
              sheet: sheetName,
              row: rowNumber,
              column: columnName,
              field: rule.field,
              errorType: "timeRange",
              message: rule.message,
              value,
            };
          }
        }
        break;

      case "duration":
        if (value) {
          const duration = this.parseDuration(value);
          if (duration !== null && duration < rule.params.minMinutes) {
            return {
              sheet: sheetName,
              row: rowNumber,
              column: columnName,
              field: rule.field,
              errorType: "duration",
              message: rule.message,
              value,
            };
          }
        }
        break;

      case "dateFormat":
        // Use original value for date format validation
        const originalValue = rowData[rule.field + "_original"] || value;
        if (originalValue) {
          const hasTimeComponent = this.hasTimeComponent(originalValue);
          if (!rule.params.allowTimeComponent && hasTimeComponent) {
            return {
              sheet: sheetName,
              row: rowNumber,
              column: columnName,
              field: rule.field,
              errorType: "dateFormat",
              message: rule.message,
              value: originalValue,
            };
          }
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
                  sheet: sheetName,
                  row: rowNumber,
                  column: columnName,
                  field: rule.field,
                  errorType: "prohibitedContent",
                  message: `${rule.message}：发现禁用词汇"${term}"`,
                  value,
                };
              }
            }
          }
        }
        break;
    }

    return null;
  }

  private validateCrossRows(
    dataRows: any[][],
    headerMap: Map<string, number>,
    sheetName: string,
    headerRowIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const processedRows = dataRows
      .map((row, index) => ({
        data: this.parseRowData(row, headerMap),
        rowNumber: headerRowIndex + index + 2,
      }))
      .filter((item) => !Object.values(item.data).every((v) => !v));

    for (const rule of this.template.validationRules) {
      if (rule.type === "dateInterval") {
        errors.push(
          ...this.validateDateInterval(
            rule,
            processedRows,
            sheetName,
            headerMap
          )
        );
      } else if (rule.type === "frequency") {
        const frequencyErrors = this.validateFrequency(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...frequencyErrors);
      } else if (rule.type === "medicalLevel") {
        const medicalLevelErrors = this.validateMedicalLevel(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...medicalLevelErrors);
      } else if (rule.type === "unique") {
        const uniqueErrors = this.validateUnique(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...uniqueErrors);
      } else if (rule.type === "minValue") {
        const minValueErrors = this.validateMinValue(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...minValueErrors);
      } else if (rule.type === "duration") {
        const durationErrors = this.validateDuration(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...durationErrors);
      } else if (rule.type === "timeRange") {
        const timeRangeErrors = this.validateTimeRange(
          rule,
          processedRows,
          sheetName,
          headerMap
        );

        errors.push(...timeRangeErrors);
      }
    }

    return errors;
  }

  private getColumnLetter(columnIndex: number): string {
    let result = "";
    let index = columnIndex;

    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }

    return result;
  }

  private validateUnique(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const columnIndex = headerMap.get(rule.field);

    if (columnIndex === undefined) {
      return errors;
    }

    const columnLetter = this.getColumnLetter(columnIndex);
    const seenValues = new Set<string>();
    const duplicateValues = new Set<string>();

    for (const row of rows) {
      const value = row.data[rule.field];
      if (value && typeof value === "string" && value.trim()) {
        const normalizedValue = value.trim().toLowerCase();

        if (seenValues.has(normalizedValue)) {
          duplicateValues.add(normalizedValue);
        } else {
          seenValues.add(normalizedValue);
        }
      }
    }

    // Report errors for all duplicate values
    for (const row of rows) {
      const value = row.data[rule.field];
      if (value && typeof value === "string" && value.trim()) {
        const normalizedValue = value.trim().toLowerCase();

        if (duplicateValues.has(normalizedValue)) {
          errors.push({
            sheet: sheetName,
            row: row.rowNumber,
            column: columnLetter,
            field: rule.field,
            errorType: "unique",
            message: rule.message,
            value: value,
          });
        }
      }
    }

    return errors;
  }

  private validateMinValue(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const columnIndex = headerMap.get(rule.field);

    if (columnIndex === undefined) {
      return errors;
    }

    const columnLetter = this.getColumnLetter(columnIndex);
    const minValue = rule.params?.minValue || 0;

    for (const row of rows) {
      const value = row.data[rule.field];

      if (value !== undefined && value !== null && value !== "") {
        const numericValue =
          typeof value === "number" ? value : parseFloat(String(value));

        if (!isNaN(numericValue) && numericValue < minValue) {
          errors.push({
            sheet: sheetName,
            row: row.rowNumber,
            column: columnLetter,
            field: rule.field,
            errorType: "minValue",
            message: rule.message,
            value: value,
          });
        }
      }
    }

    return errors;
  }

  private validateDuration(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const columnIndex = headerMap.get(rule.field);

    if (columnIndex === undefined) {
      return errors;
    }

    const columnLetter = this.getColumnLetter(columnIndex);
    const minMinutes = rule.params?.minMinutes || 0;

    for (const row of rows) {
      const value = row.data[rule.field];

      if (value !== undefined && value !== null && value !== "") {
        const durationValue =
          typeof value === "number" ? value : parseFloat(String(value));

        if (!isNaN(durationValue) && durationValue < minMinutes) {
          errors.push({
            sheet: sheetName,
            row: row.rowNumber,
            column: columnLetter,
            field: rule.field,
            errorType: "duration",
            message: rule.message,
            value: value,
          });
        }
      }
    }

    return errors;
  }

  private validateTimeRange(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const columnIndex = headerMap.get(rule.field);

    if (columnIndex === undefined) {
      return errors;
    }

    const columnLetter = this.getColumnLetter(columnIndex);
    const startTime = rule.params?.startTime;
    const endTime = rule.params?.endTime;

    if (!startTime || !endTime) {
      return errors;
    }

    for (const row of rows) {
      const value = row.data[rule.field];

      if (value && typeof value === "string") {
        // Extract time from datetime or time string
        const timeMatch = value.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const timeStr = `${timeMatch[1]}:${timeMatch[2]}`;

          if (timeStr < startTime || timeStr > endTime) {
            errors.push({
              sheet: sheetName,
              row: row.rowNumber,
              column: columnLetter,
              field: rule.field,
              errorType: "timeRange",
              message: rule.message,
              value: value,
            });
          }
        }
      }
    }

    return errors;
  }

  private validateDateInterval(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { days, groupBy } = rule.params;
    const columnIndex = headerMap.get(rule.field);
    const columnName = this.getColumnName(columnIndex);

    // Group by the specified field and pharmacy address to identify unique stores
    const groups = new Map<
      string,
      Array<{ date: Date; rowNumber: number; address: string }>
    >();

    rows.forEach(({ data, rowNumber }) => {
      const groupValue = data[groupBy];
      const address = data["pharmacy_address"] || data["渠道地址"] || "";

      // Try multiple possible date/time fields
      const dateValue =
        data["visit_date"] ||
        data["拜访日期"] ||
        data["visit_time"] ||
        data["拜访时间"] ||
        data["拜访开始时间"] || // Template format
        data["拜访开始\n时间"]; // Template format with newline

      if (groupValue && dateValue) {
        const date = this.parseDate(dateValue);
        if (date) {
          // Create a unique key combining pharmacy name and address
          const uniqueKey = `${groupValue}|${address}`;
          if (!groups.has(uniqueKey)) {
            groups.set(uniqueKey, []);
          }
          groups.get(uniqueKey)!.push({ date, rowNumber, address });
        }
      }
    });

    // Check for violations within each group
    groups.forEach((visits, uniqueKey) => {
      visits.sort((a, b) => a.date.getTime() - b.date.getTime());

      for (let i = 1; i < visits.length; i++) {
        const current = visits[i];
        const previous = visits[i - 1];
        const daysDiff = Math.floor(
          (current.date.getTime() - previous.date.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysDiff < days) {
          // Extract pharmacy name from uniqueKey (format: "pharmacyName|address")
          const pharmacyName = uniqueKey.split("|")[0];
          const address = current.address;

          errors.push({
            sheet: sheetName,
            row: current.rowNumber,
            column: columnName,
            field: rule.field,
            errorType: "dateInterval",
            message: `${rule.message}（与第${
              previous.rowNumber
            }行冲突，同一店铺：${pharmacyName}${
              address ? ` - ${address}` : ""
            }）`,
            value: pharmacyName,
          });
        }
      }
    });

    return errors;
  }

  private validateFrequency(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { maxPerDay, groupBy } = rule.params;
    const columnIndex = headerMap.get(rule.field);
    const columnName = this.getColumnName(columnIndex);

    // Group by implementer and date
    const dailyCounts = new Map<string, Map<string, number>>();
    const rowTracker = new Map<
      string,
      Array<{ date: string; rowNumber: number }>
    >();

    rows.forEach(({ data, rowNumber }) => {
      const implementer = data[groupBy];
      // Try multiple possible date/time fields
      const dateValue =
        data["visit_date"] ||
        data["拜访日期"] ||
        data["visit_time"] ||
        data["拜访时间"] ||
        data["拜访开始时间"] || // Template format
        data["拜访开始\n时间"] || // Template format with newline
        data["survey_time"] ||
        data["调研时间"] ||
        data["调研日期"] ||
        data["调查时间"] ||
        data["调查日期"]; // Market research fields

      if (implementer && dateValue) {
        const date = this.parseDate(dateValue);
        if (date) {
          // Use local date string to avoid timezone issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;

          if (!dailyCounts.has(implementer)) {
            dailyCounts.set(implementer, new Map());
            rowTracker.set(implementer, []);
          }

          const implementerCounts = dailyCounts.get(implementer)!;
          const currentCount = implementerCounts.get(dateStr) || 0;
          implementerCounts.set(dateStr, currentCount + 1);

          rowTracker.get(implementer)!.push({ date: dateStr, rowNumber });

          if (currentCount + 1 > maxPerDay) {
            errors.push({
              sheet: sheetName,
              row: rowNumber,
              column: columnName,
              field: rule.field,
              errorType: "frequency",
              message: `${rule.message}（${dateStr}当日第${
                currentCount + 1
              }家，超过${maxPerDay}家限制）`,
              value: implementer,
            });
          }
        }
      }
    });

    return errors;
  }

  private extractTimeFromValue(value: any): string | null {
    if (!value) return null;

    const str = value.toString();
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    return timeMatch ? timeMatch[0] : null;
  }

  private isTimeInRange(
    timeStr: string,
    startTime: string,
    endTime: string
  ): boolean {
    const time = this.timeToMinutes(timeStr);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    return time >= start && time <= end;
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private parseDuration(value: any): number | null {
    if (!value) return null;

    const str = value.toString();
    const numberMatch = str.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : null;
  }

  private parseDate(value: any): Date | null {
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

  private hasTimeComponent(value: any): boolean {
    if (!value) return false;

    const str = value.toString().trim();

    // Check for time patterns
    const timePatterns = [
      /\d{1,2}[:：]\d{2}/, // HH:MM or HH：MM (Chinese colon)
      /\d{1,2}[:：]\d{2}[:：]\d{2}/, // HH:MM:SS or HH：MM：SS
      /\s+\d{1,2}[:：]\d{2}/, // Space followed by time
      /\n\d{1,2}[:：]\d{2}/, // Newline followed by time
    ];

    return timePatterns.some((pattern) => pattern.test(str));
  }

  private validateMedicalLevel(
    rule: ValidationRule,
    rows: Array<{ data: Record<string, any>; rowNumber: number }>,
    sheetName: string,
    headerMap: Map<string, number>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const columnIndex = headerMap.get(rule.field);
    const columnName = this.getColumnName(columnIndex);

    if (!columnName) {
      return errors;
    }

    const allowedLevels = rule.params?.allowedLevels || [
      "等级医院",
      "基层医疗",
      "民营医院",
    ];
    // const allowedSuffixes = rule.params?.allowedSuffixes || [
    //   "甲等",
    //   "乙等",
    //   "丙等",
    //   "特等",
    // ];

    rows.forEach(({ data, rowNumber }) => {
      const value = data[rule.field];

      if (!value || typeof value !== "string") {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          column: columnName,
          field: rule.field,
          errorType: "medicalLevel",
          message: rule.message,
          value: value || "(空值)",
        });
        return;
      }

      const medicalType = value.trim();

      // 检查是否包含级别信息
      const hasLevel = allowedLevels.some((level: string) =>
        medicalType.includes(level)
      );

      if (!hasLevel) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          column: columnName,
          field: rule.field,
          errorType: "medicalLevel",
          message: rule.message,
          value: medicalType,
        });
        return;
      }

      // 可选：检查是否包含等级后缀（甲等、乙等等）
      // 这里我们不强制要求后缀，因为有些医院可能只填写"一级"、"二级"等
      // 如果需要强制要求后缀，可以取消下面的注释
      /*
      const hasSuffix = allowedSuffixes.some(suffix => medicalType.includes(suffix));

      if (!hasSuffix) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          column: columnName,
          field: rule.field,
          errorType: "medicalLevel",
          message: "医疗类型应包含等级后缀，如：甲等、乙等、丙等、特等",
          value: medicalType,
        });
      }
      */
    });

    return errors;
  }

  private getColumnName(columnIndex?: number): string {
    if (columnIndex === undefined) return "";

    let result = "";
    let index = columnIndex;

    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }

    return result;
  }
}
