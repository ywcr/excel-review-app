// 🚀 前端图片验证器 - 兼容性包装器
//
// 此文件为了保持向后兼容性而保留，实际功能已迁移到 imageProcessor.ts
// 新代码应该直接使用 ImageProcessor 类

import {
  ImageProcessor,
  ImageInfo as IImageInfo,
  DuplicateInfo as IDuplicateInfo,
  ImageValidationResult as IImageValidationResult,
  ImageValidationSummary as IImageValidationSummary,
} from './imageProcessor';

// 重新导出类型以保持兼容性
export type ImageInfo = IImageInfo;
export type DuplicateInfo = IDuplicateInfo;
export type ImageValidationResult = IImageValidationResult;
export type ImageValidationSummary = IImageValidationSummary;

/**
 * 前端图片验证器 - 兼容性包装器
 * @deprecated 请直接使用 ImageProcessor 类
 */
export class FrontendImageValidator {
  private processor: ImageProcessor;

  constructor(options?: {
    blurThreshold?: number;
    duplicateThreshold?: number;
    useWasm?: boolean;
  }) {
    this.processor = new ImageProcessor({
      blurThreshold: options?.blurThreshold,
      duplicateThreshold: options?.duplicateThreshold,
    });
  }

  /**
   * 从Excel文件中提取图片
   * @deprecated 请使用 ImageProcessor.extractImages
   */
  async extractImages(
    file: File,
    selectedSheet?: string
  ): Promise<ImageInfo[]> {
    return this.processor.extractImages(file, selectedSheet);
  }

  /**
   * 验证图片质量
   * @deprecated 请使用 ImageProcessor.validateImages
   */
  async validateImages(images: ImageInfo[], enableWatermarkDetection: boolean = false): Promise<ImageValidationSummary> {
    return this.processor.validateImages(images, enableWatermarkDetection);
  }
}