#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '../public/data/工作簿2.xlsx');
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

const headerRowIndex = 2;
const headers = data[headerRowIndex];
const dataRows = data.slice(headerRowIndex + 1);

const implementerIndex = 2;
const visitTimeIndex = 6;

// 统计每个人每天的拜访次数
const visitStats = {};

dataRows.forEach((row, index) => {
  const implementer = row[implementerIndex];
  const visitTime = row[visitTimeIndex];
  
  if (implementer && visitTime) {
    const key = `${implementer}_${visitTime}`;
    if (!visitStats[key]) {
      visitStats[key] = {
        implementer: implementer.toString().trim(),
        date: visitTime.toString().trim(),
        count: 0,
        rows: []
      };
    }
    visitStats[key].count++;
    visitStats[key].rows.push(headerRowIndex + index + 2);
  }
});

// 分析结果
console.log('=== 每日拜访统计 ===\n');

// 找出超过5次的记录
const violations = [];
Object.values(visitStats).forEach(stat => {
  if (stat.count > 5) {
    violations.push(stat);
  }
});

console.log(`发现 ${violations.length} 个违规记录（单日拜访超过5次）：\n`);

violations.sort((a, b) => {
  if (a.implementer !== b.implementer) {
    return a.implementer.localeCompare(b.implementer);
  }
  return a.date.localeCompare(b.date);
}).forEach(stat => {
  console.log(`⚠️ ${stat.implementer} 在 ${stat.date} 有 ${stat.count} 次拜访`);
  console.log(`   行号: ${stat.rows.join(', ')}`);
  console.log();
});

// 详细分析秦凯的数据
console.log('=== 秦凯的详细拜访统计 ===\n');

const qinkaiStats = Object.values(visitStats)
  .filter(stat => stat.implementer.includes('秦凯'))
  .sort((a, b) => {
    // 将日期转换为可排序的格式
    const dateA = a.date.split('/').map(n => n.padStart(2, '0')).join('');
    const dateB = b.date.split('/').map(n => n.padStart(2, '0')).join('');
    return dateA.localeCompare(dateB);
  });

qinkaiStats.forEach(stat => {
  const marker = stat.count > 5 ? '⚠️' : '✅';
  console.log(`${marker} ${stat.date}: ${stat.count} 次拜访`);
});

// 验证规则分析
console.log('\n=== 验证规则需求 ===');
console.log('频率验证规则应该：');
console.log('1. 解析日期格式 "月/日/年" (如 9/1/25)');
console.log('2. 按实施人和日期分组统计');
console.log('3. 检查每组是否超过5次');
console.log('4. 对于秦凯在9/1/25的6次拜访应该报错');

// 检查日期格式转换
console.log('\n=== 日期格式转换测试 ===');
const testDates = ['9/1/25', '9/10/25', '12/31/25'];
testDates.forEach(date => {
  const parts = date.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const formatted = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    console.log(`${date} => ${formatted}`);
  }
});