const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

console.log('=== 位置权重(PW)分析 ===\n');

// 真水印的PW
console.log('真水印的PW:');
trueWatermarks.forEach(img => {
  const result = data.find(r => r.filename === img);
  if (result && result.hasWatermark) {
    console.log(`  ${img}: PW=${result.single?.positionWeight?.toFixed(0) || 'N/A'}`);
  }
});

// 假阳性的PW分布
console.log('\n假阳性的PW分布:');
const falsePositives = data.filter(r => 
  r.hasWatermark && !trueWatermarks.includes(r.filename)
);

console.log(`总假阳性数: ${falsePositives.length}`);

// 统计PW分布
const pwRanges = {
  'PW=100': 0,
  'PW>=80': 0,
  'PW>=50': 0,
  'PW<50': 0
};

falsePositives.forEach(fp => {
  const pw = fp.single?.positionWeight || 0;
  if (pw === 100) pwRanges['PW=100']++;
  else if (pw >= 80) pwRanges['PW>=80']++;
  else if (pw >= 50) pwRanges['PW>=50']++;
  else pwRanges['PW<50']++;
});

console.log('\nPW范围分布:');
Object.entries(pwRanges).forEach(([range, count]) => {
  const pct = (count / falsePositives.length * 100).toFixed(1);
  console.log(`  ${range}: ${count}/${falsePositives.length} (${pct}%)`);
});

// 显示前20个假阳性的详细信息
console.log('\n前20个假阳性的详细特征:');
falsePositives.slice(0, 20).forEach((fp, idx) => {
  const s = fp.single || {};
  console.log(`${idx + 1}. ${fp.filename}`);
  console.log(`   Conf=${parseFloat(fp.confidence).toFixed(1)}, PW=${s.positionWeight?.toFixed(0)}`);
  console.log(`   TL=${s.textlikeness?.toFixed(1)}, OC=${s.overlayConsistency?.toFixed(1)}, AL=${s.alphaLike?.toFixed(1)}`);
});
