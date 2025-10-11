/**
 * 用户友好的错误消息系统
 * 提供详细的错误说明和解决方案
 */

export interface ErrorSolution {
  message: string;
  description: string;
  solutions: string[];
  severity: "error" | "warning" | "info";
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  FILE_FORMAT = "FILE_FORMAT",
  FILE_SIZE = "FILE_SIZE",
  FILE_CORRUPTED = "FILE_CORRUPTED",
  SHEET_NOT_FOUND = "SHEET_NOT_FOUND",
  HEADER_MISMATCH = "HEADER_MISMATCH",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  IMAGE_PARSE_FAILED = "IMAGE_PARSE_FAILED",
  MEMORY_ERROR = "MEMORY_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  WORKER_ERROR = "WORKER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * 错误消息映射表
 */
export const ERROR_MESSAGES: Record<ErrorType, ErrorSolution> = {
  [ErrorType.FILE_FORMAT]: {
    message: "文件格式不支持",
    description: "上传的文件格式无法识别或不受支持",
    solutions: [
      "请确保文件扩展名为 .xlsx 或 .xls",
      "如果是 .xls 格式，建议在Excel中另存为 .xlsx 格式",
      "检查文件是否完整下载，未损坏",
      "避免使用WPS等第三方软件保存的特殊格式",
    ],
    severity: "error",
  },

  [ErrorType.FILE_SIZE]: {
    message: "文件过大",
    description: "文件大小超过推荐处理范围，可能导致性能问题",
    solutions: [
      "推荐文件大小在100MB以内，最大支持2GB",
      "考虑删除不必要的工作表或数据",
      "分批处理：将数据拆分为多个文件分别验证",
      "清理Excel中的隐藏数据和历史版本",
    ],
    severity: "warning",
  },

  [ErrorType.FILE_CORRUPTED]: {
    message: "文件已损坏或格式异常",
    description: "文件内部结构损坏，无法正常解析",
    solutions: [
      "尝试在Excel中打开文件，然后另存为新文件",
      "检查文件是否被压缩或加密",
      "确认文件下载完整，未被截断",
      "如果是 .xls 格式，请转换为 .xlsx 后重试",
      "尝试使用'Excel修复'功能修复文件",
    ],
    severity: "error",
  },

  [ErrorType.SHEET_NOT_FOUND]: {
    message: "未找到指定的工作表",
    description: "文件中不存在您选择的工作表",
    solutions: [
      "请检查工作表名称是否正确",
      "确认Excel文件中包含所需的工作表",
      "工作表名称可能包含特殊字符或空格",
      "尝试重新选择工作表",
    ],
    severity: "error",
  },

  [ErrorType.HEADER_MISMATCH]: {
    message: "表头不匹配",
    description: "工作表的列名与任务模板要求不一致",
    solutions: [
      "检查Excel第一行的列名是否与模板一致",
      "注意列名的大小写、空格和标点符号",
      "确保没有多余的隐藏列或合并单元格",
      "参考模板文件调整列名",
      "可以尝试'智能匹配'功能自动识别相似列名",
    ],
    severity: "error",
  },

  [ErrorType.VALIDATION_FAILED]: {
    message: "数据验证失败",
    description: "部分数据不符合验证规则",
    solutions: [
      "查看详细的错误报告，定位具体问题行",
      "常见问题：日期格式错误、必填字段为空、数据重复",
      "使用'导出错误报告'功能获取完整错误列表",
      "逐条修正错误后重新验证",
    ],
    severity: "warning",
  },

  [ErrorType.IMAGE_PARSE_FAILED]: {
    message: "图片解析失败",
    description: "无法从Excel中提取或验证图片",
    solutions: [
      "如果文件是 .xls 格式，请转换为 .xlsx",
      "检查Excel中的图片是否正常显示",
      "图片格式应为常见格式（JPG、PNG等）",
      "避免使用过大的图片（单张建议不超过10MB）",
      "如果不需要图片验证，可以取消勾选'包含图片验证'",
    ],
    severity: "warning",
  },

  [ErrorType.MEMORY_ERROR]: {
    message: "内存不足",
    description: "处理过程中系统内存不足",
    solutions: [
      "关闭其他占用内存的浏览器标签页",
      "尝试处理更小的文件或减少数据量",
      "重启浏览器后重试",
      "如果是大文件，考虑分批处理",
      "建议使用Chrome浏览器以获得更好的性能",
    ],
    severity: "error",
  },

  [ErrorType.NETWORK_ERROR]: {
    message: "网络连接失败",
    description: "无法连接到服务器或网络中断",
    solutions: [
      "检查您的网络连接是否正常",
      "刷新页面后重试",
      "如果使用VPN，尝试关闭后重试",
      "清除浏览器缓存和Cookie",
      "联系技术支持确认服务状态",
    ],
    severity: "error",
  },

  [ErrorType.WORKER_ERROR]: {
    message: "验证进程异常",
    description: "后台验证进程发生错误",
    solutions: [
      "刷新页面后重新尝试",
      "清除浏览器缓存",
      "确保使用最新版本的Chrome、Edge或Firefox浏览器",
      "如果问题持续，请联系技术支持",
    ],
    severity: "error",
  },

  [ErrorType.UNKNOWN_ERROR]: {
    message: "未知错误",
    description: "发生了意外错误",
    solutions: [
      "刷新页面后重试",
      "检查文件格式和完整性",
      "尝试使用更小的测试文件",
      "如果问题持续，请联系技术支持并提供错误详情",
    ],
    severity: "error",
  },
};

/**
 * 从错误消息中识别错误类型
 */
export function detectErrorType(errorMessage: string): ErrorType {
  const msg = errorMessage.toLowerCase();

  // 文件格式错误
  if (
    /unsupported file|invalid file|file format|not.*xlsx|not.*xls/i.test(msg)
  ) {
    return ErrorType.FILE_FORMAT;
  }

  // 文件损坏
  if (
    /corrupt|unexpected signature|invalid zip|damaged|cannot read/i.test(msg)
  ) {
    return ErrorType.FILE_CORRUPTED;
  }

  // 工作表未找到
  if (/sheet.*not found|no sheet|missing sheet/i.test(msg)) {
    return ErrorType.SHEET_NOT_FOUND;
  }

  // 表头不匹配
  if (/header|column.*not found|missing field|field.*required/i.test(msg)) {
    return ErrorType.HEADER_MISMATCH;
  }

  // 图片解析失败
  if (/image|picture|photo|png|jpg|jpeg/i.test(msg)) {
    return ErrorType.IMAGE_PARSE_FAILED;
  }

  // 内存错误
  if (/memory|out of memory|allocation failed|heap/i.test(msg)) {
    return ErrorType.MEMORY_ERROR;
  }

  // 网络错误
  if (/network|fetch|connection|timeout/i.test(msg)) {
    return ErrorType.NETWORK_ERROR;
  }

  // Worker错误
  if (/worker/i.test(msg)) {
    return ErrorType.WORKER_ERROR;
  }

  // 文件大小
  if (/file.*large|too big|size.*exceed/i.test(msg)) {
    return ErrorType.FILE_SIZE;
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 获取用户友好的错误信息
 */
export function getFriendlyError(
  errorMessage: string,
  originalError?: Error
): ErrorSolution {
  const errorType = detectErrorType(errorMessage);
  const errorInfo = ERROR_MESSAGES[errorType];

  // 如果有原始错误，可以添加更多上下文
  if (originalError) {
    console.error("[错误详情]", {
      type: errorType,
      message: errorMessage,
      originalError,
      stack: originalError.stack,
    });
  }

  return errorInfo;
}

/**
 * 格式化错误消息为用户可读的字符串
 */
export function formatErrorMessage(errorSolution: ErrorSolution): string {
  let message = `❌ ${errorSolution.message}\n\n`;
  message += `📝 ${errorSolution.description}\n\n`;
  message += `💡 解决方案：\n`;
  errorSolution.solutions.forEach((solution, index) => {
    message += `   ${index + 1}. ${solution}\n`;
  });

  return message;
}

/**
 * 常见问题FAQ
 */
export const FAQ = [
  {
    question: "为什么我的Excel文件无法上传？",
    answer:
      "请确保文件格式为.xlsx或.xls，且文件未损坏。建议使用.xlsx格式以获得最佳兼容性。",
  },
  {
    question: "图片验证为什么失败？",
    answer:
      "如果文件是.xls格式，需要先转换为.xlsx。确保Excel中的图片能正常显示，且单张图片不超过10MB。",
  },
  {
    question: "验证速度很慢怎么办？",
    answer:
      "大文件处理需要时间。建议文件大小控制在100MB以内，关闭其他浏览器标签页，或考虑分批处理数据。",
  },
  {
    question: "如何查看详细的错误信息？",
    answer:
      "验证完成后，点击'导出错误报告'按钮可以下载包含所有错误详情的Excel文件。",
  },
  {
    question: "支持哪些浏览器？",
    answer:
      "推荐使用最新版本的Chrome、Edge或Firefox浏览器。避免使用IE浏览器。",
  },
];
