const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

// 提取已检测为有水印的图片
const detected = data.filter(r => r.hasWatermark);
const falsePositives = detected.filter(r => !trueWatermarks.includes(r.filename));
const truePositives = detected.filter(r => trueWatermarks.includes(r.filename));

console.log('=== 剩余假阳性详细特征分析 ===\n');
console.log(`检测总数: ${detected.length}`);
console.log(`真阳性: ${truePositives.length}`);
console.log(`假阳性: ${falsePositives.length}\n`);

// 分析所有特征的统计分布
const stats = {
  tl100: 0,
  oc_0_1: 0,
  oc_1_2: 0,
  oc_2_5: 0,
  oc_5_10: 0,
  oc_10_plus: 0,
  al_low: 0,  // <50
  al_mid: 0,  // 50-70
  al_high: 0, // >70
  conc_0: 0,
  conc_low: 0,  // <1.0
  conc_mid: 0,  // 1.0-2.0
  conc_high: 0, // >2.0
  grid_high: 0,  // >60
  roiGrid: 0,
  pw100: 0
};

falsePositives.forEach(fp => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  const grid = parseFloat(fp.gridness?.score || 0);
  const roiGrid = fp.roiGridness?.isGrid || false;
  const pw = s.positionWeight || 0;
  
  if (tl >= 99.5) stats.tl100++;
  
  if (oc < 1) stats.oc_0_1++;
  else if (oc < 2) stats.oc_1_2++;
  else if (oc < 5) stats.oc_2_5++;
  else if (oc < 10) stats.oc_5_10++;
  else stats.oc_10_plus++;
  
  if (al < 50) stats.al_low++;
  else if (al < 70) stats.al_mid++;
  else stats.al_high++;
  
  if (conc === 0) stats.conc_0++;
  else if (conc < 1.0) stats.conc_low++;
  else if (conc < 2.0) stats.conc_mid++;
  else stats.conc_high++;
  
  if (grid > 60) stats.grid_high++;
  if (roiGrid) stats.roiGrid++;
  if (pw === 100) stats.pw100++;
});

console.log('=== 特征分布统计 ===');
console.log(`TL=100: ${stats.tl100}/${falsePositives.length} (${(stats.tl100/falsePositives.length*100).toFixed(1)}%)`);
console.log(`\nOC分布:`);
console.log(`  OC<1: ${stats.oc_0_1}/${falsePositives.length} (${(stats.oc_0_1/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  1≤OC<2: ${stats.oc_1_2}/${falsePositives.length} (${(stats.oc_1_2/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  2≤OC<5: ${stats.oc_2_5}/${falsePositives.length} (${(stats.oc_2_5/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  5≤OC<10: ${stats.oc_5_10}/${falsePositives.length} (${(stats.oc_5_10/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  OC≥10: ${stats.oc_10_plus}/${falsePositives.length} (${(stats.oc_10_plus/falsePositives.length*100).toFixed(1)}%)`);
console.log(`\nAlpha分布:`);
console.log(`  AL<50: ${stats.al_low}/${falsePositives.length} (${(stats.al_low/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  50≤AL<70: ${stats.al_mid}/${falsePositives.length} (${(stats.al_mid/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  AL≥70: ${stats.al_high}/${falsePositives.length} (${(stats.al_high/falsePositives.length*100).toFixed(1)}%)`);
console.log(`\n集中度分布:`);
console.log(`  Conc=0: ${stats.conc_0}/${falsePositives.length} (${(stats.conc_0/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  Conc<1.0: ${stats.conc_low}/${falsePositives.length} (${(stats.conc_low/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  1.0≤Conc<2.0: ${stats.conc_mid}/${falsePositives.length} (${(stats.conc_mid/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  Conc≥2.0: ${stats.conc_high}/${falsePositives.length} (${(stats.conc_high/falsePositives.length*100).toFixed(1)}%)`);
console.log(`\n其他特征:`);
console.log(`  Gridness>60: ${stats.grid_high}/${falsePositives.length} (${(stats.grid_high/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  ROI isGrid: ${stats.roiGrid}/${falsePositives.length} (${(stats.roiGrid/falsePositives.length*100).toFixed(1)}%)`);
console.log(`  PW=100: ${stats.pw100}/${falsePositives.length} (${(stats.pw100/falsePositives.length*100).toFixed(1)}%)`);

// 显示所有假阳性的详细信息
console.log('\n=== 所有假阳性详细列表 ===\n');
falsePositives.forEach((fp, idx) => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const we = s.whiteEdgeRatio || 0;
  const pw = s.positionWeight || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  const grid = parseFloat(fp.gridness?.score || 0);
  const isGrid = fp.gridness?.isGrid || false;
  const roiGrid = parseFloat(fp.roiGridness?.score || 0);
  const roiIsGrid = fp.roiGridness?.isGrid || false;
  const conf = parseFloat(fp.confidence);
  
  console.log(`${idx + 1}. ${fp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(1)}, AL=${al.toFixed(1)}, WE=${we.toFixed(1)}, PW=${pw}`);
  console.log(`   Conc=${conc.toFixed(2)}, Grid=${grid.toFixed(1)}${isGrid?'✓':''}, ROIGrid=${roiGrid.toFixed(1)}${roiIsGrid?'✓':''}`);
});

// 真水印的特征对比
console.log('\n=== 真水印特征参考 ===\n');
truePositives.forEach((tp, idx) => {
  const s = tp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const we = s.whiteEdgeRatio || 0;
  const pw = s.positionWeight || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  const grid = parseFloat(tp.gridness?.score || 0);
  const conf = parseFloat(tp.confidence);
  
  console.log(`${idx + 1}. ${tp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(1)}, AL=${al.toFixed(1)}, WE=${we.toFixed(1)}, PW=${pw}`);
  console.log(`   Conc=${conc.toFixed(2)}, Grid=${grid.toFixed(1)}`);
});

// 分析可能的新过滤规则
console.log('\n=== 潜在过滤规则分析 ===\n');

// 规则候选1: TL=100 AND OC<2.5 AND Conc<1.5
const rule1_fp = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  return tl >= 99.5 && oc < 2.5 && conc < 1.5;
});
const rule1_tp = truePositives.filter(tp => {
  const tl = tp.single?.textlikeness || 0;
  const oc = tp.single?.overlayConsistency || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  return tl >= 99.5 && oc < 2.5 && conc < 1.5;
});
console.log(`候选规则1: TL≥99.5 AND OC<2.5 AND Conc<1.5`);
console.log(`  将过滤: ${rule1_fp.length}个假阳性`);
console.log(`  将误伤: ${rule1_tp.length}个真水印`);
if (rule1_tp.length > 0) console.log(`  误伤: ${rule1_tp.map(t => t.filename).join(', ')}`);

// 规则候选2: TL>=95 AND OC<5 AND AL<60
const rule2_fp = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const al = fp.single?.alphaLike || 0;
  return tl >= 95 && oc < 5 && al < 60;
});
const rule2_tp = truePositives.filter(tp => {
  const tl = tp.single?.textlikeness || 0;
  const oc = tp.single?.overlayConsistency || 0;
  const al = tp.single?.alphaLike || 0;
  return tl >= 95 && oc < 5 && al < 60;
});
console.log(`\n候选规则2: TL≥95 AND OC<5 AND AL<60`);
console.log(`  将过滤: ${rule2_fp.length}个假阳性`);
console.log(`  将误伤: ${rule2_tp.length}个真水印`);
if (rule2_tp.length > 0) console.log(`  误伤: ${rule2_tp.map(t => t.filename).join(', ')}`);

// 规则候选3: TL=100 AND OC<3 AND Grid>60
const rule3_fp = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const grid = parseFloat(fp.gridness?.score || 0);
  return tl >= 99.5 && oc < 3 && grid > 60;
});
const rule3_tp = truePositives.filter(tp => {
  const tl = tp.single?.textlikeness || 0;
  const oc = tp.single?.overlayConsistency || 0;
  const grid = parseFloat(tp.gridness?.score || 0);
  return tl >= 99.5 && oc < 3 && grid > 60;
});
console.log(`\n候选规则3: TL≥99.5 AND OC<3 AND Grid>60`);
console.log(`  将过滤: ${rule3_fp.length}个假阳性`);
console.log(`  将误伤: ${rule3_tp.length}个真水印`);
if (rule3_tp.length > 0) console.log(`  误伤: ${rule3_tp.map(t => t.filename).join(', ')}`);

// 规则候选4: OC<10 AND AL>=50 AND AL<70 AND Conc<1.5
const rule4_fp = falsePositives.filter(fp => {
  const oc = fp.single?.overlayConsistency || 0;
  const al = fp.single?.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  return oc < 10 && al >= 50 && al < 70 && conc < 1.5;
});
const rule4_tp = truePositives.filter(tp => {
  const oc = tp.single?.overlayConsistency || 0;
  const al = tp.single?.alphaLike || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  return oc < 10 && al >= 50 && al < 70 && conc < 1.5;
});
console.log(`\n候选规则4: OC<10 AND 50≤AL<70 AND Conc<1.5`);
console.log(`  将过滤: ${rule4_fp.length}个假阳性`);
console.log(`  将误伤: ${rule4_tp.length}个真水印`);
if (rule4_tp.length > 0) console.log(`  误伤: ${rule4_tp.map(t => t.filename).join(', ')}`);
