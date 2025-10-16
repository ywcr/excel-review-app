const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

console.log('=== TL=100 分析 ===\n');

// 真水印的TL
console.log('真水印的TL:');
trueWatermarks.forEach(img => {
  const result = data.find(r => r.filename === img);
  if (result && result.hasWatermark) {
    const tl = result.single?.textlikeness || 0;
    console.log(`  ${img}: TL=${tl.toFixed(1)}`);
  }
});

// 假阳性的TL分布
const falsePositives = data.filter(r => 
  r.hasWatermark && !trueWatermarks.includes(r.filename)
);

console.log(`\n总假阳性数: ${falsePositives.length}`);

// 统计TL=100的数量
const fpWithTL100 = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  return tl >= 99.5; // 考虑浮点误差
});

console.log(`TL=100的假阳性: ${fpWithTL100.length}/${falsePositives.length} (${(fpWithTL100.length/falsePositives.length*100).toFixed(1)}%)`);

// 真水印中TL=100的数量
const trueResults = data.filter(r => r.hasWatermark && trueWatermarks.includes(r.filename));
const trueWithTL100 = trueResults.filter(r => {
  const tl = r.single?.textlikeness || 0;
  return tl >= 99.5;
});

console.log(`TL=100的真水印: ${trueWithTL100.length}/${trueResults.length} (${(trueWithTL100.length/trueResults.length*100).toFixed(1)}%)`);

console.log('\n=== 结论 ===');
console.log(`如果排除TL=100的检测结果:`);
console.log(`  将过滤假阳性: ${fpWithTL100.length}个`);
console.log(`  将误伤真水印: ${trueWithTL100.length}个`);

const remainingFP = falsePositives.length - fpWithTL100.length;
const remainingTP = trueResults.length - trueWithTL100.length;
console.log(`\n  剩余假阳性: ${remainingFP}`);
console.log(`  保留真阳性: ${remainingTP}`);
console.log(`  新召回率: ${(remainingTP/trueResults.length*100).toFixed(1)}%`);
console.log(`  新精确率: ${((remainingTP/(remainingTP+remainingFP))*100).toFixed(1)}%`);

// 显示非TL=100的假阳性
console.log('\n=== 非TL=100的假阳性 ===');
const fpNonTL100 = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  return tl < 99.5;
});

fpNonTL100.forEach((fp, idx) => {
  const s = fp.single || {};
  console.log(`${idx + 1}. ${fp.filename}`);
  console.log(`   TL=${s.textlikeness?.toFixed(1)}, OC=${s.overlayConsistency?.toFixed(1)}, AL=${s.alphaLike?.toFixed(1)}`);
});
