const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

// 当前剩余的20个假阳性名单
const remaining20 = [
  'image100.jpeg', 'image102.jpeg', 'image104.jpeg', 'image108.jpeg',
  'image109.jpeg', 'image112.jpeg', 'image118.jpeg', 'image12.jpeg',
  'image120.jpeg', 'image121.jpeg', 'image122.jpeg', 'image129.jpeg',
  'image13.png', 'image136.jpeg', 'image148.png', 'image15.jpeg',
  'image152.png', 'image157.png', 'image158.png', 'image164.png'
];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

// 提取真水印特征
const truePositives = data.filter(r => trueWatermarks.includes(r.filename));

// 提取这20个假阳性的详细特征
const these20FP = data.filter(r => remaining20.includes(r.filename));

console.log('=== 剩余20个假阳性详细特征分析 ===\n');

// 统计分布
const stats = {
  tl_95_99: 0,
  tl_100: 0,
  oc_0_1: 0,
  oc_1_2: 0,
  oc_2_5: 0,
  oc_5_plus: 0,
  al_low: 0,  // <50
  al_mid: 0,  // 50-70
  al_high: 0, // >70
  conc_low: 0,  // <1.0
  conc_mid: 0,  // 1.0-2.0
  conc_high: 0, // >2.0
  grid_high: 0  // >60
};

these20FP.forEach(fp => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  const grid = parseFloat(fp.gridness?.score || 0);
  
  if (tl >= 99.5) stats.tl_100++;
  else if (tl >= 95) stats.tl_95_99++;
  
  if (oc < 1) stats.oc_0_1++;
  else if (oc < 2) stats.oc_1_2++;
  else if (oc < 5) stats.oc_2_5++;
  else stats.oc_5_plus++;
  
  if (al < 50) stats.al_low++;
  else if (al < 70) stats.al_mid++;
  else stats.al_high++;
  
  if (conc < 1.0) stats.conc_low++;
  else if (conc < 2.0) stats.conc_mid++;
  else stats.conc_high++;
  
  if (grid > 60) stats.grid_high++;
});

console.log('特征分布统计 (n=20):');
console.log(`\nTL分布:`);
console.log(`  TL=100: ${stats.tl_100}/20 (${(stats.tl_100/20*100).toFixed(1)}%)`);
console.log(`  95≤TL<100: ${stats.tl_95_99}/20 (${(stats.tl_95_99/20*100).toFixed(1)}%)`);
console.log(`\nOC分布:`);
console.log(`  OC<1: ${stats.oc_0_1}/20 (${(stats.oc_0_1/20*100).toFixed(1)}%)`);
console.log(`  1≤OC<2: ${stats.oc_1_2}/20 (${(stats.oc_1_2/20*100).toFixed(1)}%)`);
console.log(`  2≤OC<5: ${stats.oc_2_5}/20 (${(stats.oc_2_5/20*100).toFixed(1)}%)`);
console.log(`  OC≥5: ${stats.oc_5_plus}/20 (${(stats.oc_5_plus/20*100).toFixed(1)}%)`);
console.log(`\nAL分布:`);
console.log(`  AL<50: ${stats.al_low}/20 (${(stats.al_low/20*100).toFixed(1)}%)`);
console.log(`  50≤AL<70: ${stats.al_mid}/20 (${(stats.al_mid/20*100).toFixed(1)}%)`);
console.log(`  AL≥70: ${stats.al_high}/20 (${(stats.al_high/20*100).toFixed(1)}%)`);
console.log(`\n集中度分布:`);
console.log(`  Conc<1.0: ${stats.conc_low}/20 (${(stats.conc_low/20*100).toFixed(1)}%)`);
console.log(`  1.0≤Conc<2.0: ${stats.conc_mid}/20 (${(stats.conc_mid/20*100).toFixed(1)}%)`);
console.log(`  Conc≥2.0: ${stats.conc_high}/20 (${(stats.conc_high/20*100).toFixed(1)}%)`);
console.log(`\n其他:`);
console.log(`  Grid>60: ${stats.grid_high}/20 (${(stats.grid_high/20*100).toFixed(1)}%)`);

// 详细列表
console.log('\n=== 20个假阳性详细信息 ===\n');
these20FP.forEach((fp, idx) => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const we = s.whiteEdgeRatio || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  const grid = parseFloat(fp.gridness?.score || 0);
  const isGrid = fp.gridness?.isGrid || false;
  const conf = parseFloat(fp.confidence);
  
  console.log(`${idx + 1}. ${fp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(2)}, AL=${al.toFixed(1)}, WE=${we.toFixed(1)}`);
  console.log(`   Conc=${conc.toFixed(2)}, Grid=${grid.toFixed(1)}${isGrid?'✓':''}`);
});

// 真水印参考
console.log('\n=== 真水印特征参考 ===\n');
truePositives.forEach((tp, idx) => {
  const s = tp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  const grid = parseFloat(tp.gridness?.score || 0);
  const conf = parseFloat(tp.confidence);
  
  console.log(`${idx + 1}. ${tp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(2)}, AL=${al.toFixed(1)}`);
  console.log(`   Conc=${conc.toFixed(2)}, Grid=${grid.toFixed(1)}`);
});

// 新规则候选分析
console.log('\n=== 候选过滤规则分析 ===\n');

// 规则A: OC<2 AND Conc<1.5
const ruleA_fp = these20FP.filter(fp => {
  const oc = fp.single?.overlayConsistency || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  return oc < 2 && conc < 1.5;
});
const ruleA_tp = truePositives.filter(tp => {
  const oc = tp.single?.overlayConsistency || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  return oc < 2 && conc < 1.5;
});
console.log(`规则A: OC<2 AND Conc<1.5`);
console.log(`  过滤FP: ${ruleA_fp.length}/20, 误伤TP: ${ruleA_tp.length}/4`);
if (ruleA_tp.length > 0) console.log(`  误伤: ${ruleA_tp.map(t => t.filename).join(', ')}`);

// 规则B: TL>=95 AND OC<3 AND Grid>60
const ruleB_fp = these20FP.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const grid = parseFloat(fp.gridness?.score || 0);
  return tl >= 95 && oc < 3 && grid > 60;
});
const ruleB_tp = truePositives.filter(tp => {
  const tl = tp.single?.textlikeness || 0;
  const oc = tp.single?.overlayConsistency || 0;
  const grid = parseFloat(tp.gridness?.score || 0);
  return tl >= 95 && oc < 3 && grid > 60;
});
console.log(`\n规则B: TL≥95 AND OC<3 AND Grid>60`);
console.log(`  过滤FP: ${ruleB_fp.length}/20, 误伤TP: ${ruleB_tp.length}/4`);
if (ruleB_tp.length > 0) console.log(`  误伤: ${ruleB_tp.map(t => t.filename).join(', ')}`);

// 规则C: TL=100 AND OC<5 AND AL<60 AND Conc<2
const ruleC_fp = these20FP.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const al = fp.single?.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  return tl >= 99.5 && oc < 5 && al < 60 && conc < 2;
});
const ruleC_tp = truePositives.filter(tp => {
  const tl = tp.single?.textlikeness || 0;
  const oc = tp.single?.overlayConsistency || 0;
  const al = tp.single?.alphaLike || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  return tl >= 99.5 && oc < 5 && al < 60 && conc < 2;
});
console.log(`\n规则C: TL=100 AND OC<5 AND AL<60 AND Conc<2`);
console.log(`  过滤FP: ${ruleC_fp.length}/20, 误伤TP: ${ruleC_tp.length}/4`);
if (ruleC_tp.length > 0) console.log(`  误伤: ${ruleC_tp.map(t => t.filename).join(', ')}`);

// 规则D: OC<10 AND AL>=50 AND AL<70 AND Conc<2
const ruleD_fp = these20FP.filter(fp => {
  const oc = fp.single?.overlayConsistency || 0;
  const al = fp.single?.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  return oc < 10 && al >= 50 && al < 70 && conc < 2;
});
const ruleD_tp = truePositives.filter(tp => {
  const oc = tp.single?.overlayConsistency || 0;
  const al = tp.single?.alphaLike || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  return oc < 10 && al >= 50 && al < 70 && conc < 2;
});
console.log(`\n规则D: OC<10 AND 50≤AL<70 AND Conc<2`);
console.log(`  过滤FP: ${ruleD_fp.length}/20, 误伤TP: ${ruleD_tp.length}/4`);
if (ruleD_tp.length > 0) console.log(`  误伤: ${ruleD_tp.map(t => t.filename).join(', ')}`);
