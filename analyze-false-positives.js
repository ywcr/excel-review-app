const fs = require('fs');
const path = require('path');

// 读取测试报告
const reportPath = 'D:/yaowei/excel-review-app/temp/extracted-images/analysis-report.json';

if (!fs.existsSync(reportPath)) {
  console.log('找不到分析报告，请先运行 test-watermark-images.js');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

console.log('=== 假阳性分析 ===\n');
console.log('总图片数:', data.summary.totalImages);

// 真水印
const trueWatermarked = new Set(['image196.jpeg', 'image197.jpeg', 'image198.png']);

// 假阳性：被检测为有水印但实际没有
const falsePositives = data.results.filter(r => 
  r.hasWatermark && !trueWatermarked.has(r.filename)
);

console.log('假阳性数量:', falsePositives.length);
console.log('\n=== 假阳性特征分析 ===\n');

// 统计特征分布
const stats = {
  highGridness: 0,
  highTextlikeness: 0,
  highBaseline: 0,
  lowConcentration: 0,
  roiIsGrid: 0
};

falsePositives.forEach(fp => {
  if (parseFloat(fp.gridness.score) > 60) stats.highGridness++;
  if (parseFloat(fp.single.textlikeness) > 70) stats.highTextlikeness++;
  if (parseFloat(fp.baseline) > 30) stats.highBaseline++;
  if (parseFloat(fp.concentration.ratio) < 1.0) stats.lowConcentration++;
  if (fp.roiGridness.isGrid) stats.roiIsGrid++;
});

console.log('特征统计:');
console.log('  高Gridness (>60):', stats.highGridness, `(${(stats.highGridness/falsePositives.length*100).toFixed(1)}%)`);
console.log('  高Textlikeness (>70):', stats.highTextlikeness, `(${(stats.highTextlikeness/falsePositives.length*100).toFixed(1)}%)`);
console.log('  高Baseline (>30):', stats.highBaseline, `(${(stats.highBaseline/falsePositives.length*100).toFixed(1)}%)`);
console.log('  低Concentration (<1.0):', stats.lowConcentration, `(${(stats.lowConcentration/falsePositives.length*100).toFixed(1)}%)`);
console.log('  ROI是Grid:', stats.roiIsGrid, `(${(stats.roiIsGrid/falsePositives.length*100).toFixed(1)}%)`);

console.log('\n=== 前10个假阳性详情 ===\n');

falsePositives.slice(0, 10).forEach((fp, idx) => {
  console.log(`${idx + 1}. ${fp.filename} (${fp.size})`);
  console.log(`   置信度: ${fp.confidence}`);
  console.log(`   Single: TL=${fp.single.textlikeness.toFixed(1)}, OC=${fp.single.overlayConsistency?.toFixed(1) || 'N/A'}, score=${fp.single.score}`);
  console.log(`   Baseline: ${fp.baseline}`);
  console.log(`   Gridness: ${fp.gridness.score}, isGrid=${fp.gridness.isGrid}`);
  console.log(`   Concentration: ${fp.concentration.ratio}`);
  console.log(`   ROI Gridness: ${fp.roiGridness.score}, isGrid=${fp.roiGridness.isGrid}`);
  if (fp.phase5) {
    console.log(`   Phase5: lineCov=${fp.phase5.roiLineCoverage}, delta=${fp.phase5.deltaSingle}`);
  }
  console.log('');
});

console.log('=== 建议 ===');
console.log('从特征分布来看，假阳性主要原因可能是：');
if (stats.highGridness > falsePositives.length * 0.5) {
  console.log('- 大量图片有高Gridness特征（可能是表格结构或规则排列的元素）');
}
if (stats.highTextlikeness > falsePositives.length * 0.5) {
  console.log('- 大量图片有高Textlikeness（可能包含文字或类文字边缘）');
}
if (stats.lowConcentration > falsePositives.length * 0.7) {
  console.log('- 多数图片Concentration低（文本分散，不集中）');
}
