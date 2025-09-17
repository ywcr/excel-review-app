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

          return {
            id: image.id,
            sharpness,
            isBlurry: sharpness < this.blurThreshold,
            hash,
            duplicates: [], // 稍后填充
            position: image.position,
            row: image.row,
            column: image.column,
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
