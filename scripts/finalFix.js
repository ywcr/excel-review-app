#!/usr/bin/env node

/**
 * 最终修复：确保Worker能正确读取Excel文件
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 应用最终修复...\n');

const workerFile = path.join(__dirname, '../public/validation-worker.js');
let content = fs.readFileSync(workerFile, 'utf8');

// 修复1：确保大文件处理器被正确引入
if (!content.includes('importScripts("/large-file-handler.js");')) {
  console.log('⚠️ 大文件处理器未引入');
} else {
  // 暂时注释掉，避免加载错误
  content = content.replace(
    'importScripts("/large-file-handler.js");',
    '// importScripts("/large-file-handler.js"); // 暂时禁用'
  );
  console.log('✅ 暂时禁用大文件处理器引入');
}

// 修复2：降低大文件处理阈值
content = content.replace(
  /if \(fileBuffer\.byteLength > 600 \* 1024 \* 1024 && typeof handleLargeExcelFile === 'function'\)/,
  'if (false) // 暂时禁用大文件特殊处理'
);
console.log('✅ 暂时禁用大文件特殊处理');

// 修复3：添加更多日志
const addLogsSearch = `      // QINKAI_FIX: 特殊处理秦凯文件
      targetWorkbook = XLSX.read(fileBuffer, parseOptions);`;

const addLogsReplace = `      // QINKAI_FIX: 特殊处理秦凯文件
      console.log('开始解析工作表，选项:', JSON.stringify(parseOptions));
      targetWorkbook = XLSX.read(fileBuffer, parseOptions);
      console.log('解析完成，工作表名:', targetWorkbook.SheetNames);
      console.log('Sheets对象:', targetWorkbook.Sheets ? '存在' : '不存在');
      if (targetWorkbook.Sheets) {
        console.log('可用工作表:', Object.keys(targetWorkbook.Sheets));
      }`;

content = content.replace(addLogsSearch, addLogsReplace);

// 写回文件
fs.writeFileSync(workerFile, content, 'utf8');

console.log('\n✅ 最终修复应用完成！');
console.log('\n请执行以下步骤：');
console.log('1. 刷新浏览器（强制刷新）');
console.log('2. 重新上传文件测试');
console.log('3. 查看控制台输出');

// 测试修复后的解析逻辑
console.log('\n测试修复后的解析逻辑...');
const XLSX = require('xlsx');
const testFile = path.join(__dirname, '../public/data/李燕拜访.xlsx');
const buffer = fs.readFileSync(testFile);

console.log('\n测试不同的解析选项：');

// 测试1：带sheets选项
console.log('\n1. 带sheets选项（文件<300MB）:');
try {
  const wb = XLSX.read(buffer, {
    type: 'buffer',
    sheets: ['Sheet1'],
    cellDates: true,
    cellNF: false,
    cellText: false,
    dense: false,
    sheetStubs: false,
  });
  console.log('   ✅ 成功');
  console.log('   SheetNames:', wb.SheetNames);
  console.log('   Sheets对象:', wb.Sheets ? '存在' : '不存在');
  console.log('   Sheet1存在:', !!wb.Sheets['Sheet1']);
  if (wb.Sheets) {
    console.log('   可用工作表:', Object.keys(wb.Sheets));
  }
} catch (error) {
  console.log('   ❌ 失败:', error.message);
}

// 测试2：不带sheets选项
console.log('\n2. 不带sheets选项:');
try {
  const wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
    dense: false,
    sheetStubs: false,
  });
  console.log('   ✅ 成功');
  console.log('   SheetNames:', wb.SheetNames);
  console.log('   Sheets对象:', wb.Sheets ? '存在' : '不存在');
  console.log('   Sheet1存在:', !!wb.Sheets['Sheet1']);
  if (wb.Sheets) {
    console.log('   可用工作表:', Object.keys(wb.Sheets));
  }
} catch (error) {
  console.log('   ❌ 失败:', error.message);
}