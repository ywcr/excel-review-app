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
  position?: string; // Excel位置，如 "A4"
  row?: number; // Excel行号
  column?: string; // Excel列号
  imageId?: string; // DISPIMG公式中的图片ID
  extractionMethod?: "formula" | "zip" | "fallback"; // 提取方法
}

export interface DuplicateInfo {
  id: string;
  position?: string;
  row?: number;
  column?: string;
}

export interface ImageValidationResult {
  id: string;
  sharpness: number;
  isBlurry: boolean;
  hash: string;
  duplicates: DuplicateInfo[];
  position?: string; // Excel位置，如 "A4"
  row?: number; // Excel行号
  column?: string; // Excel列号
}

export interface ImageValidationSummary {
  totalImages: number;
  blurryImages: number;
  duplicateGroups: number;
  results: ImageValidationResult[];
}

export class FrontendImageValidator {
  private blurThreshold: number = 80; // 清晰度阈值（放宽）
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

  // 从Excel文件中提取图片 - 增强版多方法提取
  async extractImages(file: File): Promise<ImageInfo[]> {
    console.log("开始前端多方法图片提取...");

    try {
      // 方法1: 优先使用DISPIMG公式提取（最准确）
      const formulaImages = await this.extractFromFormulas(file);
      console.log(`公式方法提取到 ${formulaImages.length} 个图片`);

      // 方法2: 使用ZIP解析作为补充
      const zipImages = await this.extractFromZip(file);
      console.log(`ZIP方法提取到 ${zipImages.length} 个图片`);

      // 合并结果，优先使用公式方法
      const allImages = this.mergeAndDeduplicateImages([
        ...formulaImages,
        ...zipImages,
      ]);

      console.log(`最终合并得到 ${allImages.length} 个图片`);
      return allImages;
    } catch (error) {
      console.error("增强提取失败，回退到原始方法:", error);
      return this.extractFromZipFallback(file);
    }
  }

  // 方法1: 从DISPIMG公式提取图片（最准确的方法）
  private async extractFromFormulas(file: File): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // 查找工作表文件
      const worksheetFiles: string[] = [];
      zipContent.forEach((relativePath, file) => {
        if (
          relativePath.startsWith("xl/worksheets/") &&
          relativePath.endsWith(".xml") &&
          !file.dir
        ) {
          worksheetFiles.push(relativePath);
        }
      });

      // 建立图片ID到物理文件的映射
      const imageIdToFile = await this.buildImageIdToFileMap(zipContent);

      // 解析每个工作表中的DISPIMG公式
      for (const worksheetPath of worksheetFiles) {
        const worksheetFile = zipContent.file(worksheetPath);
        if (worksheetFile) {
          const worksheetXml = await worksheetFile.async("text");
          const formulaImages = await this.extractFormulasFromWorksheet(
            worksheetXml,
            worksheetPath,
            imageIdToFile,
            zipContent
          );
          images.push(...formulaImages);
        }
      }
    } catch (error) {
      console.warn("公式提取失败:", error);
    }

    return images;
  }

  // 方法2: 使用ZIP解析提取图片
  private async extractFromZip(file: File): Promise<ImageInfo[]> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const images: ImageInfo[] = [];

    // 首先提取图片位置信息
    const imagePositions = await this.extractImagePositions(zipContent);

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
            // 尝试多种键匹配策略
            let positionInfo = imagePositions.get(relativePath);
            if (!positionInfo) {
              positionInfo = imagePositions.get(`xl/media/${relativePath}`);
            }
            if (!positionInfo) {
              // 如果还是找不到，使用默认值
              positionInfo = {
                position: "未知位置",
                row: 0,
                column: "A",
              };
            }

            images.push({
              id: relativePath,
              name: relativePath,
              size: data.length,
              width: dimensions.width,
              height: dimensions.height,
              mimeType: this.getMimeType(fileName),
              data,
              position: positionInfo?.position || "未知位置",
              row: positionInfo?.row,
              column: positionInfo?.column,
              extractionMethod: "zip",
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

  // 建立图片ID到物理文件的映射
  private async buildImageIdToFileMap(
    zipContent: JSZip
  ): Promise<Map<string, string>> {
    const imageIdToFile = new Map<string, string>();

    try {
      // 检查 WPS cellimages.xml 关系
      const cellImagesRelsFile = zipContent.file(
        "xl/_rels/cellimages.xml.rels"
      );
      if (cellImagesRelsFile) {
        const relsText = await cellImagesRelsFile.async("text");

        // 简单的XML解析，提取关系映射
        const relationshipRegex =
          /<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g;
        let match;

        while ((match = relationshipRegex.exec(relsText)) !== null) {
          const id = match[1];
          const target = match[2];
          if (id && target) {
            const basename = target.replace(/^.*\//, "");
            imageIdToFile.set(id, basename);
          }
        }
      }
    } catch (error) {
      console.warn("建立图片ID映射失败:", error);
    }

    return imageIdToFile;
  }

  // 从工作表XML中提取DISPIMG公式
  private async extractFormulasFromWorksheet(
    worksheetXml: string,
    worksheetPath: string,
    imageIdToFile: Map<string, string>,
    zipContent: JSZip
  ): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    try {
      // 简单的XML解析，查找包含DISPIMG的单元格
      const cellRegex =
        /<c[^>]*r="([^"]*)"[^>]*>.*?<f[^>]*>(.*?DISPIMG.*?)<\/f>.*?<\/c>/gs;
      let match;

      while ((match = cellRegex.exec(worksheetXml)) !== null) {
        const cellRef = match[1];
        const formula = match[2];

        // 提取图片ID
        const imageIdMatch = formula.match(/DISPIMG\("([^"]+)"/);
        const imageId = imageIdMatch ? imageIdMatch[1] : null;

        if (imageId && cellRef) {
          // 尝试获取对应的物理文件
          const fileName = imageIdToFile.get(imageId);
          let imageData: Uint8Array | null = null;

          if (fileName) {
            const mediaFile = zipContent.file(`xl/media/${fileName}`);
            if (mediaFile) {
              imageData = await mediaFile.async("uint8array");
            }
          }

          if (imageData) {
            const dimensions = await this.getImageDimensions(imageData);
            const { row, column } = this.parseCellReference(cellRef);

            images.push({
              id: `formula_${cellRef}_${imageId}`,
              name: fileName || `${imageId}.jpg`,
              size: imageData.length,
              width: dimensions.width,
              height: dimensions.height,
              mimeType: this.getMimeType(fileName || "image.jpg"),
              data: imageData,
              position: cellRef,
              row: row,
              column: column,
              imageId: imageId,
              extractionMethod: "formula",
            });
          }
        }
      }
    } catch (error) {
      console.warn(`从工作表 ${worksheetPath} 提取公式失败:`, error);
    }

    return images;
  }

  // 解析单元格引用（如 "M93" -> {row: 93, column: "M"}）
  private parseCellReference(cellRef: string): { row: number; column: string } {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      return {
        column: match[1],
        row: parseInt(match[2], 10),
      };
    }
    return { column: "A", row: 1 };
  }

  // 合并并去重图片数组
  private mergeAndDeduplicateImages(imageArrays: ImageInfo[]): ImageInfo[] {
    const seen = new Set<string>();
    const merged: ImageInfo[] = [];

    // 按提取方法优先级排序：formula > zip > fallback
    const priorityOrder = ["formula", "zip", "fallback"];
    const sortedImages = imageArrays.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.extractionMethod || "fallback");
      const bPriority = priorityOrder.indexOf(b.extractionMethod || "fallback");
      return aPriority - bPriority;
    });

    for (const image of sortedImages) {
      const key = `${image.position}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(image);
      }
    }

    return merged;
  }

  // 回退方法：使用原始ZIP方法
  private async extractFromZipFallback(file: File): Promise<ImageInfo[]> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const images: ImageInfo[] = [];

    // 简化的图片提取，不依赖位置信息
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
              position: "未知位置",
              extractionMethod: "fallback",
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
            ...currentResult.duplicates
              .map((dup) => dup.id)
              .filter((id) => !visited.has(id))
          );
        }
      }
    }

    return groups;
  }

  // 从Excel文件中提取图片位置信息
  private async extractImagePositions(
    zipContent: JSZip
  ): Promise<Map<string, { position: string; row: number; column: string }>> {
    const imagePositions = new Map();

    try {
      // Helper to read a file as string if exists
      const readTextIfExists = async (path: string): Promise<string | null> => {
        const file = zipContent.file(path);
        if (!file) return null;
        try {
          return await file.async("string");
        } catch {
          return null;
        }
      };

      // Helper: parse XML safely
      const parseXml = (xmlText: string): Document | null => {
        try {
          const parser = new DOMParser();
          return parser.parseFromString(xmlText, "application/xml");
        } catch {
          return null;
        }
      };

      const columnIndexToLetter = (index: number): string => {
        // Excel columns are 0-based here; convert to letters
        let n = Number(index);
        if (Number.isNaN(n) || n < 0) n = 0;
        let result = "";
        n = n + 1; // convert to 1-based
        while (n > 0) {
          const rem = (n - 1) % 26;
          result = String.fromCharCode(65 + rem) + result;
          n = Math.floor((n - 1) / 26);
        }
        return result;
      };

      // 首先尝试处理 WPS 的 cellimages.xml 结构
      const cellimagesResult = await this.extractFromCellImages(
        zipContent,
        readTextIfExists,
        parseXml,
        columnIndexToLetter
      );
      if (cellimagesResult.size > 0) {
        console.log(
          `🎯 从 cellimages.xml 提取到 ${cellimagesResult.size} 个图片位置`
        );
        return cellimagesResult;
      }

      // 标准 OOXML 解析路径
      return await this.extractFromStandardDrawings(
        zipContent,
        readTextIfExists,
        parseXml,
        columnIndexToLetter
      );
    } catch (error) {
      console.warn("无法提取图片位置信息:", error);
      return new Map();
    }
  }

  // 从 WPS 的 cellimages.xml 提取图片位置
  private async extractFromCellImages(
    zipContent: JSZip,
    readTextIfExists: (path: string) => Promise<string | null>,
    parseXml: (xmlText: string) => Document | null,
    columnIndexToLetter: (index: number) => string
  ): Promise<Map<string, { position: string; row: number; column: string }>> {
    const imagePositions = new Map();

    // 检查是否存在 cellimages.xml
    const cellimagesXmlText = await readTextIfExists("xl/cellimages.xml");
    if (!cellimagesXmlText) return imagePositions;

    const cellimagesRelsText = await readTextIfExists(
      "xl/_rels/cellimages.xml.rels"
    );
    if (!cellimagesRelsText) return imagePositions;

    const cellimagesRelsXml = parseXml(cellimagesRelsText);
    if (!cellimagesRelsXml) return imagePositions;

    // 构建关系映射 rId -> 图片文件名
    const embedRelMap = new Map();
    const rels = cellimagesRelsXml.getElementsByTagName("Relationship");
    for (let i = 0; i < rels.length; i++) {
      const rel = rels[i];
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        // target 格式: "media/image1.jpeg"
        const basename = target.replace(/^.*\//, "");
        embedRelMap.set(id, basename);
        console.log(`📎 WPS 关系映射: ${id} -> ${basename}`);
      }
    }

    // 分析表格结构以确定列映射模式
    const tableStructure = await this.analyzeTableStructure(
      zipContent,
      readTextIfExists,
      parseXml
    );
    console.log(`🔍 检测到表格结构:`, tableStructure);

    // WPS 的 cellimages.xml 包含图片但没有位置信息
    // 我们需要使用智能位置估算
    const cellimagesXml = parseXml(cellimagesXmlText);
    if (!cellimagesXml) return imagePositions;

    const cellImages = cellimagesXml.getElementsByTagName("etc:cellImage");
    for (let i = 0; i < cellImages.length; i++) {
      const cellImage = cellImages[i];
      const blipEl = cellImage.getElementsByTagName("a:blip")[0];
      if (!blipEl) continue;

      const embedId = blipEl.getAttribute("r:embed");
      if (!embedId) continue;

      const mediaKey = embedRelMap.get(embedId);
      if (!mediaKey) continue;

      // 尝试从DISPIMG公式获取精确位置
      const dispimgId = cellImage.getAttribute("name");
      let positionInfo = null;

      if (dispimgId) {
        positionInfo = await this.getPositionFromDISPIMG(dispimgId, zipContent);

        // 检查是否有重复图片
        if (positionInfo && positionInfo.isDuplicate) {
          console.warn(`🚨 前端检测到重复图片: ${dispimgId}`);
          console.warn(`   主位置: ${positionInfo.position}`);
          if (positionInfo.duplicates) {
            positionInfo.duplicates.forEach((dup, index) => {
              console.warn(`   重复位置 ${index + 1}: ${dup.position}`);
            });
          }

          // 可以在这里添加重复图片的处理逻辑
          // 例如：记录到验证结果中，或者抛出警告
        }
      }

      // 如果DISPIMG方法失败，回退到智能位置估算
      let method: "dispimg_formula" | "index_estimation";
      let confidence: "high" | "low";
      if (!positionInfo) {
        positionInfo = this.calculateImagePosition(i, tableStructure);
        method = "index_estimation";
        confidence = "low";
      } else {
        method = "dispimg_formula";
        confidence = "high";
      }

      imagePositions.set(mediaKey, {
        position: positionInfo.position,
        row: positionInfo.row,
        column: positionInfo.column,
      });

      console.log(
        `🎯 WPS 图片位置${
          method === "dispimg_formula" ? "(DISPIMG公式)" : "(估算)"
        }: ${mediaKey} -> ${positionInfo.position} (${
          positionInfo.type || method
        }) [${confidence}]`
      );
    }

    return imagePositions;
  }

  // 分析表格结构以确定列映射模式
  private async analyzeTableStructure(
    zipContent: JSZip,
    readTextIfExists: (path: string) => Promise<string | null>,
    parseXml: (xmlText: string) => Document | null
  ): Promise<{
    visitType: string;
    imageColumns: string[];
    columnMappings: { [key: string]: string };
    imagesPerRecord: number;
    dataStartRow: number;
  }> {
    try {
      // 尝试读取工作表数据来分析结构
      const sharedStringsText = await readTextIfExists("xl/sharedStrings.xml");
      const workbookText = await readTextIfExists("xl/workbook.xml");

      // 预定义的结构模式
      const structurePatterns = {
        药店拜访: {
          visitType: "药店拜访",
          imageColumns: ["M", "N"],
          columnMappings: { M: "门头", N: "内部" },
          imagesPerRecord: 2,
          dataStartRow: 4,
        },
        医院拜访类: {
          visitType: "医院拜访类",
          imageColumns: ["O", "P"],
          columnMappings: { O: "医院门头照", P: "科室照片" },
          imagesPerRecord: 2,
          dataStartRow: 4,
        },
        科室拜访: {
          visitType: "科室拜访",
          imageColumns: ["N", "O"],
          columnMappings: { N: "医院门头照", O: "内部照片" },
          imagesPerRecord: 2,
          dataStartRow: 4,
        },
      };

      // 如果无法读取工作表数据，返回默认结构
      if (!sharedStringsText) {
        console.log("📋 使用默认表格结构 (药店拜访模式)");
        return structurePatterns["药店拜访"];
      }

      // 解析共享字符串以检测表头内容
      const sharedStringsXml = parseXml(sharedStringsText);
      const strings: string[] = [];
      if (sharedStringsXml) {
        const siElements = sharedStringsXml.getElementsByTagName("si");
        for (let i = 0; i < siElements.length; i++) {
          const tElement = siElements[i].getElementsByTagName("t")[0];
          if (tElement && tElement.textContent) {
            strings.push(tElement.textContent);
          }
        }
      }

      // 检测表头中的关键词来判断拜访类型
      const headerText = strings.join(" ").toLowerCase();
      console.log("📋 检测到的表头关键词:", headerText.substring(0, 200));

      // 根据表头内容判断拜访类型
      if (
        headerText.includes("医院门头照") &&
        headerText.includes("科室照片")
      ) {
        console.log("🏥 检测到医院拜访类模式");
        return structurePatterns["医院拜访类"];
      } else if (
        headerText.includes("科室") &&
        headerText.includes("内部照片")
      ) {
        console.log("🏥 检测到科室拜访模式");
        return structurePatterns["科室拜访"];
      } else if (headerText.includes("门头") && headerText.includes("内部")) {
        console.log("🏪 检测到药店拜访模式");
        return structurePatterns["药店拜访"];
      }

      // 默认返回药店拜访模式
      console.log("📋 使用默认药店拜访模式");
      return structurePatterns["药店拜访"];
    } catch (error) {
      console.warn("表格结构分析失败，使用默认结构:", error);
      return {
        visitType: "药店拜访",
        imageColumns: ["M", "N"],
        columnMappings: { M: "门头", N: "内部" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      };
    }
  }

  // 从DISPIMG公式获取精确位置 - 支持检测重复图片
  private async getPositionFromDISPIMG(
    dispimgId: string,
    zip: any
  ): Promise<{
    position: string;
    row: number;
    column: string;
    type: string;
    duplicates?: Array<{
      position: string;
      row: number;
      column: string;
      type: string;
    }>;
    isDuplicate?: boolean;
  } | null> {
    try {
      console.log(`🔍 前端查找DISPIMG公式中的图片ID: ${dispimgId}`);

      // 查找工作表文件
      const worksheetFiles = Object.keys(zip.files).filter(
        (name: string) =>
          name.startsWith("xl/worksheets/") && name.endsWith(".xml")
      );

      const allPositions: Array<{
        position: string;
        row: number;
        column: string;
        type: string;
      }> = [];

      for (const worksheetFile of worksheetFiles) {
        const worksheetXml = await zip.file(worksheetFile)?.async("text");
        if (!worksheetXml) continue;

        // 查找包含目标dispimgId的DISPIMG公式
        // 修复：使用更精确的正则表达式来匹配XML结构
        const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
        let match;

        while ((match = cellRegex.exec(worksheetXml)) !== null) {
          const cellRef = match[1];
          const cellContent = match[2];

          // 在单元格内容中查找DISPIMG公式
          const formulaMatch = cellContent.match(
            /<f[^>]*>(.*?DISPIMG.*?)<\/f>/
          );
          if (formulaMatch) {
            const formula = formulaMatch[1];

            // 提取DISPIMG中的图片ID - 处理HTML实体编码
            const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
            if (idMatch && idMatch[1] === dispimgId) {
              // 解析单元格引用
              const cellMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
              if (cellMatch) {
                const column = cellMatch[1];
                const row = parseInt(cellMatch[2]);

                allPositions.push({
                  position: cellRef,
                  row: row,
                  column: column,
                  type:
                    column === "M" ? "门头" : column === "N" ? "内部" : "图片",
                });
              }
            }
          }
        }
      }

      if (allPositions.length === 0) {
        console.log(`❌ 前端未找到DISPIMG公式中的图片ID: ${dispimgId}`);
        return null;
      }

      // 检测重复图片
      if (allPositions.length > 1) {
        console.warn(
          `⚠️ 前端检测到重复图片ID: ${dispimgId}，出现在 ${allPositions.length} 个位置:`
        );
        allPositions.forEach((pos, index) => {
          console.warn(`   ${index + 1}. ${pos.position}`);
        });

        // 返回第一个位置，并标记为重复
        return {
          ...allPositions[0],
          duplicates: allPositions.slice(1),
          isDuplicate: true,
        };
      }

      console.log(
        `✅ 前端找到DISPIMG公式位置: ${dispimgId} -> ${allPositions[0].position}`
      );
      return allPositions[0];
    } catch (error) {
      console.warn("前端从DISPIMG公式获取位置失败:", error);
      return null;
    }
  }

  // 智能计算图片位置
  private calculateImagePosition(
    imageIndex: number,
    tableStructure: {
      visitType: string;
      imageColumns: string[];
      columnMappings: { [key: string]: string };
      imagesPerRecord: number;
      dataStartRow: number;
    }
  ): { position: string; row: number; column: string; type: string } {
    const { imageColumns, columnMappings, imagesPerRecord, dataStartRow } =
      tableStructure;

    // 计算记录索引和图片在记录中的位置
    const recordIndex = Math.floor(imageIndex / imagesPerRecord);
    const imageInRecord = imageIndex % imagesPerRecord;

    // 计算行号
    const row = dataStartRow + recordIndex;

    // 获取列和类型
    const column = imageColumns[imageInRecord] || imageColumns[0];
    const type = columnMappings[column] || `图片${imageInRecord + 1}`;

    return {
      position: `${column}${row}`,
      row,
      column,
      type,
    };
  }

  // 标准 OOXML 绘图解析
  private async extractFromStandardDrawings(
    zipContent: JSZip,
    readTextIfExists: (path: string) => Promise<string | null>,
    parseXml: (xmlText: string) => Document | null,
    columnIndexToLetter: (index: number) => string
  ): Promise<Map<string, { position: string; row: number; column: string }>> {
    const imagePositions = new Map();

    // Iterate all worksheets to find drawing relationships
    const worksheetsFolder = zipContent.folder("xl/worksheets");
    if (!worksheetsFolder) return imagePositions;

    const sheetFiles: string[] = [];
    worksheetsFolder.forEach((relativePath, file) => {
      if (file.dir) return;
      if (relativePath.endsWith(".xml") && relativePath.startsWith("sheet")) {
        sheetFiles.push(relativePath);
      }
    });

    for (const sheetFile of sheetFiles.sort()) {
      const sheetPath = `xl/worksheets/${sheetFile}`;
      const sheetXmlText = await readTextIfExists(sheetPath);
      if (!sheetXmlText) continue;
      const sheetXml = parseXml(sheetXmlText);
      if (!sheetXml) continue;

      // Find drawing r:id in sheet xml
      const drawingEl = sheetXml.getElementsByTagName("drawing")[0];
      if (!drawingEl) continue;
      const drawingRelId =
        drawingEl.getAttribute("r:id") || drawingEl.getAttribute("rel:id");
      if (!drawingRelId) continue;

      // Resolve sheet rels to drawing path
      const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
      const sheetRelsText = await readTextIfExists(sheetRelsPath);
      if (!sheetRelsText) continue;
      const sheetRelsXml = parseXml(sheetRelsText);
      if (!sheetRelsXml) continue;

      const rels = sheetRelsXml.getElementsByTagName("Relationship");
      let drawingTarget = null;
      for (let i = 0; i < rels.length; i++) {
        const r = rels[i];
        if ((r.getAttribute("Id") || r.getAttribute("id")) === drawingRelId) {
          drawingTarget = r.getAttribute("Target");
          break;
        }
      }
      if (!drawingTarget) continue;

      // Normalize drawing path (can be '../drawings/drawing1.xml')
      let drawingPath = drawingTarget;
      if (drawingPath.startsWith("../"))
        drawingPath = drawingPath.replace(/^\.\.\//, "xl/");
      if (!drawingPath.startsWith("xl/"))
        drawingPath = `xl/worksheets/${drawingPath}`; // fallback

      const drawingXmlText = await readTextIfExists(drawingPath);
      if (!drawingXmlText) continue;
      const drawingXml = parseXml(drawingXmlText);
      if (!drawingXml) continue;

      // Load drawing rels to map r:embed -> media path
      const drawingFileName = drawingPath.substring(
        drawingPath.lastIndexOf("/") + 1
      );
      const drawingRelsPath = drawingPath.replace(
        "drawings/" + drawingFileName,
        `drawings/_rels/${drawingFileName}.rels`
      );
      const drawingRelsText = await readTextIfExists(drawingRelsPath);
      const embedRelMap = new Map(); // rId -> media key (basename inside xl/media)
      if (drawingRelsText) {
        const drawingRelsXml = parseXml(drawingRelsText);
        if (drawingRelsXml) {
          const dRels = drawingRelsXml.getElementsByTagName("Relationship");
          for (let i = 0; i < dRels.length; i++) {
            const dr = dRels[i];
            const id = dr.getAttribute("Id") || dr.getAttribute("id");
            let target = dr.getAttribute("Target") || "";
            if (!id || !target) continue;
            // 使用 basename 作为键，提高匹配成功率
            const basename = target.replace(/^.*\//, "");
            embedRelMap.set(id, basename);
          }
        }
      }

      // 支持多种锚点类型：twoCellAnchor, oneCellAnchor
      const anchorSelectors = [
        "xdr:twoCellAnchor",
        "xdr:oneCellAnchor",
        "twoCellAnchor",
        "oneCellAnchor",
      ];

      let anchors: Element[] = [];
      for (const selector of anchorSelectors) {
        const elements = drawingXml.getElementsByTagName(selector);
        if (elements.length > 0) {
          anchors = Array.from(elements);
          console.log(
            `🔗 使用选择器 ${selector} 找到 ${anchors.length} 个锚点`
          );
          break;
        }
      }

      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];

        // 查找 from 元素（支持不同命名空间）
        const fromSelectors = ["xdr:from", "from"];
        let fromEl: Element | null = null;
        for (const selector of fromSelectors) {
          fromEl = anchor.getElementsByTagName(selector)[0];
          if (fromEl) break;
        }

        let colIdx = 0;
        let rowIdx = 0;
        if (fromEl) {
          const colSelectors = ["xdr:col", "col"];
          const rowSelectors = ["xdr:row", "row"];

          let colEl: Element | null = null;
          let rowEl: Element | null = null;
          for (const selector of colSelectors) {
            colEl = fromEl.getElementsByTagName(selector)[0];
            if (colEl) break;
          }
          for (const selector of rowSelectors) {
            rowEl = fromEl.getElementsByTagName(selector)[0];
            if (rowEl) break;
          }

          if (colEl && colEl.textContent)
            colIdx = parseInt(colEl.textContent, 10) || 0;
          if (rowEl && rowEl.textContent)
            rowIdx = parseInt(rowEl.textContent, 10) || 0;
        }

        // 查找 blip 元素（支持不同命名空间和属性）
        const blipSelectors = ["a:blip", "blip"];
        let blipEls: HTMLCollectionOf<Element> | null = null;
        for (const selector of blipSelectors) {
          blipEls = anchor.getElementsByTagName(selector);
          if (blipEls.length > 0) break;
        }

        if (!blipEls || blipEls.length === 0) continue;

        const embedId =
          blipEls[0].getAttribute("r:embed") ||
          blipEls[0].getAttribute("rel:embed") ||
          blipEls[0].getAttribute("embed");
        if (!embedId) continue;

        const mediaKeyFromRel = embedRelMap.get(embedId);
        if (!mediaKeyFromRel) continue;

        const excelRow = rowIdx + 1; // convert to 1-based
        const excelColLetter = columnIndexToLetter(colIdx);
        const position = `${excelColLetter}${excelRow}`;

        imagePositions.set(mediaKeyFromRel, {
          position,
          row: excelRow,
          column: excelColLetter,
        });

        console.log(`🎯 标准图片位置: ${mediaKeyFromRel} -> ${position}`);
      }
    }

    return imagePositions;
  }
}
