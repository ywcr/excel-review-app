// 测试脚本：使用 excel-review-app 的验证逻辑审核 Excel（Node.js 适配版本）
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const crypto = require('crypto');

const EXCEL_FILE = 'C:\\Users\\123mi\\Downloads\\不盈科技2025-9-19.xlsx';
const SHEET_NAME = 'sheet213';
const TASK_TYPE = '药店拜访';
const OUTPUT_FILE = path.join(__dirname, 'audit-result-excel-review.json');

console.log('='.repeat(80));
console.log('🔍 excel-review-app 审核测试 (Node.js 适配版)');
console.log('='.repeat(80));
console.log(`Excel 文件: ${EXCEL_FILE}`);
console.log(`工作表: ${SHEET_NAME}`);
console.log(`任务类型: ${TASK_TYPE}`);
console.log(`输出文件: ${OUTPUT_FILE}`);
console.log('='.repeat(80));

// 检查文件是否存在
if (!fs.existsSync(EXCEL_FILE)) {
  console.error(`❌ 错误: Excel 文件不存在: ${EXCEL_FILE}`);
  process.exit(1);
}

// 模板定义（与 excel-review-app/electron-zxyy 一致）
const TEMPLATES = {
  '药店拜访': {
    sheetNames: ['药店拜访', '藥店拜訪'],
    requiredFields: ['實施人', '調查對象姓名', '藥店名稱', '調研時間', '拜訪開始時間'],
    fieldMappings: {
      '實施人': ['实施人', '調查員', '调查员', '執行人'],
      '調查對象姓名': ['调查对象姓名', '被调查人', '受访者', '负责人姓名', '调查对象'],
      '藥店名稱': ['药店名称', '藥房名稱', '店铺名称', '門店名稱', '药店'],
      '調研時間': ['调研时间', '调查时间', '實施時間', '填写时间', '时间'],
      '拜訪開始時間': ['拜访开始时间', '开始时间', '拜访时间']
    },
    validationRules: [
      {
        type: 'unique',
        field: '調查對象姓名',
        message: '調查對象姓名永遠不能重複',
        params: { scope: 'global' }
      },
      {
        type: 'frequency',
        field: '實施人',
        message: '同一實施人每日拜訪不超過2家藥店',
        params: { maxPerDay: 2, groupBy: '實施人', countBy: '藥店名稱' }
      },
      {
        type: 'frequency',
        field: '藥店名稱',
        message: '每個藥店不超過1份',
        params: { maxPerDay: 1, groupBy: '藥店名稱' }
      },
      {
        type: 'timeRange',
        field: '拜訪開始時間',
        message: '拜訪時間必須在 8:00-19:00 範圍內',
        params: { start: '08:00', end: '19:00' }
      },
      {
        type: 'dateFormat',
        field: '拜訪開始時間',
        message: '拜訪開始時間格式不正確，應為純日期格式（如：2025-08-01）',
        params: { allowTimeComponent: false }
      },
      {
        type: 'dateFormat',
        field: '調研時間',
        message: '調研時間格式不正確，應為純日期格式（如：2025-08-01）',
        params: { allowTimeComponent: false }
      }
    ]
  }
};

// 工作表名称规范化
function normalizeSheetName(name) {
  return name.replace(/\s+/g, '').toLowerCase();
}

// 查找匹配的工作表（使用改进后的单向匹配逻辑）
function findMatchingSheet(workbook, template) {
  const sheetNames = workbook.SheetNames;
  const expectedNames = template.sheetNames || [];
  
  // 1. 精确匹配
  for (const expected of expectedNames) {
    const normalized = normalizeSheetName(expected);
    for (const actual of sheetNames) {
      if (normalizeSheetName(actual) === normalized) {
        console.log(`✅ 精确匹配: "${actual}" === "${expected}"`);
        return actual;
      }
    }
  }
  
  // 2. 单向包含匹配（仅工作表名称包含模板名称）
  for (const expected of expectedNames) {
    const normalized = normalizeSheetName(expected);
    for (const actual of sheetNames) {
      const actualNormalized = normalizeSheetName(actual);
      if (actualNormalized.includes(normalized)) {
        console.log(`✅ 单向匹配: "${actual}" 包含 "${expected}"`);
        return actual;
      }
    }
  }
  
  return null;
}

// 识别表头
function identifyHeaders(worksheet, template) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const requiredFields = template.requiredFields || [];
  const fieldMappings = template.fieldMappings || {};
  
  let headerRow = -1;
  let headerMap = {};
  
  // 搜索前20行
  const maxSearchRow = Math.min(range.e.r, 19);
  
  for (let row = range.s.r; row <= maxSearchRow; row++) {
    const rowHeaders = {};
    let matchCount = 0;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddr];
      if (!cell || !cell.v) continue;
      
      const cellValue = String(cell.v).trim();
      const normalizedCell = cellValue.replace(/\s+/g, '').toLowerCase();
      
      // 检查是否匹配必填字段
      for (const field of requiredFields) {
        const aliases = [field, ...(fieldMappings[field] || [])];
        
        for (const alias of aliases) {
          const normalizedAlias = alias.replace(/\s+/g, '').toLowerCase();
          if (normalizedCell === normalizedAlias || normalizedCell.includes(normalizedAlias)) {
            rowHeaders[field] = col;
            matchCount++;
            break;
          }
        }
      }
    }
    
    // 如果匹配了至少2个必填字段，认为是表头
    if (matchCount >= 2) {
      headerRow = row;
      headerMap = rowHeaders;
      break;
    }
  }
  
  if (headerRow === -1) {
    throw new Error('未找到有效的表头行');
  }
  
  console.log(`✅ 找到表头，行号: ${headerRow + 1}`);
  console.log('表头映射:', headerMap);
  
  return { headerRow, headerMap };
}

// 验证数据
function validateData(worksheet, headerInfo, template) {
  const { headerRow, headerMap } = headerInfo;
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const dataRows = [];
  const warnings = [];
  const errors = [];
  
  // 提取数据行
  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const rowData = {};
    let isEmpty = true;
    
    for (const [field, col] of Object.entries(headerMap)) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddr];
      
      // 保留原始值（可能是Date对象）
      if (cell && cell.v !== undefined && cell.v !== null) {
        rowData[field] = cell.v;
        isEmpty = false;
      } else {
        rowData[field] = '';
      }
    }
    
    if (!isEmpty) {
      rowData._rowNumber = row + 1; // 1-based for Excel
      dataRows.push(rowData);
    }
  }
  
  console.log(`✅ 提取到 ${dataRows.length} 行数据`);
  
  // 检查空单元格（与 electron-zxyy 一致）
  for (const row of dataRows) {
    for (const [field, value] of Object.entries(row)) {
      if (field === '_rowNumber') continue;
      
      if (!value || String(value).trim() === '') {
        warnings.push({
          type: 'empty_cell',
          row: row._rowNumber,
          field,
          message: `字段「${field}」為空`
        });
      }
    }
  }
  
  // 执行验证规则
  const rules = template.validationRules || [];
  
  for (const rule of rules) {
    switch (rule.type) {
      case 'unique':
        validateUnique(dataRows, rule, errors);
        break;
      case 'frequency':
        validateFrequency(dataRows, rule, errors);
        break;
      case 'timeRange':
        validateTimeRange(dataRows, rule, errors);
        break;
      case 'dateFormat':
        validateDateFormat(dataRows, rule, errors, warnings);
        break;
    }
  }
  
  return { dataRows, warnings, errors };
}

// 验证唯一性
function validateUnique(dataRows, rule, errors) {
  const field = rule.field;
  const seen = new Set();
  const duplicates = [];
  
  for (const row of dataRows) {
    const value = row[field];
    if (!value) continue;
    
    if (seen.has(value)) {
      duplicates.push({
        row: row._rowNumber,
        field,
        value,
        message: rule.message
      });
    } else {
      seen.add(value);
    }
  }
  
  if (duplicates.length > 0) {
    errors.push(...duplicates);
    console.log(`❌ 唯一性验证失败: ${field} 有 ${duplicates.length} 个重复值`);
  }
}

// 验证频率
function validateFrequency(dataRows, rule, errors) {
  const { groupBy, countBy, maxPerDay } = rule.params;
  const groups = {};
  
  for (const row of dataRows) {
    const groupKey = row[groupBy];
    if (!groupKey) continue;
    
    if (!groups[groupKey]) {
      groups[groupKey] = { count: 0, items: new Set(), rows: [] };
    }
    
    if (countBy) {
      const itemKey = row[countBy];
      if (itemKey) groups[groupKey].items.add(itemKey);
    } else {
      groups[groupKey].count++;
    }
    
    groups[groupKey].rows.push(row._rowNumber);
  }
  
  for (const [groupKey, data] of Object.entries(groups)) {
    const actualCount = countBy ? data.items.size : data.count;
    
    if (actualCount > maxPerDay) {
      errors.push({
        field: groupBy,
        value: groupKey,
        count: actualCount,
        limit: maxPerDay,
        rows: data.rows,
        message: rule.message
      });
      console.log(`❌ 频率验证失败: ${groupKey} 超出限制 (${actualCount} > ${maxPerDay})`);
    }
  }
}

// 验证日期格式
function validateDateFormat(dataRows, rule, errors, warnings) {
  const field = rule.field;
  const allowTimeComponent = rule.params.allowTimeComponent !== false;
  
  const datePattern = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/;
  const dateTimePattern = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s+\d{1,2}:\d{2}/;
  
  for (const row of dataRows) {
    const value = row[field];
    if (!value) continue;
    
    const valueStr = String(value);
    const isValidDate = datePattern.test(valueStr);
    const isValidDateTime = dateTimePattern.test(valueStr);
    
    // 检查是否是Date对象或包含时间的字符串
    const hasTimeComponent = value instanceof Date || dateTimePattern.test(valueStr);
    
    if (!isValidDate && !isValidDateTime) {
      warnings.push({
        row: row._rowNumber,
        field,
        value: valueStr,
        message: rule.message,
        type: 'dateFormat'
      });
    } else if (!allowTimeComponent && hasTimeComponent) {
      // 如果不允许时间分量，但值包含时间，则报错
      errors.push({
        row: row._rowNumber,
        field,
        value: valueStr,
        message: '日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）',
        type: 'dateFormat'
      });
    }
  }
}

// 验证时间范围
function validateTimeRange(dataRows, rule, errors) {
  const field = rule.field;
  const { start, end } = rule.params;
  
  for (const row of dataRows) {
    const value = row[field];
    if (!value) continue;
    
    let timeValue;
    if (value instanceof Date) {
      timeValue = value;
    } else {
      // 尝试解析时间字符串
      const timeMatch = String(value).match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        timeValue = new Date();
        timeValue.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
      } else {
        continue;
      }
    }
    
    const hours = timeValue.getHours();
    const minutes = timeValue.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // 解析 start 和 end
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (timeInMinutes < startMinutes || timeInMinutes > endMinutes) {
      errors.push({
        row: row._rowNumber,
        field,
        value: String(value),
        message: rule.message,
        type: 'timeRange'
      });
    }
  }
}

// 主函数
async function main() {
  try {
    // 读取 Excel 文件
    const excelBuffer = fs.readFileSync(EXCEL_FILE);
    console.log(`✅ 读取 Excel 文件: ${(excelBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);
    
    // 解析 Excel
    console.log('📊 解析 Excel...');
    const workbook = XLSX.read(excelBuffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    console.log(`✅ 可用工作表: ${workbook.SheetNames.join(', ')}\n`);
    
    // 获取模板
    const template = TEMPLATES[TASK_TYPE];
    if (!template) {
      throw new Error(`未找到任务类型: ${TASK_TYPE}`);
    }
    
    // 选择工作表
    let targetSheetName = SHEET_NAME;
    if (!workbook.Sheets[targetSheetName]) {
      console.log(`⚠️  指定的工作表 "${SHEET_NAME}" 不存在，尝试自动匹配...`);
      targetSheetName = findMatchingSheet(workbook, template);
      if (!targetSheetName) {
        throw new Error('未找到匹配的工作表');
      }
    } else {
      console.log(`✅ 使用指定工作表: "${targetSheetName}"\n`);
    }
    
    const worksheet = workbook.Sheets[targetSheetName];
    
    // 范围矫正（与 excel-review-app 一致）
    const declaredRef = worksheet['!ref'] || '';
    const looksFullGrid = /1048576/.test(declaredRef) || /XFD/i.test(declaredRef);
    
    if (looksFullGrid) {
      console.log('⚠️  检测到异常范围声明，正在矫正...');
      let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
      
      for (const addr in worksheet) {
        if (addr[0] === '!') continue;
        const decoded = XLSX.utils.decode_cell(addr);
        minR = Math.min(minR, decoded.r);
        maxR = Math.max(maxR, decoded.r);
        minC = Math.min(minC, decoded.c);
        maxC = Math.max(maxC, decoded.c);
      }
      
      if (minR !== Infinity) {
        const corrected = XLSX.utils.encode_range(
          { r: minR, c: minC },
          { r: maxR, c: maxC }
        );
        worksheet['!ref'] = corrected;
        console.log(`✅ 范围矫正: ${declaredRef} → ${corrected}\n`);
      }
    }
    
    // 识别表头
    console.log('📋 识别表头...');
    const headerInfo = identifyHeaders(worksheet, template);
    console.log('');
    
    // 验证数据
    console.log('🔍 验证数据...');
    const validationResult = validateData(worksheet, headerInfo, template);
    console.log('');
    
    // 图片处理（简化版本 - 只统计）
    console.log('🖼️  处理图片...');
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(excelBuffer);
    
    const mediaFiles = Object.keys(zipContent.files).filter(name => 
      name.startsWith('xl/media/') && !zipContent.files[name].dir
    );
    
    console.log(`✅ 发现 ${mediaFiles.length} 张图片\n`);
    
    // 构建结果
    const result = {
      isValid: validationResult.errors.length === 0,
      sheetName: targetSheetName,
      dataRowCount: validationResult.dataRows.length,
      dataWarnings: validationResult.warnings,
      dataErrors: validationResult.errors,
      imageStats: {
        total: mediaFiles.length,
        // 简化版本不做详细图片分析
        qualityIssues: 0,
        watermarkDetections: 0,
        duplicates: 0
      },
      imageWarnings: [],
      imageErrors: []
    };
    
    // 保存结果
    const outputData = {
      metadata: {
        source: 'excel-review-app',
        worker: 'validation-worker.js (Node.js adapted)',
        excelFile: EXCEL_FILE,
        sheetName: targetSheetName,
        taskType: TASK_TYPE,
        timestamp: new Date().toISOString(),
      },
      result
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`✅ 结果已保存到: ${OUTPUT_FILE}`);
    
    // 打印摘要
    console.log('\n' + '='.repeat(80));
    console.log('📊 审核摘要 (excel-review-app)');
    console.log('='.repeat(80));
    console.log(`✅ 验证成功: ${result.isValid ? '是' : '否'}`);
    console.log(`📋 数据行数: ${result.dataRowCount}`);
    console.log(`🖼️  图片数量: ${result.imageStats.total}`);
    console.log(`⚠️  数据警告: ${result.dataWarnings.length} 个`);
    console.log(`❌ 数据错误: ${result.dataErrors.length} 个`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ 审核失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
