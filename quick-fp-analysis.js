const fs = require('fs');
const path = require('path');

// 读取测试结果
const results = fs.readFileSync('watermark-test-results-new.txt', 'utf-16le');

// 提取统计信息
const lines = results.split('\n');

let fpCount = 0;
let tpCount = 0;
let totalImages = 0;

// 真水印列表
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

// 提取检测为有水印的图片
const detected = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/(image\d+\.(jpeg|jpg|png))/);
  if (match) {
    detected.push(match[1]);
  }
}

// 统计
detected.forEach(img => {
  if (trueWatermarks.includes(img)) {
    tpCount++;
  } else {
    fpCount++;
  }
});

console.log('=== 当前检测结果 ===');
console.log('检测为有水印的图片数:', detected.length);
console.log('真阳性 (TP):', tpCount, '/', trueWatermarks.length);
console.log('假阳性 (FP):', fpCount);
console.log('召回率:', (tpCount / trueWatermarks.length * 100).toFixed(1) + '%');
console.log('精确度:', (tpCount / detected.length * 100).toFixed(1) + '%');

console.log('\n=== 前20个假阳性示例 ===');
let fpShown = 0;
detected.forEach(img => {
  if (!trueWatermarks.includes(img) && fpShown < 20) {
    console.log(img);
    fpShown++;
  }
});
