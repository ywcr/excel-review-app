#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '../public/data/工作簿2.xlsx');
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

// 找表头
let headerRowIndex = 2; // 根据之前的分析，表头在第3行（索引2）
const headers = data[headerRowIndex];
const dataRows = data.slice(headerRowIndex + 1);

// 找列索引
const implementerIndex = 2; // 实施人
const visitTimeIndex = 6;   // 拜访开始时间

console.log('=== 所有实施人列表 ===');
const implementers = new Set();
const implementerCounts = {};

dataRows.forEach((row, index) => {
  const implementer = row[implementerIndex];
  if (implementer && implementer.toString().trim()) {
    const name = implementer.toString().trim();
    implementers.add(name);
    implementerCounts[name] = (implementerCounts[name] || 0) + 1;
  }
});

console.log('找到的实施人:', Array.from(implementers).sort());
console.log('\n每个实施人的记录数:');
Object.entries(implementerCounts).sort().forEach(([name, count]) => {
  console.log(`  ${name}: ${count} 条记录`);
});

console.log('\n=== 日期格式示例 ===');
const dateFormats = new Set();
const dateExamples = [];

dataRows.slice(0, 20).forEach((row, index) => {
  const visitTime = row[visitTimeIndex];
  if (visitTime) {
    const format = visitTime.toString();
    dateFormats.add(format);
    if (dateExamples.length < 10) {
      dateExamples.push({
        row: headerRowIndex + index + 2,
        implementer: row[implementerIndex],
        time: format
      });
    }
  }
});

console.log('前10条记录的日期格式:');
dateExamples.forEach(example => {
  console.log(`  行${example.row}: ${example.implementer} - ${example.time}`);
});

// 特别查找包含"秦"的记录
console.log('\n=== 查找包含"秦"的记录 ===');
let qinCount = 0;
dataRows.forEach((row, index) => {
  const implementer = row[implementerIndex];
  if (implementer && implementer.toString().includes('秦')) {
    qinCount++;
    const visitTime = row[visitTimeIndex];
    console.log(`行${headerRowIndex + index + 2}: ${implementer} - ${visitTime}`);
  }
});
console.log(`总共找到 ${qinCount} 条包含"秦"的记录`);

// 分析日期解析
console.log('\n=== 日期解析测试 ===');
const testDates = Array.from(dateFormats).slice(0, 5);
testDates.forEach(dateStr => {
  console.log(`原始: "${dateStr}"`);
  
  // 尝试各种解析方法
  let parsed = null;
  
  // 方法1: 点分隔
  if (dateStr.includes('.')) {
    const match = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (match) {
      parsed = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  
  // 方法2: 横线分隔  
  if (!parsed && dateStr.includes('-')) {
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      parsed = match[0];
    }
  }
  
  // 方法3: 中文日期
  if (!parsed && dateStr.includes('年')) {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      parsed = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  
  console.log(`  解析结果: ${parsed || '解析失败'}`);
});