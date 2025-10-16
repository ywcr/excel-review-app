const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log('=== 最新检测统计 ===\n');
console.log('总图片数:', json.summary.total);
console.log('真阳性 (TP):', json.summary.tp);
console.log('真阴性 (TN):', json.summary.tn);
console.log('假阳性 (FP):', json.summary.fp);
console.log('假阴性 (FN):', json.summary.fn);
console.log('\n准确率:', json.summary.accuracy + '%');
console.log('精确率:', json.summary.precision + '%');
console.log('召回率:', json.summary.recall + '%');
