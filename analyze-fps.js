const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json'));
const expectedWatermarked = ['image196.jpeg', 'image197.jpeg', 'image198.png'];
const fps = data.results.filter(r => r.hasWatermark && !expectedWatermarked.includes(r.filename));

console.log('=== 假阳性特征统计 (49张) ===\n');

const stats = {
  highGridness: fps.filter(f => parseFloat(f.gridness.score) > 60).length,
  roiIsGrid: fps.filter(f => f.roiGridness.isGrid).length,
  lowOC: fps.filter(f => parseFloat(f.single.overlayConsistency) < 25).length,
  veryLowOC: fps.filter(f => parseFloat(f.single.overlayConsistency) < 20).length,
  lowAlpha: fps.filter(f => parseFloat(f.single.alphaLike) < 40).length,
  veryLowAlpha: fps.filter(f => parseFloat(f.single.alphaLike) < 30).length,
  lowConc: fps.filter(f => parseFloat(f.concentration.ratio) < 1.0).length,
  veryLowConc: fps.filter(f => parseFloat(f.concentration.ratio) < 0.5).length,
  zeroConc: fps.filter(f => parseFloat(f.concentration.ratio) === 0).length,
  highTL: fps.filter(f => parseFloat(f.single.textlikeness) >= 70).length,
  highTextLike: fps.filter(f => f.strokeConsistency.textLikeCount > 150).length
};

console.log('网格特征:');
console.log('  全局Gridness>60:', stats.highGridness, '/', fps.length, `(${(stats.highGridness/fps.length*100).toFixed(1)}%)`);
console.log('  ROI是网格:', stats.roiIsGrid, '/', fps.length, `(${(stats.roiIsGrid/fps.length*100).toFixed(1)}%)`);

console.log('\n覆盖一致性:');
console.log('  OC<25:', stats.lowOC, '/', fps.length, `(${(stats.lowOC/fps.length*100).toFixed(1)}%)`);
console.log('  OC<20:', stats.veryLowOC, '/', fps.length, `(${(stats.veryLowOC/fps.length*100).toFixed(1)}%)`);

console.log('\nAlpha特征:');
console.log('  Alpha<40:', stats.lowAlpha, '/', fps.length, `(${(stats.lowAlpha/fps.length*100).toFixed(1)}%)`);
console.log('  Alpha<30:', stats.veryLowAlpha, '/', fps.length, `(${(stats.veryLowAlpha/fps.length*100).toFixed(1)}%)`);

console.log('\n空间集中度:');
console.log('  Concentration<1.0:', stats.lowConc, '/', fps.length, `(${(stats.lowConc/fps.length*100).toFixed(1)}%)`);
console.log('  Concentration<0.5:', stats.veryLowConc, '/', fps.length, `(${(stats.veryLowConc/fps.length*100).toFixed(1)}%)`);
console.log('  Concentration=0:', stats.zeroConc, '/', fps.length, `(${(stats.zeroConc/fps.length*100).toFixed(1)}%)`);

console.log('\n文本特征:');
console.log('  TL>=70:', stats.highTL, '/', fps.length, `(${(stats.highTL/fps.length*100).toFixed(1)}%)`);
console.log('  TextLikeCount>150:', stats.highTextLike, '/', fps.length, `(${(stats.highTextLike/fps.length*100).toFixed(1)}%)`);

console.log('\n=== 精准打击模式分析 ===\n');

const pattern1 = fps.filter(f => 
  f.roiGridness.isGrid && 
  parseFloat(f.single.overlayConsistency) < 25 && 
  parseFloat(f.single.alphaLike) < 40
);
console.log('模式1 [ROI网格+低OC(<25)+低Alpha(<40)]:', pattern1.length, '/', fps.length, `(${(pattern1.length/fps.length*100).toFixed(1)}%)`);

const pattern2 = fps.filter(f => 
  parseFloat(f.gridness.score) > 60 && 
  parseFloat(f.concentration.ratio) < 0.8 && 
  parseFloat(f.single.alphaLike) < 40
);
console.log('模式2 [高全局网格(>60)+低集中度(<0.8)+低Alpha(<40)]:', pattern2.length, '/', fps.length, `(${(pattern2.length/fps.length*100).toFixed(1)}%)`);

const pattern3 = fps.filter(f => 
  parseFloat(f.concentration.ratio) === 0 && 
  parseFloat(f.roiGridness.score) < 40
);
console.log('模式3 [零集中度+低ROI网格(<40)]:', pattern3.length, '/', fps.length, `(${(pattern3.length/fps.length*100).toFixed(1)}%)`);

const pattern4 = fps.filter(f => 
  parseFloat(f.single.overlayConsistency) < 18 && 
  parseFloat(f.single.alphaLike) < 35
);
console.log('模式4 [极低OC(<18)+低Alpha(<35)]:', pattern4.length, '/', fps.length, `(${(pattern4.length/fps.length*100).toFixed(1)}%)`);

const pattern5 = fps.filter(f => 
  (f.gridness.isGrid || f.roiGridness.isGrid) && 
  parseFloat(f.single.overlayConsistency) < 28 && 
  parseFloat(f.concentration.ratio) < 1.0 && 
  parseFloat(f.single.alphaLike) < 45
);
console.log('模式5 [任意网格+低OC(<28)+低集中度(<1.0)+中低Alpha(<45)]:', pattern5.length, '/', fps.length, `(${(pattern5.length/fps.length*100).toFixed(1)}%)`);

// 新增更激进的模式
const pattern6 = fps.filter(f => 
  (f.gridness.isGrid || f.roiGridness.isGrid) && 
  parseFloat(f.single.overlayConsistency) < 30 && 
  parseFloat(f.single.alphaLike) < 50 &&
  parseFloat(f.concentration.ratio) < 1.2
);
console.log('模式6 [任意网格+OC(<30)+Alpha(<50)+集中度(<1.2)]:', pattern6.length, '/', fps.length, `(${(pattern6.length/fps.length*100).toFixed(1)}%)`);

// 检查真水印是否会被误杀
console.log('\n=== 真水印保护检查 ===\n');
const tps = data.results.filter(r => expectedWatermarked.includes(r.filename));
tps.forEach(tp => {
  console.log(`${tp.filename}:`);
  console.log(`  模式1命中: ${tp.roiGridness.isGrid && parseFloat(tp.single.overlayConsistency) < 25 && parseFloat(tp.single.alphaLike) < 40}`);
  console.log(`  模式2命中: ${parseFloat(tp.gridness.score) > 60 && parseFloat(tp.concentration.ratio) < 0.8 && parseFloat(tp.single.alphaLike) < 40}`);
  console.log(`  模式3命中: ${parseFloat(tp.concentration.ratio) === 0 && parseFloat(tp.roiGridness.score) < 40}`);
  console.log(`  模式4命中: ${parseFloat(tp.single.overlayConsistency) < 18 && parseFloat(tp.single.alphaLike) < 35}`);
  console.log(`  模式5命中: ${(tp.gridness.isGrid || tp.roiGridness.isGrid) && parseFloat(tp.single.overlayConsistency) < 28 && parseFloat(tp.concentration.ratio) < 1.0 && parseFloat(tp.single.alphaLike) < 45}`);
  console.log(`  模式6命中: ${(tp.gridness.isGrid || tp.roiGridness.isGrid) && parseFloat(tp.single.overlayConsistency) < 30 && parseFloat(tp.single.alphaLike) < 50 && parseFloat(tp.concentration.ratio) < 1.2}`);
  console.log(`  特征: TL=${tp.single.textlikeness.toFixed(1)} OC=${tp.single.overlayConsistency.toFixed(1)} AL=${tp.single.alphaLike.toFixed(1)}`);
  console.log(`  Grid=${tp.gridness.score} ROIGrid=${tp.roiGridness.score} Conc=${tp.concentration.ratio}\n`);
});

console.log('=== TOP 15 假阳性详细信息 ===\n');
fps.slice(0, 15).forEach((f, i) => {
  console.log(`${i + 1}. ${f.filename}`);
  console.log(`   TL=${f.single.textlikeness.toFixed(1)} OC=${f.single.overlayConsistency.toFixed(1)} AL=${f.single.alphaLike.toFixed(1)} WE=${(f.single.whiteEdgeRatio || 0).toFixed(1)}`);
  console.log(`   Grid=${f.gridness.score} isGrid=${f.gridness.isGrid} | ROI Grid=${f.roiGridness.score} isGrid=${f.roiGridness.isGrid}`);
  console.log(`   Conc=${f.concentration.ratio} textInROI=${f.concentration.textInROI}/${f.concentration.textTotal}`);
  console.log(`   LineCov=${f.phase5.roiLineCoverage} delta=${f.phase5.deltaSingle}`);
});
