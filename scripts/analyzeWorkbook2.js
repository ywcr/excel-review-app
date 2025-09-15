#!/usr/bin/env node

/**
 * 分析工作簿2.xlsx文件，检查验证规则是否正确执行
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '../public/data/工作簿2.xlsx');

console.log('📊 分析工作簿2.xlsx...\n');

// 读取文件
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('工作表:', workbook.SheetNames);
console.log('文件大小:', (buffer.length / 1024 / 1024).toFixed(2), 'MB\n');

// 读取Sheet1
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

console.log('总行数:', data.length);

// 查找表头行
let headerRowIndex = -1;
let headers = [];

for (let i = 0; i < Math.min(10, data.length); i++) {
  const row = data[i];
  if (row && row.some(cell => cell && cell.toString().includes('实施'))) {
    headerRowIndex = i;
    headers = row;
    break;
  }
}

console.log('表头在第', headerRowIndex + 1, '行');
console.log('表头内容:', headers.slice(0, 10).map(h => h ? h.toString().replace(/\n/g, '') : ''));

// 找到实施人和拜访时间的列索引
const implementerIndex = headers.findIndex(h => h && h.toString().includes('实施'));
const visitTimeIndex = headers.findIndex(h => h && h.toString().includes('拜访') && h.toString().includes('时间'));

console.log('\n实施人列索引:', implementerIndex);
console.log('拜访时间列索引:', visitTimeIndex);

// 分析数据行
const dataRows = data.slice(headerRowIndex + 1);
console.log('\n数据行数:', dataRows.length);

// 统计每个实施人每天的拜访次数
const visitStats = {};

dataRows.forEach((row, index) => {
  if (!row || row.every(cell => !cell)) return; // 跳过空行
  
  const implementer = row[implementerIndex];
  const visitTime = row[visitTimeIndex];
  
  if (implementer && visitTime) {
    // 提取日期部分
    let date = '';
    const timeStr = visitTime.toString();
    
    // 尝试不同的日期格式
    if (timeStr.includes('.')) {
      // 格式: 2025.8.1
      const match = timeStr.match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
      if (match) date = match[1];
    } else if (timeStr.includes('-')) {
      // 格式: 2025-08-01
      const match = timeStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) date = match[1];
    }
    
    if (date) {
      const key = `${implementer}_${date}`;
      if (!visitStats[key]) {
        visitStats[key] = {
          implementer,
          date,
          count: 0,
          rows: []
        };
      }
      visitStats[key].count++;
      visitStats[key].rows.push(headerRowIndex + index + 2); // 实际Excel行号
    }
  }
});

console.log('\n=== 拜访统计 ===');

// 找出超过5次的记录
const violations = [];

Object.entries(visitStats).forEach(([key, stat]) => {
  if (stat.count > 5) {
    violations.push(stat);
    console.log(`\n⚠️ 违规: ${stat.implementer} 在 ${stat.date} 有 ${stat.count} 次拜访`);
    console.log('   涉及行号:', stat.rows.join(', '));
  }
});

// 特别检查秦凯的数据
console.log('\n=== 秦凯的拜访记录 ===');
const qinkaiVisits = Object.entries(visitStats)
  .filter(([key, stat]) => stat.implementer && stat.implementer.includes('秦凯'))
  .sort(([a], [b]) => a.localeCompare(b));

qinkaiVisits.forEach(([key, stat]) => {
  console.log(`${stat.date}: ${stat.count} 次拜访 (行号: ${stat.rows.join(', ')})`);
});

// 检查图片列
console.log('\n=== 图片分析 ===');
const imageColumns = headers
  .map((h, i) => ({ header: h ? h.toString() : '', index: i }))
  .filter(({ header }) => header.includes('门头') || header.includes('内部'));

console.log('图片列:', imageColumns.map(c => `${c.header} (列${c.index + 1})`));

// 统计图片数量
let totalImages = 0;
const imageStats = {};

dataRows.forEach((row, rowIndex) => {
  imageColumns.forEach(({ index, header }) => {
    const cell = row[index];
    if (cell && cell.toString().trim()) {
      totalImages++;
      const rowNum = headerRowIndex + rowIndex + 2;
      if (!imageStats[rowNum]) imageStats[rowNum] = [];
      imageStats[rowNum].push(header);
    }
  });
});

console.log('总图片数:', totalImages);
console.log('有图片的行数:', Object.keys(imageStats).length);

// 输出验证规则信息
console.log('\n=== 验证规则检查 ===');
console.log('1. 频率验证规则 (frequency):');
console.log('   - 字段: 实施人 (implementer)');
console.log('   - 最大次数: 5');
console.log('   - 时间字段: 拜访开始时间');
console.log('   - 期望结果: 应该检测出秦凯的6次拜访违规');
console.log('   - 实际违规数:', violations.length);

if (violations.length === 0) {
  console.log('\n❌ 问题: 频率验证规则没有正常工作！');
  console.log('可能的原因:');
  console.log('1. 日期格式解析问题');
  console.log('2. 字段映射问题');
  console.log('3. 验证规则未正确执行');
}