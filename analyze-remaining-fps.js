const fs = require('fs');

const resultsPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const watermarkedImages = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];
const fps = data.results.filter(r => r.hasWatermark && !watermarkedImages.includes(r.filename));

console.log(`\n=== 剩余${fps.length}个假阳性详细分析 ===\n`);

// 按特征分类
const categories = {
  highTL_lowOC_lowConc: [],      // TL>=99, OC<5, Conc<1.0 → 应该被规则7拒绝
  highTL_lowOC_withGrid: [],     // TL>=99, OC<3, Grid>60 → 应该被规则6拒绝
  highTL_midOC: [],              // TL>=99, OC>=5
  highConc: [],                  // Conc>=1.5
  midTL: [],                     // TL<99
  edgePath: [],                  // 可能命中edgeTextWatermarkPath
  cornerPath: []                 // 可能命中cornerLogoPath/cornerTextWatermarkPath
};

fps.forEach(fp => {
  const tl = parseFloat(fp.single.textlikeness) || 0;
  const oc = parseFloat(fp.single.overlayConsistency) || 0;
  const conc = parseFloat(fp.concentration?.ratio) || 0;
  const grid = parseFloat(fp.gridness?.score) || 0;
  const alpha = parseFloat(fp.single.alphaLike) || 0;
  const pw = fp.single.positionWeight || 0;
  
  if (tl >= 99 && oc < 3 && grid > 60 && conc < 1.5) {
    categories.highTL_lowOC_withGrid.push({...fp, tl, oc, conc, grid, alpha, pw});
  } else if (tl >= 99 && oc < 5 && conc < 1.0 && alpha < 90) {
    categories.highTL_lowOC_lowConc.push({...fp, tl, oc, conc, grid, alpha, pw});
  } else if (tl >= 99 && oc >= 5) {
    categories.highTL_midOC.push({...fp, tl, oc, conc, grid, alpha, pw});
  } else if (conc >= 1.5) {
    categories.highConc.push({...fp, tl, oc, conc, grid, alpha, pw});
  } else if (tl < 99) {
    categories.midTL.push({...fp, tl, oc, conc, grid, alpha, pw});
  }
  
  // 检查可能的路径
  if (pw >= 60 && tl >= 85 && conc >= 0.5) {
    categories.edgePath.push({...fp, tl, oc, conc, grid, alpha, pw});
  }
  if (pw >= 75 && tl >= 55 && alpha <= 25) {
    categories.cornerPath.push({...fp, tl, oc, conc, grid, alpha, pw});
  }
});

console.log('分类统计:');
console.log(`  TL>=99 + OC<3 + Grid>60 (应被规则6拒绝): ${categories.highTL_lowOC_withGrid.length}个`);
console.log(`  TL>=99 + OC<5 + Conc<1.0 (应被规则7拒绝): ${categories.highTL_lowOC_lowConc.length}个`);
console.log(`  TL>=99 + OC>=5 (高OC绕过): ${categories.highTL_midOC.length}个`);
console.log(`  Conc>=1.5 (高集中度绕过): ${categories.highConc.length}个`);
console.log(`  TL<99 (非满分绕过): ${categories.midTL.length}个`);
console.log(`  可能命中edgePath: ${categories.edgePath.length}个`);
console.log(`  可能命中cornerPath: ${categories.cornerPath.length}个`);

console.log('\n=== 应被规则6拒绝但未拒绝的(TL=100+OC<3+Grid>60): ===');
categories.highTL_lowOC_withGrid.slice(0, 5).forEach((fp, idx) => {
  console.log(`${idx+1}. ${fp.filename}`);
  console.log(`   TL=${fp.tl.toFixed(1)}, OC=${fp.oc.toFixed(1)}, Grid=${fp.grid.toFixed(1)}, Conc=${fp.conc.toFixed(2)}`);
  console.log(`   为什么未拒绝? Conc=${fp.conc.toFixed(2)} ${fp.conc >= 1.5 ? '>=1.5(保护条件)' : '<1.5(应拒绝)'}`);
});

console.log('\n=== 应被规则7拒绝但未拒绝的(TL=100+OC<5+Conc<1.0): ===');
categories.highTL_lowOC_lowConc.slice(0, 5).forEach((fp, idx) => {
  console.log(`${idx+1}. ${fp.filename}`);
  console.log(`   TL=${fp.tl.toFixed(1)}, OC=${fp.oc.toFixed(1)}, Conc=${fp.conc.toFixed(2)}, AL=${fp.alpha.toFixed(1)}`);
  console.log(`   为什么未拒绝? AL=${fp.alpha.toFixed(1)} ${fp.alpha >= 90 ? '>=90(保护条件)' : '<90(应拒绝)'}`);
});

console.log('\n=== 高集中度绕过硬拒绝(Conc>=1.5): ===');
categories.highConc.slice(0, 10).forEach((fp, idx) => {
  console.log(`${idx+1}. ${fp.filename}: TL=${fp.tl.toFixed(1)}, OC=${fp.oc.toFixed(1)}, Conc=${fp.conc.toFixed(2)}, Grid=${fp.grid.toFixed(1)}`);
});

console.log('\n=== 💡 优化建议 ===');
console.log(`1. 有${categories.highConc.length}个假阳性因为Conc>=1.5被保护 → 考虑提高保护阈值到2.0`);
console.log(`2. 有${categories.midTL.length}个假阳性TL<99 → 考虑降低TL阈值到95`);
console.log(`3. 有${categories.highTL_midOC.length}个假阳性OC>=5 → 考虑提高OC阈值或增加组合规则`);
console.log('');
