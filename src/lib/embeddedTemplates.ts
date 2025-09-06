// 该文件由 scripts/generate-embedded-templates.mjs 自动生成，请勿手改
export const EMBEDDED_TEMPLATES = {
  "消费者调研": {
    "name": "消费者调研",
    "description": "市场调研 - 消费者调研",
    "requiredFields": [],
    "validationRules": [
      {
        "field": "调查对象姓名",
        "type": "unique",
        "message": "调查对象姓名永远不能重复"
      },
      {
        "field": "实施人",
        "type": "frequency",
        "params": {
          "maxPerDay": 50,
          "groupBy": "implementer"
        },
        "message": "同一实施人每日不得超过50份"
      },
      {
        "field": "调研时间",
        "type": "dateFormat",
        "params": {
          "allowTimeComponent": false
        },
        "message": "调研时间格式不正确，应为纯日期格式（如：2025-08-01）"
      }
    ]
  },
  "患者调研": {
    "name": "患者调研",
    "description": " - 患者调研",
    "requiredFields": [],
    "validationRules": [
      {
        "field": "调查对象姓名",
        "type": "unique",
        "message": "调查对象姓名永远不能重复"
      },
      {
        "field": "实施人",
        "type": "frequency",
        "params": {
          "maxPerDay": 20,
          "groupBy": "implementer"
        },
        "message": "同一实施人每日不得超过20份"
      },
      {
        "field": "调研时间",
        "type": "dateFormat",
        "params": {
          "allowTimeComponent": false
        },
        "message": "调研时间格式不正确，应为纯日期格式（如：2025-08-01）"
      }
    ]
  },
  "店员调研": {
    "name": "店员调研",
    "description": " - 店员调研",
    "requiredFields": [],
    "validationRules": [
      {
        "field": "姓名",
        "type": "unique",
        "message": "姓名永远不能重复"
      },
      {
        "field": "店员姓名",
        "type": "unique",
        "message": "店员姓名永远不能重复"
      },
      {
        "field": "实施人",
        "type": "frequency",
        "params": {
          "maxPerDay": 10,
          "groupBy": "implementer"
        },
        "message": "同一实施人每日不得超过10份"
      },
      {
        "field": "实施人",
        "type": "frequency",
        "params": {
          "maxPerDay": 2,
          "groupBy": "implementer",
          "countBy": "pharmacyName"
        },
        "message": "同一实施人每日拜访不超过2家药店"
      },
      {
        "field": "药店名称",
        "type": "frequency",
        "params": {
          "maxPerDay": 5,
          "groupBy": "pharmacyName"
        },
        "message": "每个药店不超过5份"
      },
      {
        "field": "调研时间",
        "type": "dateFormat",
        "params": {
          "allowTimeComponent": false
        },
        "message": "调研时间格式不正确，应为纯日期格式（如：2025-08-01）"
      }
    ]
  },
  "药店调研": {
    "name": "药店调研",
    "description": " - 药店调研",
    "requiredFields": [],
    "validationRules": [
      {
        "field": "调查对象姓名",
        "type": "unique",
        "message": "调查对象姓名永远不能重复"
      },
      {
        "field": "实施人",
        "type": "frequency",
        "params": {
          "maxPerDay": 2,
          "groupBy": "implementer",
          "countBy": "pharmacyName"
        },
        "message": "同一实施人每日拜访不超过2家药店"
      },
      {
        "field": "药店名称",
        "type": "frequency",
        "params": {
          "maxPerDay": 1,
          "groupBy": "pharmacyName"
        },
        "message": "每个药店不超过1份"
      },
      {
        "field": "调研时间",
        "type": "dateFormat",
        "params": {
          "allowTimeComponent": false
        },
        "message": "调研时间格式不正确，应为纯日期格式（如：2025-08-01）"
      }
    ]
  },
  "竞品信息收集": {
    "name": "竞品信息收集",
    "description": "信息收集 - 竞品信息收集",
    "requiredFields": [],
    "validationRules": []
  },
  "药店拜访": {
    "name": "药店拜访",
    "description": "拜访类 - 药店拜访",
    "requiredFields": [],
    "validationRules": []
  },
  "等级医院拜访": {
    "name": "等级医院拜访",
    "description": " - 等级医院拜访",
    "requiredFields": [],
    "validationRules": []
  },
  "基层医疗机构拜访": {
    "name": "基层医疗机构拜访",
    "description": " - 基层医疗机构拜访",
    "requiredFields": [],
    "validationRules": []
  },
  "民营医院拜访": {
    "name": "民营医院拜访",
    "description": " - 民营医院拜访",
    "requiredFields": [],
    "validationRules": []
  },
  "科室拜访": {
    "name": "科室拜访",
    "description": " - 科室拜访",
    "requiredFields": [],
    "validationRules": []
  },
  "培训会": {
    "name": "培训会",
    "description": "会议类 - 培训会",
    "requiredFields": [],
    "validationRules": []
  },
  "科室会": {
    "name": "科室会",
    "description": " - 科室会",
    "requiredFields": [],
    "validationRules": []
  },
  "圆桌会": {
    "name": "圆桌会",
    "description": " - 圆桌会",
    "requiredFields": [],
    "validationRules": []
  },
  "学术研讨、病例讨论会": {
    "name": "学术研讨、病例讨论会",
    "description": " - 学术研讨、病例讨论会",
    "requiredFields": [],
    "validationRules": []
  },
  "大型推广活动": {
    "name": "大型推广活动",
    "description": " - 大型推广活动",
    "requiredFields": [],
    "validationRules": []
  },
  "小型推广活动": {
    "name": "小型推广活动",
    "description": " - 小型推广活动",
    "requiredFields": [],
    "validationRules": []
  },
  "药店陈列服务": {
    "name": "药店陈列服务",
    "description": " - 药店陈列服务",
    "requiredFields": [],
    "validationRules": []
  }
} as const;
