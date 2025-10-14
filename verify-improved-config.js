const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

// 简化的检测逻辑（使用新配置）
function toGrayscale(data) {
  const n = data.length / 4;
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    gray[i] = Math.floor(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  return gray;
}

function computeGradients(gray, w, h) {
  const mag = new Float32Array(w * h);
  const ori = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = gray[y * w + x + 1] - gray[y * w + x - 1];
      const gy = gray[(y + 1) * w + x] - gray[(y - 1) * w + x];
      const idx = y * w + x;
      mag[idx] = Math.sqrt(gx * gx + gy * gy);
      ori[idx] = Math.atan2(gy, gx) * (180 / Math.PI);
    }
  }
  return { mag, ori };
}

function analyzeEdgeDistribution(data, width, height) {
  const gray = toGrayscale(data);
  const grad = computeGradients(gray, width, height);
  
  let totalEdges = 0;
  let centerEdges = 0;
  let edgePositionSum = 0;
  
  const cx1 = Math.floor(width * 0.3);
  const cx2 = Math.floor(width * 0.7);
  const cy1 = Math.floor(height * 0.3);
  const cy2 = Math.floor(height * 0.7);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (grad.mag[idx] > 30) {
        totalEdges++;
        const isCenter = (x >= cx1 && x <= cx2 && y >= cy1 && y <= cy2);
        if (isCenter) centerEdges++;
        
        const dx = Math.abs(x - width / 2) / (width / 2);
        const dy = Math.abs(y - height / 2) / (height / 2);
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        edgePositionSum += distFromCenter;
      }
    }
  }
  
  const centerRatio = totalEdges > 0 ? centerEdges / totalEdges : 0;
  const avgPosition = totalEdges > 0 ? edgePositionSum / totalEdges : 0;
  const positionScore = avgPosition * 100;
  
  return { totalEdges, centerRatio, positionScore };
}

async function detectWithNewConfig(imagePath) {
  const image = await Jimp.read(imagePath);
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.bitmap.width, image.bitmap.height));
  
  if (scale < 1) {
    await image.resize({ w: Math.floor(image.bitmap.width * scale), h: Math.floor(image.bitmap.height * scale) });
  }
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const data = image.bitmap.data;
  
  // 新配置
  const CFG = {
    preprocess: { maxSize: 1200, edgeThreshold: 30 },
    gating: {
      centerEdgePenalty: { centerRatio: 0.70, factor: 0.50 },
      uniformRegionPenalty: { regionScore: 75, whiteness: 12, factor: 0.65 },
      lowAnglePenalty: { angleCoherence: 25, factor: 0.75 }
    },
    fusion: { scale: { repeated: 0.7, single: 0.75, baseline: 1.2 }, decision: 22 }
  };
  
  const edgeInfo = analyzeEdgeDistribution(data, width, height);
  
  // 简化的baseline计算（方案4增强版）
  let baseline = 0;
  if (edgeInfo.positionScore > 30) baseline += edgeInfo.positionScore * 0.40;
  baseline = Math.min(baseline, 100);
  
  // 简化的惩罚（假设低角度惩罚会触发）
  if (edgeInfo.centerRatio < 0.70) {
    baseline *= CFG.gating.lowAnglePenalty.factor;
  }
  
  // 应用fusion权重
  const confidence = Math.min(100, CFG.fusion.scale.baseline * baseline);
  const hasWatermark = confidence >= CFG.fusion.decision;
  
  return {
    filename: path.basename(imagePath),
    size: `${width}×${height}`,
    hasWatermark,
    confidence: confidence.toFixed(2),
    baseline: baseline.toFixed(2),
    positionScore: edgeInfo.positionScore.toFixed(2),
    centerRatio: (edgeInfo.centerRatio * 100).toFixed(2),
    decision: `${hasWatermark ? '✅ 有水印' : '❌ 无水印'} (置信度 ${confidence.toFixed(2)} ${hasWatermark ? '≥' : '<'} 阈值 ${CFG.fusion.decision})`
  };
}

async function main() {
  const baseDir = 'D:/yaowei/excel-review-app/temp/extracted-images';
  const watermarkedImages = [
    'image196.jpeg',
    'image197.jpeg',
    'image198.png'
  ];
  
  console.log('\n========================================');
  console.log('🎯 验证优化后的配置（方案4）');
  console.log('========================================\n');
  
  console.log('📋 配置说明:');
  console.log('  - Baseline权重: 0.40 (positionScore)');
  console.log('  - Fusion baseline scale: 1.2');
  console.log('  - Decision阈值: 22');
  console.log('  - 惩罚项: 更宽松\n');
  
  console.log('🧪 测试3张有水印图片:\n');
  
  const results = [];
  
  for (const img of watermarkedImages) {
    const imgPath = path.join(baseDir, img);
    if (fs.existsSync(imgPath)) {
      try {
        const result = await detectWithNewConfig(imgPath);
        results.push(result);
        
        console.log(`📸 ${result.filename}`);
        console.log(`   尺寸: ${result.size}`);
        console.log(`   位置分数: ${result.positionScore}`);
        console.log(`   Baseline: ${result.baseline}`);
        console.log(`   置信度: ${result.confidence}`);
        console.log(`   ${result.decision}\n`);
      } catch (error) {
        console.error(`❌ ${img} 分析失败: ${error.message}\n`);
      }
    }
  }
  
  console.log('========================================');
  console.log('📊 总结');
  console.log('========================================\n');
  
  const detected = results.filter(r => r.hasWatermark).length;
  const total = results.length;
  
  console.log(`检测成功率: ${detected}/${total} (${((detected/total)*100).toFixed(1)}%)`);
  
  if (detected === total) {
    console.log('🎉 所有水印图片都成功检测！配置优化成功！');
  } else {
    console.log(`⚠️  仍有 ${total - detected} 张图片未检测到`);
    console.log('建议: 进一步降低decision阈值或增强baseline权重');
  }
  
  console.log('\n下一步: 运行批量测试检查假阳性率');
  console.log('命令: node batch-test-watermarks.js\n');
}

main().catch(console.error);
