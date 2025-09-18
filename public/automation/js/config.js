// ==================== 全局配置文件 ====================
const CONFIG = {
  // 问卷类型配置
  questionnaireTypes: {
    liuwei_patient: {
      name: "六味患者问卷",
      contactType: "患者",
      sheetName: "六味患者问卷",
      keywords: ["六味", "患者", "问卷"],
      createUrl: "/lgb/mobile/hzwj.jsp?t=true",
      apiEndpoint: "/lgb/hzwj/add",
      saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add",
      listType: "患者问卷",
      labelName: "患者姓名",
      hasChannel: false,
      columnFormat: "simple", // 无渠道：序号, 姓名, 性别, 时间, 指派人
      description: "六味地黄丸患者问卷，无需创建医院",
    },
    xihuang_consumer: {
      name: "西黄消费者问卷",
      contactType: "消费者",
      sheetName: "西黄消费者问卷",
      keywords: ["西黄", "消费者", "问卷"],
      createUrl: "/lgb/mobile/xfzwj.jsp?t=true",
      apiEndpoint: "/lgb/xfzwj/add",
      saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add",
      listType: "消费者问卷",
      labelName: "消费者姓名",
      hasChannel: true,
      columnFormat: "simple", // 无渠道：序号, 姓名, 性别, 时间, 指派人
      description: "西黄丸消费者问卷，需要创建消费者和医院",
    },
    niujie_consumer: {
      name: "牛解消费者问卷",
      contactType: "消费者",
      sheetName: "牛解消费者问卷",
      keywords: ["牛解", "消费者", "问卷"],
      createUrl: "/lgb/mobile/njwj.jsp?t=true",
      apiEndpoint: "/lgb/xfzwj/add",
      saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add",
      listType: "消费者问卷",
      labelName: "消费者姓名",
      hasChannel: true,
      columnFormat: "simple", // 简单格式：序号, 消费者姓名, 性别, 时间, 指派人
      description: "牛解消费者问卷",
    },
    zhibai_consumer: {
      name: "知柏消费者问卷",
      contactType: "消费者",
      sheetName: "知柏消费者问卷",
      keywords: ["知柏", "消费者", "问卷"],
      createUrl: "/lgb/mobile/zbwj.jsp?t=true",
      apiEndpoint: "/lgb/xfzwj/add",
      saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add",
      listType: "消费者问卷",
      labelName: "消费者姓名",
      hasChannel: true,
      columnFormat: "simple", // 简单格式：序号, 消费者姓名, 性别, 时间, 指派人
      description: "知柏消费者问卷",
    },
    tiegao_patient: {
      name: "贴膏患者问卷",
      contactType: "患者",
      sheetName: "贴膏患者问卷",
      keywords: ["贴膏", "患者", "问卷"],
      createUrl: "/lgb/mobile/tgwj.jsp?t=true",
      apiEndpoint: "/lgb/hzwj/add",
      saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add",
      listType: "患者问卷",
      labelName: "患者姓名",
      hasChannel: false,
      columnFormat: "simple", // 无渠道：序号, 姓名, 性别, 时间, 指派人
      description: "贴膏患者问卷",
    },
  },

  // API 端点
  api: {
    getUserName: "/lgb/user/getUserName",
    taskTypes: "/lgb/workOrder/type/list",
    taskList: "/lgb/workOrder/mobile/history/list",
    submitRange: "/lgb/project/getSubmitRangeTime",
    contactQuery: "/lgb/lxrgl/getMessage",
    contactSave: "/lgb/lxrgl/save",
    contactList: "/lgb/lxrgl/getList",
    questionnaireList: "/lgb/workOrder/mobile/list",
    channelSave: "/lgb/qdkh/save",
    areaTree: "/lgb/system/area/tree",
  },

  // 产品关键词配置
  productKeywords: ["六味", "西黄", "牛解", "知柏", "贴膏"],

  // 默认设置
  defaults: {
    autoNextDate: true,
    autoValidation: true,
    useApiMode: false,
    toastDuration: 3000,
    previewRows: 6,
    maxPreviewData: 10,
  },
};
