// 测试验证修复效果
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 模拟修复后的验证函数
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

function testValidationFixes() {
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
    
    console.log('🧪 测试验证修复效果...\n');
    
    // 测试时间范围验证修复
    console.log('📅 测试时间范围验证修复:');
    const timeRangeParams = { startHour: 8, endHour: 19 };
    
    const testTimeValues = [
      '2025.8.1',           // 只有日期，应该通过
      '2025-08-01',         // 只有日期，应该通过
      '2025.8.1\n08：00',   // 有时间，需要验证
      '2025.8.1 09:25',     // 有时间，需要验证
      '2025.8.1 20:00',     // 超出范围，应该失败
    ];
    
    testTimeValues.forEach(value => {
      const result = isValidTimeRange(value, timeRangeParams);
      console.log(`  "${value}" → ${result ? '✅ 通过' : '❌ 失败'}`);
    });
    
    // 测试频次验证修复
    console.log('\n👥 测试频次验证修复:');
    
    // 提取实际数据进行频次统计
    const headerRow = data[2]; // 第3行是表头
    const dataRows = data.slice(3); // 从第4行开始是数据
    
    // 构建字段映射
    const fieldMapping = new Map();
    headerRow.forEach((header, index) => {
      const cleaned = String(header || "").trim().replace(/\n/g, "").replace(/\s+/g, "");
      fieldMapping.set(cleaned, index);
    });
    
    const implementerIndex = fieldMapping.get('实施人');
    const visitTimeIndex = fieldMapping.get('拜访开始时间');
    
    console.log(`实施人字段索引: ${implementerIndex}`);
    console.log(`拜访开始时间字段索引: ${visitTimeIndex}`);
    
    if (implementerIndex !== undefined && visitTimeIndex !== undefined) {
      // 按实施人和日期统计
      const dailyCounts = new Map();
      
      dataRows.forEach((row, index) => {
        if (!row || row.length === 0) return;
        
        const implementer = row[implementerIndex];
        const visitTime = row[visitTimeIndex];
        
        if (!implementer || !visitTime) return;
        
        const dateStr = extractDate(visitTime);
        if (!dateStr) return;
        
        const key = `${dateStr}_${String(implementer).trim()}`;
        
        if (!dailyCounts.has(key)) {
          dailyCounts.set(key, []);
        }
        
        dailyCounts.get(key).push({
          row: index + 4, // 实际行号
          implementer,
          visitTime,
          dateStr
        });
      });
      
      console.log('\n📊 每日拜访统计:');
      for (const [key, visits] of dailyCounts) {
        const [date, implementer] = key.split('_');
        console.log(`${implementer} 在 ${date}: ${visits.length} 次拜访`);
        
        if (visits.length > 5) {
          console.log(`  ⚠️  超过5次限制！应该报错的行:`);
          visits.slice(5).forEach(visit => {
            console.log(`    第${visit.row}行: ${visit.visitTime}`);
          });
        }
      }
      
      // 检查是否有超过5次的情况
      const violations = Array.from(dailyCounts.entries()).filter(([key, visits]) => visits.length > 5);
      
      if (violations.length > 0) {
        console.log(`\n✅ 频次验证应该检测出 ${violations.length} 个违规情况`);
      } else {
        console.log('\n📝 当前数据没有超过每日5次限制的情况');
      }
    }
    
    // 测试日期提取功能
    console.log('\n📅 测试日期提取功能:');
    const testDateValues = [
      '2025.8.1\n08：00',
      '2025-08-01 09:25',
      '2025/8/1 10:00',
      '2025.8.1',
      '无效日期'
    ];
    
    testDateValues.forEach(value => {
      const extracted = extractDate(value);
      console.log(`  "${value}" → "${extracted}"`);
    });

  } catch (error) {
    console.error('❌ 测试时出错:', error);
  }
}

// 运行测试
console.log('🚀 开始测试验证修复效果...\n');
testValidationFixes();
console.log('\n✅ 测试完成！');
