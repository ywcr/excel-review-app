const fs = require('fs');
const path = require('path');

// 从测试代码中复制检测函数
async function analyzeAllImages() {
  const { detectWatermark } = require('./test-watermark-images.js');
  const baseDir = 'D:/yaowei/excel-review-app/temp/extracted-images';
  
  const allFiles = fs.readdirSync(baseDir);
  const imageFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  const expectedWatermarked = new Set(['image196.jpeg', 'image197.jpeg', 'image198.png']);
  const falsePositives = [];
  const trueWatermarks = [];
  
  console.log(`\n=== 分析 ${imageFiles.length} 张图片的Single特征 ===\n`);
  
  for (let i = 0; i < imageFiles.length; i++) {
    const img = imageFiles[i];
    const imgPath = path.join(baseDir, img);
    
    if (i % 20 === 0) {
      console.log(`处理进度: ${i}/${imageFiles.length}...`);
    }
    
    try {
      const result = await detectWatermark(imgPath);
      
      const singleFeatures = {
        file: img,
        textlikeness: parseFloat(result.single.textlikeness),
        overlayConsistency: parseFloat(result.single.overlayConsistency),
        alphaLike: parseFloat(result.single.alphaLike),
        whiteEdgeRatio: parseFloat(result.single.whiteEdgeRatio) || 0,
        singleScore: parseFloat(result.single.score),
        confidence: parseFloat(result.confidence)
      };
      
      if (result.hasWatermark && !expectedWatermarked.has(img)) {
        falsePositives.push(singleFeatures);
      } else if (expectedWatermarked.has(img)) {
        trueWatermarks.push(singleFeatures);
      }
    } catch (error) {
      // ignore
    }
  }
  
  console.log(`\n处理完成！\n`);
  console.log(`假阳性: ${falsePositives.length}`);
  console.log(`真水印: ${trueWatermarks.length}\n`);
  
  // 统计分析
  analyzeFeatureDistribution(falsePositives, trueWatermarks);
}

function analyzeFeatureDistribution(fps, tws) {
  console.log('='.repeat(70));
  console.log('📊 Single特征分布分析');
  console.log('='.repeat(70));
  
  const features = ['textlikeness', 'overlayConsistency', 'alphaLike', 'whiteEdgeRatio'];
  
  features.forEach(feature => {
    console.log(`\n【${feature}】`);
    
    // 假阳性统计
    const fpValues = fps.map(fp => fp[feature]).filter(v => !isNaN(v));
    const fpAvg = fpValues.reduce((a,b) => a+b, 0) / fpValues.length;
    const fpMin = Math.min(...fpValues);
    const fpMax = Math.max(...fpValues);
    
    console.log(`假阳性 (${fpValues.length}个):`);
    console.log(`  平均值: ${fpAvg.toFixed(2)}`);
    console.log(`  范围: ${fpMin.toFixed(2)} - ${fpMax.toFixed(2)}`);
    
    // 分布区间
    const ranges = [
      { name: '0-20', min: 0, max: 20 },
      { name: '20-40', min: 20, max: 40 },
      { name: '40-60', min: 40, max: 60 },
      { name: '60-80', min: 60, max: 80 },
      { name: '80-100', min: 80, max: 100 }
    ];
    
    console.log(`  分布:`);
    ranges.forEach(range => {
      const count = fpValues.filter(v => v >= range.min && v < range.max).length;
      const pct = (count / fpValues.length * 100).toFixed(1);
      console.log(`    ${range.name}: ${count} (${pct}%)`);
    });
    
    // 真水印统计
    if (tws.length > 0) {
      const twValues = tws.map(tw => tw[feature]).filter(v => !isNaN(v));
      const twAvg = twValues.reduce((a,b) => a+b, 0) / twValues.length;
      
      console.log(`真水印 (${twValues.length}个):`);
      console.log(`  平均值: ${twAvg.toFixed(2)}`);
      twValues.forEach((v, i) => {
        console.log(`    ${tws[i].file}: ${v.toFixed(2)}`);
      });
      
      // 区分度
      const diff = Math.abs(fpAvg - twAvg);
      console.log(`  区分度: ${diff.toFixed(2)} (真水印均值 - 假阳性均值)`);
    }
  });
  
  // 高分假阳性样本
  console.log('\n' + '='.repeat(70));
  console.log('🔥 高分假阳性样本 (Single Score > 65)');
  console.log('='.repeat(70));
  
  const highScoreFP = fps.filter(fp => fp.singleScore > 65).sort((a,b) => b.singleScore - a.singleScore);
  
  console.log(`共 ${highScoreFP.length} 个\n`);
  
  highScoreFP.slice(0, 10).forEach((fp, i) => {
    console.log(`${i+1}. ${fp.file} - Score: ${fp.singleScore.toFixed(2)}`);
    console.log(`   TL=${fp.textlikeness.toFixed(2)}, OC=${fp.overlayConsistency.toFixed(2)}, AL=${fp.alphaLike.toFixed(2)}, WE=${fp.whiteEdgeRatio.toFixed(2)}`);
  });
  
  if (highScoreFP.length > 10) {
    console.log(`... 还有 ${highScoreFP.length - 10} 个`);
  }
  
  // 特征相关性分析
  console.log('\n' + '='.repeat(70));
  console.log('📈 特征与置信度的相关性');
  console.log('='.repeat(70));
  
  features.forEach(feature => {
    // 简单相关性：高特征值样本的平均置信度
    const highFeature = fps.filter(fp => fp[feature] > 60);
    const lowFeature = fps.filter(fp => fp[feature] <= 60);
    
    if (highFeature.length > 0 && lowFeature.length > 0) {
      const highAvgConf = highFeature.reduce((a,b) => a+b.confidence, 0) / highFeature.length;
      const lowAvgConf = lowFeature.reduce((a,b) => a+b.confidence, 0) / lowFeature.length;
      
      console.log(`\n${feature} > 60:`);
      console.log(`  样本数: ${highFeature.length}, 平均置信度: ${highAvgConf.toFixed(2)}`);
      console.log(`${feature} <= 60:`);
      console.log(`  样本数: ${lowFeature.length}, 平均置信度: ${lowAvgConf.toFixed(2)}`);
      console.log(`  差异: ${(highAvgConf - lowAvgConf).toFixed(2)}`);
    }
  });
}

// 运行分析
// 注意：这个脚本需要能够导入 detectWatermark，所以我们需要确保它是导出的
console.log('注意：此脚本需要修改 test-watermark-images.js 导出 detectWatermark 函数');
console.log('建议：直接在 test-watermark-images.js 中添加类似的分析逻辑\n');
