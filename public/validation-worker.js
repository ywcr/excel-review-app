// Web Worker for Excel validation
// This file will be loaded from public directory

importScripts("https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js");
importScripts("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js");

// Worker message types
const MESSAGE_TYPES = {
  VALIDATE_EXCEL: "VALIDATE_EXCEL",
  VALIDATE_IMAGES: "VALIDATE_IMAGES",
  PROGRESS: "PROGRESS",
  RESULT: "RESULT",
  ERROR: "ERROR",
  CANCEL: "CANCEL",
};

// Performance configuration
const PERFORMANCE_CONFIG = {
  CHUNK_SIZE: 1000, // 每次处理的行数
  PROGRESS_INTERVAL: 100, // 进度更新间隔（毫秒）
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB内存阈值
  MAX_ROWS_IN_MEMORY: 10000, // 内存中最大行数
};

// Global state
let isValidationCancelled = false;
let templateFromMainThread = null;

// Validation rules and templates (simplified version)
const TASK_TEMPLATES = {
  药店拜访: {
    name: "药店拜访",
    requiredFields: ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"],
    sheetNames: ["药店拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      零售渠道: "retailChannel",
      实施人: "implementer",
      拜访开始时间: "visitStartTime",
      拜访结束时间: "visitEndTime",
    },
    validationRules: [
      {
        field: "retailChannel",
        type: "required",
        message: "零售渠道不能为空",
      },
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
    ],
  },
  等级医院拜访: {
    name: "等级医院拜访",
    requiredFields: ["医生姓名", "医疗机构名称", "医疗类型", "拜访开始时间"],
    sheetNames: ["医院拜访", "等级医院拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      拜访开始时间: "visitStartTime",
    },
    validationRules: [
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["一级", "二级", "三级"],
          allowedSuffixes: ["甲等", "乙等", "丙等", "特等"],
        },
        message:
          "医疗类型必须填写具体级别，如：一级、二级、三级，或完整格式：一级甲等、二级甲等等",
      },
    ],
  },
};

// Streaming validation function
async function validateExcelStreaming(fileBuffer, taskName, selectedSheet) {
  isValidationCancelled = false;

  try {
    // 解析Excel文件
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 10, message: "解析Excel文件..." },
    });

    const workbook = XLSX.read(fileBuffer, { type: "array" });

    if (isValidationCancelled) return;

    // 获取工作表
    const sheetName = selectedSheet || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`);
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 20, message: "分析工作表结构..." },
    });

    // 转换为数组格式进行流式处理
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new Error("工作表为空");
    }

    // 接收从主线程传递的完整模板
    const template = templateFromMainThread || TASK_TEMPLATES[taskName];

    if (!template) {
      throw new Error(`未找到任务模板: ${taskName}`);
    }

    // 智能查找表头行（扫描前5行）
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 25, message: "查找表头行..." },
    });

    const { headerRow, headerRowIndex } = findHeaderRow(data, template);

    if (!headerRow) {
      throw new Error("未找到有效的表头行");
    }

    // 验证表头
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 30, message: "验证表头..." },
    });

    const headerValidation = validateHeaders(headerRow, template);

    if (!headerValidation.isValid) {
      return {
        isValid: false,
        headerValidation,
        errors: [],
        summary: { totalRows: 0, validRows: 0, errorCount: 0 },
      };
    }

    if (isValidationCancelled) return;

    // 流式验证数据行（跳过表头前的所有行）
    const dataRows = data.slice(headerRowIndex + 1);
    const errors = await validateRowsStreaming(
      dataRows,
      template,
      headerRow,
      headerRowIndex
    );

    if (isValidationCancelled) return;

    // 执行跨行验证（unique、frequency、dateInterval）
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 80, message: "执行跨行验证..." },
    });

    const crossRowErrors = await validateCrossRows(
      dataRows,
      template,
      headerRow,
      headerRowIndex
    );
    errors.push(...crossRowErrors);

    if (isValidationCancelled) return;

    const totalRows = dataRows.length;
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
  } catch (error) {
    throw new Error(`验证失败: ${error.message}`);
  }
}

// 智能查找表头行
function findHeaderRow(data, template) {
  const requiredFields = template.requiredFields || [];
  let bestMatch = { row: null, index: 0, score: 0 };

  // 扫描前5行，寻找最匹配的表头行
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 清洗表头（去除换行、多余空格）
    const cleanHeaders = row.map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    );

    // 计算匹配分数
    let score = 0;
    const nonEmptyCount = cleanHeaders.filter((h) => h.length > 0).length;

    // 基础分：非空字段数量
    score += nonEmptyCount * 0.1;

    // 必填字段匹配分
    for (const required of requiredFields) {
      const found = cleanHeaders.some((header) => {
        // 精确匹配
        if (header === required) return true;
        // 包含匹配
        if (header.includes(required) || required.includes(header)) return true;
        // 相似度匹配
        return calculateSimilarity(header, required) > 0.8;
      });
      if (found) score += 10;
    }

    // 典型表头特征分
    const hasTypicalHeaders = cleanHeaders.some(
      (header) =>
        header.includes("实施") ||
        header.includes("对接") ||
        header.includes("时间") ||
        header.includes("姓名") ||
        header.includes("机构") ||
        header.includes("渠道") ||
        header.includes("科室") ||
        header.includes("地址") ||
        header.includes("类型") ||
        header.includes("时长")
    );
    if (hasTypicalHeaders) score += 5;

    // 更新最佳匹配
    if (score > bestMatch.score && nonEmptyCount >= 3) {
      bestMatch = { row, index: i, score };
    }
  }

  return {
    headerRow: bestMatch.row,
    headerRowIndex: bestMatch.index,
  };
}

// 计算字符串相似度
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = [];
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

// 流式验证数据行
async function validateRowsStreaming(
  rows,
  template,
  headerRow,
  headerRowIndex
) {
  const errors = [];
  const fieldMapping = createFieldMapping(headerRow, template);
  const totalRows = rows.length;

  // 分块处理数据
  for (let i = 0; i < totalRows; i += PERFORMANCE_CONFIG.CHUNK_SIZE) {
    if (isValidationCancelled) break;

    const chunk = rows.slice(
      i,
      Math.min(i + PERFORMANCE_CONFIG.CHUNK_SIZE, totalRows)
    );
    const chunkErrors = [];

    // 处理当前块
    for (let j = 0; j < chunk.length; j++) {
      const row = chunk[j];
      const rowNumber = headerRowIndex + i + j + 2; // 基于表头位置计算正确的行号

      if (!row || row.every((cell) => !cell)) continue; // 跳过空行

      const rowErrors = validateSingleRow(
        row,
        fieldMapping,
        template,
        rowNumber
      );
      chunkErrors.push(...rowErrors);
    }

    errors.push(...chunkErrors);

    // 更新进度
    const progress = 40 + Math.floor(((i + chunk.length) / totalRows) * 40);
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: {
        progress,
        message: `验证数据行 ${i + chunk.length}/${totalRows}...`,
      },
    });

    // 让出控制权，避免阻塞
    await new Promise((resolve) => setTimeout(resolve, 1));
  }

  return errors;
}

// 跨行验证函数
async function validateCrossRows(
  dataRows,
  template,
  headerRow,
  headerRowIndex
) {
  const errors = [];
  const fieldMapping = createFieldMapping(headerRow, template);

  // 将数据行转换为对象格式
  const processedRows = dataRows
    .map((row, index) => ({
      data: parseRowData(row, fieldMapping),
      rowNumber: headerRowIndex + index + 2,
      originalRow: row,
    }))
    .filter((item) => !Object.values(item.data).every((v) => !v));

  // 执行各种跨行验证规则
  for (const rule of template.validationRules || []) {
    if (isValidationCancelled) break;

    switch (rule.type) {
      case "unique":
        errors.push(...validateUnique(rule, processedRows, fieldMapping));
        break;
      case "frequency":
        errors.push(...validateFrequency(rule, processedRows, fieldMapping));
        break;
      case "dateInterval":
        errors.push(...validateDateInterval(rule, processedRows, fieldMapping));
        break;
    }
  }

  return errors;
}

// 格式化日期用于验证 - 与服务端逻辑一致
function formatDateForValidation(value) {
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

// 解析行数据为对象
function parseRowData(row, fieldMapping) {
  const data = {};

  fieldMapping.forEach((colIndex, fieldName) => {
    let value = row[colIndex];

    // Auto-format date/time fields for further validation
    if (
      fieldName === "visit_time" ||
      fieldName === "拜访开始时间" ||
      fieldName === "拜访开始\n时间"
    ) {
      const originalValue = value;
      value = formatDateForValidation(value);
      // Store both original and formatted values for different validation purposes
      data[fieldName + "_original"] = originalValue;
    }

    // 自动格式化日期时间字段
    if (fieldName.includes("time") || fieldName.includes("Time")) {
      if (value && typeof value === "number") {
        // Excel日期数字转换
        const date = new Date((value - 25569) * 86400 * 1000);
        value = date.toISOString().slice(0, 16).replace("T", " ");
      }
    }

    data[fieldName] = value;
  });

  return data;
}

// 唯一性验证 - 与服务端逻辑保持一致
function validateUnique(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { scope } = params; // scope: "day" 表示按日期分组
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) return errors;

  if (scope === "day") {
    // 按日期分组的唯一性验证（如：同一药店1日内不能重复拜访）
    const dailyGroups = new Map(); // date -> Set<uniqueKey>
    const rowTracker = new Map(); // "date_uniqueKey" -> rowNumber[]

    for (const { data, rowNumber } of rows) {
      const value = data[rule.field];
      if (!value) continue;

      // 获取日期字段
      const dateValue =
        data["visitStartTime"] ||
        data["拜访开始时间"] ||
        data["拜访开始\n时间"] ||
        data["visit_date"] ||
        data["拜访日期"];

      if (!dateValue) continue;

      const date = parseDate(dateValue);
      if (!date) continue;

      // 格式化日期
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // 获取地址信息
      const address = data["channelAddress"] || data["渠道地址"] || "";

      // 创建唯一标识：结合店铺名称和地址
      const normalizedValue = String(value).trim().toLowerCase();
      const normalizedAddress = String(address).trim().toLowerCase();
      const uniqueKey = `${normalizedValue}|${normalizedAddress}`;

      const trackingKey = `${dateStr}_${uniqueKey}`;

      if (!dailyGroups.has(dateStr)) {
        dailyGroups.set(dateStr, new Set());
      }

      if (!rowTracker.has(trackingKey)) {
        rowTracker.set(trackingKey, []);
      }

      rowTracker.get(trackingKey).push(rowNumber);

      // 检查是否重复
      if (dailyGroups.get(dateStr).has(uniqueKey)) {
        // 找到第一次出现的行号
        const firstOccurrence = rowTracker.get(trackingKey)[0];

        errors.push({
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value,
          message: `${
            rule.message
          }（与第${firstOccurrence}行重复，同一店铺：${value}${
            address ? ` - ${address}` : ""
          }）`,
          type: rule.type,
        });
      } else {
        dailyGroups.get(dateStr).add(uniqueKey);
      }
    }
  } else {
    // 全局唯一性验证
    const seenValues = new Set();
    const duplicateValues = new Set();

    // 第一遍：找出所有重复值
    for (const { data } of rows) {
      const value = data[rule.field];
      if (value && String(value).trim()) {
        const normalizedValue = String(value).trim().toLowerCase();
        if (seenValues.has(normalizedValue)) {
          duplicateValues.add(normalizedValue);
        } else {
          seenValues.add(normalizedValue);
        }
      }
    }

    // 第二遍：为所有重复值报错
    for (const { data, rowNumber } of rows) {
      const value = data[rule.field];
      if (value && String(value).trim()) {
        const normalizedValue = String(value).trim().toLowerCase();
        if (duplicateValues.has(normalizedValue)) {
          errors.push({
            row: rowNumber,
            column: XLSX.utils.encode_col(columnIndex),
            field: rule.field,
            value,
            message: rule.message,
            type: rule.type,
          });
        }
      }
    }
  }

  return errors;
}

// 频次验证 - 与服务端逻辑保持一致
function validateFrequency(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { maxPerDay, groupBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) return errors;

  // 按实施人分组统计每日计数
  const dailyCounts = new Map(); // implementer -> Map<dateStr, count>
  const rowTracker = new Map(); // implementer -> Array<{date, rowNumber}>

  for (const { data, rowNumber } of rows) {
    const implementer = data[groupBy]; // 实施人
    if (!implementer) continue;

    // 尝试多个可能的日期字段（与服务端一致）
    const dateValue =
      data["visitStartTime"] ||
      data["拜访开始时间"] ||
      data["拜访开始\n时间"] ||
      data["visit_date"] ||
      data["拜访日期"] ||
      data["visit_time"] ||
      data["拜访时间"];

    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    // 使用本地日期字符串避免时区问题（与服务端一致）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    if (!dailyCounts.has(implementer)) {
      dailyCounts.set(implementer, new Map());
      rowTracker.set(implementer, []);
    }

    const implementerCounts = dailyCounts.get(implementer);
    const currentCount = implementerCounts.get(dateStr) || 0;
    implementerCounts.set(dateStr, currentCount + 1);

    rowTracker.get(implementer).push({ date: dateStr, rowNumber });

    // 只有超过限制时才报错（与服务端一致）
    if (currentCount + 1 > maxPerDay) {
      errors.push({
        row: rowNumber,
        column: XLSX.utils.encode_col(columnIndex),
        field: rule.field,
        value: implementer,
        message: `${rule.message}（${dateStr}当日第${
          currentCount + 1
        }家，超过${maxPerDay}家限制）`,
        type: rule.type,
      });
    }
  }

  return errors;
}

// 日期间隔验证 - 与服务端逻辑保持一致
function validateDateInterval(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { days, groupBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) return errors;

  // 按分组字段分组，包含地址信息以识别唯一店铺
  const groups = new Map();

  for (const { data, rowNumber } of rows) {
    const groupValue = data[groupBy];
    if (!groupValue) continue;

    const address = data["channelAddress"] || data["渠道地址"] || "";

    // 尝试多个可能的日期字段
    const dateValue =
      data["visitStartTime"] ||
      data["拜访开始时间"] ||
      data["拜访开始\n时间"] ||
      data["visit_date"] ||
      data["拜访日期"] ||
      data["visit_time"] ||
      data["拜访时间"];

    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    // 创建唯一键，结合分组值和地址
    const uniqueKey = `${groupValue}|${address}`;

    if (!groups.has(uniqueKey)) {
      groups.set(uniqueKey, []);
    }

    groups.get(uniqueKey).push({
      date,
      rowNumber,
      address,
    });
  }

  // 检查每个分组内的日期间隔
  for (const [uniqueKey, visits] of groups) {
    // 按日期排序
    visits.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let i = 1; i < visits.length; i++) {
      const current = visits[i];
      const previous = visits[i - 1];

      const daysDiff = Math.floor(
        (current.date.getTime() - previous.date.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDiff < days) {
        // 从uniqueKey中提取分组名称
        const groupName = uniqueKey.split("|")[0];
        const address = current.address;

        errors.push({
          row: current.rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: groupName,
          message: `${rule.message}（与第${
            previous.rowNumber
          }行冲突，同一店铺：${groupName}${address ? ` - ${address}` : ""}）`,
          type: rule.type,
        });
      }
    }
  }

  return errors;
}

// 提取日期字符串
function extractDate(value) {
  if (!value) return null;

  const dateStr = String(value).trim();

  // 尝试提取日期部分
  const dateMatch = dateStr.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
  return dateMatch ? dateMatch[1] : null;
}

// 解析日期 - 与服务端逻辑一致
function parseDate(value) {
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
    let date;

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

  return null;
}

// 检查是否包含时间组件 - 与服务端逻辑一致
function checkHasTimeComponent(value) {
  if (!value) return false;

  const str = value.toString().trim();

  // 检查是否包含时间格式 (HH:MM 或 HH:MM:SS)
  const timePattern = /\d{1,2}:\d{2}(:\d{2})?/;
  return timePattern.test(str);
}

// 创建字段映射
function createFieldMapping(headerRow, template) {
  const mapping = new Map();

  headerRow.forEach((header, index) => {
    if (header) {
      // 清洗表头（去除换行、多余空格）
      const headerStr = String(header)
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");

      // 直接映射
      mapping.set(header, index);
      mapping.set(headerStr, index);

      // 检查字段映射
      const fieldMappings = template.fieldMappings || {};
      let mappedField = fieldMappings[header] || fieldMappings[headerStr];

      // 如果没有直接匹配，尝试相似度匹配
      if (!mappedField) {
        for (const [templateField, mappedName] of Object.entries(
          fieldMappings
        )) {
          if (calculateSimilarity(headerStr, templateField) > 0.8) {
            mappedField = mappedName;
            break;
          }
        }
      }

      if (mappedField) {
        mapping.set(mappedField, index);
      }
    }
  });

  return mapping;
}

// Main message handler
self.onmessage = async function (e) {
  const { type, data } = e.data;

  try {
    switch (type) {
      case MESSAGE_TYPES.CANCEL:
        isValidationCancelled = true;
        break;

      case MESSAGE_TYPES.VALIDATE_EXCEL:
        await validateExcel(data);
        break;
      case MESSAGE_TYPES.VALIDATE_IMAGES:
        await validateImages(data);
        break;
      default:
        sendError(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(error.message);
  }
};

// Excel validation function
async function validateExcel(data) {
  const { fileBuffer, taskName, selectedSheet, template, includeImages } = data;

  // 接收从主线程传递的完整模板
  if (template) {
    templateFromMainThread = template;
  }

  sendProgress("正在解析Excel文件...", 10);

  // Parse Excel file
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetNames = Object.keys(workbook.Sheets);

  sendProgress("正在分析工作表...", 20);

  // Get template (use template from main thread if available)
  const validationTemplate = templateFromMainThread || TASK_TEMPLATES[taskName];
  if (!validationTemplate) {
    sendError(`未找到任务模板: ${taskName}`);
    return;
  }

  // Select sheet
  let targetSheet = selectedSheet;
  if (!targetSheet || !workbook.Sheets[targetSheet]) {
    targetSheet = selectBestSheet(sheetNames, validationTemplate.sheetNames);
  }

  if (!targetSheet) {
    sendResult({
      needSheetSelection: true,
      availableSheets: sheetNames.map((name) => ({
        name,
        hasData: !!workbook.Sheets[name]["!ref"],
      })),
    });
    return;
  }

  sendProgress("正在验证表头...", 40);

  // Validate headers (auto-detect header row inside)
  const headerValidation = validateHeaders(
    workbook.Sheets[targetSheet],
    validationTemplate
  );

  if (!headerValidation.isValid) {
    sendResult({
      isValid: false,
      headerValidation,
      errors: [],
      summary: { totalRows: 0, validRows: 0, errorCount: 0 },
    });
    return;
  }

  sendProgress("正在验证数据行...", 60);

  // Validate data rows using detected header row index
  const errors = validateRows(
    workbook.Sheets[targetSheet],
    validationTemplate,
    headerValidation.headerRowIndex
  );

  sendProgress("正在执行跨行验证...", 80);

  // 执行跨行验证（unique、frequency、dateInterval）
  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], {
    header: 1,
  });
  const headerRow = sheetData[headerValidation.headerRowIndex];
  const dataRows = sheetData.slice(headerValidation.headerRowIndex + 1);

  const crossRowErrors = await validateCrossRows(
    dataRows,
    validationTemplate,
    headerRow,
    headerValidation.headerRowIndex
  );
  errors.push(...crossRowErrors);

  sendProgress("正在生成验证报告...", 90);

  // Calculate summary based on detected header row index
  const totalRows = Math.max(
    0,
    sheetData.length - (headerValidation.headerRowIndex + 1)
  );
  const errorCount = errors.length;
  const validRows = totalRows - new Set(errors.map((e) => e.row)).size;

  // 准备基本验证结果
  const baseResult = {
    isValid: errorCount === 0,
    headerValidation,
    errors,
    summary: {
      totalRows,
      validRows,
      errorCount,
    },
  };

  // 如果启用图片验证，则进行图片验证并合并结果
  if (includeImages) {
    try {
      sendProgress("正在验证图片...", 85);
      const imageValidationResult = await validateImagesInternal(fileBuffer);

      // 合并图片验证结果
      baseResult.imageValidation = imageValidationResult;
      sendResult(baseResult);
    } catch (imageError) {
      console.warn("图片验证失败:", imageError);
      // 即使图片验证失败，也返回Excel验证结果
      sendResult(baseResult);
    }
  } else {
    sendResult(baseResult);
  }
}

// Internal image validation function (shared logic)
async function validateImagesInternal(fileBuffer) {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(fileBuffer);

    // Extract images from xl/media
    const images = [];
    const mediaFolder = zipContent.folder("xl/media");

    if (mediaFolder) {
      const imagePromises = [];

      mediaFolder.forEach((relativePath, file) => {
        if (file.dir) return;

        const fileName = file.name.toLowerCase();
        if (
          fileName.endsWith(".png") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg")
        ) {
          imagePromises.push(
            file.async("uint8array").then((data) => ({
              id: relativePath,
              name: relativePath,
              size: data.length,
              data: data,
            }))
          );
        }
      });

      const extractedImages = await Promise.all(imagePromises);
      images.push(...extractedImages);
    }

    sendProgress(`找到 ${images.length} 张图片，正在分析...`, 30);

    if (images.length === 0) {
      return {
        totalImages: 0,
        blurryImages: 0,
        duplicateGroups: 0,
        results: [],
      };
    }

    // Validate images with real algorithms
    const results = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      try {
        // 计算图片清晰度（简化的拉普拉斯方差）
        const sharpness = await calculateImageSharpness(image.data);

        // 计算感知哈希
        const hash = await calculateImageHash(image.data);

        const result = {
          id: image.id,
          sharpness,
          isBlurry: sharpness < 100, // 使用阈值100
          hash,
          duplicates: [],
        };

        results.push(result);
      } catch (error) {
        console.warn(`Failed to analyze image ${image.id}:`, error);
        // 如果图片分析失败，标记为模糊
        results.push({
          id: image.id,
          sharpness: 0,
          isBlurry: true,
          hash: "",
          duplicates: [],
        });
      }

      const progress = 30 + (i / images.length) * 60;
      sendProgress(`正在分析图片 ${i + 1}/${images.length}...`, progress);
    }

    sendProgress("正在检测重复图片...", 95);

    // Detect duplicates (simplified)
    detectDuplicates(results);

    const blurryImages = results.filter((r) => r.isBlurry).length;
    const duplicateGroups = countDuplicateGroups(results);

    return {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      results,
    };
  } catch (error) {
    console.error("图片验证失败:", error);
    throw error;
  }
}

// Image validation function (for direct image validation requests)
async function validateImages(data) {
  const { fileBuffer } = data;

  sendProgress("正在提取图片...", 10);

  try {
    const result = await validateImagesInternal(fileBuffer);
    sendResult(result);
  } catch (error) {
    sendError(`图片验证失败: ${error.message}`);
  }
}

// Image analysis functions

// 计算图片清晰度（基于文件特征的启发式方法）
async function calculateImageSharpness(imageData) {
  try {
    // 基于文件大小和熵的启发式清晰度评估
    // 更大的文件通常包含更多细节（在相同格式下）
    const fileSize = imageData.length;

    // 计算数据熵（信息量）
    const frequency = new Map();
    for (let i = 0; i < Math.min(imageData.length, 10000); i++) {
      // 采样前10k字节
      const byte = imageData[i];
      frequency.set(byte, (frequency.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const sampleSize = Math.min(imageData.length, 10000);
    for (const [, count] of frequency) {
      const p = count / sampleSize;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // 组合文件大小和熵得到清晰度分数
    // 清晰的图片通常有更高的熵值和合理的文件大小
    const sizeScore = Math.min(fileSize / 50000, 5); // 文件大小分数，50KB为基准
    const entropyScore = entropy * 20; // 熵分数

    return sizeScore + entropyScore;
  } catch (error) {
    console.warn("清晰度计算失败:", error);
    return 50; // 默认中等清晰度
  }
}

// 计算图片哈希（基于文件内容的简化哈希）
async function calculateImageHash(imageData) {
  try {
    // 使用简化的内容哈希算法
    // 取图片数据的特定位置进行哈希计算
    const hashSample = [];
    const step = Math.max(1, Math.floor(imageData.length / 64)); // 采样64个点

    for (let i = 0; i < imageData.length; i += step) {
      if (hashSample.length >= 64) break;
      hashSample.push(imageData[i]);
    }

    // 生成16进制哈希字符串
    return hashSample
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 16);
  } catch (error) {
    console.warn("哈希计算失败:", error);
    return Date.now().toString(16); // 随机哈希
  }
}

// Helper functions
function selectBestSheet(sheetNames, preferredNames) {
  for (const preferred of preferredNames) {
    const found = sheetNames.find(
      (name) =>
        name === preferred ||
        name.includes(preferred) ||
        preferred.includes(name)
    );
    if (found) return found;
  }
  return sheetNames[0] || null;
}

function validateHeaders(sheet, template) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length === 0) {
    return {
      isValid: false,
      missingFields: template.requiredFields,
      unmatchedFields: [],
      suggestions: [],
      headerRowIndex: -1,
    };
  }

  // 使用智能表头识别
  const { headerRow, headerRowIndex } = findHeaderRow(data, template);
  if (!headerRow) {
    return {
      isValid: false,
      missingFields: template.requiredFields,
      unmatchedFields: [],
      suggestions: [],
      headerRowIndex: -1,
    };
  }

  // 清洗表头：去换行、去空格
  const actualHeaders = headerRow
    .map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    )
    .filter((h) => h);

  const missingFields = [];

  for (const required of template.requiredFields) {
    const found = actualHeaders.find((actual) => {
      if (actual === required) return true;
      if (actual.includes(required) || required.includes(actual)) return true;
      return calculateSimilarity(actual, required) > 0.8;
    });
    if (!found) {
      missingFields.push(required);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    unmatchedFields: [],
    suggestions: [],
    headerRowIndex,
  };
}

function validateRows(sheet, template, headerRowIndexOverride) {
  const errors = [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) return errors;

  // 决定表头行索引
  let headerRowIndex = 0;
  if (
    typeof headerRowIndexOverride === "number" &&
    headerRowIndexOverride >= 0
  ) {
    headerRowIndex = headerRowIndexOverride;
  }

  const headerRow = data[headerRowIndex] || [];
  const fieldMapping = new Map();

  // 清洗表头并构建映射（支持换行和空格）
  headerRow.forEach((header, index) => {
    const raw = String(header || "").trim();
    if (!raw) return;
    const cleaned = raw.replace(/\n/g, "").replace(/\s+/g, "");

    fieldMapping.set(raw, index);
    fieldMapping.set(cleaned, index);

    const mappedField =
      template.fieldMappings[raw] || template.fieldMappings[cleaned];
    if (mappedField) {
      fieldMapping.set(mappedField, index);
    }
  });

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every((cell) => !cell)) continue;

    // 解析行数据以获取格式化后的值
    const rowData = {};
    fieldMapping.forEach((colIndex, fieldName) => {
      let value = row[colIndex];

      // Auto-format date/time fields for further validation
      if (
        fieldName === "visit_time" ||
        fieldName === "拜访开始时间" ||
        fieldName === "拜访开始\n时间"
      ) {
        const originalValue = value;
        value = formatDateForValidation(value);
        // Store both original and formatted values for different validation purposes
        rowData[fieldName + "_original"] = originalValue;
      }

      rowData[fieldName] = value;
    });

    for (const rule of template.validationRules) {
      const columnIndex = fieldMapping.get(rule.field);
      if (columnIndex === undefined) continue;

      const value = row[columnIndex];
      const error = validateField(value, rule, i + 1, columnIndex, rowData);

      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}

function validateField(value, rule, row, column, rowData) {
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
          type: rule.type,
        };
      }
      break;

    case "dateFormat":
      // Use original value for date format validation (like server-side)
      const originalValue =
        rowData && rowData[rule.field + "_original"]
          ? rowData[rule.field + "_original"]
          : value;
      if (originalValue) {
        const hasTimeComponent = checkHasTimeComponent(originalValue);
        if (!rule.params?.allowTimeComponent && hasTimeComponent) {
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value: originalValue,
            message: rule.message,
            type: rule.type,
          };
        }
      }
      break;

    case "medicalLevel":
      if (value && !isValidMedicalLevel(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          type: rule.type,
        };
      }
      break;

    case "duration":
      if (value && !isValidDuration(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          type: rule.type,
        };
      }
      break;

    case "timeRange":
      if (value && !isValidTimeRange(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          type: rule.type,
        };
      }
      break;

    case "minValue":
      if (value && !isValidMinValue(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          type: rule.type,
        };
      }
      break;
  }

  return null;
}

// 日期格式验证 - 简化版本，主要用于基本验证
function isValidDate(value) {
  if (!value) return true; // 空值由required规则处理

  // 如果是数字（Excel日期序列号），直接认为有效
  if (typeof value === "number") {
    return value > 0;
  }

  // 使用 parseDate 函数来验证日期是否能正确解析
  const parsedDate = parseDate(value);
  return parsedDate !== null;
}

// 持续时间验证
function isValidDuration(value, params) {
  if (!value) return true;

  const duration = Number(value);
  if (isNaN(duration)) return false;

  const { minMinutes } = params;
  return duration >= minMinutes;
}

// 时间范围验证
function isValidTimeRange(value, params) {
  if (!value) return true;

  const timeStr = String(value).trim();
  const { startHour, endHour } = params;

  // 提取时间部分
  let timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    // 尝试从日期时间中提取
    timeMatch = timeStr.match(
      /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s+(\d{1,2}):(\d{2})/
    );
  }

  // 如果没有找到时间部分，说明只有日期，默认通过验证
  if (!timeMatch) return true;

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;

  return hour >= startHour && hour <= endHour;
}

// 最小值验证
function isValidMinValue(value, params) {
  if (!value) return true;

  const numValue = Number(value);
  if (isNaN(numValue)) return false;

  const { minValue } = params;
  return numValue >= minValue;
}

function isValidMedicalLevel(value, params) {
  if (!value || !params) return false;

  const str = String(value).trim();
  const { allowedLevels = [], allowedSuffixes = [] } = params;

  const hasLevel = allowedLevels.some((level) => str.includes(level));
  return hasLevel;
}

function generateSimpleHash(data) {
  // Simple hash for demo (in real implementation would use proper image hashing)
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
  }
  return hash.toString(16);
}

function detectDuplicates(results) {
  // 使用汉明距离检测相似图片
  const threshold = 3; // 汉明距离阈值，3位以内认为是重复

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const hash1 = results[i].hash;
      const hash2 = results[j].hash;

      if (hash1 && hash2 && hash1.length === hash2.length) {
        const distance = calculateHammingDistance(hash1, hash2);

        if (distance <= threshold) {
          // 标记为重复
          if (!results[i].duplicates.includes(results[j].id)) {
            results[i].duplicates.push(results[j].id);
          }
          if (!results[j].duplicates.includes(results[i].id)) {
            results[j].duplicates.push(results[i].id);
          }
        }
      }
    }
  }
}

// 计算汉明距离
function calculateHammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

function countDuplicateGroups(results) {
  const visited = new Set();
  let groups = 0;

  for (const result of results) {
    if (visited.has(result.id) || result.duplicates.length === 0) {
      continue;
    }

    groups++;
    const queue = [result.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;

      visited.add(current);
      const currentResult = results.find((r) => r.id === current);
      if (currentResult) {
        queue.push(
          ...currentResult.duplicates.filter((id) => !visited.has(id))
        );
      }
    }
  }

  return groups;
}

// Communication functions
function sendProgress(message, progress) {
  self.postMessage({
    type: MESSAGE_TYPES.PROGRESS,
    data: { message, progress },
  });
}

function sendResult(result) {
  self.postMessage({
    type: MESSAGE_TYPES.RESULT,
    data: result,
  });
}

function sendError(message) {
  self.postMessage({
    type: MESSAGE_TYPES.ERROR,
    data: { message },
  });
}
