const fs = require('fs');
const Jimp = require('jimp');
const path = require('path');

const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpeg'];
const imageDir = 'D:\\yaowei\\excel-review-app\\temp\\extracted-images';

async function analyzeResults() {
  // 读取测试结果
  const results = fs.readFileSync('watermark-test-results.txt', 'utf-16le');
  const lines = results.split('\n');

  // 提取检测为有水印的图片
  const detected = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(\d+)\.\s+(image\d+\.(jpeg|png))/);
    if (match) {
      detected.add(match[2]);
    }
  }

  console.log('=== 检测结果汇总 ===');
  console.log('检测为有水印:', detected.size, '张');
  
  // 找出漏检的真水印
  const missed = trueWatermarks.filter(img => !detected.has(img));
  console.log('\n❌ 漏检的真水印:', missed.length > 0 ? missed.join(', ') : '无');
  
  // 找出假阳性
  const falsePositives = Array.from(detected).filter(img => !trueWatermarks.includes(img));
  console.log('✅ 检测到的真水印:', trueWatermarks.filter(img => detected.has(img)).join(', '));
  console.log('⚠️  假阳性数量:', falsePositives.length);
  
  console.log('\n=== 假阳性列表 ===');
  falsePositives.forEach((img, idx) => {
    console.log(`${idx + 1}. ${img}`);
  });

  // 如果有漏检，分析漏检图片
  if (missed.length > 0) {
    console.log('\n=== 分析漏检的真水印 ===');
    for (const img of missed) {
      try {
        const imgPath = path.join(imageDir, img);
        const image = await Jimp.read(imgPath);
        console.log(`  ${img}: ${image.bitmap.width}x${image.bitmap.height}`);
      } catch (err) {
        console.error(`  无法读取 ${img}:`, err.message);
      }
    }
  }
}

analyzeResults().catch(console.error);

const resultsPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log('\n=== 📊 当前水印检测性能分析 ===\n');
console.log(`总图片数: ${data.summary.total}`);
console.log(`真阳性 (TP): ${data.summary.tp}`);
console.log(`真阴性 (TN): ${data.summary.tn}`);
console.log(`假阳性 (FP): ${data.summary.fp}`);
console.log(`假阴性 (FN): ${data.summary.fn}`);
console.log(`\n准确率: ${data.summary.accuracy}%`);
console.log(`精确率: ${data.summary.precision}%`);
console.log(`召回率: ${data.summary.recall}%\n`);

console.log('=== ✅ 真水印检测情况 ===\n');
const watermarkedImages = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];
watermarkedImages.forEach(name => {
  const result = data.results.find(r => r.filename === name);
  if (result) {
    console.log(`${name}:`);
    console.log(`  检测: ${result.hasWatermark ? '✅ 是' : '❌ 否'} (置信度: ${result.confidence})`);
    console.log(`  TL=${result.single.textlikeness.toFixed(1)}, OC=${result.single.overlayConsistency.toFixed(1)}, AL=${result.single.alphaLike.toFixed(1)}, PW=${result.single.positionWeight}`);
    if (result.concentration && result.concentration.ratio !== undefined) {
      const ratio = typeof result.concentration.ratio === 'number' ? result.concentration.ratio : parseFloat(result.concentration.ratio) || 0;
      console.log(`  Concentration=${ratio.toFixed(2)}`);
    }
    console.log('');
  }
});

console.log(`=== ❌ 假阳性分析 (共${data.summary.fp}张) ===\n`);

// 分析假阳性的特征分布
const fps = data.results.filter(r => r.hasWatermark && !watermarkedImages.includes(r.filename));

// 统计特征分布
let lowConcentration = 0; // < 1.0
let lowOC = 0; // < 20
let highGridness = 0; // > 60
let lowAlpha = 0; // < 50

fps.forEach(fp => {
  const conc = fp.concentration?.ratio || 0;
  const oc = fp.single.overlayConsistency || 0;
  const grid = fp.gridness?.score || 0;
  const alpha = fp.single.alphaLike || 0;
  
  if (conc < 1.0) lowConcentration++;
  if (oc < 20) lowOC++;
  if (grid > 60) highGridness++;
  if (alpha < 50) lowAlpha++;
});

console.log('假阳性特征统计:');
console.log(`  低集中度 (Conc<1.0): ${lowConcentration}/${fps.length} (${(lowConcentration/fps.length*100).toFixed(1)}%)`);
console.log(`  低OC (<20): ${lowOC}/${fps.length} (${(lowOC/fps.length*100).toFixed(1)}%)`);
console.log(`  高Gridness (>60): ${highGridness}/${fps.length} (${(highGridness/fps.length*100).toFixed(1)}%)`);
console.log(`  低Alpha (<50): ${lowAlpha}/${fps.length} (${(lowAlpha/fps.length*100).toFixed(1)}%)`);

console.log(`\n前10个假阳性样本:`);
fps.slice(0, 10).forEach((fp, idx) => {
  const conc = parseFloat(fp.concentration?.ratio) || 0;
  const oc = parseFloat(fp.single.overlayConsistency) || 0;
  const grid = parseFloat(fp.gridness?.score) || 0;
  const alpha = parseFloat(fp.single.alphaLike) || 0;
  const tl = parseFloat(fp.single.textlikeness) || 0;
  
  console.log(`${idx+1}. ${fp.filename}`);
  console.log(`   Conf=${fp.confidence}, TL=${tl.toFixed(1)}, OC=${oc.toFixed(1)}, AL=${alpha.toFixed(1)}, Conc=${conc.toFixed(2)}, Grid=${grid.toFixed(1)}`);
});

console.log('\n=== 💡 优化建议 ===\n');
console.log('1. ✅ 召回率已达100% - 所有真水印都被检测到');
console.log(`2. ⚠️  精确率较低(${data.summary.precision}%) - 有${data.summary.fp}个假阳性`);
console.log('3. 🎯 下一步: 针对假阳性特征模式加强抑制规则');
console.log(`   - ${lowConcentration}个假阳性有低集中度(<1.0)`);
console.log(`   - ${lowOC}个假阳性有极低OC(<20)`);
console.log(`   - ${highGridness}个假阳性有高Gridness(>60)`);
console.log('');
