const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

const falsePositives = data.filter(r => 
  r.hasWatermark && !trueWatermarks.includes(r.filename)
);

console.log('=== 剩余假阳性分析 (策略4后) ===\n');
console.log(`总假阳性数: ${falsePositives.length}`);

// 统计TL和OC分布
let tl100Count = 0;
let oc15PlusCount = 0;
let tl99_OC15Plus = 0;
let tl_lt95_Count = 0;

const stats = {
  'TL=100 且 OC<1.5': 0,
  'TL=100 且 OC>=1.5': 0,
  'TL<100 且 OC>=1.5': 0,
  'TL<100 且 OC<1.5': 0
};

falsePositives.forEach(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  
  if (tl >= 99.5) {
    tl100Count++;
    if (oc >= 1.5) {
      tl99_OC15Plus++;
      stats['TL=100 且 OC>=1.5']++;
    } else {
      stats['TL=100 且 OC<1.5']++;
    }
  } else {
    if (oc >= 1.5) {
      stats['TL<100 且 OC>=1.5']++;
    } else {
      stats['TL<100 且 OC<1.5']++;
    }
  }
  
  if (tl < 95) tl_lt95_Count++;
  if (oc >= 1.5) oc15PlusCount++;
});

console.log(`\nTL=100的假阳性: ${tl100Count}/${falsePositives.length} (${(tl100Count/falsePositives.length*100).toFixed(1)}%)`);
console.log(`TL<95的假阳性: ${tl_lt95_Count}/${falsePositives.length} (${(tl_lt95_Count/falsePositives.length*100).toFixed(1)}%)`);
console.log(`OC>=1.5的假阳性: ${oc15PlusCount}/${falsePositives.length} (${(oc15PlusCount/falsePositives.length*100).toFixed(1)}%)`);
console.log(`TL=100 且 OC>=1.5的假阳性: ${tl99_OC15Plus}/${falsePositives.length} (${(tl99_OC15Plus/falsePositives.length*100).toFixed(1)}%)`);

console.log('\n=== TL和OC组合分布 ===');
Object.entries(stats).forEach(([key, count]) => {
  console.log(`  ${key}: ${count}/${falsePositives.length} (${(count/falsePositives.length*100).toFixed(1)}%)`);
});

console.log('\n=== 剩余假阳性详细列表(前20个) ===');
falsePositives.slice(0, 20).forEach((fp, idx) => {
  const s = fp.single || {};
  const tl = s.textlikeness || 0;
  const oc = s.overlayConsistency || 0;
  const flag = (tl >= 99.5 && oc < 1.5) ? '⚠️ 应被策略4过滤!' : '';
  console.log(`${idx + 1}. ${fp.filename}`);
  console.log(`   TL=${tl.toFixed(1)}, OC=${oc.toFixed(1)}, AL=${s.alphaLike?.toFixed(1)} ${flag}`);
});

console.log('\n=== 策略4规则验证 ===');
console.log('策略4规则: TL>=99.5 且 OC<1.5 → 拒绝');
const shouldBeFiltered = falsePositives.filter(fp => {
  const tl = fp.single?.textlikeness || 0;
  const oc = fp.single?.overlayConsistency || 0;
  return tl >= 99.5 && oc < 1.5;
});
console.log(`应被策略4过滤但未过滤的: ${shouldBeFiltered.length}`);
if (shouldBeFiltered.length > 0) {
  console.log('\n⚠️ 以下假阳性应该被策略4过滤但没有:');
  shouldBeFiltered.forEach(fp => {
    const s = fp.single || {};
    console.log(`  ${fp.filename}: TL=${s.textlikeness?.toFixed(1)}, OC=${s.overlayConsistency?.toFixed(1)}`);
  });
}
