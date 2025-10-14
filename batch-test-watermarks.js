const fs = require('fs');
const path = require('path');

// Read the existing analysis report to get detection results
const reportPath = 'D:/yaowei/excel-review-app/temp/extracted-images/analysis-report.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Expected watermarked images
const expectedWatermarked = new Set([
  'image196.jpeg',
  'image197.jpeg',
  'image198.png'
]);

console.log('=== 水印检测准确性分析 ===\n');
console.log(`总图片数: ${report.length}`);
console.log(`期望有水印: ${expectedWatermarked.size} 张`);
console.log(`期望无水印: ${report.length - expectedWatermarked.size} 张\n`);

let truePositives = 0;  // 正确检测为有水印
let falsePositives = 0; // 误检为有水印（实际无）
let trueNegatives = 0;  // 正确检测为无水印
let falseNegatives = 0; // 漏检（实际有但检测为无）

const falsePositivesList = [];
const falseNegativesList = [];

report.forEach(item => {
  const hasWatermark = item.watermark === true || item.watermark === 'yes' || 
                       item.hasWatermark === true || item.detectedWatermark === true;
  const shouldHaveWatermark = expectedWatermarked.has(item.name);
  
  if (hasWatermark && shouldHaveWatermark) {
    truePositives++;
  } else if (hasWatermark && !shouldHaveWatermark) {
    falsePositives++;
    falsePositivesList.push({
      name: item.name,
      confidence: item.watermarkConfidence || item.confidence || 'N/A',
      size: `${item.width}×${item.height}`
    });
  } else if (!hasWatermark && shouldHaveWatermark) {
    falseNegatives++;
    falseNegativesList.push({
      name: item.name,
      confidence: item.watermarkConfidence || item.confidence || 'N/A',
      size: `${item.width}×${item.height}`
    });
  } else {
    trueNegatives++;
  }
});

console.log('=== 检测结果统计 ===\n');
console.log(`✅ 真阳性 (正确检测有水印): ${truePositives}`);
console.log(`❌ 假阳性 (误报无水印图为有水印): ${falsePositives}`);
console.log(`✅ 真阴性 (正确检测无水印): ${trueNegatives}`);
console.log(`❌ 假阴性 (漏检有水印图): ${falseNegatives}\n`);

const precision = truePositives / (truePositives + falsePositives) || 0;
const recall = truePositives / (truePositives + falseNegatives) || 0;
const accuracy = (truePositives + trueNegatives) / report.length;
const f1 = 2 * (precision * recall) / (precision + recall) || 0;

console.log('=== 性能指标 ===\n');
console.log(`准确率 (Accuracy): ${(accuracy * 100).toFixed(2)}%`);
console.log(`精确率 (Precision): ${(precision * 100).toFixed(2)}%`);
console.log(`召回率 (Recall): ${(recall * 100).toFixed(2)}%`);
console.log(`F1分数: ${(f1 * 100).toFixed(2)}%\n`);

if (falsePositivesList.length > 0) {
  console.log('=== ❌ 假阳性列表 (误检为有水印的图片) ===\n');
  falsePositivesList.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name} - 尺寸: ${item.size}, 置信度: ${item.confidence}`);
  });
  console.log('');
}

if (falseNegativesList.length > 0) {
  console.log('=== ❌ 假阴性列表 (漏检的有水印图片) ===\n');
  falseNegativesList.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name} - 尺寸: ${item.size}, 置信度: ${item.confidence}`);
  });
  console.log('');
}

// 分析假阳性的特征
if (falsePositivesList.length > 0) {
  console.log('=== 🔍 需要调整检测器以减少假阳性 ===\n');
  console.log('建议调整方向:');
  console.log('1. 提高检测阈值 (fusion.decision)');
  console.log('2. 增强门控条件的严格程度');
  console.log('3. 如果启用了AI检测，考虑调整AI分数的权重或阈值');
  console.log('4. 检查是否需要添加更多惩罚项来过滤特定类型的误检\n');
  
  // 显示前5个误检的图片名称供手动检查
  console.log('建议手动检查这些误检图片的特征:');
  falsePositivesList.slice(0, 5).forEach(item => {
    console.log(`  - ${item.name}`);
  });
}
