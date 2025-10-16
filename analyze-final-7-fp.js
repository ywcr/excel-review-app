const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

// 当前剩余的20个假阳性
const remaining20 = [
  'image100.jpeg', 'image102.jpeg', 'image104.jpeg', 'image108.jpeg',
  'image109.jpeg', 'image112.jpeg', 'image118.jpeg', 'image12.jpeg',
  'image120.jpeg', 'image121.jpeg', 'image122.jpeg', 'image129.jpeg',
  'image13.png', 'image136.jpeg', 'image148.png', 'image15.jpeg',
  'image152.png', 'image157.png', 'image158.png', 'image164.png'
];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

const these20FP = data.filter(r => remaining20.includes(r.filename));
const truePositives = data.filter(r => trueWatermarks.includes(r.filename));

// 模拟规则B: TL>=95 AND OC<3 AND Grid>60
const wouldBeFilteredByRuleB = these20FP.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const grid = parseFloat(fp.gridness?.score || 0);
  return tl >= 95 && oc < 3 && grid > 60;
});

const remaining7 = these20FP.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  const grid = parseFloat(fp.gridness?.score || 0);
  return !(tl >= 95 && oc < 3 && grid > 60);
});

console.log('=== 规则B后剩余的7个假阳性 ===\n');
console.log('规则B将过滤:', wouldBeFilteredByRuleB.length, '个');
console.log('剩余假阳性:', remaining7.length, '个\n');

// 详细列表
console.log('剩余7个假阳性详情:\n');
remaining7.forEach((fp, idx) => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const conc = parseFloat(fp.concentration?.ratio || 0);
  const grid = parseFloat(fp.gridness?.score || 0);
  const conf = parseFloat(fp.confidence);
  
  console.log(`${idx + 1}. ${fp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(2)}, AL=${al.toFixed(1)}, Grid=${grid.toFixed(1)}`);
  console.log(`   Conc=${conc.toFixed(2)}\n`);
});

// 真水印参考
console.log('=== 真水印特征 ===\n');
truePositives.forEach((tp, idx) => {
  const s = tp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const al = s.alphaLike || 0;
  const conc = parseFloat(tp.concentration?.ratio || 0);
  const grid = parseFloat(tp.gridness?.score || 0);
  const conf = parseFloat(tp.confidence);
  
  console.log(`${idx + 1}. ${tp.filename} (Conf=${conf.toFixed(1)})`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(2)}, AL=${al.toFixed(1)}, Grid=${grid.toFixed(1)}`);
  console.log(`   Conc=${conc.toFixed(2)}\n`);
});

// 寻找能过滤所有7个假阳性但保留真水印的规则
console.log('=== 候选"零假阳性"规则 ===\n');

// 规则Z1: OC>5
const ruleZ1_fp = remaining7.filter(fp => fp.single?.overlayConsistency >= 5);
const ruleZ1_tp = truePositives.filter(tp => tp.single?.overlayConsistency >= 5);
console.log('规则Z1: 只保留 OC≥5');
console.log(`  过滤FP: ${remaining7.length - ruleZ1_fp.length}/7`);
console.log(`  保留TP: ${ruleZ1_tp.length}/4`);
if (ruleZ1_tp.length > 0) console.log(`  保留: ${ruleZ1_tp.map(t => t.filename).join(', ')}`);

// 规则Z2: AL>80
const ruleZ2_fp = remaining7.filter(fp => (fp.single?.alphaLike || 0) > 80);
const ruleZ2_tp = truePositives.filter(tp => (tp.single?.alphaLike || 0) > 80);
console.log('\n规则Z2: 只保留 AL>80');
console.log(`  过滤FP: ${remaining7.length - ruleZ2_fp.length}/7`);
console.log(`  保留TP: ${ruleZ2_tp.length}/4`);
if (ruleZ2_tp.length > 0) console.log(`  保留: ${ruleZ2_tp.map(t => t.filename).join(', ')}`);

// 规则Z3: Conc>3
const ruleZ3_fp = remaining7.filter(fp => parseFloat(fp.concentration?.ratio || 0) > 3);
const ruleZ3_tp = truePositives.filter(tp => parseFloat(tp.concentration?.ratio || 0) > 3);
console.log('\n规则Z3: 只保留 Conc>3');
console.log(`  过滤FP: ${remaining7.length - ruleZ3_fp.length}/7`);
console.log(`  保留TP: ${ruleZ3_tp.length}/4`);
if (ruleZ3_tp.length > 0) console.log(`  保留: ${ruleZ3_tp.map(t => t.filename).join(', ')}`);

// 规则Z4: 提高决策阈值到60
console.log('\n规则Z4: 提高决策阈值到60');
const ruleZ4_fp = remaining7.filter(fp => parseFloat(fp.confidence) >= 60);
const ruleZ4_tp = truePositives.filter(tp => parseFloat(tp.confidence) >= 60);
console.log(`  过滤FP: ${remaining7.length - ruleZ4_fp.length}/7`);
console.log(`  保留TP: ${ruleZ4_tp.length}/4`);
if (ruleZ4_tp.length > 0) console.log(`  保留: ${ruleZ4_tp.map(t => t.filename).join(', ')}`);

// 组合规则: 规则B + 任何一个能清零的规则
console.log('\n=== 最终方案建议 ===');
console.log('规则B + 额外过滤条件 = 0假阳性');
