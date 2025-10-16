const fs = require('fs');

// 读取测试结果
const results = fs.readFileSync('watermark-test-results.txt', 'utf-16le');
const lines = results.split('\n');

const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];

// 提取检测为有水印的图片
const detected = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/(image\d+\.(jpeg|jpg|png))/);
  if (match) {
    const filename = match[1];
    
    // 查找下一行的Single特征
    let tlMatch = null, ocMatch = null, alMatch = null;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].includes('Single:')) {
        const tlResult = lines[j].match(/TL=([\d.]+)/);
        const ocResult = lines[j].match(/OC=([\d.]+)/);
        const alResult = lines[j].match(/AL=([\d.]+)/);
        
        if (tlResult) tlMatch = parseFloat(tlResult[1]);
        if (ocResult) ocMatch = parseFloat(ocResult[1]);
        if (alResult) alMatch = parseFloat(alResult[1]);
        break;
      }
    }
    
    detected.push({
      filename,
      TL: tlMatch,
      OC: ocMatch,
      AL: alMatch,
      isTrue: trueWatermarks.includes(filename)
    });
  }
}

// 过滤假阳性
const falsePositives = detected.filter(d => !d.isTrue);

console.log('=== 剩余假阳性分析 (策略4后) ===\n');
console.log(`总假阳性数: ${falsePositives.length}`);

// 统计TL和OC分布
let tl100Count = 0;
let oc15PlusCount = 0;
let tl99_OC15Plus = 0;

falsePositives.forEach(fp => {
  if (fp.TL >= 99.5) {
    tl100Count++;
    if (fp.OC >= 1.5) {
      tl99_OC15Plus++;
    }
  }
  if (fp.OC >= 1.5) oc15PlusCount++;
});

console.log(`\nTL=100的假阳性: ${tl100Count}/${falsePositives.length} (${(tl100Count/falsePositives.length*100).toFixed(1)}%)`);
console.log(`OC>=1.5的假阳性: ${oc15PlusCount}/${falsePositives.length} (${(oc15PlusCount/falsePositives.length*100).toFixed(1)}%)`);
console.log(`TL=100 且 OC>=1.5的假阳性: ${tl99_OC15Plus}/${falsePositives.length} (${(tl99_OC15Plus/falsePositives.length*100).toFixed(1)}%)`);

console.log('\n=== 剩余假阳性详细列表 ===');
falsePositives.forEach((fp, idx) => {
  const flag = (fp.TL >= 99.5 && fp.OC < 1.5) ? '⚠️ 应被策略4过滤' : '';
  console.log(`${idx + 1}. ${fp.filename}`);
  console.log(`   TL=${fp.TL?.toFixed(1)}, OC=${fp.OC?.toFixed(1)}, AL=${fp.AL?.toFixed(1)} ${flag}`);
});

console.log('\n=== 策略4规则验证 ===');
console.log('策略4规则: TL>=99.5 且 OC<1.5 → 拒绝');
const shouldBeFiltered = falsePositives.filter(fp => fp.TL >= 99.5 && fp.OC < 1.5);
console.log(`应被策略4过滤但未过滤的: ${shouldBeFiltered.length}`);
if (shouldBeFiltered.length > 0) {
  console.log('\n⚠️ 以下假阳性应该被策略4过滤但没有:');
  shouldBeFiltered.forEach(fp => {
    console.log(`  ${fp.filename}: TL=${fp.TL?.toFixed(1)}, OC=${fp.OC?.toFixed(1)}`);
  });
}
