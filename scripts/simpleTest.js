#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '../public/data/李燕拜访.xlsx');
console.log('测试文件:', filePath);

const buffer = fs.readFileSync(filePath);
console.log('文件大小:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');

// 测试1：最简单的读取
console.log('\n测试1: 最简单读取');
try {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  console.log('SheetNames:', wb.SheetNames);
  console.log('Sheets对象存在:', !!wb.Sheets);
  console.log('Sheets键:', Object.keys(wb.Sheets));
  
  if (wb.Sheets && wb.Sheets['Sheet1']) {
    const sheet = wb.Sheets['Sheet1'];
    console.log('Sheet1存在');
    console.log('Sheet1 ref:', sheet['!ref']);
  } else {
    console.log('Sheet1不存在');
  }
} catch (error) {
  console.error('错误:', error.message);
}

// 测试2：只读工作表名
console.log('\n测试2: 只读工作表名');
try {
  const wb = XLSX.read(buffer, { type: 'buffer', bookSheets: true });
  console.log('SheetNames:', wb.SheetNames);
  console.log('Sheets对象:', wb.Sheets);
} catch (error) {
  console.error('错误:', error.message);
}

// 测试3：使用array类型
console.log('\n测试3: 使用array类型');
try {
  const arrayBuffer = new Uint8Array(buffer).buffer;
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  console.log('SheetNames:', wb.SheetNames);
  console.log('Sheets存在:', !!wb.Sheets);
  console.log('Sheet1存在:', !!(wb.Sheets && wb.Sheets['Sheet1']));
} catch (error) {
  console.error('错误:', error.message);
}