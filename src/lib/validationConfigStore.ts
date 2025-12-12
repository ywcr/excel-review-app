/**
 * 校验规则配置存储服务
 *
 * 使用 localStorage 存储用户自定义的校验规则配置
 */

import {
  ValidationConfig,
  TaskTemplateConfig,
  RuleConfig,
  ConfigMetadata,
} from "./validation-rules-schema";
import {
  TASK_TEMPLATES,
  COMMON_PROHIBITED_TERMS,
  TaskTemplate,
  ValidationRule,
} from "./validationRules";

const STORAGE_KEY = "excel-review-validation-config";
const CONFIG_VERSION = "1.0.0";

/**
 * 将现有的任务模板转换为可配置格式
 */
function convertTemplateToConfig(
  name: string,
  template: TaskTemplate
): TaskTemplateConfig {
  const validationRules = Array.isArray(template.validationRules)
    ? template.validationRules
    : [];

  const rules: RuleConfig[] = validationRules.map(
    (rule: ValidationRule, index: number) => ({
      id: `${name.replace(/\s+/g, "-")}-rule-${index}`,
      field: rule.field,
      type: rule.type,
      enabled: true,
      params: rule.params,
      message: rule.message,
    })
  );

  return {
    id: name.replace(/\s+/g, "-"),
    name: template.name,
    description: template.description || "",
    enabled: true,
    requiredFields: Array.isArray(template.requiredFields)
      ? template.requiredFields
      : [],
    sheetNames: Array.isArray(template.sheetNames) ? template.sheetNames : [],
    matchKeywords: template.matchKeywords,
    fieldMappings: template.fieldMappings || {},
    validationRules: rules,
  };
}

/**
 * 生成默认配置
 */
export function generateDefaultConfig(): ValidationConfig {
  const templates: Record<string, TaskTemplateConfig> = {};

  for (const [name, template] of Object.entries(TASK_TEMPLATES)) {
    templates[name] = convertTemplateToConfig(name, template);
  }

  return {
    version: CONFIG_VERSION,
    lastModified: new Date().toISOString(),
    prohibitedTerms: [...COMMON_PROHIBITED_TERMS],
    templates,
  };
}

/**
 * 校验规则配置存储管理类
 */
export class ValidationConfigStore {
  private config: ValidationConfig | null = null;

  /**
   * 获取当前配置
   * 优先使用 localStorage 中的配置，否则使用默认配置
   */
  getConfig(): ValidationConfig {
    if (this.config) {
      return this.config;
    }

    if (typeof window === "undefined") {
      // SSR 环境，返回默认配置
      return generateDefaultConfig();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.isValidConfig(parsed)) {
          this.config = parsed;
          return this.config;
        }
      }
    } catch (error) {
      console.warn(
        "Failed to load validation config from localStorage:",
        error
      );
    }

    // 返回默认配置
    this.config = generateDefaultConfig();
    return this.config;
  }

  /**
   * 保存配置到 localStorage
   */
  saveConfig(config: ValidationConfig): void {
    if (typeof window === "undefined") {
      return;
    }

    config.lastModified = new Date().toISOString();
    this.config = config;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("Failed to save validation config:", error);
      throw new Error("保存配置失败，可能是存储空间不足");
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): ValidationConfig {
    const defaultConfig = generateDefaultConfig();
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * 获取配置元数据
   */
  getMetadata(): ConfigMetadata {
    const config = this.getConfig();
    const templates = Object.values(config.templates);
    const totalRules = templates.reduce(
      (sum, t) =>
        sum +
        (t && Array.isArray(t.validationRules) ? t.validationRules.length : 0),
      0
    );

    return {
      version: config.version,
      lastModified: config.lastModified,
      templateCount: templates.length,
      totalRules,
    };
  }

  /**
   * 更新单个模板配置
   */
  updateTemplate(
    templateName: string,
    updates: Partial<TaskTemplateConfig>
  ): void {
    const config = this.getConfig();
    if (config.templates[templateName]) {
      config.templates[templateName] = {
        ...config.templates[templateName],
        ...updates,
      };
      this.saveConfig(config);
    }
  }

  /**
   * 更新单条规则
   */
  updateRule(
    templateName: string,
    ruleId: string,
    updates: Partial<RuleConfig>
  ): void {
    const config = this.getConfig();
    const template = config.templates[templateName];
    if (template) {
      const ruleIndex = template.validationRules.findIndex(
        (r) => r.id === ruleId
      );
      if (ruleIndex >= 0) {
        template.validationRules[ruleIndex] = {
          ...template.validationRules[ruleIndex],
          ...updates,
        };
        this.saveConfig(config);
      }
    }
  }

  /**
   * 切换模板启用状态
   */
  toggleTemplate(templateName: string, enabled: boolean): void {
    this.updateTemplate(templateName, { enabled });
  }

  /**
   * 切换规则启用状态
   */
  toggleRule(templateName: string, ruleId: string, enabled: boolean): void {
    this.updateRule(templateName, ruleId, { enabled });
  }

  /**
   * 导出配置为 JSON 文件
   */
  exportConfig(): void {
    if (typeof window === "undefined") {
      return;
    }

    const config = this.getConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `validation-config-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 从 JSON 文件导入配置
   */
  async importConfig(file: File): Promise<ValidationConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          if (!this.isValidConfig(parsed)) {
            reject(new Error("配置文件格式不正确"));
            return;
          }

          this.saveConfig(parsed);
          resolve(parsed);
        } catch (error) {
          reject(new Error("配置文件解析失败"));
        }
      };
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsText(file);
    });
  }

  /**
   * 验证配置格式是否正确
   */
  private isValidConfig(config: unknown): config is ValidationConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const c = config as Record<string, unknown>;

    // 检查必需字段
    if (typeof c.version !== "string") return false;
    if (typeof c.lastModified !== "string") return false;
    if (!Array.isArray(c.prohibitedTerms)) return false;
    if (typeof c.templates !== "object" || c.templates === null) return false;

    // 检查至少有一个模板
    const templates = c.templates as Record<string, unknown>;
    if (Object.keys(templates).length === 0) return false;

    return true;
  }

  /**
   * 获取启用的模板列表
   */
  getEnabledTemplates(): TaskTemplateConfig[] {
    const config = this.getConfig();
    return Object.values(config.templates).filter((t) => t.enabled);
  }

  /**
   * 获取模板的启用规则
   */
  getEnabledRules(templateName: string): RuleConfig[] {
    const config = this.getConfig();
    const template = config.templates[templateName];
    if (!template || !template.enabled) {
      return [];
    }
    return template.validationRules.filter((r) => r.enabled);
  }
}

// 导出单例实例
let storeInstance: ValidationConfigStore | null = null;

export function getValidationConfigStore(): ValidationConfigStore {
  if (!storeInstance) {
    storeInstance = new ValidationConfigStore();
  }
  return storeInstance;
}
