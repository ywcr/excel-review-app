// 诊断工具：检查Excel文件中的民营医院拜访重复情况
const XLSX = require('xlsx');
const path = require('path');

// 读取Excel文件
const filePath = path.join(__dirname, '卓联凯11月证据链.xlsx');
console.log('正在读取文件:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  
  // 显示所有工作表
  console.log('\n📚 所有工作表:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });
  
  // 查找民营医院拜访的工作表（精确匹配）
  let sheetName = workbook.SheetNames.find(name => 
    name.trim() === '民营医院拜访'
  );
  
  if (!sheetName) {
    // 尝试模糊匹配
    sheetName = workbook.SheetNames.find(name => 
      name.includes('民营')
    );
  }
  
  if (!sheetName) {
    console.error('\n❌ 未找到"民营医院拜访"工作表');
    console.log('\n请从以下工作表中选择一个:');
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });
    process.exit(1);
  }
  
  console.log('✓ 找到工作表:', sheetName);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) {
    console.error('❌ 工作表没有数据');
    process.exit(1);
  }
  
  // 查找真正的表头行（尝试前3行）
  let headerRow = null;
  let headerRowIndex = 0;
  
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => 
      cell && String(cell).includes('实施人') || 
      cell && String(cell).includes('医疗机构') ||
      cell && String(cell).includes('拜访时间')
    )) {
      headerRow = row;
      headerRowIndex = i;
      break;
    }
  }
  
  if (!headerRow) {
    headerRow = data[1] || data[0]; // 默认使用第二行或第一行
    headerRowIndex = headerRow === data[1] ? 1 : 0;
  }
  
  console.log('\n📋 表头信息:');
  console.log(`  表头在第 ${headerRowIndex + 1} 行`);
  console.log(headerRow.map((h, i) => `  [${i}] ${h || '(空)'}`).join('\n'));
  
  // 查找关键列的索引
  const findColumnIndex = (keywords) => {
    for (const keyword of keywords) {
      const index = headerRow.findIndex(h => 
        h && String(h).trim().includes(keyword)
      );
      if (index !== -1) return index;
    }
    return -1;
  };
  
  const implementerCol = findColumnIndex(['实施人', '执行人']);
  const hospitalCol = findColumnIndex(['医疗机构', '医院名称']);
  const dateCol = findColumnIndex(['拜访开始时间', '拜访时间', '日期']);
  const doctorCol = findColumnIndex(['医生姓名', '医生']);
  
  console.log('\n🔍 列索引映射:');
  console.log(`  实施人: 列 ${implementerCol} (${implementerCol >= 0 ? headerRow[implementerCol] : '未找到'})`);
  console.log(`  医院名称: 列 ${hospitalCol} (${hospitalCol >= 0 ? headerRow[hospitalCol] : '未找到'})`);
  console.log(`  拜访时间: 列 ${dateCol} (${dateCol >= 0 ? headerRow[dateCol] : '未找到'})`);
  console.log(`  医生姓名: 列 ${doctorCol} (${doctorCol >= 0 ? headerRow[doctorCol] : '未找到'})`);
  
  if (implementerCol === -1 || hospitalCol === -1 || dateCol === -1) {
    console.error('\n❌ 缺少必需的列，无法继续分析');
    process.exit(1);
  }
  
  // 解析日期函数
  const parseDate = (value) => {
    if (!value) return null;
    
    if (value instanceof Date) return value;
    
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000);
    }
    
    if (typeof value === 'string') {
      const str = value.trim();
      const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
      if (chineseDateMatch) {
        const year = parseInt(chineseDateMatch[1], 10);
        const month = parseInt(chineseDateMatch[2], 10);
        const day = parseInt(chineseDateMatch[3], 10);
        return new Date(year, month - 1, day);
      }
      
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  };
  
  // 格式化日期显示
  const formatDate = (date) => {
    if (!date) return '无效日期';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // 分析数据行
  console.log('\n📊 数据分析:');
  console.log('=' .repeat(120));
  
  const rows = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell)) continue; // 跳过空行
    
    const implementer = row[implementerCol] ? String(row[implementerCol]).trim() : '';
    const hospital = row[hospitalCol] ? String(row[hospitalCol]).trim() : '';
    const dateValue = row[dateCol];
    const doctor = doctorCol >= 0 && row[doctorCol] ? String(row[doctorCol]).trim() : '';
    const date = parseDate(dateValue);
    
    rows.push({
      rowNumber: i + 1,
      implementer,
      hospital,
      doctor,
      dateValue,
      date,
      dateStr: formatDate(date)
    });
  }
  
  console.log(`总共 ${rows.length} 行数据\n`);
  
  // 显示前10行
  console.log('前10行数据:');
  rows.slice(0, 10).forEach(r => {
    console.log(`  行${r.rowNumber}: [${r.implementer}] 访问 [${r.hospital}] - ${r.dateStr} ${r.doctor ? `(医生: ${r.doctor})` : ''}`);
  });
  
  // 特别分析第3行和第7行
  console.log('\n🎯 重点分析第3行和第7行:');
  console.log('=' .repeat(120));
  
  const row3 = rows.find(r => r.rowNumber === 3);
  const row7 = rows.find(r => r.rowNumber === 7);
  
  if (row3) {
    console.log(`\n📍 第3行:`);
    console.log(`  实施人: "${row3.implementer}"`);
    console.log(`  医院: "${row3.hospital}"`);
    console.log(`  日期原始值: ${row3.dateValue}`);
    console.log(`  日期解析结果: ${row3.dateStr}`);
    console.log(`  医生: "${row3.doctor}"`);
  } else {
    console.log('\n⚠️ 第3行不存在或为空行');
  }
  
  if (row7) {
    console.log(`\n📍 第7行:`);
    console.log(`  实施人: "${row7.implementer}"`);
    console.log(`  医院: "${row7.hospital}"`);
    console.log(`  日期原始值: ${row7.dateValue}`);
    console.log(`  日期解析结果: ${row7.dateStr}`);
    console.log(`  医生: "${row7.doctor}"`);
  } else {
    console.log('\n⚠️ 第7行不存在或为空行');
  }
  
  // 比较第3行和第7行
  if (row3 && row7) {
    console.log('\n🔍 对比分析:');
    console.log('=' .repeat(120));
    
    const sameImplementer = row3.implementer === row7.implementer;
    const sameHospital = row3.hospital === row7.hospital;
    const sameDate = row3.dateStr === row7.dateStr;
    
    console.log(`  实施人是否相同: ${sameImplementer ? '✓ 是' : '✗ 否'}`);
    if (!sameImplementer) {
      console.log(`    第3行: "${row3.implementer}"`);
      console.log(`    第7行: "${row7.implementer}"`);
    }
    
    console.log(`  医院是否相同: ${sameHospital ? '✓ 是' : '✗ 否'}`);
    if (!sameHospital) {
      console.log(`    第3行: "${row3.hospital}"`);
      console.log(`    第7行: "${row7.hospital}"`);
    }
    
    console.log(`  日期是否相同: ${sameDate ? '✓ 是' : '✗ 否'}`);
    if (sameDate) {
      console.log(`    日期: ${row3.dateStr}`);
    } else {
      console.log(`    第3行: ${row3.dateStr}`);
      console.log(`    第7行: ${row7.dateStr}`);
    }
    
    if (row3.date && row7.date) {
      const daysDiff = Math.floor(
        Math.abs(row7.date.getTime() - row3.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  日期间隔: ${daysDiff} 天`);
    }
    
    console.log('\n💡 检测结果说明:');
    console.log('=' .repeat(120));
    
    if (!sameImplementer) {
      console.log('⚠️ 实施人不同，根据当前规则，系统不会报错');
      console.log('   当前规则: 只有【同一实施人】在2日内重复访问【同一医院】才会报错');
      console.log('\n❓ 如果您希望检测"不同实施人在同一天访问同一医院"，需要修改验证规则');
    } else if (!sameHospital) {
      console.log('✓ 医院不同，系统正确地没有报错');
    } else if (sameDate || (row3.date && row7.date && Math.abs(row7.date.getTime() - row3.date.getTime()) < 2 * 24 * 60 * 60 * 1000)) {
      console.log('❌ 这是一个BUG！');
      console.log('   同一实施人在2日内重复访问同一医院，应该被检测出来但没有');
      console.log('\n🔧 可能的原因:');
      console.log('   1. 日期解析失败');
      console.log('   2. 医院名称有细微差异（空格、标点等）');
      console.log('   3. 字段映射错误');
    }
  }
  
  // 按实施人+医院分组，查找所有潜在重复
  console.log('\n\n🔍 完整重复检测分析:');
  console.log('=' .repeat(120));
  
  const groupMap = new Map();
  
  rows.forEach(row => {
    if (!row.implementer || !row.hospital || !row.date) return;
    
    const key = `${row.implementer}|${row.hospital}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(row);
  });
  
  let duplicateCount = 0;
  groupMap.forEach((visits, key) => {
    if (visits.length > 1) {
      const [implementer, hospital] = key.split('|');
      
      // 按日期排序
      visits.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // 检查日期间隔
      for (let i = 1; i < visits.length; i++) {
        const daysDiff = Math.floor(
          (visits[i].date.getTime() - visits[i-1].date.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff < 2) {
          duplicateCount++;
          console.log(`\n❌ 发现重复 #${duplicateCount}:`);
          console.log(`   实施人: ${implementer}`);
          console.log(`   医院: ${hospital}`);
          console.log(`   第${visits[i-1].rowNumber}行: ${visits[i-1].dateStr}`);
          console.log(`   第${visits[i].rowNumber}行: ${visits[i].dateStr}`);
          console.log(`   间隔: ${daysDiff}天 (规则要求≥2天)`);
        }
      }
    }
  });
  
  if (duplicateCount === 0) {
    console.log('\n✓ 未发现符合当前规则的重复拜访');
    console.log('  （同一实施人在2日内重复访问同一医院）');
  } else {
    console.log(`\n📊 总共发现 ${duplicateCount} 处重复`);
  }
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  console.error(error.stack);
}
