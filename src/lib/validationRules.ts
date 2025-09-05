// 前端验证规则定义
export interface ValidationRule {
  field: string;
  type:
    | "required"
    | "unique"
    | "timeRange"
    | "duration"
    | "frequency"
    | "dateInterval"
    | "dateFormat"
    | "minValue"
    | "medicalLevel";
  params?: any;
  message: string;
}

export interface TaskTemplate {
  name: string;
  description: string;
  requiredFields: string[];
  sheetNames: string[]; // 可能的工作表名称
  fieldMappings: Record<string, string>; // Excel列名 -> 标准字段名映射
  validationRules: ValidationRule[];
}

// 内嵌的任务模板规则（从后端模板转换而来）
export const TASK_TEMPLATES: Record<string, TaskTemplate> = {
  药店拜访: {
    name: "药店拜访",
    description: "药店拜访任务验证",
    requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
    sheetNames: ["药店拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      对接人: "contactPerson",
      零售渠道: "retailChannel",
      渠道地址: "channelAddress",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      门头: "storefront",
      内部: "interior",
    },
    validationRules: [
      {
        field: "retailChannel",
        type: "required",
        message: "零售渠道不能为空",
      },
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        message: "拜访开始时间格式不正确",
      },
      {
        field: "retailChannel",
        type: "unique",
        params: { scope: "day", groupBy: "retailChannel" },
        message: "同一药店1日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "contactPerson" },
        message: "同一对接人7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 5,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过5家药店",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 60 },
        message: "拜访有效时间不低于60分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 8, endHour: 19 },
        message: "拜访时间必须在08:00-19:00范围内",
      },
    ],
  },

  等级医院拜访: {
    name: "等级医院拜访",
    description: "等级医院拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["医院拜访", "等级医院拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级医院", "基层医疗", "民营医院"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级医院、基层医疗、民营医院",
      },
      {
        field: "hospitalName",
        type: "unique",
        params: { scope: "day", groupBy: "hospitalName" },
        message: "同一医院1日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过4家医院",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "拜访有效时间不低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
    ],
  },

  科室拜访: {
    name: "科室拜访",
    description: "科室拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "科室",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["科室拜访", "医院拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      渠道地址: "channelAddress",
      科室: "departmentName",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      科室照片: "departmentPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "departmentName",
        type: "required",
        message: "科室不能为空",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        message: "拜访开始时间格式不正确",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "拜访有效时间不低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "hospitalName",
        type: "dateInterval",
        params: { days: 3, groupBy: "hospitalName" },
        message: "同一医院3日内不能重复拜访",
      },
      {
        field: "visitStartTime",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过4家医院",
      },
    ],
  },

  基层医疗机构拜访: {
    name: "基层医疗机构拜访",
    description: "基层医疗机构拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["基层医疗机构拜访", "医院拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级医院", "基层医疗", "民营医院"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级医院、基层医疗、民营医院",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        message: "拜访开始时间格式不正确",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "基层医疗机构拜访有效时间不能低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "基层医疗机构拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "hospitalName",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospitalName" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "doctorName",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访基层医疗机构不能超过4家",
      },
    ],
  },

  民营医院拜访: {
    name: "民营医院拜访",
    description: "民营医院拜访任务验证",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访时长",
    ],
    sheetNames: ["民营医院拜访", "医院拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      医疗类型: "medicalType",
      渠道地址: "channelAddress",
      科室: "department",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      医院门头照: "hospitalPhoto",
      内部照片: "interiorPhoto",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "doctorName",
        type: "required",
        message: "医生姓名不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "medicalType",
        type: "medicalLevel",
        params: {
          allowedLevels: ["等级医院", "基层医疗", "民营医院"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级医院、基层医疗、民营医院",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        message: "拜访开始时间格式不正确",
      },
      {
        field: "visitDuration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "民营医院拜访有效时间不能低于100分钟",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "民营医院拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "hospitalName",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospitalName" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "doctorName",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctorName" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 4,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访民营医院不能超过4家",
      },
    ],
  },

  消费者调研: {
    name: "消费者调研",
    description: "消费者调研任务验证",
    requiredFields: ["实施人", "调查对象姓名", "药店名称", "调研时间"],
    sheetNames: ["消费者调研", "消费者问卷数据清单", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      调查对象姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      调研时间: "surveyTime",
      调研地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "surveyTargetName",
        type: "required",
        message: "调查对象姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        message: "调研时间格式不正确",
      },
      {
        field: "surveyTargetName",
        type: "unique",
        params: { scope: "global" },
        message: "调查对象姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 10, groupBy: "implementer" },
        message: "同一实施人每日不得超过10份",
      },
      {
        field: "pharmacyName",
        type: "frequency",
        params: { maxPerDay: 3, groupBy: "pharmacyName" },
        message: "每个药店不超过3份",
      },
    ],
  },

  患者调研: {
    name: "患者调研",
    description: "患者调研任务验证",
    requiredFields: ["实施人", "调查对象姓名", "药店名称", "调研时间"],
    sheetNames: ["患者调研", "患者问卷数据清单", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      调查对象姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      调研时间: "surveyTime",
      调研地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "surveyTargetName",
        type: "required",
        message: "调查对象姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        message: "调研时间格式不正确",
      },
      {
        field: "surveyTargetName",
        type: "unique",
        params: { scope: "global" },
        message: "调查对象姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 10, groupBy: "implementer" },
        message: "同一实施人每日不得超过10份",
      },
      {
        field: "pharmacyName",
        type: "frequency",
        params: { maxPerDay: 3, groupBy: "pharmacyName" },
        message: "每个药店不超过3份",
      },
    ],
  },

  店员调研: {
    name: "店员调研",
    description: "店员调研任务验证",
    requiredFields: ["实施人", "店员姓名", "药店名称", "调研时间"],
    sheetNames: ["店员调研", "店员问卷数据清单", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      店员姓名: "employeeName",
      药店名称: "pharmacyName",
      调研时间: "surveyTime",
      调研地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "employeeName",
        type: "required",
        message: "店员姓名不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        message: "调研时间格式不正确",
      },
      {
        field: "employeeName",
        type: "unique",
        params: { scope: "global" },
        message: "店员姓名永远不能重复",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 10, groupBy: "implementer" },
        message: "同一实施人每日不得超过10份",
      },
      {
        field: "pharmacyName",
        type: "frequency",
        params: { maxPerDay: 2, groupBy: "pharmacyName" },
        message: "每个药店不超过2份",
      },
    ],
  },

  药店调研: {
    name: "药店调研",
    description: "药店调研任务验证",
    requiredFields: ["实施人", "药店名称", "调研时间"],
    sheetNames: ["药店调研", "药店问卷数据清单", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      药店名称: "pharmacyName",
      调研时间: "surveyTime",
      调研地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "pharmacyName",
        type: "required",
        message: "药店名称不能为空",
      },
      {
        field: "surveyTime",
        type: "dateFormat",
        message: "调研时间格式不正确",
      },
      {
        field: "pharmacyName",
        type: "unique",
        params: { scope: "task" },
        message: "同一任务下同一药店只能调研1次",
      },
      {
        field: "implementer",
        type: "frequency",
        params: {
          maxPerDay: 5,
          groupBy: "implementer",
          countBy: "pharmacyName",
        },
        message: "同一实施人每日拜访不超过5家药店",
      },
    ],
  },
};

// 获取任务模板
export function getTaskTemplate(taskName: string): TaskTemplate | undefined {
  return TASK_TEMPLATES[taskName];
}

// 获取所有可用任务
export function getAvailableTasks(): string[] {
  return Object.keys(TASK_TEMPLATES);
}
