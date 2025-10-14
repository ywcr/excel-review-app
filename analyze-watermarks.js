const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Helper functions from watermark detector
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

async function analyzeImage(imagePath) {
  const img = await loadImage(imagePath);
  
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.floor(img.width * scale);
  const height = Math.floor(img.height * scale);
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const gray = toGrayscale(data);
  const grad = computeGradients(gray, width, height);
  const edgeMap = buildEdgeMap(grad.mag, width, height, 30);
  
  const edgeInfo = analyzeEdgeDistribution(data, width, height);
  const whiteness = computeWhitenessNearEdges(data, edgeMap, width, height);
  const angleCoh = computeAngleCoherence(grad.ori, grad.mag, width, height, 30);
  
  // Compute average gradient magnitude
  let gradSum = 0;
  let gradCount = 0;
  for (let i = 0; i < grad.mag.length; i++) {
    if (edgeMap[i]) {
      gradSum += grad.mag[i];
      gradCount++;
    }
  }
  const avgGrad = gradCount > 0 ? gradSum / gradCount : 0;
  
  return {
    filename: path.basename(imagePath),
    size: `${width}×${height}`,
    totalEdges: edgeInfo.totalEdges,
    centerRatio: (edgeInfo.centerRatio * 100).toFixed(2),
    positionScore: edgeInfo.positionScore.toFixed(2),
    whiteness: whiteness.toFixed(2),
    angleCoh: angleCoh.toFixed(2),
    avgGrad: avgGrad.toFixed(2)
  };
}

async function main() {
  const baseDir = 'D:/yaowei/excel-review-app/temp/extracted-images';
  
  // Watermarked images
  const watermarkedImages = [
    'image196.jpeg',
    'image197.jpeg',
    'image198.png'
  ];
  
  // Sample non-watermarked images (various types)
  const nonWatermarkedImages = [
    'image1.png',
    'image10.jpeg',
    'image50.jpeg',
    'image100.jpeg',
    'image150.png',
    'image195.png'
  ];
  
  console.log('\n=== WATERMARKED IMAGES (应检测为有水印) ===\n');
  for (const img of watermarkedImages) {
    const imgPath = path.join(baseDir, img);
    if (fs.existsSync(imgPath)) {
      const result = await analyzeImage(imgPath);
      console.log(JSON.stringify(result, null, 2));
    }
  }
  
  console.log('\n=== NON-WATERMARKED IMAGES (应检测为无水印) ===\n');
  for (const img of nonWatermarkedImages) {
    const imgPath = path.join(baseDir, img);
    if (fs.existsSync(imgPath)) {
      const result = await analyzeImage(imgPath);
      console.log(JSON.stringify(result, null, 2));
    }
  }
}

main().catch(console.error);
