// 内嵌的模板数据，作为模板文件的备用方案
export const EMBEDDED_TEMPLATES = {
  "医院拜访": {
    name: "医院拜访",
    description: "医院拜访任务模板",
    requiredFields: ["医生姓名", "医疗机构名称", "医疗类型", "拜访开始时间"],
    validationRules: [
      {
        field: "医生姓名",
        type: "required" as const,
        message: "医生姓名不能为空"
      },
      {
        field: "医疗机构名称", 
        type: "required" as const,
        message: "医疗机构名称不能为空"
      },
      {
        field: "医疗类型",
        type: "medicalLevel" as const,
        message: "医疗类型必须包含等级信息（如：三甲、二甲等）"
      },
      {
        field: "拜访开始时间",
        type: "dateFormat" as const,
        message: "拜访开始时间格式不正确"
      }
    ]
  },
  
  "药店拜访": {
    name: "药店拜访",
    description: "药店拜访任务模板", 
    requiredFields: ["零售渠道", "实施人", "拜访开始时间"],
    validationRules: [
      {
        field: "零售渠道",
        type: "required" as const,
        message: "零售渠道不能为空"
      },
      {
        field: "实施人",
        type: "required" as const,
        message: "实施人不能为空"
      },
      {
        field: "拜访开始时间",
        type: "dateFormat" as const,
        message: "拜访开始时间格式不正确"
      }
    ]
  },

  "科室拜访": {
    name: "科室拜访",
    description: "科室拜访任务模板",
    requiredFields: ["科室名称", "拜访持续时间"],
    validationRules: [
      {
        field: "科室名称",
        type: "required" as const,
        message: "科室名称不能为空"
      },
      {
        field: "拜访持续时间",
        type: "duration" as const,
        message: "拜访持续时间格式不正确"
      }
    ]
  },

  "药店陈列服务": {
    name: "药店陈列服务",
    description: "药店陈列服务任务模板",
    requiredFields: ["服务时间", "陈列内容", "陈列位置"],
    validationRules: [
      {
        field: "服务时间",
        type: "dateFormat" as const,
        message: "服务时间格式不正确"
      },
      {
        field: "陈列内容",
        type: "required" as const,
        message: "陈列内容不能为空"
      },
      {
        field: "陈列位置",
        type: "required" as const,
        message: "陈列位置不能为空"
      }
    ]
  }
};
