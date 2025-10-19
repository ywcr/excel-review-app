/**
 * 最终优化版水印检测测试
 * 基于成功的边缘检测（召回率100%）+ 优化的过滤器
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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

async function detectWatermarkOptimized(imagePath, options = {}) {
  const { disableExtraFilters = false } = options;
  try {
    const image = sharp(imagePath);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    // 定义检测区域
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
    const regionFeatures = {};

    for (const region of regions) {
      const features = analyzeRegion(data, width, height, channels, region);
      regionFeatures[region.name] = features;
      if (features.hasWatermarkFeatures) {
        detectedRegions.push(region.name);
        totalScore += features.confidence;
      }
    }

    let confidence =
      detectedRegions.length > 0 ? totalScore / detectedRegions.length : 0;
    let hasWatermark = detectedRegions.length > 0;
    let filterReason = null;
    let watermarkLevel = "none";

    // ==================== 位置模式匹配 ====================
    const positionPattern = analyzePositionPattern(detectedRegions);
    if (positionPattern.isCommonPattern) {
      confidence += positionPattern.bonus;
      filterReason = `pattern:${positionPattern.patternType}`;
    }

    // ==================== 异常高置信度检测 ====================
    // 🎯 优化：分两级检测异常高值
    // 1. 超高值（>80）：无论是否匹配模式都降级
    if (confidence > 80) {
      console.log(`    [异常] 置信度${confidence.toFixed(2)} 超高，降低40%`);
      confidence *= 0.6; // 降低40%
      filterReason = (filterReason || "") + "_超高值调整";
    }
    // 2. 高值（65-80）：不匹配模式才降级
    else if (
      confidence > 65 &&
      !positionPattern.isCommonPattern &&
      detectedRegions.length >= 4
    ) {
      console.log(
        `    [异常] 置信度${confidence.toFixed(2)} 过高且不符合模式，降低30%`
      );
      confidence *= 0.7;
      filterReason = (filterReason || "") + "_高值调整";
    }

    // ==================== 优化的过滤器 ====================
    if (hasWatermark) {
      // 🎯 关键优化：基于底部3区域模式的智能过滤
      const hasBottomThreePattern = [
        "bottomLeft",
        "bottomRight",
        "centerBottom",
      ].every((r) => detectedRegions.includes(r));

      // 过滤器1: 5区域检测 - 区分水印 vs 内容
      if (detectedRegions.length === 5) {
        if (hasBottomThreePattern && confidence >= 40) {
          // 包含底部3区域 + 高置信度 = 很可能是水印
          filterReason = (filterReason || "") + "_keep_likely_watermark";
        } else if (confidence < 35) {
          // 5区域但置信度很低 = 内容丰富
          hasWatermark = false;
          confidence = 0;
          filterReason = "rich_content";
        }
      }

      // 过滤器2: 4区域检测 - 检查模式
      else if (detectedRegions.length === 4) {
        if (
          hasBottomThreePattern ||
          positionPattern.patternType === "four_corners"
        ) {
          // 匹配常见模式 = 保留
          filterReason = (filterReason || "") + "_common_pattern";
        } else if (confidence < 30) {
          // 4区域但不匹配模式且置信度低 = 可能是内容
          confidence *= 0.6;
          filterReason = "uncommon_pattern_low_conf";
          if (confidence < 25) hasWatermark = false;
        }
      }

      // 过滤器3: 3区域检测 - 底部3区域优先
      else if (detectedRegions.length === 3) {
        if (hasBottomThreePattern && confidence >= 25) {
          // 底部3区域模式 = 保留
          filterReason = (filterReason || "") + "_bottom_three";
        } else if (!hasBottomThreePattern && confidence < 25) {
          // 非底部3区域且置信度低 = 过滤
          hasWatermark = false;
          confidence = 0;
          filterReason = "low_conf_non_pattern";
        }
      }

      // 过滤器4: 1-2区域 - 需要较高置信度
      else if (detectedRegions.length <= 2) {
        // 单一底部角落有加成
        const isSingleBottom =
          detectedRegions.length === 1 &&
          (detectedRegions.includes("bottomRight") ||
            detectedRegions.includes("bottomLeft"));

        if (isSingleBottom && confidence >= 30) {
          // 单一底部角且置信度足够 = 保留
          filterReason = "single_bottom";
        } else if (confidence < 30) {
          // 置信度过低 = 过滤（从25提高到30）
          hasWatermark = false;
          confidence = 0;
          filterReason = "low_conf_few_regions";
        }
      }

      // 🎯 新增过滤器5: 整体置信度不足
      // 即使前面没被过滤，置信度<25也标记为无水印
      if (hasWatermark && confidence < 25) {
        hasWatermark = false;
        confidence = 0;
        filterReason = "overall_low_confidence";
      }

      if (!disableExtraFilters) {
        // 过滤器6: 高饱和横幅（店招）+ 强水平边缘主导
        // 扩展：任意一个顶部角满足条件即可触发（很多店招只覆盖一侧）
        if (hasWatermark && detectedRegions.length >= 3) {
          const topLeftF = regionFeatures["topLeft"];
          const topRightF = regionFeatures["topRight"];
          const checkTop = (f) =>
            f &&
            f.avgSaturation > 0.35 &&
            f.dominantOrientation === "horizontal" &&
            f.orientationDominance > 0.6;
          // 进一步要求：顶部与底部色相差异较大（店招常是绿色/蓝色，与地面灰色形成强对比）
          const bottomAvgHue = (() => {
            const bl = regionFeatures["bottomLeft"];
            const br = regionFeatures["bottomRight"];
            const cb = regionFeatures["centerBottom"];
            const arr = [bl, br, cb].filter(Boolean);
            if (arr.length === 0) return -1;
            const sum = arr.reduce(
              (s, r) => s + (isFinite(r.avgHue) ? r.avgHue : 0),
              0
            );
            return sum / arr.length;
          })();
          const topHue = (() => {
            const tops = [topLeftF, topRightF].filter(Boolean);
            if (tops.length === 0) return -1;
            const sum = tops.reduce(
              (s, r) => s + (isFinite(r.avgHue) ? r.avgHue : 0),
              0
            );
            return sum / tops.length;
          })();
          const hueDiff = (a, b) => {
            if (a < 0 || b < 0) return 180;
            const d = Math.abs(a - b);
            return Math.min(d, 360 - d);
          };
          if (
            (checkTop(topLeftF) || checkTop(topRightF)) &&
            hueDiff(topHue, bottomAvgHue) > 40
          ) {
            confidence *= 0.65; // 适度降低
            filterReason =
              (filterReason || "") + "_saturated_banner_horizontal";
            if (confidence < 28) {
              hasWatermark = false;
            }
          }
        }

        // 过滤器7: 道路/地面横线主导（底部灰度、低饱和、强水平）
        if (hasWatermark && detectedRegions.length >= 3) {
          const bl = regionFeatures["bottomLeft"];
          const br = regionFeatures["bottomRight"];
          const cb = regionFeatures["centerBottom"];
          if (bl && br) {
            const bottoms = cb ? [bl, br, cb] : [bl, br];
            const avgSat =
              bottoms.reduce((s, r) => s + r.avgSaturation, 0) / bottoms.length;
            const horizDom =
              bottoms.reduce(
                (s, r) =>
                  s +
                  (r.dominantOrientation === "horizontal"
                    ? r.orientationDominance
                    : 0),
                0
              ) / bottoms.length;
            // 低饱和、强水平、边缘覆盖中等偏低 -> 更像地面/道路纹理
            const avgEdgeCoverage =
              bottoms.reduce((s, r) => s + r.edgeCoverage, 0) / bottoms.length;
            if (avgSat < 0.3 && horizDom > 0.65 && avgEdgeCoverage < 0.3) {
              confidence *= 0.6;
              filterReason = (filterReason || "") + "_road_horizontal_lines";
              if (
                positionPattern.patternType === "bottom_three" &&
                confidence < 40
              ) {
                hasWatermark = false;
              }
            }
          }
        }
      }
    }

    if (hasWatermark) {
      watermarkLevel = getWatermarkLevel(confidence);
    }

    return {
      hasWatermark,
      watermarkLevel,
      confidence,
      regionCount: detectedRegions.length,
      regions: detectedRegions,
      positionPattern: positionPattern.patternType,
      filterApplied: filterReason !== null,
      filterReason,
      width,
      height,
    };
  } catch (error) {
    return {
      hasWatermark: false,
      confidence: 0,
      error: error.message,
    };
  }
}

function analyzeRegion(data, width, height, channels, region) {
  const { x, y, w, h } = region;

  let edgeStrength = 0;
  let brightnessSum = 0;
  let pixelCount = 0;
  let saturationSum = 0;
  let hWeight = 0; // 水平梯度权重
  let vWeight = 0; // 垂直梯度权重
  let edgeCount = 0; // 强边缘像素计数
  let hueSinSum = 0; // 用于环形平均
  let hueCosSum = 0;
  let satPixelCount = 0;

  for (let row = y; row < Math.min(y + h, height); row++) {
    for (let col = x; col < Math.min(x + w, width); col++) {
      const idx = (row * width + col) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSum += brightness;

      // 饱和度/色相 (基于HSV)
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const delta = maxRGB - minRGB;
      const saturation = maxRGB === 0 ? 0 : delta / maxRGB; // [0,1]
      saturationSum += saturation;
      // 仅在较高饱和度时计入色相平均，避免灰度干扰
      if (saturation > 0.2 && delta > 0) {
        let hue;
        if (maxRGB === r) hue = ((g - b) / delta) % 6;
        else if (maxRGB === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue *= 60; // 转度
        if (hue < 0) hue += 360;
        const rad = (hue * Math.PI) / 180;
        hueSinSum += Math.sin(rad);
        hueCosSum += Math.cos(rad);
        satPixelCount++;
      }

      // 边缘检测
      if (
        col < Math.min(x + w, width) - 1 &&
        row < Math.min(y + h, height) - 1
      ) {
        const rightIdx = (row * width + col + 1) * channels;
        const downIdx = ((row + 1) * width + col) * channels;

        const rightBrightness =
          0.299 * data[rightIdx] +
          0.587 * data[rightIdx + 1] +
          0.114 * data[rightIdx + 2];
        const downBrightness =
          0.299 * data[downIdx] +
          0.587 * data[downIdx + 1] +
          0.114 * data[downIdx + 2];

        const gradH = Math.abs(brightness - rightBrightness);
        const gradV = Math.abs(brightness - downBrightness);

        const mag = Math.sqrt(gradH * gradH + gradV * gradV);
        edgeStrength += mag;
        hWeight += gradH;
        vWeight += gradV;
        if (mag > 8) edgeCount++;
      }

      pixelCount++;
    }
  }

  const avgBrightness = brightnessSum / pixelCount;
  const avgEdgeStrength = edgeStrength / pixelCount;
  const avgSaturation = saturationSum / pixelCount; // [0,1]

  const totalWeight = hWeight + vWeight;
  const orientationDominance =
    totalWeight > 0 ? Math.max(hWeight, vWeight) / totalWeight : 0;
  const dominantOrientation = hWeight >= vWeight ? "horizontal" : "vertical";
  const edgeCoverage = pixelCount > 0 ? edgeCount / pixelCount : 0; // [0,1]
  const avgHue =
    satPixelCount > 0 ? (Math.atan2(hueSinSum, hueCosSum) * 180) / Math.PI : -1; // [-180,180]
  const normalizedHue = avgHue < 0 ? avgHue + 360 : avgHue; // [0,360)

  // 基于实际测试数据优化
  const hasHighEdge = avgEdgeStrength > 5;
  const hasModerateBrightness = avgBrightness > 20 && avgBrightness < 230;

  const hasWatermarkFeatures = hasHighEdge && hasModerateBrightness;
  const confidence = hasWatermarkFeatures
    ? Math.min(100, avgEdgeStrength * 3)
    : 0;

  return {
    hasWatermarkFeatures,
    confidence,
    avgEdgeStrength,
    avgBrightness,
    avgSaturation,
    orientationDominance,
    dominantOrientation,
    edgeCoverage,
    avgHue: normalizedHue,
  };
}

function analyzePositionPattern(regions) {
  if (!regions || regions.length === 0) {
    return { isCommonPattern: false, patternType: "none", bonus: 0 };
  }

  const patterns = {
    bottomThree: {
      regions: ["bottomLeft", "bottomRight", "centerBottom"],
      bonus: 10,
      name: "bottom_three",
    },
    fourCorners: {
      regions: ["topLeft", "topRight", "bottomLeft", "bottomRight"],
      bonus: 8,
      name: "four_corners",
    },
    bottomCorners: {
      regions: ["bottomLeft", "bottomRight"],
      bonus: 8,
      name: "bottom_corners",
    },
  };

  if (patterns.bottomThree.regions.every((r) => regions.includes(r))) {
    return {
      isCommonPattern: true,
      patternType: patterns.bottomThree.name,
      bonus: patterns.bottomThree.bonus,
    };
  }

  if (patterns.fourCorners.regions.every((r) => regions.includes(r))) {
    return {
      isCommonPattern: true,
      patternType: patterns.fourCorners.name,
      bonus: patterns.fourCorners.bonus,
    };
  }

  if (patterns.bottomCorners.regions.every((r) => regions.includes(r))) {
    return {
      isCommonPattern: true,
      patternType: patterns.bottomCorners.name,
      bonus: patterns.bottomCorners.bonus,
    };
  }

  if (
    regions.length === 1 &&
    (regions.includes("bottomRight") || regions.includes("bottomLeft"))
  ) {
    return {
      isCommonPattern: true,
      patternType: "single_bottom",
      bonus: 5,
    };
  }

  return { isCommonPattern: false, patternType: "uncommon", bonus: 0 };
}

function getWatermarkLevel(confidence) {
  if (confidence >= 65) return "certain";
  if (confidence >= 50) return "very_likely";
  if (confidence >= 35) return "likely";
  if (confidence >= 25) return "suspicious";
  return "none";
}

async function runTest() {
  console.log("\n🧪 最终优化版水印检测测试\n");
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

  // 测试有水印的图片
  console.log("\n🎯 测试有水印的图片 (image1990-1997):\n");
  const disableExtraFilters = process.env.WM_NO_EXTRA === "1";
  for (const filename of KNOWN_WATERMARKS) {
    const filepath = path.join(mediaDir, filename);
    if (!fs.existsSync(filepath)) continue;

    const result = await detectWatermarkOptimized(filepath, {
      disableExtraFilters,
    });
    results.tested++;

    if (result.hasWatermark) {
      results.detected++;
      results.truePositive++;
      console.log(
        `  ✅ ${filename}: ${result.watermarkLevel
          .toUpperCase()
          .padEnd(12)} (置信度:${result.confidence.toFixed(2)}, 区域:${
          result.regionCount
        }, 模式:${result.positionPattern})`
      );
    } else {
      results.falseNegative++;
      console.log(`  ❌ ${filename}: 漏报 (${result.filterReason})`);
    }

    results.details.push({
      filename,
      isKnownWatermark: true,
      result,
      classification: result.hasWatermark ? "TP" : "FN",
    });
  }

  // 测试无水印图片（全量或抽样）
  const runAll = process.env.WM_ALL === "1";
  console.log(`\n\n📷 测试无水印图片 (${runAll ? "全量" : "抽样 30 张"}):\n`);
  const normalImages = files.filter((f) => !KNOWN_WATERMARKS.includes(f));
  const sampleSize = runAll
    ? normalImages.length
    : Math.min(30, normalImages.length);
  const sampleStep = runAll ? 1 : Math.floor(normalImages.length / sampleSize);

  let falsePositives = [];

  for (let i = 0; i < sampleSize; i++) {
    const filename = normalImages[i * sampleStep];
    const filepath = path.join(mediaDir, filename);

    const result = await detectWatermarkOptimized(filepath, {
      disableExtraFilters,
    });
    results.tested++;

    if (result.hasWatermark) {
      results.detected++;
      results.falsePositive++;
      falsePositives.push(filename);
      console.log(
        `  ❌ ${filename}: 误报 (${result.watermarkLevel.toUpperCase()}, ${result.confidence.toFixed(
          2
        )})`
      );
    } else {
      results.trueNegative++;
      console.log(
        `  ✅ ${filename}: 正确 (${result.filterReason || "置信度低"})`
      );
    }

    results.details.push({
      filename,
      isKnownWatermark: false,
      result,
      classification: result.hasWatermark ? "FP" : "TN",
    });
  }

  // 统计结果
  console.log("\n\n" + "=".repeat(80));
  console.log("\n📊 最终测试结果:\n");

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
  console.log(`\n✅ 核心指标:`);
  console.log(
    `   召回率 (Recall): ${recall}% ${
      results.falseNegative === 0 ? "✅✅✅✅✅" : "❌"
    }`
  );
  console.log(
    `   准确率 (Accuracy): ${accuracy}% ${
      parseFloat(accuracy) >= 75 ? "✅✅✅✅" : "⚠️"
    }`
  );
  console.log(
    `   精确率 (Precision): ${precision}% ${
      parseFloat(precision) >= 40 ? "✅✅" : "⚠️"
    }`
  );
  console.log(
    `   误报率: ${falsePositiveRate}% ${
      parseFloat(falsePositiveRate) < 35 ? "✅✅" : "⚠️"
    }`
  );

  console.log(`\n📋 详细统计:`);
  console.log(`   真阳性 (TP): ${results.truePositive}`);
  console.log(`   假阳性 (FP): ${results.falsePositive}`);
  console.log(`   真阴性 (TN): ${results.trueNegative}`);
  console.log(`   假阴性 (FN): ${results.falseNegative}`);

  // 级别分布
  console.log(`\n📊 检测级别分布:\n`);
  const levelStats = {
    certain: { total: 0, tp: 0, fp: 0 },
    very_likely: { total: 0, tp: 0, fp: 0 },
    likely: { total: 0, tp: 0, fp: 0 },
    suspicious: { total: 0, tp: 0, fp: 0 },
  };

  results.details.forEach((d) => {
    const level = d.result.watermarkLevel;
    if (level && level !== "none" && levelStats[level]) {
      levelStats[level].total++;
      if (d.isKnownWatermark) {
        levelStats[level].tp++;
      } else {
        levelStats[level].fp++;
      }
    }
  });

  for (const [level, stats] of Object.entries(levelStats)) {
    if (stats.total > 0) {
      const accuracy = ((stats.tp / stats.total) * 100).toFixed(1);
      console.log(
        `   ${level.padEnd(12)}: ${stats.total}张 (真:${stats.tp}, 误:${
          stats.fp
        }, 准确率:${accuracy}%)`
      );
    }
  }

  // 评估
  console.log(`\n🎯 最终评估:\n`);

  if (parseFloat(recall) === 100) {
    console.log(`   ✅✅✅ 召回率 100% - 所有水印都被检测到！`);
  } else {
    console.log(`   ❌ 召回率 ${recall}% - 有漏报`);
  }

  if (parseFloat(falsePositiveRate) < 30) {
    console.log(`   ✅✅ 误报率 ${falsePositiveRate}% - 优秀！`);
  } else if (parseFloat(falsePositiveRate) < 40) {
    console.log(`   ✅ 误报率 ${falsePositiveRate}% - 达标`);
  } else {
    console.log(`   ⚠️  误报率 ${falsePositiveRate}% - 需要改进`);
  }

  if (parseFloat(accuracy) >= 75) {
    console.log(`   ✅✅ 准确率 ${accuracy}% - 达到目标！`);
  } else if (parseFloat(accuracy) >= 70) {
    console.log(`   ✅ 准确率 ${accuracy}% - 接近目标`);
  } else {
    console.log(`   ⚠️  准确率 ${accuracy}% - 可以接受`);
  }

  // 保存结果
  const resultJson = {
    timestamp: new Date().toISOString(),
    version: "optimized_final",
    summary: {
      tested: results.tested,
      truePositive: results.truePositive,
      falsePositive: results.falsePositive,
      trueNegative: results.trueNegative,
      falseNegative: results.falseNegative,
      accuracy: parseFloat(accuracy),
      precision: parseFloat(precision),
      recall: parseFloat(recall),
      falsePositiveRate: parseFloat(falsePositiveRate),
      levelStats,
    },
    details: results.details.map((d) => ({
      filename: d.filename,
      isKnownWatermark: d.isKnownWatermark,
      classification: d.classification,
      level: d.result.watermarkLevel,
      confidence: d.result.confidence,
      regionCount: d.result.regionCount,
      regions: d.result.regions,
      positionPattern: d.result.positionPattern,
    })),
  };

  const resultPath = path.join(__dirname, "test-watermark-results-final.json");
  fs.writeFileSync(resultPath, JSON.stringify(resultJson, null, 2));
  console.log(`\n💾 结果已保存: test-watermark-results-final.json`);

  console.log("\n" + "=".repeat(80));
  console.log("\n🎉 测试完成！\n");

  return resultJson;
}

runTest().catch(console.error);
