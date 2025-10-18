/**
 * 高级水印检测算法
 * 基于深层像素分析的水印检测，模拟"去水印"工具的检测原理
 * 
 * 核心技术：
 * 1. 频域分析 - 检测重复模式和周期性水印
 * 2. 多尺度梯度分析 - 检测文字和logo的边缘特征
 * 3. 局部二值模式(LBP) - 检测纹理异常
 * 4. 颜色通道差异 - 检测人工添加的水印
 * 5. HSV空间分析 - 检测饱和度和亮度异常
 * 6. 边缘连通性分析 - 区分自然边缘和水印边缘
 */

// ==================== 主检测函数 ====================

/**
 * 高级水印检测 - 使用多种像素级分析技术
 * @param {Uint8Array} imageData - 图片数据
 * @returns {Promise<Object>} 检测结果
 */
async function detectWatermarkAdvanced(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
        detectionMethod: "unsupported",
        analysisDetails: {},
      };
    }

    console.log("[水印检测] 开始高级检测流程...");
    const startTime = performance.now();

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    // 🎯 关键修改：使用更大的尺寸以保留水印细节
    // Excel嵌入图片时会压缩，所以要尽量保留原始细节
    const maxSize = 2000; // 从1000提高到2000，保留更多水印细节
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    console.log(
      `[水印检测] 图片尺寸: 原始=${bitmap.width}x${
        bitmap.height
      }, 处理=${width}x${height}, 缩放比=${(scale * 100).toFixed(1)}%`
    );

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // ==================== 多种分析方法并行执行 ====================

    console.log("[水印检测] 执行像素级分析...");

    // 1. 频域分析 - 检测重复模式
    const frequencyAnalysis = analyzeFrequencyDomain(data, width, height);

    // 2. 梯度一致性分析 - 检测不自然的边缘
    const gradientAnalysis = analyzeGradientConsistency(data, width, height);

    // 3. 纹理特征分析 - 使用简化的LBP
    const textureAnalysis = analyzeTexturePattern(data, width, height);

    // 4. 颜色通道差异分析
    const colorChannelAnalysis = analyzeColorChannelDifference(
      data,
      width,
      height
    );

    // 5. 区域对比分析 - 检测特定区域的异常
    const regionAnalysis = analyzeRegionsAdvanced(data, width, height);

    // 6. 透明度分析（如果有alpha通道）
    const alphaAnalysis = analyzeAlphaChannel(data, width, height);

    console.log("[水印检测] 分析结果:", {
      frequency: frequencyAnalysis.score,
      gradient: gradientAnalysis.score,
      texture: textureAnalysis.score,
      colorChannel: colorChannelAnalysis.score,
      region: regionAnalysis.score,
      alpha: alphaAnalysis.score,
    });

    // ==================== 综合评分 ====================

    // 🎯 优化权重：针对 Excel 压缩图片特点
    // 梯度和区域是主要水印特征且对压缩鲁棒
    // 纹理对压缩伪影太敏感，大幅降低权重
    const weights = {
      gradient: 0.35, // +5% 梯度分析最可靠
      region: 0.3, // +10% 区域分析准确率高
      colorChannel: 0.15, // 保持不变
      frequency: 0.1, // -10% 频域在压缩后不稳定
      alpha: 0.05, // 保持不变
      texture: 0.05, // -5% 大幅降低，容易被压缩伪影干扰
    };

    // 收集检测到水印的区域（在计算最终分数前）
    const watermarkRegions = [
      ...regionAnalysis.detectedRegions,
      ...gradientAnalysis.suspiciousRegions,
      ...textureAnalysis.anomalyRegions,
    ];

    // 去重
    const uniqueRegions = [...new Set(watermarkRegions)];

    // 🎯 新增：分析位置模式，给常见水印模式加成
    const positionPattern = analyzeWatermarkPositionPattern(uniqueRegions);
    let positionBonus = 0;
    if (positionPattern.isCommonPattern) {
      console.log(
        `[位置模式] 匹配常见水印模式: ${positionPattern.patternType}, 加成${positionPattern.bonus}分`
      );
      positionBonus = positionPattern.bonus;
    }

    // 计算总分（包括位置模式加成）
    let totalScore =
      frequencyAnalysis.score * weights.frequency +
      gradientAnalysis.score * weights.gradient +
      textureAnalysis.score * weights.texture +
      colorChannelAnalysis.score * weights.colorChannel +
      regionAnalysis.score * weights.region +
      alphaAnalysis.score * weights.alpha +
      positionBonus; // 位置模式加成

    // 🎯 异常高置信度检测（防止图片内容被高估）
    // 分两级检测：超高值和高值
    if (totalScore > 80) {
      // 超高值（>80）：无论是否匹配模式都降级
      console.log(`[异常检测] 置信度${totalScore.toFixed(2)}超高，降低40%`);
      totalScore *= 0.6; // 降低40%
    } else if (
      totalScore > 65 &&
      !positionPattern.isCommonPattern &&
      uniqueRegions.length >= 4
    ) {
      // 高值（65-80）：不匹配模式才降级
      console.log("[异常检测] 置信度过高但不符合常见水印模式，降低30%");
      totalScore *= 0.7; // 降低30%
    }

    const confidence = Math.min(100, Math.max(0, totalScore));

    // 🎯 优化分级检测策略：更严格的阈值，避免误报
    // 确定有水印: >=65 (提高阈值)
    // 很可能有: >=50
    // 可能有: >=35
    // 轻微可疑: >=25
    // 无水印: <25
    let watermarkLevel = "none";
    let hasWatermark = false;
    let warningMessage = "";

    if (confidence >= 65) {
      hasWatermark = true;
      watermarkLevel = "certain"; // 确定
      warningMessage = "强烈建议人工复核";
    } else if (confidence >= 50) {
      hasWatermark = true;
      watermarkLevel = "very_likely"; // 很可能
      warningMessage = "建议人工复核";
    } else if (confidence >= 35) {
      hasWatermark = true;
      watermarkLevel = "likely"; // 可能
      warningMessage = "建议检查";
    } else if (confidence >= 25) {
      hasWatermark = true;
      watermarkLevel = "suspicious"; // 可疑
      warningMessage = "留意关注";
    }

    const processingTime = (performance.now() - startTime).toFixed(2);
    console.log(
      `[水印检测] 初步结果 - 耗时: ${processingTime}ms, 置信度: ${confidence.toFixed(
        2
      )}, 区域数: ${uniqueRegions.length}`
    );

    // ==================== 负样本过滤（关键优化）====================
    // 🎯 过滤常见误报场景
    const imageFeatures = {
      width,
      height,
      detectedRegions: uniqueRegions,
      regionCount: uniqueRegions.length,
      textureScore: textureAnalysis.score,
      gradientScore: gradientAnalysis.score,
      regionScore: regionAnalysis.score,
      tooManyRegions: regionAnalysis.tooManyRegions,
      avgEntropy: textureAnalysis.avgEntropy,
      hasWatermarkLikeDistribution:
        gradientAnalysis.hasWatermarkLikeDistribution,
    };

    const filterResult = applyFalsePositiveFilters(imageFeatures, {
      hasWatermark,
      watermarkLevel,
      confidence,
    });

    // 应用过滤结果
    if (filterResult.filtered) {
      console.log(`[水印检测] 过滤器触发: ${filterResult.reason}`);
      hasWatermark = filterResult.hasWatermark;
      watermarkLevel = filterResult.watermarkLevel || watermarkLevel;
      confidence = filterResult.confidence;
      warningMessage = filterResult.warningMessage || warningMessage;
    }

    // 清理资源
    canvas.width = 0;
    canvas.height = 0;

    return {
      hasWatermark,
      watermarkLevel, // 新增：水印级别 (certain/very_likely/likely/suspicious/none)
      watermarkRegions: uniqueRegions,
      watermarkConfidence: confidence,
      warningMessage, // 新增：警告信息
      filterApplied: filterResult.filtered, // 新增：是否应用了过滤
      filterReason: filterResult.reason, // 新增：过滤原因
      detectionMethod: "advanced_pixel_analysis",
      processingTime: parseFloat(processingTime),
      analysisDetails: {
        frequencyScore: frequencyAnalysis.score.toFixed(2),
        gradientScore: gradientAnalysis.score.toFixed(2),
        textureScore: textureAnalysis.score.toFixed(2),
        colorChannelScore: colorChannelAnalysis.score.toFixed(2),
        regionScore: regionAnalysis.score.toFixed(2),
        alphaScore: alphaAnalysis.score.toFixed(2),
        dominantFeatures: getDominantFeatures({
          frequency: frequencyAnalysis.score,
          gradient: gradientAnalysis.score,
          texture: textureAnalysis.score,
          colorChannel: colorChannelAnalysis.score,
          region: regionAnalysis.score,
          alpha: alphaAnalysis.score,
        }),
      },
    };
  } catch (error) {
    console.error("[水印检测] 失败:", error);
    return {
      hasWatermark: false,
      watermarkRegions: [],
      watermarkConfidence: 0,
      detectionMethod: "error",
      error: error.message,
    };
  }
}

// ==================== 频域分析 ====================

/**
 * 频域分析 - 检测重复模式和周期性水印
 * 原理：水印通常是重复或半透明的图案，在频域中会产生特定的频率响应
 */
function analyzeFrequencyDomain(data, width, height) {
  try {
    // 转换为灰度图
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 简化的频域分析：检测周期性模式
    // 使用水平和垂直方向的自相关
    let horizontalPeriodicity = 0;
    let verticalPeriodicity = 0;

    // 水平方向自相关（检测重复的水平水印）
    const hSteps = [10, 20, 30, 50, 80]; // 检测不同周期
    for (const step of hSteps) {
      if (step >= width / 2) continue;
      let correlation = 0;
      let count = 0;

      for (let y = 0; y < height; y += 5) {
        // 采样以提高性能
        for (let x = 0; x < width - step; x += 5) {
          const idx1 = y * width + x;
          const idx2 = y * width + x + step;
          correlation += Math.abs(gray[idx1] - gray[idx2]);
          count++;
        }
      }

      const avgCorrelation = count > 0 ? correlation / count : 255;
      // 相关性高（差异小）说明可能有重复模式
      if (avgCorrelation < 15) {
        horizontalPeriodicity += (15 - avgCorrelation) * 2;
      }
    }

    // 垂直方向自相关（检测重复的垂直水印）
    const vSteps = [10, 20, 30, 50, 80];
    for (const step of vSteps) {
      if (step >= height / 2) continue;
      let correlation = 0;
      let count = 0;

      for (let y = 0; y < height - step; y += 5) {
        for (let x = 0; x < width; x += 5) {
          const idx1 = y * width + x;
          const idx2 = (y + step) * width + x;
          correlation += Math.abs(gray[idx1] - gray[idx2]);
          count++;
        }
      }

      const avgCorrelation = count > 0 ? correlation / count : 255;
      if (avgCorrelation < 15) {
        verticalPeriodicity += (15 - avgCorrelation) * 2;
      }
    }

    const maxPeriodicity = Math.max(horizontalPeriodicity, verticalPeriodicity);
    const score = Math.min(100, maxPeriodicity);

    return {
      score,
      horizontalPeriodicity,
      verticalPeriodicity,
      details: `H:${horizontalPeriodicity.toFixed(
        1
      )} V:${verticalPeriodicity.toFixed(1)}`,
    };
  } catch (error) {
    console.warn("[频域分析] 失败:", error);
    return { score: 0, horizontalPeriodicity: 0, verticalPeriodicity: 0 };
  }
}

// ==================== 梯度一致性分析 ====================

/**
 * 梯度一致性分析 - 检测不自然的边缘
 * 原理：水印的边缘通常与图片内容的边缘在梯度方向上不一致
 */
function analyzeGradientConsistency(data, width, height) {
  try {
    // 计算全图Sobel梯度
    const gradientMagnitude = new Float32Array(width * height);
    const gradientDirection = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // 获取周围8个像素的灰度值
        const tl =
          0.299 * data[((y - 1) * width + (x - 1)) * 4] +
          0.587 * data[((y - 1) * width + (x - 1)) * 4 + 1] +
          0.114 * data[((y - 1) * width + (x - 1)) * 4 + 2];
        const tc =
          0.299 * data[((y - 1) * width + x) * 4] +
          0.587 * data[((y - 1) * width + x) * 4 + 1] +
          0.114 * data[((y - 1) * width + x) * 4 + 2];
        const tr =
          0.299 * data[((y - 1) * width + (x + 1)) * 4] +
          0.587 * data[((y - 1) * width + (x + 1)) * 4 + 1] +
          0.114 * data[((y - 1) * width + (x + 1)) * 4 + 2];

        const ml =
          0.299 * data[(y * width + (x - 1)) * 4] +
          0.587 * data[(y * width + (x - 1)) * 4 + 1] +
          0.114 * data[(y * width + (x - 1)) * 4 + 2];
        const mr =
          0.299 * data[(y * width + (x + 1)) * 4] +
          0.587 * data[(y * width + (x + 1)) * 4 + 1] +
          0.114 * data[(y * width + (x + 1)) * 4 + 2];

        const bl =
          0.299 * data[((y + 1) * width + (x - 1)) * 4] +
          0.587 * data[((y + 1) * width + (x - 1)) * 4 + 1] +
          0.114 * data[((y + 1) * width + (x - 1)) * 4 + 2];
        const bc =
          0.299 * data[((y + 1) * width + x) * 4] +
          0.587 * data[((y + 1) * width + x) * 4 + 1] +
          0.114 * data[((y + 1) * width + x) * 4 + 2];
        const br =
          0.299 * data[((y + 1) * width + (x + 1)) * 4] +
          0.587 * data[((y + 1) * width + (x + 1)) * 4 + 1] +
          0.114 * data[((y + 1) * width + (x + 1)) * 4 + 2];

        // Sobel算子
        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const direction = Math.atan2(gy, gx);

        const pixelIdx = y * width + x;
        gradientMagnitude[pixelIdx] = magnitude;
        gradientDirection[pixelIdx] = direction;
      }
    }

    // 分析梯度一致性 - 检测"孤立"的边缘（可能是水印）
    let inconsistentEdges = 0;
    let totalEdges = 0;
    // 🎯 优化：基于实际测试降低阈值从15到5，水印的边缘强度通常在0.5-24之间，平均11
    const edgeThreshold = 5;

    const suspiciousRegions = [];

    // 定义检测区域（边缘和角落）
    const regions = [
      {
        name: "topLeft",
        x: 0,
        y: 0,
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "topRight",
        x: Math.floor(width * 0.8),
        y: 0,
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "bottomLeft",
        x: 0,
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "bottomRight",
        x: Math.floor(width * 0.8),
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "centerBottom",
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.15),
      },
    ];

    for (const region of regions) {
      let regionEdges = 0;
      let regionInconsistent = 0;

      for (
        let y = region.y + 2;
        y < Math.min(region.y + region.h - 2, height - 2);
        y++
      ) {
        for (
          let x = region.x + 2;
          x < Math.min(region.x + region.w - 2, width - 2);
          x++
        ) {
          const idx = y * width + x;

          if (gradientMagnitude[idx] > edgeThreshold) {
            regionEdges++;
            totalEdges++;

            // 检查周围8个邻居的梯度方向
            const neighbors = [
              gradientDirection[(y - 1) * width + (x - 1)],
              gradientDirection[(y - 1) * width + x],
              gradientDirection[(y - 1) * width + (x + 1)],
              gradientDirection[y * width + (x - 1)],
              gradientDirection[y * width + (x + 1)],
              gradientDirection[(y + 1) * width + (x - 1)],
              gradientDirection[(y + 1) * width + x],
              gradientDirection[(y + 1) * width + (x + 1)],
            ];

            const currentDir = gradientDirection[idx];
            let similarNeighbors = 0;

            for (const neighborDir of neighbors) {
              const dirDiff = Math.abs(currentDir - neighborDir);
              // 考虑角度的周期性
              const normalizedDiff = Math.min(dirDiff, 2 * Math.PI - dirDiff);
              if (normalizedDiff < Math.PI / 4) {
                // 45度以内认为相似
                similarNeighbors++;
              }
            }

            // 如果周围相似方向的邻居少于3个，认为是不一致的边缘
            if (similarNeighbors < 3) {
              inconsistentEdges++;
              regionInconsistent++;
            }
          }
        }
      }

      // 🎯 优化：基于实际测试调整阈值
      // 水印特征：区域内有足够的边缘（>10），且有一定比例不一致（>0.25）
      if (regionEdges > 10 && regionInconsistent / regionEdges > 0.25) {
        suspiciousRegions.push(region.name);
      }
    }

    const inconsistencyRatio =
      totalEdges > 0 ? inconsistentEdges / totalEdges : 0;

    // 🎯 改进：考虑位置因素，避免把整图内容误判为水印
    // 如果边缘在所有区域都很多，那可能是图片内容而非水印
    const hasWatermarkLikeDistribution =
      suspiciousRegions.length > 0 && suspiciousRegions.length <= 2;

    // 只有当边缘集中在少数区域时，才认为是水印
    const score = hasWatermarkLikeDistribution
      ? Math.min(100, inconsistencyRatio * 200)
      : Math.min(50, inconsistencyRatio * 100); // 全局分布降低得分

    return {
      score,
      inconsistentEdges,
      totalEdges,
      inconsistencyRatio,
      suspiciousRegions,
      hasWatermarkLikeDistribution,
    };
  } catch (error) {
    console.warn("[梯度分析] 失败:", error);
    return {
      score: 0,
      inconsistentEdges: 0,
      totalEdges: 0,
      suspiciousRegions: [],
    };
  }
}

// ==================== 纹理特征分析 ====================

/**
 * 纹理特征分析 - 使用简化的局部二值模式(LBP)
 * 原理：水印会改变局部纹理特征的分布
 */
function analyzeTexturePattern(data, width, height) {
  try {
    // 简化的LBP：计算每个像素与其8邻域的关系
    const lbpHistogram = new Array(256).fill(0);
    let totalPixels = 0;

    const anomalyRegions = [];
    const regionSize = 50; // 分块大小
    const regionScores = [];

    // 分块计算LBP
    for (let ry = 0; ry < Math.floor(height / regionSize); ry++) {
      for (let rx = 0; rx < Math.floor(width / regionSize); rx++) {
        const regionLBP = new Array(256).fill(0);
        let regionPixels = 0;

        const startX = rx * regionSize + 1;
        const startY = ry * regionSize + 1;
        const endX = Math.min(startX + regionSize - 2, width - 1);
        const endY = Math.min(startY + regionSize - 2, height - 1);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            const center =
              0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // 计算LBP值
            let lbpValue = 0;
            const neighbors = [
              [x - 1, y - 1],
              [x, y - 1],
              [x + 1, y - 1],
              [x - 1, y],
              [x + 1, y],
              [x - 1, y + 1],
              [x, y + 1],
              [x + 1, y + 1],
            ];

            for (let i = 0; i < neighbors.length; i++) {
              const [nx, ny] = neighbors[i];
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4;
                const neighborGray =
                  0.299 * data[nidx] +
                  0.587 * data[nidx + 1] +
                  0.114 * data[nidx + 2];
                if (neighborGray >= center) {
                  lbpValue |= 1 << i;
                }
              }
            }

            regionLBP[lbpValue]++;
            regionPixels++;
            lbpHistogram[lbpValue]++;
            totalPixels++;
          }
        }

        // 计算该区域的纹理复杂度
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
          if (regionLBP[i] > 0) {
            const p = regionLBP[i] / regionPixels;
            entropy -= p * Math.log2(p);
          }
        }

        regionScores.push({
          x: rx,
          y: ry,
          entropy,
          startX: rx * regionSize,
          startY: ry * regionSize,
        });
      }
    }

    // 计算整体纹理熵
    let globalEntropy = 0;
    for (let i = 0; i < 256; i++) {
      if (lbpHistogram[i] > 0) {
        const p = lbpHistogram[i] / totalPixels;
        globalEntropy -= p * Math.log2(p);
      }
    }

    // 找出熵异常的区域（可能是水印）
    const avgEntropy =
      regionScores.reduce((sum, r) => sum + r.entropy, 0) / regionScores.length;
    const stdEntropy = Math.sqrt(
      regionScores.reduce(
        (sum, r) => sum + Math.pow(r.entropy - avgEntropy, 2),
        0
      ) / regionScores.length
    );

    for (const region of regionScores) {
      // 熵明显低于平均值（纹理简单，可能是水印）
      if (region.entropy < avgEntropy - stdEntropy * 0.5) {
        // 判断位置（边缘区域更可疑）
        const isEdgeRegion =
          region.x === 0 ||
          region.x === Math.floor(width / regionSize) - 1 ||
          region.y === 0 ||
          region.y === Math.floor(height / regionSize) - 1;

        if (isEdgeRegion || region.entropy < avgEntropy - stdEntropy * 1.0) {
          const regionName = determineRegionName(
            region.startX,
            region.startY,
            width,
            height
          );
          if (!anomalyRegions.includes(regionName)) {
            anomalyRegions.push(regionName);
          }
        }
      }
    }

    // 🎯 修复评分逻辑：避免过高的误报
    // 只有当异常区域在边缘且数量适中时才认为是水印
    const anomalyScore =
      anomalyRegions.length > 0 && anomalyRegions.length <= 3
        ? anomalyRegions.length * 20
        : anomalyRegions.length > 3
        ? 30 // 异常区域太多，可能是图片本身复杂
        : 0;

    // 熵值过低也可能是图片本身特征，不一定是水印
    const entropyScore =
      globalEntropy < 6 && globalEntropy > 3
        ? Math.max(0, (6 - globalEntropy) * 8)
        : 0;

    const score = Math.min(100, anomalyScore + entropyScore);

    console.log("[纹理分析] 详细信息:", {
      anomalyRegionsCount: anomalyRegions.length,
      anomalyRegions,
      globalEntropy: globalEntropy.toFixed(2),
      avgEntropy: avgEntropy.toFixed(2),
      anomalyScore,
      entropyScore,
      finalScore: score,
    });

    return {
      score,
      globalEntropy,
      avgEntropy,
      anomalyRegions,
      anomalyCount: anomalyRegions.length,
    };
  } catch (error) {
    console.warn("[纹理分析] 失败:", error);
    return { score: 0, globalEntropy: 0, avgEntropy: 0, anomalyRegions: [] };
  }
}

// ==================== 颜色通道差异分析 ====================

/**
 * 颜色通道差异分析
 * 原理：人工添加的水印可能在RGB三通道中表现不一致
 */
function analyzeColorChannelDifference(data, width, height) {
  try {
    let rDiff = 0,
      gDiff = 0,
      bDiff = 0;
    let totalPixels = 0;

    // 计算相邻像素在各通道的差异
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const rightIdx = (y * width + x + 1) * 4;
        const downIdx = ((y + 1) * width + x) * 4;

        // 水平方向
        rDiff += Math.abs(data[idx] - data[rightIdx]);
        gDiff += Math.abs(data[idx + 1] - data[rightIdx + 1]);
        bDiff += Math.abs(data[idx + 2] - data[rightIdx + 2]);

        // 垂直方向
        rDiff += Math.abs(data[idx] - data[downIdx]);
        gDiff += Math.abs(data[idx + 1] - data[downIdx + 1]);
        bDiff += Math.abs(data[idx + 2] - data[downIdx + 2]);

        totalPixels += 2;
      }
    }

    const avgRDiff = rDiff / totalPixels;
    const avgGDiff = gDiff / totalPixels;
    const avgBDiff = bDiff / totalPixels;

    // 计算通道间的不平衡度
    const avgDiff = (avgRDiff + avgGDiff + avgBDiff) / 3;
    const variance =
      Math.pow(avgRDiff - avgDiff, 2) +
      Math.pow(avgGDiff - avgDiff, 2) +
      Math.pow(avgBDiff - avgDiff, 2);

    const channelImbalance = Math.sqrt(variance / 3);

    // 水印通常导致某个通道差异更大
    const score = Math.min(100, channelImbalance * 5);

    return {
      score,
      avgRDiff,
      avgGDiff,
      avgBDiff,
      channelImbalance,
    };
  } catch (error) {
    console.warn("[颜色通道分析] 失败:", error);
    return {
      score: 0,
      avgRDiff: 0,
      avgGDiff: 0,
      avgBDiff: 0,
      channelImbalance: 0,
    };
  }
}

// ==================== 区域高级分析 ====================

/**
 * 区域高级分析 - 综合多个特征
 */
function analyzeRegionsAdvanced(data, width, height) {
  try {
    const regions = [
      {
        name: "topLeft",
        x: 0,
        y: 0,
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "topRight",
        x: Math.floor(width * 0.85),
        y: 0,
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "bottomLeft",
        x: 0,
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "bottomRight",
        x: Math.floor(width * 0.85),
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "centerBottom",
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.9),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.1),
      },
      {
        name: "leftMiddle",
        x: 0,
        y: Math.floor(height * 0.4),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.2),
      },
      {
        name: "rightMiddle",
        x: Math.floor(width * 0.85),
        y: Math.floor(height * 0.4),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.2),
      },
    ];

    const detectedRegions = [];
    let totalScore = 0;

    for (const region of regions) {
      const features = analyzeRegionPixelFeatures(data, width, height, region);

      // 🎯 优化：基于实际测试进一步降低阈值从25到15
      // 水印区域的综合得分通常在15-50之间
      if (features.score > 15) {
        detectedRegions.push(region.name);
        totalScore += features.score;
      }
    }

    const avgScore =
      detectedRegions.length > 0 ? totalScore / detectedRegions.length : 0;

    // 🎯 改进：如果所有区域都有高分，可能是图片内容丰富而非水印
    const tooManyRegions = detectedRegions.length > 4; // 超过4个区域 = 全图有内容
    const finalScore = tooManyRegions ? Math.min(30, avgScore) : avgScore;

    return {
      score: finalScore,
      detectedRegions,
      detectedCount: detectedRegions.length,
      tooManyRegions,
    };
  } catch (error) {
    console.warn("[区域分析] 失败:", error);
    return { score: 0, detectedRegions: [], detectedCount: 0 };
  }
}

/**
 * 分析单个区域的像素特征
 */
function analyzeRegionPixelFeatures(data, width, height, region) {
  const { x, y, w, h } = region;

  let edgePixels = 0;
  let lowContrastPixels = 0;
  let semiTransparentPixels = 0;
  let totalPixels = 0;

  let sumBrightness = 0;
  let sumSaturation = 0;

  for (let row = y; row < y + h && row < height; row++) {
    for (let col = x; col < x + w && col < width; col++) {
      const idx = (row * width + col) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // 亮度
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      sumBrightness += brightness;

      // 饱和度
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max > 0 ? (max - min) / max : 0;
      sumSaturation += saturation;

      // 半透明检测
      if (a < 230) {
        semiTransparentPixels++;
      }

      // 边缘检测（简化版）
      if (col < x + w - 1 && row < y + h - 1) {
        const rightIdx = (row * width + col + 1) * 4;
        const downIdx = ((row + 1) * width + col) * 4;

        const rightBrightness =
          0.299 * data[rightIdx] +
          0.587 * data[rightIdx + 1] +
          0.114 * data[rightIdx + 2];
        const downBrightness =
          0.299 * data[downIdx] +
          0.587 * data[downIdx + 1] +
          0.114 * data[downIdx + 2];

        const gradientH = Math.abs(brightness - rightBrightness);
        const gradientV = Math.abs(brightness - downBrightness);

        // 🎯 优化：降低边缘检测阈值从15到8（基于实际测试数据）
        if (gradientH > 8 || gradientV > 8) {
          edgePixels++;
        }

        // 低对比度检测
        if (gradientH < 5 && gradientV < 5) {
          lowContrastPixels++;
        }
      }

      totalPixels++;
    }
  }

  if (totalPixels === 0) {
    return { score: 0 };
  }

  const avgBrightness = sumBrightness / totalPixels;
  const avgSaturation = sumSaturation / totalPixels;
  const edgeDensity = edgePixels / totalPixels;
  const lowContrastRatio = lowContrastPixels / totalPixels;
  const semiTransparentRatio = semiTransparentPixels / totalPixels;

  // 综合评分
  let score = 0;

  // 边缘密度：文字水印通常有适度边缘密度
  // 🎯 优化：降低阈值，因为实际水印边缘可能不那么密集
  if (edgeDensity > 0.03) score += 25;
  else if (edgeDensity > 0.015) score += 15;
  else if (edgeDensity > 0.008) score += 10;

  // 半透明：水印常见特征
  if (semiTransparentRatio > 0.2) score += 30;
  else if (semiTransparentRatio > 0.05) score += 15;

  // 饱和度：水印通常饱和度较低
  if (avgSaturation < 0.3) score += 15;
  else if (avgSaturation < 0.5) score += 8;

  // 亮度：水印通常较浅或较深
  if (avgBrightness < 80 || avgBrightness > 200) score += 15;
  else if (avgBrightness < 100 || avgBrightness > 180) score += 8;

  // 低对比度：大面积低对比度可能是半透明水印
  if (lowContrastRatio > 0.6 && edgeDensity > 0.02) score += 15;

  return {
    score: Math.min(100, score),
    edgeDensity,
    avgBrightness,
    avgSaturation,
    semiTransparentRatio,
    lowContrastRatio,
  };
}

// ==================== 透明度通道分析 ====================

/**
 * Alpha通道分析
 * 原理：水印经常使用alpha通道实现半透明效果
 */
function analyzeAlphaChannel(data, width, height) {
  try {
    let semiTransparentPixels = 0;
    let transparentRegions = [];
    let totalPixels = width * height;

    // 统计alpha值分布
    const alphaHistogram = new Array(256).fill(0);

    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      alphaHistogram[alpha]++;

      if (alpha < 230 && alpha > 25) {
        // 半透明范围
        semiTransparentPixels++;
      }
    }

    const semiTransparentRatio = semiTransparentPixels / totalPixels;

    // 检查是否有大量特定alpha值（水印常用固定alpha）
    let maxAlphaCount = 0;
    let dominantAlpha = 255;

    for (let i = 0; i < 256; i++) {
      if (i !== 255 && alphaHistogram[i] > maxAlphaCount) {
        maxAlphaCount = alphaHistogram[i];
        dominantAlpha = i;
      }
    }

    const dominantAlphaRatio = maxAlphaCount / totalPixels;

    // 评分
    let score = 0;

    if (semiTransparentRatio > 0.15) score += 40;
    else if (semiTransparentRatio > 0.08) score += 25;
    else if (semiTransparentRatio > 0.03) score += 15;

    // 如果有显著的特定alpha值（除了255），可能是水印
    if (dominantAlpha < 255 && dominantAlphaRatio > 0.05) {
      score += 30;
    }

    return {
      score: Math.min(100, score),
      semiTransparentRatio,
      dominantAlpha,
      dominantAlphaRatio,
    };
  } catch (error) {
    console.warn("[Alpha通道分析] 失败:", error);
    return {
      score: 0,
      semiTransparentRatio: 0,
      dominantAlpha: 255,
      dominantAlphaRatio: 0,
    };
  }
}

// ==================== 负样本过滤器（核心优化）====================

/**
 * 应用负样本过滤 - 过滤常见误报场景
 * 这是降低误报率的关键函数
 */
function applyFalsePositiveFilters(imageFeatures, detectionResult) {
  const {
    width,
    height,
    detectedRegions,
    regionCount,
    textureScore,
    gradientScore,
    regionScore,
    tooManyRegions,
    avgEntropy,
    hasWatermarkLikeDistribution,
  } = imageFeatures;

  const { hasWatermark, watermarkLevel, confidence } = detectionResult;

  // 如果没有检测到水印，直接返回
  if (!hasWatermark) {
    return { filtered: false };
  }

  console.log("[过滤器] 检查负样本特征...", {
    regionCount,
    tooManyRegions,
    hasWatermarkLikeDistribution,
    textureScore,
    gradientScore,
  });

  // ========== 过滤器 1: 5区域智能判断 ==========
  // 🎯 优化：基于底部3区域模式的智能过滤
  if (regionCount === 5 || (regionCount > 4 && tooManyRegions)) {
    const hasBottomThreePattern = [
      "bottomLeft",
      "bottomRight",
      "centerBottom",
    ].every((r) => detectedRegions.includes(r));

    if (hasBottomThreePattern && confidence >= 40) {
      // 包含底部3区域 + 高置信度 = 很可能是水印，保留
      console.log("[过滤器] 5区域包含底部3区域模式且置信度足够，保留");
      // 不过滤
    } else if (!hasBottomThreePattern && confidence < 35) {
      // 不包含底部3区域 + 低置信度 = 内容丰富
      console.log("[过滤器] 触发: 5区域但非水印模式，过滤");
      return {
        filtered: true,
        hasWatermark: false,
        watermarkLevel: "none",
        confidence: 0,
        reason: "rich_content_non_pattern",
        warningMessage: "检测到的特征为图片自然内容",
      };
    }
  }

  // ========== 过滤器 2: 不符合水印分布模式 ==========
  // 🎯 优化：如果匹配了常见位置模式，即使分布异常也不过滤
  const matchesCommonPattern =
    detectedRegions &&
    (["bottomLeft", "bottomRight", "centerBottom"].every((r) =>
      detectedRegions.includes(r)
    ) ||
      ["topLeft", "topRight", "bottomLeft", "bottomRight"].every((r) =>
        detectedRegions.includes(r)
      ));

  if (
    !hasWatermarkLikeDistribution &&
    !matchesCommonPattern &&
    regionCount > 2 &&
    confidence < 60
  ) {
    console.log("[过滤器] 触发: 不符合水印分布模式且不匹配常见模式");
    // 降低置信度而非完全过滤
    const reducedConfidence = confidence * 0.5;
    return {
      filtered: true,
      hasWatermark: reducedConfidence >= 25, // 重新判断
      watermarkLevel: getWatermarkLevelFromConfidence(reducedConfidence),
      confidence: reducedConfidence,
      reason: "non_watermark_distribution",
      warningMessage: "特征分布不符合水印模式",
    };
  }

  // ========== 过滤器 3: 纹理过于复杂（自然纹理）==========
  // 高纹理得分 + 高熵 = 自然纹理（树叶、草地等）
  if (textureScore > 60 && avgEntropy > 7.5) {
    console.log("[过滤器] 触发: 自然纹理");
    return {
      filtered: true,
      hasWatermark: false,
      watermarkLevel: "none",
      confidence: 0,
      reason: "natural_texture",
      warningMessage: "检测到自然纹理特征",
    };
  }

  // ========== 过滤器 4: 压缩伪影（JPEG 块状效应）==========
  // 低梯度得分 + 低区域得分 + 高纹理得分 = 压缩伪影
  if (gradientScore < 20 && regionScore < 25 && textureScore > 40) {
    console.log("[过滤器] 触发: 压缩伪影");
    return {
      filtered: true,
      hasWatermark: false,
      watermarkLevel: "none",
      confidence: 0,
      reason: "compression_artifacts",
      warningMessage: "检测到压缩伪影",
    };
  }

  // ========== 过滤器 5: 整体置信度过滤 ==========
  // 🎯 优化：最终兜底，置信度<25直接过滤
  // 基于实际测试：真实水印加成后置信度通常>=27
  if (confidence < 25) {
    console.log("[过滤器] 触发: 整体置信度不足");
    return {
      filtered: true,
      hasWatermark: false,
      watermarkLevel: "none",
      confidence: 0,
      reason: "overall_low_confidence",
      warningMessage: "置信度不足",
    };
  }

  // ========== 过滤器 6: 建筑边缘细节（连续边缘）==========
  // 如果区域数为3-4个且相邻，可能是建筑结构
  if (regionCount >= 3 && regionCount <= 4) {
    const hasAdjacentRegions = checkAdjacentRegions(detectedRegions);
    if (hasAdjacentRegions) {
      console.log("[过滤器] 触发: 建筑边缘结构");
      const reducedConfidence = confidence * 0.6;
      return {
        filtered: true,
        hasWatermark: reducedConfidence >= 25,
        watermarkLevel: getWatermarkLevelFromConfidence(reducedConfidence),
        confidence: reducedConfidence,
        reason: "architectural_edges",
        warningMessage: "可能为建筑边缘细节",
      };
    }
  }

  // 通过所有过滤器
  console.log("[过滤器] 通过检查，保留检测结果");
  return { filtered: false };
}

/**
 * 根据置信度获取水印级别
 */
function getWatermarkLevelFromConfidence(confidence) {
  if (confidence >= 65) return "certain";
  if (confidence >= 50) return "very_likely";
  if (confidence >= 35) return "likely";
  if (confidence >= 25) return "suspicious";
  return "none";
}

/**
 * 检查区域是否相邻（用于识别连续结构）
 */
function checkAdjacentRegions(regions) {
  const adjacencyMap = {
    topLeft: ["topRight", "leftMiddle", "bottomLeft"],
    topRight: ["topLeft", "rightMiddle", "bottomRight"],
    bottomLeft: ["topLeft", "leftMiddle", "bottomRight"],
    bottomRight: ["topRight", "rightMiddle", "bottomLeft"],
    leftMiddle: ["topLeft", "bottomLeft"],
    rightMiddle: ["topRight", "bottomRight"],
    centerBottom: ["bottomLeft", "bottomRight"],
  };

  // 检查是否有相邻的区域
  for (const region of regions) {
    const neighbors = adjacencyMap[region] || [];
    const hasNeighbor = neighbors.some((n) => regions.includes(n));
    if (hasNeighbor) {
      return true;
    }
  }

  return false;
}

// ==================== 辅助函数 ====================

/**
 * 分析水印位置模式 - 识别常见水印分布
 * 🎯 基于实际测试：真实水印常见位置模式
 */
function analyzeWatermarkPositionPattern(regions) {
  if (!regions || regions.length === 0) {
    return { isCommonPattern: false, patternType: "none", bonus: 0 };
  }

  // 常见水印模式（基于实际测试数据）
  const patterns = {
    // 模式1: 底部3区域（最常见）- 5/8 的水印匹配
    bottomThree: {
      regions: ["bottomLeft", "bottomRight", "centerBottom"],
      bonus: 10,
      name: "bottom_three",
    },
    // 模式2: 4个角落
    fourCorners: {
      regions: ["topLeft", "topRight", "bottomLeft", "bottomRight"],
      bonus: 8,
      name: "four_corners",
    },
    // 模式3: 底部2角 + 中心
    bottomCornerAndCenter: {
      regions: ["bottomLeft", "bottomRight"],
      bonus: 8,
      name: "bottom_corners",
    },
    // 模式4: 单一底部角落（较少但也有）
    singleBottomCorner: {
      regions: ["bottomRight"], // or bottomLeft
      bonus: 5,
      name: "single_bottom",
    },
  };

  // 检查是否匹配底部3区域模式
  if (patterns.bottomThree.regions.every((r) => regions.includes(r))) {
    return {
      isCommonPattern: true,
      patternType: patterns.bottomThree.name,
      bonus: patterns.bottomThree.bonus,
    };
  }

  // 检查是否匹配4角模式
  if (patterns.fourCorners.regions.every((r) => regions.includes(r))) {
    return {
      isCommonPattern: true,
      patternType: patterns.fourCorners.name,
      bonus: patterns.fourCorners.bonus,
    };
  }

  // 检查是否匹配底部2角模式
  if (
    patterns.bottomCornerAndCenter.regions.every((r) => regions.includes(r))
  ) {
    return {
      isCommonPattern: true,
      patternType: patterns.bottomCornerAndCenter.name,
      bonus: patterns.bottomCornerAndCenter.bonus,
    };
  }

  // 检查单一底部角落
  if (
    regions.length === 1 &&
    (regions.includes("bottomRight") || regions.includes("bottomLeft"))
  ) {
    return {
      isCommonPattern: true,
      patternType: patterns.singleBottomCorner.name,
      bonus: patterns.singleBottomCorner.bonus,
    };
  }

  return { isCommonPattern: false, patternType: "uncommon", bonus: 0 };
}

/**
 * 根据坐标确定区域名称
 */
function determineRegionName(x, y, width, height) {
  const xRatio = x / width;
  const yRatio = y / height;
  
  if (yRatio < 0.33) {
    if (xRatio < 0.33) return 'topLeft';
    if (xRatio > 0.67) return 'topRight';
    return 'topCenter';
  } else if (yRatio > 0.67) {
    if (xRatio < 0.33) return 'bottomLeft';
    if (xRatio > 0.67) return 'bottomRight';
    return 'bottomCenter';
  } else {
    if (xRatio < 0.33) return 'leftMiddle';
    if (xRatio > 0.67) return 'rightMiddle';
    return 'center';
  }
}

/**
 * 获取主导特征
 */
function getDominantFeatures(scores) {
  const features = Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(f => f.score > 30)
    .map(f => f.name);
  
  return features.length > 0 ? features : ['none'];
}

// ==================== 导出函数 ====================

// 在worker环境中，直接替换原有的detectWatermark函数
if (typeof self !== 'undefined' && typeof detectWatermark === 'undefined') {
  self.detectWatermark = detectWatermarkAdvanced;
}
