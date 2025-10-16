const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json'));
const results = data.results;

const rejected = results.filter(f => f.hardReject);
console.log('=== 硬性否决统计 ===\n');
console.log('被否决图片数量:', rejected.length);

if (rejected.length > 0) {
  console.log('\n被否决的图片:');
  rejected.forEach((f, i) => {
    console.log(`${i + 1}. ${f.filename}: ${f.hardRejectReason}`);
    console.log(`   TL=${f.single.textlikeness.toFixed(1)} OC=${f.single.overlayConsistency.toFixed(1)} AL=${f.single.alphaLike.toFixed(1)}`);
    console.log(`   Grid=${f.gridness.score} ROIGrid=${f.roiGridness.score} Conc=${f.concentration.ratio}`);
  });
}

const expectedWatermarked = ['image196.jpeg', 'image197.jpeg', 'image198.png'];
const rejectedTPs = results.filter(f => expectedWatermarked.includes(f.filename) && f.hardReject);

console.log('\n=== 真水印检查 ===\n');
expectedWatermarked.forEach(name => {
  const r = results.find(f => f.filename === name);
  if (r) {
    console.log(`${name}:`);
    console.log(`  hardReject: ${r.hardReject}`);
    console.log(`  hardRejectReason: ${r.hardRejectReason || 'N/A'}`);
    console.log(`  hasWatermark: ${r.hasWatermark}`);
    console.log(`  confidence: ${r.confidence}`);
    console.log(`  特征: TL=${r.single.textlikeness.toFixed(1)} OC=${r.single.overlayConsistency.toFixed(1)} AL=${r.single.alphaLike.toFixed(1)}`);
    console.log(`  Grid=${r.gridness.score} ROIGrid=${r.roiGridness.score} Conc=${r.concentration.ratio}\n`);
  }
});

if (rejectedTPs.length > 0) {
  console.log('⚠️  真水印被误杀:', rejectedTPs.length);
  rejectedTPs.forEach(f => {
    console.log(`  ${f.filename}: ${f.hardRejectReason}`);
  });
}

console.log('\n=== 假阳性分析 ===\n');
const fps = results.filter(r => r.hasWatermark && !expectedWatermarked.includes(r.filename));
console.log('当前假阳性数量:', fps.length);
console.log('被硬性否决的假阳性:', rejected.filter(f => !expectedWatermarked.includes(f.filename)).length);
console.log('未被过滤的假阳性:', fps.length);
