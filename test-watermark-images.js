const fs = require('fs');
const path = require('path');

// 复制水印检测核心逻辑
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

function buildEdgeMap(mag, w, h, threshold) {
  const edge = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    edge[i] = mag[i] > threshold ? 1 : 0;
  }
  return edge;
}

function analyzeEdgeDistribution(data, width, height) {
  const edgeThreshold = 30;
  const centerMargin = 0.3;
  const gray = toGrayscale(data);
  const grad = computeGradients(gray, width, height);
  
  let totalEdges = 0;
  let centerEdges = 0;
  let edgePositionSum = 0;
  
  const cx1 = Math.floor(width * centerMargin);
  const cx2 = Math.floor(width * (1 - centerMargin));
  const cy1 = Math.floor(height * centerMargin);
  const cy2 = Math.floor(height * (1 - centerMargin));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (grad.mag[idx] > edgeThreshold) {
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

function analyzeRegionConsistency(data, width, height) {
  const blockSize = 32;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);
  
  if (blocksX < 2 || blocksY < 2) return { score: 0, regions: [] };
  
  const blocks = [];
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let sum = 0, count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += gray;
          count++;
        }
      }
      blocks.push({ avg: sum / count });
    }
  }
  
  let similarCount = 0;
  for (let i = 0; i < blocks.length - 1; i++) {
    const diff = Math.abs(blocks[i].avg - blocks[i + 1].avg);
    if (diff < 20) similarCount++;
  }
  
  const score = (similarCount / (blocks.length - 1)) * 100;
  return { score, regions: [] };
}

function analyzeColorFeatures(data, width, height) {
  let rSum = 0, gSum = 0, bSum = 0;
  const pixels = width * height;
  
  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
  }
  
  const rAvg = rSum / pixels;
  const gAvg = gSum / pixels;
  const bAvg = bSum / pixels;
  
  const maxDiff = Math.max(Math.abs(rAvg - gAvg), Math.abs(gAvg - bAvg), Math.abs(rAvg - bAvg));
  const isMonochromatic = maxDiff < 10;
  const uniformity = 1 - (maxDiff / 255);
  
  const score = isMonochromatic ? 80 : uniformity * 60;
  return { uniformity, isMonochromatic, score };
}

function analyzeAlphaFeatures(data) {
  let semiTransparentCount = 0;
  let fullyTransparentCount = 0;
  let opaqueCount = 0;
  
  const step = 5;
  for (let i = 3; i < data.length; i += 4 * step) {
    const alpha = data[i];
    if (alpha === 0) {
      fullyTransparentCount++;
    } else if (alpha < 255) {
      semiTransparentCount++;
    } else {
      opaqueCount++;
    }
  }
  
  const totalPixels = data.length / 4 / step;
  const semiTransparentRatio = totalPixels > 0 ? semiTransparentCount / totalPixels : 0;
  
  let score = 0;
  if (semiTransparentRatio > 0.1) score = Math.min(semiTransparentRatio * 200, 100);
  else if (semiTransparentRatio > 0.01) score = semiTransparentRatio * 100;
  
  return { semiTransparentRatio, score };
}

function computeWhitenessNearEdges(data, edgeMap, w, h) {
  let edgePixelCount = 0;
  let whiteEdgeCount = 0;
  
  for (let i = 0; i < w * h; i++) {
    if (edgeMap[i]) {
      edgePixelCount++;
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      if (maxc >= 200 && (maxc - minc) <= 30) {
        whiteEdgeCount++;
      }
    }
  }
  
  return edgePixelCount > 0 ? (whiteEdgeCount / edgePixelCount) * 100 : 0;
}

function computeAngleCoherence(ori, mag, w, h, threshold) {
  const angles = [];
  for (let i = 0; i < w * h; i++) {
    if (mag[i] > threshold) {
      angles.push(ori[i]);
    }
  }
  
  if (angles.length === 0) return 0;
  
  const buckets = new Array(36).fill(0);
  angles.forEach(a => {
    let normalized = ((a % 180) + 180) % 180;
    let bucket = Math.floor(normalized / 5);
    buckets[bucket]++;
  });
  
  const maxBucket = Math.max(...buckets);
  return (maxBucket / angles.length) * 100;
}

function computePeriodicityScore(edgeMap, w, h, angles) {
  // 简化的周期性检测
  return 0; // 对于单个logo水印，周期性通常很低
}

function estimateStrokeWidth(edgeMap, w, h) {
  let sum = 0, count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (edgeMap[y * w + x]) {
        let width = 1;
        for (let dx = 1; dx < 20 && x + dx < w; dx++) {
          if (!edgeMap[y * w + x + dx]) break;
          width++;
        }
        sum += width;
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

function mapStrokeWidthToScore(sw) {
  if (sw >= 2 && sw <= 8) return 100;
  if (sw < 2) return sw * 50;
  return Math.max(0, 100 - (sw - 8) * 10);
}

function analyzeSingleWatermark(gray, rgba, edge, grad, width, height, cfg) {
  // ROI 定义
  const eb = Math.floor(Math.min(width, height) * cfg.roi.edgeBand);
  const cb = Math.floor(Math.min(width, height) * cfg.roi.cornerBox);
  const rois = [
    { name: '左上', x: 0, y: 0, w: cb, h: cb, posW: 100 },
    { name: '右上', x: width - cb, y: 0, w: cb, h: cb, posW: 100 },
    { name: '左下', x: 0, y: height - cb, w: cb, h: cb, posW: 100 },
    { name: '右下', x: width - cb, y: height - cb, w: cb, h: cb, posW: 100 },
    { name: '上边', x: 0, y: 0, w: width, h: eb, posW: 60 },
    { name: '下边', x: 0, y: height - eb, w: width, h: eb, posW: 60 },
    { name: '左边', x: 0, y: 0, w: eb, h: height, posW: 60 },
    { name: '右边', x: width - eb, y: 0, w: eb, h: height, posW: 60 }
  ];

  let best = { name: '', textlikeness: 0, overlayConsistency: 0, positionWeight: 0, alphaLike: 0, whiteEdgeRatio: 0 };

  for (const r of rois) {
    const feat = computeROITextAndOverlay(gray, rgba, edge, grad, width, height, r);
    const tl = feat.textlikeness;
    const oc = feat.overlayConsistency;
    const al = feat.alphaLike;
    const we = feat.whiteEdgeRatio || 0;
    const pw = r.posW;
    // 选择得分更高的 ROI
    const tmpScore = 0.4*tl + 0.25*oc + 0.2*pw + 0.15*al;
    const bestScore = 0.4*best.textlikeness + 0.25*best.overlayConsistency + 0.2*best.positionWeight + 0.15*best.alphaLike;
    if (tmpScore > bestScore) {
      best = { name: r.name, textlikeness: tl, overlayConsistency: oc, positionWeight: pw, alphaLike: al, whiteEdgeRatio: we };
    }
  }
  return best;
}

function computeROITextAndOverlay(gray, rgba, edge, grad, width, height, roi) {
  // 采样
  const step = 2;
  let edges = 0, total = 0;
  const bins = 8; const hist = new Float32Array(bins);
  let sum = 0, sum2 = 0; // 用于亮度方差
  let brightEdgeCnt = 0;
  for (let y = roi.y; y < roi.y + roi.h; y += step) {
    for (let x = roi.x; x < roi.x + roi.w; x += step) {
      if (x<=0||y<=0||x>=width-1||y>=height-1) continue;
      const i = y*width + x;
      const g = grad.mag[i];
      if (g > 25) {
        edges++;
        let a = grad.ori[i];
        let b = Math.floor((a/180)*bins); if (b>=bins) b=bins-1; hist[b] += 1;
        const idx = i*4; const r = rgba[idx], gg = rgba[idx+1], bb = rgba[idx+2];
        const maxc = Math.max(r,gg,bb), minc=Math.min(r,gg,bb);
        if (maxc-minc<12 && maxc>200) brightEdgeCnt++;
      }
      total++;
      sum += gray[i]; sum2 += gray[i]*gray[i];
    }
  }
  const edgeDensity = total? edges/total : 0;
  const variance = total? (sum2/total - Math.pow(sum/total,2)) : 0;
  // 文本样性：边缘密度+方向主峰占比
  const histSum = hist.reduce((a,b)=>a+b,0);
  const maxBin = histSum? Math.max(...hist) : 0;
  const textlikeness = Math.min(100, (edgeDensity*350) + (histSum? (maxBin/histSum)*100 : 0));
  // 覆盖一致性：亮度方差越小越像覆盖；再叠加白色边缘比例
  const overlayConsistency = Math.min(100, (Math.max(0, 50 - variance))*1.2 + (edgeDensity>0? (brightEdgeCnt/edges)*40:0));
  // 伪alpha：明亮提升但边缘不过强
  const alphaLike = Math.max(0, Math.min(100, (sum/Math.max(1,total))/2 - (edgeDensity*50)));
  // ROI 白边比例（只看边缘处近白像素占比）
  const whiteEdgeRatio = edges>0 ? Math.min(100, (brightEdgeCnt/edges)*100) : 0;
  return { textlikeness, overlayConsistency, alphaLike, whiteEdgeRatio };
}

// 主检测函数（使用Canvas的jimp替代方案）
async function detectWatermark(imagePath) {
  const { Jimp } = require('jimp');
  
  const image = await Jimp.read(imagePath);
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.bitmap.width, image.bitmap.height));
  
  if (scale < 1) {
    await image.resize({ w: Math.floor(image.bitmap.width * scale), h: Math.floor(image.bitmap.height * scale) });
  }
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const data = image.bitmap.data;
  
  // 配置（方案4优化版 - Scheme 4 with lowered thresholds）
  const CFG = {
    preprocess: { maxSize: 1200, edgeThreshold: 30, blurRadius: 1.0 },
    gating: {
      centerEdgePenalty: { centerRatio: 0.70, factor: 0.50 },
      uniformRegionPenalty: { regionScore: 75, whiteness: 12, factor: 0.65 },
      lowAnglePenalty: { angleCoherence: 25, factor: 0.75 }
    },
    repeated: {
      angles: [-45,-30,-15,0,15,30,45],
      thresholds: { periodicity: 58, angleCoherence: 55, whiteness: 25 },
      weights: { periodicity: 0.5, angleCoherence: 0.25, whiteness: 0.15, strokeWidth: 0.10 },
      pass: 45
    },
    single: {
      roi: { edgeBand: 0.15, cornerBox: 0.20 },
      thresholds: { 
        textlikeness: 50,  // raised to reduce FP
        overlayConsistency: 28,  // raised to reduce FP
        alphaLike: 18,  // raised to reduce FP
        alphaLikeStrong: 32,  // raised to reduce FP
        whiteEdgeMin: 5,  // raised to reduce FP
        positionMin: 60,  // raised to reduce FP
        strokeWidthMax: 12  // raised from 11
      },
      weights: { textlikeness: 0.4, overlayConsistency: 0.25, position: 0.2, alphaLike: 0.15 },
      pass: 30  // lowered from 36
    },
    fusion: { scale: { repeated: 0.7, single: 0.76, baseline: 1.0 }, decision: 35 }  // slight boost to single
  };
  
  // 基础分析
  const gray = toGrayscale(data);
  const grad = computeGradients(gray, width, height);
  const edgeMap = buildEdgeMap(grad.mag, width, height, CFG.preprocess.edgeThreshold);
  
  const edgeInfo = analyzeEdgeDistribution(data, width, height);
  const regionInfo = analyzeRegionConsistency(data, width, height);
  const colorInfo = analyzeColorFeatures(data, width, height);
  const alphaInfo = analyzeAlphaFeatures(data);
  
  // Repeated分支
  const periodicity = computePeriodicityScore(edgeMap, width, height, CFG.repeated.angles);
  const angleCoh = computeAngleCoherence(grad.ori, grad.mag, width, height, CFG.preprocess.edgeThreshold);
  const whiteness = computeWhitenessNearEdges(data, edgeMap, width, height);
  const strokeWidth = estimateStrokeWidth(edgeMap, width, height);
  const strokeScore = mapStrokeWidthToScore(strokeWidth);
  
  let repeatedScore = 0;
  let repeatedPassed = false;
  const repeatedGate = (periodicity >= CFG.repeated.thresholds.periodicity) && 
                       (angleCoh >= CFG.repeated.thresholds.angleCoherence) && 
                       (whiteness >= CFG.repeated.thresholds.whiteness);
  if (repeatedGate) {
    repeatedScore = CFG.repeated.weights.periodicity * periodicity + 
                    CFG.repeated.weights.angleCoherence * angleCoh + 
                    CFG.repeated.weights.whiteness * whiteness + 
                    CFG.repeated.weights.strokeWidth * strokeScore;
    repeatedPassed = repeatedScore >= CFG.repeated.pass;
  }
  
  // Single分支
  const singleFeatures = analyzeSingleWatermark(gray, data, edgeMap, grad, width, height, CFG.single);
  let singleScore = 0;
  let singlePassed = false;
  
  // Alternative path: very high TL+AL can pass even with low OC
  const highTLAL = (singleFeatures.textlikeness >= 85 && singleFeatures.alphaLike >= 70);
  
  if (
    singleFeatures.textlikeness >= CFG.single.thresholds.textlikeness &&
    singleFeatures.positionWeight >= CFG.single.thresholds.positionMin &&
    strokeWidth <= CFG.single.thresholds.strokeWidthMax &&
    (
      singleFeatures.overlayConsistency >= CFG.single.thresholds.overlayConsistency ||
      (singleFeatures.alphaLike >= CFG.single.thresholds.alphaLikeStrong && 
       ((singleFeatures.whiteEdgeRatio || 0) >= CFG.single.thresholds.whiteEdgeMin || angleCoh >= 45)) ||
      highTLAL
    )
  ) {
    singleScore = CFG.single.weights.textlikeness * singleFeatures.textlikeness + 
                  CFG.single.weights.overlayConsistency * singleFeatures.overlayConsistency + 
                  CFG.single.weights.position * singleFeatures.positionWeight + 
                  CFG.single.weights.alphaLike * singleFeatures.alphaLike;
    singlePassed = singleScore >= CFG.single.pass;
  }
  
  // Baseline（方案4增强版 - moderate restriction）
  let baseline = 0;
  // Balance between recall and precision
  if (edgeInfo.positionScore > 65) baseline += edgeInfo.positionScore * 0.28;
  if (regionInfo.score > 35) baseline += regionInfo.score * 0.16;
  if (colorInfo.uniformity > 0.72 || colorInfo.isMonochromatic) baseline += colorInfo.score * 0.19;
  if (alphaInfo.score > 22) baseline += alphaInfo.score * 0.11;
  baseline = Math.min(baseline, 100);
  
  // 惩罚项（更严格）
  if (edgeInfo.centerRatio >= CFG.gating.centerEdgePenalty.centerRatio) baseline *= CFG.gating.centerEdgePenalty.factor;
  if (regionInfo.score >= CFG.gating.uniformRegionPenalty.regionScore && whiteness < CFG.gating.uniformRegionPenalty.whiteness) baseline *= CFG.gating.uniformRegionPenalty.factor;
  if (angleCoh < CFG.gating.lowAnglePenalty.angleCoherence) baseline *= CFG.gating.lowAnglePenalty.factor;
  
  // 融合
  let fused = Math.max(
    CFG.fusion.scale.repeated * (repeatedPassed ? repeatedScore : 0),
    CFG.fusion.scale.single * (singlePassed ? singleScore : 0),
    CFG.fusion.scale.baseline * baseline
  );
  
  const confidence = Math.min(100, fused);
  const hasWatermark = confidence >= CFG.fusion.decision;
  
  return {
    filename: path.basename(imagePath),
    size: `${width}×${height}`,
    hasWatermark,
    confidence: confidence.toFixed(2),
    repeated: {
      periodicity: periodicity.toFixed(2),
      angleCoh: angleCoh.toFixed(2),
      whiteness: whiteness.toFixed(2),
      strokeWidth: strokeWidth.toFixed(2),
      score: repeatedScore.toFixed(2),
      passed: repeatedPassed
    },
    single: {
      ...singleFeatures,
      score: singleScore.toFixed(2),
      passed: singlePassed
    },
    baseline: baseline.toFixed(2),
    edgeInfo: {
      totalEdges: edgeInfo.totalEdges,
      centerRatio: (edgeInfo.centerRatio * 100).toFixed(2),
      positionScore: edgeInfo.positionScore.toFixed(2)
    },
    decision: `置信度 ${confidence.toFixed(2)} ${hasWatermark ? '>=' : '<'} 阈值 ${CFG.fusion.decision}`
  };
}

// 主函数
async function main() {
  const baseDir = 'D:/yaowei/excel-review-app/temp/extracted-images';
  
  // 读取所有图片文件
  const allFiles = fs.readdirSync(baseDir);
  const imageFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  console.log(`\n=== 🔍 批量检测 ${imageFiles.length} 张图片 ===\n`);
  
  const expectedWatermarked = new Set(['image196.jpeg', 'image197.jpeg', 'image198.png']);
  const results = [];
  let detectedCount = 0;
  let watermarkedDetected = 0;
  let falsePositives = [];
  let falseNegatives = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const img = imageFiles[i];
    const imgPath = path.join(baseDir, img);
    
    if (i % 10 === 0) {
      console.log(`处理进度: ${i}/${imageFiles.length}...`);
    }
    
    try {
      const result = await detectWatermark(imgPath);
      results.push(result);
      
      // Log detailed info for watermarked images
      if (expectedWatermarked.has(img)) {
        console.log(`\n[WATERMARKED] ${img}:`);
        console.log(`  Confidence: ${result.confidence}`);
        console.log(`  Single: TL=${result.single.textlikeness}, OC=${result.single.overlayConsistency}, AL=${result.single.alphaLike}, WE=${result.single.whiteEdgeRatio}, PW=${result.single.positionWeight}`);
        console.log(`  Single Score: ${result.single.score}, Passed: ${result.single.passed}`);
        console.log(`  Baseline: ${result.baseline}, EdgePos: ${result.edgeInfo.positionScore}`);
        console.log(`  Decision: ${result.hasWatermark ? 'DETECTED' : 'MISSED'}`);
      }
      
      if (result.hasWatermark) {
        detectedCount++;
        if (expectedWatermarked.has(img)) {
          watermarkedDetected++;
        } else {
          falsePositives.push({
            name: img,
            confidence: result.confidence,
            singleScore: result.single.score,
            baseline: result.baseline
          });
        }
      } else {
        if (expectedWatermarked.has(img)) {
          falseNegatives.push({
            name: img,
            confidence: result.confidence
          });
        }
      }
    } catch (error) {
      console.error(`❌ ${img} 分析失败: ${error.message}`);
    }
  }
  
  console.log(`\n处理进度: ${imageFiles.length}/${imageFiles.length}...完成！\n`);
  
  // 统计报告
  console.log('='.repeat(70));
  console.log('📊 检测结果汇总');
  console.log('='.repeat(70));
  console.log(`\n总图片数: ${imageFiles.length}`);
  console.log(`检测为有水印: ${detectedCount} 张`);
  console.log(`检测为无水印: ${imageFiles.length - detectedCount} 张\n`);
  
  console.log('期望结果:');
  console.log(`  应有水印: 3 张 (image196, image197, image198)`);
  console.log(`  应无水印: ${imageFiles.length - 3} 张\n`);
  
  const truePositives = watermarkedDetected;
  const trueNegatives = imageFiles.length - 3 - falsePositives.length;
  const accuracy = ((truePositives + trueNegatives) / imageFiles.length * 100).toFixed(2);
  const precision = detectedCount > 0 ? (truePositives / detectedCount * 100).toFixed(2) : 0;
  const recall = (truePositives / 3 * 100).toFixed(2);
  
  console.log('性能指标:');
  console.log(`  ✅ 真阳性 (正确检测有水印): ${truePositives}/3`);
  console.log(`  ✅ 真阴性 (正确检测无水印): ${trueNegatives}/${imageFiles.length - 3}`);
  console.log(`  ❌ 假阳性 (误报): ${falsePositives.length}`);
  console.log(`  ❌ 假阴性 (漏检): ${falseNegatives.length}`);
  console.log(`  📈 准确率: ${accuracy}%`);
  console.log(`  📈 精确率: ${precision}%`);
  console.log(`  📈 召回率: ${recall}%\n`);
  
  if (falsePositives.length > 0) {
    console.log('='.repeat(70));
    console.log(`⚠️  假阳性列表 (${falsePositives.length}张误检为有水印):`);
    console.log('='.repeat(70));
    falsePositives.slice(0, 20).forEach((fp, idx) => {
      console.log(`${idx + 1}. ${fp.name}`);
      console.log(`   置信度: ${fp.confidence}, Single: ${fp.singleScore}, Baseline: ${fp.baseline}`);
    });
    if (falsePositives.length > 20) {
      console.log(`... 还有 ${falsePositives.length - 20} 张 (省略显示)`);
    }
    console.log('');
  }
  
  if (falseNegatives.length > 0) {
    console.log('='.repeat(70));
    console.log(`❌ 假阴性列表 (${falseNegatives.length}张有水印但未检出):`);
    console.log('='.repeat(70));
    falseNegatives.forEach((fn, idx) => {
      console.log(`${idx + 1}. ${fn.name} - 置信度: ${fn.confidence}`);
    });
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('💡 建议:');
  if (falsePositives.length === 0 && falseNegatives.length === 0) {
    console.log('🎉 完美！所有图片都正确分类！');
  } else if (falsePositives.length > 10) {
    console.log(`假阳性率较高 (${(falsePositives.length / (imageFiles.length - 3) * 100).toFixed(1)}%)`);
    console.log('建议: 提高决策阈值 (22 → 25 → 28)');
  } else if (falseNegatives.length > 0) {
    console.log('仍有漏检，建议: 进一步降低阈值或优化特征提取');
  } else {
    console.log(`✅ 配置良好！假阳性率: ${(falsePositives.length / (imageFiles.length - 3) * 100).toFixed(1)}%`);
  }
  console.log('='.repeat(70));
}

main().catch(console.error);
