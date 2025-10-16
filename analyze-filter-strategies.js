const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpeg'];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

const allDetected = data.filter(r => r.hasWatermark);
const falsePositives = allDetected.filter(r => !trueWatermarks.includes(r.filename));
const truePositives = allDetected.filter(r => trueWatermarks.includes(r.filename));

console.log('=== 原始状态 ===');
console.log(`真阳性: ${truePositives.length}/4, 假阳性: ${falsePositives.length}`);
console.log(`召回率: 100%, 精确率: ${(truePositives.length/allDetected.length*100).toFixed(1)}%\n`);

// 策略1: TL=100
function strategy1(fp) {
  const tl = fp.single?.textlikeness || 0;
  return tl >= 99.5;
}

// 策略2: TL>=95
function strategy2(fp) {
  const tl = fp.single?.textlikeness || 0;
  return tl >= 95;
}

// 策略3: TL=100 且 Concentration<1.0
function strategy3(fp) {
  const tl = fp.single?.textlikeness || 0;
  const conc = parseFloat(fp.phase3?.concentration?.ratio || 0);
  return tl >= 99.5 && conc < 1.0;
}

// 策略4: TL=100 且 OC<1.5
function strategy4(fp) {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  return tl >= 99.5 && oc < 1.5;
}

// 策略5: TL>=95 且 Concentration<0.8
function strategy5(fp) {
  const tl = fp.single?.textlikeness || 0;
  const conc = parseFloat(fp.phase3?.concentration?.ratio || 0);
  return tl >= 95 && conc < 0.8;
}

const strategies = [
  { name: '策略1: TL=100', fn: strategy1 },
  { name: '策略2: TL>=95', fn: strategy2 },
  { name: '策略3: TL=100 且 Conc<1.0', fn: strategy3 },
  { name: '策略4: TL=100 且 OC<1.5', fn: strategy4 },
  { name: '策略5: TL>=95 且 Conc<0.8', fn: strategy5 }
];

strategies.forEach(({name, fn}) => {
  const fpFiltered = falsePositives.filter(fn).length;
  const tpLost = truePositives.filter(fn).length;
  
  const remainingTP = truePositives.length - tpLost;
  const remainingFP = falsePositives.length - fpFiltered;
  const recall = (remainingTP / truePositives.length * 100).toFixed(1);
  const precision = remainingTP > 0 ? (remainingTP / (remainingTP + remainingFP) * 100).toFixed(1) : 0;
  
  console.log(`${name}`);
  console.log(`  过滤假阳性: ${fpFiltered}/${falsePositives.length}, 剩余FP: ${remainingFP}`);
  console.log(`  误伤真水印: ${tpLost}/${truePositives.length}, 剩余TP: ${remainingTP}`);
  console.log(`  📊 召回率: ${recall}%, 精确率: ${precision}%`);
  
  // 显示被误伤的真水印
  if (tpLost > 0) {
    const lost = truePositives.filter(fn).map(r => r.filename);
    console.log(`  ⚠️  误伤的真水印: ${lost.join(', ')}`);
  }
  console.log('');
});

// 详细分析image196的特征
console.log('=== image196 详细特征 ===');
const img196 = data.find(r => r.filename === 'image196.jpeg');
if (img196) {
  const s = img196.single || {};
  const p3 = img196.phase3 || {};
  console.log(`TL=${s.textlikeness?.toFixed(1)}`);
  console.log(`OC=${s.overlayConsistency?.toFixed(1)}`);
  console.log(`AL=${s.alphaLike?.toFixed(1)}`);
  console.log(`Concentration=${p3.concentration?.ratio}`);
  console.log(`Gridness=${img196.gridness?.score}`);
}
