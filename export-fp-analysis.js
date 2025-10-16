const fs = require('fs');
const path = require('path');
const { detectWatermark } = require('./public/advanced-watermark-detection.js');

// 主函数
async function main() {
  const baseDir = 'D:/yaowei/excel-review-app/temp/extracted-images';
  
  // 读取所有图片文件
  const allFiles = fs.readdirSync(baseDir);
  const imageFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  console.log(`\n=== 🔍 分析 ${imageFiles.length} 张图片并导出假阳性数据 ===\n`);
  
  const expectedWatermarked = new Set(['image196.jpeg', 'image197.jpeg', 'image198.png']);
  const falsePositives = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const img = imageFiles[i];
    const imgPath = path.join(baseDir, img);
    
    if (i % 10 === 0) {
      console.log(`处理进度: ${i}/${imageFiles.length}...`);
    }
    
    try {
      const result = await detectWatermark(imgPath);
      
      if (result.hasWatermark && !expectedWatermarked.has(img)) {
        falsePositives.push({
          file: img,
          confidence: result.confidence,
          singleScore: result.single.score,
          baseline: result.baseline,
          textlikeness: result.single.textlikeness,
          overlayConsistency: result.single.overlayConsistency,
          alphaLike: result.single.alphaLike,
          gridnessScore: result.gridness.score,
          isGrid: result.gridness.isGrid,
          suppression: result.gridness.suppression,
          textLikeCount: result.strokeConsistency.textLikeCount,
          borderLikeCount: result.strokeConsistency.borderLikeCount,
          concentrationRatio: result.concentration.ratio,
          roiDensity: result.concentration.roiDensity,
          textInROI: result.concentration.textInROI,
          textTotal: result.concentration.textTotal,
          roiGridness: result.roiGridness.score,
          roiIsGrid: result.roiGridness.isGrid
        });
      }
    } catch (error) {
      console.error(`❌ ${img} 分析失败: ${error.message}`);
    }
  }
  
  console.log(`\n处理完成！找到 ${falsePositives.length} 个假阳性样本\n`);
  
  // 生成 CSV
  const csvHeader = 'File,Confidence,SingleScore,Baseline,Textlikeness,OverlayConsistency,AlphaLike,GridnessScore,IsGrid,Suppression,TextLikeCount,BorderLikeCount,ConcentrationRatio,ROIDensity,TextInROI,TextTotal,ROIGridness,ROIIsGrid\n';
  
  const csvRows = falsePositives.map(fp => {
    return [
      fp.file,
      fp.confidence,
      fp.singleScore,
      fp.baseline,
      fp.textlikeness,
      fp.overlayConsistency,
      fp.alphaLike,
      fp.gridnessScore,
      fp.isGrid,
      fp.suppression,
      fp.textLikeCount,
      fp.borderLikeCount,
      fp.concentrationRatio,
      fp.roiDensity,
      fp.textInROI,
      fp.textTotal,
      fp.roiGridness,
      fp.roiIsGrid
    ].join(',');
  }).join('\n');
  
  const csvContent = csvHeader + csvRows;
  const outputPath = path.join(__dirname, 'false-positives-analysis.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`✅ CSV 导出成功: ${outputPath}`);
  
  // 输出统计信息
  console.log('\n=== 📊 假阳性统计分析 ===\n');
  
  // Gridness 分析
  const gridCount = falsePositives.filter(fp => fp.isGrid === 'true').length;
  console.log(`检测为Grid的假阳性: ${gridCount}/${falsePositives.length} (${(gridCount/falsePositives.length*100).toFixed(1)}%)`);
  
  // ROI Gridness 分析
  const roiGridCount = falsePositives.filter(fp => fp.roiIsGrid === 'true').length;
  console.log(`ROI检测为Grid的假阳性: ${roiGridCount}/${falsePositives.length} (${(roiGridCount/falsePositives.length*100).toFixed(1)}%)`);
  
  // Concentration 分布
  const concentrations = falsePositives.map(fp => parseFloat(fp.concentrationRatio));
  const avgConcentration = concentrations.reduce((a,b) => a+b, 0) / concentrations.length;
  const maxConcentration = Math.max(...concentrations);
  const minConcentration = Math.min(...concentrations);
  console.log(`\nConcentration Ratio:`);
  console.log(`  平均值: ${avgConcentration.toFixed(2)}`);
  console.log(`  最大值: ${maxConcentration.toFixed(2)}`);
  console.log(`  最小值: ${minConcentration.toFixed(2)}`);
  
  // 高集中度样本
  const highConc = falsePositives.filter(fp => parseFloat(fp.concentrationRatio) > 1.0);
  console.log(`  集中度 > 1.0: ${highConc.length}/${falsePositives.length}`);
  
  // ROI Gridness 分布
  const roiGridScores = falsePositives.map(fp => parseFloat(fp.roiGridness));
  const avgROIGrid = roiGridScores.reduce((a,b) => a+b, 0) / roiGridScores.length;
  console.log(`\nROI Gridness Score:`);
  console.log(`  平均值: ${avgROIGrid.toFixed(2)}`);
  
  // 全局gridness高但ROI gridness低的样本（理想的假阳性过滤目标）
  const goodCandidates = falsePositives.filter(fp => 
    fp.isGrid === 'true' && fp.roiIsGrid === 'false'
  );
  console.log(`\n全局Grid=true 但 ROI Grid=false: ${goodCandidates.length}/${falsePositives.length}`);
  console.log('这些是理想的可被Phase 3过滤的样本');
}

main().catch(console.error);
