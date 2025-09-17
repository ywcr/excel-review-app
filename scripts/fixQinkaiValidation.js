#!/usr/bin/env node

/**
 * 快速修复秦凯文件验证问题
 * 通过调整validation-worker.js中的内存和解析策略
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 应用秦凯文件验证修复...\n');

const workerFile = path.join(__dirname, '../public/validation-worker.js');

// 读取现有文件
let content = fs.readFileSync(workerFile, 'utf8');

// 检查是否已经应用过修复
if (content.includes('// QINKAI_FIX')) {
  console.log('✅ 修复已经应用过了');
  process.exit(0);
}

// 查找需要修改的位置
const searchPattern = `      const targetWorkbook = XLSX.read(fileBuffer, parseOptions);
      worksheet = targetWorkbook.Sheets[sheetName];`;

const replacePattern = `      // QINKAI_FIX: 特殊处理秦凯文件
      const targetWorkbook = XLSX.read(fileBuffer, parseOptions);
      worksheet = targetWorkbook.Sheets[sheetName];
      
      // 如果worksheet为undefined，尝试不同的方法
      if (!worksheet) {
        console.log('第一次尝试失败，使用备用方法...');
        
        // 方法1：尝试不带sheets选项重新读取
        const fallbackWorkbook = XLSX.read(fileBuffer, {
          type: "array",
          cellDates: true,
          cellNF: false,
          cellText: false,
          dense: false,
          sheetStubs: false,
        });
        
        if (fallbackWorkbook.Sheets && fallbackWorkbook.Sheets[sheetName]) {
          worksheet = fallbackWorkbook.Sheets[sheetName];
          console.log('备用方法成功');
        }
      }`;

// 应用修复
if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacePattern);
  console.log('✅ 找到目标代码，正在应用修复...');
} else {
  console.log('⚠️ 未找到完全匹配的代码，尝试部分匹配...');
  
  // 尝试找到相似的模式
  const partialSearch = 'const targetWorkbook = XLSX.read(fileBuffer, parseOptions);';
  const index = content.indexOf(partialSearch);
  
  if (index !== -1) {
    // 找到worksheet赋值的位置
    const worksheetAssignIndex = content.indexOf('worksheet = targetWorkbook.Sheets[sheetName];', index);
    
    if (worksheetAssignIndex !== -1) {
      // 在worksheet赋值后插入修复代码
      const insertPosition = worksheetAssignIndex + 'worksheet = targetWorkbook.Sheets[sheetName];'.length;
      const fixCode = `
      
      // QINKAI_FIX: 特殊处理秦凯文件
      if (!worksheet) {
        console.log('第一次尝试失败，使用备用方法...');
        
        // 方法1：尝试不带sheets选项重新读取
        const fallbackWorkbook = XLSX.read(fileBuffer, {
          type: "array",
          cellDates: true,
          cellNF: false,
          cellText: false,
          dense: false,
          sheetStubs: false,
        });
        
        if (fallbackWorkbook.Sheets && fallbackWorkbook.Sheets[sheetName]) {
          worksheet = fallbackWorkbook.Sheets[sheetName];
          console.log('备用方法成功');
        }
      }`;
      
      content = content.slice(0, insertPosition) + fixCode + content.slice(insertPosition);
      console.log('✅ 使用部分匹配方式应用了修复');
    }
  }
}

// 另一个重要修复：增加错误处理的详细信息
const errorSearch = 'throw new Error(\`无法加载工作表';
const errorIndex = content.indexOf(errorSearch);

if (errorIndex !== -1) {
  // 在错误前添加更多调试信息
  const debugCode = `
      // QINKAI_DEBUG: 添加调试信息
      if (!worksheet) {
        console.error('工作表加载失败的详细信息:');
        console.error('- 目标工作表名:', sheetName);
        console.error('- 文件大小:', (fileBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
        if (targetWorkbook && targetWorkbook.Sheets) {
          console.error('- 实际工作表列表:', Object.keys(targetWorkbook.Sheets));
        }
      }
      `;
  
  content = content.slice(0, errorIndex) + debugCode + content.slice(errorIndex);
  console.log('✅ 添加了调试信息');
}

// 写回文件
fs.writeFileSync(workerFile, content, 'utf8');

console.log('\n✅ 修复应用完成！');
console.log('\n建议的后续步骤：');
console.log('1. 重启开发服务器: npm run dev');
console.log('2. 清除浏览器缓存');
console.log('3. 重新尝试上传秦凯拜访.xlsx文件');
console.log('\n如果问题仍然存在，请查看浏览器控制台的调试信息');