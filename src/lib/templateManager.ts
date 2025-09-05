import { EMBEDDED_TEMPLATES } from "./embeddedTemplates";

// Minimal template type to support embedded/local/remote templates
// and the validations performed in this manager. Fields are optional
// because different sources may provide different shapes.
interface ValidationTemplate {
  taskName?: string;
  name?: string;
  headers?: string[];
  requiredFields?: string[];
  validationRules?: Array<{ field: string; type: string; message: string }>;
}

// 模板配置
interface TemplateConfig {
  source: "local" | "remote" | "embedded";
  localPath?: string;
  remoteUrl?: string;
  cacheTimeout?: number; // 缓存超时时间（毫秒）
}

// 模板缓存项
interface TemplateCacheItem {
  template: ValidationTemplate;
  timestamp: number;
  source: string;
}

// 默认配置
const DEFAULT_CONFIG: TemplateConfig = {
  source: "local",
  localPath: "/data/模板总汇.xlsx",
  cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
};

class TemplateManager {
  private cache = new Map<string, TemplateCacheItem>();
  private config: TemplateConfig;

  constructor(config: Partial<TemplateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 获取模板
  async getTemplate(taskName: string): Promise<ValidationTemplate | null> {
    // 检查缓存
    const cached = this.getCachedTemplate(taskName);
    if (cached) {
      return cached.template;
    }

    // 尝试从配置的源加载
    let template: ValidationTemplate | null = null;

    try {
      switch (this.config.source) {
        case "local":
          template = await this.loadFromLocal(taskName);
          break;
        case "remote":
          template = await this.loadFromRemote(taskName);
          break;
        case "embedded":
          template = this.loadFromEmbedded(taskName);
          break;
      }
    } catch (error) {
      console.warn(
        `Failed to load template from ${this.config.source}:`,
        error
      );
    }

    // 如果主要源失败，尝试备用源
    if (!template) {
      template = await this.loadWithFallback(taskName);
    }

    // 缓存结果
    if (template) {
      this.cacheTemplate(taskName, template, this.config.source);
    }

    return template;
  }

  // 从本地文件加载
  private async loadFromLocal(
    taskName: string
  ): Promise<ValidationTemplate | null> {
    if (!this.config.localPath) {
      throw new Error("Local path not configured");
    }

    try {
      const response = await fetch(this.config.localPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return this.parseTemplateFromExcel(arrayBuffer, taskName);
    } catch (error) {
      throw new Error(`Failed to load local template: ${error}`);
    }
  }

  // 从远程URL加载
  private async loadFromRemote(
    taskName: string
  ): Promise<ValidationTemplate | null> {
    if (!this.config.remoteUrl) {
      throw new Error("Remote URL not configured");
    }

    try {
      const response = await fetch(this.config.remoteUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return this.parseTemplateFromExcel(arrayBuffer, taskName);
    } catch (error) {
      throw new Error(`Failed to load remote template: ${error}`);
    }
  }

  // 从内嵌模板加载
  private loadFromEmbedded(taskName: string): ValidationTemplate | null {
    return (EMBEDDED_TEMPLATES as Record<string, any>)[taskName] || null;
  }

  // 带备用方案的加载
  private async loadWithFallback(
    taskName: string
  ): Promise<ValidationTemplate | null> {
    const fallbackOrder = ["local", "embedded", "remote"];

    for (const source of fallbackOrder) {
      if (source === this.config.source) continue; // 跳过已经尝试过的主要源

      try {
        let template: ValidationTemplate | null = null;

        switch (source) {
          case "local":
            template = await this.loadFromLocal(taskName);
            break;
          case "remote":
            template = await this.loadFromRemote(taskName);
            break;
          case "embedded":
            template = this.loadFromEmbedded(taskName);
            break;
        }

        if (template) {
          console.info(`Template loaded from fallback source: ${source}`);
          return template;
        }
      } catch (error) {
        console.warn(`Fallback source ${source} failed:`, error);
      }
    }

    return null;
  }

  // 解析Excel模板文件
  private async parseTemplateFromExcel(
    arrayBuffer: ArrayBuffer,
    taskName: string
  ): Promise<ValidationTemplate | null> {
    // 这里需要实现Excel模板解析逻辑
    // 暂时返回null，实际实现需要解析Excel文件
    console.warn("Excel template parsing not implemented yet");
    return null;
  }

  // 检查缓存
  private getCachedTemplate(taskName: string): TemplateCacheItem | null {
    const cached = this.cache.get(taskName);
    if (!cached) return null;

    const now = Date.now();
    const isExpired =
      this.config.cacheTimeout &&
      now - cached.timestamp > this.config.cacheTimeout;

    if (isExpired) {
      this.cache.delete(taskName);
      return null;
    }

    return cached;
  }

  // 缓存模板
  private cacheTemplate(
    taskName: string,
    template: ValidationTemplate,
    source: string
  ): void {
    this.cache.set(taskName, {
      template,
      timestamp: Date.now(),
      source,
    });
  }

  // 清除缓存
  clearCache(taskName?: string): void {
    if (taskName) {
      this.cache.delete(taskName);
    } else {
      this.cache.clear();
    }
  }

  // 预加载所有模板
  async preloadTemplates(taskNames: string[]): Promise<void> {
    const promises = taskNames.map((taskName) =>
      this.getTemplate(taskName).catch((error) => {
        console.warn(`Failed to preload template ${taskName}:`, error);
        return null;
      })
    );

    await Promise.all(promises);
  }

  // 获取缓存状态
  getCacheStatus(): { taskName: string; source: string; age: number }[] {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([taskName, item]) => ({
      taskName,
      source: item.source,
      age: now - item.timestamp,
    }));
  }

  // 验证模板完整性
  async validateTemplate(
    taskName: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const template = await this.getTemplate(taskName);
    const errors: string[] = [];

    if (!template) {
      errors.push("Template not found");
      return { isValid: false, errors };
    }

    // 验证必要字段
    if (!template.taskName) {
      errors.push("Missing taskName");
    }

    if (!template.headers || template.headers.length === 0) {
      errors.push("Missing or empty headers");
    }

    if (!template.validationRules || template.validationRules.length === 0) {
      errors.push("Missing or empty validation rules");
    }

    // 验证规则完整性
    template.validationRules?.forEach((rule, index) => {
      if (!rule.field) {
        errors.push(`Rule ${index}: Missing field`);
      }
      if (!rule.type) {
        errors.push(`Rule ${index}: Missing type`);
      }
      if (!rule.message) {
        errors.push(`Rule ${index}: Missing message`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 更新配置
  updateConfig(newConfig: Partial<TemplateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // 清除缓存，因为配置变更可能影响模板加载
    this.clearCache();
  }

  // 获取当前配置
  getConfig(): TemplateConfig {
    return { ...this.config };
  }
}

// 创建默认实例
export const templateManager = new TemplateManager();

// 导出类型和类
export { TemplateManager };
export type { TemplateConfig, TemplateCacheItem };
