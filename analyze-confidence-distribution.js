// 从测试结果中分析置信度分布

const watermarkedImages = {
  'image196.jpeg': 48.03,
  'image197.jpeg': 48.39,
  'image198.png': 52.73
};

// 从输出中提取的假阳性样本（前20个）
const falsePositiveSamples = [
  { name: 'image1.png', confidence: 57.37 },
  { name: 'image10.jpeg', confidence: 51.16 },
  { name: 'image100.jpeg', confidence: 52.18 },
  { name: 'image101.jpeg', confidence: 36.15 },
  { name: 'image102.jpeg', confidence: 39.19 },
  { name: 'image103.jpeg', confidence: 58.28 },
  { name: 'image104.jpeg', confidence: 48.25 },
  { name: 'image105.jpeg', confidence: 48.24 },
  { name: 'image106.jpeg', confidence: 56.14 },
  { name: 'image107.jpeg', confidence: 36.53 },
  { name: 'image108.jpeg', confidence: 56.79 },
  { name: 'image109.jpeg', confidence: 52.27 },
  { name: 'image11.jpeg', confidence: 42.85 },
  { name: 'image110.jpeg', confidence: 37.80 },
  { name: 'image111.jpeg', confidence: 49.05 },
  { name: 'image112.jpeg', confidence: 56.00 },
  { name: 'image113.jpeg', confidence: 55.90 },
  { name: 'image114.jpeg', confidence: 32.41 },
  { name: 'image115.jpeg', confidence: 36.50 },
  { name: 'image116.jpeg', confidence: 55.31 }
];

console.log('='.repeat(70));
console.log('📊 置信度分布分析');
console.log('='.repeat(70));

console.log('\n🎯 真水印图片置信度:');
Object.entries(watermarkedImages).forEach(([name, conf]) => {
  console.log(`  ${name}: ${conf}`);
});
const watermarkedMin = Math.min(...Object.values(watermarkedImages));
const watermarkedMax = Math.max(...Object.values(watermarkedImages));
console.log(`  范围: ${watermarkedMin.toFixed(2)} - ${watermarkedMax.toFixed(2)}`);

console.log('\n❌ 假阳性样本置信度（前20个）:');
const fpConfidences = falsePositiveSamples.map(fp => fp.confidence);
const fpMin = Math.min(...fpConfidences);
const fpMax = Math.max(...fpConfidences);
const fpAvg = fpConfidences.reduce((a, b) => a + b, 0) / fpConfidences.length;
console.log(`  最小: ${fpMin.toFixed(2)}`);
console.log(`  最大: ${fpMax.toFixed(2)}`);
console.log(`  平均: ${fpAvg.toFixed(2)}`);

// 分析不同阈值的效果
console.log('\n='.repeat(70));
console.log('🔍 不同阈值效果预测（基于样本）:');
console.log('='.repeat(70));

const thresholds = [30, 35, 40, 45, 50, 55, 60];

thresholds.forEach(threshold => {
  const watermarkedPassed = Object.values(watermarkedImages).filter(c => c >= threshold).length;
  const fpBlocked = fpConfidences.filter(c => c < threshold).length;
  const fpPassed = fpConfidences.filter(c => c >= threshold).length;
  
  const recall = (watermarkedPassed / 3 * 100).toFixed(1);
  const fpRate = (fpPassed / fpConfidences.length * 100).toFixed(1);
  
  console.log(`\n阈值 ${threshold}:`);
  console.log(`  真水印通过: ${watermarkedPassed}/3 (召回率 ${recall}%)`);
  console.log(`  假阳性阻止: ${fpBlocked}/${fpConfidences.length}`);
  console.log(`  假阳性通过: ${fpPassed}/${fpConfidences.length} (${fpRate}%)`);
  
  if (watermarkedPassed === 3 && fpPassed < 5) {
    console.log(`  ⭐ 推荐: 召回率100%，假阳性率低`);
  }
});

console.log('\n='.repeat(70));
console.log('💡 最终建议:');
console.log('='.repeat(70));

// 真水印最低是48.03，如果设置阈值为48，可能会漏检
// 但假阳性有很多在48以上，需要找到更好的平衡点

console.log(`
问题诊断:
1. 真水印置信度范围: 48-53
2. 假阳性置信度范围: 32-58（样本）
3. 存在严重重叠区域

解决方案:
方案A - 提高阈值到60:
  - 优点: 几乎消除假阳性
  - 缺点: 会漏检所有真水印（不可行）

方案B - 提高阈值到53:
  - 可能漏检image196和image197
  - 仍会有假阳性通过（不理想）

方案C - 优化特征提取（推荐）:
  - Single分支门控太宽，几乎所有图片都通过了
  - 需要提高Single分支的要求
  - 特别是textlikeness、overlayConsistency的阈值

建议下一步:
1. 查看Single分支的实际特征值
2. 提高Single.thresholds.textlikeness: 45 → 60
3. 提高Single.pass: 30 → 38
4. 阈值可以保持在40-45之间
`);
