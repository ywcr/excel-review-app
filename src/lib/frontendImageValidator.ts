import JSZip from "jszip";
import { wasmImageProcessor, WasmImageProcessor } from "./wasmImageProcessor";

export interface ImageInfo {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  data: Uint8Array;
}

export interface ImageValidationResult {
  id: string;
  sharpness: number;
  isBlurry: boolean;
  hash: string;
  duplicates: string[];
}

export interface ImageValidationSummary {
  totalImages: number;
  blurryImages: number;
  duplicateGroups: number;
  results: ImageValidationResult[];
}

export class FrontendImageValidator {
  private blurThreshold: number = 100; // 清晰度阈值
  private duplicateThreshold: number = 5; // 重复检测汉明距离阈值
  private useWasm: boolean = false; // 是否使用WASM加速

  constructor(options?: {
    blurThreshold?: number;
    duplicateThreshold?: number;
    useWasm?: boolean;
  }) {
    if (options?.blurThreshold) this.blurThreshold = options.blurThreshold;
    if (options?.duplicateThreshold)
      this.duplicateThreshold = options.duplicateThreshold;
    if (options?.useWasm && WasmImageProcessor.isSupported()) {
      this.useWasm = options.useWasm;
    }
  }

  // 从Excel文件中提取图片
  async extractImages(file: File): Promise<ImageInfo[]> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const images: ImageInfo[] = [];

    // 遍历 xl/media 目录中的图片文件
    const mediaFolder = zipContent.folder("xl/media");
    if (!mediaFolder) {
      return images;
    }

    const imagePromises: Promise<void>[] = [];

    mediaFolder.forEach((relativePath, file) => {
      if (file.dir) return;

      const fileName = file.name.toLowerCase();
      if (
        fileName.endsWith(".png") ||
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg")
      ) {
        const promise = file.async("uint8array").then(async (data) => {
          try {
            const dimensions = await this.getImageDimensions(data);
            images.push({
              id: relativePath,
              name: relativePath,
              size: data.length,
              width: dimensions.width,
              height: dimensions.height,
              mimeType: this.getMimeType(fileName),
              data,
            });
          } catch (error) {
            console.warn(`Failed to process image ${relativePath}:`, error);
          }
        });
        imagePromises.push(promise);
      }
    });

    await Promise.all(imagePromises);
    return images;
  }

  // 获取图片尺寸
  private async getImageDimensions(
    data: Uint8Array
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([new Uint8Array(data)]);
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  // 获取MIME类型
  private getMimeType(fileName: string): string {
    if (fileName.endsWith(".png")) return "image/png";
    if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
      return "image/jpeg";
    return "image/unknown";
  }

  // 验证图片清晰度和重复性
  async validateImages(
    images: ImageInfo[],
    onProgress?: (progress: number) => void
  ): Promise<ImageValidationSummary> {
    const results: ImageValidationResult[] = [];
    const concurrency = 2; // 限制并发数量

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
          };
        } catch (error) {
          console.warn(`Failed to validate image ${image.id}:`, error);
          return {
            id: image.id,
            sharpness: 0,
            isBlurry: true,
            hash: "",
            duplicates: [],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 报告进度
      if (onProgress) {
        const progress = Math.min(
          100,
          ((i + concurrency) / images.length) * 100
        );
        onProgress(progress);
      }
    }

    // 检测重复图片
    this.detectDuplicates(results);

    // 统计结果
    const blurryImages = results.filter((r) => r.isBlurry).length;
    const duplicateGroups = this.countDuplicateGroups(results);

    return {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      results,
    };
  }

  // 计算图片清晰度（拉普拉斯方差）
  private async calculateSharpness(imageData: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error("Cannot get canvas context"));
            return;
          }

          // 缩放到固定尺寸以提高性能
          const size = 64;
          canvas.width = size;
          canvas.height = size;

          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // 转换为灰度并计算拉普拉斯方差
          const gray: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray.push(0.299 * r + 0.587 * g + 0.114 * b);
          }

          // 拉普拉斯算子
          let variance = 0;
          let count = 0;

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
              count++;
            }
          }

          URL.revokeObjectURL(url);
          resolve(count > 0 ? variance / count : 0);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for sharpness calculation"));
      };

      img.src = url;
    });
  }

  // 计算感知哈希（dHash）
  private async calculateHash(imageData: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([new Uint8Array(imageData)]);
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error("Cannot get canvas context"));
            return;
          }

          // dHash 需要 9x8 的图像
          const width = 9;
          const height = 8;
          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // 转换为灰度
          const gray: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray.push(0.299 * r + 0.587 * g + 0.114 * b);
          }

          // 计算dHash
          let hash = "";
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width - 1; x++) {
              const left = gray[y * width + x];
              const right = gray[y * width + x + 1];
              hash += left > right ? "1" : "0";
            }
          }

          // 转换为十六进制
          let hexHash = "";
          for (let i = 0; i < hash.length; i += 4) {
            const chunk = hash.substr(i, 4);
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
        reject(new Error("Failed to load image for hash calculation"));
      };

      img.src = url;
    });
  }

  // 检测重复图片
  private detectDuplicates(results: ImageValidationResult[]): void {
    for (let i = 0; i < results.length; i++) {
      const current = results[i];
      if (!current.hash) continue;

      for (let j = i + 1; j < results.length; j++) {
        const other = results[j];
        if (!other.hash) continue;

        const distance = this.hammingDistance(current.hash, other.hash);
        if (distance <= this.duplicateThreshold) {
          if (!current.duplicates.includes(other.id)) {
            current.duplicates.push(other.id);
          }
          if (!other.duplicates.includes(current.id)) {
            other.duplicates.push(current.id);
          }
        }
      }
    }
  }

  // 计算汉明距离
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return Infinity;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  // 统计重复组数量
  private countDuplicateGroups(results: ImageValidationResult[]): number {
    const visited = new Set<string>();
    let groups = 0;

    for (const result of results) {
      if (visited.has(result.id) || result.duplicates.length === 0) {
        continue;
      }

      // 找到一个新的重复组
      groups++;
      const queue = [result.id];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;

        visited.add(current);
        const currentResult = results.find((r) => r.id === current);
        if (currentResult) {
          queue.push(
            ...currentResult.duplicates.filter((id) => !visited.has(id))
          );
        }
      }
    }

    return groups;
  }
}
