/**
 * Node.js 环境水印检测测试
 * 使用 sharp 和 jimp 进行图片分析
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Jimp } = require("jimp");

// 已知有水印的图片
const KNOWN_WATERMARKS = [
  "image1990.png",
  "image1991.png",
  "image1992.png",
  "image1993.png",
  "image1994.png",
  "image1995.png",
  "image1996.png",
  "image1997.png",
];

const mediaDir = path.join(__dirname, "temp/media");

// 简化的水印检测函数（Node.js版本）
async function detectWatermarkSimple(imagePath) {
  try {
    const image = await Jimp.fromFile(imagePath);
    const { width, height } = image.bitmap;

    // 定义检测区域（边缘区域）
    const regionRatio = 0.15;
    const regions = [
      {
        name: "topLeft",
        x: 0,
        y: 0,
        w: Math.floor(width * regionRatio),
        h: Math.floor(height * regionRatio),
      },
      {
        name: "topRight",
        x: Math.floor(width * (1 - regionRatio)),
        y: 0,
        w: Math.floor(width * regionRatio),
        h: Math.floor(height * regionRatio),
      },
      {
        name: "bottomLeft",
        x: 0,
        y: Math.floor(height * (1 - regionRatio)),
        w: Math.floor(width * regionRatio),
        h: Math.floor(height * regionRatio),
      },
      {
        name: "bottomRight",
        x: Math.floor(width * (1 - regionRatio)),
        y: Math.floor(height * (1 - regionRatio)),
        w: Math.floor(width * regionRatio),
        h: Math.floor(height * regionRatio),
      },
      {
        name: "centerBottom",
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.15),
      },
    ];

    let detectedRegions = [];
    let totalScore = 0;

    for (const region of regions) {
      const score = analyzeRegion(image, region);
      // 详细日志
      if (KNOWN_WATERMARKS.includes(path.basename(imagePath))) {
        console.log(
          `    [DEBUG] ${region.name}: 边缘=${score.avgEdgeStrength.toFixed(
            2
          )}, 亮度=${score.avgBrightness.toFixed(2)}, 置信度=${
            score.confidence
          }`
        );
      }
      if (score.hasWatermarkFeatures) {
        detectedRegions.push(region.name);
        totalScore += score.confidence;
      }
    }

    const confidence =
      detectedRegions.length > 0 ? totalScore / detectedRegions.length : 0;

    return {
      hasWatermark: detectedRegions.length > 0,
      regionCount: detectedRegions.length,
      regions: detectedRegions,
      confidence: confidence,
      width,
      height,
    };
  } catch (error) {
    return {
      hasWatermark: false,
      regionCount: 0,
      regions: [],
      confidence: 0,
      error: error.message,
    };
  }
}

// 分析单个区域
function analyzeRegion(image, region) {
  const { x, y, w, h } = region;

  let edgeStrength = 0;
  let contrastSum = 0;
  let pixelCount = 0;
  let brightnessSum = 0;

  // 采样分析（性能优化）
  const sampleStep = 2;

  for (
    let row = y;
    row < y + h && row < image.bitmap.height;
    row += sampleStep
  ) {
    for (
      let col = x;
      col < x + w && col < image.bitmap.width;
      col += sampleStep
    ) {
      const idx = (row * image.bitmap.width + col) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSum += brightness;

      // 简化的边缘检测
      if (col < x + w - 1 && row < y + h - 1) {
        const rightIdx = (row * image.bitmap.width + col + 1) * 4;
        const downIdx = ((row + 1) * image.bitmap.width + col) * 4;

        const rightBrightness =
          0.299 * image.bitmap.data[rightIdx] +
          0.587 * image.bitmap.data[rightIdx + 1] +
          0.114 * image.bitmap.data[rightIdx + 2];
        const downBrightness =
          0.299 * image.bitmap.data[downIdx] +
          0.587 * image.bitmap.data[downIdx + 1] +
          0.114 * image.bitmap.data[downIdx + 2];

        const gradH = Math.abs(brightness - rightBrightness);
        const gradV = Math.abs(brightness - downBrightness);

        edgeStrength += Math.sqrt(gradH * gradH + gradV * gradV);
      }

      pixelCount++;
    }
  }

  const avgBrightness = brightnessSum / pixelCount;
  const avgEdgeStrength = edgeStrength / pixelCount;

  // 判断是否有水印特征（基于实际测试优化阈值）
  // 实际测试显示：水印边缘强度范围 0.5-24，平均11
  const hasHighEdge = avgEdgeStrength > 5; // 从15降低到5
  const hasModerateBrightness = avgBrightness > 20 && avgBrightness < 230; // 放宽范围

  const hasWatermarkFeatures = hasHighEdge && hasModerateBrightness;
  const confidence = hasWatermarkFeatures
    ? Math.min(100, avgEdgeStrength * 3)
    : 0;

  return {
    hasWatermarkFeatures,
    confidence,
    avgEdgeStrength,
    avgBrightness,
  };
}

// 主测试函数
async function runTest() {
  console.log("\n🧪 水印检测测试开始\n");
  console.log("=".repeat(80));

  const results = {
    tested: 0,
    detected: 0,
    truePositive: 0,
    falsePositive: 0,
    trueNegative: 0,
    falseNegative: 0,
    details: [],
  };

  // 获取所有图片
  const files = fs
    .readdirSync(mediaDir)
    .filter((f) => /\.(png|jpeg|jpg)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

  console.log(`\n📊 总图片数: ${files.length}`);
  console.log(`✅ 已知有水印: ${KNOWN_WATERMARKS.length} 张`);
  console.log(`❌ 应该无水印: ${files.length - KNOWN_WATERMARKS.length} 张\n`);

  // 先测试已知有水印的图片
  console.log("\n🎯 测试有水印的图片 (image1990-1997):\n");
  for (const filename of KNOWN_WATERMARKS) {
    const filepath = path.join(mediaDir, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  ${filename}: 文件不存在`);
      continue;
    }

    const result = await detectWatermarkSimple(filepath);
    const isKnownWatermark = true;

    results.tested++;

    // 显示详细信息用于调试
    const debugInfo = result.error
      ? `错误: ${result.error}`
      : `置信度: ${result.confidence.toFixed(2)}, 区域: ${result.regionCount}`;

    if (result.hasWatermark) {
      results.detected++;
      results.truePositive++;
      console.log(
        `  ✅ ${filename}: 检测到水印 (${debugInfo}, ${result.regions.join(
          ", "
        )})`
      );
    } else {
      results.falseNegative++;
      console.log(`  ❌ ${filename}: 漏报 (${debugInfo})`);
    }

    results.details.push({
      filename,
      isKnownWatermark,
      result,
      classification: result.hasWatermark ? "TP" : "FN",
    });
  }

  // 测试部分无水印图片（抽样）
  console.log("\n\n📷 测试无水印图片 (抽样 30 张):\n");
  const normalImages = files.filter((f) => !KNOWN_WATERMARKS.includes(f));
  const sampleSize = Math.min(30, normalImages.length);
  const sampleStep = Math.floor(normalImages.length / sampleSize);

  let falsePositives = [];

  for (let i = 0; i < sampleSize; i++) {
    const filename = normalImages[i * sampleStep];
    const filepath = path.join(mediaDir, filename);

    const result = await detectWatermarkSimple(filepath);
    const isKnownWatermark = false;

    results.tested++;

    if (result.hasWatermark) {
      results.detected++;
      results.falsePositive++;
      falsePositives.push(filename);
      console.log(
        `  ❌ ${filename}: 误报 (置信度: ${result.confidence.toFixed(
          2
        )}, 区域: ${result.regionCount}, ${result.regions.join(", ")})`
      );
    } else {
      results.trueNegative++;
      console.log(`  ✅ ${filename}: 正确识别为无水印`);
    }

    results.details.push({
      filename,
      isKnownWatermark,
      result,
      classification: result.hasWatermark ? "FP" : "TN",
    });
  }

  // 统计结果
  console.log("\n\n" + "=".repeat(80));
  console.log("\n📊 测试结果统计:\n");

  const accuracy = (
    ((results.truePositive + results.trueNegative) / results.tested) *
    100
  ).toFixed(1);
  const precision =
    results.truePositive > 0
      ? (
          (results.truePositive /
            (results.truePositive + results.falsePositive)) *
          100
        ).toFixed(1)
      : 0;
  const recall =
    results.truePositive > 0
      ? (
          (results.truePositive /
            (results.truePositive + results.falseNegative)) *
          100
        ).toFixed(1)
      : 0;
  const falsePositiveRate = (
    (results.falsePositive / (results.falsePositive + results.trueNegative)) *
    100
  ).toFixed(1);

  console.log(`总测试: ${results.tested} 张`);
  console.log(`检测到水印: ${results.detected} 张`);
  console.log(`\n分类统计:`);
  console.log(`  真阳性 (TP): ${results.truePositive} - 正确检测到水印`);
  console.log(`  假阳性 (FP): ${results.falsePositive} - 误报 ⚠️`);
  console.log(`  真阴性 (TN): ${results.trueNegative} - 正确识别无水印`);
  console.log(`  假阴性 (FN): ${results.falseNegative} - 漏报 ⚠️`);

  console.log(`\n性能指标:`);
  console.log(`  准确率 (Accuracy): ${accuracy}%`);
  console.log(`  精确率 (Precision): ${precision}%`);
  console.log(`  召回率 (Recall): ${recall}%`);
  console.log(`  误报率: ${falsePositiveRate}%`);

  // 评估
  console.log(`\n🎯 评估:\n`);

  if (results.falseNegative === 0) {
    console.log(`  ✅ 召回率 100% - 所有水印都被检测到！`);
  } else {
    console.log(`  ⚠️  漏报 ${results.falseNegative} 张 - 需要降低阈值`);
  }

  if (parseFloat(falsePositiveRate) < 5) {
    console.log(`  ✅ 误报率 ${falsePositiveRate}% - 低于目标 5%！`);
  } else if (parseFloat(falsePositiveRate) < 10) {
    console.log(`  ⚠️  误报率 ${falsePositiveRate}% - 接近目标，但可以改进`);
  } else {
    console.log(`  ❌ 误报率 ${falsePositiveRate}% - 需要优化过滤器`);
  }

  if (parseFloat(accuracy) >= 95) {
    console.log(`  ✅ 准确率 ${accuracy}% - 达到目标！`);
  } else {
    console.log(`  ⚠️  准确率 ${accuracy}% - 低于目标 95%`);
  }

  // 误报详情
  if (falsePositives.length > 0) {
    console.log(`\n\n⚠️  误报图片列表 (需要优化):\n`);
    falsePositives.forEach((filename, i) => {
      const detail = results.details.find((d) => d.filename === filename);
      console.log(
        `  ${i + 1}. ${filename} (置信度: ${detail.result.confidence.toFixed(
          2
        )}, 区域: ${detail.result.regions.join(", ")})`
      );
    });
  }

  // 保存结果
  const resultJson = {
    timestamp: new Date().toISOString(),
    summary: {
      tested: results.tested,
      detected: results.detected,
      truePositive: results.truePositive,
      falsePositive: results.falsePositive,
      trueNegative: results.trueNegative,
      falseNegative: results.falseNegative,
      accuracy: parseFloat(accuracy),
      precision: parseFloat(precision),
      recall: parseFloat(recall),
      falsePositiveRate: parseFloat(falsePositiveRate),
    },
    details: results.details.map((d) => ({
      filename: d.filename,
      isKnownWatermark: d.isKnownWatermark,
      classification: d.classification,
      detected: d.result.hasWatermark,
      confidence: d.result.confidence,
      regionCount: d.result.regionCount,
      regions: d.result.regions,
    })),
  };

  const resultPath = path.join(__dirname, "test-watermark-results.json");
  fs.writeFileSync(resultPath, JSON.stringify(resultJson, null, 2));
  console.log(`\n\n💾 测试结果已保存到: test-watermark-results.json`);

  console.log("\n" + "=".repeat(80) + "\n");

  return resultJson;
}

// 执行测试
runTest().catch(console.error);
