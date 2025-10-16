const fs = require('fs');

// 解析测试输出，提取假阳性的 Phase 3 指标分布
const output = fs.readFileSync('D:/yaowei/excel-review-app/test-output.txt', 'utf8');

const lines = output.split('\n');
const falsePositives = [];

// 查找假阳性部分
let inFPSection = false;
let currentFP = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('假阳性列表')) {
    inFPSection = true;
    continue;
  }
  
  if (inFPSection) {
    // 匹配文件名行 "1. image102.jpeg"
    const fileMatch = line.match(/^\d+\.\s+(image\d+\.(jpeg|png))/);
    if (fileMatch) {
      if (currentFP) {
        falsePositives.push(currentFP);
      }
      currentFP = { file: fileMatch[1] };
      continue;
    }
    
    // 匹配指标行
    if (currentFP) {
      // 置信度等
      const confMatch = line.match(/置信度:\s+([\d.]+),\s+Single:\s+([\d.]+),\s+Baseline:\s+([\d.]+)/);
      if (confMatch) {
        currentFP.confidence = parseFloat(confMatch[1]);
        currentFP.singleScore = parseFloat(confMatch[2]);
        currentFP.baseline = parseFloat(confMatch[3]);
      }
      
      // Gridness
      const gridMatch = line.match(/Gridness:\s+([\d.]+),\s+isGrid:\s+(true|false),\s+suppression:\s+([\d.]+)/);
      if (gridMatch) {
        currentFP.gridness = parseFloat(gridMatch[1]);
        currentFP.isGrid = gridMatch[2] === 'true';
        currentFP.suppression = parseFloat(gridMatch[3]);
      }
      
      // Phase 3 metrics
      const phase3Match = line.match(/\[Phase3\]\s+Concentration:\s+([\d.]+),\s+ROI Gridness:\s+([\d.]+),\s+ROI isGrid:\s+(true|false)/);
      if (phase3Match) {
        currentFP.concentration = parseFloat(phase3Match[1]);
        currentFP.roiGridness = parseFloat(phase3Match[2]);
        currentFP.roiIsGrid = phase3Match[3] === 'true';
      }
    }
    
    // 结束假阳性部分
    if (line.includes('建议:')) {
      if (currentFP) {
        falsePositives.push(currentFP);
      }
      break;
    }
  }
}

// 过滤完整数据
const completeFPs = falsePositives.filter(fp => 
  fp.concentration !== undefined && 
  fp.roiGridness !== undefined
);

console.log(`\n=== 📊 Phase 3 假阳性分析报告 ===\n`);
console.log(`总假阳性数: ${completeFPs.length}`);

// 1. Gridness 分析
const globalGridTrue = completeFPs.filter(fp => fp.isGrid);
const roiGridTrue = completeFPs.filter(fp => fp.roiIsGrid);
const globalTrueRoiFalse = completeFPs.filter(fp => fp.isGrid && !fp.roiIsGrid);

console.log(`\n【Gridness 对比】`);
console.log(`全局 isGrid=true: ${globalGridTrue.length}/${completeFPs.length} (${(globalGridTrue.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`ROI isGrid=true: ${roiGridTrue.length}/${completeFPs.length} (${(roiGridTrue.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`全局Grid=true 但 ROI Grid=false: ${globalTrueRoiFalse.length}/${completeFPs.length} (${(globalTrueRoiFalse.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`  -> 这些是可以通过 ROI gridness 过滤的理想目标`);

// 2. Concentration 分析
const concentrations = completeFPs.map(fp => fp.concentration);
const avgConc = concentrations.reduce((a,b) => a+b, 0) / concentrations.length;
const maxConc = Math.max(...concentrations);
const minConc = Math.min(...concentrations);

console.log(`\n【Concentration Ratio 分布】`);
console.log(`平均值: ${avgConc.toFixed(2)}`);
console.log(`最大值: ${maxConc.toFixed(2)}`);
console.log(`最小值: ${minConc.toFixed(2)}`);

const concRanges = [
  { name: '0.0-0.2', min: 0, max: 0.2 },
  { name: '0.2-0.5', min: 0.2, max: 0.5 },
  { name: '0.5-1.0', min: 0.5, max: 1.0 },
  { name: '1.0-2.0', min: 1.0, max: 2.0 },
  { name: '>2.0', min: 2.0, max: Infinity }
];

console.log(`\n分布区间:`);
concRanges.forEach(range => {
  const count = completeFPs.filter(fp => fp.concentration >= range.min && fp.concentration < range.max).length;
  console.log(`  ${range.name}: ${count} (${(count/completeFPs.length*100).toFixed(1)}%)`);
});

// 3. ROI Gridness 分析
const roiGridScores = completeFPs.map(fp => fp.roiGridness);
const avgROIGrid = roiGridScores.reduce((a,b) => a+b, 0) / roiGridScores.length;

console.log(`\n【ROI Gridness Score 分布】`);
console.log(`平均值: ${avgROIGrid.toFixed(2)}`);

const roiRanges = [
  { name: '0.0', exact: 0 },
  { name: '0-30', min: 0.01, max: 30 },
  { name: '30-50', min: 30, max: 50 },
  { name: '50-70', min: 50, max: 70 },
  { name: '70+', min: 70, max: Infinity }
];

console.log(`\n分布区间:`);
roiRanges.forEach(range => {
  let count;
  if (range.exact !== undefined) {
    count = completeFPs.filter(fp => fp.roiGridness === range.exact).length;
  } else {
    count = completeFPs.filter(fp => fp.roiGridness >= range.min && fp.roiGridness < range.max).length;
  }
  console.log(`  ${range.name}: ${count} (${(count/completeFPs.length*100).toFixed(1)}%)`);
});

// 4. 关键发现
console.log(`\n【关键发现】`);

// ROI gridness 为 0 的假阳性
const roiGrid0 = completeFPs.filter(fp => fp.roiGridness === 0);
console.log(`\n1. ROI Gridness = 0 (未检测到文本组件):`);
console.log(`   数量: ${roiGrid0.length}/${completeFPs.length} (${(roiGrid0.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`   这些可能是真正的无水印图像，没有集中的文本区域`);

// 全局 gridness 高但 ROI gridness 低
const globalHighROILow = completeFPs.filter(fp => fp.isGrid && fp.roiGridness < 50);
console.log(`\n2. 全局Grid=true 且 ROI Gridness < 50:`);
console.log(`   数量: ${globalHighROILow.length}/${completeFPs.length} (${(globalHighROILow.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`   建议: 提高这些样本的 suppression factor，从而降低最终置信度`);

// Concentration 很低的样本
const lowConc = completeFPs.filter(fp => fp.concentration < 0.3);
console.log(`\n3. Concentration < 0.3 (文本非常分散):`);
console.log(`   数量: ${lowConc.length}/${completeFPs.length} (${(lowConc.length/completeFPs.length*100).toFixed(1)}%)`);
console.log(`   这些图像的文本并不集中在ROI区域，可能不是典型水印`);

// 导出 CSV
const csvHeader = 'File,Confidence,SingleScore,Baseline,Gridness,IsGrid,Suppression,Concentration,ROIGridness,ROIIsGrid\n';
const csvRows = completeFPs.map(fp => {
  return [
    fp.file,
    fp.confidence.toFixed(2),
    fp.singleScore.toFixed(2),
    fp.baseline.toFixed(2),
    fp.gridness.toFixed(2),
    fp.isGrid,
    fp.suppression.toFixed(2),
    fp.concentration.toFixed(2),
    fp.roiGridness.toFixed(2),
    fp.roiIsGrid
  ].join(',');
}).join('\n');

const csvContent = csvHeader + csvRows;
fs.writeFileSync('D:/yaowei/excel-review-app/phase3-fp-analysis.csv', csvContent, 'utf8');
console.log(`\n✅ CSV 已导出: phase3-fp-analysis.csv`);

// 输出一些典型样本
console.log(`\n【典型样本示例】`);
console.log(`\n全局Grid=true 但 ROI Grid=false 的样本 (前5个):`);
globalTrueRoiFalse.slice(0, 5).forEach(fp => {
  console.log(`  ${fp.file}: Conf=${fp.confidence.toFixed(2)}, GlobalGrid=${fp.gridness.toFixed(2)}, ROIGrid=${fp.roiGridness.toFixed(2)}, Conc=${fp.concentration.toFixed(2)}`);
});

console.log(`\nROI Gridness = 0 的样本 (前5个):`);
roiGrid0.slice(0, 5).forEach(fp => {
  console.log(`  ${fp.file}: Conf=${fp.confidence.toFixed(2)}, GlobalGrid=${fp.gridness.toFixed(2)}, Conc=${fp.concentration.toFixed(2)}`);
});

console.log(`\n高 Concentration 的样本 (前5个):`);
const highConcSamples = completeFPs.filter(fp => fp.concentration > 1.0).slice(0, 5);
highConcSamples.forEach(fp => {
  console.log(`  ${fp.file}: Conf=${fp.confidence.toFixed(2)}, GlobalGrid=${fp.gridness.toFixed(2)}, ROIGrid=${fp.roiGridness.toFixed(2)}, Conc=${fp.concentration.toFixed(2)}`);
});
