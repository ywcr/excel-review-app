const fs = require('fs');
const path = require('path');

// 读取最新测试结果
const resultsPath = path.join(__dirname, 'temp/extracted-images/results-bplus.json');
const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const results = resultsData.results || [];

const targetImages = ['image196.jpeg', 'image197.jpeg', 'image198.png'];

console.log('=== 路径匹配调试分析 ===\n');

for (const imgName of targetImages) {
  const result = results.find(r => r.filename === imgName);
  if (!result) {
    console.log(`❌ ${imgName}: 未找到结果`);
    continue;
  }

  // 使用JSON中直接保存的字段
  const sf = result.single || {};
  const ei = result.edgeInfo || {};
  const conc = result.concentrationInfo || {};
  const stroke = result.strokeConsistency || {};
  const rg = result.roiGridness || {};
  
  console.log(`\n📊 ${imgName}:`);
  const conf = typeof result.confidence === 'number' ? result.confidence.toFixed(2) : result.confidence || 'N/A';
  console.log(`  检测结果: ${result.hasWatermark ? '✅ 有水印' : '❌ 无水印'} (置信度: ${conf})`);
  console.log(`\n  核心特征:`);
  console.log(`    positionWeight: ${sf.positionWeight || 'N/A'}`);
  console.log(`    textlikeness: ${typeof sf.textlikeness === 'number' ? sf.textlikeness.toFixed(1) : 'N/A'}`);
  console.log(`    alphaLike: ${typeof sf.alphaLike === 'number' ? sf.alphaLike.toFixed(1) : 'N/A'}`);
  console.log(`    overlayConsistency: ${typeof sf.overlayConsistency === 'number' ? sf.overlayConsistency.toFixed(1) : 'N/A'}`);
  console.log(`    whiteEdgeRatio: ${typeof sf.whiteEdgeRatio === 'number' ? sf.whiteEdgeRatio.toFixed(1) : '0.0'}`);
  console.log(`\n  位置特征:`);
  const ps = ei.positionScore;
  console.log(`    edgeInfo.positionScore: ${typeof ps === 'number' ? ps.toFixed(1) : (ps || 'N/A')}`);
  console.log(`\n  集中度:`);
  console.log(`    concentrationRatio: ${typeof conc.concentrationRatio === 'number' ? conc.concentrationRatio.toFixed(2) : 'N/A'}`);
  console.log(`\n  笔画:`);
  console.log(`    textLikeCount: ${stroke.textLikeCount || 'N/A'}`);
  console.log(`\n  网格:`);
  const rgn = rg.gridness;
  console.log(`    roiGridness.gridness: ${typeof rgn === 'number' ? rgn.toFixed(1) : (rgn || 'N/A')}`);
  console.log(`    roiGridness.isGrid: ${rg.isGrid || false}`);
  
  // 检查edgeTextWatermarkPath条件
  console.log(`\n  🔍 edgeTextWatermarkPath 条件检查:`);
  const checks = {
    'positionWeight >= 70': sf.positionWeight >= 70,
    'textlikeness >= 85': sf.textlikeness >= 85,
    'concentrationRatio >= 0.5': conc.concentrationRatio >= 0.5,
    'concentrationRatio <= 3.0': conc.concentrationRatio <= 3.0,
    'alphaLike >= 25': sf.alphaLike >= 25,
    'textLikeCount >= 80': stroke.textLikeCount >= 80,
    'textLikeCount <= 1200': stroke.textLikeCount <= 1200,
    'positionScore >= 65': ei.positionScore >= 65,
    'whiteEdgeRatio >= 8 OR positionWeight >= 85': (sf.whiteEdgeRatio || 0) >= 8 || sf.positionWeight >= 85,
    'roiGridness <= 95': rg.gridness <= 95
  };
  
  for (const [condition, pass] of Object.entries(checks)) {
    console.log(`    ${pass ? '✅' : '❌'} ${condition}`);
  }
  
  const allPass = Object.values(checks).every(v => v);
  console.log(`\n  结论: ${allPass ? '✅ 满足edgeTextWatermarkPath' : '❌ 不满足edgeTextWatermarkPath'}`);
}
