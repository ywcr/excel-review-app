interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
}

interface ValidationRequirementsProps {
  taskName: string;
  validationResult?: {
    validation: ValidationResult;
  } | null;
}

export default function ValidationRequirements({
  taskName,
  validationResult,
}: ValidationRequirementsProps) {
  // 分析验证结果，确定每个要求的状态
  const getRequirementStatus = (
    errorTypes: string[]
  ): "success" | "error" | "neutral" => {
    if (!validationResult?.validation) {
      return "neutral"; // 未验证时显示中性状态
    }

    // 如果此条要求未映射到任何具体错误类型，则显示为中性，避免误导性“通过”状态
    if (!errorTypes || errorTypes.length === 0) {
      return "neutral";
    }

    const hasError = validationResult.validation.errors.some((error) =>
      errorTypes.includes(error.errorType)
    );
    return hasError ? "error" : "success";
  };

  // 获取特定错误类型的数量
  const getErrorCount = (errorTypes: string[]): number => {
    if (!validationResult?.validation) return 0;
    return validationResult.validation.errors.filter((error) =>
      errorTypes.includes(error.errorType)
    ).length;
  };

  // 渲染状态图标
  const renderStatusIcon = (errorTypes: string[]) => {
    const status = getRequirementStatus(errorTypes);
    const errorCount = getErrorCount(errorTypes);

    switch (status) {
      case "success":
        return (
          <svg
            className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <div className="flex items-center mr-2 mt-0.5 flex-shrink-0">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {errorCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {errorCount}
              </span>
            )}
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 border border-gray-300 rounded-sm bg-gray-50"></div>
        );
    }
  };

  // 根据要求文本获取对应的错误类型
  const getErrorTypesForRequirement = (requirementText: string): string[] => {
    if (
      requirementText.includes("医疗类型") ||
      requirementText.includes("级别") ||
      requirementText.includes("医疗机构类别") ||
      requirementText.includes("等级医院") ||
      requirementText.includes("基层医疗") ||
      requirementText.includes("民营医院")
    ) {
      return ["medicalLevel"];
    }

    // 唯一性 / 重复限制
    if (
      requirementText.includes("重复拜访") &&
      requirementText.includes("医院")
    ) {
      return ["dateInterval"];
    }
    if (
      requirementText.includes("重复拜访") &&
      requirementText.includes("医生")
    ) {
      return ["dateInterval"];
    }
    if (
      requirementText.includes("重复拜访") &&
      requirementText.includes("药店")
    ) {
      return ["unique"];
    }
    if (
      requirementText.includes("重复拜访") &&
      requirementText.includes("对接人")
    ) {
      return ["dateInterval"];
    }

    // 姓名“永远不能重复/不能重复”类（如：调查对象姓名永远不能重复、店员姓名永远不能重复）
    if (
      requirementText.includes("永远不能重复") ||
      (requirementText.includes("姓名") && requirementText.includes("不能重复"))
    ) {
      return ["unique"];
    }

    // “只能调研1次/只能1次”类
    if (
      (requirementText.includes("只能调研") ||
        requirementText.includes("只能")) &&
      requirementText.includes("1次")
    ) {
      return ["unique"];
    }

    // 频次限制
    if (
      requirementText.includes("频次") ||
      requirementText.includes("每日") ||
      (requirementText.includes("不超过") && requirementText.includes("份"))
    ) {
      return ["frequency"];
    }

    // 时长限制
    if (requirementText.includes("时长") || requirementText.includes("分钟")) {
      return ["duration"];
    }

    // 时间范围
    if (
      requirementText.includes("时间范围") ||
      requirementText.includes("07:00") ||
      requirementText.includes("08:00")
    ) {
      return ["timeRange"];
    }

    // 日期格式
    if (requirementText.includes("日期格式")) {
      return ["dateFormat"];
    }

    // 必填项
    if (requirementText.includes("必填")) {
      return ["required"];
    }

    // 完整性检查（常对应必填缺失等）
    if (requirementText.includes("完整性")) {
      return ["required"];
    }

    // 数值下限（如"参会人数不能少于X人"）
    if (
      (requirementText.includes("不能少于") ||
        requirementText.includes("不少于")) &&
      requirementText.includes("人")
    ) {
      return ["minValue"];
    }

    // 半年内医院不重复
    if (
      requirementText.includes("半年内") &&
      requirementText.includes("医院")
    ) {
      return ["sixMonthsInterval"];
    }

    // 跨任务验证（科室拜访与医院级拜访互斥）
    if (
      requirementText.includes("当月") &&
      requirementText.includes("同一医院") &&
      requirementText.includes("不可同时出现")
    ) {
      return ["crossTaskValidation"];
    }

    // 材料要求
    if (
      requirementText.includes("申请审批表") ||
      requirementText.includes("会议发票") ||
      requirementText.includes("现场照片") ||
      requirementText.includes("登记表") ||
      requirementText.includes("议程") ||
      requirementText.includes("总结") ||
      requirementText.includes("横幅") ||
      requirementText.includes("海报")
    ) {
      return ["materialRequirement"];
    }

    // 禁用内容验证
    if (
      requirementText.includes("禁用词汇") ||
      requirementText.includes("不能包含") ||
      requirementText.includes("内容合规")
    ) {
      return ["prohibitedContent"];
    }

    return []; // 未映射的通用要求，显示为"未验证"中性状态
  };

  const getRequirements = (task: string) => {
    switch (task) {
      case "药店拜访":
        return {
          title: "药店拜访验证要求",
          requirements: [
            {
              category: "重复拜访限制",
              items: [
                "同一药店1日内不能重复拜访",
                "同一对接人7日内不能重复拜访",
              ],
            },
            {
              category: "频次限制",
              items: ["同一实施人每日拜访不超过5家药店"],
            },
            {
              category: "拜访时长要求",
              items: ["拜访有效时间不低于60分钟"],
            },
            {
              category: "拜访时间范围",
              items: ["必须在08:00-19:00范围内"],
            },
            {
              category: "内容合规要求",
              items: [
                "拜访事项（1）、信息反馈（1）、拜访事项（2）、信息反馈（2）内容不能包含禁用词汇",
                "禁用词汇包括：统方、买票、购票、销票、捐赠、资助、赞助、行贿、受贿、返利、返佣、临床观察费、好处费、手续费、回款、费用、佣金、提成、红利、红包、礼品、礼金、消费卡、有价证券、股权、商业贿赂、宴请、娱乐、信息费、感谢费、提单费、返现、票折、指标、回扣等",
              ],
            },
          ],
        };

      case "等级医院拜访":
        return {
          title: "等级医院拜访验证要求",
          requirements: [
            {
              category: "医疗类型要求",
              items: [
                "必须选择以下医疗机构类别之一：等级医院、基层医疗、民营医院",
              ],
            },
            {
              category: "重复拜访限制",
              items: ["同一医院1日内不能重复拜访", "同一医生7日内不能重复拜访"],
            },
            {
              category: "频次限制",
              items: ["同一实施人每日拜访不超过4家医院"],
            },
            {
              category: "拜访时长要求",
              items: ["拜访有效时间不低于100分钟"],
            },
            {
              category: "拜访时间范围",
              items: ["必须在07:00-19:00范围内"],
            },
            {
              category: "内容合规要求",
              items: [
                "拜访事项（1）、信息反馈（1）、拜访事项（2）、信息反馈（2）内容不能包含禁用词汇",
                "禁用词汇包括：统方、买票、购票、销票、捐赠、资助、赞助、行贿、受贿、返利、返佣、临床观察费、好处费、手续费、回款、费用、佣金、提成、红利、红包、礼品、礼金、消费卡、有价证券、股权、商业贿赂、宴请、娱乐、信息费、感谢费、提单费、返现、票折、指标、回扣等",
              ],
            },
          ],
        };

      case "基层医疗机构拜访":
        return {
          title: "基层医疗机构拜访验证要求",
          requirements: [
            {
              category: "医疗类型要求",
              items: [
                "必须选择以下医疗机构类别之一：等级医院、基层医疗、民营医院",
              ],
            },
            {
              category: "重复拜访限制",
              items: ["同一医院2日内不能重复拜访", "同一医生7日内不能重复拜访"],
            },
            {
              category: "频次限制",
              items: ["同一实施人每日拜访不超过4家医院"],
            },
            {
              category: "拜访时长要求",
              items: ["拜访有效时间不低于100分钟"],
            },
            {
              category: "拜访时间范围",
              items: ["必须在07:00-19:00范围内"],
            },
            {
              category: "内容合规要求",
              items: [
                "拜访事项（1）、信息反馈（1）、拜访事项（2）、信息反馈（2）内容不能包含禁用词汇",
                "禁用词汇包括：统方、买票、购票、销票、捐赠、资助、赞助、行贿、受贿、返利、返佣、临床观察费、好处费、手续费、回款、费用、佣金、提成、红利、红包、礼品、礼金、消费卡、有价证券、股权、商业贿赂、宴请、娱乐、信息费、感谢费、提单费、返现、票折、指标、回扣等",
              ],
            },
          ],
        };

      case "民营医院拜访":
        return {
          title: "民营医院拜访验证要求",
          requirements: [
            {
              category: "医疗类型要求",
              items: [
                "必须选择以下医疗机构类别之一：等级医院、基层医疗、民营医院",
              ],
            },
            {
              category: "重复拜访限制",
              items: ["同一医院2日内不能重复拜访", "同一医生7日内不能重复拜访"],
            },
            {
              category: "频次限制",
              items: ["同一实施人每日拜访不超过4家医院"],
            },
            {
              category: "拜访时长要求",
              items: ["拜访有效时间不低于100分钟"],
            },
            {
              category: "拜访时间范围",
              items: ["必须在07:00-19:00范围内"],
            },
            {
              category: "内容合规要求",
              items: [
                "拜访事项（1）、信息反馈（1）、拜访事项（2）、信息反馈（2）内容不能包含禁用词汇",
                "禁用词汇包括：统方、买票、购票、销票、捐赠、资助、赞助、行贿、受贿、返利、返佣、临床观察费、好处费、手续费、回款、费用、佣金、提成、红利、红包、礼品、礼金、消费卡、有价证券、股权、商业贿赂、宴请、娱乐、信息费、感谢费、提单费、返现、票折、指标、回扣等",
              ],
            },
          ],
        };

      case "科室拜访":
        return {
          title: "科室拜访验证要求",
          requirements: [
            {
              category: "重复拜访限制",
              items: ["同一医院3日内不能重复拜访", "同一医生7日内不能重复拜访"],
            },
            {
              category: "频次限制",
              items: ["同一实施人每日拜访不超过4家医院"],
            },
            {
              category: "拜访时长要求",
              items: ["拜访有效时间不低于100分钟"],
            },
            {
              category: "拜访时间范围",
              items: ["必须在07:00-19:00范围内"],
            },
            {
              category: "特殊要求",
              items: [
                "当月同一医院不可同时出现在「科室拜访」和「医院级拜访」中",
              ],
            },
            {
              category: "内容合规要求",
              items: [
                "拜访事项（1）、信息反馈（1）、拜访事项（2）、信息反馈（2）内容不能包含禁用词汇",
                "禁用词汇包括：统方、买票、购票、销票、捐赠、资助、赞助、行贿、受贿、返利、返佣、临床观察费、好处费、手续费、回款、费用、佣金、提成、红利、红包、礼品、礼金、消费卡、有价证券、股权、商业贿赂、宴请、娱乐、信息费、感谢费、提单费、返现、票折、指标、回扣等",
              ],
            },
          ],
        };

      case "消费者调研":
        return {
          title: "消费者调研验证要求",
          requirements: [
            {
              category: "唯一性要求",
              items: ["调查对象姓名永远不能重复", "同一实施人每日不得超过50份"],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "调研数据完整性检查",
              ],
            },
          ],
        };

      case "患者调研":
        return {
          title: "患者调研验证要求",
          requirements: [
            {
              category: "唯一性要求",
              items: ["调查对象姓名永远不能重复", "同一实施人每日不超过20份"],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "调研数据完整性检查",
              ],
            },
          ],
        };

      case "店员调研":
        return {
          title: "店员调研验证要求",
          requirements: [
            {
              category: "唯一性要求",
              items: [
                "店员姓名永远不能重复",
                "同一实施人每日拜访不超过2家药店",
                "每个药店不超过5份",
                "同一实施人每日不超过10份",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "调研数据完整性检查",
              ],
            },
          ],
        };

      case "药店调研":
        return {
          title: "药店调研验证要求",
          requirements: [
            {
              category: "唯一性要求",
              items: [
                "调查对象姓名永远不能重复",
                "同一任务下同一药店只能调研1次",
                "同一实施人每日拜访不超过2家药店",
                "每个药店不超过1份",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "调研数据完整性检查",
              ],
            },
          ],
        };

      case "竞品信息收集":
        return {
          title: "竞品信息收集验证要求",
          requirements: [
            {
              category: "时间间隔要求",
              items: ["同一医院半年内不能重复收集竞品信息"],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "竞品信息完整性检查",
              ],
            },
          ],
        };

      case "科室拜访":
        return {
          title: "科室拜访验证要求",
          requirements: [
            {
              category: "时间间隔要求",
              items: ["同一医生7日内不能重复拜访", "同一医院3日内不能重复拜访"],
            },
            {
              category: "频次限制",
              items: [
                "同一实施人每日拜访不能超过4家医院",
                "拜访有效时间不能低于100分钟",
                "拜访时间必须在07:00-19:00范围内",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "拜访数据完整性检查",
              ],
            },
          ],
        };

      case "培训会":
        return {
          title: "培训会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于30人"],
            },
            {
              category: "材料要求",
              items: [
                "申请审批表、培训发票、培训大纲及课件",
                "登记表、议程、总结",
                "培训现场照片（包括主讲人和PPT）",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "培训数据完整性检查",
              ],
            },
          ],
        };

      case "科室会":
        return {
          title: "科室会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于5人（不包括主讲人）"],
            },
            {
              category: "材料要求",
              items: [
                "会议申请表、登记表、议程",
                "现场照片（PPT、全景照片等）",
                "相关会议发票、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "圆桌会":
        return {
          title: "圆桌会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于5人（不包括主讲人）"],
            },
            {
              category: "材料要求",
              items: [
                "活动现场照片（PPT、横幅、海报等）",
                "相关会议发票、登记表、议程、总结",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "学术研讨、病例讨论会":
        return {
          title: "学术研讨、病例讨论会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于30人"],
            },
            {
              category: "材料要求",
              items: [
                "申请审批表、会议发票、大纲及课件",
                "登记表、议程、总结",
                "培训现场照片（包括主讲人和PPT）",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "大型推广活动":
        return {
          title: "大型推广活动验证要求",
          requirements: [
            {
              category: "参与要求",
              items: ["参与人数不能少于20人"],
            },
            {
              category: "材料要求",
              items: [
                "照片：横幅、海报、彩页、易拉宝、样品等要素",
                "相关会议发票、活动申请表、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "活动数据完整性检查",
              ],
            },
          ],
        };

      case "小型推广活动":
        return {
          title: "小型推广活动验证要求",
          requirements: [
            {
              category: "参与要求",
              items: ["参与人数不能少于10人"],
            },
            {
              category: "材料要求",
              items: [
                "照片：横幅、海报、彩页、易拉宝、样品等要素",
                "相关会议发票、活动申请表、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "活动数据完整性检查",
              ],
            },
          ],
        };

      case "药店陈列服务":
        return {
          title: "药店陈列服务验证要求",
          requirements: [
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "陈列服务信息完整性检查",
              ],
            },
            {
              category: "陈列要求",
              items: [
                "药店名称不能为空",
                "陈列位置明确",
                "陈列效果照片完整",
                "服务时间记录准确",
              ],
            },
          ],
        };

      case "竞品信息收集":
        return {
          title: "竞品信息收集验证要求",
          requirements: [
            {
              category: "时间间隔要求",
              items: ["同一医院半年内不能重复收集竞品信息"],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "竞品信息完整性检查",
              ],
            },
          ],
        };

      case "培训会":
        return {
          title: "培训会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于30人"],
            },
            {
              category: "材料要求",
              items: [
                "申请审批表、培训发票、培训大纲及课件",
                "登记表、议程、总结",
                "培训现场照片（包括主讲人和PPT）",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "培训数据完整性检查",
              ],
            },
          ],
        };

      case "科室会":
        return {
          title: "科室会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于5人（不包括主讲人）"],
            },
            {
              category: "材料要求",
              items: [
                "会议申请表、登记表、议程",
                "现场照片（PPT、全景照片等）",
                "相关会议发票、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "圆桌会":
        return {
          title: "圆桌会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于5人（不包括主讲人）"],
            },
            {
              category: "材料要求",
              items: [
                "活动现场照片（PPT、横幅、海报等）",
                "相关会议发票、登记表、议程、总结",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "学术研讨、病例讨论会":
        return {
          title: "学术研讨、病例讨论会验证要求",
          requirements: [
            {
              category: "参会要求",
              items: ["参会人数不能少于30人"],
            },
            {
              category: "材料要求",
              items: [
                "申请审批表、会议发票、大纲及课件",
                "登记表、议程、总结",
                "培训现场照片（包括主讲人和PPT）",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "会议数据完整性检查",
              ],
            },
          ],
        };

      case "大型推广活动":
        return {
          title: "大型推广活动验证要求",
          requirements: [
            {
              category: "参与要求",
              items: ["参与人数不能少于20人"],
            },
            {
              category: "材料要求",
              items: [
                "照片：横幅、海报、彩页、易拉宝、样品等要素",
                "相关会议发票、活动申请表、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "活动数据完整性检查",
              ],
            },
          ],
        };

      case "小型推广活动":
        return {
          title: "小型推广活动验证要求",
          requirements: [
            {
              category: "参与要求",
              items: ["参与人数不能少于10人"],
            },
            {
              category: "材料要求",
              items: [
                "照片：横幅、海报、彩页、易拉宝、样品等要素",
                "相关会议发票、活动申请表、总结、费用结算单",
              ],
            },
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "活动数据完整性检查",
              ],
            },
          ],
        };

      case "药店陈列服务":
        return {
          title: "药店陈列服务验证要求",
          requirements: [
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "陈列服务信息完整性检查",
              ],
            },
            {
              category: "陈列要求",
              items: [
                "药店名称不能为空",
                "陈列位置明确",
                "陈列效果照片完整",
                "服务时间记录准确",
              ],
            },
          ],
        };

      default:
        return {
          title: "通用验证要求",
          requirements: [
            {
              category: "基本要求",
              items: [
                "日期格式：应为纯日期格式（如：2025-01-15）",
                "必填字段不能为空",
                "数据格式需符合模板要求",
              ],
            },
          ],
        };
    }
  };

  const config = getRequirements(taskName);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm mb-8">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-blue-900">{config.title}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {config.requirements.map((req, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <h4 className="font-semibold text-blue-800 text-base">
                {req.category}
              </h4>
            </div>
            <ul className="space-y-2">
              {req.items.map((item, itemIndex) => {
                const errorTypes = getErrorTypesForRequirement(item);
                const status = getRequirementStatus(errorTypes);

                return (
                  <li
                    key={itemIndex}
                    className={`text-sm flex items-start ${
                      status === "error"
                        ? "text-red-700"
                        : status === "success"
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    {renderStatusIcon(errorTypes)}
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800 leading-relaxed">
            {!validationResult?.validation ? (
              <p>
                <strong>验证说明：</strong>
                系统将根据以上要求自动验证您上传的数据。不符合要求的数据将在验证结果中详细标出，包括具体的错误位置和修改建议。
              </p>
            ) : (
              <div>
                <p className="mb-2">
                  <strong>验证结果：</strong>
                  {validationResult.validation.isValid ? (
                    <span className="text-green-600 font-medium">
                      ✓ 所有验证要求均已通过
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      ✗ 发现 {validationResult.validation.summary.errorCount}{" "}
                      个错误
                    </span>
                  )}
                </p>
                <p className="text-xs">
                  图标说明：
                  <span className="inline-flex items-center ml-2">
                    <svg
                      className="w-3 h-3 text-green-500 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    通过
                  </span>
                  <span className="inline-flex items-center ml-3">
                    <svg
                      className="w-3 h-3 text-red-500 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    有错误
                  </span>
                  <span className="inline-flex items-center ml-3">
                    <span className="inline-block w-3 h-3 mr-1 border border-gray-400 rounded-sm bg-gray-100"></span>
                    未验证
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
