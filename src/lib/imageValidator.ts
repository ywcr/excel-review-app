import ExcelJS from "exceljs";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { Jimp } from "jimp";

// 图片信息接口
export interface ImageInfo {
  id: string;
  sheetName: string;
  position: string;
  buffer: Buffer;
  extension: string;
  width?: number;
  height?: number;
  size: number;
}

// 图片验证结果接口
export interface ImageValidationResult {
  totalImages: number;
  validImages: number;
  sharpnessResults: SharpnessResult[];
  ocrResults: OCRResult[];
  duplicateResults: DuplicateResult[];
  summary: {
    sharpnessIssues: number;
    ocrIssues: number;
    duplicateIssues: number;
  };
}

export interface SharpnessResult {
  imageId: string;
  sheetName: string;
  position: string;
  sharpnessScore: number;
  isSharp: boolean;
  threshold: number;
}

export interface OCRResult {
  imageId: string;
  sheetName: string;
  position: string;
  extractedText: string;
  matchResults: OCRMatchResult[];
  hasIssues: boolean;
}

export interface OCRMatchResult {
  fieldName: string;
  expectedValue: string;
  extractedValue: string;
  isMatch: boolean;
  similarity: number;
  matchType: "exact" | "fuzzy" | "none";
}

export interface DuplicateResult {
  groupId: string;
  images: Array<{
    imageId: string;
    sheetName: string;
    position: string;
    hash: string;
  }>;
  similarity: number;
  isDuplicate: boolean;
}

export class ImageValidator {
  private sharpnessThreshold = 0.1; // 清晰度阈值
  private duplicateThreshold = 0.95; // 重复图片相似度阈值

  /**
   * 从Excel文件中提取所有图片
   */
  async extractImagesFromExcel(buffer: ArrayBuffer): Promise<ImageInfo[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const images: ImageInfo[] = [];
      let imageCounter = 0;

      workbook.worksheets.forEach((worksheet) => {
        const worksheetImages = worksheet.getImages();

        worksheetImages.forEach((image) => {
          const imageData = workbook.model.media?.find(
            (m) => m.index === image.imageId
          );
          if (imageData) {
            imageCounter++;
            const position = this.getImagePosition(image);

            images.push({
              id: `img_${imageCounter}`,
              sheetName: worksheet.name,
              position,
              buffer: imageData.buffer as Buffer,
              extension: imageData.extension || "unknown",
              size: imageData.buffer?.length || 0,
            });
          }
        });
      });

      return images;
    } catch (error) {
      console.error("提取图片失败:", error);
      return [];
    }
  }

  /**
   * 获取图片在Excel中的位置
   */
  private getImagePosition(image: any): string {
    try {
      if (image.range && image.range.tl) {
        const col = this.getColumnLetter(image.range.tl.col);
        const row = image.range.tl.row + 1; // Excel行号从1开始
        return `${col}${row}`;
      }
      return "未知位置";
    } catch {
      return "未知位置";
    }
  }

  /**
   * 将列索引转换为Excel列字母
   */
  private getColumnLetter(colIndex: number): string {
    let result = "";
    while (colIndex >= 0) {
      result = String.fromCharCode(65 + (colIndex % 26)) + result;
      colIndex = Math.floor(colIndex / 26) - 1;
    }
    return result;
  }

  /**
   * 验证图片清晰度
   */
  async validateSharpness(images: ImageInfo[]): Promise<SharpnessResult[]> {
    const results: SharpnessResult[] = [];

    for (const image of images) {
      try {
        const sharpnessScore = await this.calculateSharpness(image.buffer);
        const isSharp = sharpnessScore >= this.sharpnessThreshold;

        results.push({
          imageId: image.id,
          sheetName: image.sheetName,
          position: image.position,
          sharpnessScore,
          isSharp,
          threshold: this.sharpnessThreshold,
        });
      } catch (error) {
        console.error(`计算图片清晰度失败 ${image.id}:`, error);
        results.push({
          imageId: image.id,
          sheetName: image.sheetName,
          position: image.position,
          sharpnessScore: 0,
          isSharp: false,
          threshold: this.sharpnessThreshold,
        });
      }
    }

    return results;
  }

  /**
   * 使用拉普拉斯算子计算图片清晰度
   */
  private async calculateSharpness(imageBuffer: Buffer): Promise<number> {
    try {
      // 转换为灰度图并获取原始像素数据
      const { data, info } = await sharp(imageBuffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height } = info;
      let sum = 0;
      let count = 0;

      // 应用拉普拉斯算子
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const center = data[idx];

          // 拉普拉斯算子: 4*center - (上+下+左+右)
          const laplacian = Math.abs(
            4 * center -
              data[idx - width] - // 上
              data[idx + width] - // 下
              data[idx - 1] - // 左
              data[idx + 1] // 右
          );

          sum += laplacian;
          count++;
        }
      }

      // 归一化到0-1范围
      return count > 0 ? sum / (count * 255) : 0;
    } catch (error) {
      console.error("计算清晰度失败:", error);
      return 0;
    }
  }

  /**
   * OCR文字提取和验证
   */
  async validateOCR(
    images: ImageInfo[],
    excelData: any[]
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (const image of images) {
      try {
        console.log(`正在处理图片OCR: ${image.id}`);

        // 提取文字
        const extractedText = await this.extractTextFromImage(image.buffer);

        // 匹配验证
        const matchResults = await this.matchTextWithExcelData(
          extractedText,
          image.sheetName,
          image.position,
          excelData
        );

        const hasIssues = matchResults.some((match) => !match.isMatch);

        results.push({
          imageId: image.id,
          sheetName: image.sheetName,
          position: image.position,
          extractedText,
          matchResults,
          hasIssues,
        });
      } catch (error) {
        console.error(`OCR处理失败 ${image.id}:`, error);
        results.push({
          imageId: image.id,
          sheetName: image.sheetName,
          position: image.position,
          extractedText: "",
          matchResults: [],
          hasIssues: true,
        });
      }
    }

    return results;
  }

  /**
   * 使用Tesseract.js提取图片中的文字
   */
  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(
        imageBuffer,
        "chi_sim+eng", // 支持中文简体和英文
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR进度: ${Math.round(m.progress * 100)}%`);
            }
          },
        }
      );

      return text.trim();
    } catch (error) {
      console.error("OCR文字提取失败:", error);
      return "";
    }
  }

  /**
   * 将提取的文字与Excel数据进行匹配验证
   */
  private async matchTextWithExcelData(
    extractedText: string,
    sheetName: string,
    position: string,
    excelData: any[]
  ): Promise<OCRMatchResult[]> {
    const results: OCRMatchResult[] = [];

    // 定义需要匹配的字段映射
    const fieldMappings = {
      医疗机构名称: ["医院", "医疗", "机构", "中心", "诊所"],
      药店名称: ["药店", "药房", "大药房"],
      产品名称: ["产品", "药品", "药物"],
      拜访时间: ["时间", "日期", "年", "月", "日"],
      实施人: ["实施", "负责人", "联系人"],
    };

    // 查找对应的Excel行数据
    const rowData = this.findCorrespondingRowData(
      sheetName,
      position,
      excelData
    );

    if (rowData) {
      for (const [fieldName, keywords] of Object.entries(fieldMappings)) {
        if (rowData[fieldName]) {
          const expectedValue = String(rowData[fieldName]);
          const similarity = this.calculateTextSimilarity(
            extractedText,
            expectedValue
          );

          let matchType: "exact" | "fuzzy" | "none" = "none";
          let isMatch = false;

          if (similarity >= 0.8) {
            matchType = "exact";
            isMatch = true;
          } else if (
            similarity >= 0.5 ||
            this.containsKeywords(extractedText, keywords)
          ) {
            matchType = "fuzzy";
            isMatch = true;
          }

          results.push({
            fieldName,
            expectedValue,
            extractedValue: extractedText,
            isMatch,
            similarity,
            matchType,
          });
        }
      }
    }

    return results;
  }

  /**
   * 查找对应的Excel行数据
   */
  private findCorrespondingRowData(
    sheetName: string,
    position: string,
    excelData: any[]
  ): any {
    // 简化实现：返回第一行数据作为示例
    // 实际应用中需要根据图片位置精确匹配对应的行
    return excelData.length > 0 ? excelData[0] : null;
  }

  /**
   * 计算文本相似度
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const str1 = text1.toLowerCase().replace(/\s+/g, "");
    const str2 = text2.toLowerCase().replace(/\s+/g, "");

    if (str1 === str2) return 1.0;

    // 简单的编辑距离算法
    const matrix = Array(str1.length + 1)
      .fill(null)
      .map(() => Array(str2.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0
      ? 1
      : 1 - matrix[str1.length][str2.length] / maxLength;
  }

  /**
   * 检查文本是否包含关键词
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * 检测重复图片
   */
  async validateDuplicates(images: ImageInfo[]): Promise<DuplicateResult[]> {
    const results: DuplicateResult[] = [];
    const imageHashes: Array<{
      imageId: string;
      sheetName: string;
      position: string;
      hash: string;
    }> = [];

    // 计算所有图片的哈希值
    for (const image of images) {
      try {
        const hash = await this.calculatePerceptualHash(image.buffer);
        imageHashes.push({
          imageId: image.id,
          sheetName: image.sheetName,
          position: image.position,
          hash,
        });
      } catch (error) {
        console.error(`计算图片哈希失败 ${image.id}:`, error);
      }
    }

    // 查找重复图片组
    const processedImages = new Set<string>();
    let groupCounter = 0;

    for (let i = 0; i < imageHashes.length; i++) {
      if (processedImages.has(imageHashes[i].imageId)) continue;

      const currentImage = imageHashes[i];
      const duplicateGroup = [currentImage];
      processedImages.add(currentImage.imageId);

      // 查找与当前图片相似的图片
      for (let j = i + 1; j < imageHashes.length; j++) {
        if (processedImages.has(imageHashes[j].imageId)) continue;

        const similarity = this.calculateHashSimilarity(
          currentImage.hash,
          imageHashes[j].hash
        );

        if (similarity >= this.duplicateThreshold) {
          duplicateGroup.push(imageHashes[j]);
          processedImages.add(imageHashes[j].imageId);
        }
      }

      // 如果找到重复图片（组内超过1张图片）
      if (duplicateGroup.length > 1) {
        groupCounter++;
        results.push({
          groupId: `group_${groupCounter}`,
          images: duplicateGroup,
          similarity: this.calculateGroupSimilarity(duplicateGroup),
          isDuplicate: true,
        });
      }
    }

    return results;
  }

  /**
   * 计算感知哈希值
   */
  private async calculatePerceptualHash(imageBuffer: Buffer): Promise<string> {
    try {
      // 使用Jimp计算感知哈希
      const image = await Jimp.read(imageBuffer);

      // 缩放到8x8像素
      image.resize(8, 8);
      image.greyscale();

      const pixels: number[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
          pixels.push(pixel.r); // 灰度值
        }
      }

      // 计算平均值
      const average =
        pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;

      // 生成哈希
      let hash = "";
      for (const pixel of pixels) {
        hash += pixel >= average ? "1" : "0";
      }

      return hash;
    } catch (error) {
      console.error("计算感知哈希失败:", error);
      return "";
    }
  }

  /**
   * 计算哈希相似度
   */
  private calculateHashSimilarity(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 0;

    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return matches / hash1.length;
  }

  /**
   * 计算重复图片组的平均相似度
   */
  private calculateGroupSimilarity(group: Array<{ hash: string }>): number {
    if (group.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalSimilarity += this.calculateHashSimilarity(
          group[i].hash,
          group[j].hash
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1;
  }

  /**
   * 执行完整的图片验证
   */
  async validateImages(
    buffer: ArrayBuffer,
    excelData: any[] = []
  ): Promise<ImageValidationResult> {
    try {
      console.log("开始图片验证...");

      // 提取图片
      const images = await this.extractImagesFromExcel(buffer);
      console.log(`提取到 ${images.length} 张图片`);

      if (images.length === 0) {
        return {
          totalImages: 0,
          validImages: 0,
          sharpnessResults: [],
          ocrResults: [],
          duplicateResults: [],
          summary: {
            sharpnessIssues: 0,
            ocrIssues: 0,
            duplicateIssues: 0,
          },
        };
      }

      // 并行执行各种验证
      const [sharpnessResults, ocrResults, duplicateResults] =
        await Promise.all([
          this.validateSharpness(images),
          this.validateOCR(images, excelData),
          this.validateDuplicates(images),
        ]);

      // 计算统计信息
      const sharpnessIssues = sharpnessResults.filter((r) => !r.isSharp).length;
      const ocrIssues = ocrResults.filter((r) => r.hasIssues).length;
      const duplicateIssues = duplicateResults.reduce(
        (sum, group) => sum + group.images.length,
        0
      );

      const totalIssues = sharpnessIssues + ocrIssues + duplicateIssues;
      const validImages = images.length - totalIssues;

      console.log("图片验证完成");

      return {
        totalImages: images.length,
        validImages: Math.max(0, validImages),
        sharpnessResults,
        ocrResults,
        duplicateResults,
        summary: {
          sharpnessIssues,
          ocrIssues,
          duplicateIssues,
        },
      };
    } catch (error) {
      console.error("图片验证失败:", error);
      return {
        totalImages: 0,
        validImages: 0,
        sharpnessResults: [],
        ocrResults: [],
        duplicateResults: [],
        summary: {
          sharpnessIssues: 0,
          ocrIssues: 0,
          duplicateIssues: 0,
        },
      };
    }
  }
}
