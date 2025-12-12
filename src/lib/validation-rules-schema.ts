/**
 * 校验规则配置化 - 类型定义
 *
 * 支持在客户端对校验规则进行个性化配置
 */

// 规则类型枚举
export type RuleType =
  | "required"
  | "unique"
  | "timeRange"
  | "duration"
  | "frequency"
  | "dateInterval"
  | "dateFormat"
  | "minValue"
  | "medicalLevel"
  | "prohibitedContent"
  | "sameImplementer"
  | "sixMonthsInterval"
  | "crossTaskValidation";

// 规则参数类型定义
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RequiredParams {
  // 无参数 - 保留空接口以保持类型一致性
}

export interface UniqueParams {
  scope: "global" | "day" | "task" | "month";
  groupBy?: string;
}

export interface TimeRangeParams {
  startHour: number;
  endHour: number;
}

export interface DurationParams {
  minMinutes: number;
}

export interface FrequencyParams {
  maxPerDay: number;
  groupBy: string;
  countBy?: string;
}

export interface DateIntervalParams {
  days: number;
  groupBy: string;
}

export interface DateFormatParams {
  allowTimeComponent: boolean;
}

export interface MinValueParams {
  minValue: number;
}

export interface MedicalLevelParams {
  allowedLevels: string[];
  allowedSuffixes: string[];
}

export interface ProhibitedContentParams {
  prohibitedTerms: readonly string[] | string[];
}

export interface SameImplementerParams {
  targetField: string;
  implementerField: string;
  addressField?: string;
}

export interface SixMonthsIntervalParams {
  groupBy: string;
}

export interface CrossTaskValidationParams {
  scope: "month" | "day";
  excludeTasks: string[];
  groupBy: string;
}

// 规则参数联合类型
export type RuleParams =
  | RequiredParams
  | UniqueParams
  | TimeRangeParams
  | DurationParams
  | FrequencyParams
  | DateIntervalParams
  | DateFormatParams
  | MinValueParams
  | MedicalLevelParams
  | ProhibitedContentParams
  | SameImplementerParams
  | SixMonthsIntervalParams
  | CrossTaskValidationParams;

// 规则配置接口
export interface RuleConfig {
  id: string;
  field: string;
  type: RuleType;
  enabled: boolean;
  params?: RuleParams;
  message: string;
}

// 任务模板配置接口
export interface TaskTemplateConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredFields: string[];
  sheetNames: string[];
  matchKeywords?: string[];
  fieldMappings: Record<string, string>;
  validationRules: RuleConfig[];
}

// 全局配置接口
export interface ValidationConfig {
  version: string;
  lastModified: string;
  prohibitedTerms: string[];
  templates: Record<string, TaskTemplateConfig>;
}

// 配置元数据
export interface ConfigMetadata {
  version: string;
  lastModified: string;
  templateCount: number;
  totalRules: number;
}

// 默认规则参数生成器
export function getDefaultParams(type: RuleType): RuleParams {
  switch (type) {
    case "required":
      return {};
    case "unique":
      return { scope: "global" };
    case "timeRange":
      return { startHour: 8, endHour: 19 };
    case "duration":
      return { minMinutes: 60 };
    case "frequency":
      return { maxPerDay: 5, groupBy: "implementer" };
    case "dateInterval":
      return { days: 7, groupBy: "" };
    case "dateFormat":
      return { allowTimeComponent: false };
    case "minValue":
      return { minValue: 1 };
    case "medicalLevel":
      return { allowedLevels: ["等级", "基层", "民营"], allowedSuffixes: [] };
    case "prohibitedContent":
      return { prohibitedTerms: [] };
    case "sameImplementer":
      return {
        targetField: "",
        implementerField: "implementer",
        addressField: "",
      };
    case "sixMonthsInterval":
      return { groupBy: "" };
    case "crossTaskValidation":
      return { scope: "month", excludeTasks: [], groupBy: "" };
    default:
      return {};
  }
}

// 规则类型的中文名称
export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  required: "必填验证",
  unique: "唯一性验证",
  timeRange: "时间范围验证",
  duration: "时长验证",
  frequency: "频次限制",
  dateInterval: "日期间隔验证",
  dateFormat: "日期格式验证",
  minValue: "最小值验证",
  medicalLevel: "医疗等级验证",
  prohibitedContent: "禁用词验证",
  sameImplementer: "同一实施人验证",
  sixMonthsInterval: "半年间隔验证",
  crossTaskValidation: "跨任务验证",
};

// 规则类型描述
export const RULE_TYPE_DESCRIPTIONS: Record<RuleType, string> = {
  required: "字段不能为空",
  unique: "字段值在指定范围内不能重复",
  timeRange: "时间必须在指定小时范围内",
  duration: "持续时间不能低于指定分钟数",
  frequency: "在指定时间范围内不能超过次数限制",
  dateInterval: "同一对象在指定天数内不能重复",
  dateFormat: "日期格式必须符合规范",
  minValue: "数值不能小于指定最小值",
  medicalLevel: "医疗类型必须是指定选项之一",
  prohibitedContent: "内容不能包含禁用词汇",
  sameImplementer: "同一目标必须由同一人执行",
  sixMonthsInterval: "同一对象半年内不能重复",
  crossTaskValidation: "跨任务的互斥验证",
};
