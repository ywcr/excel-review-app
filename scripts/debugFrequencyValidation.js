// 调试频次验证问题
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function debugFrequencyValidation() {
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
    
    console.log('🔍 调试频次验证问题...\n');
    
    // 1. 检查表头和字段映射
    const headerRow = data[2]; // 第3行是表头
    console.log('📋 表头行内容:');
    headerRow.forEach((header, index) => {
      console.log(`  ${index}: "${header}"`);
    });
    
    // 2. 模拟Worker的字段映射逻辑
    console.log('\n🗺️ 字段映射测试:');
    const fieldMapping = new Map();
    
    // 药店拜访的字段映射配置
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
        // 清洗表头
        const raw = String(header).trim();
        const cleaned = raw.replace(/\n/g, "").replace(/\s+/g, "");
        
        // 直接映射
        fieldMapping.set(raw, index);
        fieldMapping.set(cleaned, index);
        
        // 检查模板映射
        const mappedField = templateFieldMappings[raw] || templateFieldMappings[cleaned];
        if (mappedField) {
          fieldMapping.set(mappedField, index);
        }
        
        console.log(`  "${raw}" → 清洗后: "${cleaned}" → 映射: ${mappedField || '无'} → 索引: ${index}`);
      }
    });
    
    // 3. 检查关键字段的映射
    console.log('\n🎯 关键字段映射检查:');
    const implementerIndex = fieldMapping.get('implementer');
    const visitStartTimeIndex = fieldMapping.get('visitStartTime');
    
    console.log(`implementer字段索引: ${implementerIndex}`);
    console.log(`visitStartTime字段索引: ${visitStartTimeIndex}`);
    
    // 4. 检查数据行的内容
    console.log('\n📊 数据行内容检查:');
    const dataRows = data.slice(3, 8); // 检查前5行数据
    
    dataRows.forEach((row, index) => {
      const actualRowNumber = index + 4;
      const implementer = implementerIndex !== undefined ? row[implementerIndex] : '未找到';
      const visitTime = visitStartTimeIndex !== undefined ? row[visitStartTimeIndex] : '未找到';
      
      console.log(`第${actualRowNumber}行:`);
      console.log(`  实施人: "${implementer}"`);
      console.log(`  拜访开始时间: "${visitTime}"`);
    });
    
    // 5. 模拟parseRowData函数
    console.log('\n🔄 模拟parseRowData函数:');
    
    function parseRowData(row, fieldMapping) {
      const data = {};
      
      fieldMapping.forEach((colIndex, fieldName) => {
        let value = row[colIndex];
        
        // 自动格式化日期时间字段
        if (fieldName.includes("time") || fieldName.includes("Time")) {
          if (value && typeof value === "number") {
            // Excel日期数字转换
            const date = new Date((value - 25569) * 86400 * 1000);
            value = date.toISOString().slice(0, 16).replace('T', ' ');
          }
        }
        
        data[fieldName] = value;
      });
      
      return data;
    }
    
    const sampleRow = data[3]; // 第4行数据
    const parsedData = parseRowData(sampleRow, fieldMapping);
    
    console.log('解析后的数据对象:');
    Object.entries(parsedData).forEach(([key, value]) => {
      console.log(`  ${key}: "${value}"`);
    });
    
    // 6. 测试日期提取
    console.log('\n📅 日期提取测试:');
    
    function extractDate(value) {
      if (!value) return null;
      
      const dateStr = String(value).trim();
      
      // 尝试提取日期部分，支持多种格式
      let dateMatch = dateStr.match(/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/);
      if (dateMatch) {
        // 标准化日期格式
        return dateMatch[1].replace(/\./g, '-').replace(/\//g, '-');
      }
      
      return null;
    }
    
    const visitTimeValue = parsedData.visitStartTime;
    const extractedDate = extractDate(visitTimeValue);
    
    console.log(`原始拜访时间: "${visitTimeValue}"`);
    console.log(`提取的日期: "${extractedDate}"`);
    
    // 7. 模拟完整的频次验证逻辑
    console.log('\n🔢 模拟频次验证逻辑:');
    
    const allDataRows = data.slice(3); // 所有数据行
    const processedRows = allDataRows
      .map((row, index) => ({
        data: parseRowData(row, fieldMapping),
        rowNumber: index + 4,
        originalRow: row
      }))
      .filter(item => !Object.values(item.data).every(v => !v));
    
    console.log(`处理的数据行数: ${processedRows.length}`);
    
    // 频次统计
    const dailyCounts = new Map();
    const rule = {
      field: "implementer",
      params: { maxPerDay: 5, dateField: "visitStartTime" }
    };
    
    for (const { data, rowNumber } of processedRows) {
      const groupValue = data[rule.field]; // 实施人
      if (!groupValue) continue;
      
      const dateValue = data[rule.params.dateField]; // 拜访开始时间
      if (!dateValue) continue;
      
      const dateStr = extractDate(dateValue);
      if (!dateStr) continue;
      
      const key = `${dateStr}_${String(groupValue).trim()}`;
      
      if (!dailyCounts.has(key)) {
        dailyCounts.set(key, []);
      }
      
      dailyCounts.get(key).push({
        rowNumber,
        implementer: groupValue,
        visitTime: dateValue,
        dateStr
      });
    }
    
    console.log('\n📈 频次统计结果:');
    for (const [key, visits] of dailyCounts) {
      const [date, implementer] = key.split('_');
      console.log(`${implementer} 在 ${date}: ${visits.length} 次拜访`);
      
      if (visits.length > 5) {
        console.log(`  ⚠️  超过5次限制！违规行:`);
        visits.slice(5).forEach(visit => {
          console.log(`    第${visit.rowNumber}行: ${visit.visitTime}`);
        });
      }
    }
    
    const violations = Array.from(dailyCounts.entries()).filter(([key, visits]) => visits.length > 5);
    console.log(`\n📊 总结: 发现 ${violations.length} 个违规情况`);

  } catch (error) {
    console.error('❌ 调试时出错:', error);
  }
}

// 运行调试
console.log('🚀 开始调试频次验证问题...\n');
debugFrequencyValidation();
console.log('\n✅ 调试完成！');
