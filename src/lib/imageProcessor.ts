// 🚀 统一图片处理库 - 项目核心图片处理模块
//
// 此文件提供统一的图片处理接口，包括：
// - 从Excel文件中提取图片（支持WPS格式）
// - 按工作表过滤图片
// - 图片清晰度检测（拉普拉斯方差）
// - 图片重复性检测（感知哈希）
// - 统一配置和算法，确保结果一致性

import JSZip from "jszip";

// 图片处理配置
export const IMAGE_CONFIG = {
  BLUR_THRESHOLD: 80, // 清晰度阈值（拉普拉斯方差）
  DUPLICATE_THRESHOLD: 5, // 重复检测汉明距离阈值
  HASH_SIZE: 8, // 感知哈希尺寸
  CANVAS_SIZE: 64, // Canvas处理尺寸
  // 新增：质量检测阈值
  MIN_CONTRAST: 30, // 最小对比度
  MIN_BRIGHTNESS: 40, // 最小亮度
  MAX_BRIGHTNESS: 220, // 最大亮度
  MAX_NOISE_LEVEL: 25, // 最大噪点水平
  // 边框检测配置
  BORDER_MIN_WIDTH: 2, // 最小边框宽度（像素）- 过滤1px的细线
  BORDER_MAX_WIDTH: 40, // 最大边框宽度（像素）- 适当提高以检测更宽的边框
  BORDER_COLOR_TOLERANCE: 15, // 颜色容差（0-255）- 适中的容差
  BORDER_CONSISTENCY_RATIO: 0.90, // 边框一致性比例（90%的像素需要符合条件）- 平衡的阈值
  BORDER_BRIGHTNESS_DIFF: 30, // 边框与内容的最小亮度差异 - 提高到30更严格的边界判断
  // 水印检测配置
  WATERMARK_EDGE_REGION_RATIO: 0.15, // 边缘区域占比（15%）
  WATERMARK_CENTER_BOTTOM_HEIGHT: 0.25, // 底部中间区域高度（25%，扩大覆盖范围）
  WATERMARK_EDGE_THRESHOLD: 25, // 边缘强度阈值（降低以提高灵敏度）
  WATERMARK_CONTRAST_THRESHOLD: 35, // 对比度阈值（降低以提高灵敏度）
  WATERMARK_MIN_TEXT_COMPLEXITY: 12, // 最小文字复杂度（降低以提高灵敏度）
  WATERMARK_MIN_BRIGHTNESS: 20, // 最小亮度（非纯黑背景）
  WATERMARK_MAX_SIZE: 800, // 水印检测最大处理尺寸（性能优化）
  // 动态并发控制
  MIN_CONCURRENCY: 2,
  MAX_CONCURRENCY: 8,
  MEMORY_THRESHOLD_MB: 200, // 内存阈值（MB），超过则降低并发
};

// 图片信息接口
export interface ImageInfo {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  data: Uint8Array;
  position?: string; // Excel位置，如 "A4"
  row?: number; // Excel行号
  column?: string; // Excel列号
  imageId?: string; // DISPIMG公式中的图片ID
  extractionMethod?: "formula" | "zip" | "fallback"; // 提取方法
}

// 重复图片信息接口
export interface DuplicateInfo {
  id: string;
  position?: string;
  row?: number;
  column?: string;
}

// 图片验证结果接口
export interface ImageValidationResult {
  id: string;
  sharpness: number;
  isBlurry: boolean;
  hash: string;
  duplicates: DuplicateInfo[];
  position?: string;
  row?: number;
  column?: string;
  // 新增：高级质量指标
  contrast?: number;
  brightness?: number;
  noiseLevel?: number;
  isLowContrast?: boolean;
  isOverExposed?: boolean;
  isUnderExposed?: boolean;
  isNoisy?: boolean;
  // 边框检测结果
  hasBorder?: boolean;
  borderSides?: string[]; // ['top', 'bottom', 'left', 'right']
  borderWidth?: { top?: number; bottom?: number; left?: number; right?: number };
  // 水印检测结果
  hasWatermark?: boolean;
  watermarkRegions?: string[]; // ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'centerBottom']
  watermarkConfidence?: number; // 0-1
}

// 图片验证汇总接口
export interface ImageValidationSummary {
  totalImages: number;
  blurryImages: number;
  duplicateGroups: number;
  results: ImageValidationResult[];
}

/**
 * 统一图片处理器类
 * 提供所有图片相关的处理功能
 */
export class ImageProcessor {
  private blurThreshold: number;
  private duplicateThreshold: number;

  constructor(options?: {
    blurThreshold?: number;
    duplicateThreshold?: number;
  }) {
    this.blurThreshold = options?.blurThreshold ?? IMAGE_CONFIG.BLUR_THRESHOLD;
    this.duplicateThreshold =
      options?.duplicateThreshold ?? IMAGE_CONFIG.DUPLICATE_THRESHOLD;
  }

  /**
   * 从Excel文件中提取图片
   * @param file Excel文件
   * @param selectedSheet 指定工作表（可选）
   * @returns 图片信息数组
   */
  async extractImages(
    file: File,
    selectedSheet?: string
  ): Promise<ImageInfo[]> {
    console.log(`[IMAGE_PROCESSOR] 开始提取图片`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      selectedSheet: selectedSheet || "未指定",
    });

    try {
      // 方法1: 优先使用DISPIMG公式提取（最准确）
      console.log(`[IMAGE_PROCESSOR] 尝试DISPIMG公式提取`);
      const formulaImages = await this.extractFromFormulas(file, selectedSheet);
      console.log(`[IMAGE_PROCESSOR] DISPIMG公式提取完成`, {
        extractedCount: formulaImages.length,
      });

      // 方法2: 使用ZIP解析作为补充
      console.log(`[IMAGE_PROCESSOR] 尝试ZIP解析提取`);
      const zipImages = await this.extractFromZip(file, selectedSheet);
      console.log(`[IMAGE_PROCESSOR] ZIP解析提取完成`, {
        extractedCount: zipImages.length,
      });

      // 合并结果，优先使用公式方法
      const allImages = this.mergeAndDeduplicateImages([
        ...formulaImages,
        ...zipImages,
      ]);

      console.log(`[IMAGE_PROCESSOR] 图片提取完成`, {
        formulaImages: formulaImages.length,
        zipImages: zipImages.length,
        totalImages: allImages.length,
        deduplicationRate: `${(
          ((formulaImages.length + zipImages.length - allImages.length) /
            (formulaImages.length + zipImages.length)) *
          100
        ).toFixed(1)}%`,
      });

      return allImages;
    } catch (error) {
      console.error(`[IMAGE_PROCESSOR] 增强提取失败，回退到原始方法:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return this.extractFromZipFallback(file);
    }
  }

  /**
   * 获取动态并发数
   * 根据CPU核心数和可用内存动态调整
   */
  private getDynamicConcurrency(): number {
    const cores =
      (typeof navigator !== "undefined" &&
        (navigator as any).hardwareConcurrency) ||
      4;

    // 基于CPU核心数的并发
    let concurrency = Math.max(
      IMAGE_CONFIG.MIN_CONCURRENCY,
      Math.min(IMAGE_CONFIG.MAX_CONCURRENCY, Math.floor(cores * 0.75))
    );

    // 检查内存情况（如果浏览器支持）
    if (
      typeof performance !== "undefined" &&
      (performance as any).memory
    ) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMemoryMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const memoryUsagePercent = (usedMemoryMB / totalMemoryMB) * 100;

      console.log(`[IMAGE_PROCESSOR] 内存使用情况`, {
        usedMB: usedMemoryMB.toFixed(2),
        totalMB: totalMemoryMB.toFixed(2),
        usagePercent: `${memoryUsagePercent.toFixed(1)}%`,
        currentConcurrency: concurrency,
      });

      // 如果内存使用超过70%，降低并发
      if (memoryUsagePercent > 70) {
        concurrency = Math.max(IMAGE_CONFIG.MIN_CONCURRENCY, Math.floor(concurrency * 0.5));
        console.warn(`[IMAGE_PROCESSOR] 内存使用较高，降低并发至 ${concurrency}`);
      } else if (usedMemoryMB > IMAGE_CONFIG.MEMORY_THRESHOLD_MB) {
        concurrency = Math.max(IMAGE_CONFIG.MIN_CONCURRENCY, Math.floor(concurrency * 0.75));
        console.warn(`[IMAGE_PROCESSOR] 已用内存超过阈值，降低并发至 ${concurrency}`);
      }
    }

    return concurrency;
  }

  /**
   * 验证图片质量（清晰度、重复性和高级质量指标）
   * @param images 图片数组
   * @param enableWatermarkDetection 是否启用水印检测（默认false）
   * @returns 验证结果汇总
   */
  async validateImages(images: ImageInfo[], enableWatermarkDetection: boolean = false): Promise<ImageValidationSummary> {
    const results: ImageValidationResult[] = [];
    let concurrency = this.getDynamicConcurrency();

    console.log(`[IMAGE_PROCESSOR] 开始图片验证`, {
      totalImages: images.length,
      initialConcurrency: concurrency,
    });

    // 分批处理图片，每10张图片后重新评估并发数
    for (let i = 0; i < images.length; i += concurrency) {
      // 每处理10张图片后重新评估并发数
      if (i > 0 && i % 10 === 0) {
        concurrency = this.getDynamicConcurrency();
      }

      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async (image) => {
        try {
          // 并行计算多个质量指标
          const [sharpness, hash, qualityMetrics, borderInfo] = await Promise.all([
            this.calculateSharpness(image.data),
            this.calculateHash(image.data),
            this.calculateQualityMetrics(image.data),
            this.detectSolidBorder(image.data),
          ]);
          
          // 只有当启用水印检测时才进行水印检测（单独执行以避免类型错误）
          const watermarkInfo = enableWatermarkDetection
            ? await this.detectWatermark(image.data)
            : { hasWatermark: false, watermarkRegions: [], watermarkConfidence: 0 };

          return {
            id: image.id,
            sharpness,
            isBlurry: sharpness < this.blurThreshold,
            hash,
            duplicates: [], // 稍后填充
            position: image.position,
            row: image.row,
            column: image.column,
            // 高级质量指标
            ...qualityMetrics,
            // 边框检测结果
            ...borderInfo,
            // 水印检测结果
            ...watermarkInfo,
          };
        } catch (error) {
          console.warn(`Failed to validate image ${image.id}:`, error);
          return {
            id: image.id,
            sharpness: 0,
            isBlurry: true,
            hash: "",
            duplicates: [],
            position: image.position,
            row: image.row,
            column: image.column,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 更新进度
      const progress = Math.round(((i + batch.length) / images.length) * 100);
      console.log(`[IMAGE_PROCESSOR] 验证进度: ${progress}%`);
    }

    // 检测重复图片
    this.detectDuplicates(results);

    // 计算统计信息
    const blurryImages = results.filter((r) => r.isBlurry).length;
    const duplicateGroups = this.countDuplicateGroups(results);

    return {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      results,
    };
  }

  /**
   * 计算图片清晰度（拉普拉斯方差）
   * @param imageData 图片数据
   * @returns 清晰度分数
   */
  async calculateSharpness(imageData: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建Canvas上下文"));
            return;
          }

          // 缩放到固定尺寸以提高性能
          const size = IMAGE_CONFIG.CANVAS_SIZE;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // 转换为灰度并计算拉普拉斯方差
          const gray = new Array(size * size);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
          }

          // 拉普拉斯算子
          let variance = 0;
          for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
              const idx = y * size + x;
              const laplacian =
                -gray[idx - size - 1] -
                gray[idx - size] -
                gray[idx - size + 1] +
                -gray[idx - 1] +
                8 * gray[idx] -
                gray[idx + 1] +
                -gray[idx + size - 1] -
                gray[idx + size] -
                gray[idx + size + 1];
              variance += laplacian * laplacian;
            }
          }

          variance /= (size - 2) * (size - 2);
          URL.revokeObjectURL(url);
          resolve(variance);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };

      img.src = url;
    });
  }

  /**
   * 计算图片感知哈希
   * @param imageData 图片数据
   * @returns 哈希字符串
   */
  async calculateHash(imageData: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建Canvas上下文"));
            return;
          }

          const size = IMAGE_CONFIG.HASH_SIZE;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // 转换为灰度
          const gray = new Array(size * size);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
          }

          // 计算平均值
          const average = gray.reduce((sum, val) => sum + val, 0) / gray.length;

          // 生成哈希
          let hash = "";
          for (let i = 0; i < gray.length; i++) {
            hash += gray[i] > average ? "1" : "0";
          }

          // 转换为十六进制
          let hexHash = "";
          for (let i = 0; i < hash.length; i += 4) {
            const chunk = hash.substring(i, i + 4);
            hexHash += parseInt(chunk, 2).toString(16);
          }

          URL.revokeObjectURL(url);
          resolve(hexHash);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };

      img.src = url;
    });
  }

  /**
   * 计算图片质量指标（对比度、亮度、噪点）
   * @param imageData 图片数据
   * @returns 质量指标对象
   */
  private async calculateQualityMetrics(
    imageData: Uint8Array
  ): Promise<{
    contrast: number;
    brightness: number;
    noiseLevel: number;
    isLowContrast: boolean;
    isOverExposed: boolean;
    isUnderExposed: boolean;
    isNoisy: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建Canvas上下文"));
            return;
          }

          // 使用较小的尺寸提高性能
          const size = IMAGE_CONFIG.CANVAS_SIZE;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;
          const pixelCount = size * size;

          // 转换为灰度图
          const gray = new Array(pixelCount);
          let brightnessSum = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const grayValue = 0.299 * r + 0.587 * g + 0.114 * b;
            gray[i / 4] = grayValue;
            brightnessSum += grayValue;
          }

          // 1. 计算亮度（平均灰度值）
          const brightness = brightnessSum / pixelCount;

          // 2. 计算对比度（标准差）
          let varianceSum = 0;
          for (let i = 0; i < gray.length; i++) {
            varianceSum += Math.pow(gray[i] - brightness, 2);
          }
          const stdDev = Math.sqrt(varianceSum / pixelCount);
          const contrast = stdDev;

          // 3. 计算噪点水平（局部方差）
          let noiseSum = 0;
          let noiseCount = 0;

          // 使用3x3窗口计算局部方差
          for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
              const idx = y * size + x;
              const center = gray[idx];

              // 计算邻域平均值
              const neighbors = [
                gray[idx - size - 1],
                gray[idx - size],
                gray[idx - size + 1],
                gray[idx - 1],
                gray[idx + 1],
                gray[idx + size - 1],
                gray[idx + size],
                gray[idx + size + 1],
              ];
              const neighborAvg = neighbors.reduce((a, b) => a + b, 0) / 8;

              // 局部方差
              const localVariance = Math.abs(center - neighborAvg);
              noiseSum += localVariance;
              noiseCount++;
            }
          }

          const noiseLevel = noiseCount > 0 ? noiseSum / noiseCount : 0;

          // 评估质量问题
          const isLowContrast = contrast < IMAGE_CONFIG.MIN_CONTRAST;
          const isOverExposed = brightness > IMAGE_CONFIG.MAX_BRIGHTNESS;
          const isUnderExposed = brightness < IMAGE_CONFIG.MIN_BRIGHTNESS;
          const isNoisy = noiseLevel > IMAGE_CONFIG.MAX_NOISE_LEVEL;

          URL.revokeObjectURL(url);
          resolve({
            contrast: Math.round(contrast * 100) / 100,
            brightness: Math.round(brightness * 100) / 100,
            noiseLevel: Math.round(noiseLevel * 100) / 100,
            isLowContrast,
            isOverExposed,
            isUnderExposed,
            isNoisy,
          });
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };

      img.src = url;
    });
  }

  /**
   * 检测图片纯色边框
   * @param imageData 图片数据
   * @returns 边框检测结果
   */
  async detectSolidBorder(
    imageData: Uint8Array
  ): Promise<{
    hasBorder: boolean;
    borderSides: string[];
    borderWidth: { top?: number; bottom?: number; left?: number; right?: number };
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建Canvas上下文"));
            return;
          }

          // 使用原始尺寸以准确检测边框
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          const width = img.width;
          const height = img.height;

          const borderSides: string[] = [];
          const borderWidth: { top?: number; bottom?: number; left?: number; right?: number } = {};

          // 检测上边框
          const topBorderWidth = this.detectBorderEdge(data, width, height, 'top');
          if (topBorderWidth >= IMAGE_CONFIG.BORDER_MIN_WIDTH && topBorderWidth <= IMAGE_CONFIG.BORDER_MAX_WIDTH) {
            borderSides.push('top');
            borderWidth.top = topBorderWidth;
          }

          // 检测下边框
          const bottomBorderWidth = this.detectBorderEdge(data, width, height, 'bottom');
          if (bottomBorderWidth >= IMAGE_CONFIG.BORDER_MIN_WIDTH && bottomBorderWidth <= IMAGE_CONFIG.BORDER_MAX_WIDTH) {
            borderSides.push('bottom');
            borderWidth.bottom = bottomBorderWidth;
          }

          // 检测左边框
          const leftBorderWidth = this.detectBorderEdge(data, width, height, 'left');
          if (leftBorderWidth >= IMAGE_CONFIG.BORDER_MIN_WIDTH && leftBorderWidth <= IMAGE_CONFIG.BORDER_MAX_WIDTH) {
            borderSides.push('left');
            borderWidth.left = leftBorderWidth;
          }

          // 检测右边框
          const rightBorderWidth = this.detectBorderEdge(data, width, height, 'right');
          if (rightBorderWidth >= IMAGE_CONFIG.BORDER_MIN_WIDTH && rightBorderWidth <= IMAGE_CONFIG.BORDER_MAX_WIDTH) {
            borderSides.push('right');
            borderWidth.right = rightBorderWidth;
          }

          URL.revokeObjectURL(url);
          resolve({
            hasBorder: borderSides.length > 0,
            borderSides,
            borderWidth,
          });
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };

      img.src = url;
    });
  }

  /**
   * 检测单条边的边框
   * @param data 图片像素数据
   * @param width 图片宽度
   * @param height 图片高度
   * @param side 检测的边（'top', 'bottom', 'left', 'right'）
   * @returns 边框宽度（像素数），如果不存在边框返回0
   */
  private detectBorderEdge(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    side: 'top' | 'bottom' | 'left' | 'right'
  ): number {
    const tolerance = IMAGE_CONFIG.BORDER_COLOR_TOLERANCE;
    const consistencyRatio = IMAGE_CONFIG.BORDER_CONSISTENCY_RATIO;
    
    // 根据边的位置确定扫描参数
    let maxScanDepth: number;
    let getPixelIndex: (depth: number, offset: number) => number;
    let scanLength: number;

    switch (side) {
      case 'top':
        maxScanDepth = Math.min(height, 50); // 最多扫描50行
        scanLength = width;
        getPixelIndex = (depth, offset) => (depth * width + offset) * 4;
        break;
      case 'bottom':
        maxScanDepth = Math.min(height, 50);
        scanLength = width;
        getPixelIndex = (depth, offset) => ((height - 1 - depth) * width + offset) * 4;
        break;
      case 'left':
        maxScanDepth = Math.min(width, 50); // 最多扫描50列
        scanLength = height;
        getPixelIndex = (depth, offset) => (offset * width + depth) * 4;
        break;
      case 'right':
        maxScanDepth = Math.min(width, 50);
        scanLength = height;
        getPixelIndex = (depth, offset) => (offset * width + (width - 1 - depth)) * 4;
        break;
    }

    let borderStartDepth = -1;
    let lastLineBrightness: number | null = null;
    
    // 从外向内逐行/列扫描
    for (let depth = 0; depth < maxScanDepth; depth++) {
      // 获取当前行/列的所有像素颜色
      const colors: number[][] = [];
      for (let offset = 0; offset < scanLength; offset++) {
        const idx = getPixelIndex(depth, offset);
        colors.push([data[idx], data[idx + 1], data[idx + 2]]);
      }

      // 计算当前行/列的平均亮度
      const currentBrightness = colors.reduce((sum, color) => 
        sum + (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]), 0
      ) / colors.length;

      // 检查这行/列是否是纯色边框
      if (this.isSolidColorLine(colors, tolerance, consistencyRatio)) {
        if (borderStartDepth === -1) {
          borderStartDepth = depth;
        }
        lastLineBrightness = currentBrightness;
        continue;
      } else {
        // 遇到非纯色行/列
        if (depth === 0) {
          // 第一行/列就不是纯色，无边框
          return 0;
        }
        
        // 检查边框与内容的对比度（避免将内部的白色区域误判为边框）
        if (lastLineBrightness !== null) {
          const brightnessDiff = Math.abs(currentBrightness - lastLineBrightness);
          // 如果亮度差异很小，说明不是真正的边界，可能是内部区域
          if (brightnessDiff < IMAGE_CONFIG.BORDER_BRIGHTNESS_DIFF) {
            return 0;
          }
        }
        
        return depth;
      }
    }

    // 如果扫描到最大深度都是纯色，可能不是边框而是大面积纯色区域
    // 返回0表示不认为是边框
    return 0;
  }

  /**
   * 检查一行/列像素是否为纯色
   * @param colors 像素颜色数组 [[r,g,b], [r,g,b], ...]
   * @param tolerance 颜色容差
   * @param consistencyRatio 一致性比例阈值
   * @returns 是否为纯色
   */
  private isSolidColorLine(
    colors: number[][],
    tolerance: number,
    consistencyRatio: number
  ): boolean {
    if (colors.length === 0) return false;

    // 计算平均颜色
    const avgColor = [0, 0, 0];
    for (const color of colors) {
      avgColor[0] += color[0];
      avgColor[1] += color[1];
      avgColor[2] += color[2];
    }
    avgColor[0] = Math.round(avgColor[0] / colors.length);
    avgColor[1] = Math.round(avgColor[1] / colors.length);
    avgColor[2] = Math.round(avgColor[2] / colors.length);

    // 检查有多少像素在容差范围内
    let consistentPixels = 0;
    for (const color of colors) {
      const rDiff = Math.abs(color[0] - avgColor[0]);
      const gDiff = Math.abs(color[1] - avgColor[1]);
      const bDiff = Math.abs(color[2] - avgColor[2]);

      // 使用最大色差作为判断标准（允许轻微渐变）
      if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
        consistentPixels++;
      }
    }

    // 检查一致性比例是否达到阈值
    const ratio = consistentPixels / colors.length;
    return ratio >= consistencyRatio;
  }

  /**
   * 检测图片水印（边缘文字检测）
   * @param imageData 图片数据
   * @returns 水印检测结果
   */
  async detectWatermark(
    imageData: Uint8Array
  ): Promise<{
    hasWatermark: boolean;
    watermarkRegions: string[];
    watermarkConfidence: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建Canvas上下文"));
            return;
          }

          // 性能优化：降采样到合理尺寸
          const maxSize = IMAGE_CONFIG.WATERMARK_MAX_SIZE;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.floor(img.width * scale);
          const height = Math.floor(img.height * scale);

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // 定义检测区域：9宫格策略（外围一圈+底部中心）
          const regionRatio = IMAGE_CONFIG.WATERMARK_EDGE_REGION_RATIO;
          const regions = {
            // 顶部两角
            topLeft: {
              x: 0,
              y: 0,
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * regionRatio),
              name: 'topLeft',
            },
            topRight: {
              x: Math.floor(width * (1 - regionRatio)),
              y: 0,
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * regionRatio),
              name: 'topRight',
            },
            // 左右中间（新增）
            leftMiddle: {
              x: 0,
              y: Math.floor(height * 0.4),
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * 0.2),
              name: 'leftMiddle',
            },
            rightMiddle: {
              x: Math.floor(width * (1 - regionRatio)),
              y: Math.floor(height * 0.4),
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * 0.2),
              name: 'rightMiddle',
            },
            // 底部三个区域
            bottomLeft: {
              x: 0,
              y: Math.floor(height * (1 - regionRatio)),
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * regionRatio),
              name: 'bottomLeft',
            },
            bottomRight: {
              x: Math.floor(width * (1 - regionRatio)),
              y: Math.floor(height * (1 - regionRatio)),
              width: Math.floor(width * regionRatio),
              height: Math.floor(height * regionRatio),
              name: 'bottomRight',
            },
            centerBottom: {
              x: Math.floor(width * 0.35),
              y: Math.floor(height * (1 - IMAGE_CONFIG.WATERMARK_CENTER_BOTTOM_HEIGHT)),
              width: Math.floor(width * 0.3),
              height: Math.floor(height * IMAGE_CONFIG.WATERMARK_CENTER_BOTTOM_HEIGHT),
              name: 'centerBottom',
            },
          };

          // 检测每个区域
          const watermarkRegions: string[] = [];
          let totalConfidence = 0;

          for (const [key, region] of Object.entries(regions)) {
            const regionData = this.extractRegion(data, width, height, region);
            const features = this.analyzeRegionFeatures(regionData, region.width, region.height);

            // 判断是否为水印
            if (this.isWatermarkRegion(features)) {
              watermarkRegions.push(region.name);
              totalConfidence += features.confidence;
            }
          }

          // 计算总体置信度
          const avgConfidence =
            watermarkRegions.length > 0 ? totalConfidence / watermarkRegions.length : 0;

          URL.revokeObjectURL(url);
          resolve({
            hasWatermark: watermarkRegions.length > 0,
            watermarkRegions,
            watermarkConfidence: Math.min(1, avgConfidence),
          });
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };

      img.src = url;
    });
  }

  /**
   * 提取区域像素数据
   */
  private extractRegion(
    data: Uint8ClampedArray,
    imageWidth: number,
    imageHeight: number,
    region: { x: number; y: number; width: number; height: number }
  ): Uint8ClampedArray {
    const regionData = new Uint8ClampedArray(region.width * region.height * 4);
    let destIdx = 0;

    for (let y = 0; y < region.height; y++) {
      for (let x = 0; x < region.width; x++) {
        const srcX = region.x + x;
        const srcY = region.y + y;
        const srcIdx = (srcY * imageWidth + srcX) * 4;

        regionData[destIdx++] = data[srcIdx];
        regionData[destIdx++] = data[srcIdx + 1];
        regionData[destIdx++] = data[srcIdx + 2];
        regionData[destIdx++] = data[srcIdx + 3];
      }
    }

    return regionData;
  }

  /**
   * 分析区域特征
   */
  private analyzeRegionFeatures(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): {
    edgeStrength: number;
    contrast: number;
    textureComplexity: number;
    averageBrightness: number;
    confidence: number;
  } {
    // 转换为灰度图
    const gray = new Array(width * height);
    let brightnessSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const grayValue = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i / 4] = grayValue;
      brightnessSum += grayValue;
    }

    const averageBrightness = brightnessSum / gray.length;

    // 1. 计算边缘强度（Sobel算子）
    let edgeStrength = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // Sobel X
        const gx =
          -gray[idx - width - 1] +
          gray[idx - width + 1] -
          2 * gray[idx - 1] +
          2 * gray[idx + 1] -
          gray[idx + width - 1] +
          gray[idx + width + 1];
        // Sobel Y
        const gy =
          -gray[idx - width - 1] -
          2 * gray[idx - width] -
          gray[idx - width + 1] +
          gray[idx + width - 1] +
          2 * gray[idx + width] +
          gray[idx + width + 1];
        edgeStrength += Math.sqrt(gx * gx + gy * gy);
      }
    }
    edgeStrength /= (width - 2) * (height - 2);

    // 2. 计算对比度（标准差）
    let varianceSum = 0;
    for (let i = 0; i < gray.length; i++) {
      varianceSum += Math.pow(gray[i] - averageBrightness, 2);
    }
    const contrast = Math.sqrt(varianceSum / gray.length);

    // 3. 计算纹理复杂度（局部方差）
    let textureSum = 0;
    let textureCount = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = gray[idx];
        const neighbors = [
          gray[idx - width - 1],
          gray[idx - width],
          gray[idx - width + 1],
          gray[idx - 1],
          gray[idx + 1],
          gray[idx + width - 1],
          gray[idx + width],
          gray[idx + width + 1],
        ];
        const neighborAvg = neighbors.reduce((a, b) => a + b, 0) / 8;
        textureSum += Math.abs(center - neighborAvg);
        textureCount++;
      }
    }
    const textureComplexity = textureCount > 0 ? textureSum / textureCount : 0;

    // 计算总体置信度（0-1）
    const edgeScore = Math.min(1, edgeStrength / 50); // 归一化到50
    const contrastScore = Math.min(1, contrast / 60);
    const textureScore = Math.min(1, textureComplexity / 25);
    const confidence = (edgeScore + contrastScore + textureScore) / 3;

    return {
      edgeStrength,
      contrast,
      textureComplexity,
      averageBrightness,
      confidence,
    };
  }

  /**
   * 判断区域是否为水印
   */
  private isWatermarkRegion(features: {
    edgeStrength: number;
    contrast: number;
    textureComplexity: number;
    averageBrightness: number;
    confidence: number;
  }): boolean {
    return (
      features.edgeStrength > IMAGE_CONFIG.WATERMARK_EDGE_THRESHOLD &&
      features.contrast > IMAGE_CONFIG.WATERMARK_CONTRAST_THRESHOLD &&
      features.textureComplexity > IMAGE_CONFIG.WATERMARK_MIN_TEXT_COMPLEXITY &&
      features.averageBrightness > IMAGE_CONFIG.WATERMARK_MIN_BRIGHTNESS
    );
  }

  /**
   * 检测重复图片
   * @param results 图片验证结果数组
   */
  private detectDuplicates(results: ImageValidationResult[]): void {
    for (let i = 0; i < results.length; i++) {
      const current = results[i];
      if (!current.hash) continue;

      for (let j = i + 1; j < results.length; j++) {
        const other = results[j];
        if (!other.hash) continue;

        const distance = this.hammingDistance(current.hash, other.hash);
        if (distance <= this.duplicateThreshold) {
          // 检查是否已经存在该重复项
          if (!current.duplicates.some((dup) => dup.id === other.id)) {
            current.duplicates.push({
              id: other.id,
              position: other.position,
              row: other.row,
              column: other.column,
            });
          }
          if (!other.duplicates.some((dup) => dup.id === current.id)) {
            other.duplicates.push({
              id: current.id,
              position: current.position,
              row: current.row,
              column: current.column,
            });
          }
        }
      }
    }
  }

  /**
   * 计算汉明距离
   * @param hash1 哈希1
   * @param hash2 哈希2
   * @returns 汉明距离
   */
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const val1 = parseInt(hash1[i], 16);
      const val2 = parseInt(hash2[i], 16);
      const xor = val1 ^ val2;

      // 计算二进制中1的个数
      let bits = xor;
      while (bits) {
        distance++;
        bits &= bits - 1;
      }
    }
    return distance;
  }

  /**
   * 统计重复组数量
   * @param results 图片验证结果数组
   * @returns 重复组数量
   */
  private countDuplicateGroups(results: ImageValidationResult[]): number {
    const processed = new Set<string>();
    let groups = 0;

    for (const result of results) {
      if (result.duplicates.length > 0 && !processed.has(result.id)) {
        groups++;
        processed.add(result.id);
        // 标记所有相关的重复图片
        for (const dup of result.duplicates) {
          processed.add(dup.id);
        }
      }
    }

    return groups;
  }

  /**
   * 合并并去重图片数组
   * @param imageArrays 图片数组的数组
   * @returns 合并后的图片数组
   */
  private mergeAndDeduplicateImages(imageArrays: ImageInfo[]): ImageInfo[] {
    const imageMap = new Map<string, ImageInfo>();

    for (const image of imageArrays) {
      const key = `${image.name}_${image.size}`;
      if (!imageMap.has(key)) {
        imageMap.set(key, image);
      }
    }

    return Array.from(imageMap.values());
  }

  // 占位方法，将在下一步实现
  private async extractFromFormulas(
    file: File,
    selectedSheet?: string
  ): Promise<ImageInfo[]> {
    return [];
  }

  private async extractFromZip(
    file: File,
    selectedSheet?: string
  ): Promise<ImageInfo[]> {
    return [];
  }

  private async extractFromZipFallback(file: File): Promise<ImageInfo[]> {
    return [];
  }
}
