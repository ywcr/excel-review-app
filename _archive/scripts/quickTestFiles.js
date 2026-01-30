#!/usr/bin/env node

/**
 * 快速测试李燕和于源的Excel文件
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

console.log('🧪 快速测试Excel文件...\n');

const testFiles = [
  'public/data/李燕拜访.xlsx',
  'public/data/于源拜访.xlsx',
  'public/data/秦凯拜访.xlsx'
];

testFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ 文件不存在: ${filePath}`);
    return;
  }
  
  const stats = fs.statSync(fullPath);
  const sizeMB = stats.size / 1024 / 1024;
  
  console.log(`\n📄 测试文件: ${path.basename(filePath)}`);
  console.log(`   文件大小: ${sizeMB.toFixed(2)} MB`);
  
  try {
    const fileBuffer = fs.readFileSync(fullPath);
    
    // 1. 只读工作表名
    const wb1 = XLSX.read(fileBuffer, {
      type: 'buffer',
      bookSheets: true
    });
    console.log(`   ✅ 工作表: ${wb1.SheetNames.join(', ')}`);
    
    // 2. 完整读取 - 不要设置bookSheets为false
    const wb2 = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
      dense: false,
      sheetStubs: false,
      // 不要设置 bookSheets: false，否则不会加载工作表内容
    });
    
    // 检查Sheet1
    console.log(`   工作表对象: ${wb2.Sheets ? '存在' : '不存在'}`);
    if (wb2.Sheets) {
      console.log(`   工作表列表: ${Object.keys(wb2.Sheets).join(', ')}`);
    }
    
    const sheet1 = wb2.Sheets ? wb2.Sheets['Sheet1'] : null;
    if (sheet1) {
      console.log('   ✅ Sheet1 存在');
      const range = sheet1['!ref'];
      if (range) {
        const decoded = XLSX.utils.decode_range(range);
        console.log(`   数据范围: ${range}`);
        console.log(`   行数: ${decoded.e.r + 1}, 列数: ${decoded.e.c + 1}`);
      }
      
      // 尝试转换数据
      try {
        const data = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
        console.log(`   ✅ 转换成功，数据行数: ${data.length}`);
        
        // 显示前几行
        if (data.length > 0) {
          console.log('   前3行数据:');
          data.slice(0, 3).forEach((row, i) => {
            console.log(`     行${i + 1}: ${row.slice(0, 5).join(' | ')}...`);
          });
        }
      } catch (err) {
        console.log(`   ❌ 转换失败: ${err.message}`);
      }
    } else {
      console.log('   ❌ Sheet1 不存在');
    }
    
  } catch (error) {
    console.log(`   ❌ 读取失败: ${error.message}`);
  }
});

console.log('\n✅ 测试完成');