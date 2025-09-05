// 测试前端验证与服务端的一致性
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 模拟服务端的parseDate函数
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
    
    // 处理多种日期格式
    let dateStr = str;
    
    // 处理 "2025.8.1\n08：00" 格式
    if (str.includes('\n')) {
      dateStr = str.split('\n')[0];
    }
    
    // 标准化分隔符
    dateStr = dateStr.replace(/\./g, '-').replace(/\//g, '-');
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// 模拟服务端的频次验证逻辑
function validateFrequencyServerSide(rule, rows, fieldMapping) {
  const errors = [];
  const { maxPerDay, groupBy } = rule.params;
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
        column: `Column${columnIndex}`,
        field: rule.field,
        value: implementer,
        message: `${rule.message}（${dateStr}当日第${currentCount + 1}家，超过${maxPerDay}家限制）`,
        type: rule.type,
      });
    }
  }

  return errors;
}

function testServerSideConsistency() {
  const filePath = path.join(__dirname, '../public/test-files/8月盛邦药店拜访记录(11111111).xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ 测试文件不存在！');
    return;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['药店拜访'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('🔍 测试前端验证与服务端的一致性...\n');
    
    // 构建字段映射
    const headerRow = data[2]; // 第3行是表头
    const fieldMapping = new Map();
    
    const templateFieldMappings = {
      序号: "serialNumber",
      任务标题: "taskTitle", 
      实施人: "implementer",
      对接人: "contactPerson",
      零售渠道: "retailChannel",
      渠道地址: "channelAddress",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
    };
    
    headerRow.forEach((header, index) => {
      if (header) {
        const raw = String(header).trim();
        const cleaned = raw.replace(/\n/g, "").replace(/\s+/g, "");
        
        fieldMapping.set(raw, index);
        fieldMapping.set(cleaned, index);
        
        const mappedField = templateFieldMappings[raw] || templateFieldMappings[cleaned];
        if (mappedField) {
          fieldMapping.set(mappedField, index);
        }
      }
    });
    
    // 解析数据行
    function parseRowData(row, fieldMapping) {
      const data = {};
      
      fieldMapping.forEach((colIndex, fieldName) => {
        let value = row[colIndex];
        data[fieldName] = value;
      });
      
      return data;
    }
    
    const allDataRows = data.slice(3); // 所有数据行
    const processedRows = allDataRows
      .map((row, index) => ({
        data: parseRowData(row, fieldMapping),
        rowNumber: index + 4,
        originalRow: row
      }))
      .filter(item => !Object.values(item.data).every(v => !v));
    
    console.log(`处理的数据行数: ${processedRows.length}`);
    
    // 频次验证规则
    const rule = {
      field: "implementer",
      type: "frequency",
      params: { maxPerDay: 5, groupBy: "implementer" },
      message: "同一实施人每日拜访不超过5家药店"
    };
    
    // 执行验证
    const errors = validateFrequencyServerSide(rule, processedRows, fieldMapping);
    
    console.log(`\n📊 验证结果:`);
    console.log(`错误数量: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n📋 错误详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. 第${error.row}行: ${error.message}`);
        console.log(`   实施人: ${error.value}`);
      });
      
      // 按日期和实施人分组统计
      const groupedErrors = new Map();
      errors.forEach(error => {
        const match = error.message.match(/（(\d{4}-\d{2}-\d{2})当日第(\d+)家/);
        if (match) {
          const [, date, count] = match;
          const key = `${error.value}_${date}`;
          if (!groupedErrors.has(key)) {
            groupedErrors.set(key, []);
          }
          groupedErrors.get(key).push({ row: error.row, count: parseInt(count) });
        }
      });
      
      console.log('\n📈 按违规情况分组:');
      for (const [key, violations] of groupedErrors) {
        const [implementer, date] = key.split('_');
        console.log(`${implementer} 在 ${date}: ${violations.length} 个超限错误`);
        violations.forEach(v => {
          console.log(`  第${v.row}行: 当日第${v.count}家`);
        });
      }
    } else {
      console.log('✅ 没有发现频次验证错误');
    }
    
    // 验证日期解析
    console.log('\n📅 日期解析测试:');
    const testDates = [
      '2025.8.1\n08：00',
      '2025.8.12\n08：10',
      '2025.8.22\n08：15'
    ];
    
    testDates.forEach(dateStr => {
      const parsed = parseDate(dateStr);
      if (parsed) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        const formatted = `${year}-${month}-${day}`;
        console.log(`"${dateStr}" → ${formatted}`);
      } else {
        console.log(`"${dateStr}" → 解析失败`);
      }
    });

  } catch (error) {
    console.error('❌ 测试时出错:', error);
  }
}

// 运行测试
console.log('🚀 开始测试前端验证与服务端的一致性...\n');
testServerSideConsistency();
console.log('\n✅ 测试完成！');
