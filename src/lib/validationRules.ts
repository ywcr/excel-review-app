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
    | "conditionalDateInterval" // 根据条件字段值应用不同日期间隔
    | "dateFormat"
    | "minValue"
    | "medicalLevel"
    | "sixMonthsInterval"
    | "crossTaskValidation"
    | "prohibitedContent"
    | "sameImplementer" // 同一目标需由同一人拜访
    | "addressFormat" // 地址格式验证
    | "contentSimilarity"; // 内容相似度验证
  params?: any;
  message: string;
}

export interface TaskTemplate {
  name: string;
  description: string;
  requiredFields: string[];
  sheetNames: string[]; // 可能的工作表名称
  matchKeywords?: string[]; // 模糊匹配关键字（工作表名必须包含其中之一）
  fieldMappings: Record<string, string>; // Excel列名 -> 标准字段名映射
  validationRules: ValidationRule[];
}

// 公共禁用词列表 - 用于所有拜访任务的内容验证
export const COMMON_PROHIBITED_TERMS = [
  "统方",
  "买票",
  "购票",
  "销票",
  "捐赠",
  "资助",
  "赞助",
  "行贿",
  "受贿",
  "返利",
  "返佣",
  "临床观察费",
  "好处费",
  "手续费",
  "回款",
  "费用",
  "佣金",
  "提成",
  "红利",
  "红包",
  "礼品",
  "礼金",
  "消费卡",
  "有价证券",
  "股权",
  "商业贿赂",
  "宴请",
  "娱乐",
  "信息费",
  "感谢费",
  "提单费",
  "返现",
  "票折",
  "指标",
  "回扣",
  "销量",
  "销售",
  "logo",
] as const;

// ============= 拜访事项和信息反馈标准模板 =============
// 用于验证用户填写的内容是否与标准模板相似

// 医院拜访事项标准模板（完整11项）
export const HOSPITAL_VISIT_ITEMS = [
  "不良反应",
  "产品适应症",
  "产品作用原理",
  "处方规则或医保限制",
  "竞品对比",
  "临床新动态",
  "使用禁忌",
  "学术资料提供",
  "用法用量",
  "用药注意事项",
  "指南或路径",
] as const;

// 医院信息反馈标准模板（完整53条，从Excel提取）
export const HOSPITAL_FEEDBACKS = [
  "产品为成熟产品，不良反应医生相对了解，与同类竞品相比较，不良反应较少，医生更接受产品",
  "如实告知产品的禁忌和不良反应，是对患者健康的负责，让临床有所选择，规避风险，专业的推广得到医生认可",
  "医生熟知产品不良反应和使用禁忌，可耐心给病患讲解使用注意事项",
  "与医生沟通患者不良反应发生的条件，了解患者病史及生活习惯，分析此次不良反应的发生，并做记录，做好调研，下次再给出肯定的回复",
  "与医生沟通药物特性，及临床不良反应用例用量，医生表示不良反应较多，不愿使用产品，需要进一步沟通产品安全性",
  "充分讲述产品适应症，疾病领域案例，突出产品学术支持，打消医生戒心，医生对产品有了初步了解与信任",
  "对产品的首、换、联使用方式进行阐述，医生有了思想上的转变，愿意配合临床联合用药",
  "沟通产品适应症，医生认为同治疗效果的竞品较多，产品的突出优势不明显，没有尝试的医院，后期跟进产品与竞品的临床应用效果",
  "现有用药经验的分享，产品诊疗方案得到医生认可，本次拜访效果高，医生对产品产生了极大的信任度，愿意尝试使用产品",
  "医生未使用过产品，已讲述产品基本情况，重点使用领域，临床应用案例等，通过产品基本情况的阐述沟通，也了解了科室的基本情况，便于后期沟通",
  "从专业的角度快速讲解药物的成分及特点、作用原理，进而引申至具体适应症，加强临床对产品的认知，本次拜访效果显著，医生认可，尝试使用产品",
  "对没有用药医生，沟通产品作用原理，通过作用原理的阐述，加深了医生对产品的印象，有了处方机会",
  "通过产品作用原理的解析，解除了医生对产品的顾虑，医生愿意尝试给与少数患者调换药品",
  "医生对于产品的作用机理不感兴趣，比较习惯原有处方用药，需要更多的接触，改变医生处方习惯",
  "医生已具体了解药物作用原理，令治疗方法有据可循，提升临床产品的信任度，从而更好地服务于患者",
  "产品被患者普遍接受，医生处方规则按照说明书范畴使用，产品价格的下降，使更多患者接受该产品，医生更愿意处方",
  "和医生沟通政策新动态，提醒医生产品进入医保范畴，医生开具处方首要考虑医保产品，该提醒对未来处方上量有很大影响",
  "了解基本药物占处方药物的比例，了解医生处方习惯，便于后期更有效的沟通",
  "了解医生处方原则，沟通处方用量及处方用药品种数，讲解疾病联合用药原则，本原则满足医生处方原则，医生接受",
  "产品为基药品种，因此临床使用率较高，但竞品与产品相比，起效更快，竞品的有效成分含量更高",
  "产品与竞品相比较，产品的特点更为突出，使用范围更广泛，医生对产品更为认可，临床的推广工作起了决定性作用",
  "从短期内观察，产品与竞品的功效差异不大，医生的治疗方案根据患者的不同生理特征来使用产品，除了剂型的不同，产品的闪亮点不大，需思考差异化要素",
  "竞品的市场份额略高于产品，品牌效应的影响，导致患者更多的青睐于竞品，医生的推荐成功率略低",
  "在产品和竞品差异不大的同时，科室医生更多考虑的是产品的价格问题，价格优势非常重要，集采品种的市场占有率普遍高于其他产品",
  "详细介绍产品新临床研究成果后，医生产生浓厚兴趣，带来新的临床治疗思路，更有益于患者的康复",
  "医生不愿意尝试临床新动态，较为保守，更多愿意以病人的意愿开具处方，不愿尝试新产品的推荐",
  "医生对于新的临床研究成果有疑虑，需要更多的临床研究数据证实，但医生有兴趣了解，下次可以拿更多临床数据跟进",
  "医生较为重视用药安全性，最新病理毒理实验结果的提供，可以提高临床用药安全性，得到医生认可",
  "医生可认真解读新的学术研究成果，从医学角度提供思路，可耐心指导患者用药",
  "对妊娠患者的使用禁忌沟通，得到医生重视",
  "温馨提醒医生在为运动员开具处方时多加留意，确保用药安全与适宜。",
  "与医生沟通产品使用禁忌，医生已知晓，并认真查阅了说明书",
  "与医生沟通使用中的产品禁忌与配伍，医生愿意配合提醒患者用药事宜，能更好的发挥产品功效",
  "产品手册已提供，并讲述了基础知识、药物机理，科室医生较为繁忙，兴趣不大，会再次跟进",
  "产品手册中详细说明了产品特点，临床应用案例，有充分的数据，医生看过后对资料表示认可",
  "产品资料已提供，医生草草翻看了几页后，由于后期较为繁忙，没有更进一步跟进，预约了下次拜访时间，更为系统的介绍产品",
  "学术资料已提供，并详细解释了中西医名称的对照，医生可把说明书中的适应症运用到相关理论中，学习气氛浓郁",
  "医生认为产品资料封面过于复杂，建议多展示一些医学方面的信息及患者使用数据",
  "产品进院已久，医生未使用过产品，沟通未使用原因，解除医生疑虑，并告知用法用量，医生较为配合，可进一步跟进",
  "老师了解用法用量，对产品一直很认可，产品在该科室应用非常有成效，在治疗领域应用较多",
  "医生对于超说明书用量，表示不理解也不愿尝试，说明书范围用量在持续使用",
  "与医生沟通产品用法用量，医生认为竞品的用量更为便捷，患者接受度更高",
  "与医生沟通儿童用药的用法用量，医生处方中儿童患者虽为少数，但儿童用药又是医生较为关注的话题",
  "产品含有挥发成分，储存时间过长含量下降，医生表示每次会和患者说明",
  "产品使用注意事项较多，医生对此表示不接受，需要更充分的展示临床数据的严谨性，解除医生疑虑",
  "沟通患者用药注意事项，了解患者遵医嘱用药情况，提供了产品用药小手册，方便医生与患者沟通，得到医生认可",
  "医生用药较为谨慎，与医生沟通用药注意事项后，医生对产品提升了信任度，并对产品生产企业的专业性更为认可",
  "根据产品指南与医生探讨了临床用药方案，医生明确了适应症的指导用药和推荐用药，本次沟通效果显著，产品及推广方式都得到了医生认可",
  "医生的处方习惯较为固化，很难凭借路径指南使医生产生兴趣，还需加大疾病课题研究成果进行有效沟通",
  "医生对产品较为熟悉，指南路径的提供，使产品的临床应用更加准确，医生已知晓，并可按照指南开具临床处方",
  "医生认真学习了指南，通过指南和路径的指导，规范了医疗处方",
  "医生习惯于教学杂志和临床指南用药，提供指南路径医生配合度高，愿意按照指南开具药品",
] as const;

// 药店拜访事项标准模板（1和2共用，完整8项）
export const PHARMACY_VISIT_ITEMS = [
  "产品售价维护",
  "产品铺货事务",
  "品牌宣传巡查",
  "促销活动巡查",
  "产品陈列事务",
  "店员培训事务",
  "其他事务",
  "市场秩序及窜货事务",
] as const;

// 药店信息反馈（1）标准模板
export const PHARMACY_FEEDBACKS_1 = [
  "产品价格巡查，店内价格在价格管控范围内，属于合理售价",
  "店内价格高于区域市场范围，导致数量下降，对店内价格进行调控，保证区域价格一致",
  "店员熟悉产品售价，价格管控到位，产品在合理售价范围内",
  "产品价格低于市场区域，已沟通店长，店员对价格已经进行调换，区域周边药店价格已统一",
  "产品库存较少，已沟通店员，对产品进行要货，已确定要货数量，保证库存充足",
  "对终端销量不好的产品，及时做产品调整，避免产品过有效期",
  "根据药店的陈列和店员的建议，选择药店竞品较少的货物进行产品的铺货",
  "本店第一次铺货，采购人员要货较为谨慎，需跟进产品动销情况，及时补充货品",
  "促销活动，展架，宣传品拜访到位，赠品库存合理，店员配合度高，活动效果理想",
  "促销活动不理想，店员对产品没有产生高度重视，体验消费者较多，但购买者较少",
  "询问促销活动效果，活动当天消费者人数较多，达到理想效果，进来不少消费者询问及购买过产品",
  "药店店员或产品促销员共同配合，发放现场活动宣传单，讲述活动方式，引领消费者积极参与活动，活动产品丰富，消费者参与度较高",
  "店面面积较大可以做生动化陈列，已确定店内陈列冲击力最强的位置进行产品摆放，已和店员确定产品陈列造型",
  "店内同类产品陈列位置普遍不佳，位置偏僻，消费者不易看到，因此导致数量下降，需沟通陈列位置的更换",
  "调整产品陈列位，把位置调整到消费者入店的线路方向，产品高度适中，位置醒目",
  "对药店陈列产品的摆放及灰尘擦拭，保证药品醒目，整洁，并提醒店员陈列位置，便于产品推荐",
  "对本店店员讲述了产品知识及功效，部门店员已掌握熟悉，个别店员的药学知识相对薄弱，需一对一有效培训",
  "对产品的治疗范围、质量、价格与店员进行了沟通，店员已掌握，部分店员对产品的熟悉度较高，能带领新店员对产品进行推荐",
  "一对一的对店员进行产品的简单介绍，和店员建立良好关系，方便后续沟通",
  "和店员聊一些感兴趣的话题，拉进和店员的关系，提升产品首推率",
  "了解店内店员信息和称呼，以便拜访中可拉进与店员间联系",
  "了解店内竞品品牌的推广方式，及店员的接受程度，大多数店员对竞品的功效不熟悉，竞品的推广方式过于肤浅",
  "了解连锁企业门店配送时间，调整店员要货量，保证库存周转率",
  "活动中，店员与促销人员配合默契，宣传到位，活动参与人数较多，品牌形象得到提升",
  "药店位置靠近居民区，适合周末进行宣传活动，活动物资已到位，氛围舒适，店员已培训活动内容及产品知识",
  "产品POP，宣传册，摆放到位，店员积极参与，活动效果良好，消费者对产品及品牌信任度高",
  "价格稳定管控良好，无外阜货品，店内环境良好，店员素质高，可作为优质门店",
  "检查药店进货单据及售价，店内存在窜货行为，进货渠道明确，货物为外阜批号。店员已把存在窜货的品种全部下架",
  "检查药店进货单据及售价，全部依据正常程序合作，店内无窜货行为",
] as const;

// 药店信息反馈（2）标准模板
export const PHARMACY_FEEDBACKS_2 = [
  "本店第一次铺货，采购人员要货较为谨慎，需跟进产品动销情况，及时补充货品",
  "产品库存较少，已沟通店员，对产品进行要货，已确定要货数量，保证库存充足",
  "对终端销量不好的产品，及时做产品调整，避免产品过有效期",
  "根据药店的陈列和店员的建议，选择药店竞品较少的货物进行产品的铺货",
  "了解药店的回款信誉，此药店信誉较好，可以铺货，已和店长洽谈铺货事项",
  "产品POP，宣传册，摆放到位，店员积极参与，活动效果良好，消费者对产品及品牌信任度高",
  "活动中，店员与促销人员配合默契，宣传到位，活动参与人数较多，品牌形象得到提升",
  "宣传活动效果理想，活动当天氛围和谐，产品产量有了大幅度上升，消费者对活动形式较为满意",
  "药店位置靠近居民区，适合周末进行宣传活动，活动物资已到位，氛围舒适，店员已培训活动内容及产品知识",
  "与店员沟通活动后产品，整体上升不大，活动效果不理想，由于天气原因，导致活动效果不突出",
  "产品价格低于市场区域，已沟通店长，店员对价格已经进行调换，区域周边药店价格已统一",
  "产品价格巡查，店内价格在价格管控范围内，属于合理售价",
  "店内价格高于区域市场范围，导致数量下降，对店内价格进行调控，保证区域价格一致",
  "店员熟悉产品售价，价格管控到位，产品在合理售价范围内",
  "促销活动，展架，宣传品拜访到位，赠品库存合理，店员配合度高，活动效果理想",
  "促销活动不理想，店员对产品没有产生高度重视，体验消费者较多，但购买者较少",
  "了解药店面积，能否开展促销活动，店员认为买赠的活动最适宜，整体促销效果良好",
  "询问促销活动效果，活动当天消费者人数较多，达到理想效果，进来不少消费者询问及购买过产品",
  "药店店员或产品促销员共同配合，发放现场活动宣传单，讲述活动方式，引领消费者积极参与活动，活动产品丰富，消费者参与度较高",
  "店面面积较大可以做生动化陈列，已确定店内陈列冲击力最强的位置进行产品摆放，已和店员确定产品陈列造型",
  "店内同类产品陈列位置普遍不佳，位置偏僻，消费者不易看到，因此导致数量下降，需沟通陈列位置的更换",
  "调整产品陈列位，把位置调整到消费者入店的线路方向，产品高度适中，位置醒目",
  "对药店陈列产品的摆放及灰尘擦拭，保证药品醒目，整洁，并提醒店员陈列位置，便于产品推荐",
  "了解同类产品陈列位置，与店长探讨产品陈列位，充分扩大产品陈列面，增加产品首推概率",
  "对本店店员讲述了产品知识及功效，部门店员已掌握熟悉，个别店员的药学知识相对薄弱，需一对一有效培训",
  "对产品的治疗范围、质量、价格与店员进行了沟通，店员已掌握，部分店员对产品的熟悉度较高，能带领新店员对产品进行推荐",
  "培训产品知识及产品适应症，店员掌握认可产品治疗信息，提升产品认可度",
  "一对一的对店员进行产品的简单介绍，和店员建立良好关系，方便后续沟通",
  "一对一的培训店内优质店员，店员对产品知识已掌握，了解产品卖点，可以向消费者主动推荐产品",
  "和店员聊一些感兴趣的话题，拉进和店员的关系，提升产品首推率",
  "了解店内店员信息和称呼，以便拜访中可拉进与店员间联系",
  "了解店内竞品品牌的推广方式，及店员的接受程度，大多数店员对竞品的功效不熟悉，竞品的推广方式过于肤浅",
  "了解连锁企业门店配送时间，调整店员要货量，保证库存周转率",
  "了解药店进货渠道，结算方式及资信情况",
  "价格稳定管控良好，无外阜货品，店内环境良好，店员素质高，可作为优质门店",
  "检查药店进货单据及售价，店内存在窜货行为，进货渠道部明确，货物为外阜批号。店员已把存在窜货的品种全部下架",
  "检查药店进货单据及售价，全部依据正常程序合作，店内无窜货行为",
  "医保药店，店内面积大于80平米，店员多于3人，位置处于居民区，店内环境秩序整洁，店员配合度高，产品售价合理",
] as const;

// 药店信息反馈标准模板（合并1和2，用于向后兼容）
export const PHARMACY_FEEDBACKS = [...PHARMACY_FEEDBACKS_1, ...PHARMACY_FEEDBACKS_2] as const;

// 内嵌的任务模板规则（从后端模板转换而来）
export const TASK_TEMPLATES: Record<string, TaskTemplate> = {
  药店拜访: {
    name: "药店拜访",
    description: "药店拜访任务验证",
    requiredFields: ["实施人", "零售渠道", "拜访开始时间"],
    sheetNames: ["药店拜访"],
    matchKeywords: ["药店"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      "实施\n人": "implementer",
      对接人: "contactPerson",
      零售渠道: "retailChannel",
      渠道地址: "channelAddress",
      拜访开始时间: "visitStartTime",
      "拜访开始\n时间": "visitStartTime",
      "拜访事项（1）": "visitItem1",
      "拜访事项\n（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "拜访事\n项（2）": "visitItem2",
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
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "retailChannel",
        type: "unique",
        params: { scope: "day", groupBy: "retailChannel" },
        message: "同一药店2日内不能重复拜访",
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
          maxPerDay: 8,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过8家药店",
      },
      {
        field: "retailChannel",
        type: "sameImplementer",
        params: {
          targetField: "retailChannel", // 目标字段（药店名称）
          implementerField: "implementer", // 实施人字段
          addressField: "channelAddress", // 增加地址字段校验
        },
        message: "同一药店在周期内需由同一人拜访",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 8, endHour: 19 },
        message: "拜访时间必须在08:00-19:00范围内",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
      // 地址格式验证
      {
        field: "channelAddress",
        type: "addressFormat",
        params: { minLength: 10 },
        message:
          "渠道地址填写不完整，需包含省/市、区/县、街道和门牌号（如：北京市朝阳区建国路88号）",
      },
      // 内容相似度验证 - 拜访事项
      {
        field: "visitItem1",
        type: "contentSimilarity",
        params: { templates: [...PHARMACY_VISIT_ITEMS], threshold: 0.8 },
        message:
          "拜访事项（1）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      {
        field: "visitItem2",
        type: "contentSimilarity",
        params: { templates: [...PHARMACY_VISIT_ITEMS], threshold: 0.8 },
        message:
          "拜访事项（2）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      // 内容相似度验证 - 信息反馈（使用各自对应的模板）
      {
        field: "feedback1",
        type: "contentSimilarity",
        params: { templates: [...PHARMACY_FEEDBACKS_1], threshold: 0.8 },
        message:
          "信息反馈（1）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      {
        field: "feedback2",
        type: "contentSimilarity",
        params: { templates: [...PHARMACY_FEEDBACKS_2], threshold: 0.8 },
        message:
          "信息反馈（2）内容与标准示例差异过大，请参考模板示例如实填写",
      },
    ],
  },

  医院拜访: {
    name: "医院拜访",
    description: "医院拜访任务验证（统一模板，包含等级医院、基层医疗机构、民营医院）",
    requiredFields: [
      "实施人",
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
    ],
    sheetNames: ["医院拜访", "等级医院拜访", "基层医疗机构拜访", "民营医院拜访"],
    matchKeywords: ["医院", "医疗机构"],
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
          allowedLevels: ["等级", "基层", "民营"],
          allowedSuffixes: [],
        },
        message: "医疗类型必须选择以下类别之一：等级、基层、民营",
      },
      {
        field: "visitStartTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      // 条件性日期间隔验证：根据医疗类型应用不同的重复拜访限制
      // 等级医院：同一医院1天内不能重复拜访
      // 基层/民营医院：同一医院3天内不能重复拜访
      {
        field: "visitStartTime",
        type: "conditionalDateInterval",
        params: {
          groupBy: "hospitalName",
          conditionField: "medicalType",
          conditions: {
            等级: { days: 1, message: "同一医院（等级）1日内不能重复拜访" },
            基层: { days: 3, message: "同一医院（基层）3日内不能重复拜访" },
            民营: { days: 3, message: "同一医院（民营）3日内不能重复拜访" },
          },
          defaultDays: 3,
        },
        message: "同一医院在规定天数内不能重复拜访",
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
          maxPerDay: 5,
          groupBy: "implementer",
        },
        message: "同一实施人每日拜访不超过5家医院（所有类型合计）",
      },
      {
        field: "hospitalName",
        type: "sameImplementer",
        params: {
          targetField: "hospitalName",
          implementerField: "implementer",
          addressField: "channelAddress",
        },
        message: "同一医院在周期内需由同一人拜访",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
      // 地址格式验证
      {
        field: "channelAddress",
        type: "addressFormat",
        params: { minLength: 10 },
        message:
          "渠道地址填写不完整，需包含省/市、区/县、街道和门牌号（如：北京市朝阳区建国路88号）",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
      // 内容相似度验证 - 拜访事项需与标准模板相似
      {
        field: "visitItem1",
        type: "contentSimilarity",
        params: {
          templates: [...HOSPITAL_VISIT_ITEMS],
          threshold: 0.8,
        },
        message:
          "拜访事项（1）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      {
        field: "visitItem2",
        type: "contentSimilarity",
        params: {
          templates: [...HOSPITAL_VISIT_ITEMS],
          threshold: 0.8,
        },
        message:
          "拜访事项（2）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      // 内容相似度验证 - 信息反馈需与标准模板相似
      {
        field: "feedback1",
        type: "contentSimilarity",
        params: {
          templates: [...HOSPITAL_FEEDBACKS],
          threshold: 0.8,
        },
        message:
          "信息反馈（1）内容与标准示例差异过大，请参考模板示例如实填写",
      },
      {
        field: "feedback2",
        type: "contentSimilarity",
        params: {
          templates: [...HOSPITAL_FEEDBACKS],
          threshold: 0.8,
        },
        message:
          "信息反馈（2）内容与标准示例差异过大，请参考模板示例如实填写",
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
    ],
    sheetNames: ["科室拜访"],
    matchKeywords: ["科室"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      医生姓名: "doctorName",
      医疗机构名称: "hospitalName",
      渠道地址: "channelAddress",
      科室: "departmentName",
      拜访开始时间: "visitStartTime",
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
        params: { allowTimeComponent: false },
        message: "拜访开始时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "visitStartTime",
        type: "timeRange",
        params: { startHour: 7, endHour: 19 },
        message: "拜访时间必须在07:00-19:00范围内",
      },
      {
        field: "visitStartTime",
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
      {
        field: "hospitalName",
        type: "crossTaskValidation",
        params: {
          scope: "month",
          excludeTasks: ["等级医院拜访", "基层医疗机构拜访", "民营医院拜访"],
          groupBy: "hospitalName",
        },
        message: "当月同一医院不可同时出现在「科室拜访」和「医院级拜访」中",
      },
      // 禁用内容验证 - 拜访事项和信息反馈字段
      {
        field: "visitItem1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（1）内容不能包含禁用词汇",
      },
      {
        field: "feedback1",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（1）内容不能包含禁用词汇",
      },
      {
        field: "visitItem2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "拜访事项（2）内容不能包含禁用词汇",
      },
      {
        field: "feedback2",
        type: "prohibitedContent",
        params: {
          prohibitedTerms: COMMON_PROHIBITED_TERMS,
        },
        message: "信息反馈（2）内容不能包含禁用词汇",
      },
    ],
  },

  // 注意：基层医疗机构拜访和民营医院拜访已合并到"医院拜访"统一模板中

  消费者调研: {
    name: "消费者调研",
    description: "消费者调研任务验证",
    // 模板总汇(消费者问卷数据清单)不包含"药店名称"
    requiredFields: ["实施人", "调查对象姓名", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "消费者问卷数据清单",
      "消费者调研数据清单",
      // 其次匹配模板与问卷页
      "消费者调研",
      "消费者问卷",
      // 兜底关键词
      "数据清单",
      "消费者数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人姓名: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      调查对象姓名: "surveyTargetName",
      消费者姓名: "surveyTargetName",
      被访者姓名: "surveyTargetName",
      受访者姓名: "surveyTargetName",
      调研对象姓名: "surveyTargetName",
      被调查者姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      实施时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
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
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
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
        params: { maxPerDay: 50, groupBy: "implementer" },
        message: "同一实施人每日不得超过50份",
      },
    ],
  },

  患者调研: {
    name: "患者调研",
    description: "患者调研任务验证",
    // 模板总汇(患者问卷数据清单)不包含“药店名称”
    requiredFields: ["实施人", "调查对象姓名", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "患者问卷数据清单",
      "患者调研数据清单",
      // 其次匹配模板与问卷页
      "患者调研",
      "患者问卷",
      // 兜底关键词
      "数据清单",
      "患者数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人姓名: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      调查对象姓名: "surveyTargetName",
      患者姓名: "surveyTargetName",
      被访者姓名: "surveyTargetName",
      受访者姓名: "surveyTargetName",
      调研对象姓名: "surveyTargetName",
      被调查者姓名: "surveyTargetName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      实施时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
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
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
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
        params: { maxPerDay: 20, groupBy: "implementer" },
        message: "同一实施人每日不得超过20份",
      },
    ],
  },

  店员调研: {
    name: "店员调研",
    description: "店员调研任务验证",
    // 模板总汇(店员问卷数据清单)包含“药店名称”，表头为“药店名称”与“实施时间”
    requiredFields: ["实施人", "店员姓名", "药店名称", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "店员问卷数据清单",
      "店员调研数据清单",
      // 其次匹配模板与问卷页
      "店员调研",
      "店员问卷",
      // 兜底关键词
      "数据清单",
      "店员数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      店员姓名: "employeeName",
      员工姓名: "employeeName",
      导购姓名: "employeeName",
      营业员姓名: "employeeName",
      咨询师姓名: "employeeName",
      员工: "employeeName",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
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
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
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
        params: {
          maxPerDay: 2,
          groupBy: "implementer",
          countBy: "pharmacyName",
        },
        message: "同一实施人每日拜访不超过2家药店",
      },
      {
        field: "pharmacyName",
        type: "frequency",
        params: { maxPerDay: 5, groupBy: "pharmacyName" },
        message: "每个药店不超过5份",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 10, groupBy: "implementer" },
        message: "同一实施人每日不超过10份",
      },
    ],
  },

  药店调研: {
    name: "药店调研",
    description: "药店调研任务验证",
    requiredFields: ["实施人", "药店名称", "调研时间"],
    sheetNames: [
      // 优先匹配数据清单类工作表
      "药店问卷数据清单",
      "药店调研数据清单",
      // 其次匹配模板与问卷页
      "药店调研",
      "药店问卷",
      // 兜底关键词
      "数据清单",
      "药店数据",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      调查员: "implementer",
      访员: "implementer",
      执行人: "implementer",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      药店名: "pharmacyName",
      门店: "pharmacyName",
      门店全称: "pharmacyName",
      药店门店名称: "pharmacyName",
      调研时间: "surveyTime",
      调查时间: "surveyTime",
      问卷时间: "surveyTime",
      访问时间: "surveyTime",
      填写时间: "surveyTime",
      提交时间: "surveyTime",
      调研地址: "surveyAddress",
      调查地址: "surveyAddress",
      门店地址: "surveyAddress",
      药店地址: "surveyAddress",
      地址: "surveyAddress",
      问卷内容: "questionnaireContent",
      问卷: "questionnaireContent",
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
        params: { allowTimeComponent: false },
        message: "调研时间格式不正确，应为纯日期格式（如：2025-08-01）",
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
          maxPerDay: 2,
          groupBy: "implementer",
          countBy: "pharmacyName",
        },
        message: "同一实施人每日拜访不超过2家药店",
      },
    ],
  },

  竞品信息收集: {
    name: "竞品信息收集",
    description: "竞品信息收集任务验证",
    requiredFields: ["实施人", "医疗机构名称", "收集时间"],
    sheetNames: [
      "竞品数据购进收集",
      "竞品信息收集",
      "竞品数据",
      "信息收集",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      医疗机构名称: "hospitalName",
      医院名称: "hospitalName",
      机构名称: "hospitalName",
      收集时间: "collectTime",
      实施时间: "collectTime",
      调研时间: "collectTime",
      竞品名称: "competitorName",
      产品名称: "competitorName",
      品牌名称: "competitorName",
      竞品信息: "competitorInfo",
      信息内容: "competitorInfo",
      收集内容: "competitorInfo",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "hospitalName",
        type: "required",
        message: "医疗机构名称不能为空",
      },
      {
        field: "collectTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "收集时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "hospitalName",
        type: "sixMonthsInterval",
        params: { groupBy: "hospitalName" },
        message: "同一医院半年内不能重复收集竞品信息",
      },
    ],
  },

  培训会: {
    name: "培训会",
    description: "培训会验证",
    requiredFields: ["实施人", "培训时间", "参会人数"],
    sheetNames: ["培训会", "培训", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      培训时间: "trainingTime",
      实施时间: "trainingTime",
      会议时间: "trainingTime",
      活动时间: "trainingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      培训地点: "location",
      地点: "location",
      培训主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "trainingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "培训时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 30 },
        message: "参会人数不能少于30人",
      },
    ],
  },

  科室会: {
    name: "科室会",
    description: "科室会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: ["科室会", "科室", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      科室名称: "departmentName",
      科室: "departmentName",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 5 },
        message: "参会人数不能少于5人（不包括主讲人）",
      },
    ],
  },

  圆桌会: {
    name: "圆桌会",
    description: "圆桌会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: ["圆桌会", "圆桌", "会议", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 5 },
        message: "参会人数不能少于5人（不包括主讲人）",
      },
    ],
  },

  学术研讨病例讨论会: {
    name: "学术研讨、病例讨论会",
    description: "学术研讨、病例讨论会验证",
    requiredFields: ["实施人", "会议时间", "参会人数"],
    sheetNames: [
      "学术研讨病例讨论会",
      "学术研讨",
      "病例讨论会",
      "学术会议",
      "会议",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      会议时间: "meetingTime",
      实施时间: "meetingTime",
      活动时间: "meetingTime",
      参会人数: "attendeeCount",
      人数: "attendeeCount",
      会议地点: "location",
      地点: "location",
      会议主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "meetingTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "会议时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "attendeeCount",
        type: "minValue",
        params: { minValue: 30 },
        message: "参会人数不能少于30人",
      },
    ],
  },

  大型推广活动: {
    name: "大型推广活动",
    description: "大型推广活动验证",
    requiredFields: ["实施人", "活动时间", "参与人数"],
    sheetNames: ["大型推广活动", "推广活动", "活动", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      活动时间: "activityTime",
      实施时间: "activityTime",
      参与人数: "participantCount",
      人数: "participantCount",
      活动地点: "location",
      地点: "location",
      活动主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "activityTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "活动时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "participantCount",
        type: "minValue",
        params: { minValue: 20 },
        message: "参与人数不能少于20人",
      },
    ],
  },

  小型推广活动: {
    name: "小型推广活动",
    description: "小型推广活动验证",
    requiredFields: ["实施人", "活动时间", "参与人数"],
    sheetNames: ["小型推广活动", "推广活动", "活动", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      活动时间: "activityTime",
      实施时间: "activityTime",
      参与人数: "participantCount",
      人数: "participantCount",
      活动地点: "location",
      地点: "location",
      活动主题: "topic",
      主题: "topic",
      备注: "notes",
    },
    validationRules: [
      {
        field: "implementer",
        type: "required",
        message: "实施人不能为空",
      },
      {
        field: "activityTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "活动时间格式不正确，应为纯日期格式（如：2025-08-01）",
      },
      {
        field: "participantCount",
        type: "minValue",
        params: { minValue: 10 },
        message: "参与人数不能少于10人",
      },
    ],
  },

  药店陈列服务: {
    name: "药店陈列服务",
    description: "药店陈列服务验证",
    requiredFields: ["实施人", "药店名称", "服务时间"],
    sheetNames: [
      "药店陈列服务",
      "陈列服务",
      "药店陈列",
      "陈列",
      "Sheet1",
      "工作表1",
    ],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      实施人员: "implementer",
      执行人: "implementer",
      药店名称: "pharmacyName",
      门店名称: "pharmacyName",
      药房名称: "pharmacyName",
      服务时间: "serviceTime",
      实施时间: "serviceTime",
      陈列位置: "displayPosition",
      位置: "displayPosition",
      服务内容: "serviceContent",
      内容: "serviceContent",
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
        field: "serviceTime",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message: "服务时间格式不正确，应为纯日期格式（如：2025-08-01）",
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

// ============= 动态配置支持 =============

// 类型定义用于动态配置
interface RuleConfig {
  id: string;
  field: string;
  type: ValidationRule["type"];
  enabled: boolean;
  params?: ValidationRule["params"];
  message: string;
}

interface TaskTemplateConfig {
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

interface ValidationConfig {
  version: string;
  lastModified: string;
  prohibitedTerms: string[];
  templates: Record<string, TaskTemplateConfig>;
}

const CONFIG_STORAGE_KEY = "excel-review-validation-config";

/**
 * 从配置存储获取活跃的任务模板
 * 优先使用用户自定义配置，如果没有则使用默认配置
 */
export function getActiveTaskTemplates(): Record<string, TaskTemplate> {
  // 服务端渲染时使用默认配置
  if (typeof window === "undefined") {
    return TASK_TEMPLATES;
  }

  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) {
      return TASK_TEMPLATES;
    }

    const config: ValidationConfig = JSON.parse(stored);
    const result: Record<string, TaskTemplate> = {};

    for (const [name, templateConfig] of Object.entries(config.templates)) {
      // 跳过禁用的模板
      if (!templateConfig.enabled) continue;

      // 只保留启用的规则
      const enabledRules: ValidationRule[] = templateConfig.validationRules
        .filter((r: RuleConfig) => r.enabled)
        .map((r: RuleConfig) => ({
          field: r.field,
          type: r.type,
          params: r.params,
          message: r.message,
        }));

      result[name] = {
        name: templateConfig.name,
        description: templateConfig.description,
        requiredFields: templateConfig.requiredFields,
        sheetNames: templateConfig.sheetNames,
        matchKeywords: templateConfig.matchKeywords,
        fieldMappings: templateConfig.fieldMappings,
        validationRules: enabledRules,
      };
    }

    return result;
  } catch (error) {
    console.warn("Failed to load custom config, using defaults:", error);
    return TASK_TEMPLATES;
  }
}

/**
 * 获取单个活跃的任务模板
 */
export function getActiveTaskTemplate(
  taskName: string
): TaskTemplate | undefined {
  const templates = getActiveTaskTemplates();
  return templates[taskName];
}

/**
 * 获取所有活跃的任务名称
 */
export function getActiveTaskNames(): string[] {
  const templates = getActiveTaskTemplates();
  return Object.keys(templates);
}
