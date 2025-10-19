/**
 * 使用 sharp 详细分析水印图片特征
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WATERMARK_IMAGES = [
  "image1990.png",
  "image1991.png",
  "image1992.png",
  "image1993.png",
  "image1994.png",
  "image1995.png",
  "image1996.png",
  "image1997.png",
];

const NORMAL_IMAGES = [
  "image1.png",
  "image2.png",
  "image3.png",
  "image4.png",
  "image5.png",
];

const mediaDir = path.join(__dirname, "temp/media");

async function analyzeImageWithSharp(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
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

  const regionFeatures = [];

  for (const region of regions) {
    const features = analyzeRegion(data, width, height, channels, region);
    regionFeatures.push({
      name: region.name,
      ...features,
    });
  }

  return {
    width,
    height,
    channels,
    regions: regionFeatures,
  };
}

function analyzeRegion(data, width, height, channels, region) {
  const { x, y, w, h } = region;

  let edgeStrength = 0;
  let brightnessSum = 0;
  let pixelCount = 0;
  let contrastValues = [];

  for (let row = y; row < Math.min(y + h, height); row++) {
    for (let col = x; col < Math.min(x + w, width); col++) {
      const idx = (row * width + col) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSum += brightness;

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

        const magnitude = Math.sqrt(gradH * gradH + gradV * gradV);
        edgeStrength += magnitude;
        contrastValues.push(gradH, gradV);
      }

      pixelCount++;
    }
  }

  const avgBrightness = brightnessSum / pixelCount;
  const avgEdgeStrength = edgeStrength / pixelCount;
  const avgContrast =
    contrastValues.reduce((a, b) => a + b, 0) / contrastValues.length;
  const maxContrast = Math.max(...contrastValues, 0);

  return {
    avgEdgeStrength: avgEdgeStrength.toFixed(2),
    avgContrast: avgContrast.toFixed(2),
    maxContrast: maxContrast.toFixed(2),
    avgBrightness: avgBrightness.toFixed(2),
    pixelCount,
  };
}

async function main() {
  console.log("\n🔍 水印图片特征分析 (使用 Sharp)\n");
  console.log("=".repeat(80));

  console.log("\n📊 有水印图片特征 (image1990-1997):\n");

  const watermarkFeatures = [];

  for (const filename of WATERMARK_IMAGES) {
    const filepath = path.join(mediaDir, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`⚠️  ${filename}: 文件不存在`);
      continue;
    }

    try {
      const features = await analyzeImageWithSharp(filepath);
      watermarkFeatures.push({ filename, features });

      console.log(
        `\n${filename} (${features.width}x${features.height}, ${features.channels} channels):`
      );
      features.regions.forEach((region) => {
        console.log(
          `  ${region.name.padEnd(15)}: 边缘=${region.avgEdgeStrength.padEnd(
            7
          )} 对比度=${region.avgContrast.padEnd(
            7
          )} 最大对比度=${region.maxContrast.padEnd(
            7
          )} 亮度=${region.avgBrightness.padEnd(7)}`
        );
      });
    } catch (error) {
      console.log(`❌ ${filename}: ${error.message}`);
    }
  }

  console.log("\n\n📊 无水印图片特征 (对比样本):\n");

  const normalFeatures = [];

  for (const filename of NORMAL_IMAGES) {
    const filepath = path.join(mediaDir, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`⚠️  ${filename}: 文件不存在`);
      continue;
    }

    try {
      const features = await analyzeImageWithSharp(filepath);
      normalFeatures.push({ filename, features });

      console.log(
        `\n${filename} (${features.width}x${features.height}, ${features.channels} channels):`
      );
      features.regions.forEach((region) => {
        console.log(
          `  ${region.name.padEnd(15)}: 边缘=${region.avgEdgeStrength.padEnd(
            7
          )} 对比度=${region.avgContrast.padEnd(
            7
          )} 最大对比度=${region.maxContrast.padEnd(
            7
          )} 亮度=${region.avgBrightness.padEnd(7)}`
        );
      });
    } catch (error) {
      console.log(`❌ ${filename}: ${error.message}`);
    }
  }

  // 统计分析
  console.log("\n\n" + "=".repeat(80));
  console.log("\n📈 统计分析:\n");

  if (watermarkFeatures.length === 0) {
    console.log("❌ 没有成功分析到有水印的图片");
    return;
  }

  // 计算有水印图片的特征范围
  const watermarkStats = {
    minEdge: Infinity,
    maxEdge: -Infinity,
    avgEdge: 0,
    minContrast: Infinity,
    maxContrast: -Infinity,
    avgContrast: 0,
    count: 0,
  };

  watermarkFeatures.forEach((item) => {
    item.features.regions.forEach((region) => {
      const edge = parseFloat(region.avgEdgeStrength);
      const contrast = parseFloat(region.avgContrast);

      watermarkStats.minEdge = Math.min(watermarkStats.minEdge, edge);
      watermarkStats.maxEdge = Math.max(watermarkStats.maxEdge, edge);
      watermarkStats.avgEdge += edge;

      watermarkStats.minContrast = Math.min(
        watermarkStats.minContrast,
        contrast
      );
      watermarkStats.maxContrast = Math.max(
        watermarkStats.maxContrast,
        contrast
      );
      watermarkStats.avgContrast += contrast;

      watermarkStats.count++;
    });
  });

  watermarkStats.avgEdge /= watermarkStats.count;
  watermarkStats.avgContrast /= watermarkStats.count;

  console.log("✅ 有水印图片特征范围:");
  console.log(
    `  边缘强度: ${watermarkStats.minEdge.toFixed(
      2
    )} - ${watermarkStats.maxEdge.toFixed(
      2
    )} (平均: ${watermarkStats.avgEdge.toFixed(2)})`
  );
  console.log(
    `  对比度:   ${watermarkStats.minContrast.toFixed(
      2
    )} - ${watermarkStats.maxContrast.toFixed(
      2
    )} (平均: ${watermarkStats.avgContrast.toFixed(2)})`
  );

  // 计算无水印图片的特征范围
  if (normalFeatures.length > 0) {
    const normalStats = {
      minEdge: Infinity,
      maxEdge: -Infinity,
      avgEdge: 0,
      minContrast: Infinity,
      maxContrast: -Infinity,
      avgContrast: 0,
      count: 0,
    };

    normalFeatures.forEach((item) => {
      item.features.regions.forEach((region) => {
        const edge = parseFloat(region.avgEdgeStrength);
        const contrast = parseFloat(region.avgContrast);

        normalStats.minEdge = Math.min(normalStats.minEdge, edge);
        normalStats.maxEdge = Math.max(normalStats.maxEdge, edge);
        normalStats.avgEdge += edge;

        normalStats.minContrast = Math.min(normalStats.minContrast, contrast);
        normalStats.maxContrast = Math.max(normalStats.maxContrast, contrast);
        normalStats.avgContrast += contrast;

        normalStats.count++;
      });
    });

    normalStats.avgEdge /= normalStats.count;
    normalStats.avgContrast /= normalStats.count;

    console.log("\n❌ 无水印图片特征范围:");
    console.log(
      `  边缘强度: ${normalStats.minEdge.toFixed(
        2
      )} - ${normalStats.maxEdge.toFixed(
        2
      )} (平均: ${normalStats.avgEdge.toFixed(2)})`
    );
    console.log(
      `  对比度:   ${normalStats.minContrast.toFixed(
        2
      )} - ${normalStats.maxContrast.toFixed(
        2
      )} (平均: ${normalStats.avgContrast.toFixed(2)})`
    );
  }

  // 推荐阈值
  console.log("\n\n🎯 推荐阈值:\n");

  // 取有水印图片的最小值作为阈值下限，留20%余量
  const recommendedEdgeThreshold = Math.max(0, watermarkStats.minEdge * 0.7);
  const recommendedContrastThreshold = Math.max(
    0,
    watermarkStats.minContrast * 0.7
  );

  console.log(
    `  边缘强度阈值: ${recommendedEdgeThreshold.toFixed(2)} (当前: 15, 过高)`
  );
  console.log(`  对比度阈值:   ${recommendedContrastThreshold.toFixed(2)}`);

  console.log("\n💡 优化建议:\n");

  if (watermarkStats.maxEdge < 15) {
    console.log(
      `  ❌ 当前边缘阈值 15 过高！最大值仅 ${watermarkStats.maxEdge.toFixed(2)}`
    );
    console.log(
      `  ✅ 必须降低到 ${recommendedEdgeThreshold.toFixed(
        2
      )} 才能检测到这些水印`
    );
  }

  console.log(
    `  💡 或者使用更低的阈值： ${(watermarkStats.minEdge * 0.5).toFixed(2)}`
  );

  console.log("\n" + "=".repeat(80) + "\n");
}

main().catch(console.error);


