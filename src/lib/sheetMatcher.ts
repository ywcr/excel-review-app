import { TASK_TEMPLATES } from "./validationRules";

export interface SheetInfo {
  name: string;
  hasData: boolean;
}

export interface MatchResult {
  type: "exact" | "single" | "multiple" | "none";
  matchedSheets: string[];
  message: string;
}

/**
 * 智能匹配工作表
 * @param taskName 任务类型名称
 * @param availableSheets 可用的工作表列表
 * @returns 匹配结果
 */
export function findMatchingSheet(
  taskName: string,
  availableSheets: SheetInfo[]
): MatchResult {
  const template = TASK_TEMPLATES[taskName];

  if (!template) {
    return {
      type: "none",
      matchedSheets: [],
      message: `未找到任务类型 "${taskName}" 的模板`,
    };
  }

  // 过滤出有数据的工作表
  const sheetsWithData = availableSheets.filter((sheet) => sheet.hasData);

  if (sheetsWithData.length === 0) {
    return {
      type: "none",
      matchedSheets: [],
      message: "未找到包含数据的工作表",
    };
  }

  const sheetNames = sheetsWithData.map((sheet) => sheet.name);

  // 1. 精确匹配：检查是否有完全匹配的工作表名称
  const exactMatches = sheetNames.filter((name) =>
    template.sheetNames.includes(name)
  );

  if (exactMatches.length === 1) {
    return {
      type: "exact",
      matchedSheets: exactMatches,
      message: `找到精确匹配的工作表: "${exactMatches[0]}"`,
    };
  }

  if (exactMatches.length > 1) {
    return {
      type: "multiple",
      matchedSheets: exactMatches,
      message: `找到多个精确匹配的工作表: ${exactMatches.join(", ")}，请手动选择`,
    };
  }

  // 2. 模糊匹配：使用关键字匹配
  if (template.matchKeywords && template.matchKeywords.length > 0) {
    const fuzzyMatches = sheetNames.filter((name) =>
      template.matchKeywords!.some((keyword) => name.includes(keyword))
    );

    if (fuzzyMatches.length === 1) {
      return {
        type: "single",
        matchedSheets: fuzzyMatches,
        message: `通过关键字匹配找到工作表: "${fuzzyMatches[0]}"`,
      };
    }

    if (fuzzyMatches.length > 1) {
      return {
        type: "multiple",
        matchedSheets: fuzzyMatches,
        message: `找到多个匹配的工作表: ${fuzzyMatches.join(", ")}，请手动选择`,
      };
    }
  }

  // 3. 无匹配
  return {
    type: "none",
    matchedSheets: [],
    message: `未找到匹配的工作表，请手动选择`,
  };
}

/**
 * 获取任务类型的匹配提示信息
 * @param taskName 任务类型名称
 * @returns 提示信息
 */
export function getMatchHint(taskName: string): string {
  const template = TASK_TEMPLATES[taskName];

  if (!template) {
    return "";
  }

  if (template.matchKeywords && template.matchKeywords.length > 0) {
    const keywords = template.matchKeywords.join('"或"');
    return `提示: 工作表名称应包含"${keywords}"`;
  }

  if (template.sheetNames && template.sheetNames.length > 0) {
    const names = template.sheetNames.join('"或"');
    return `提示: 工作表名称应为"${names}"`;
  }

  return "";
}
