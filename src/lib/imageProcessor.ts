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

  // 水印检测配置
  WATERMARK_DETECTION: {
    TRANSPARENCY_THRESHOLD: 0.15, // 透明度检测阈值
    EDGE_DENSITY_THRESHOLD: 0.3, // 边缘密度阈值
    PATTERN_REPETITION_THRESHOLD: 0.7, // 模式重复阈值
    COLOR_VARIANCE_THRESHOLD: 0.2, // 颜色方差阈值
    MIN_WATERMARK_SIZE: 0.05, // 最小水印区域占比
    ANALYSIS_SIZE: 128, // 水印分析Canvas尺寸
  },
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

// 水印检测结果接口
export interface WatermarkDetectionResult {
  hasWatermark: boolean;
  confidence: number; // 0-1，检测置信度
  detectionMethods: string[]; // 检测到水印的方法列表
  details: {
    transparencyScore: number;
    edgeDensityScore: number;
    patternScore: number;
    colorVarianceScore: number;
  };
  regions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: string; // 'text' | 'logo' | 'pattern'
  }>;
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
  watermark?: WatermarkDetectionResult; // 新增水印检测结果
}

// 图片验证汇总接口
export interface ImageValidationSummary {
  totalImages: number;
  blurryImages: number;
  duplicateGroups: number;
  watermarkedImages: number; // 新增：包含水印的图片数量
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
    if (selectedSheet) {
    }

    try {
      // 方法1: 优先使用DISPIMG公式提取（最准确）
      const formulaImages = await this.extractFromFormulas(file, selectedSheet);

      // 方法2: 使用ZIP解析作为补充
      const zipImages = await this.extractFromZip(file, selectedSheet);

      // 合并结果，优先使用公式方法
      const allImages = this.mergeAndDeduplicateImages([
        ...formulaImages,
        ...zipImages,
      ]);

      return allImages;
    } catch (error) {
      console.error("增强提取失败，回退到原始方法:", error);
      return this.extractFromZipFallback(file);
    }
  }

  /**
   * 验证图片质量（清晰度和重复性）
   * @param images 图片数组
   * @returns 验证结果汇总
   */
  async validateImages(images: ImageInfo[]): Promise<ImageValidationSummary> {
    const results: ImageValidationResult[] = [];
    const cores =
      (typeof navigator !== "undefined" &&
        (navigator as any).hardwareConcurrency) ||
      4;
    const concurrency = Math.max(2, Math.min(4, cores)); // 根据硬件并发自适应，范围 2-6

    // 分批处理图片
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async (image) => {
        try {
          const sharpness = await this.calculateSharpness(image.data);
          const hash = await this.calculateHash(image.data);
          const watermark = await this.detectWatermark(image.data);

          return {
            id: image.id,
            sharpness,
            isBlurry: sharpness < this.blurThreshold,
            hash,
            duplicates: [], // 稍后填充
            position: image.position,
            row: image.row,
            column: image.column,
            watermark,
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
            watermark: {
              hasWatermark: false,
              confidence: 0,
              detectionMethods: [],
              details: {
                transparencyScore: 0,
                edgeDensityScore: 0,
                patternScore: 0,
                colorVarianceScore: 0,
              },
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 更新进度
      const progress = Math.round(((i + batch.length) / images.length) * 100);
    }

    // 检测重复图片
    this.detectDuplicates(results);

    // 计算统计信息
    const blurryImages = results.filter((r) => r.isBlurry).length;
    const duplicateGroups = this.countDuplicateGroups(results);
    const watermarkedImages = results.filter(
      (r) => r.watermark?.hasWatermark
    ).length;

    return {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      watermarkedImages,
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

  /**
   * 检测图片中的水印
   * @param imageData 图片数据
   * @returns 水印检测结果
   */
  async detectWatermark(
    imageData: Uint8Array
  ): Promise<WatermarkDetectionResult> {
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

          const size = IMAGE_CONFIG.WATERMARK_DETECTION.ANALYSIS_SIZE;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // 执行多种水印检测算法
          const transparencyScore = this.analyzeTransparency(data, size);
          const edgeDensityScore = this.analyzeEdgeDensity(data, size);
          const patternScore = this.analyzePatternRepetition(data, size);
          const colorVarianceScore = this.analyzeColorVariance(data, size);

          // 综合评估
          const detectionMethods: string[] = [];
          const config = IMAGE_CONFIG.WATERMARK_DETECTION;

          if (transparencyScore > config.TRANSPARENCY_THRESHOLD) {
            detectionMethods.push("transparency");
          }
          if (edgeDensityScore > config.EDGE_DENSITY_THRESHOLD) {
            detectionMethods.push("edge_density");
          }
          if (patternScore > config.PATTERN_REPETITION_THRESHOLD) {
            detectionMethods.push("pattern_repetition");
          }
          if (colorVarianceScore < config.COLOR_VARIANCE_THRESHOLD) {
            detectionMethods.push("color_variance");
          }

          // 计算综合置信度
          const confidence = this.calculateWatermarkConfidence({
            transparencyScore,
            edgeDensityScore,
            patternScore,
            colorVarianceScore,
          });

          const hasWatermark = detectionMethods.length >= 2 || confidence > 0.7;

          URL.revokeObjectURL(url);
          resolve({
            hasWatermark,
            confidence,
            detectionMethods,
            details: {
              transparencyScore,
              edgeDensityScore,
              patternScore,
              colorVarianceScore,
            },
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
   * 分析图片透明度分布（检测半透明水印）
   */
  private analyzeTransparency(data: Uint8ClampedArray, size: number): number {
    let transparentPixels = 0;
    let semiTransparentPixels = 0;
    const totalPixels = size * size;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) {
        transparentPixels++;
      } else if (alpha < 200) {
        semiTransparentPixels++;
      }
    }

    // 半透明像素比例是水印的重要特征
    return semiTransparentPixels / totalPixels;
  }

  /**
   * 分析边缘密度（检测文字或图标水印）
   */
  private analyzeEdgeDensity(data: Uint8ClampedArray, size: number): number {
    // 转换为灰度
    const gray = new Array(size * size);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Sobel边缘检测
    let edgePixels = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;

        // Sobel X
        const gx =
          -gray[idx - size - 1] +
          gray[idx - size + 1] +
          -2 * gray[idx - 1] +
          2 * gray[idx + 1] +
          -gray[idx + size - 1] +
          gray[idx + size + 1];

        // Sobel Y
        const gy =
          -gray[idx - size - 1] -
          2 * gray[idx - size] -
          gray[idx - size + 1] +
          gray[idx + size - 1] +
          2 * gray[idx + size] +
          gray[idx + size + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 30) {
          // 边缘阈值
          edgePixels++;
        }
      }
    }

    return edgePixels / ((size - 2) * (size - 2));
  }

  /**
   * 分析模式重复性（检测重复的水印图案）
   */
  private analyzePatternRepetition(
    data: Uint8ClampedArray,
    size: number
  ): number {
    const blockSize = 16; // 分析块大小
    const blocks: number[][] = [];

    // 将图片分成小块
    for (let y = 0; y < size - blockSize; y += blockSize) {
      for (let x = 0; x < size - blockSize; x += blockSize) {
        const block: number[] = [];
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const idx = ((y + by) * size + (x + bx)) * 4;
            const gray =
              0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            block.push(gray);
          }
        }
        blocks.push(block);
      }
    }

    // 计算块之间的相似性
    let similarPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const similarity = this.calculateBlockSimilarity(blocks[i], blocks[j]);
        if (similarity > 0.8) {
          similarPairs++;
        }
        totalPairs++;
      }
    }

    return totalPairs > 0 ? similarPairs / totalPairs : 0;
  }

  /**
   * 分析颜色方差（检测单调的水印颜色）
   */
  private analyzeColorVariance(data: Uint8ClampedArray, size: number): number {
    const colors: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // 只分析非透明像素
      if (alpha > 50) {
        colors.push(r, g, b);
      }
    }

    if (colors.length === 0) return 0;

    // 计算颜色方差
    const mean = colors.reduce((sum, val) => sum + val, 0) / colors.length;
    const variance =
      colors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      colors.length;

    return Math.sqrt(variance) / 255; // 归一化到0-1
  }

  /**
   * 计算两个图像块的相似性
   */
  private calculateBlockSimilarity(block1: number[], block2: number[]): number {
    if (block1.length !== block2.length) return 0;

    let sum1 = 0,
      sum2 = 0,
      sum1Sq = 0,
      sum2Sq = 0,
      pSum = 0;

    for (let i = 0; i < block1.length; i++) {
      sum1 += block1[i];
      sum2 += block2[i];
      sum1Sq += block1[i] * block1[i];
      sum2Sq += block2[i] * block2[i];
      pSum += block1[i] * block2[i];
    }

    const n = block1.length;
    const num = pSum - (sum1 * sum2) / n;
    const den = Math.sqrt(
      (sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n)
    );

    return den === 0 ? 0 : num / den;
  }

  /**
   * 计算综合水印置信度
   */
  private calculateWatermarkConfidence(scores: {
    transparencyScore: number;
    edgeDensityScore: number;
    patternScore: number;
    colorVarianceScore: number;
  }): number {
    const weights = {
      transparency: 0.3,
      edgeDensity: 0.25,
      pattern: 0.25,
      colorVariance: 0.2,
    };

    const config = IMAGE_CONFIG.WATERMARK_DETECTION;

    // 将各项分数转换为0-1的置信度
    const transparencyConf = Math.min(
      scores.transparencyScore / config.TRANSPARENCY_THRESHOLD,
      1
    );
    const edgeConf = Math.min(
      scores.edgeDensityScore / config.EDGE_DENSITY_THRESHOLD,
      1
    );
    const patternConf = Math.min(
      scores.patternScore / config.PATTERN_REPETITION_THRESHOLD,
      1
    );
    const colorConf = Math.max(
      0,
      1 - scores.colorVarianceScore / config.COLOR_VARIANCE_THRESHOLD
    );

    return (
      transparencyConf * weights.transparency +
      edgeConf * weights.edgeDensity +
      patternConf * weights.pattern +
      colorConf * weights.colorVariance
    );
  }
}
