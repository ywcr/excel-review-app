// Web Worker for Excel validation
// This file will be loaded from public directory

importScripts("https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js");
importScripts("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js");

// 尝试加载 blockhash-core.js，如果失败则跳过图片验证
let blockHashAvailable = false;
try {
  // 尝试多种路径方式，兼容不同浏览器
  try {
    importScripts("./blockhash-core.js");
  } catch (e1) {
    try {
      importScripts("/blockhash-core.js");
    } catch (e2) {
      importScripts(self.location.origin + "/blockhash-core.js");
    }
  }
  blockHashAvailable = true;
  console.log("blockhash-core.js 加载成功");
} catch (error) {
  console.warn("blockhash-core.js 加载失败，图片验证功能将被禁用:", error);
  // 提供一个空的 blockhash 函数作为后备
  self.blockhash = function () {
    return null;
  };
  blockHashAvailable = false;
}

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

// Image duplicate detection configuration
const IMAGE_DUP_CONFIG = {
  BLOCKHASH_BITS: 12, // 提升 blockhash 精度（原为8）
  HAMMING_THRESHOLD: 12, // 放宽相似阈值，捕获更多相似图片
  NEAR_THRESHOLD_MARGIN: 4, // 扩大近阈值范围
  MAD_SIZE: 64, // MAD 对比尺寸从32提升到64
  USE_SSIM: true, // 启用SSIM作为补充
  SSIM_GOOD: 0.7, // 放宽SSIM通过阈值
  SSIM_STRICT: 0.85, // 放宽SSIM严格阈值
};

// Global state
let isValidationCancelled = false;
let templateFromMainThread = null;

// Worker现在完全依赖从主线程传入的模板，不再维护内置模板
// 这确保了UI和Worker使用完全相同的模板定义

// Streaming validation function
async function validateExcelStreaming(fileBuffer, taskName, selectedSheet) {
  isValidationCancelled = false;

  try {
    // 解析Excel文件
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 10, message: "解析Excel文件..." },
    });

    let workbook;
    try {
      // 首先只解析工作表名称，不加载具体内容
      workbook = XLSX.read(fileBuffer, {
        type: "array",
        bookSheets: true, // 只解析工作表信息
        bookVBA: false,
        bookProps: false,
        bookFiles: false,
        bookDeps: false,
      });
    } catch (error) {
      if (error.message && error.message.includes("Invalid array length")) {
        throw new Error(
          "Excel 文件格式复杂，请尝试减少数据行数或简化工作表内容"
        );
      }
      throw new Error(`解析 Excel 文件失败: ${error.message}`);
    }

    if (isValidationCancelled) return;

    // 获取工作表名称
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel 文件中没有找到任何工作表");
    }

    const sheetName = selectedSheet || workbook.SheetNames[0];

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`工作表 "${sheetName}" 不存在`);
    }

    // 按需解析目标工作表，使用优化选项
    let worksheet;
    try {
      // 重新解析文件，但只加载目标工作表
      const targetWorkbook = XLSX.read(fileBuffer, {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
        dense: false, // 使用稀疏数组格式，节省内存
        sheetStubs: false, // 不包含空单元格
        bookVBA: false,
        bookSheets: false,
        bookProps: false,
        bookFiles: false,
        bookDeps: false,
        raw: false,
        sheets: [sheetName], // 只解析目标工作表
      });
      worksheet = targetWorkbook.Sheets[sheetName];
    } catch (error) {
      if (error.message && error.message.includes("Invalid array length")) {
        throw new Error("工作表数据过大，请尝试减少数据行数或简化内容");
      }
      throw new Error(`解析工作表 "${sheetName}" 失败: ${error.message}`);
    }

    if (!worksheet) {
      throw new Error(`无法加载工作表 "${sheetName}"`);
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 20, message: "分析工作表结构..." },
    });

    // 转换为数组格式进行流式处理
    let data;
    try {
      data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "", // 空单元格使用空字符串
        raw: false, // 不保留原始值
        dateNF: "yyyy-mm-dd", // 标准化日期格式
      });
    } catch (error) {
      if (error.message && error.message.includes("Invalid array length")) {
        throw new Error("工作表数据过大，请减少数据行数或简化内容");
      }
      throw new Error(`转换工作表数据失败: ${error.message}`);
    }

    if (data.length === 0) {
      throw new Error("工作表为空");
    }

    // 检查数据行数，防止处理过大的数据集
    if (data.length > 50000) {
      throw new Error(
        `数据行数过多 (${data.length} 行)，请减少到 50,000 行以内`
      );
    }

    // 接收从主线程传递的完整模板
    const template = templateFromMainThread;

    if (!template) {
      throw new Error(
        `未找到任务模板: ${taskName}，请确保从主线程传入了完整的模板`
      );
    }

    // 验证模板的必需字段
    if (!template.requiredFields || !Array.isArray(template.requiredFields)) {
      throw new Error(`任务模板格式错误: ${taskName}，缺少必需字段定义`);
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
  const { scope } = params; // scope: "day", "global", "task"
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
          errorType: rule.type,
        });
      } else {
        dailyGroups.get(dateStr).add(uniqueKey);
      }
    }
  } else if (scope === "global" || scope === "task" || !scope) {
    // 全局唯一性验证（global、task 或默认）
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
            errorType: rule.type,
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
  const { maxPerDay, groupBy, countBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  console.log(
    `🔍 频次验证开始: ${rule.field}, maxPerDay: ${maxPerDay}, groupBy: ${groupBy}`
  );
  console.log(`字段映射:`, Array.from(fieldMapping.keys()).slice(0, 10));

  if (columnIndex === undefined) {
    console.log(`❌ 未找到字段 ${rule.field} 的列索引`);
    return errors;
  }

  // 按实施人分组统计每日计数
  const dailyCounts = new Map(); // implementer -> Map<dateStr, Set<countByValue>>
  const rowTracker = new Map(); // implementer -> Array<{date, rowNumber}>

  let processedRows = 0;
  let validRows = 0;

  for (const { data, rowNumber } of rows) {
    processedRows++;
    const implementer = data[groupBy]; // 实施人

    if (processedRows <= 5) {
      console.log(
        `行${rowNumber}: groupBy="${groupBy}", implementer="${implementer}"`
      );
      console.log(`数据键:`, Object.keys(data).slice(0, 10));
    }

    if (!implementer) continue;

    // 尝试多个可能的日期字段（与服务端一致）
    const dateValue =
      data["visitStartTime"] ||
      data["拜访开始时间"] ||
      data["拜访开始\n时间"] ||
      data["visit_date"] ||
      data["拜访日期"] ||
      data["visit_time"] ||
      data["拜访时间"] ||
      // 问卷类任务的日期字段
      data["surveyTime"] ||
      data["调研时间"] ||
      data["实施时间"] ||
      data["调查时间"] ||
      data["问卷时间"] ||
      data["访问时间"] ||
      data["填写时间"];

    if (processedRows <= 5) {
      console.log(`行${rowNumber}: dateValue="${dateValue}"`);
    }

    if (!dateValue) continue;
    validRows++;

    const date = parseDate(dateValue);
    if (processedRows <= 5) {
      console.log(
        `行${rowNumber}: 解析日期 "${dateValue}" -> ${
          date ? date.toISOString().split("T")[0] : "null"
        }`
      );
    }
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

    if (countBy) {
      // 使用 countBy 字段进行去重计数（如：按药店名称计数）
      const countByValue = data[countBy];
      if (!countByValue) continue;

      if (!implementerCounts.has(dateStr)) {
        implementerCounts.set(dateStr, new Set());
      }

      const dateCountSet = implementerCounts.get(dateStr);
      const normalizedCountByValue = String(countByValue).trim().toLowerCase();
      dateCountSet.add(normalizedCountByValue);

      const currentCount = dateCountSet.size;

      rowTracker.get(implementer).push({ date: dateStr, rowNumber });

      // 只有超过限制时才报错（与服务端一致）
      if (currentCount > maxPerDay) {
        errors.push({
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: implementer,
          message: `${rule.message}（${dateStr}当日第${currentCount}家，超过${maxPerDay}家限制）`,
          errorType: rule.type,
        });
      }
    } else {
      // 传统计数方式（每行计数一次）
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
          errorType: rule.type,
        });
      }
    }
  }

  console.log(
    `📊 频次验证总结: 处理${processedRows}行, 有效${validRows}行, 发现${errors.length}个错误`
  );
  if (errors.length > 0) {
    console.log(`频次验证错误:`, errors.slice(0, 3));
  }

  return errors;
}

// 日期间隔验证（不区分实施人）：同一目标（含地址）在设定天数内不能重复拜访
function validateDateInterval(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { days, groupBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) return errors;

  // 按 目标(groupBy) + 地址 分组（不区分实施人）
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

    // 创建唯一键，使用 目标+地址（不区分实施人）
    const uniqueKey = `${groupValue}|${address}`;

    if (!groups.has(uniqueKey)) {
      groups.set(uniqueKey, []);
    }

    groups.get(uniqueKey).push({
      date,
      rowNumber,
      address,
      target: groupValue,
    });
  }

  // 检查每个分组内的日期间隔（同一目标）
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
        // 从uniqueKey中提取信息 (format: "target|address")
        const parts = uniqueKey.split("|");
        const target = parts[0];
        const address = current.address;

        errors.push({
          row: current.rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: target,
          message: `${rule.message}（与第${
            previous.rowNumber
          }行冲突，目标：${target}${address ? ` - ${address}` : ""}）`,
          errorType: rule.type,
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
    let str = value.trim();
    const originalStr = str;

    // 清理日期字符串：提取日期部分，移除时间和换行符
    if (str.includes("\n")) {
      str = str.split("\n")[0].trim();
    }

    // 替换中文冒号为英文冒号
    str = str.replace(/：/g, ":");

    // 调试信息
    if (originalStr.includes("2025.8.1")) {
      console.log(`🔧 parseDate调试: "${originalStr}" -> "${str}"`);
    }

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
    // Try dot-separated format (YYYY.M.D)
    else if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(str)) {
      const [year, month, day] = str.split(".").map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
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

  // 检查是否包含时间格式 (支持中文和英文冒号)
  const timePatterns = [
    /\d{1,2}[:：]\d{2}/, // HH:MM or HH：MM (Chinese colon)
    /\d{1,2}[:：]\d{2}[:：]\d{2}/, // HH:MM:SS or HH：MM：SS
    /\s+\d{1,2}[:：]\d{2}/, // Space followed by time
    /\n\d{1,2}[:：]\d{2}/, // Newline followed by time
  ];

  return timePatterns.some((pattern) => pattern.test(str));
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

  // 首先只解析工作表名称
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, {
      type: "array",
      bookSheets: true, // 只解析工作表信息
      bookVBA: false,
      bookProps: false,
      bookFiles: false,
      bookDeps: false,
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      sendError("Excel 文件格式复杂，请尝试减少数据行数或简化工作表内容");
    } else {
      sendError(`解析 Excel 文件失败: ${error.message}`);
    }
    return;
  }

  const sheetNames = workbook.SheetNames || [];

  sendProgress("正在分析工作表...", 20);

  // Get template (must be provided from main thread)
  const validationTemplate = templateFromMainThread;
  if (!validationTemplate) {
    sendError(`未找到任务模板: ${taskName}，请确保从主线程传入了完整的模板`);
    return;
  }

  // 验证模板的必需字段
  if (
    !validationTemplate.requiredFields ||
    !Array.isArray(validationTemplate.requiredFields)
  ) {
    sendError(`任务模板格式错误: ${taskName}，缺少必需字段定义`);
    return;
  }

  // Select sheet
  let targetSheet = selectedSheet;
  let isAutoMatched = false;

  if (!targetSheet || !sheetNames.includes(targetSheet)) {
    // Try to find a matching sheet based on template preferences
    const matchedSheet = findMatchingSheet(
      sheetNames,
      validationTemplate.sheetNames
    );
    if (matchedSheet) {
      targetSheet = matchedSheet;
      isAutoMatched = true;
    }
  } else {
    // User explicitly selected a sheet
    isAutoMatched = true;
  }

  // If no sheet was auto-matched, ask user to choose
  if (!isAutoMatched) {
    sendResult({
      needSheetSelection: true,
      availableSheets: sheetNames.map((name) => ({
        name,
        hasData: true, // 假设所有工作表都有数据，避免预加载检查
      })),
    });
    return;
  }

  // Final check: if still no target sheet, return error
  if (!targetSheet) {
    sendError("无法确定目标工作表");
    return;
  }

  // 按需加载目标工作表
  let targetWorksheet;
  try {
    sendProgress("正在加载目标工作表...", 25);
    const targetWorkbook = XLSX.read(fileBuffer, {
      type: "array",
      cellDates: true,
      cellNF: false,
      cellText: false,
      dense: false,
      sheetStubs: false,
      bookVBA: false,
      bookSheets: false,
      bookProps: false,
      bookFiles: false,
      bookDeps: false,
      raw: false,
      sheets: [targetSheet], // 只解析目标工作表
    });
    targetWorksheet = targetWorkbook.Sheets[targetSheet];
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      sendError("工作表数据过大，请尝试减少数据行数或简化内容");
    } else {
      sendError(`加载工作表 "${targetSheet}" 失败: ${error.message}`);
    }
    return;
  }

  if (!targetWorksheet) {
    sendError(`无法加载工作表 "${targetSheet}"`);
    return;
  }

  sendProgress("正在验证表头...", 40);

  // Validate headers (auto-detect header row inside)
  const headerValidation = validateHeaders(targetWorksheet, validationTemplate);

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
    targetWorksheet,
    validationTemplate,
    headerValidation.headerRowIndex
  );

  sendProgress("正在执行跨行验证...", 80);

  // 执行跨行验证（unique、frequency、dateInterval）
  let sheetData;
  try {
    sheetData = XLSX.utils.sheet_to_json(targetWorksheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      sendError("工作表数据过大，请减少数据行数");
      return;
    }
    sendError(`处理工作表数据失败: ${error.message}`);
    return;
  }

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

      // 针对 .xls（非ZIP容器）给出显眼提示，但不阻断整体验证
      try {
        const u8 = new Uint8Array(fileBuffer.slice(0, 4));
        const isZip =
          u8.length === 4 &&
          u8[0] === 0x50 &&
          u8[1] === 0x4b &&
          u8[2] === 0x03 &&
          u8[3] === 0x04;
        const msg =
          !isZip ||
          (imageError &&
            imageError.message &&
            imageError.message.includes("unexpected signature"))
            ? "检测到该文件不是标准的 .xlsx（ZIP）格式，图片无法解析（可能是 .xls）。图片验证仅支持 .xlsx，请将文件另存为 .xlsx 后重试。"
            : `图片验证失败：${
                imageError instanceof Error
                  ? imageError.message
                  : String(imageError)
              }`;

        baseResult.imageValidation = {
          totalImages: 0,
          blurryImages: 0,
          duplicateGroups: 0,
          results: [],
          warning: msg,
        };
      } catch (_) {
        // 兜底：不添加图片结果，仅返回Excel结果
      }

      // 即使图片验证失败，也返回Excel验证结果及警告
      sendResult(baseResult);
    }
  } else {
    sendResult(baseResult);
  }
}

// Internal image validation function (shared logic)
async function validateImagesInternal(fileBuffer) {
  // 如果 blockhash 不可用，返回空结果
  if (
    !blockHashAvailable ||
    !self.blockhash ||
    typeof self.blockhash.bmvbhash !== "function"
  ) {
    console.warn("图片验证跳过：blockhash 不可用");
    return {
      images: [],
      duplicates: [],
      errors: [],
      summary: {
        totalImages: 0,
        duplicateGroups: 0,
        totalDuplicates: 0,
      },
    };
  }

  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(fileBuffer);

    // Extract images from xl/media and get position info from drawing relationships
    const images = [];
    const mediaFolder = zipContent.folder("xl/media");

    // Try to get drawing relationships to map images to positions
    const imagePositions = await extractImagePositions(zipContent);
    console.log("图片位置映射结果:", imagePositions);
    console.log("图片位置映射数量:", imagePositions.size);

    if (mediaFolder) {
      const imagePromises = [];
      let imageCounter = 0;

      // 先收集所有图片文件，确保索引正确
      const imageFiles = [];
      mediaFolder.forEach((relativePath, file) => {
        if (file.dir) return;
        const fileName = file.name.toLowerCase();
        if (
          fileName.endsWith(".png") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".gif") ||
          fileName.endsWith(".bmp") ||
          fileName.endsWith(".tif") ||
          fileName.endsWith(".tiff") ||
          fileName.endsWith(".webp") ||
          fileName.endsWith(".jfif") ||
          fileName.endsWith(".svg") ||
          fileName.endsWith(".emf") ||
          fileName.endsWith(".wmf")
        ) {
          imageFiles.push({ relativePath, file });
        }
      });

      // 按文件路径排序，确保顺序一致
      imageFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

      // 处理每个图片文件（使用精确解析结果；无法解析时保持未知）
      imageFiles.forEach(({ relativePath, file }, index) => {
        imagePromises.push(
          file.async("uint8array").then((data) => {
            // 支持同一媒体文件的多次放置：位置列表
            let posList = imagePositions.get(relativePath);
            if (!posList) {
              posList = imagePositions.get(`xl/media/${relativePath}`);
            }

            if (Array.isArray(posList) && posList.length > 0) {
              posList.forEach((positionInfo, dupIdx) => {
                console.log(
                  `✅ 图片位置信息: ${relativePath} -> 行${positionInfo.row}, 位置${positionInfo.position} (精确解析)`
                );
                images.push({
                  id:
                    positionInfo && positionInfo.position
                      ? positionInfo.position
                      : `${relativePath}#${dupIdx}`,
                  name: relativePath,
                  size: data.length,
                  data: data,
                  position: positionInfo ? positionInfo.position : undefined,
                  row: positionInfo ? positionInfo.row : undefined,
                  column: positionInfo ? positionInfo.column : undefined,
                });
              });
            } else {
              console.warn(
                `⚠️ 未找到位置映射: ${relativePath}, 将使用估算位置`
              );
              const positionInfo = extractPositionFromPath(relativePath, index);
              images.push({
                id: positionInfo.position || relativePath,
                name: relativePath,
                size: data.length,
                data: data,
                position: positionInfo.position,
                row: positionInfo.row,
                column: positionInfo.column,
              });
            }
          })
        );
      });

      // 等待所有图片处理完成（图片已在异步处理内直接推入 images）
      await Promise.all(imagePromises);
    }

    console.log(`图片验证: 找到 ${images.length} 张图片`);
    images.forEach((img, i) => {
      console.log(
        `图片 ${i + 1}: ID=${img.id}, 显示位置=${img.position}, 实际行号=${
          img.row
        }, 列=${img.column}`
      );

      // 仅记录位置不一致，用于排查；不强制修改，避免覆盖真实锚点
      if (img.position && img.row) {
        const expectedPosition = `${img.column || "N"}${img.row}`;
        if (img.position !== expectedPosition) {
          console.warn(
            `⚠️ 位置不一致(仅记录): 显示=${img.position}, 期望=${expectedPosition} (行${img.row})`
          );
        }
      }
    });

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

        // 计算图片感知哈希（基于blockhash算法）
        const hash = await calculateImageHash(image.data);

        const result = {
          id: image.id,
          sharpness,
          isBlurry: sharpness < 60, // Laplacian 方差阈值：< 30 判为模糊（宽松）
          hash,
          duplicates: [],
          position: image.position,
          row: image.row,
          column: image.column,
          // 添加图片数据用于展示（使用普通数组，兼容现有前端判断与类型）
          imageData: Array.from(image.data),
          mimeType: image.name.toLowerCase().endsWith(".png")
            ? "image/png"
            : image.name.toLowerCase().endsWith(".jpg") ||
              image.name.toLowerCase().endsWith(".jpeg")
            ? "image/jpeg"
            : "image/png", // 默认PNG
          size: image.data.length,
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
          position: image.position,
          row: image.row,
          column: image.column,
        });
      }

      const progress = 30 + (i / images.length) * 60;
      sendProgress(`正在分析图片 ${i + 1}/${images.length}...`, progress);
    }

    sendProgress("正在检测重复图片...", 95);

    // Detect duplicates (simplified)
    console.log("开始重复检测，图片数量:", results.length);
    // 构建图片数据映射用于二次确认
    const imageDataMap = new Map();
    for (const img of images) {
      imageDataMap.set(img.id, img.data);
    }
    await detectDuplicates(results, imageDataMap);

    // 调试：输出重复检测结果
    const duplicateResults = results.filter((r) => r.duplicates.length > 0);
    console.log("重复检测完成，发现重复图片:", duplicateResults.length);
    duplicateResults.forEach((r) => {
      console.log(`图片 ${r.id} 的重复项:`, r.duplicates);
    });

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

  // 如果 blockhash 不可用，返回空结果
  if (
    !blockHashAvailable ||
    !self.blockhash ||
    typeof self.blockhash.bmvbhash !== "function"
  ) {
    console.warn("图片验证跳过：blockhash 不可用");
    sendResult({
      images: [],
      duplicates: [],
      errors: [],
      summary: {
        totalImages: 0,
        duplicateGroups: 0,
        totalDuplicates: 0,
      },
    });
    return;
  }

  sendProgress("正在提取图片...", 10);

  try {
    const result = await validateImagesInternal(fileBuffer);
    sendResult(result);
  } catch (error) {
    sendError(`图片验证失败: ${error.message}`);
  }
}

// Image analysis functions

// 计算图片清晰度（基于 Laplacian 方差的模糊检测）
async function calculateImageSharpness(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return 50; // 默认中等清晰度
    }

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    // 缩放到合适尺寸以提高性能（短边不超过256px）
    const scale = Math.min(256 / Math.min(bitmap.width, bitmap.height), 1);
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 50;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // 转换为灰度并计算 Laplacian 方差
    const gray = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const grayValue = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
      gray[i / 4] = grayValue;
    }

    // Laplacian 卷积核 (3x3)
    const laplacian = [
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0],
    ];

    let variance = 0;
    let count = 0;

    // 应用 Laplacian 卷积（跳过边界像素）
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            sum += gray[py * width + px] * laplacian[ky][kx];
          }
        }
        variance += sum * sum;
        count++;
      }
    }

    // 计算方差并映射到 0-100 分数
    const laplacianVariance = count > 0 ? variance / count : 0;

    // 将方差映射到 0-100 的清晰度分数
    // 经验值：方差 > 500 通常是清晰图片，< 100 通常是模糊图片
    const sharpnessScore = Math.min(100, Math.max(0, laplacianVariance / 10));

    return sharpnessScore;
  } catch (error) {
    console.warn("清晰度计算失败:", error);
    return 50; // 默认中等清晰度
  }
}

// 计算图片感知哈希（基于blockhash算法）
async function calculateImageHash(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return "";
    }
    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "";

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 使用更高位数的 blockhash 提升区分度
    const hash = blockhash.bmvbhash(
      imagePixelData,
      IMAGE_DUP_CONFIG.BLOCKHASH_BITS
    );
    return hash;
  } catch (error) {
    console.warn("感知哈希计算失败:", error);
    return ""; // 返回空哈希，避免误判
  }
}

// 二次确认：32x32 灰度平均绝对差（MAD），0-255 越小越相似
async function averageAbsDiffFromImageData(imageDataA, imageDataB) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return Infinity;
    }
    const w = IMAGE_DUP_CONFIG.MAD_SIZE,
      h = IMAGE_DUP_CONFIG.MAD_SIZE;
    const [bmA, bmB] = await Promise.all([
      createImageBitmap(new Blob([imageDataA])),
      createImageBitmap(new Blob([imageDataB])),
    ]);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return Infinity;

    ctx.drawImage(bmA, 0, 0, w, h);
    const a = ctx.getImageData(0, 0, w, h).data;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmB, 0, 0, w, h);
    const b = ctx.getImageData(0, 0, w, h).data;

    bmA.close();
    bmB.close();

    let sum = 0,
      count = 0;
    for (let i = 0; i < a.length; i += 4) {
      const ga = Math.round(0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]);
      const gb = Math.round(0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]);
      sum += Math.abs(ga - gb);
      count++;
    }
    return sum / count;
  } catch {
    return Infinity;
  }
}

// 结构相似度 SSIM（简化实现，窗口均值/方差估计，返回 0-1）
async function computeSSIM(imageDataA, imageDataB, size = 64) {
  if (
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap === "undefined"
  ) {
    return 0;
  }

  const [bmA, bmB] = await Promise.all([
    createImageBitmap(new Blob([imageDataA])),
    createImageBitmap(new Blob([imageDataB])),
  ]);

  const w = size,
    h = size;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  // 渲染并获取灰度
  const getGray = (bm) => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bm, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    for (let i = 0; i < d.length; i += 4) {
      g[i / 4] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return g;
  };

  const A = getGray(bmA);
  const B = getGray(bmB);
  bmA.close();
  bmB.close();

  // 全图 SSIM（简化，无滑动窗口）
  const N = A.length;
  let meanA = 0,
    meanB = 0;
  for (let i = 0; i < N; i++) {
    meanA += A[i];
    meanB += B[i];
  }
  meanA /= N;
  meanB /= N;

  let varA = 0,
    varB = 0,
    cov = 0;
  for (let i = 0; i < N; i++) {
    const da = A[i] - meanA;
    const db = B[i] - meanB;
    varA += da * da;
    varB += db * db;
    cov += da * db;
  }
  varA /= N - 1;
  varB /= N - 1;
  cov /= N - 1;

  // SSIM 公式常数
  const L = 255;
  const k1 = 0.01,
    k2 = 0.03;
  const C1 = k1 * L * (k1 * L);
  const C2 = k2 * L * (k2 * L);

  const numerator = (2 * meanA * meanB + C1) * (2 * cov + C2);
  const denominator = (meanA * meanA + meanB * meanB + C1) * (varA + varB + C2);
  if (denominator === 0) return 0;
  let ssim = numerator / denominator;
  if (!isFinite(ssim)) ssim = 0;
  // Clamp 0..1
  return Math.max(0, Math.min(1, ssim));
}

// 简化哈希生成（仅调试用途；不参与视觉重复判定）
function generateSimpleHashFromImageData(imageData) {
  let hash = 0;
  const step = Math.max(1, Math.floor(imageData.length / 64));
  for (let i = 0; i < imageData.length; i += step) {
    hash = ((hash << 5) - hash + imageData[i]) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").substring(0, 16);
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

// Simple function that only does exact matching
function findMatchingSheet(sheetNames, preferredNames) {
  if (!preferredNames || preferredNames.length === 0) {
    return null;
  }

  // 只进行精确匹配
  for (const preferred of preferredNames) {
    const found = sheetNames.find((name) => name === preferred);
    if (found) return found;
  }

  return null;
}

function validateHeaders(sheet, template) {
  let data;
  try {
    data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      throw new Error("工作表数据过大，请减少数据行数");
    }
    throw error;
  }
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

  // 同步构建一个"清洗后的 fieldMappings"，用于同义列名的匹配
  const cleanedFieldMappings = {};
  if (template.fieldMappings) {
    Object.keys(template.fieldMappings).forEach((key) => {
      const cleanedKey = String(key || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");
      cleanedFieldMappings[cleanedKey] = template.fieldMappings[key];
    });
  }

  const missingFields = [];

  for (const required of template.requiredFields) {
    const cleanedRequired = String(required || "")
      .trim()
      .replace(/\n/g, "")
      .replace(/\s+/g, "");

    // 目标内部字段（英文标准名），用于同义词映射匹配
    const targetInternal = cleanedFieldMappings[cleanedRequired] || null;

    // 1) 直接字符串与相似度匹配
    let found = actualHeaders.some((actual) => {
      if (actual === cleanedRequired) return true;
      if (actual.includes(cleanedRequired) || cleanedRequired.includes(actual))
        return true;
      return calculateSimilarity(actual, cleanedRequired) > 0.8;
    });

    // 2) 同义词映射匹配：如果某个表头经过映射后得到与目标内部字段相同，则视为命中
    if (!found && targetInternal) {
      found = actualHeaders.some((actual) => {
        const mapped = cleanedFieldMappings[actual];
        return mapped && mapped === targetInternal;
      });
    }

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
  let data;
  try {
    data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      throw new Error("工作表数据过大，请减少数据行数");
    }
    throw error;
  }

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
          errorType: rule.type,
        };
      }
      break;

    case "dateFormat":
      // Use original value for date format validation (like server-side)
      const originalValue =
        rowData && rowData[rule.field + "_original"]
          ? rowData[rule.field + "_original"]
          : value;

      if (row <= 8) {
        console.log(
          `🗓️ 日期格式验证 行${row}: 字段="${rule.field}", 值="${originalValue}", allowTimeComponent=${rule.params?.allowTimeComponent}`
        );
      }

      if (originalValue) {
        const hasTimeComponent = checkHasTimeComponent(originalValue);
        if (row <= 8) {
          console.log(`🗓️ 行${row}: hasTimeComponent=${hasTimeComponent}`);
        }

        if (!rule.params?.allowTimeComponent && hasTimeComponent) {
          if (row <= 8) {
            console.log(`❌ 行${row}: 日期格式错误 - 包含时间组件`);
          }
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value: originalValue,
            message: rule.message,
            errorType: rule.type,
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
          errorType: rule.type,
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
          errorType: rule.type,
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
          errorType: rule.type,
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
          errorType: rule.type,
        };
      }
      break;

    case "prohibitedContent":
      if (value && typeof value === "string") {
        const content = value.trim();
        if (content && rule.params?.prohibitedTerms) {
          const prohibitedTerms = rule.params.prohibitedTerms;
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

async function detectDuplicates(results, imageDataMap) {
  // 使用汉明距离检测视觉相似图片（动态阈值 + 近阈值二次确认）
  const threshold = IMAGE_DUP_CONFIG.HAMMING_THRESHOLD;
  const nearMargin = IMAGE_DUP_CONFIG.NEAR_THRESHOLD_MARGIN;
  const madThreshold = 10; // MAD阈值（与 64x64 尺寸配套可适当上调或下调）

  console.log(
    `视觉重复检测开始，blockhash阈值: ${threshold}, MAD阈值: ${madThreshold}, 图片数量: ${results.length}`
  );

  // 过滤掉空哈希的图片（视觉哈希计算失败的）
  const validResults = results.filter((r) => r.hash && r.hash.length > 0);
  const skippedCount = results.length - validResults.length;

  if (skippedCount > 0) {
    console.warn(`⚠️ ${skippedCount} 张图片的视觉哈希计算失败，跳过重复检测`);
  }

  if (validResults.length === 0) {
    console.warn("⚠️ 没有图片成功计算视觉哈希，无法进行重复检测");
    return;
  }

  for (let i = 0; i < validResults.length; i++) {
    for (let j = i + 1; j < validResults.length; j++) {
      const hash1 = validResults[i].hash;
      const hash2 = validResults[j].hash;

      if (hash1 && hash2 && hash1.length === hash2.length) {
        const distance = calculateHammingDistanceHex(hash1, hash2);

        // 第一阶段：严格阈值直接进入二次/三次确认
        if (distance <= threshold + nearMargin) {
          // 哈希值接近，进行二次确认以避免误报
          const dataA = imageDataMap.get(validResults[i].id);
          const dataB = imageDataMap.get(validResults[j].id);
          let mad = Infinity;

          if (dataA && dataB) {
            try {
              mad = await averageAbsDiffFromImageData(dataA, dataB);
            } catch (e) {
              console.warn(`[MAD] 计算失败:`, e);
              mad = Infinity;
            }
          }

          // 若在严格阈值内且MAD通过，直接判定；
          // 若在近阈值带内，且启用SSIM，则再用SSIM确认提升准确性
          let ssim = 0;
          if (
            IMAGE_DUP_CONFIG.USE_SSIM &&
            isFinite(mad) &&
            distance > threshold // 仅在近阈值段再跑SSIM
          ) {
            try {
              ssim = await computeSSIM(dataA, dataB, 64);
            } catch (e) {
              console.warn("SSIM 计算失败:", e);
            }
          }

          const madOk = !isFinite(mad) ? true : mad <= madThreshold;
          const ssimOk =
            !IMAGE_DUP_CONFIG.USE_SSIM ||
            distance <= threshold ||
            ssim >= IMAGE_DUP_CONFIG.SSIM_GOOD;

          if (!(madOk && ssimOk)) {
            console.log(
              `[二次/三次确认失败] ${validResults[i].id} vs ${
                validResults[j].id
              }: 哈希=${distance}, MAD=${mad.toFixed(1)}, SSIM=${ssim.toFixed(
                3
              )}`
            );
            continue;
          }

          console.log(
            `✅ 发现视觉重复图片: ${validResults[i].id} 与 ${
              validResults[j].id
            }, 哈希距离: ${distance}/${hash1.length * 4}, MAD: ${mad.toFixed(
              1
            )}${IMAGE_DUP_CONFIG.USE_SSIM ? `, SSIM: ${ssim.toFixed(3)}` : ""}`
          );

          // 标记为重复，包含位置信息
          const duplicateJ = {
            id: validResults[j].id,
            position: validResults[j].position,
            row: validResults[j].row,
            column: validResults[j].column,
          };
          const duplicateI = {
            id: validResults[i].id,
            position: validResults[i].position,
            row: validResults[i].row,
            column: validResults[i].column,
          };

          // 检查是否已经存在，避免重复添加
          const existsInI = validResults[i].duplicates.some(
            (d) => d.id === validResults[j].id
          );
          const existsInJ = validResults[j].duplicates.some(
            (d) => d.id === validResults[i].id
          );

          if (!existsInI) {
            validResults[i].duplicates.push(duplicateJ);
          }
          if (!existsInJ) {
            validResults[j].duplicates.push(duplicateI);
          }
        }
      }
    }
  }

  console.log("视觉重复检测完成");
}

// 计算汉明距离（用于十六进制哈希字符串）
function calculateHammingDistanceHex(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;

    // 计算XOR结果中的1的个数（汉明距离）
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// 保留原有的字符串汉明距离函数（向后兼容）
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
          ...currentResult.duplicates
            .map((dup) => dup.id)
            .filter((id) => !visited.has(id))
        );
      }
    }
  }

  return groups;
}

// Extract image positions by parsing Excel drawings XML accurately
async function extractImagePositions(zipContent) {
  const imagePositions = new Map(); // key: 'xl/media/imageN.ext' -> Array<{ position, row, column }>

  try {
    // Helper to read a file as string if exists
    const readTextIfExists = async (path) => {
      const file = zipContent.file(path);
      if (!file) return null;
      try {
        return await file.async("string");
      } catch {
        return null;
      }
    };

    // Helper: parse XML safely
    const parseXml = (xmlText) => {
      // 在 Worker 中使用简单的正则表达式解析 XML
      // 这是一个简化的 XML 解析器，专门用于处理我们需要的 Excel XML 结构
      return {
        getElementsByTagName: (tagName) => {
          const elements = [];
          const regex = new RegExp(
            `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
            "g"
          );
          const selfClosingRegex = new RegExp(`<${tagName}[^>]*\\/>`, "g");

          let match;

          // 处理自闭合标签
          while ((match = selfClosingRegex.exec(xmlText)) !== null) {
            const element = createSimpleElement(match[0], tagName);
            elements.push(element);
          }

          // 处理普通标签
          while ((match = regex.exec(xmlText)) !== null) {
            const element = createSimpleElement(match[0], tagName, match[1]);
            elements.push(element);
          }

          return elements;
        },
      };
    };

    // 创建简单的元素对象
    const createSimpleElement = (fullMatch, tagName, content = "") => {
      return {
        tagName: tagName,
        textContent: content.replace(/<[^>]*>/g, "").trim(),
        getAttribute: (attrName) => {
          const attrRegex = new RegExp(`${attrName}="([^"]*)"`, "i");
          const match = fullMatch.match(attrRegex);
          return match ? match[1] : null;
        },
        getElementsByTagName: (childTagName) => {
          const childElements = [];
          const childRegex = new RegExp(
            `<${childTagName}[^>]*>([\\s\\S]*?)<\\/${childTagName}>`,
            "g"
          );
          const childSelfClosingRegex = new RegExp(
            `<${childTagName}[^>]*\\/>`,
            "g"
          );

          let match;

          // 处理自闭合子标签
          while ((match = childSelfClosingRegex.exec(content)) !== null) {
            const childElement = createSimpleElement(match[0], childTagName);
            childElements.push(childElement);
          }

          // 处理普通子标签
          while ((match = childRegex.exec(content)) !== null) {
            const childElement = createSimpleElement(
              match[0],
              childTagName,
              match[1]
            );
            childElements.push(childElement);
          }

          return childElements;
        },
      };
    };

    const columnIndexToLetter = (index) => {
      // Excel columns are 0-based here; convert to letters
      let n = Number(index);
      if (Number.isNaN(n) || n < 0) n = 0;
      let result = "";
      n = n + 1; // convert to 1-based
      while (n > 0) {
        const rem = (n - 1) % 26;
        result = String.fromCharCode(65 + rem) + result;
        n = Math.floor((n - 1) / 26);
      }
      return result;
    };

    // 首先尝试处理 WPS 的 cellimages.xml 结构
    const cellimagesResult = await extractFromCellImagesWorker(
      zipContent,
      readTextIfExists,
      parseXml,
      columnIndexToLetter
    );
    if (cellimagesResult.size > 0) {
      console.log(
        `🎯 Worker: 从 cellimages.xml 提取到 ${cellimagesResult.size} 个图片位置`
      );
      return cellimagesResult;
    }

    // 标准 OOXML 解析路径（包含 header/footer 与 absoluteAnchor 支持）
    // Iterate all worksheets to find drawing relationships
    const worksheetsFolder = zipContent.folder("xl/worksheets");
    if (!worksheetsFolder) return imagePositions;

    const sheetFiles = [];
    worksheetsFolder.forEach((relativePath, file) => {
      if (file.dir) return;
      if (relativePath.endsWith(".xml") && relativePath.startsWith("sheet")) {
        sheetFiles.push(relativePath);
      }
    });

    for (const sheetFile of sheetFiles.sort()) {
      const sheetPath = `xl/worksheets/${sheetFile}`;
      console.log(`处理工作表: ${sheetFile}`);
      const sheetXmlText = await readTextIfExists(sheetPath);
      if (!sheetXmlText) {
        console.log(`工作表 ${sheetFile} 无内容，跳过`);
        continue;
      }
      const sheetXml = parseXml(sheetXmlText);
      if (!sheetXml) {
        console.log(`工作表 ${sheetFile} XML解析失败，跳过`);
        continue;
      }

      // Find drawing r:id in sheet xml（工作表图层图片）
      const drawingEl = sheetXml.getElementsByTagName("drawing")[0];
      const drawingRelId = drawingEl
        ? drawingEl.getAttribute("r:id") || drawingEl.getAttribute("rel:id")
        : null;
      if (drawingEl && drawingRelId) {
        console.log(`工作表 ${sheetFile} 找到drawing ID: ${drawingRelId}`);
      }

      // Resolve sheet rels to drawing path（包括 headerFooter 图）
      const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
      const sheetRelsText = await readTextIfExists(sheetRelsPath);
      if (!sheetRelsText) continue;
      const sheetRelsXml = parseXml(sheetRelsText);
      if (!sheetRelsXml) continue;

      const rels = sheetRelsXml.getElementsByTagName("Relationship");
      let drawingTarget = null;
      const headerFooterTargets = [];
      for (let i = 0; i < rels.length; i++) {
        const r = rels[i];
        const idAttr = r.getAttribute("Id") || r.getAttribute("id");
        const target = r.getAttribute("Target");
        const type = r.getAttribute("Type") || "";
        if (idAttr && idAttr === drawingRelId) {
          drawingTarget = target;
        }
        // 识别 header/footer 图片关系
        if (
          type.includes("/headerFooter") ||
          (target && target.includes("header") && target.endsWith(".xml"))
        ) {
          headerFooterTargets.push(target);
        }
      }
      if (!drawingTarget && headerFooterTargets.length === 0) continue;

      // Normalize drawing path (can be '../drawings/drawing1.xml')
      let drawingPath = drawingTarget;
      if (drawingPath) {
        if (drawingPath.startsWith("../"))
          drawingPath = drawingPath.replace(/^\.\.\//, "xl/");
        if (!drawingPath.startsWith("xl/"))
          drawingPath = `xl/worksheets/${drawingPath}`; // fallback
      }

      // 处理 header/footer 媒体：它们可能不在 drawings 下，而在页面设置中引用
      if (headerFooterTargets.length > 0) {
        for (const hfTargetRaw of headerFooterTargets) {
          let hfTarget = hfTargetRaw || "";
          if (hfTarget.startsWith("../"))
            hfTarget = hfTarget.replace(/^\.\.\//, "xl/");
          if (!hfTarget.startsWith("xl/"))
            hfTarget = `xl/worksheets/${hfTarget}`;
          const hfXmlText = await readTextIfExists(hfTarget);
          if (!hfXmlText) continue;
          const hfXml = parseXml(hfXmlText);
          if (!hfXml) continue;
          // header/footer 图通常没有单元格锚点，记录为 absolute（位置未知）
          const blips = hfXml.getElementsByTagName("a:blip");
          for (let i = 0; i < blips.length; i++) {
            const embedId =
              blips[i].getAttribute("r:embed") ||
              blips[i].getAttribute("rel:embed") ||
              blips[i].getAttribute("embed");
            if (!embedId) continue;
            // 解析对应 rels 文件以拿到 media 路径
            const hfFileName = hfTarget.substring(
              hfTarget.lastIndexOf("/") + 1
            );
            const hfRelsPath = hfTarget.replace(
              hfFileName,
              `_rels/${hfFileName}.rels`
            );
            const hfRelsText = await readTextIfExists(hfRelsPath);
            if (!hfRelsText) continue;
            const hfRelsXml = parseXml(hfRelsText);
            if (!hfRelsXml) continue;
            const rels2 = hfRelsXml.getElementsByTagName("Relationship");
            let mediaKey = null;
            for (let j = 0; j < rels2.length; j++) {
              const r2 = rels2[j];
              const id2 = r2.getAttribute("Id") || r2.getAttribute("id");
              if (id2 === embedId) {
                const target2 = r2.getAttribute("Target") || "";
                mediaKey = target2.replace(/^.*\//, "");
                break;
              }
            }
            if (mediaKey) {
              const list = imagePositions.get(mediaKey) || [];
              list.push({
                position: undefined,
                row: undefined,
                column: undefined,
              });
              imagePositions.set(mediaKey, list);
            }
          }
        }
      }

      if (!drawingPath) continue;
      const drawingXmlText = await readTextIfExists(drawingPath);
      if (!drawingXmlText) continue;
      const drawingXml = parseXml(drawingXmlText);
      if (!drawingXml) continue;

      // Load drawing rels to map r:embed -> media path
      const drawingFileName = drawingPath.substring(
        drawingPath.lastIndexOf("/") + 1
      );
      const drawingRelsPath = drawingPath.replace(
        "drawings/" + drawingFileName,
        `drawings/_rels/${drawingFileName}.rels`
      );
      const drawingRelsText = await readTextIfExists(drawingRelsPath);
      const embedRelMap = new Map(); // rId -> media key (basename like 'image1.png')
      if (drawingRelsText) {
        const drawingRelsXml = parseXml(drawingRelsText);
        if (drawingRelsXml) {
          const dRels = drawingRelsXml.getElementsByTagName("Relationship");
          for (let i = 0; i < dRels.length; i++) {
            const dr = dRels[i];
            const id = dr.getAttribute("Id") || dr.getAttribute("id");
            let target = dr.getAttribute("Target") || "";
            if (!id || !target) continue;
            const basename = target.replace(/^.*\//, "");
            console.log(
              `[extractImagePositions] Mapping relId '${id}' to target '${target}' (basename: '${basename}')`
            );
            embedRelMap.set(id, basename);
          }
        }
      }
      console.log(
        "[extractImagePositions] Populated embedRelMap:",
        embedRelMap
      );

      // Drawing anchors: support xdr:twoCellAnchor and xdr:oneCellAnchor
      // 尝试不同的命名空间前缀
      const anchorSelectors = [
        "xdr:twoCellAnchor",
        "xdr:oneCellAnchor",
        "xdr:absoluteAnchor",
        "twoCellAnchor",
        "oneCellAnchor",
        "absoluteAnchor",
      ];

      let anchors = [];
      for (const selector of anchorSelectors) {
        const elements = drawingXml.getElementsByTagName(selector);
        if (elements.length > 0) {
          anchors = Array.from(elements);
          console.log(`使用选择器 ${selector} 找到 ${anchors.length} 个锚点`);
          break;
        }
      }

      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];

        // Skip absolute anchors (no estimation allowed)
        const tagNameLower = (anchor.tagName || "").toLowerCase();
        if (tagNameLower.includes("absoluteanchor")) {
          console.warn("检测到 absoluteAnchor，无法精确定位到单元格，跳过");
          continue;
        }

        // 尝试不同的命名空间前缀查找from元素
        const fromSelectors = ["xdr:from", "from"];
        let fromEl = null;
        for (const selector of fromSelectors) {
          fromEl = anchor.getElementsByTagName(selector)[0];
          if (fromEl) break;
        }

        let colIdx = 0;
        let rowIdx = 0;
        if (fromEl) {
          // 尝试不同的命名空间前缀查找col和row元素
          const colSelectors = ["xdr:col", "col"];
          const rowSelectors = ["xdr:row", "row"];

          let colEl = null,
            rowEl = null;
          for (const selector of colSelectors) {
            colEl = fromEl.getElementsByTagName(selector)[0];
            if (colEl) break;
          }
          for (const selector of rowSelectors) {
            rowEl = fromEl.getElementsByTagName(selector)[0];
            if (rowEl) break;
          }

          if (colEl && colEl.textContent)
            colIdx = parseInt(colEl.textContent, 10) || 0;
          if (rowEl && rowEl.textContent)
            rowIdx = parseInt(rowEl.textContent, 10) || 0;
        }

        // 尝试不同的命名空间前缀查找blip元素
        const blipSelectors = ["a:blip", "blip"];
        let blipEls = null;
        for (const selector of blipSelectors) {
          blipEls = anchor.getElementsByTagName(selector);
          if (blipEls.length > 0) break;
        }

        if (!blipEls || blipEls.length === 0) continue;

        const embedId =
          blipEls[0].getAttribute("r:embed") ||
          blipEls[0].getAttribute("rel:embed") ||
          blipEls[0].getAttribute("embed");
        if (!embedId) continue;
        const mediaKeyFromRel = embedRelMap.get(embedId);
        console.log(
          `[extractImagePositions] Anchor embedId: '${embedId}', found media key: '${mediaKeyFromRel}'`
        );
        if (!mediaKeyFromRel) continue;

        const excelRow = rowIdx + 1; // convert to 1-based
        const excelColLetter = columnIndexToLetter(colIdx);
        const position = `${excelColLetter}${excelRow}`;

        console.log(
          `找到图片位置: ${mediaKeyFromRel} -> ${position} (行${excelRow}, 列${excelColLetter})`
        );

        const list = imagePositions.get(mediaKeyFromRel) || [];
        list.push({ position, row: excelRow, column: excelColLetter });
        imagePositions.set(mediaKeyFromRel, list);
      }
    }

    return imagePositions;
  } catch (error) {
    console.warn("无法提取图片位置信息:", error);
    return new Map();
  }
}

// 备用的位置提取函数，确保总是返回有效位置
function extractPositionFromPath(imagePath, index) {
  // 启发式方法：基于图片索引计算位置
  const estimatedRow = 4 + index * 5; // 从第4行开始，每张图片间隔5行
  const column = "A"; // 假设图片在A列

  console.log(
    `备用位置计算: ${imagePath} (索引${index}) -> ${column}${estimatedRow}`
  );

  return {
    position: `${column}${estimatedRow}`,
    row: estimatedRow,
    column: column,
  };
}

// Worker 专用的 XML 解析器（使用正则表达式）
function parseXmlWorker(xmlText) {
  return {
    getElementsByTagName: (tagName) => {
      const elements = [];
      const regex = new RegExp(
        `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "g"
      );
      const selfClosingRegex = new RegExp(`<${tagName}[^>]*\\/>`, "g");

      let match;

      // 处理自闭合标签
      while ((match = selfClosingRegex.exec(xmlText)) !== null) {
        const element = createSimpleElementWorker(match[0], tagName);
        elements.push(element);
      }

      // 处理普通标签
      while ((match = regex.exec(xmlText)) !== null) {
        const element = createSimpleElementWorker(match[0], tagName, match[1]);
        elements.push(element);
      }

      return elements;
    },
  };
}

// 创建简单的元素对象（Worker版本）
function createSimpleElementWorker(fullMatch, tagName, content = "") {
  return {
    tagName: tagName,
    textContent: content.replace(/<[^>]*>/g, "").trim(),
    getAttribute: (attrName) => {
      const attrRegex = new RegExp(`${attrName}="([^"]*)"`, "i");
      const match = fullMatch.match(attrRegex);
      return match ? match[1] : null;
    },
    getElementsByTagName: (childTagName) => {
      const childElements = [];
      const childRegex = new RegExp(
        `<${childTagName}[^>]*>([\\s\\S]*?)<\\/${childTagName}>`,
        "g"
      );
      const childSelfClosingRegex = new RegExp(
        `<${childTagName}[^>]*\\/>`,
        "g"
      );

      let match;

      // 处理自闭合子标签
      while ((match = childSelfClosingRegex.exec(content)) !== null) {
        const childElement = createSimpleElementWorker(match[0], childTagName);
        childElements.push(childElement);
      }

      // 处理普通子标签
      while ((match = childRegex.exec(content)) !== null) {
        const childElement = createSimpleElementWorker(
          match[0],
          childTagName,
          match[1]
        );
        childElements.push(childElement);
      }

      return childElements;
    },
  };
}

// 从 WPS 的 cellimages.xml 提取图片位置 (Worker版本)
async function extractFromCellImagesWorker(
  zipContent,
  readTextIfExists,
  parseXml,
  columnIndexToLetter
) {
  const imagePositions = new Map();

  try {
    // 检查是否存在 cellimages.xml
    console.log("🔍 Worker: 检查 cellimages.xml 文件...");
    const cellimagesXmlText = await readTextIfExists("xl/cellimages.xml");
    if (!cellimagesXmlText) {
      console.log("❌ Worker: 未找到 xl/cellimages.xml");
      return imagePositions;
    }
    console.log(
      "✅ Worker: 找到 cellimages.xml，长度:",
      cellimagesXmlText.length
    );

    const cellimagesRelsText = await readTextIfExists(
      "xl/_rels/cellimages.xml.rels"
    );
    if (!cellimagesRelsText) {
      console.log("❌ Worker: 未找到 xl/_rels/cellimages.xml.rels");
      return imagePositions;
    }
    console.log(
      "✅ Worker: 找到 cellimages.xml.rels，长度:",
      cellimagesRelsText.length
    );

    const cellimagesRelsXml = parseXmlWorker(cellimagesRelsText);
    if (!cellimagesRelsXml) return imagePositions;

    // 构建关系映射 rId -> 图片文件名
    const embedRelMap = new Map();
    const rels = cellimagesRelsXml.getElementsByTagName("Relationship");
    for (let i = 0; i < rels.length; i++) {
      const rel = rels[i];
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        // target 格式: "media/image1.jpeg"
        const basename = target.replace(/^.*\//, "");
        embedRelMap.set(id, basename);
        console.log(`📎 Worker WPS 关系映射: ${id} -> ${basename}`);
      }
    }

    // 分析表格结构以确定列映射模式
    const tableStructure = await analyzeTableStructureWorker(
      zipContent,
      readTextIfExists,
      parseXml
    );
    console.log(`🔍 Worker 检测到表格结构:`, tableStructure);

    // WPS 的 cellimages.xml 包含图片但没有位置信息
    // 我们需要使用智能位置估算
    const cellimagesXml = parseXmlWorker(cellimagesXmlText);
    if (!cellimagesXml) return imagePositions;

    const cellImages = cellimagesXml.getElementsByTagName("etc:cellImage");
    for (let i = 0; i < cellImages.length; i++) {
      const cellImage = cellImages[i];
      const blipEl = cellImage.getElementsByTagName("a:blip")[0];
      if (!blipEl) continue;

      const embedId = blipEl.getAttribute("r:embed");
      if (!embedId) continue;

      const mediaKey = embedRelMap.get(embedId);
      if (!mediaKey) continue;

      // 尝试从DISPIMG公式获取精确位置
      const dispimgId = cellImage.getAttribute("name");
      let positionInfo = null;

      if (dispimgId) {
        positionInfo = await getPositionFromDISPIMGWorker(
          dispimgId,
          zipContent
        );

        // 检查是否有重复图片
        if (positionInfo && positionInfo.isDuplicate) {
          console.warn(`🚨 Worker检测到重复图片: ${dispimgId}`);
          console.warn(`   主位置: ${positionInfo.position}`);
          if (positionInfo.duplicates) {
            positionInfo.duplicates.forEach((dup, index) => {
              console.warn(`   重复位置 ${index + 1}: ${dup.position}`);
            });
          }

          // 可以在这里添加重复图片的处理逻辑
          // 例如：记录到验证结果中，或者抛出警告
        }
      }

      // 如果DISPIMG方法失败，回退到智能位置估算
      if (!positionInfo) {
        positionInfo = calculateImagePositionWorker(i, tableStructure);
        positionInfo.method = "index_estimation";
        positionInfo.confidence = "low";
      } else {
        positionInfo.method = "dispimg_formula";
        positionInfo.confidence = "high";
      }

      const list = imagePositions.get(mediaKey) || [];
      // 将主位置与重复位置一并记录到映射中，确保前端能显示所有重复位置
      const pushUnique = (pos) => {
        if (!pos || !pos.position) return;
        if (!list.some((p) => p.position === pos.position)) {
          list.push({ position: pos.position, row: pos.row, column: pos.column });
        }
      };
      pushUnique(positionInfo);
      if (Array.isArray(positionInfo.duplicates)) {
        positionInfo.duplicates.forEach((dupPos) => pushUnique(dupPos));
      }
      imagePositions.set(mediaKey, list);

      console.log(
        `🎯 Worker WPS 图片位置${
          positionInfo.method === "dispimg_formula" ? "(DISPIMG公式)" : "(估算)"
        }: ${mediaKey} -> ${positionInfo.position} (${
          positionInfo.type || positionInfo.method
        })`
      );
    }

    return imagePositions;
  } catch (error) {
    console.warn("Worker 无法提取 WPS 图片位置信息:", error);
    return new Map();
  }
}

// 分析表格结构以确定列映射模式 (Worker版本)
async function analyzeTableStructureWorker(
  zipContent,
  readTextIfExists,
  parseXml
) {
  try {
    // 预定义的结构模式
    const structurePatterns = {
      药店拜访: {
        visitType: "药店拜访",
        imageColumns: ["M", "N"],
        columnMappings: { M: "门头", N: "内部" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
      医院拜访类: {
        visitType: "医院拜访类",
        imageColumns: ["O", "P"],
        columnMappings: { O: "医院门头照", P: "科室照片" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
      科室拜访: {
        visitType: "科室拜访",
        imageColumns: ["N", "O"],
        columnMappings: { N: "医院门头照", O: "内部照片" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
    };

    // 尝试读取工作表数据来分析结构
    const sharedStringsText = await readTextIfExists("xl/sharedStrings.xml");

    // 如果无法读取工作表数据，返回默认结构
    if (!sharedStringsText) {
      console.log("📋 Worker 使用默认表格结构 (药店拜访模式)");
      return structurePatterns["药店拜访"];
    }

    // 解析共享字符串以检测表头内容
    const sharedStringsXml = parseXmlWorker(sharedStringsText);
    const strings = [];
    if (sharedStringsXml) {
      const siElements = sharedStringsXml.getElementsByTagName("si");
      for (let i = 0; i < siElements.length; i++) {
        const tElement = siElements[i].getElementsByTagName("t")[0];
        if (tElement && tElement.textContent) {
          strings.push(tElement.textContent);
        }
      }
    }

    // 检测表头中的关键词来判断拜访类型
    const headerText = strings.join(" ").toLowerCase();
    console.log("📋 Worker 检测到的表头关键词:", headerText.substring(0, 200));

    // 根据表头内容判断拜访类型
    if (headerText.includes("医院门头照") && headerText.includes("科室照片")) {
      console.log("🏥 Worker 检测到医院拜访类模式");
      return structurePatterns["医院拜访类"];
    } else if (headerText.includes("科室") && headerText.includes("内部照片")) {
      console.log("🏥 Worker 检测到科室拜访模式");
      return structurePatterns["科室拜访"];
    } else if (headerText.includes("门头") && headerText.includes("内部")) {
      console.log("🏪 Worker 检测到药店拜访模式");
      return structurePatterns["药店拜访"];
    }

    // 默认返回药店拜访模式
    console.log("📋 Worker 使用默认药店拜访模式");
    return structurePatterns["药店拜访"];
  } catch (error) {
    console.warn("Worker 表格结构分析失败，使用默认结构:", error);
    return {
      visitType: "药店拜访",
      imageColumns: ["M", "N"],
      columnMappings: { M: "门头", N: "内部" },
      imagesPerRecord: 2,
      dataStartRow: 4,
    };
  }
}

// 从DISPIMG公式获取精确位置 (Worker版本) - 支持检测重复图片
async function getPositionFromDISPIMGWorker(dispimgId, zipContent) {
  try {
    console.log(`🔍 Worker查找DISPIMG公式中的图片ID: ${dispimgId}`);

    // 查找工作表文件
    const worksheetFiles = Object.keys(zipContent.files).filter(
      (name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml")
    );

    const allPositions = [];

    for (const worksheetFile of worksheetFiles) {
      const worksheetXml = await zipContent.file(worksheetFile)?.async("text");
      if (!worksheetXml) continue;

      // 查找包含目标dispimgId的DISPIMG公式
      // 修复：使用更精确的正则表达式来匹配XML结构
      const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
      let match;

      while ((match = cellRegex.exec(worksheetXml)) !== null) {
        const cellRef = match[1];
        const cellContent = match[2];

        // 在单元格内容中查找DISPIMG公式
        const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
        if (formulaMatch) {
          const formula = formulaMatch[1];

          // 提取DISPIMG中的图片ID - 处理HTML实体编码
          const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
          if (idMatch && idMatch[1] === dispimgId) {
            // 解析单元格引用
            const cellMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
            if (cellMatch) {
              const column = cellMatch[1];
              const row = parseInt(cellMatch[2]);

              allPositions.push({
                position: cellRef,
                row: row,
                column: column,
                type:
                  column === "M" ? "门头" : column === "N" ? "内部" : "图片",
              });
            }
          }
        }
      }
    }

    if (allPositions.length === 0) {
      console.log(`❌ Worker未找到DISPIMG公式中的图片ID: ${dispimgId}`);
      return null;
    }

    // 检测重复图片
    if (allPositions.length > 1) {
      console.warn(
        `⚠️ Worker检测到重复图片ID: ${dispimgId}，出现在 ${allPositions.length} 个位置:`
      );
      allPositions.forEach((pos, index) => {
        console.warn(`   ${index + 1}. ${pos.position}`);
      });

      // 返回第一个位置，并标记为重复
      return {
        ...allPositions[0],
        duplicates: allPositions.slice(1),
        isDuplicate: true,
      };
    }

    console.log(
      `✅ Worker找到DISPIMG公式位置: ${dispimgId} -> ${allPositions[0].position}`
    );
    return allPositions[0];
  } catch (error) {
    console.warn("Worker从DISPIMG公式获取位置失败:", error);
    return null;
  }
}

// 智能计算图片位置 (Worker版本)
function calculateImagePositionWorker(imageIndex, tableStructure) {
  const { imageColumns, columnMappings, imagesPerRecord, dataStartRow } =
    tableStructure;

  // 计算记录索引和图片在记录中的位置
  const recordIndex = Math.floor(imageIndex / imagesPerRecord);
  const imageInRecord = imageIndex % imagesPerRecord;

  // 计算行号（保持简单估算，避免引入额外偏差）
  const row = dataStartRow + recordIndex;

  // 获取列和类型
  const column = imageColumns[imageInRecord] || imageColumns[0];
  const type = columnMappings[column] || `图片${imageInRecord + 1}`;

  return {
    position: `${column}${row}`,
    row,
    column,
    type,
  };
}

// Communication functions
function sendProgress(message, progress) {
  self.postMessage({
    type: MESSAGE_TYPES.PROGRESS,
    data: { message, progress },
  });
}

function sendResult(result) {
  // 使用 Transferable Objects 传递二进制，避免大数据结构克隆导致内存爆
  const transferList = [];
  try {
    const resultsArray = Array.isArray(result?.results)
      ? result.results
      : Array.isArray(result?.imageValidation?.results)
      ? result.imageValidation.results
      : null;

    if (resultsArray) {
      for (const r of resultsArray) {
        const buf = r?.imageData && r.imageData.buffer;
        if (buf instanceof ArrayBuffer) {
          transferList.push(buf);
        }
      }
    }
  } catch (e) {
    // 忽略收集传输列表时的错误，回退为普通发送
  }

  try {
    if (transferList.length > 0) {
      self.postMessage(
        {
          type: MESSAGE_TYPES.RESULT,
          data: result,
        },
        transferList
      );
    } else {
      self.postMessage({
        type: MESSAGE_TYPES.RESULT,
        data: result,
      });
    }
  } catch (e) {
    // 如果因为某些字段无法克隆，尝试去除图片二进制，仅返回摘要，避免中断主流程
    try {
      const sanitized = JSON.parse(
        JSON.stringify(result, (key, value) => {
          if (key === "imageData") return undefined;
          return value;
        })
      );
      self.postMessage({ type: MESSAGE_TYPES.RESULT, data: sanitized });
    } catch (e2) {
      self.postMessage({
        type: MESSAGE_TYPES.ERROR,
        data: {
          message: `图片结果传输失败: ${
            e instanceof Error ? e.message : String(e)
          }`,
        },
      });
    }
  }
}

function sendError(message) {
  self.postMessage({
    type: MESSAGE_TYPES.ERROR,
    data: { message },
  });
}
